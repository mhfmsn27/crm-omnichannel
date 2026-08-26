import pool from '../config/db.js';
import MetaService from '../services/MetaService.js';
import { checkFeatureAccess } from '../services/featureGateService.js';

// Helper: If a limit exists (>0 or -1), implicitly allow the feature even if the boolean toggle is off
const resolveFeatureAccess = (featureAccess, limitAccess) => {
    if (featureAccess.allowed) return featureAccess;
    if (limitAccess.limit > 0 || limitAccess.limit === -1) {
        return { ...featureAccess, allowed: true };
    }
    return featureAccess;
};

// GET /api/app/meta/stats
// Query param: mode (byok | coex)
export const getStats = async (req, res) => {
    const { organization_id } = req.user;
    const { mode } = req.query; // 'byok' or 'coex'

    try {
        const featureKey = mode === 'coex' ? 'channel_wa_coex' : 'channel_wa_api';
        const limitKey = mode === 'coex' ? 'limit_wa_coex' : 'limit_wa_api';

        let featureAccess = await checkFeatureAccess(organization_id, featureKey);
        const limitAccess = await checkFeatureAccess(organization_id, limitKey);

        // Auto-unlock logic
        featureAccess = resolveFeatureAccess(featureAccess, limitAccess);

        res.json({
            feature: featureAccess,
            limit: limitAccess
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/meta/auth
export const authenticate = async (req, res) => {
    const { code, waba_id, phone_id, access_token, name, redirect_uri, mode: reqMode } = req.body;
    const { organization_id } = req.user;

    // Determine Mode: Prefer request mode if provided, else infer from code
    const mode = reqMode || (code ? 'coex' : 'byok');

    const featureKey = mode === 'coex' ? 'channel_wa_coex' : 'channel_wa_api';
    const limitKey = mode === 'coex' ? 'limit_wa_coex' : 'limit_wa_api';

    // 0. FEATURE GATING CHECK
    try {
        let featureAccess = await checkFeatureAccess(organization_id, featureKey);
        const limitAccess = await checkFeatureAccess(organization_id, limitKey);

        // Auto-unlock logic
        featureAccess = resolveFeatureAccess(featureAccess, limitAccess);

        if (!featureAccess.allowed) {
            return res.status(403).json({
                error: `Fitur ${mode === 'coex' ? 'WhatsApp CoEx' : 'WhatsApp API'} belum aktif di paket Anda.`,
                code: 'FEATURE_LOCKED',
                upsell: true
            });
        }

        if (!limitAccess.allowed) {
            return res.status(403).json({
                error: limitAccess.message,
                code: 'LIMIT_REACHED',
                upsell: true
            });
        }
    } catch (err) {
        return res.status(500).json({ error: "Gate check failed: " + err.message });
    }

    try {
        let finalToken = access_token;
        let finalPhoneId = phone_id;
        let finalWabaId = waba_id;
        let phoneData = null;

        // --- SCENARIO A: EMBEDDED SIGNUP (Code Exchange) ---
        // Used for both CoEx and Auto-BYOK
        if (code) {
            // 1. Exchange Code with Redirect URI (Required for OAuth security)
            finalToken = await MetaService.exchangeCodeForToken(code, redirect_uri);

            // 2. Auto-detect Phone if not provided
            const phoneResult = await MetaService.getPhonesFromWaba(finalToken, finalWabaId);

            const phones = phoneResult.data;
            finalWabaId = phoneResult.waba_id;

            if (!phones || phones.length === 0) {
                return res.status(400).json({ error: "No WhatsApp number found in this Business Account. Did you complete the step to add a number?" });
            }

            // Smart Selection: Prioritize Unregistered & Healthy Numbers

            // 1. Check which phone_ids match existing sessions
            const phoneIds = phones.map(p => p.id);
            const existingRes = await pool.query(
                'SELECT phone_number_id FROM whatsapp_sessions WHERE phone_number_id = ANY($1)',
                [phoneIds]
            );
            const existingIds = new Set(existingRes.rows.map(r => r.phone_number_id));

            // 2. Sorting Function
            const qualityScore = (q) => {
                if (q === 'GREEN') return 3;
                if (q === 'YELLOW') return 2;
                if (q === 'RED') return 1;
                return 0; // UNKNOWN or null
            };

            const statusScore = (s) => {
                if (s === 'APPROVED') return 2;
                if (s === 'AVAILABLE_WITHOUT_REVIEW') return 1;
                return 0;
            };

            phones.sort((a, b) => {
                // PRIMARY: Prefer UNREGISTERED phones
                const aExists = existingIds.has(a.id);
                const bExists = existingIds.has(b.id);
                if (aExists !== bExists) return aExists ? 1 : -1; // Unregistered (false) comes first

                // SECONDARY: Quality
                const qA = qualityScore(a.quality_rating);
                const qB = qualityScore(b.quality_rating);
                if (qA !== qB) return qB - qA; // Higher first

                // TERTIARY: Name Status
                const sA = statusScore(a.name_status);
                const sB = statusScore(b.name_status);
                return sB - sA; // Higher first
            });

            // Default to best candidate
            phoneData = phones[0];
            finalPhoneId = phoneData.id;

            // Log selection for debugging
            console.log(`[Meta Auth] Selected Phone: ${phoneData.display_phone_number} (Exists: ${existingIds.has(finalPhoneId)}) from ${phones.length} candidates.`);
        }
        // --- SCENARIO B: MANUAL CREDENTIALS (Legacy BYOK) ---
        else if (access_token && phone_id && waba_id) {
            phoneData = await MetaService.validateCredentials(access_token, phone_id);
        } else {
            return res.status(400).json({ error: "Invalid credentials provided." });
        }

        // --- COMMON: SAVE TO DB ---
        const phoneNumber = phoneData.display_phone_number.replace(/[^0-9]/g, '');
        const sessionName = name || phoneData.verified_name || `Official WA ${phoneNumber}`;
        const customSessionId = `meta-${finalPhoneId}`;

        // Ensure App is Subscribed to Webhooks
        await MetaService.subscribeApp(finalToken, finalWabaId);

        // Upsert Session with DEVICE INFO metadata for filtering
        const deviceInfo = {
            mode: mode, // 'byok' or 'coex'
            verified_name: phoneData.verified_name,
            display_number: phoneData.display_phone_number
        };

        const checkRes = await pool.query(
            'SELECT id FROM whatsapp_sessions WHERE phone_number_id = $1',
            [finalPhoneId]
        );

        let sessionId;
        if (checkRes.rows.length > 0) {
            // FIX: Update organization_id to transfer ownership if user moved orgs
            // We specifically select ONLY by phone_number_id (ignoring org_id) to find the existing session and hijack it.
            await pool.query(`
                UPDATE whatsapp_sessions 
                SET organization_id = $1, type = 'official', waba_id = $2, access_token = $3, name = $4, 
                    whatsapp_number = $5, status = 'connected', quality_rating = $6, 
                    device_info = $7, updated_at = NOW()
                WHERE phone_number_id = $8
            `, [organization_id, finalWabaId, finalToken, sessionName, phoneNumber, phoneData.quality_rating, JSON.stringify(deviceInfo), finalPhoneId]);
            sessionId = checkRes.rows[0].id;
        } else {
            const insertRes = await pool.query(`
                INSERT INTO whatsapp_sessions 
                (organization_id, session_id, name, whatsapp_number, type, waba_id, phone_number_id, access_token, status, quality_rating, device_info)
                VALUES ($1, $2, $3, $4, 'official', $5, $6, $7, 'connected', $8, $9)
                RETURNING id
            `, [organization_id, customSessionId, sessionName, phoneNumber, finalWabaId, finalPhoneId, finalToken, phoneData.quality_rating, JSON.stringify(deviceInfo)]);
            sessionId = insertRes.rows[0].id;
        }

        res.json({
            success: true,
            message: "Connected Successfully",
            mode: mode,
            session_db_id: sessionId,
            phone_number: phoneNumber
        });

    } catch (err) {
        console.error("[Meta Auth] Error:", err.message);
        res.status(500).json({ error: err.message });
    }
};
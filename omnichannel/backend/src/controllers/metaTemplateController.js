import pool from '../config/db.js';
import MetaService from '../services/MetaService.js';

// POST /api/app/meta/templates/sync
export const syncTemplates = async (req, res) => {
    const { organization_id } = req.user;

    try {
        // 1. Find Official Session
        const sessionRes = await pool.query(
            "SELECT * FROM whatsapp_sessions WHERE organization_id = $1 AND type = 'official' AND status = 'connected' LIMIT 1",
            [organization_id]
        );

        if (sessionRes.rows.length === 0) {
            return res.status(400).json({ error: "No connected Official WhatsApp API found." });
        }

        const session = sessionRes.rows[0];

        // 2. Fetch from Meta
        console.log(`[Sync Template] Fetching for WABA ID: ${session.waba_id}`);
        const metaData = await MetaService.getTemplates(session.access_token, session.waba_id);
        const templates = metaData.data;

        console.log(`[Sync Template] Meta returned ${templates.length} templates.`);
        if (templates.length === 0) {
            console.log("[Sync Template] Warning: No templates found. Check WABA ID or Token Permissions.");
        }

        // 3. Save to DB (Upsert)
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            let syncedCount = 0;
            for (const t of templates) {
                // Ensure components exist
                const components = t.components || [];

                await client.query(
                    `INSERT INTO meta_templates (organization_id, waba_id, name, language, status, category, components, raw_data, synced_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                     ON CONFLICT (waba_id, name, language) 
                     DO UPDATE SET 
                        organization_id = EXCLUDED.organization_id, -- TRANSFER OWNERSHIP
                        status = EXCLUDED.status, 
                        category = EXCLUDED.category, 
                        components = EXCLUDED.components, 
                        raw_data = EXCLUDED.raw_data, 
                        synced_at = NOW()`,
                    [organization_id, session.waba_id, t.name, t.language, t.status, t.category, JSON.stringify(components), JSON.stringify(t)]
                );
                syncedCount++;
            }

            await client.query('COMMIT');
            res.json({ message: "Sync completed", count: syncedCount });

        } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error("Sync Template Error:", err.response?.data || err.message);

        const errorMsg = err.response?.data?.error?.message || err.message;
        if (errorMsg && (errorMsg.includes("Session has expired") || errorMsg.includes("Error validating access token"))) {
            return res.status(401).json({
                error: "Sesi WhatsApp telah berakhir. Silakan hubungkan ulang akun WhatsApp Anda di menu Integrasi.",
                code: "SESSION_EXPIRED"
            });
        }

        res.status(500).json({ error: "Gagal menyingkronkan template: " + errorMsg });
    }
};

// GET /api/app/meta/templates
export const getTemplates = async (req, res) => {
    const { organization_id } = req.user;
    const { waba_id } = req.query;

    try {
        let query = "SELECT * FROM meta_templates WHERE organization_id = $1";
        const params = [organization_id];

        if (waba_id) {
            query += " AND waba_id = $2";
            params.push(waba_id);
        }

        query += " ORDER BY name ASC";

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/meta/templates
export const createTemplate = async (req, res) => {
    const { organization_id } = req.user;
    const { name, category, language, components, waba_id } = req.body;

    if (!waba_id || !name || !category || !components) {
        return res.status(400).json({ error: "Missing required fields (waba_id, name, category, components)" });
    }

    try {
        // 1. Get Access Token for WABA
        const sessionRes = await pool.query(
            "SELECT access_token FROM whatsapp_sessions WHERE organization_id = $1 AND waba_id = $2 AND type = 'official' LIMIT 1",
            [organization_id, waba_id]
        );

        if (sessionRes.rows.length === 0) {
            return res.status(404).json({ error: "WABA not found or not connected." });
        }
        const { access_token } = sessionRes.rows[0];

        // 2. Call Meta API to Create
        const metaPayload = {
            name,
            category,
            allow_category_change: true,
            language: language || 'id',
            components
        };

        const metaRes = await MetaService.createTemplate(access_token, waba_id, metaPayload);

        // 3. Save to DB (Optimistic)
        const newTemplate = {
            id: metaRes.id, // Meta Template ID
            name,
            status: 'PENDING', // Default until webhook update
            category
        };

        // Upsert locally
        await pool.query(
            `INSERT INTO meta_templates (organization_id, waba_id, name, language, status, category, components, raw_data, synced_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             ON CONFLICT (waba_id, name, language) DO UPDATE SET
                status = EXCLUDED.status,
                components = EXCLUDED.components`,
            [organization_id, waba_id, name, language || 'id', 'PENDING', category, JSON.stringify(components), JSON.stringify(newTemplate)]
        );

        res.json({ success: true, id: metaRes.id });

    } catch (err) {
        console.error("Create Template Error:", err);
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/app/meta/templates/:name
export const deleteTemplate = async (req, res) => {
    const { organization_id } = req.user;
    const { name } = req.params;
    const { waba_id } = req.query;

    if (!waba_id) return res.status(400).json({ error: "waba_id is required" });

    try {
        // 1. Get Token
        const sessionRes = await pool.query(
            "SELECT access_token FROM whatsapp_sessions WHERE organization_id = $1 AND waba_id = $2 LIMIT 1",
            [organization_id, waba_id]
        );
        if (sessionRes.rows.length === 0) return res.status(404).json({ error: "Session not found" });

        // 2. Delete from Meta
        await MetaService.deleteTemplate(sessionRes.rows[0].access_token, waba_id, name);

        // 3. Delete from DB
        await pool.query(
            "DELETE FROM meta_templates WHERE organization_id = $1 AND waba_id = $2 AND name = $3",
            [organization_id, waba_id, name]
        );

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/meta/upload
export const uploadMediaHandle = async (req, res) => {
    const { organization_id } = req.user;
    const { waba_id } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No file uploaded" });
    if (!waba_id) return res.status(400).json({ error: "waba_id is required" });

    try {
        // 1. Get Access Token
        const sessionRes = await pool.query(
            "SELECT access_token FROM whatsapp_sessions WHERE organization_id = $1 AND waba_id = $2 AND type = 'official' LIMIT 1",
            [organization_id, waba_id]
        );

        if (sessionRes.rows.length === 0) {
            return res.status(404).json({ error: "WhatsApp Session not found for this WABA." });
        }
        const { access_token } = sessionRes.rows[0];

        // 2. Get App ID (Dynamic for BYOK support)
        const appId = await MetaService.getAppId(access_token);

        // 3. Upload to Meta (Resumable API)
        const handle = await MetaService.uploadMediaForTemplate(access_token, appId, file.path, file.mimetype);

        // 4. Return Handle
        res.json({ h: handle });

    } catch (err) {
        console.error("Meta Media Upload Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        // Cleanup local file
        if (file && file.path) {
            try {
                // Use imported fs if available, otherwise assume global or need import. 
                // Wait, fs is NOT imported in this file. I need to import it or usage fs promises.
                // I will add import fs at the top of the file in a separate edit or assume standard node? NO.
                // I must import fs.
                // Since I can't easily add import to top in this block, I will strictly use dynamic import or just not fail if it fails?
                // Better: I will use a different replace_content to add imports at top first. 
                // But for now, I'll rely on the fact I'm replacing the end of file. 
                // I will Add fs import using a "multi-edit" logic? 
                // No, I'll just use `import fs from 'fs';` at the top in a separate Step.
                // For now, I'll skip unlink or use a dynamic import.
                // `(await import('fs')).unlinkSync(file.path);`
                const fs = await import('fs');
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            } catch (cleanupErr) {
                console.warn("Failed to cleanup upload:", cleanupErr);
            }
        }
    }
};

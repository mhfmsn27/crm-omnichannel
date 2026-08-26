import pool from '../config/db.js';
import axios from 'axios';
import crypto from 'crypto';

const GRAPH_API_VERSION = process.env.WA_API_VERSION || 'v21.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Helper: get official WA session data for a conversation
const getOfficialSession = async (conversationId, organizationId) => {
    const res = await pool.query(
        `SELECT ws.access_token, ws.phone_number_id, ws.waba_id, ct.phone_number
         FROM conversations c
         JOIN whatsapp_sessions ws ON c.whatsapp_session_id = ws.id
         JOIN contacts ct ON c.contact_id = ct.id
         WHERE c.id = $1 AND c.organization_id = $2 AND ws.type = 'official'`,
        [conversationId, organizationId]
    );
    return res.rows[0] || null;
};

// GET /api/app/inbox/conversations/:id/wa-flows
// Lists all published WA Flows available for this conversation's device
export const listFlows = async (req, res) => {
    const { id: conversationId } = req.params;
    const { organization_id } = req.user;

    try {
        const session = await getOfficialSession(conversationId, organization_id);
        if (!session) {
            return res.status(400).json({ error: 'Percakapan ini bukan dari WhatsApp Official API. WA Flows hanya tersedia untuk perangkat resmi.' });
        }
        if (!session.waba_id) {
            return res.status(400).json({ error: 'WABA ID tidak ditemukan untuk perangkat ini.' });
        }

        const response = await axios.get(`${BASE_URL}/${session.waba_id}/flows`, {
            params: {
                fields: 'id,name,status,categories,validation_errors',
                access_token: session.access_token,
                limit: 50,
            },
        });

        // Only return flows that are PUBLISHED (ready to send)
        const flows = (response.data.data || []).filter(f => f.status === 'PUBLISHED');
        res.json(flows);
    } catch (err) {
        const msg = err.response?.data?.error?.message || err.message;
        console.error('[WA Flows] listFlows error:', msg);
        res.status(500).json({ error: msg });
    }
};

// POST /api/app/inbox/conversations/:id/send-flow
// Sends a WA Flow interactive message to the customer
export const sendFlow = async (req, res) => {
    const { id: conversationId } = req.params;
    const { organization_id, id: userId } = req.user;
    const { flow_id, flow_cta = 'Buka Form', header_text, body_text, footer_text } = req.body;

    if (!flow_id) return res.status(400).json({ error: 'flow_id wajib diisi.' });
    if (!body_text) return res.status(400).json({ error: 'body_text wajib diisi.' });

    try {
        const session = await getOfficialSession(conversationId, organization_id);
        if (!session) {
            return res.status(400).json({ error: 'WA Flows hanya tersedia untuk WhatsApp Official API.' });
        }

        const flowToken = crypto.randomBytes(16).toString('hex');

        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: session.phone_number,
            type: 'interactive',
            interactive: {
                type: 'flow',
                body: { text: body_text },
                action: {
                    name: 'flow',
                    parameters: {
                        flow_message_version: '3',
                        flow_token: flowToken,
                        flow_id: flow_id,
                        flow_cta: flow_cta,
                        flow_action: 'navigate',
                    },
                },
            },
        };

        if (header_text) {
            payload.interactive.header = { type: 'text', text: header_text };
        }
        if (footer_text) {
            payload.interactive.footer = { text: footer_text };
        }

        const metaRes = await axios.post(
            `${BASE_URL}/${session.phone_number_id}/messages`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const providerMessageId = metaRes.data?.messages?.[0]?.id || null;
        const bodyRecord = `[WA Form Dikirim] ${body_text}`;

        // Save message to DB
        await pool.query(
            `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, wa_message_id, status, created_at)
             VALUES ($1, $2, true, 'interactive', $3, $4, 'sent', NOW())`,
            [conversationId, organization_id, bodyRecord, providerMessageId]
        );

        // Update conversation last_message
        await pool.query(
            `UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
            [bodyRecord, conversationId]
        );

        res.json({ success: true, flow_token: flowToken, provider_message_id: providerMessageId });
    } catch (err) {
        const msg = err.response?.data?.error?.message || err.message;
        console.error('[WA Flows] sendFlow error:', msg);
        res.status(500).json({ error: msg });
    }
};

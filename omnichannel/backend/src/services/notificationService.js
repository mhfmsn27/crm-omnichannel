
import pool from '../config/db.js';
import * as waService from './waGatewayService.js';

// System Admin Organization ID
const ADMIN_ORG_ID = 1;

// Helper: Process Spintax {Hi|Hello}
const processSpintax = (text) => {
    if (!text) return '';
    const regex = /\{([^{}]+)\}|\[([^[\]]+)\]/g;
    return text.replace(regex, (match, p1, p2) => {
        const choicesStr = p1 || p2;
        const choices = choicesStr.split('|');
        return choices[Math.floor(Math.random() * choices.length)];
    });
};

// Helper: Replace Variables
const replaceVariables = (text, variables) => {
    if (!text) return '';
    let processed = text;
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{${key}}`, 'g');
        processed = processed.replace(regex, value || '');
    }
    return processed;
};

// Main Function: Send System Notification
export const sendSystemNotification = async (type, user, data = {}) => {
    try {
        // 1. Get ANY Connected Admin Session (Load Balancing)
        const sessionRes = await pool.query(
            "SELECT session_id FROM whatsapp_sessions WHERE organization_id = $1 AND status = 'connected' ORDER BY RANDOM() LIMIT 1",
            [ADMIN_ORG_ID]
        );

        if (sessionRes.rows.length === 0) {
            console.warn(`[NotificationService] No System WhatsApp connected. Skipping '${type}' to ${user.phone || user.email}`);
            return;
        }
        const sessionId = sessionRes.rows[0].session_id;

        // 2. Get Template
        const tplRes = await pool.query(
            "SELECT content, is_active FROM notification_templates WHERE type = $1",
            [type]
        );

        if (tplRes.rows.length === 0 || !tplRes.rows[0].is_active) {
            return; // Template disabled or missing
        }

        const template = tplRes.rows[0].content;

        // 3. Prepare Variables
        const variables = {
            name: user.name,
            phone: user.phone,
            email: user.email,
            org_name: user.org_name || 'Member',
            ...data // Merge extra data (e.g. plan_name, amount, expiry_date)
        };

        // 4. Process Message
        let message = replaceVariables(template, variables);
        message = processSpintax(message);

        // 5. Send Message
        // Format phone number to 62...
        let phone = user.phone;
        if (!phone) return;
        phone = String(phone).replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) phone = '62' + phone.slice(1);
        if (phone.startsWith('8')) phone = '62' + phone;

        await waService.sendText(sessionId, phone, message);
        console.log(`[NotificationService] Sent '${type}' to ${phone} via ${sessionId}`);

    } catch (err) {
        console.error(`[NotificationService] Failed to send '${type}':`, err.message);
    }
};

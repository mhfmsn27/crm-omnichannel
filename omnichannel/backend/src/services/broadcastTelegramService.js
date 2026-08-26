import axios from 'axios';
import pool from '../config/db.js';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

/**
 * Get Telegram settings for a broadcast, checking campaign-level override first then global org settings
 */
export const getTelegramConfig = async (orgId, campaignTelegramSettings = null) => {
    try {
        const globalRes = await pool.query(
            `SELECT * FROM broadcast_settings WHERE organization_id = $1`,
            [orgId]
        );
        const globalSettings = globalRes.rows[0] || {};

        // If campaign explicitly disables Telegram notification
        if (campaignTelegramSettings && campaignTelegramSettings.enabled === false) {
            return null;
        }

        // Determine botToken and chatId (Campaign override takes precedence if set)
        const botToken = (campaignTelegramSettings && campaignTelegramSettings.botToken)
            ? campaignTelegramSettings.botToken
            : globalSettings.telegram_bot_token;

        const chatId = (campaignTelegramSettings && campaignTelegramSettings.chatId)
            ? campaignTelegramSettings.chatId
            : globalSettings.telegram_chat_id;

        if (!botToken || !chatId) {
            return null;
        }

        return {
            botToken: botToken.trim(),
            chatId: String(chatId).trim(),
            notifyOnComplete: globalSettings.telegram_notify_on_complete !== false,
            notifyOnPause: globalSettings.telegram_notify_on_pause !== false,
            notifyOnCancel: globalSettings.telegram_notify_on_cancel !== false
        };
    } catch (err) {
        console.error('[BroadcastTelegram] Failed to get config:', err.message);
        return null;
    }
};

/**
 * Send a test Telegram message to verify Bot Token and Chat ID
 */
export const testTelegramNotification = async ({ botToken, chatId }) => {
    if (!botToken || !chatId) {
        throw new Error('Bot Token dan Chat ID wajib diisi.');
    }

    const testMessage = `🤖 <b>CRMHUB Omnichannel - Tes Notifikasi Telegram</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `✅ <b>Status:</b> Terhubung Berhasil!\n` +
        `📅 <b>Waktu:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `<i>Bot ini akan mengirimkan laporan otomatis saat kampanye broadcast Selesai, Terjeda, atau Dibatalkan.</i>`;

    const res = await axios.post(`${TELEGRAM_API_BASE}${botToken.trim()}/sendMessage`, {
        chat_id: String(chatId).trim(),
        text: testMessage,
        parse_mode: 'HTML'
    }, { timeout: 10000 });

    return res.data;
};

/**
 * Send real-time broadcast status report to Telegram
 * @param {Object} params
 * @param {number|string} params.broadcastId
 * @param {'completed'|'paused'|'cancelled'} params.eventType
 * @param {string} [params.reason]
 * @param {number|string} [params.orgId]
 */
export const sendBroadcastTelegramReport = async ({ broadcastId, eventType, reason, orgId }) => {
    try {
        if (!broadcastId) return;

        // 1. Fetch broadcast details
        const bcRes = await pool.query(`
            SELECT b.*, o.name as org_name,
                   ws.name as device_name, ws.whatsapp_number as device_phone,
                   rg.name as rotator_name
            FROM broadcasts b
            JOIN organizations o ON b.organization_id = o.id
            LEFT JOIN whatsapp_sessions ws ON b.device_id = ws.id
            LEFT JOIN rotator_groups rg ON b.rotator_group_id = rg.id
            WHERE b.id = $1
        `, [broadcastId]);

        if (bcRes.rows.length === 0) return;
        const broadcast = bcRes.rows[0];
        const effectiveOrgId = orgId || broadcast.organization_id;

        // Parse campaign telegram settings if stored
        let campaignTelegramSettings = null;
        if (broadcast.telegram_settings) {
            campaignTelegramSettings = typeof broadcast.telegram_settings === 'string'
                ? JSON.parse(broadcast.telegram_settings)
                : broadcast.telegram_settings;
        }

        // 2. Resolve Config
        const config = await getTelegramConfig(effectiveOrgId, campaignTelegramSettings);
        if (!config) {
            return; // Telegram notifications not configured or disabled
        }

        // 3. Check event filters
        if (eventType === 'completed' && !config.notifyOnComplete) return;
        if (eventType === 'paused' && !config.notifyOnPause) return;
        if (eventType === 'cancelled' && !config.notifyOnCancel) return;

        // 4. Fetch Recipient Stats
        const statsRes = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'sent') as sent,
                COUNT(*) FILTER (WHERE status = 'failed') as failed,
                COUNT(*) FILTER (WHERE status IN ('queued', 'processing', 'pending')) as pending
            FROM broadcast_recipients
            WHERE broadcast_id = $1
        `, [broadcastId]);

        const stats = statsRes.rows[0] || { total: 0, sent: 0, failed: 0, pending: 0 };
        const total = parseInt(stats.total) || 0;
        const sent = parseInt(stats.sent) || 0;
        const failed = parseInt(stats.failed) || 0;
        const pending = parseInt(stats.pending) || 0;
        const successRate = total > 0 ? Math.round((sent / total) * 100) : 0;
        const failedRate = total > 0 ? Math.round((failed / total) * 100) : 0;

        const senderInfo = broadcast.device_name 
            ? `${broadcast.device_name} (${broadcast.device_phone || '-'})`
            : broadcast.rotator_name ? `Rotator: ${broadcast.rotator_name}` : 'Multi-Sender';

        const nowFormatted = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

        // 5. Construct HTML Message Based on Event Type
        let message = '';

        if (eventType === 'completed') {
            message = `🎉 <b>[BROADCAST SELESAI]</b>\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `📢 <b>Kampanye:</b> ${escapeHtml(broadcast.name)}\n` +
                `🏢 <b>Organisasi:</b> ${escapeHtml(broadcast.org_name)}\n` +
                `📱 <b>Pengirim:</b> ${escapeHtml(senderInfo)}\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `📊 <b>RINGKASAN HASIL:</b>\n` +
                `• <b>Total Target:</b> ${total.toLocaleString('id-ID')} Kontak\n` +
                `• ✅ <b>Berhasil Terkirim:</b> ${sent.toLocaleString('id-ID')} (${successRate}%)\n` +
                `• ❌ <b>Gagal:</b> ${failed.toLocaleString('id-ID')} (${failedRate}%)\n` +
                `• ⏱️ <b>Waktu Selesai:</b> ${nowFormatted} WIB\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `<i>Seluruh pesan broadcast telah selesai diproses.</i>`;
        } else if (eventType === 'paused') {
            message = `⚠️ <b>[PERINGATAN: BROADCAST TERJEDA]</b>\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `📢 <b>Kampanye:</b> ${escapeHtml(broadcast.name)}\n` +
                `🏢 <b>Organisasi:</b> ${escapeHtml(broadcast.org_name)}\n` +
                `📱 <b>Pengirim:</b> ${escapeHtml(senderInfo)}\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `⏸️ <b>Status:</b> Kampanye Terhenti / Terjeda\n` +
                `⚠️ <b>Alasan:</b> ${escapeHtml(reason || 'Terdeteksi kegagalan pengiriman beruntun (Circuit Breaker Anti-Ban) atau dijeda manual.')}\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `📊 <b>PROGRES SAAT INI:</b>\n` +
                `• ✅ Terkirim: ${sent.toLocaleString('id-ID')} / ${total.toLocaleString('id-ID')}\n` +
                `• ❌ Gagal: ${failed.toLocaleString('id-ID')}\n` +
                `• ⏳ Sisa Antrean: ${pending.toLocaleString('id-ID')}\n` +
                `• 🕒 Waktu: ${nowFormatted} WIB\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `<i>Silakan periksa koneksi WhatsApp device Anda di dashboard CRMHUB untuk melanjutkan.</i>`;
        } else if (eventType === 'cancelled') {
            message = `🛑 <b>[BROADCAST DIBATALKAN]</b>\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `📢 <b>Kampanye:</b> ${escapeHtml(broadcast.name)}\n` +
                `🏢 <b>Organisasi:</b> ${escapeHtml(broadcast.org_name)}\n` +
                `📱 <b>Pengirim:</b> ${escapeHtml(senderInfo)}\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `🛑 <b>Keterangan:</b> ${escapeHtml(reason || 'Kampanye broadcast dibatalkan oleh pengguna.')}\n` +
                `📊 <b>Status Akhir:</b> Terkirim ${sent}/${total} kontak\n` +
                `🕒 <b>Waktu:</b> ${nowFormatted} WIB\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        }

        // 6. Dispatch to Telegram
        await axios.post(`${TELEGRAM_API_BASE}${config.botToken}/sendMessage`, {
            chat_id: config.chatId,
            text: message,
            parse_mode: 'HTML'
        }, { timeout: 10000 });

        console.log(`[BroadcastTelegram] Successfully sent ${eventType} notification for broadcast #${broadcastId} to Telegram chat ${config.chatId}`);
    } catch (err) {
        console.error('[BroadcastTelegram] Failed to send report:', err.response?.data?.description || err.message);
    }
};

const escapeHtml = (unsafe) => {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

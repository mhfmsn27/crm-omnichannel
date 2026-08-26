import nodemailer from 'nodemailer';
import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const createTransporter = async () => {
    const config = {};
    try {
        const settingsRes = await pool.query("SELECT key, value FROM system_settings WHERE group_name = 'smtp'");
        settingsRes.rows.forEach(r => config[r.key] = r.value);
    } catch (e) {
        console.warn("[BroadcastEmailService] Could not fetch SMTP settings from DB:", e.message);
    }

    const host = config.smtp_host || process.env.SMTP_HOST;
    const port = config.smtp_port || process.env.SMTP_PORT || 587;
    const user = config.smtp_user || process.env.SMTP_USER;
    const pass = config.smtp_pass || process.env.SMTP_PASS;

    if (!host) {
        throw new Error("SMTP Host belum dikonfigurasi. Silakan atur di Pengaturan Sistem atau .env.");
    }

    return nodemailer.createTransport({
        host: host,
        port: parseInt(port),
        secure: parseInt(port) === 465,
        auth: {
            user: user,
            pass: pass,
        },
    });
};

const getSenderIdentity = async (transporterUser) => {
    try {
        const res = await pool.query("SELECT key, value FROM system_settings WHERE key IN ('smtp_from_name', 'smtp_from_email')");
        const config = {};
        res.rows.forEach(r => config[r.key] = r.value);

        const name = config.smtp_from_name || process.env.APP_NAME || 'CRMHub Omnichannel';
        const email = config.smtp_from_email || process.env.SMTP_FROM_EMAIL || transporterUser;

        if (email) {
            return `"${name}" <${email}>`;
        }
    } catch (e) {
        console.warn("[BroadcastEmailService] Failed to determine sender identity:", e.message);
    }
    return transporterUser ? `"${process.env.APP_NAME || 'CRMHub'}" <${transporterUser}>` : null;
};

/**
 * Get Email settings for a broadcast, checking campaign-level override first then global org settings
 */
export const getEmailConfig = async (orgId, campaignEmailSettings = null) => {
    try {
        const globalRes = await pool.query(
            `SELECT * FROM broadcast_settings WHERE organization_id = $1`,
            [orgId]
        );
        const globalSettings = globalRes.rows[0] || {};

        if (campaignEmailSettings && campaignEmailSettings.enabled === false) {
            return null;
        }

        const emailRecipient = (campaignEmailSettings && campaignEmailSettings.emailRecipient)
            ? campaignEmailSettings.emailRecipient
            : globalSettings.email_recipient;

        if (!emailRecipient || !emailRecipient.trim()) {
            return null;
        }

        return {
            emailRecipient: emailRecipient.trim(),
            notifyOnComplete: globalSettings.email_notify_on_complete !== false,
            notifyOnPause: globalSettings.email_notify_on_pause !== false,
            notifyOnCancel: globalSettings.email_notify_on_cancel !== false
        };
    } catch (err) {
        console.error('[BroadcastEmailService] Failed to get config:', err.message);
        return null;
    }
};

/**
 * Send a test email to verify SMTP and recipient address
 */
export const testEmailNotification = async ({ recipientEmail }) => {
    if (!recipientEmail || !recipientEmail.trim()) {
        throw new Error('Alamat email penerima wajib diisi.');
    }

    const transporter = await createTransporter();
    const from = await getSenderIdentity(transporter.options.auth?.user);

    const nowFormatted = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;padding:0;background-color:#f4f6f8;color:#333;}.container{max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);border:1px solid #e5e7eb;}.header{background:linear-gradient(135deg,#f97316,#ea580c);padding:24px;text-align:center;color:#fff;}.content{padding:24px;}.badge{display:inline-block;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:bold;background:#dcfce7;color:#166534;margin-bottom:12px;}.footer{background:#f9fafb;padding:16px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;}</style></head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin:0;font-size:22px;">CRMHub Omnichannel</h1>
                    <p style="margin:6px 0 0;font-size:13px;opacity:0.9;">Tes Notifikasi Laporan Email</p>
                </div>
                <div class="content">
                    <span class="badge">✅ Uji Coba Berhasil</span>
                    <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Koneksi Email Berfungsi Normal</h2>
                    <p style="font-size:14px;line-height:1.6;color:#4b5563;margin:0 0 16px;">
                        Email ini adalah pesan konfirmasi bahwa integrasi laporan broadcast CRMHub Omnichannel ke email Anda telah berhasil disetel.
                    </p>
                    <div style="background:#f3f4f6;padding:12px 16px;border-radius:8px;font-size:13px;color:#374151;">
                        <b>Waktu Uji Coba:</b> ${nowFormatted} WIB
                    </div>
                </div>
                <div class="footer">
                    &copy; ${new Date().getFullYear()} CRMHub Omnichannel. Pesan otomatis dari sistem.
                </div>
            </div>
        </body>
        </html>
    `;

    return await transporter.sendMail({
        from: from,
        to: recipientEmail.trim(),
        subject: `[CRMHUB] Uji Coba Laporan Email - Berhasil Terhubung`,
        html: html
    });
};

/**
 * Send real-time broadcast status report to Email
 * @param {Object} params
 * @param {number|string} params.broadcastId
 * @param {'completed'|'paused'|'cancelled'} params.eventType
 * @param {string} [params.reason]
 * @param {number|string} [params.orgId]
 */
export const sendBroadcastEmailReport = async ({ broadcastId, eventType, reason, orgId }) => {
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

        // Parse campaign email settings if stored
        let campaignEmailSettings = null;
        if (broadcast.email_settings) {
            campaignEmailSettings = typeof broadcast.email_settings === 'string'
                ? JSON.parse(broadcast.email_settings)
                : broadcast.email_settings;
        }

        // 2. Resolve Config
        const config = await getEmailConfig(effectiveOrgId, campaignEmailSettings);
        if (!config) {
            return; // Email reporting not configured or disabled
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
        const appUrl = process.env.APP_URL || 'https://app.crmhub.id';
        const dashboardUrl = `${appUrl}/broadcast/reports`;

        // 5. Build Theme & Copy based on Event
        let titleColor = '#10b981'; // Green
        let statusBadge = '✅ SELESAI';
        let badgeBg = '#dcfce7';
        let badgeText = '#166534';
        let subject = `[SELESAI] Laporan Broadcast: ${broadcast.name}`;

        if (eventType === 'paused') {
            titleColor = '#f59e0b'; // Amber
            statusBadge = '⚠️ TERJEDA (AUTO-PAUSED)';
            badgeBg = '#fef3c7';
            badgeText = '#92400e';
            subject = `[PERINGATAN] Broadcast Terjeda: ${broadcast.name}`;
        } else if (eventType === 'cancelled') {
            titleColor = '#ef4444'; // Red
            statusBadge = '🛑 DIBATALKAN';
            badgeBg = '#fee2e2';
            badgeText = '#991b1b';
            subject = `[DIBATALKAN] Broadcast Dibatalkan: ${broadcast.name}`;
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; color: #1f2937; }
                    .wrapper { max-width: 620px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e5e7eb; }
                    .header { background: linear-gradient(135deg, #1e293b, #0f172a); padding: 28px; text-align: center; color: #ffffff; }
                    .header-logo { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #f97316; margin: 0; }
                    .header-sub { font-size: 13px; color: #94a3b8; margin: 4px 0 0; }
                    .content { padding: 28px; }
                    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 800; letter-spacing: 0.5px; background: ${badgeBg}; color: ${badgeText}; margin-bottom: 16px; }
                    .campaign-title { font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 16px; }
                    .meta-grid { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
                    .meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
                    .meta-row:last-child { margin-bottom: 0; }
                    .meta-label { color: #64748b; font-weight: 500; }
                    .meta-value { color: #0f172a; font-weight: 700; }
                    .stats-container { display: table; width: 100%; table-layout: fixed; margin-bottom: 24px; }
                    .stat-box { display: table-cell; padding: 14px; text-align: center; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; }
                    .stat-box:not(:last-child) { border-right: 6px solid #ffffff; }
                    .stat-number { font-size: 20px; font-weight: 800; margin: 0; }
                    .stat-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-top: 4px; }
                    .alert-box { background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 8px; font-size: 13px; color: #92400e; margin-bottom: 24px; line-height: 1.5; }
                    .btn { display: block; text-align: center; background: #f97316; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 20px; border-radius: 10px; margin-top: 24px; }
                    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="header">
                        <div class="header-logo">CRMHUB OMNICHANNEL</div>
                        <div class="header-sub">Sistem Laporan Otomatis WhatsApp Broadcast</div>
                    </div>
                    <div class="content">
                        <span class="badge">${statusBadge}</span>
                        <h1 class="campaign-title">${escapeHtml(broadcast.name)}</h1>

                        <div class="meta-grid">
                            <div class="meta-row">
                                <span class="meta-label">🏢 Organisasi</span>
                                <span class="meta-value">${escapeHtml(broadcast.org_name)}</span>
                            </div>
                            <div class="meta-row">
                                <span class="meta-label">📱 Pengirim</span>
                                <span class="meta-value">${escapeHtml(senderInfo)}</span>
                            </div>
                            <div class="meta-row">
                                <span class="meta-label">🕒 Waktu Laporan</span>
                                <span class="meta-value">${nowFormatted} WIB</span>
                            </div>
                        </div>

                        ${reason ? `
                        <div class="alert-box">
                            <b>Keterangan:</b> ${escapeHtml(reason)}
                        </div>
                        ` : ''}

                        <table style="width:100%;border-collapse:separate;border-spacing:8px 0;margin-bottom:20px;">
                            <tr>
                                <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;text-align:center;width:33%;">
                                    <div style="font-size:18px;font-weight:800;color:#0f172a;">${total.toLocaleString('id-ID')}</div>
                                    <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin-top:2px;">Total Target</div>
                                </td>
                                <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;text-align:center;width:33%;">
                                    <div style="font-size:18px;font-weight:800;color:#16a34a;">${sent.toLocaleString('id-ID')} (${successRate}%)</div>
                                    <div style="font-size:10px;font-weight:700;color:#16a34a;text-transform:uppercase;margin-top:2px;">✅ Terkirim</div>
                                </td>
                                <td style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px;text-align:center;width:33%;">
                                    <div style="font-size:18px;font-weight:800;color:#dc2626;">${failed.toLocaleString('id-ID')} (${failedRate}%)</div>
                                    <div style="font-size:10px;font-weight:700;color:#dc2626;text-transform:uppercase;margin-top:2px;">❌ Gagal</div>
                                </td>
                            </tr>
                        </table>

                        <a href="${dashboardUrl}" class="btn" style="color:#ffffff;">Buka Laporan di Dashboard CRMHub &rarr;</a>
                    </div>
                    <div class="footer">
                        Email ini dikirimkan secara otomatis oleh CRMHub Omnichannel ke <b>${escapeHtml(config.emailRecipient)}</b>.<br>
                        &copy; ${new Date().getFullYear()} CRMHub Omnichannel. Seluruh hak cipta dilindungi.
                    </div>
                </div>
            </body>
            </html>
        `;

        const transporter = await createTransporter();
        const from = await getSenderIdentity(transporter.options.auth?.user);

        // Split multiple comma-separated emails
        const recipientList = config.emailRecipient.split(',').map(e => e.trim()).filter(Boolean);

        await transporter.sendMail({
            from: from,
            to: recipientList,
            subject: subject,
            html: html
        });

        console.log(`[BroadcastEmailService] Successfully sent ${eventType} email report for broadcast #${broadcastId} to ${config.emailRecipient}`);
    } catch (err) {
        console.error('[BroadcastEmailService] Failed to send email report:', err.message);
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

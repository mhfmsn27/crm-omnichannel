import nodemailer from 'nodemailer';
import pool from '../config/db.js';
import { generateInvoicePdf } from './invoiceService.js';
import dotenv from 'dotenv';

dotenv.config();

const createTransporter = async () => {
    // 1. Try Fetching SMTP settings from DB
    const config = {};
    try {
        const settingsRes = await pool.query("SELECT key, value FROM system_settings WHERE group_name = 'smtp'");
        settingsRes.rows.forEach(r => config[r.key] = r.value);
    } catch (e) {
        console.warn("[EmailService] Warning: Could not fetch SMTP settings from DB:", e.message);
    }

    // 2. Determine Config (DB takes precedence, fallback to ENV)
    const host = config.smtp_host || process.env.SMTP_HOST;
    const port = config.smtp_port || process.env.SMTP_PORT || 587;
    const user = config.smtp_user || process.env.SMTP_USER;
    const pass = config.smtp_pass || process.env.SMTP_PASS;

    // 3. Validation
    if (!host) {
        throw new Error("SMTP Host Not Configured. Please set it in System Settings or .env file.");
    }

    return nodemailer.createTransport({
        host: host,
        port: parseInt(port),
        secure: parseInt(port) === 465, // true for 465, false for other ports
        auth: {
            user: user,
            pass: pass,
        },
    });
};

// Helper to get From Identity
const getSenderIdentity = async (transporterUser) => {
    try {
        const res = await pool.query("SELECT key, value FROM system_settings WHERE key IN ('smtp_from_name', 'smtp_from_email')");
        const config = {};
        res.rows.forEach(r => config[r.key] = r.value);

        const name = config.smtp_from_name || process.env.APP_NAME || 'CRMHub System';
        const email = config.smtp_from_email || process.env.SMTP_FROM_EMAIL || transporterUser;

        if (email) {
            return `"${name}" <${email}>`;
        }
    } catch (e) {
        console.warn("[EmailService] Failed to determine sender identity:", e.message);
    }
    // Final fallback to user if available, or empty (nodemailer might error if no from)
    return transporterUser ? `"${process.env.APP_NAME || 'System'}" <${transporterUser}>` : null;
};

export const sendInvoice = async (transactionId) => {
    try {
        // 1. Fetch Transaction & User details
        const trxRes = await pool.query(`
            SELECT t.*, 
                   u.email, u.name as user_name, o.name as org_name,
                   COALESCE(p.name, a.name) as item_name
            FROM transactions t
            JOIN organizations o ON t.organization_id = o.id
            JOIN users u ON o.id = u.organization_id
            LEFT JOIN plans p ON t.plan_id = p.id
            LEFT JOIN addons a ON t.addon_id = a.id
            WHERE t.id = $1
            LIMIT 1 -- Assume first user is contact person for now
        `, [transactionId]);

        if (trxRes.rows.length === 0) return;
        const trx = trxRes.rows[0];

        // 2. Generate PDF
        const pdfBuffer = await generateInvoicePdf(trx, {
            name: trx.user_name,
            email: trx.email,
            org_name: trx.org_name
        });

        // 3. Send Email
        const transporter = await createTransporter();
        const fromIdentity = await getSenderIdentity(transporter.options.auth.user);

        await transporter.sendMail({
            from: fromIdentity,
            to: trx.email,
            subject: `Payment Successful - Invoice #${trx.invoice_number}`,
            html: `
                <h3>Thank you for your payment!</h3>
                <p>Hi ${trx.user_name},</p>
                <p>Your payment for <strong>${trx.item_name}</strong> has been successfully received.</p>
                <p>Please find the attached invoice for your records.</p>
                <br/>
                <p>Regards,<br/>Reply Team</p>
            `,
            attachments: [
                {
                    filename: `Invoice-${trx.invoice_number}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        });

        console.log(`[EmailService] Invoice sent to ${trx.email}`);

    } catch (error) {
        console.error("[EmailService] Failed to send invoice:", error.message);
    }
};

export const sendResetPasswordEmail = async (email, token) => {
    try {
        const transporter = await createTransporter();
        const fromIdentity = await getSenderIdentity(transporter.options.auth.user);
        const appUrl = process.env.APP_URL || 'http://localhost:3000';

        const resetLink = `${appUrl}/login?view=reset&token=${token}`;

        await transporter.sendMail({
            from: fromIdentity,
            to: email,
            subject: `Reset Password Request`,
            html: `
                <h3>Reset Password</h3>
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <p><a href="${resetLink}" style="padding:10px 20px; background:#4F46E5; color:white; text-decoration:none; border-radius:5px;">Reset Password</a></p>
                <p>Or copy this link: ${resetLink}</p>
                <p>This link expires in 1 hour.</p>
                <br/>
                <p>If you did not request this, please ignore this email.</p>
            `
        });
        console.log(`[EmailService] Reset email sent to ${email}`);
    } catch (error) {
        console.error("[EmailService] Reset email failed:", error.message);
        throw error;
    }
};

export const sendWelcomeEmail = async (email, name, orgName) => {
    try {
        const transporter = await createTransporter();
        const fromIdentity = await getSenderIdentity(transporter.options.auth.user);
        const appUrl = process.env.APP_URL || 'http://localhost:3000';

        await transporter.sendMail({
            from: fromIdentity,
            to: email,
            subject: `Welcome to Cloudchat!`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4F46E5;">Welcome aboard, ${name}!</h2>
                    <p>Terima kasih telah mendaftar di Cloudchat. Workspace Anda <strong>${orgName}</strong> telah berhasil dibuat.</p>
                    <p>Langkah selanjutnya untuk memulai:</p>
                    <ol>
                        <li>Login ke dashboard.</li>
                        <li>Hubungkan nomor WhatsApp Anda (Scan QR).</li>
                        <li>Mulai kirim broadcast atau aktifkan chatbot.</li>
                    </ol>
                    <p><a href="${appUrl}/login" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Login Dashboard</a></p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666;">Jika Anda butuh bantuan, balas email ini.</p>
                </div>
            `
        });
        console.log(`[EmailService] Welcome email sent to ${email}`);
    } catch (error) {
        console.error("[EmailService] Welcome email failed:", error.message);
    }
};

export const sendSubscriptionWarningEmail = async (email, name, planName, expiryDate) => {
    try {
        const transporter = await createTransporter();
        const fromIdentity = await getSenderIdentity(transporter.options.auth.user);
        const appUrl = process.env.APP_URL || 'http://localhost:3000';

        await transporter.sendMail({
            from: fromIdentity,
            to: email,
            subject: `Reminder: Subscription Expiring Soon`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h3 style="color: #F59E0B;">Subscription Expiry Notice</h3>
                    <p>Halo ${name},</p>
                    <p>Ini adalah pengingat bahwa paket langganan <strong>${planName}</strong> Anda akan berakhir pada:</p>
                    <p style="font-size: 16px; font-weight: bold;">${expiryDate}</p>
                    <p>Agar layanan chatbot dan broadcast Anda tidak terhenti, mohon lakukan perpanjangan sebelum tanggal tersebut.</p>
                    <p><a href="${appUrl}/order" style="background-color: #F59E0B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Perpanjang Sekarang</a></p>
                </div>
            `
        });
        console.log(`[EmailService] Expiry warning sent to ${email}`);
    } catch (error) {
        console.error("[EmailService] Expiry warning failed:", error.message);
    }
};

export const sendEmail = async (to, subject, html) => {
    try {
        const transporter = await createTransporter();
        const fromIdentity = await getSenderIdentity(transporter.options.auth.user);

        await transporter.sendMail({
            from: fromIdentity,
            to,
            subject,
            html
        });
        console.log(`[EmailService] Email sent to ${to}`);
    } catch (error) {
        console.error("[EmailService] Failed to send email:", error.message);
        throw error;
    }
};

// ── Org-based Email (uses org's own SMTP settings) ──────────────────────────

export const getOrgSmtpConfig = async (orgId) => {
    const res = await pool.query(
        `SELECT smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, smtp_from_email, smtp_from_name, smtp_enabled
         FROM organizations WHERE id = $1`,
        [orgId]
    );
    if (!res.rows[0]) return null;
    const row = res.rows[0];
    if (row.smtp_pass) row.smtp_pass = ''; // mask
    return row;
};

export const saveOrgSmtpConfig = async (orgId, cfg) => {
    const sets = ['smtp_host = $1', 'smtp_port = $2', 'smtp_secure = $3', 'smtp_user = $4', 'smtp_from_email = $5', 'smtp_from_name = $6', 'smtp_enabled = $7'];
    const params = [cfg.smtp_host, cfg.smtp_port ?? 587, cfg.smtp_secure ?? false, cfg.smtp_user, cfg.smtp_from_email, cfg.smtp_from_name ?? '', cfg.smtp_enabled ?? false];
    if (cfg.smtp_pass && cfg.smtp_pass.trim() !== '') {
        sets.push(`smtp_pass = $8`);
        params.push(cfg.smtp_pass);
    }
    params.push(orgId);
    await pool.query(`UPDATE organizations SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
};

export const testOrgSmtpConnection = async (orgId) => {
    const res = await pool.query(
        `SELECT smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, smtp_from_email
         FROM organizations WHERE id = $1`,
        [orgId]
    );
    const cfg = res.rows[0];
    if (!cfg?.smtp_host) throw new Error('SMTP host belum diisi');
    if (!cfg?.smtp_pass && !cfg?.smtp_user) throw new Error('SMTP credentials belum diisi');

    const transporter = nodemailer.createTransport({
        host: cfg.smtp_host,
        port: parseInt(cfg.smtp_port) || 587,
        secure: cfg.smtp_secure,
        auth: cfg.smtp_user ? { user: cfg.smtp_user, pass: cfg.smtp_pass || '' } : undefined
    });
    await transporter.verify();
    return true;
};

export const sendOrgEmail = async ({ organizationId, to, subject, html, text }) => {
    const res = await pool.query(
        `SELECT smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, smtp_from_email, smtp_from_name, smtp_enabled
         FROM organizations WHERE id = $1`,
        [organizationId]
    );
    const cfg = res.rows[0];

    if (!cfg?.smtp_enabled || !cfg?.smtp_host) {
        throw new Error('SMTP belum diaktifkan. Silakan atur di Settings.');
    }

    const transporter = nodemailer.createTransport({
        host: cfg.smtp_host,
        port: parseInt(cfg.smtp_port) || 587,
        secure: cfg.smtp_secure,
        auth: cfg.smtp_user ? { user: cfg.smtp_user, pass: cfg.smtp_pass || '' } : undefined
    });

    const fromIdentity = cfg.smtp_from_email
        ? `"${cfg.smtp_from_name || 'CRMHUB'}" <${cfg.smtp_from_email}>`
        : `"${cfg.smtp_from_name || 'CRMHUB'}" <${cfg.smtp_user}>`;

    const info = await transporter.sendMail({
        from: fromIdentity,
        to,
        subject,
        html,
        text: text || html?.replace(/<[^>]+>/g, '') || ''
    });

    // Log
    await pool.query(
        `INSERT INTO email_logs (organization_id, to_email, subject, status) VALUES ($1, $2, $3, 'sent')`,
        [organizationId, to, subject]
    );

    return { messageId: info.messageId };
};

export const sendSubscriptionExpiredEmail = async (email, name, planName) => {
    try {
        const transporter = await createTransporter();
        const fromIdentity = await getSenderIdentity(transporter.options.auth.user);
        const appUrl = process.env.APP_URL || 'http://localhost:3000';

        await transporter.sendMail({
            from: fromIdentity,
            to: email,
            subject: `Alert: Subscription Expired`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h3 style="color: #DC2626;">Layanan Anda Telah Berhenti</h3>
                    <p>Halo ${name},</p>
                    <p>Masa aktif paket <strong>${planName}</strong> Anda telah habis hari ini.</p>
                    <p>Saat ini layanan broadcast, chatbot, dan automasi lainnya telah dinonaktifkan sementara.</p>
                    <p>Silakan lakukan pembayaran untuk mengaktifkan kembali layanan Anda.</p>
                    <p><a href="${appUrl}/order" style="background-color: #DC2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Reaktivasi Akun</a></p>
                </div>
            `
        });
        console.log(`[EmailService] Expired notice sent to ${email}`);
    } catch (error) {
        console.error("[EmailService] Expired email failed:", error.message);
    }
};

export const sendDeviceDisconnectedEmail = async (email, name, deviceName) => {
    try {
        const transporter = await createTransporter();
        const fromIdentity = await getSenderIdentity(transporter.options.auth.user);
        const appUrl = process.env.APP_URL || 'http://localhost:3000';

        await transporter.sendMail({
            from: fromIdentity,
            to: email,
            subject: `Alert: WhatsApp Device Disconnected`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h3 style="color: #DC2626;">Perangkat WhatsApp Terputus</h3>
                    <p>Halo ${name},</p>
                    <p>Sesi WhatsApp Anda untuk perangkat <strong>${deviceName}</strong> telah terputus dari sistem (Disconnected/Logged Out).</p>
                    <p>Mohon segera scan ulang QR Code di dashboard agar fitur pesan, broadcast, dan chatbot dapat kembali berjalan normal.</p>
                    <p><a href="${appUrl}/settings/devices" style="background-color: #DC2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Hubungkan Ulang</a></p>
                </div>
            `
        });
        console.log(`[EmailService] Device disconnected notice sent to ${email}`);
    } catch (error) {
        console.error("[EmailService] Device disconnected email failed:", error.message);
    }
};
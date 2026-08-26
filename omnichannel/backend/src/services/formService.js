import pool from '../config/db.js';
import * as waService from './waGatewayService.js';
import MetaService from './MetaService.js';
import MessengerService from './MessengerService.js';
import InstagramService from './InstagramService.js';
import TelegramService from './TelegramService.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCodeLib from 'qrcode';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper to log outgoing message to DB and Emit Socket
const logOutgoingMessage = async (orgId, contactId, conversationId, channel, content, type = 'text', mediaUrl = null) => {
    try {
        if (!conversationId) {
            const convRes = await pool.query(
                'SELECT id FROM conversations WHERE organization_id = $1 AND contact_id = $2 LIMIT 1',
                [orgId, contactId]
            );
            if (convRes.rows.length > 0) conversationId = convRes.rows[0].id;
            else return; 
        }

        const waMessageId = `bot-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        
        const msgRes = await pool.query(
            `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, media_url, status, wa_message_id, created_at)
             VALUES ($1, $2, true, $3, $4, $5, 'sent', $6, NOW()) 
             RETURNING *`,
            [conversationId, orgId, type, content, mediaUrl, waMessageId]
        );

        await pool.query(
            `UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
            [type === 'text' ? content : `[${type}]`, conversationId]
        );
        
        // RETURN the message object so webchat logic can use it if needed (e.g. emitting socket manually)
        return msgRes.rows[0];

    } catch (e) {
        console.error("[FormService] Log Error:", e.message);
        return null;
    }
};

// --- HELPER: UNIFIED MESSAGE DISPATCHER ---
const dispatchMessage = async (session, to, content, options = {}) => {
    try {
        let channel = session.channel || 'whatsapp';
        let metadata = session.metadata || {};

        if (session.answers && session.answers._channel) {
            channel = session.answers._channel;
            metadata = session.answers._metadata || {};
        }
        
        const orgId = session.organization_id || session.org_id; 
        const contactId = session.contact_id;
        
        let conversationId = null;
        if (orgId && contactId) {
             const cRes = await pool.query('SELECT id FROM conversations WHERE organization_id = $1 AND contact_id = $2', [orgId, contactId]);
             if(cRes.rows.length > 0) conversationId = cRes.rows[0].id;
        }

        console.log(`[FormDispatch] Channel: ${channel}, To: ${to}`);

        // 1. WHATSAPP
        if (channel === 'whatsapp') {
            const dbSessionId = session.whatsapp_session_id;
            if (!dbSessionId) return;

            const sessionRes = await pool.query('SELECT * FROM whatsapp_sessions WHERE id = $1', [dbSessionId]);
            if (sessionRes.rows.length === 0) return;
            
            const waSession = sessionRes.rows[0];
            
            if (waSession.type === 'official') {
                 const metaOptions = {
                    type: options.type || 'text',
                    mediaUrl: options.mediaUrl
                 };
                 if (metaOptions.type === 'text' && !options.mediaUrl && options.mimetype) {
                     if (options.mimetype.startsWith('image')) metaOptions.type = 'image';
                     else if (options.mimetype.startsWith('video')) metaOptions.type = 'video';
                     else if (options.mimetype.startsWith('audio')) metaOptions.type = 'audio';
                     else metaOptions.type = 'document';
                 }
                 await MetaService.sendMessage(waSession, to, metaOptions.type, content, metaOptions.mediaUrl);
            } else {
                if (options.type === 'document' || options.mediaUrl) {
                    await waService.sendMedia(waSession.session_id, to, options.mediaUrl, content, options.mimetype, options.filename);
                } else {
                    await waService.sendText(waSession.session_id, to, content);
                }
            }
        }
        // 2. TELEGRAM
        else if (channel === 'telegram') {
            const token = metadata.botToken;
            if (!token) return console.warn("[FormService] Missing Telegram Token");
            
            if (options.mediaUrl) {
                if (options.mimetype?.startsWith('image')) {
                    await TelegramService.sendPhoto(token, to, options.mediaUrl, content);
                } else {
                    // Use local file sending for PDFs generated locally
                    await TelegramService.sendDocument(token, to, options.mediaUrl, content);
                }
            } else {
                await TelegramService.sendMessage(token, to, content);
            }
            
            if(orgId) await logOutgoingMessage(orgId, contactId, conversationId, channel, content, options.mediaUrl ? (options.type || 'image') : 'text', options.mediaUrl);
        }
        // 3. MESSENGER
        else if (channel === 'messenger') {
            const token = metadata.pageAccessToken;
            if (!token) return console.warn("[FormService] Missing Messenger Token");
            
            let mediaType = 'image';
            if (options.mimetype?.includes('pdf')) mediaType = 'file';
            else if (options.mimetype?.includes('video')) mediaType = 'video';

            await MessengerService.sendMessage(token, to, content, options.mediaUrl, mediaType);
            
            // Map 'file' to 'document' for DB/Frontend consistency
            const dbMediaType = mediaType === 'file' ? 'document' : mediaType;
            
            if(orgId) await logOutgoingMessage(orgId, contactId, conversationId, channel, content, options.mediaUrl ? dbMediaType : 'text', options.mediaUrl);
        }
        // 4. INSTAGRAM
        else if (channel === 'instagram') {
            const token = metadata.accessToken;
            if (!token) return console.warn("[FormService] Missing Instagram Token");
            
            if (options.mediaUrl && (options.mimetype?.includes('pdf') || options.type === 'document')) {
                 const linkMsg = `${content}: ${options.mediaUrl}`;
                 await InstagramService.sendMessage(token, to, linkMsg);
                 if(orgId) await logOutgoingMessage(orgId, contactId, conversationId, channel, linkMsg, 'text');
            } else {
                let mediaType = 'image';
                if (options.mimetype?.includes('video')) mediaType = 'video';
                
                await InstagramService.sendMessage(token, to, content, options.mediaUrl, mediaType);
                
                if(orgId) await logOutgoingMessage(orgId, contactId, conversationId, channel, content, options.mediaUrl ? mediaType : 'text', options.mediaUrl);
            }
        }
        // 5. WEBCHAT (NEW)
        else if (channel === 'webchat') {
            // For Webchat, we just need to log the outgoing message to the DB.
            // The frontend widget polls/listens to the DB for new messages.
            
            const mediaType = options.mediaUrl ? (options.type || 'document') : 'text';
            await logOutgoingMessage(orgId, contactId, conversationId, channel, content, mediaType, options.mediaUrl);
        }

    } catch (e) {
        console.error(`[FormService] Dispatch Error (${to}):`, e.message);
    }
};

const generatePdf = async (submission, config, formName, regNumber) => {
    return new Promise(async (resolve, reject) => {
        try {
            const isLandscape = config.layout === 'card_landscape';
            const isTicket = config.layout === 'ticket';
            
            const doc = new PDFDocument({ 
                size: isLandscape ? [400, 250] : (isTicket ? [220, 600] : 'A4'), 
                margin: isTicket ? 10 : (isLandscape ? 0 : 30),
                layout: isLandscape ? 'landscape' : 'portrait',
                autoFirstPage: true
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            if (isLandscape) {
                doc.rect(0, 0, 400, 250).fill('#ffffff'); 
                doc.rect(0, 0, 400, 50).fill('#4f46e5'); 
                doc.rect(0, 235, 400, 15).fill('#e0e7ff');
            } else if (!isTicket) {
                doc.rect(0, 0, 595, 100).fill('#f8fafc');
            }

            if (config.logo_url) {
                try {
                    const logoPath = path.join(__dirname, '../../', config.logo_url);
                    if (fs.existsSync(logoPath)) {
                        if (isLandscape) doc.image(logoPath, 20, 10, { height: 30, width: 30, fit: [30, 30] });
                        else if (isTicket) { doc.image(logoPath, 85, 10, { height: 40, width: 40, align: 'center' }); doc.moveDown(3); }
                        else doc.image(logoPath, 40, 30, { height: 40, width: 40 });
                    }
                } catch (e) {}
            }

            const title = (config.title || formName).toUpperCase();
            if (isLandscape) {
                doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold').text(title, 60, 20, { align: 'right', width: 320 });
                doc.fillColor('#000000');
            } else if (isTicket) {
                doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold').text(title, { align: 'center' });
                doc.moveDown(0.5);
                doc.fontSize(8).font('Helvetica').text('--------------------------------', { align: 'center' });
                doc.moveDown(0.5);
            } else {
                doc.fillColor('#1e293b').fontSize(20).font('Helvetica-Bold').text(title, 0, 40, { align: 'center' });
                doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(`Date: ${new Date().toLocaleDateString()}`, 0, 70, { align: 'center' });
                doc.y = 130; 
            }

            const answers = submission;
            let currentY = isLandscape ? 70 : (isTicket ? doc.y : 130);
            
            doc.fontSize(isLandscape || isTicket ? 9 : 11).font('Helvetica').fillColor('#000000');

            const fields = config.fields_to_print && config.fields_to_print.length > 0 ? config.fields_to_print : Object.keys(answers);

            if (config.enable_reg_number && regNumber) {
                if (isLandscape) {
                    doc.font('Helvetica-Bold').text(`NO: ${regNumber}`, 20, currentY);
                    currentY += 15;
                } else if (isTicket) {
                    doc.font('Helvetica-Bold').text(`NO: ${regNumber}`, { align: 'center' });
                    doc.moveDown(0.5);
                } else {
                    doc.font('Helvetica-Bold').fontSize(14).text(`REGISTRATION NO: ${regNumber}`, 50, currentY);
                    currentY += 30;
                }
            }

            doc.font('Helvetica');

            fields.forEach(key => {
                if (key.startsWith('_')) return;
                if (answers[key]) {
                    const label = key.toUpperCase();
                    const value = String(answers[key]);

                    if (isTicket) {
                        doc.fontSize(8).text(`${label}:`, { continued: false });
                        doc.fontSize(9).font('Helvetica-Bold').text(value);
                        doc.moveDown(0.3);
                        doc.font('Helvetica');
                    } else if (isLandscape) {
                        if (currentY < 200) { 
                            doc.fontSize(7).fillColor('#64748b').text(label, 20, currentY);
                            doc.fontSize(9).fillColor('#000000').font('Helvetica-Bold').text(value, 100, currentY);
                            currentY += 14;
                        }
                    } else {
                        doc.fontSize(10).fillColor('#64748b').text(label, 50, currentY);
                        doc.fontSize(12).fillColor('#1e293b').text(value, 200, currentY);
                        doc.save().moveTo(50, currentY + 15).lineTo(545, currentY + 15).lineWidth(0.5).strokeColor('#e2e8f0').stroke().restore();
                        currentY += 25;
                    }
                }
            });

            if (config.qr_enabled) {
                const qrField = config.qr_field || 'Registration Number';
                const qrValue = answers[qrField] || regNumber || "ID-MISSING";
                try {
                    const qrBuffer = await QRCodeLib.toBuffer(qrValue, { width: 200, margin: 1 });
                    if (isLandscape) {
                        doc.image(qrBuffer, 280, 70, { width: 100, height: 100 });
                        doc.fontSize(6).text("SCAN ME", 280, 175, { width: 100, align: 'center' });
                    } else if (isTicket) {
                        doc.moveDown();
                        const xPos = (220 - 80 - 20) / 2;
                        doc.image(qrBuffer, xPos, doc.y, { width: 80, height: 80 });
                        doc.moveDown(5);
                    } else {
                        doc.image(qrBuffer, 450, 120, { width: 100, height: 100 });
                    }
                } catch (qrErr) {}
            }

            if (config.footer_text) {
                if (isLandscape) doc.fontSize(8).fillColor('#6366f1').text(config.footer_text, 20, 238, { align: 'left', width: 360 });
                else if (isTicket) { doc.moveDown(); doc.fontSize(8).text(config.footer_text, { align: 'center' }); }
                else doc.fontSize(10).fillColor('#94a3b8').text(config.footer_text, 50, 750, { align: 'center', width: 500 });
            }

            doc.end();
        } catch (e) { reject(e); }
    });
};

// --- CORE LOGIC ---

export const handleIncomingMessage = async (orgId, contactId, dbSessionId, gatewaySessionId, messageBody, senderPhone, channel = 'whatsapp', channelContext = {}, mediaUrl = null, mimetype = null) => {
    const text = messageBody ? messageBody.trim() : '';

    // Check active session
    const sessionRes = await pool.query(
        `SELECT fs.*, f.steps, f.pdf_config, f.name as form_name 
         FROM form_sessions fs
         JOIN forms f ON fs.form_id = f.id
         WHERE fs.contact_id = $1 AND fs.status = 'active'`,
        [contactId]
    );

    if (sessionRes.rows.length > 0) {
        const session = sessionRes.rows[0];
        
        const fullSession = { 
            ...session, 
            channel: session.answers?._channel || 'whatsapp',
            metadata: session.answers?._metadata || {},
            organization_id: orgId // Pass orgId for logging
        };
        
        // Pass media data if present
        await processAnswer(fullSession, text, senderPhone, mediaUrl, mimetype);
        return { handled: true };
    }

    // Check Trigger (Text only for triggers)
    if (text) {
        const formRes = await pool.query(
            `SELECT * FROM forms WHERE organization_id = $1 AND is_active = true AND trigger_keyword ILIKE $2`,
            [orgId, text.toLowerCase()]
        );

        if (formRes.rows.length > 0) {
            const form = formRes.rows[0];
            await startSession(orgId, form, contactId, dbSessionId, senderPhone, channel, channelContext);
            return { handled: true };
        }
    }

    return { handled: false };
};

const startSession = async (orgId, form, contactId, dbSessionId, senderPhone, channel, channelContext) => {
    const initialData = {
        _channel: channel,
        _metadata: channelContext
    };

    // If channel is NOT whatsapp, set whatsapp_session_id to NULL to avoid FK error
    const targetSessionId = channel === 'whatsapp' ? dbSessionId : null;

    await pool.query(
        `INSERT INTO form_sessions (form_id, contact_id, whatsapp_session_id, current_step_index, answers, status)
         VALUES ($1, $2, $3, 0, $4, 'active')`,
        [form.id, contactId, targetSessionId, initialData]
    );

    const firstStep = form.steps[0];
    
    // Pass required context for dispatch logging
    const sessionProxy = { 
        channel, 
        metadata: channelContext, 
        whatsapp_session_id: targetSessionId,
        organization_id: orgId,
        contact_id: contactId
    };
    
    await dispatchMessage(sessionProxy, senderPhone, `[FORM: ${form.name}]\n\n${firstStep.question}`);
};

const processAnswer = async (session, answerText, senderPhone, mediaUrl = null, mimetype = null) => {
    const currentStep = session.steps[session.current_step_index];
    const answers = session.answers || {};
    
    let finalAnswer = answerText;

    // Validation
    if (currentStep.validation === 'email' && !answerText.includes('@')) {
        await dispatchMessage(session, senderPhone, "Format email salah. Silakan coba lagi.");
        return;
    }
    if (currentStep.validation === 'number' && isNaN(answerText)) {
        await dispatchMessage(session, senderPhone, "Harap masukkan angka yang valid.");
        return;
    }
    
    // If step requires media but none provided
    if (currentStep.validation === 'image' || currentStep.validation === 'file') {
        if (!mediaUrl) {
            await dispatchMessage(session, senderPhone, "Harap upload file/gambar untuk melanjutkan.");
            return;
        }
        // Save Media URL as answer
        finalAnswer = mediaUrl;
    }

    const key = currentStep.label || `Q${session.current_step_index + 1}`;
    answers[key] = finalAnswer;

    const nextIndex = session.current_step_index + 1;

    if (nextIndex < session.steps.length) {
        await pool.query(
            `UPDATE form_sessions SET current_step_index = $1, answers = $2, updated_at = NOW() WHERE id = $3`,
            [nextIndex, answers, session.id]
        );
        
        const nextStep = session.steps[nextIndex];
        await dispatchMessage(session, senderPhone, nextStep.question);

    } else {
        await finishSession(session, answers, senderPhone);
    }
};

const finishSession = async (session, answers, senderPhone) => {
    await pool.query("DELETE FROM form_sessions WHERE id = $1", [session.id]);

    let pdfUrl = null;
    let fileName = null;
    const pdfConfig = session.pdf_config || {};
    
    const cleanAnswers = {};
    Object.keys(answers).forEach(k => {
        if(!k.startsWith('_')) cleanAnswers[k] = answers[k];
    });

    let regNumber = null;
    if (pdfConfig.enable_reg_number) {
        const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        regNumber = `REG-${dateStr}-${random}`;
        cleanAnswers['Registration Number'] = regNumber;
    }

    if (pdfConfig.enabled) {
        try {
            const pdfBuffer = await generatePdf(cleanAnswers, pdfConfig, session.form_name, regNumber);
            fileName = `Form_${session.id}_${Date.now()}.pdf`;
            const uploadPath = path.join(__dirname, '../../uploads', fileName);
            
            if (!fs.existsSync(path.dirname(uploadPath))) fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
            fs.writeFileSync(uploadPath, pdfBuffer);
            pdfUrl = `/uploads/${fileName}`;
        } catch (e) { console.error("PDF Gen Error:", e); }
    }

    await pool.query(
        `INSERT INTO form_submissions (form_id, contact_id, data, generated_pdf_url) VALUES ($1, $2, $3, $4)`,
        [session.form_id, session.contact_id, cleanAnswers, pdfUrl]
    );

    const closingMsg = pdfConfig.closing_message || "Terima kasih! Data Anda telah kami terima.";
    await dispatchMessage(session, senderPhone, closingMsg);

    if (pdfUrl) {
        const fullUrl = `${process.env.APP_URL}${pdfUrl}`;
        await dispatchMessage(session, senderPhone, "Bukti Pendaftaran (PDF)", {
            type: 'document',
            mediaUrl: fullUrl,
            mimetype: 'application/pdf',
            filename: fileName || "Bukti_Pendaftaran.pdf"
        });
    }
};

export const getForms = async (orgId) => {
    const res = await pool.query(
        `SELECT f.*, (SELECT count(*) FROM form_submissions WHERE form_id = f.id) as submission_count 
         FROM forms f WHERE organization_id = $1 ORDER BY created_at DESC`,
        [orgId]
    );
    return res.rows;
};

export const createForm = async (orgId, data) => {
    const { name, trigger_keyword, steps, pdf_config } = data;
    const res = await pool.query(
        `INSERT INTO forms (organization_id, name, trigger_keyword, steps, pdf_config)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [orgId, name, trigger_keyword.toLowerCase(), JSON.stringify(steps), JSON.stringify(pdf_config)]
    );
    return res.rows[0];
};

export const updateForm = async (orgId, id, data) => {
    const { name, trigger_keyword, steps, pdf_config, is_active } = data;
    const res = await pool.query(
        `UPDATE forms SET name=$1, trigger_keyword=$2, steps=$3, pdf_config=$4, is_active=$5, updated_at=NOW()
         WHERE id=$6 AND organization_id=$7 RETURNING *`,
        [name, trigger_keyword.toLowerCase(), JSON.stringify(steps), JSON.stringify(pdf_config), is_active, id, orgId]
    );
    return res.rows[0];
};

export const deleteForm = async (orgId, id) => {
    await pool.query("DELETE FROM forms WHERE id=$1 AND organization_id=$2", [id, orgId]);
};

export const getSubmissions = async (orgId, formId) => {
    const res = await pool.query(
        `SELECT fs.*, c.name as contact_name, c.phone_number 
         FROM form_submissions fs
         JOIN contacts c ON fs.contact_id = c.id
         WHERE fs.form_id = $1 
         ORDER BY fs.created_at DESC LIMIT 100`,
        [formId]
    );
    return res.rows;
};
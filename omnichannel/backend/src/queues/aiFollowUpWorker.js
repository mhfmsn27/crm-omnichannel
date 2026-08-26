import { Worker, Queue } from 'bullmq';
import redisConnection from '../config/redis.js';
import pool from '../config/db.js';
import * as waService from '../services/waGatewayService.js';
import { generateResponse } from '../services/aiService.js';
import crypto from 'crypto';

export const aiFollowUpQueue = new Queue('ai-follow-up-queue', { connection: redisConnection });

export const initAiFollowUpWorker = (io) => {
    const worker = new Worker('ai-follow-up-queue', async (job) => {
        const { organization_id, contact_id, conversation_id, session_id, bot_id, from, original_message } = job.data;
        
        console.log(`[AIFollowUp] Processing job ${job.id} for contact ${contact_id}`);
        
        try {
            // Check if user has replied since this job was scheduled
            // We can check if the last_message in the conversation is from the user, 
            // AND if the timestamp of the last message is NEWER than when this job was scheduled.
            const convRes = await pool.query('SELECT last_message_at, is_chatbot_active FROM conversations WHERE id = $1', [conversation_id]);
            if (convRes.rows.length === 0) return;
            const conv = convRes.rows[0];
            
            // If chatbot was turned off manually, abort
            if (!conv.is_chatbot_active) {
                console.log(`[AIFollowUp] Chatbot inactive for conv ${conversation_id}. Aborting double text.`);
                return;
            }
            
            // Check if there are any user messages AFTER the job timestamp
            const userMsgRes = await pool.query(
                `SELECT id FROM messages WHERE conversation_id = $1 AND from_me = false AND created_at > $2`,
                [conversation_id, new Date(job.timestamp)]
            );
            
            if (userMsgRes.rows.length > 0) {
                console.log(`[AIFollowUp] User replied after double-text was queued. Aborting.`);
                return;
            }

            // Also check bot settings to make sure it's still enabled
            const botRes = await pool.query('SELECT * FROM chatbot_settings WHERE id = $1 AND is_active = true', [bot_id]);
            if (botRes.rows.length === 0) return;
            const bot = botRes.rows[0];
            
            if (!bot.double_text_enabled) {
                console.log(`[AIFollowUp] Double text disabled for bot ${bot_id}. Aborting.`);
                return;
            }

            // Fetch chat history
            const historyRes = await pool.query('SELECT from_me, content FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 10', [conversation_id]);
            const chatHistory = historyRes.rows.reverse();

            const contactRes = await pool.query('SELECT name, phone_number FROM contacts WHERE id = $1', [contact_id]);
            const contactInfo = contactRes.rows[0] || { name: 'Customer', phone_number: from };

            const extraContext = "The user has not replied to your previous message. Send a polite, engaging follow-up message (double text) to bump the conversation and encourage them to reply.";

            // Generate AI response
            const aiResponse = await generateResponse(organization_id, original_message, chatHistory, bot, extraContext, contactInfo);

            if (aiResponse && aiResponse !== "[ESCALATE]") {
                // Send the message
                await waService.sendText(session_id, from, aiResponse);
                
                // Save to DB
                const botMsgId = `bot.dt.${crypto.randomUUID()}`;
                const aiMsg = await pool.query('INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id) VALUES ($1, $2, true, $3, $4, $5, $6) RETURNING *', [conversation_id, organization_id, 'text', aiResponse, 'sent', botMsgId]);
                
                if (io) {
                    io.to(`org_${organization_id}`).emit('new_message', { conversationId: conversation_id, message: aiMsg.rows[0] });
                }

                // Update conversation snippet
                await pool.query(
                    `UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
                    [aiResponse, conversation_id]
                );
            }

        } catch (error) {
            console.error(`[AIFollowUpWorker] Error processing job ${job.id}:`, error);
        }
    }, { connection: redisConnection });

    worker.on('failed', (job, err) => {
        console.error(`[AIFollowUpWorker] Job ${job.id} failed:`, err);
    });

    console.log("AI Double-Text FollowUp Worker Initialized");
};

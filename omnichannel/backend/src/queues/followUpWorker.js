import pool from '../config/db.js';
import * as waService from '../services/waGatewayService.js';

// Helper to replace variables like {name}
const replaceVariables = (text, contactName) => {
    return text.replace(/{name}/gi, contactName || 'Kak');
};

export const initFollowUpWorker = () => {
    // Run every minute
    setInterval(async () => {
        await processFollowUps();
    }, 60000);

    console.log("Auto Follow-up Scheduler Initialized");
};

const processFollowUps = async () => {
    const client = await pool.connect();
    try {
        // 1. Fetch ACTIVE instances due for execution
        const dueInstances = await client.query(`
            SELECT fi.*, 
                   c.name as contact_name, c.phone_number, 
                   ws.session_id as gateway_session_id,
                   fs.steps
            FROM followup_instances fi
            JOIN contacts c ON fi.contact_id = c.id
            JOIN whatsapp_sessions ws ON fi.whatsapp_session_id = ws.id
            JOIN followup_sequences fs ON fi.sequence_id = fs.id
            WHERE fi.status = 'active' AND fi.next_run_at <= NOW()
            FOR UPDATE SKIP LOCKED
        `);

        for (const instance of dueInstances.rows) {
            try {
                // 2. CHECK CANCELLATION CONDITION (Has user replied?)
                // Check for incoming messages from this contact created AFTER the follow-up started
                // or significantly, after the last check.
                // Logic: If any incoming message exists with ID > last_check_message_id

                const replyCheck = await client.query(
                    `SELECT id FROM messages 
                     WHERE organization_id = $1 
                     AND from_me = false 
                     AND conversation_id IN (SELECT id FROM conversations WHERE contact_id = $2)
                     AND id > $3
                     LIMIT 1`,
                    [instance.organization_id, instance.contact_id, instance.last_check_message_id || 0]
                );

                if (replyCheck.rows.length > 0) {
                    // User has replied! Cancel follow-up.
                    console.log(`[FollowUp] User replied. Cancelling instance ${instance.id}`);
                    await client.query("UPDATE followup_instances SET status = 'cancelled' WHERE id = $1", [instance.id]);
                    continue;
                }

                // 3. SEND MESSAGE
                const steps = instance.steps;
                if (!Array.isArray(steps) || steps.length === 0) {
                    console.warn(`[FollowUp] Instance ${instance.id} has no steps. Completing.`);
                    await client.query("UPDATE followup_instances SET status = 'completed' WHERE id = $1", [instance.id]);
                    continue;
                }
                const currentStep = steps[instance.current_step_index];

                if (currentStep) {
                    const message = replaceVariables(currentStep.message, instance.contact_name);

                    // Validate session ID exists
                    if (!instance.gateway_session_id) {
                        console.warn(`[FollowUp] Missing Session ID for instance ${instance.id}. Pausing.`);
                        await client.query("UPDATE followup_instances SET status = 'paused' WHERE id = $1", [instance.id]);
                        continue;
                    }

                    // Send via Gateway
                    await waService.sendText(instance.gateway_session_id, instance.phone_number, message);
                }

                // 4. SCHEDULE NEXT STEP or COMPLETE
                const nextIndex = instance.current_step_index + 1;
                if (nextIndex < steps.length) {
                    const nextDelay = parseFloat(steps[nextIndex].delay_hours);
                    if (isNaN(nextDelay) || nextDelay < 0) {
                        console.warn(`[FollowUp] Instance ${instance.id} step ${nextIndex} has invalid delay_hours. Pausing.`);
                        await client.query("UPDATE followup_instances SET status = 'paused' WHERE id = $1", [instance.id]);
                        continue;
                    }
                    const nextRun = new Date();
                    nextRun.setHours(nextRun.getHours() + nextDelay);

                    await client.query(
                        `UPDATE followup_instances 
                         SET current_step_index = $1, next_run_at = $2, updated_at = NOW() 
                         WHERE id = $3`,
                        [nextIndex, nextRun, instance.id]
                    );
                } else {
                    // All steps done
                    await client.query("UPDATE followup_instances SET status = 'completed' WHERE id = $1", [instance.id]);
                }

            } catch (err) {
                const msg = (err.message || '').toLowerCase();

                // Permanent failures: session disconnected or invalid — pause the instance
                const isPermanent = msg.includes('not active') || msg.includes('not connected') ||
                    msg.includes('invalid uuid') || msg.includes('silakan hubungkan') ||
                    msg.includes('session not found') || msg.includes('unauthorized');

                // Transient failures: network blip, timeout — keep active and retry next tick
                const isTransient = msg.includes('timeout') || msg.includes('econnreset') ||
                    msg.includes('socket hang up');

                // Gateway unreachable — pause to avoid spamming a dead endpoint
                const isGatewayDown = msg.includes('econnrefused') || msg.includes('enotfound') ||
                    msg.includes('connect error') || msg.includes('network error');

                if (isPermanent || isGatewayDown) {
                    const reason = isPermanent ? 'session disconnected' : 'gateway unreachable';
                    console.warn(`[FollowUp] Instance ${instance.id} paused (${reason}): ${err.message}`);
                    try {
                        await client.query("UPDATE followup_instances SET status = 'paused' WHERE id = $1", [instance.id]);
                    } catch (updateErr) {
                        console.error(`[FollowUp] Failed to pause instance ${instance.id}:`, updateErr.message);
                    }
                } else if (isTransient) {
                    console.warn(`[FollowUp] Instance ${instance.id} will retry (transient error): ${err.message}`);
                } else {
                    console.error(`[FollowUp] Error processing instance ${instance.id}:`, err);
                }
            }
        }
    } catch (err) {
        console.error("[FollowUpWorker] Error:", err);
    } finally {
        client.release();
    }
};
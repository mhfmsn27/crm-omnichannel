import cron from 'node-cron';
import pool from '../config/db.js';
import * as FlowEngineService from './FlowEngineService.js';

/**
 * Flow Cron Job
 * Runs every minute to wake up 'sleeping' flow sessions whose delay has passed.
 */
export const startFlowCron = () => {
    cron.schedule('* * * * *', async () => {
        try {
            // Find sleeping sessions whose resume_at has passed
            const result = await pool.query(`
                SELECT fs.*, cf.nodes, cf.edges 
                FROM flow_sessions fs
                JOIN chat_flows cf ON fs.flow_id = cf.id
                WHERE fs.status = 'sleeping' AND fs.resume_at <= NOW()
            `);

            if (result.rows.length === 0) return;

            for (const session of result.rows) {
                try {
                    // Update to active to prevent double execution
                    await pool.query(
                        `UPDATE flow_sessions SET status = 'active', resume_at = NULL WHERE id = $1 AND status = 'sleeping'`,
                        [session.id]
                    );

                    console.log(`[FlowCron] Waking up session ${session.id} after delay.`);
                    
                    const currentNodeId = session.current_node_id;
                    const variables = session.variables || {};
                    const gatewaySessionId = session.whatsapp_session_id; // Usually we need the actual gateway ID
                    
                    // We need to fetch the gateway string ID from whatsapp_sessions
                    const waRes = await pool.query('SELECT session_id FROM whatsapp_sessions WHERE id = $1', [gatewaySessionId]);
                    let gatewayStr = 'session_1'; // fallback
                    if (waRes.rows.length > 0) gatewayStr = waRes.rows[0].session_id;

                    // Fetch contact phone
                    const contactRes = await pool.query('SELECT phone FROM contacts WHERE id = $1', [session.contact_id]);
                    if (contactRes.rows.length === 0) continue;
                    const senderPhone = contactRes.rows[0].phone;
                    
                    // Fetch organization ID
                    const orgRes = await pool.query('SELECT organization_id FROM chat_flows WHERE id = $1', [session.flow_id]);
                    const orgId = orgRes.rows[0].organization_id;

                    // Move to the next node automatically
                    await FlowEngineService.moveNext(
                        session.id, 
                        currentNodeId, 
                        session.nodes, 
                        session.edges, 
                        gatewayStr, 
                        senderPhone, 
                        variables, 
                        orgId, 
                        session.contact_id
                    );

                } catch (e) {
                    console.error(`[FlowCron] Failed to resume session ${session.id}:`, e);
                }
            }
        } catch (err) {
            console.error('[FlowCron] Error running cron:', err);
        }
    });
    console.log('[FlowCron] Flow Delay Scheduler started.');
};

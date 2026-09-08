import pool from '../config/db.js';

/**
 * Deal Pipeline Sync Service
 * Automatically advances contact's CRM pipeline deal to "Won" / "Closed Won" / "Lunas"
 * upon invoice payment (via payment gateway webhook, manual mark-paid, or partial payment completion).
 */
export const syncDealOnInvoicePaid = async ({ invoiceId, organizationId, amount, io = null, userId = null }) => {
    try {
        if (!invoiceId || !organizationId) {
            return { success: false, reason: 'missing_parameters' };
        }

        // 1. Get invoice and contact details
        const invRes = await pool.query(
            `SELECT i.id, i.contact_id, i.organization_id, i.total_amount, i.invoice_number,
                    c.name as contact_name
             FROM invoices i
             JOIN contacts c ON i.contact_id = c.id
             WHERE i.id = $1 AND i.organization_id = $2`,
            [invoiceId, organizationId]
        );

        if (invRes.rows.length === 0) {
            return { success: false, reason: 'invoice_not_found' };
        }
        const invoice = invRes.rows[0];

        // 2. Find contact's active conversation with a pipeline attached
        const convRes = await pool.query(
            `SELECT c.id, c.pipeline_id, c.pipeline_stage_id, c.value
             FROM conversations c
             WHERE c.contact_id = $1 AND c.organization_id = $2 AND c.pipeline_id IS NOT NULL
             ORDER BY c.updated_at DESC
             LIMIT 1`,
            [invoice.contact_id, organizationId]
        );

        if (convRes.rows.length === 0) {
            // No conversation in pipeline for this contact
            return { success: false, reason: 'no_pipeline_attached' };
        }

        const conv = convRes.rows[0];
        const pipelineId = conv.pipeline_id;

        // 3. Find the "Won" / "Closed Won" / "Lunas" stage in this pipeline
        const stagesRes = await pool.query(
            `SELECT id, name, position, is_closed_stage
             FROM pipeline_stages
             WHERE pipeline_id = $1
             ORDER BY 
               (CASE 
                  WHEN is_closed_stage = true AND (name ILIKE '%won%' OR name ILIKE '%deal%' OR name ILIKE '%lunas%' OR name ILIKE '%selesai%' OR name ILIKE '%closing%' OR name ILIKE '%paid%') THEN 1
                  WHEN name ILIKE '%won%' OR name ILIKE '%closed won%' OR name ILIKE '%lunas%' OR name ILIKE '%selesai%' OR name ILIKE '%deal%' OR name ILIKE '%closing%' OR name ILIKE '%paid%' THEN 2
                  WHEN is_closed_stage = true THEN 3
                  ELSE 4
                END) ASC,
               position DESC
             LIMIT 1`,
            [pipelineId]
        );

        if (stagesRes.rows.length === 0) {
            return { success: false, reason: 'no_stages_found' };
        }

        const targetStage = stagesRes.rows[0];
        const fromStageId = conv.pipeline_stage_id;
        const finalAmount = amount ? parseFloat(amount) : parseFloat(invoice.total_amount || 0);

        // 4. If already in target stage, update deal value if needed
        if (fromStageId === targetStage.id) {
            await pool.query(
                `UPDATE conversations 
                 SET value = GREATEST(COALESCE(value, 0), $1),
                     deal_probability = 100,
                     updated_at = NOW()
                 WHERE id = $2`,
                [finalAmount, conv.id]
            );
            return { success: true, updated: false, reason: 'already_in_won_stage' };
        }

        // 5. Move conversation to target Won stage
        await pool.query(
            `UPDATE conversations 
             SET pipeline_stage_id = $1,
                 stage_changed_at = NOW(),
                 value = GREATEST(COALESCE(value, 0), $2),
                 deal_probability = 100,
                 deal_close_date = CURRENT_DATE,
                 updated_at = NOW()
             WHERE id = $3`,
            [targetStage.id, finalAmount, conv.id]
        );

        // 6. Record in pipeline_stage_history
        await pool.query(
            `INSERT INTO pipeline_stage_history (conversation_id, pipeline_id, from_stage_id, to_stage_id, changed_by, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [conv.id, pipelineId, fromStageId, targetStage.id, userId]
        );

        // 7. Emit WebSocket event if io provided
        if (io) {
            io.to(`org_${organizationId}`).emit('pipeline_update', {
                conversationId: conv.id,
                pipelineId: pipelineId,
                stageId: targetStage.id,
                stageName: targetStage.name,
                invoiceNumber: invoice.invoice_number,
                amount: finalAmount,
                autoWon: true
            });
        }

        console.log(`[DealPipelineSync] Successfully moved conversation #${conv.id} to '${targetStage.name}' stage for paid Invoice #${invoice.invoice_number}`);
        return { success: true, updated: true, targetStage: targetStage.name };
    } catch (err) {
        console.error('[DealPipelineSync] Error auto-moving deal:', err.message);
        return { success: false, error: err.message };
    }
};

import { Worker } from 'bullmq';
import pool from '../config/db.js';
import IORedis from 'ioredis'; // Direct Import
import { redisConfig } from '../config/redis.js'; // Import Config
import * as waService from '../services/waGatewayService.js';

// Helper sleep random
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

export const initNumberCheckWorker = (io) => {
    const workerConnection = new IORedis(redisConfig, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false
    });

    const worker = new Worker('number-check-queue', async (job) => {
        const { batchId, numbers, deviceId, orgId } = job.data; // numbers is chunk of IDs from DB? No, simpler to pass IDs.

        // Better approach: The job processes the WHOLE batch (or chunks). 
        // For simplicity in this breakdown, we process the whole batch in one job but iterate carefully.

        try {
            // 1. Get Session ID String (UUID) from deviceId (DB ID)
            const devRes = await pool.query('SELECT session_id FROM whatsapp_sessions WHERE id = $1', [deviceId]);
            if (devRes.rows.length === 0) throw new Error("Device not found");
            const waSessionId = devRes.rows[0].session_id;

            // 2. Update Status to Processing
            await pool.query("UPDATE number_check_batches SET status = 'processing' WHERE id = $1", [batchId]);

            // 3. Fetch Pending Items
            const itemsRes = await pool.query(
                "SELECT id, formatted_number FROM number_check_items WHERE batch_id = $1 AND status = 'pending' ORDER BY id ASC",
                [batchId]
            );
            const items = itemsRes.rows;

            let validCount = 0;
            let invalidCount = 0;
            let processed = 0;

            for (const item of items) {
                // Check stop signal (optional optimization)

                // A. Safety Delay (Increased)
                await sleep(randomDelay(2000, 4000));

                let attempt = 0;
                let maxRetries = 3;
                let success = false;

                while (attempt < maxRetries && !success) {
                    try {
                        attempt++;
                        // B. Call Gateway
                        const result = await waService.checkNumber(waSessionId, item.formatted_number);

                        const isValid = result.exists;
                        if (isValid) validCount++; else invalidCount++;

                        // C. Update Item
                        await pool.query(
                            "UPDATE number_check_items SET is_registered = $1, status = 'checked' WHERE id = $2",
                            [isValid, item.id]
                        );
                        success = true;

                    } catch (err) {
                        const status = err.response ? err.response.status : null;

                        // Retry only on 409 (Conflict/Busy)
                        if (status === 409 && attempt < maxRetries) {
                            console.warn(`[Checker] Item ${item.id} (409 Conflict) - Retrying ${attempt}/${maxRetries}...`);
                            await sleep(randomDelay(2000, 5000)); // Backoff wait
                            continue;
                        }

                        if (status === 409) {
                            console.warn(`[Checker] Item ${item.id} (409 Conflict): ${err.message} - Max retries reached`);
                        } else if (status === 403) {
                            // 403 Permission Denied - Suppress verbose logs (User Request)
                            // Session likely invalid or disconnected.
                            // Just mark as failed silently or with minimal log.
                        } else {
                            console.error(`[Checker] Failed item ${item.id}:`, err.message);
                            if (err.response && err.response.data) {
                                console.error(`[Checker] Error Details:`, JSON.stringify(err.response.data));
                            }
                        }

                        // Mark failed if we're stopping here
                        await pool.query("UPDATE number_check_items SET status = 'failed' WHERE id = $1", [item.id]);
                        break; // Stop retrying
                    }
                }

                processed++;

                // D. Emit Progress every 5 items or last one
                if (processed % 5 === 0 || processed === items.length) {
                    io.to(`org_${orgId}`).emit('check_progress', {
                        batchId,
                        processed,
                        total: items.length,
                        valid: validCount,
                        invalid: invalidCount
                    });

                    // Update Header Stats periodically
                    await pool.query(
                        "UPDATE number_check_batches SET valid_count = $1, invalid_count = $2 WHERE id = $3",
                        [validCount, invalidCount, batchId]
                    );
                }
            }

            // 4. Finalize Batch
            await pool.query(
                "UPDATE number_check_batches SET status = 'completed', valid_count = $1, invalid_count = $2 WHERE id = $3",
                [validCount, invalidCount, batchId]
            );

            io.to(`org_${orgId}`).emit('check_complete', { batchId });

        } catch (error) {
            console.error(`[NumberCheckWorker] Batch ${batchId} Failed:`, error);
            await pool.query("UPDATE number_check_batches SET status = 'failed' WHERE id = $1", [batchId]);
        }

    }, {
        connection: workerConnection, // Use dedicated connection
        concurrency: 2 // Limit concurrent batches per server instance
    });

    console.log("Number Check Worker Initialized");
};

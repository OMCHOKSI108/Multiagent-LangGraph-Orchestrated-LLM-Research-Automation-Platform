const db = require('./config/db');
const axios = require('axios');
const logger = require('./utils/logger');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://127.0.0.1:8000";
const POLLING_INTERVAL = 5000; // 5 seconds
const STALE_JOB_TIMEOUT_MINUTES = 30;
const MAX_RETRIES = 3;

/**
 * Recovers jobs that were stuck in "processing" state
 * (crashed mid-execution, worker died, etc.)
 */
async function recoverStaleJobs() {
    try {
        const result = await db.query(`
            UPDATE research_logs 
            SET status = 'queued', 
                updated_at = NOW(),
                retry_count = COALESCE(retry_count, 0) + 1
            WHERE status = 'processing' 
            AND updated_at < NOW() - INTERVAL '${STALE_JOB_TIMEOUT_MINUTES} minutes'
            AND COALESCE(retry_count, 0) < ${MAX_RETRIES}
            RETURNING id
        `);

        if (result.rowCount > 0) {
            const ids = result.rows.map(r => r.id);
            logger.warn(`[Worker] Recovered ${result.rowCount} stale jobs: ${ids.join(', ')}`);
        }
    } catch (err) {
        logger.error(`[Worker] Stale job recovery failed: ${err.message}`);
    }
}

/**
 * Marks jobs that exceeded max retries as permanently failed
 */
async function markExhaustedJobs() {
    try {
        await db.query(`
            UPDATE research_logs 
            SET status = 'failed', 
                result_json = '{"error": "Max retries exceeded"}',
                updated_at = NOW()
            WHERE status = 'queued' 
            AND COALESCE(retry_count, 0) >= ${MAX_RETRIES}
        `);
    } catch (err) {
        logger.error(`[Worker] Failed to mark exhausted jobs: ${err.message}`);
    }
}

async function processQueue() {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // 1. Fetch next queued job (SKIP LOCKED prevents race conditions)
        const result = await client.query(
            `SELECT id, task, user_id, COALESCE(retry_count, 0) as retry_count 
             FROM research_logs 
             WHERE status = 'queued' 
             ORDER BY created_at ASC 
             LIMIT 1 
             FOR UPDATE SKIP LOCKED`
        );

        if (result.rows.length === 0) {
            await client.query('COMMIT');
            return; // No jobs
        }

        const job = result.rows[0];
        logger.info(`[Worker] Picked up Job #${job.id}: "${job.task.substring(0, 50)}..." (retry: ${job.retry_count})`);

        // 2. Mark as processing
        await client.query(
            "UPDATE research_logs SET status = 'processing', updated_at = NOW() WHERE id = $1",
            [job.id]
        );
        await client.query('COMMIT');

        // 3. Call AI Engine
        try {
            logger.info(`[Worker] Sending Job #${job.id} to Python Engine...`);

            const aiResponse = await axios.post(`${AI_ENGINE_URL}/research`, {
                task: job.task,
                depth: "deep",
                job_id: job.id  // Pass job ID for correlation
            }, {
                timeout: 600000,  // 10 min timeout
                headers: {
                    'Content-Type': 'application/json',
                    'X-Job-ID': String(job.id)
                }
            });

            const finalResult = aiResponse.data;

            // 4. Mark as completed
            await db.query(
                `UPDATE research_logs 
                 SET status = 'completed', 
                     result_json = $1, 
                     updated_at = NOW() 
                 WHERE id = $2`,
                [finalResult, job.id]
            );

            logger.info(`[Worker] Job #${job.id} Completed Successfully.`);

        } catch (aiErr) {
            const errorMsg = aiErr.response?.data?.detail || aiErr.message;
            logger.error(`[Worker] Job #${job.id} Failed: ${errorMsg}`);

            // Check if we should retry or fail permanently
            if (job.retry_count >= MAX_RETRIES - 1) {
                await db.query(
                    `UPDATE research_logs 
                     SET status = 'failed', 
                         result_json = $1, 
                         updated_at = NOW() 
                     WHERE id = $2`,
                    [{ error: errorMsg, retries: job.retry_count + 1 }, job.id]
                );
                logger.error(`[Worker] Job #${job.id} permanently failed after ${job.retry_count + 1} attempts`);
            } else {
                // Requeue for retry
                await db.query(
                    `UPDATE research_logs 
                     SET status = 'queued', 
                         retry_count = $1,
                         updated_at = NOW() 
                     WHERE id = $2`,
                    [job.retry_count + 1, job.id]
                );
                logger.warn(`[Worker] Job #${job.id} requeued for retry (attempt ${job.retry_count + 2})`);
            }
        }

    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            logger.error(`[Worker] Rollback failed: ${rollbackErr.message}`);
        }
        logger.error(`[Worker] Critical Error: ${err.message}`);
    } finally {
        client.release();
    }
}

// Start Polling Loop
async function startWorker() {
    logger.info("[Worker] Background Research Worker Started");
    logger.info(`[Worker] AI Engine URL: ${AI_ENGINE_URL}`);
    logger.info(`[Worker] Stale job timeout: ${STALE_JOB_TIMEOUT_MINUTES} minutes`);
    logger.info(`[Worker] Max retries: ${MAX_RETRIES}`);

    // Recover any stale jobs on startup
    await recoverStaleJobs();
    await markExhaustedJobs();

    // Main loop
    while (true) {
        await processQueue();
        await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));

        // Periodically check for stale jobs (every 5 minutes)
        if (Date.now() % (5 * 60 * 1000) < POLLING_INTERVAL) {
            await recoverStaleJobs();
        }
    }
}

// If run directly
if (require.main === module) {
    startWorker();
}

module.exports = startWorker;

const db = require('./config/db');
const axios = require('axios');
const logger = require('./utils/logger');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://127.0.0.1:8000";
const AI_ENGINE_SECRET = process.env.AI_ENGINE_SECRET || "";
const POLLING_INTERVAL = 5000; // 5 seconds
const STALE_JOB_TIMEOUT_MINUTES = 30;
const MAX_RETRIES = 3;
const AI_REQUEST_TIMEOUT_MS = parseInt(process.env.AI_REQUEST_TIMEOUT_MS || "1800000", 10);
let workerRunning = true;

// ============================================
// Use research_sessions table (new workspace-aware flow)
// Falls back to research_logs if research_sessions doesn't exist yet
// ============================================
const SESSIONS_TABLE = 'research_sessions';
const LEGACY_TABLE = 'research_logs';

let useNewTable = false; // Will be detected on startup

async function detectTable() {
    try {
        await db.query(`SELECT 1 FROM ${SESSIONS_TABLE} LIMIT 0`);
        useNewTable = true;
        logger.info(`[Worker] Using new '${SESSIONS_TABLE}' table`);
    } catch {
        useNewTable = false;
        logger.info(`[Worker] Falling back to legacy '${LEGACY_TABLE}' table`);
    }
}

function getTable() {
    return useNewTable ? SESSIONS_TABLE : LEGACY_TABLE;
}

/**
 * Recovers jobs that were stuck in "processing" state
 * CRITICAL: Only recovers jobs with trigger_source = 'user' (if column exists)
 */
async function recoverStaleJobs() {
    try {
        const table = getTable();

        // Only recover user-triggered jobs that are genuinely stale
        const triggerFilter = useNewTable
            ? `AND trigger_source = 'user'`
            : '';

        const result = await db.query(
            `UPDATE ${table}
             SET status = 'queued',
                 updated_at = NOW(),
                 retry_count = COALESCE(retry_count, 0) + 1
             WHERE status = 'processing'
             AND updated_at < NOW() - MAKE_INTERVAL(mins => $1)
             AND COALESCE(retry_count, 0) < $2
             ${triggerFilter}
             RETURNING id`,
            [STALE_JOB_TIMEOUT_MINUTES, MAX_RETRIES]
        );

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
        const table = getTable();

        await db.query(
            `UPDATE ${table}
             SET status = 'failed',
                 result_json = '{"error": "Max retries exceeded"}',
                 updated_at = NOW()
             WHERE status = 'queued'
             AND COALESCE(retry_count, 0) >= $1`,
            [MAX_RETRIES]
        );
    } catch (err) {
        logger.error(`[Worker] Failed to mark exhausted jobs: ${err.message}`);
    }
}

async function processQueue() {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const table = getTable();

        // CRITICAL: Only pick up user-triggered jobs
        const triggerFilter = useNewTable
            ? `AND trigger_source = 'user'`
            : '';

        // Fetch columns based on table
        const selectCols = useNewTable
            ? `id, topic AS task, user_id, workspace_id, depth, COALESCE(retry_count, 0) as retry_count`
            : `id, task, user_id, COALESCE(retry_count, 0) as retry_count`;

        const result = await client.query(
            `SELECT ${selectCols}
             FROM ${table}
             WHERE status = 'queued'
             ${triggerFilter}
             ORDER BY created_at ASC
             LIMIT 1
             FOR UPDATE SKIP LOCKED`
        );

        if (result.rows.length === 0) {
            await client.query('COMMIT');
            return; // No jobs
        }

        const job = result.rows[0];
        const jobTask = job.task || job.topic;
        logger.info(`[Worker] Picked up Job #${job.id}: "${jobTask.substring(0, 50)}..." (retry: ${job.retry_count})`);

        // Mark as processing
        await client.query(
            `UPDATE ${table} SET status = 'processing', started_at = NOW(), updated_at = NOW() WHERE id = $1`,
            [job.id]
        );
        await client.query('COMMIT');

        // Call AI Engine
        try {
            logger.info(`[Worker] Sending Job #${job.id} to Python Engine...`);

            const payload = {
                task: jobTask,
                depth: job.depth || "deep",
                job_id: job.id
            };

            // Include workspace_id for new table
            if (useNewTable && job.workspace_id) {
                payload.workspace_id = job.workspace_id;
            }

            const aiResponse = await axios.post(`${AI_ENGINE_URL}/research`, payload, {
                timeout: AI_REQUEST_TIMEOUT_MS,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Job-ID': String(job.id),
                    ...(AI_ENGINE_SECRET ? { 'X-API-Key': AI_ENGINE_SECRET } : {})
                }
            });

            const finalResult = aiResponse.data;

            // Mark as completed
            await db.query(
                `UPDATE ${table}
                 SET status = 'completed',
                     result_json = $1,
                     completed_at = NOW(),
                     updated_at = NOW()
                 WHERE id = $2`,
                [finalResult, job.id]
            );

            logger.info(`[Worker] Job #${job.id} Completed Successfully.`);

        } catch (aiErr) {
            const errorMsg = aiErr.response?.data?.detail || aiErr.message;
            logger.error(`[Worker] Job #${job.id} Failed: ${errorMsg}`);

            if (job.retry_count >= MAX_RETRIES - 1) {
                await db.query(
                    `UPDATE ${table}
                     SET status = 'failed',
                         result_json = $1,
                         updated_at = NOW()
                     WHERE id = $2`,
                    [{ error: errorMsg, retries: job.retry_count + 1 }, job.id]
                );
                logger.error(`[Worker] Job #${job.id} permanently failed after ${job.retry_count + 1} attempts`);
            } else {
                await db.query(
                    `UPDATE ${table}
                     SET status = 'queued',
                         retry_count = $1,
                         trigger_source = 'retry',
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

/**
 * Waits for AI Engine to be ready before starting worker
 */
async function waitForAiEngine() {
    logger.info(`[Worker] Waiting for AI Engine at ${AI_ENGINE_URL}...`);
    let retries = 0;
    const maxRetries = 40;

    while (retries < maxRetries) {
        try {
            await axios.get(`${AI_ENGINE_URL}/health`);
            logger.info("[Worker] Connected to AI Engine successfully!");
            return true;
        } catch (err) {
            retries++;
            if (retries % 5 === 0) {
                logger.warn(`[Worker] Still waiting for AI Engine... (${retries}/${maxRetries})`);
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    logger.error("[Worker] Failed to connect to AI Engine after multiple attempts. Exiting.");
    process.exit(1);
}

// ------------------------------------------------------------------
// Start Worker — LISTEN/NOTIFY with polling fallback
// ------------------------------------------------------------------
async function startWorker() {
    logger.info("[Worker] Background Research Worker Started");
    logger.info(`[Worker] AI Engine URL: ${AI_ENGINE_URL}`);
    logger.info(`[Worker] Stale job timeout: ${STALE_JOB_TIMEOUT_MINUTES} minutes`);
    logger.info(`[Worker] Max retries: ${MAX_RETRIES}`);
    logger.info(`[Worker] AI request timeout: ${AI_REQUEST_TIMEOUT_MS} ms`);

    // Wait for AI Engine to be ready
    await waitForAiEngine();

    // Detect which table to use
    await detectTable();

    // Recover any stale jobs on startup (only user-triggered ones)
    await recoverStaleJobs();
    await markExhaustedJobs();

    // ------------------------------------------------------------------
    // Set up PG LISTEN/NOTIFY for instant wake-up on new jobs
    // ------------------------------------------------------------------
    let notifyClient = null;
    const notifyChannel = useNewTable ? 'new_research_job' : 'new_job';

    try {
        notifyClient = await db.getClient();

        // Only create trigger for legacy table if using it
        if (!useNewTable) {
            await notifyClient.query(`
                CREATE OR REPLACE FUNCTION notify_new_job() RETURNS trigger AS $$
                BEGIN
                    PERFORM pg_notify('new_job', NEW.id::text);
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
            `);

            await notifyClient.query(`
                DO $$ BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_new_job'
                    ) THEN
                        CREATE TRIGGER trg_new_job
                        AFTER INSERT OR UPDATE OF status ON research_logs
                        FOR EACH ROW
                        WHEN (NEW.status = 'queued')
                        EXECUTE FUNCTION notify_new_job();
                    END IF;
                END $$;
            `);
        }

        await notifyClient.query(`LISTEN ${notifyChannel}`);
        logger.info(`[Worker] Subscribed to PG LISTEN/NOTIFY channel '${notifyChannel}'`);

        notifyClient.on('notification', async (msg) => {
            if (msg.channel === notifyChannel) {
                logger.info(`[Worker] Notification received for job ${msg.payload} — processing immediately`);
                await processQueue();
            }
        });
    } catch (err) {
        logger.warn(`[Worker] LISTEN/NOTIFY setup failed, falling back to polling only: ${err.message}`);
        if (notifyClient) {
            notifyClient.release();
            notifyClient = null;
        }
    }

    // ------------------------------------------------------------------
    // Fallback polling loop (30s) — catches any missed notifications
    // ------------------------------------------------------------------
    const FALLBACK_POLL_INTERVAL = 30_000;
    const STALE_CHECK_INTERVAL_MS = 5 * 60_000;
    let lastStaleCheck = Date.now();

    while (workerRunning) {
        await processQueue();
        await new Promise((resolve) => setTimeout(resolve, FALLBACK_POLL_INTERVAL));

        // Periodic stale job recovery
        if (Date.now() - lastStaleCheck > STALE_CHECK_INTERVAL_MS) {
            await recoverStaleJobs();
            await markExhaustedJobs();
            lastStaleCheck = Date.now();
        }
    }

    // Cleanup
    if (notifyClient) {
        try { await notifyClient.query(`UNLISTEN ${notifyChannel}`); } catch (_) { }
        notifyClient.release();
    }
}

function shutdownWorker(signal) {
    logger.warn(`[Worker] Received ${signal}. Shutting down gracefully...`);
    workerRunning = false;
}

process.on('SIGINT', () => shutdownWorker('SIGINT'));
process.on('SIGTERM', () => shutdownWorker('SIGTERM'));

// If run directly
if (require.main === module) {
    startWorker();
}

module.exports = startWorker;

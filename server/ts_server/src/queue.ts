import { Queue, Worker, Job, ConnectionOptions } from "bullmq";
import logger from "./logger.js";
import type { SSEManager } from "./sse.js";

const connection: ConnectionOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  maxRetriesPerRequest: null,
};
const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

export const researchQueue = new Queue("research", { connection });
export const scrapeQueue = new Queue("scrape", { connection });
export const embedQueue = new Queue("embed", { connection });
export const paperQueue = new Queue("paper", { connection });

interface ResearchJobData {
  question: string;
  userId: string;
  depth?: string;
  sessionId: string;
}

interface ResearchResult {
  status?: string;
  error?: string;
  report?: string;
}

async function processJob(job: Job<ResearchJobData>): Promise<ResearchResult> {
  const { question, userId, depth, sessionId } = job.data;
  let maxRevisions: number;
  if (depth === "Fast") maxRevisions = 0;
  else if (depth === "Balanced") maxRevisions = 1;
  else maxRevisions = 2;

  logger.info(`Processing research job ${job.id}: "${question.slice(0, 60)}..."`);

  const body = {
    question,
    user_id: userId,
    max_revisions: maxRevisions,
    job_id: job.id,
    session_id: sessionId,
  };

  const resp = await fetch(`${FASTAPI_URL}/api/research/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text);
  }

  return (await resp.json()) as ResearchResult;
}

export function startWorker(sseManager: SSEManager): Worker {
  const worker = new Worker(
    "research",
    async (job: Job<ResearchJobData>) => {
      const result = await processJob(job);
      return result;
    },
    { connection },
  );

  worker.on("completed", (job: Job<ResearchJobData>, result: ResearchResult) => {
    const pipelineStatus = result?.status;
    if (pipelineStatus === "failed") {
      const msg = result?.error || result?.report || "Research pipeline failed to complete. Please try again.";
      logger.warn(`Job ${job.id} pipeline failed: ${msg}`);
      sseManager.broadcastError(job.id!, msg);
      return;
    }
    logger.info(`Job ${job.id} completed`);
    sseManager.broadcastComplete(job.id!);
  });

  worker.on("failed", (job: Job<ResearchJobData> | undefined, err: Error) => {
    const msg = err?.message || "Research job failed unexpectedly. Please try again.";
    const jobId = job?.id || "unknown";
    logger.error(`Job ${jobId} failed: ${msg}`);
    sseManager.broadcastError(jobId, msg);
  });

  logger.info("BullMQ research worker started");
  return worker;
}

export function startScrapeWorker(sseManager: SSEManager): Worker {
  const worker = new Worker(
    "scrape",
    async (job: Job<ResearchJobData>) => {
      const { question, userId, sessionId } = job.data;
      logger.info(`Processing scrape job ${job.id}`);
      const resp = await fetch(`${FASTAPI_URL}/api/internal/agents/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, user_id: userId, job_id: job.id, session_id: sessionId }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text);
      }
      return (await resp.json()) as ResearchResult;
    },
    { connection },
  );

  worker.on("completed", (job: Job<ResearchJobData>, result: ResearchResult) => {
    const pipelineStatus = result?.status;
    if (pipelineStatus === "failed") {
      const msg = result?.error || result?.report || "Scrape pipeline failed to complete. Please try again.";
      logger.warn(`Scrape job ${job.id} pipeline failed: ${msg}`);
      sseManager.broadcastError(job.id!, msg);
      return;
    }
    logger.info(`Scrape job ${job.id} completed`);
    sseManager.broadcastComplete(job.id!);
  });

  worker.on("failed", (job: Job<ResearchJobData> | undefined, err: Error) => {
    const msg = err?.message || "Scrape job failed unexpectedly. Please try again.";
    const jobId = job?.id || "unknown";
    logger.error(`Scrape job ${jobId} failed: ${msg}`);
    sseManager.broadcastError(jobId, msg);
  });

  logger.info("BullMQ scrape worker started");
  return worker;
}

export function startEmbedWorker(sseManager: SSEManager): Worker {
  const worker = new Worker(
    "embed",
    async (job: Job<ResearchJobData>) => {
      const { question, userId, sessionId } = job.data;
      logger.info(`Processing embed job ${job.id}`);
      const resp = await fetch(`${FASTAPI_URL}/api/internal/agents/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, user_id: userId, job_id: job.id, session_id: sessionId }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text);
      }
      return (await resp.json()) as ResearchResult;
    },
    { connection },
  );

  worker.on("completed", (job: Job<ResearchJobData>, result: ResearchResult) => {
    const pipelineStatus = result?.status;
    if (pipelineStatus === "failed") {
      const msg = result?.error || result?.report || "Embed pipeline failed to complete. Please try again.";
      logger.warn(`Embed job ${job.id} pipeline failed: ${msg}`);
      sseManager.broadcastError(job.id!, msg);
      return;
    }
    logger.info(`Embed job ${job.id} completed`);
    sseManager.broadcastComplete(job.id!);
  });

  worker.on("failed", (job: Job<ResearchJobData> | undefined, err: Error) => {
    const msg = err?.message || "Embed job failed unexpectedly. Please try again.";
    const jobId = job?.id || "unknown";
    logger.error(`Embed job ${jobId} failed: ${msg}`);
    sseManager.broadcastError(jobId, msg);
  });

  logger.info("BullMQ embed worker started");
  return worker;
}

export function startPaperWorker(sseManager: SSEManager): Worker {
  const worker = new Worker(
    "paper",
    async (job: Job<ResearchJobData>) => {
      const { question, userId, sessionId } = job.data;
      logger.info(`Processing paper job ${job.id}`);
      const resp = await fetch(`${FASTAPI_URL}/api/internal/agents/write-paper`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, user_id: userId, job_id: job.id, session_id: sessionId }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text);
      }
      return (await resp.json()) as ResearchResult;
    },
    { connection },
  );

  worker.on("completed", (job: Job<ResearchJobData>, result: ResearchResult) => {
    const pipelineStatus = result?.status;
    if (pipelineStatus === "failed") {
      const msg = result?.error || result?.report || "Paper pipeline failed to complete. Please try again.";
      logger.warn(`Paper job ${job.id} pipeline failed: ${msg}`);
      sseManager.broadcastError(job.id!, msg);
      return;
    }
    logger.info(`Paper job ${job.id} completed`);
    sseManager.broadcastComplete(job.id!);
  });

  worker.on("failed", (job: Job<ResearchJobData> | undefined, err: Error) => {
    const msg = err?.message || "Paper job failed unexpectedly. Please try again.";
    const jobId = job?.id || "unknown";
    logger.error(`Paper job ${jobId} failed: ${msg}`);
    sseManager.broadcastError(jobId, msg);
  });

  logger.info("BullMQ paper worker started");
  return worker;
}

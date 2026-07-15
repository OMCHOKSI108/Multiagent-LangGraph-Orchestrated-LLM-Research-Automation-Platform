import { Response } from "express";
import { Redis } from "ioredis";
import logger from "./logger.js";

const REDIS_URL =
  process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || "6379"}/0`;

const BATCH_LARGE = 30;
const BATCH_SMALL = 2;
const PROGRESS_THRESHOLD = 25;
const FALLBACK_FLUSH_MS = 500;

interface JobState {
  clients: Response[];
  chunks: string[];
  progressPct: number;
}

export class SSEManager {
  private jobs: Map<string, JobState>;
  private sub: Redis;
  private _listening: boolean;
  private _flushTimer: ReturnType<typeof setInterval> | null;

  constructor() {
    this.jobs = new Map();
    this.sub = new Redis(REDIS_URL);
    this._listening = false;
    this._flushTimer = null;

    this.sub.on("pmessage", (_pattern: string, channel: string, message: string) => {
      const parts = channel.split(":");
      if (parts.length < 3) return;
      const eventType = parts[1];
      const targetJobId = parts[2];
      if (!targetJobId) return;

      if (eventType === "progress") {
        this._handleProgress(targetJobId, message);
        return;
      }

      if (eventType === "tokens") {
        this._bufferToken(targetJobId, message);
      }

      if (eventType === "cancel") {
        this._handleCancel(targetJobId);
      }
    });
  }

  addClient(jobId: string, res: Response): void {
    let state = this.jobs.get(jobId);
    if (!state) {
      state = { clients: [], chunks: [], progressPct: 0 };
      this.jobs.set(jobId, state);
      this._subscribe();
    }
    state.clients.push(res);

    res.on("close", () => {
      const s = this.jobs.get(jobId);
      if (!s) return;
      const idx = s.clients.indexOf(res);
      if (idx !== -1) s.clients.splice(idx, 1);
      if (s.clients.length === 0) {
        this.jobs.delete(jobId);
        this._unsubscribe();
      }
    });
  }

  private _subscribe(): void {
    if (this._listening) return;
    this._listening = true;
    this.sub.psubscribe("research:*").then(() => {
      logger.info("Subscribed to research:* in Redis");
    });
  }

  private _unsubscribe(): void {
    if (this.jobs.size > 0) return;
    if (!this._listening) return;
    this.sub.punsubscribe();
    this._listening = false;
    logger.info("Unsubscribed from Redis (no more clients)");
  }

  private _handleProgress(jobId: string, message: string): void {
    const state = this.jobs.get(jobId);
    if (!state) return;

    try {
      const parsed = JSON.parse(message);
      const pct = typeof parsed.progress_pct === "number" ? parsed.progress_pct : state.progressPct;
      state.progressPct = pct;
    } catch {
      state.progressPct = 0;
    }

    this._broadcast(jobId, "progress", message);
  }

  private _bufferToken(jobId: string, token: string): void {
    const state = this.jobs.get(jobId);
    if (!state) return;

    state.chunks.push(token);

    const batchSize = state.progressPct >= PROGRESS_THRESHOLD ? BATCH_SMALL : BATCH_LARGE;

    if (state.chunks.length >= batchSize) {
      this._flushJob(jobId, batchSize);
    }

    if (!this._flushTimer) {
      this._flushTimer = setInterval(() => this._flushStale(), FALLBACK_FLUSH_MS);
    }
  }

  private _flushJob(jobId: string, count: number): void {
    const state = this.jobs.get(jobId);
    if (!state || state.chunks.length === 0) return;

    const toSend = state.chunks.splice(0, Math.min(count, state.chunks.length));
    this._broadcast(jobId, "token", JSON.stringify({ tokens: toSend }));
  }

  private _handleCancel(jobId: string): void {
    this._broadcast(jobId, "cancelled", JSON.stringify({ jobId }));
  }

  private _flushStale(): void {
    for (const [jobId, state] of this.jobs.entries()) {
      if (state.chunks.length > 0) {
        this._broadcast(jobId, "token", JSON.stringify({ tokens: state.chunks }));
        state.chunks = [];
      }
    }

    const hasPending = Array.from(this.jobs.values()).some((s) => s.chunks.length > 0);
    if (!hasPending && this._flushTimer) {
      clearInterval(this._flushTimer);
      this._flushTimer = null;
    }
  }

  broadcastComplete(jobId: string): void {
    this._flushJob(jobId, Infinity);
    this._broadcast(jobId, "complete", JSON.stringify({ jobId }));
  }

  broadcastCancelled(jobId: string): void {
    this._broadcast(jobId, "cancelled", JSON.stringify({ jobId }));
  }

  broadcastError(jobId: string, message: string): void {
    this._flushJob(jobId, Infinity);
    this._broadcast(jobId, "error", JSON.stringify({ jobId, message }));
  }

  private _broadcast(jobId: string, event: string, data: string): void {
    const state = this.jobs.get(jobId);
    if (!state) return;
    for (const res of state.clients) {
      res.write(`event: ${event}\ndata: ${data}\n\n`);
    }
  }
}

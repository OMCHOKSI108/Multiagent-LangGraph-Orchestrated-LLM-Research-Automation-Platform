"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ProgressEvent {
  jobId: string;
  agent: string;
  status: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface TokenEvent {
  tokens: string;
}

type SSEStatus = "idle" | "connecting" | "connected" | "error";

export function useResearchSSE(jobId: string | null) {
  const [status, setStatus] = useState<SSEStatus>("idle");
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [tokens, setTokens] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const tokensRef = useRef("");

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStatus("idle");
  }, []);

  useEffect(() => {
    if (!jobId) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const url = `${baseUrl}/api/research-jobs/${jobId}/events`;
    const es = new EventSource(url);
    eventSourceRef.current = es;
    setStatus("connecting");

    es.addEventListener("connected", () => {
      setStatus("connected");
    });

    es.addEventListener("progress", (event) => {
      try {
        const data = JSON.parse(event.data) as ProgressEvent;
        setProgress(data);
      } catch {
        // ignore
      }
    });

    es.addEventListener("token", (event) => {
      try {
        const data = JSON.parse(event.data) as TokenEvent;
        tokensRef.current += data.tokens;
        setTokens(tokensRef.current);
      } catch {
        // ignore
      }
    });

    es.addEventListener("complete", () => {
      setDone(true);
      setStatus("idle");
      es.close();
      eventSourceRef.current = null;
    });

    es.addEventListener("error", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        setError(data.message || "Research job failed");
      } catch {
        setError("Research job failed");
      }
      setStatus("error");
      es.close();
      eventSourceRef.current = null;
    });

    es.onerror = () => {
      setStatus("error");
      es.close();
      eventSourceRef.current = null;
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [jobId]);

  return {
    status: done ? "done" : status,
    progress,
    tokens,
    error,
    disconnect,
  };
}

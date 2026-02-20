import React, { useEffect, useState, useRef } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Clock, Cpu, Timer } from 'lucide-react';
import { JobStatus } from '../types';
import { cn } from '../lib/utils';

interface ResearchStatusBannerProps {
  status: JobStatus;
  currentStage: string;
  topic: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

/** Format seconds into HH:MM:SS or MM:SS */
function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${String(h).padStart(2, '0')}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

const stageLabels: Record<string, string> = {
  'queued': 'Queued — Waiting to start',
  'connecting...': 'Connecting to AI Engine...',
  'topic_discovery': 'Discovering research topics',
  'domain_intelligence': 'Gathering domain intelligence',
  'literature_review': 'Reviewing academic literature',
  'google_news': 'Scanning news sources',
  'web_scraper': 'Scraping web sources',
  'historical_review': 'Analyzing historical data',
  'novelty_analysis': 'Running novelty analysis',
  'scoring': 'Scoring and ranking results',
  'critique': 'Critical review in progress',
  'synthesis': 'Synthesizing findings',
  'report_generation': 'Generating research report',
  'visualization': 'Creating visualizations',
  'latex_generation': 'Generating LaTeX document',
  'processing': 'AI Engine is processing...',
  'completed': 'Research complete',
  'failed': 'Research failed',
};

function getStageLabel(stage: string): string {
  return stageLabels[stage] || stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export const ResearchStatusBanner: React.FC<ResearchStatusBannerProps> = ({ status, currentStage, topic, startedAt, completedAt }) => {
  const isProcessing = status === JobStatus.PROCESSING || status === JobStatus.QUEUED;
  const isCompleted = status === JobStatus.COMPLETED;
  const isFailed = status === JobStatus.FAILED;

  // ── Elapsed-time timer ──
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!startedAt) { setElapsed(0); return; }

    const startMs = new Date(startedAt).getTime();

    // If already finished, compute fixed duration
    if (isCompleted || isFailed) {
      const endMs = completedAt ? new Date(completedAt).getTime() : Date.now();
      setElapsed(Math.max(0, Math.floor((endMs - startMs) / 1000)));
      return;
    }

    // Running — tick every second
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [startedAt, completedAt, isCompleted, isFailed]);

  return (
    <div className={cn(
      'relative overflow-hidden',
      isProcessing && 'bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10',
      isCompleted && 'bg-emerald-600/10',
      isFailed && 'bg-red-600/10',
    )}>
      {/* Animated scanning line for processing state */}
      {isProcessing && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent animate-shimmer" />
        </div>
      )}

      <div className="relative px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          <div className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
            isProcessing && 'bg-blue-500/15',
            isCompleted && 'bg-emerald-500/15',
            isFailed && 'bg-red-500/15',
          )}>
            {isProcessing && <Cpu className="w-4 h-4 text-blue-500 animate-pulse" />}
            {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            {isFailed && <AlertCircle className="w-4 h-4 text-red-500" />}
          </div>

          {/* Status Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-xs font-semibold uppercase tracking-wider',
                isProcessing && 'text-blue-500',
                isCompleted && 'text-emerald-500',
                isFailed && 'text-red-500',
              )}>
                {isProcessing ? 'AI Engine Running' : isCompleted ? 'Completed' : 'Failed'}
              </span>
              {isProcessing && (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse [animation-delay:0.4s]" />
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {getStageLabel(currentStage)}
            </p>
          </div>

          {/* Elapsed Timer Badge */}
          {startedAt && (
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold shrink-0',
              isProcessing && 'bg-blue-500/15 text-blue-400',
              isCompleted && 'bg-emerald-500/15 text-emerald-400',
              isFailed && 'bg-red-500/15 text-red-400',
            )}>
              <Timer className="w-3.5 h-3.5" />
              {formatElapsed(elapsed)}
            </div>
          )}

          {/* Spinner for processing */}
          {isProcessing && (
            <Loader2 className="w-4 h-4 text-blue-500/60 animate-spin shrink-0" />
          )}
        </div>

        {/* Progress bar animation */}
        {isProcessing && (
          <div className="mt-2 h-1 bg-border/50 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full animate-progress-indeterminate" />
          </div>
        )}
      </div>
    </div>
  );
};

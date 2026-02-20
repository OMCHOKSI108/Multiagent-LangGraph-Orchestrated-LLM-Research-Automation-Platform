import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { useResearchStore } from '../store';
import {
  Zap, AlertCircle, CheckCircle2, Clock, Activity, Shield,
  Search, BookOpen, Globe, FileText, Image, Cpu, PenTool, BarChart3,
  Loader2, Sparkles, ChevronDown, Layers
} from 'lucide-react';
import { cn } from '../lib/utils';

interface LiveFeedEvent {
  id: string;
  timestamp: string;
  agentName: string;
  action: string;
  status: 'info' | 'success' | 'warning' | 'error';
  message: string;
  category?: string;
}

interface LiveFeedProps {
  className?: string;
}

/* ── Helpers ── */

const normalizeStatus = (severity: string): LiveFeedEvent['status'] => {
  if (severity === 'success' || severity === 'warning' || severity === 'error') return severity;
  return 'info';
};

const agentIconMap: Record<string, React.ReactNode> = {
  topic_discovery: <Zap className="h-3.5 w-3.5" />,
  topic_lock: <Zap className="h-3.5 w-3.5" />,
  domain_intelligence: <Shield className="h-3.5 w-3.5" />,
  historical_review: <Clock className="h-3.5 w-3.5" />,
  literature_review: <BookOpen className="h-3.5 w-3.5" />,
  google_news: <Globe className="h-3.5 w-3.5" />,
  web_scraper: <Search className="h-3.5 w-3.5" />,
  novelty_analysis: <Sparkles className="h-3.5 w-3.5" />,
  scoring: <BarChart3 className="h-3.5 w-3.5" />,
  critique: <AlertCircle className="h-3.5 w-3.5" />,
  synthesis: <FileText className="h-3.5 w-3.5" />,
  report_generation: <PenTool className="h-3.5 w-3.5" />,
  multi_stage_report: <PenTool className="h-3.5 w-3.5" />,
  visualization: <Image className="h-3.5 w-3.5" />,
  latex_generation: <FileText className="h-3.5 w-3.5" />,
  orchestrator: <Layers className="h-3.5 w-3.5" />,
};

/** Map stage names to pipeline phase labels */
const phaseMap: Record<string, string> = {
  topic_discovery: 'Topic Selection',
  topic_lock: 'Topic Selection',
  orchestrator: 'Orchestration',
  domain_intelligence: 'Intelligence Gathering',
  historical_review: 'Intelligence Gathering',
  literature_review: 'Literature Review',
  google_news: 'Intelligence Gathering',
  web_scraper: 'Data Collection',
  novelty_analysis: 'Analysis',
  scoring: 'Analysis',
  critique: 'Critical Review',
  synthesis: 'Synthesis',
  report_generation: 'Report Generation',
  multi_stage_report: 'Report Generation',
  visualization: 'Visualization',
  latex_generation: 'Export',
};

const phaseColorMap: Record<string, string> = {
  'Topic Selection': 'from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-400',
  'Orchestration': 'from-slate-500/20 to-slate-500/5 border-slate-500/30 text-slate-400',
  'Intelligence Gathering': 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
  'Literature Review': 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-400',
  'Data Collection': 'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400',
  'Analysis': 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400',
  'Critical Review': 'from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-400',
  'Synthesis': 'from-pink-500/20 to-pink-500/5 border-pink-500/30 text-pink-400',
  'Report Generation': 'from-indigo-500/20 to-indigo-500/5 border-indigo-500/30 text-indigo-400',
  'Visualization': 'from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-400',
  'Export': 'from-teal-500/20 to-teal-500/5 border-teal-500/30 text-teal-400',
};

interface PhaseGroup {
  phase: string;
  events: LiveFeedEvent[];
  startTime: string;
  endTime: string;
}

function getPhase(agentName: string): string {
  return phaseMap[agentName] || 'Processing';
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms < 0) return '0s';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

/* ── Component ── */

export const LiveFeed: React.FC<LiveFeedProps> = ({ className }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const [collapsedPhases, setCollapsedPhases] = useState<Set<number>>(new Set());

  const { currentStage, executionEvents, activeJob } = useResearchStore(
    useShallow((state) => ({
      currentStage: state.currentStage,
      executionEvents: state.executionEvents,
      activeJob: state.activeJob,
    }))
  );

  const isProcessing = activeJob?.status === 'processing';
  const isCompleted = activeJob?.status === 'completed';

  // Map raw events → typed events
  const liveEvents = useMemo<LiveFeedEvent[]>(() => {
    const mapped = executionEvents.map((ev) => ({
      id: ev.event_id,
      timestamp: ev.timestamp,
      agentName: ev.stage,
      action: ev.category || 'Processing',
      status: normalizeStatus(ev.severity),
      message: ev.message,
      category: ev.category,
    }));

    if (currentStage && isProcessing) {
      mapped.push({
        id: `current-${currentStage}-live`,
        timestamp: new Date().toISOString(),
        agentName: currentStage,
        action: 'Active',
        status: 'info',
        message: `${currentStage.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} is actively processing...`,
        category: 'stage',
      });
    }

    return mapped.slice(-120);
  }, [executionEvents, currentStage, isProcessing]);

  // Group events by phase
  const phaseGroups = useMemo<PhaseGroup[]>(() => {
    const groups: PhaseGroup[] = [];
    let current: PhaseGroup | null = null;

    for (const ev of liveEvents) {
      const phase = getPhase(ev.agentName);
      if (!current || current.phase !== phase) {
        current = { phase, events: [ev], startTime: ev.timestamp, endTime: ev.timestamp };
        groups.push(current);
      } else {
        current.events.push(ev);
        current.endTime = ev.timestamp;
      }
    }
    return groups;
  }, [liveEvents]);

  // Auto-scroll
  useEffect(() => {
    if (!userScrolled && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [liveEvents, userScrolled]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setUserScrolled(scrollHeight - scrollTop - clientHeight > 40);
  };

  const togglePhase = (idx: number) => {
    setCollapsedPhases((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const getAgentIcon = (agentName: string) =>
    agentIconMap[agentName] || <Cpu className="h-3.5 w-3.5" />;

  const getTimelineDotColor = (status: LiveFeedEvent['status']) => {
    switch (status) {
      case 'success': return 'bg-emerald-500 shadow-emerald-500/40';
      case 'error': return 'bg-red-500 shadow-red-500/40';
      case 'warning': return 'bg-amber-500 shadow-amber-500/40';
      default: return 'bg-blue-500 shadow-blue-500/40';
    }
  };

  /* ── Stats bar ── */
  const eventCounts = useMemo(() => {
    let s = 0, w = 0, e = 0;
    for (const ev of liveEvents) {
      if (ev.status === 'success') s++;
      else if (ev.status === 'warning') w++;
      else if (ev.status === 'error') e++;
    }
    return { success: s, warning: w, error: e, total: liveEvents.length };
  }, [liveEvents]);

  return (
    <div className={cn('flex flex-col h-full bg-card', className)}>
      {/* Header */}
      <div className="shrink-0 px-4 py-2.5 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isProcessing && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
            )}
            {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Agent Activity
            </h3>
          </div>

          {/* Compact stats */}
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
            {eventCounts.error > 0 && (
              <span className="flex items-center gap-0.5 text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {eventCounts.error}
              </span>
            )}
            {eventCounts.warning > 0 && (
              <span className="flex items-center gap-0.5 text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {eventCounts.warning}
              </span>
            )}
            <span className="flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {eventCounts.success}
            </span>
            <span className="text-muted-foreground/60">|</span>
            <span>{eventCounts.total} events</span>
          </div>
        </div>
      </div>

      {/* Events grouped by phase */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin"
      >
        {liveEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground p-6">
            <div className="text-center">
              {isProcessing ? (
                <>
                  <Loader2 className="h-8 w-8 mx-auto mb-3 text-blue-500/50 animate-spin" />
                  <p className="text-sm font-medium text-foreground/70">Agents starting up...</p>
                  <p className="text-xs text-muted-foreground mt-1">Activity will appear here as agents begin processing</p>
                </>
              ) : (
                <>
                  <Activity className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium text-foreground/70">No activity yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Start a research to see agent activity</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="py-2 space-y-1">
            {phaseGroups.map((group, gidx) => {
              const isCollapsed = collapsedPhases.has(gidx);
              const isLast = gidx === phaseGroups.length - 1;
              const phaseColor = phaseColorMap[group.phase] || 'from-zinc-500/20 to-zinc-500/5 border-zinc-500/30 text-zinc-400';
              const duration = formatDuration(group.startTime, group.endTime);
              const hasErrors = group.events.some((e) => e.status === 'error');
              const hasSuccess = group.events.some((e) => e.status === 'success');

              return (
                <div key={`phase-${gidx}`} className="mx-2">
                  {/* Phase header */}
                  <button
                    onClick={() => togglePhase(gidx)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left transition-all hover:brightness-110',
                      `bg-gradient-to-r ${phaseColor}`
                    )}
                  >
                    <ChevronDown className={cn(
                      'h-3 w-3 transition-transform shrink-0',
                      isCollapsed && '-rotate-90'
                    )} />
                    <span className="text-[11px] font-bold uppercase tracking-wider flex-1 truncate">
                      {group.phase}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {isLast && isProcessing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : hasErrors ? (
                        <AlertCircle className="h-3 w-3 text-red-400" />
                      ) : hasSuccess ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      ) : null}
                      <span className="text-[10px] font-mono opacity-70">
                        {duration} · {group.events.length}
                      </span>
                    </div>
                  </button>

                  {/* Phase events */}
                  {!isCollapsed && (
                    <div className="relative ml-4 mt-1 mb-2">
                      <div className="absolute left-[5px] top-0 bottom-0 w-px bg-border/40" />

                      {group.events.map((event) => {
                        const isActive = event.action === 'Active';
                        return (
                          <div key={event.id} className="relative pl-5 pb-1.5 last:pb-0">
                            <div className={cn(
                              'absolute left-0 top-[7px] w-[11px] h-[11px] rounded-full border-2 border-background z-10 shadow-sm',
                              isActive ? 'bg-blue-500 animate-pulse shadow-blue-500/40' : getTimelineDotColor(event.status)
                            )} />

                            <div className={cn(
                              'rounded-md px-2.5 py-1.5 transition-colors',
                              isActive
                                ? 'bg-blue-500/5 border border-blue-500/15'
                                : 'hover:bg-accent/30'
                            )}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className={cn('shrink-0 text-muted-foreground', isActive && 'text-blue-500')}>
                                    {getAgentIcon(event.agentName)}
                                  </span>
                                  <span className="text-[11px] font-semibold text-foreground truncate capitalize">
                                    {event.agentName.replace(/_/g, ' ')}
                                  </span>
                                  {isActive && <Loader2 className="w-3 h-3 text-blue-500 animate-spin shrink-0" />}
                                  {event.category && event.category !== 'stage' && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground uppercase tracking-wider shrink-0">
                                      {event.category}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                  {formatTime(event.timestamp)}
                                </span>
                              </div>
                              <p className={cn(
                                'text-[11px] leading-relaxed mt-0.5',
                                isActive ? 'text-blue-400/80' : 'text-muted-foreground'
                              )}>
                                {event.message}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scroll-to-bottom button */}
      {userScrolled && liveEvents.length > 0 && (
        <button
          className="shrink-0 px-4 py-1.5 border-t border-border bg-card text-center cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => {
            setUserScrolled(false);
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
          }}
        >
          <p className="text-[10px] text-primary font-medium">↓ New activity below — click to scroll</p>
        </button>
      )}
    </div>
  );
};

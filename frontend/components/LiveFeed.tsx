import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useResearchStore } from '../store';
import {
  Zap,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
  Shield
} from 'lucide-react';
import { cn } from '../lib/utils';

/* =========================
   Types
========================= */

interface LiveFeedEvent {
  id: string;
  timestamp: string;
  agentName: string;
  action: string;
  status: 'info' | 'success' | 'warning' | 'error';
  message: string;
  progress?: number;
}

interface LiveFeedProps {
  className?: string;
}

/* =========================
   Helpers
========================= */

const normalizeStatus = (severity: string): LiveFeedEvent['status'] => {
  if (severity === 'success' || severity === 'warning' || severity === 'error') {
    return severity;
  }
  return 'info';
};

/* =========================
   Component
========================= */

export const LiveFeed: React.FC<LiveFeedProps> = ({ className }) => {
  const [events, setEvents] = useState<LiveFeedEvent[]>([]);

  const {
    currentStage,
    executionEvents,
    activeJob
  } = useResearchStore(
    useShallow(state => ({
      currentStage: state.currentStage,
      executionEvents: state.executionEvents,
      activeJob: state.activeJob
    }))
  );

  /* =========================
     Transform execution events
  ========================= */

  useEffect(() => {
    const liveEvents: LiveFeedEvent[] = executionEvents.map(event => ({
      id: event.event_id,
      timestamp: event.timestamp,
      agentName: event.stage,
      action: event.category || 'Processing',
      status: normalizeStatus(event.severity),
      message: event.message
    }));

    if (currentStage && activeJob?.status === 'processing') {
      liveEvents.unshift({
        id: `current-${currentStage}`,
        timestamp: new Date().toISOString(),
        agentName: currentStage,
        action: 'Active',
        status: 'info',
        message: `${currentStage
          .replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())} agent is actively processing…`
      });
    }

    setEvents(liveEvents.slice(-50));
  }, [executionEvents, currentStage, activeJob?.status]);

  /* =========================
     UI helpers
  ========================= */

  const getStatusIcon = (status: LiveFeedEvent['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-3 w-3 text-emerald-600" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-3 w-3 text-amber-600" />;
      default:
        return <Activity className="h-3 w-3 text-blue-600" />;
    }
  };

  const getAgentIcon = (agentName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      topic_discovery: <Zap className="h-3 w-3" />,
      domain_intelligence: <Shield className="h-3 w-3" />,
      historical_review: <Clock className="h-3 w-3" />
    };
    return iconMap[agentName] || <Activity className="h-3 w-3" />;
  };

  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

  const getStatusDot = (status: LiveFeedEvent['status']) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-amber-500';
      default:
        return 'bg-blue-500';
    }
  };

  /* =========================
     Render
  ========================= */

  return (
    <div className={cn(
      'flex flex-col h-full bg-card border-l border-border',
      className
    )}>
      <div className="shrink-0 px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            Agent Activity Feed
          </h3>
          <span className="text-xs text-muted-foreground">
            {events.length} events
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground p-4">
            <div className="text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Waiting for agent activity…</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {events.map((event, index) => (
              <div
                key={event.id}
                className={cn(
                  'px-4 py-3 hover:bg-muted/20 transition-colors',
                  index === events.length - 1 &&
                    currentStage === event.agentName &&
                    'bg-blue-50/50 dark:bg-blue-950/20'
                )}
              >
                <div className="flex gap-3">
                  <div className={cn(
                    'relative h-2 w-2 rounded-full mt-1.5',
                    getStatusDot(event.status)
                  )}>
                    {index === events.length - 1 &&
                      currentStage === event.agentName && (
                        <span className="absolute inset-0 rounded-full animate-ping bg-current" />
                      )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {getAgentIcon(event.agentName)}
                        <span className="text-xs font-medium">
                          {event.agentName.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          • {event.action}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {getStatusIcon(event.status)}
                        {formatTime(event.timestamp)}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {event.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 py-2 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          Live feed • Auto-updating
        </p>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { Brain, Search, FileText, AlertCircle, ChevronDown } from 'lucide-react';

interface ExecutionEvent {
  event_id: string;
  timestamp: string;
  stage: string;
  severity: 'info' | 'warn' | 'error' | 'success';
  category: string;
  message: string;
  details?: Record<string, any>;
}

interface ResearchStepsProps {
  events: ExecutionEvent[];
  isActive: boolean;
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'agent':
      return Brain;
    case 'source':
      return Search;
    case 'result':
    case 'results':
      return FileText;
    case 'error':
      return AlertCircle;
    default:
      return Brain;
  }
}

function getSeverityColor(severity: ExecutionEvent['severity']): {
  dot: string;
  line: string;
  bg: string;
  text: string;
  icon: string;
} {
  switch (severity) {
    case 'info':
      return {
        dot: 'bg-blue-500',
        line: 'bg-blue-500/20',
        bg: 'bg-blue-500/10 dark:bg-blue-500/20',
        text: 'text-blue-700 dark:text-blue-400',
        icon: 'text-blue-500',
      };
    case 'success':
      return {
        dot: 'bg-emerald-500',
        line: 'bg-emerald-500/20',
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        text: 'text-emerald-700 dark:text-emerald-400',
        icon: 'text-emerald-500',
      };
    case 'warn':
      return {
        dot: 'bg-amber-500',
        line: 'bg-amber-500/20',
        bg: 'bg-amber-500/10 dark:bg-amber-500/20',
        text: 'text-amber-700 dark:text-amber-400',
        icon: 'text-amber-500',
      };
    case 'error':
      return {
        dot: 'bg-red-500',
        line: 'bg-red-500/20',
        bg: 'bg-red-500/10 dark:bg-red-500/20',
        text: 'text-red-700 dark:text-red-400',
        icon: 'text-red-500',
      };
    default:
      return {
        dot: 'bg-zinc-400',
        line: 'bg-zinc-400/20',
        bg: 'bg-zinc-100 dark:bg-zinc-800',
        text: 'text-zinc-600 dark:text-zinc-400',
        icon: 'text-zinc-400',
      };
  }
}

export const ResearchSteps: React.FC<ResearchStepsProps> = ({ events, isActive }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Show only the last 50 events
  const visibleEvents = events.slice(-50);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleEvents.length, isExpanded]);

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-light-300 dark:border-dark-300 bg-light-secondary dark:bg-dark-secondary overflow-hidden transition-all duration-200">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left
          hover:bg-light-200 dark:hover:bg-dark-200 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Research Steps
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            ({events.length} events)
          </span>
          {isActive && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>

      {/* Timeline */}
      {isExpanded && (
        <div
          ref={scrollRef}
          className="max-h-80 overflow-y-auto px-4 pb-4"
        >
          <div className="relative ml-3">
            {/* Vertical connector line */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-light-300 dark:bg-dark-300" />

            {visibleEvents.map((event, index) => {
              const isLast = index === visibleEvents.length - 1;
              const colors = getSeverityColor(event.severity);
              const Icon = getCategoryIcon(event.category);

              return (
                <div key={event.event_id} className="relative pl-6 pb-4 last:pb-0">
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-0 top-1.5 w-2 h-2 rounded-full -translate-x-[3.5px] ${colors.dot} ${
                      isLast && isActive ? 'animate-pulse ring-4 ring-current/20' : ''
                    }`}
                  />

                  {/* Event content */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${colors.icon}`} />
                      <span className={`text-xs font-medium ${colors.text}`}>
                        {event.stage}
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {event.message}
                    </p>
                    {event.details && Object.keys(event.details).length > 0 && (
                      <div className={`mt-1 rounded-md px-2.5 py-1.5 text-xs font-mono ${colors.bg} ${colors.text}`}>
                        {Object.entries(event.details).map(([key, value]) => (
                          <div key={key}>
                            <span className="opacity-70">{key}:</span>{' '}
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

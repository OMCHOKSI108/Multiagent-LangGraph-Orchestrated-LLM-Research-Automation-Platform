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
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md overflow-hidden transition-all duration-200 shadow-sm">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left
          hover:bg-white/60 dark:hover:bg-zinc-800/60 transition-colors border-b border-transparent hover:border-zinc-100 dark:hover:border-zinc-800"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Research Steps
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
            {events.length}
          </span>
          {isActive && (
            <span className="ml-2 inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Processing
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'
            }`}
        />
      </button>

      {/* Timeline */}
      {isExpanded && (
        <div
          ref={scrollRef}
          className="max-h-80 overflow-y-auto px-4 pb-4 pt-2 custom-scrollbar"
        >
          <div className="relative ml-2">
            {/* Vertical connector line */}
            <div className="absolute left-[3px] top-2 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800" />

            {visibleEvents.map((event, index) => {
              const isLast = index === visibleEvents.length - 1;
              const colors = getSeverityColor(event.severity);
              const Icon = getCategoryIcon(event.category);

              return (
                <div key={event.event_id} className="relative pl-6 pb-5 last:pb-1 group">
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-0 top-1.5 w-2 h-2 rounded-full -translate-x-[0.5px] z-10 box-content border-2 border-white dark:border-zinc-900 ${colors.dot} ${isLast && isActive ? 'animate-pulse' : ''
                      }`}
                  />

                  {/* Event content */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded-md ${colors.bg}`}>
                        <Icon className={`w-3 h-3 ${colors.icon}`} />
                      </div>
                      <span className={`text-xs font-semibold ${colors.text} tracking-tight`}>
                        {event.stage}
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed pl-1">
                      {event.message}
                    </p>

                    {event.details && Object.keys(event.details).length > 0 && (
                      <div className={`mt-1.5 rounded-lg px-3 py-2 text-xs font-mono border ${colors.bg} border-transparent group-hover:border-zinc-200 dark:group-hover:border-zinc-700 transition-colors`}>
                        {Object.entries(event.details).map(([key, value]) => (
                          <div key={key} className="flex gap-2 text-zinc-600 dark:text-zinc-400">
                            <span className="opacity-70 flex-shrink-0">{key}:</span>
                            <span className="truncate">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
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

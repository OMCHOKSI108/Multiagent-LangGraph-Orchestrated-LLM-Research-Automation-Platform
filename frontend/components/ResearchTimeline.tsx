import React, { useRef, useEffect } from 'react';
import { Brain, Search, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';

interface ExecutionEvent {
    event_id: string;
    timestamp: string;
    stage: string;
    severity: 'info' | 'warn' | 'error' | 'success';
    category: string;
    message: string;
    details?: Record<string, any>;
}

interface ResearchTimelineProps {
    events: ExecutionEvent[];
    isActive: boolean;
    className?: string;
}

export const ResearchTimeline: React.FC<ResearchTimelineProps> = ({ events, isActive, className }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Show only relevant events for the timeline (skip overly verbose logs if needed)
    // For now, allow all, but maybe filter in future
    const timelineEvents = events;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [events.length]);

    if (events.length === 0) return null;

    return (
        <div className={cn("flex flex-col h-full", className)}>
            <div className="px-4 py-3 border-b bg-background sticky top-0 z-10">
                <h3 className="text-sm font-semibold flex items-center justify-between">
                    Research Progress
                    {isActive && <Badge variant="outline" className="text-blue-500 border-blue-200 bg-blue-50">Running</Badge>}
                </h3>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
                {timelineEvents.map((event, index) => {
                    const isLast = index === timelineEvents.length - 1;

                    return (
                        <div key={event.event_id || index} className="relative pl-6 group">
                            {/* Connector Line */}
                            {!isLast && (
                                <div className="absolute left-[9px] top-6 bottom-[-24px] w-px bg-border group-last:hidden" />
                            )}

                            {/* Dot */}
                            <div className={cn(
                                "absolute left-0 top-1 h-5 w-5 rounded-full border-2 border-background flex items-center justify-center bg-muted text-[10px]",
                                event.severity === 'success' && "bg-emerald-100 text-emerald-600",
                                event.severity === 'error' && "bg-red-100 text-red-600",
                                event.severity === 'info' && "bg-blue-100 text-blue-600",
                                isActive && isLast && "animate-pulse ring-4 ring-primary/20 bg-primary"
                            )}>
                                <div className={cn("h-2 w-2 rounded-full bg-current")} />
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-foreground leading-none">
                                        {event.stage}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground tabular-nums">
                                        {new Date(event.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {event.message}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

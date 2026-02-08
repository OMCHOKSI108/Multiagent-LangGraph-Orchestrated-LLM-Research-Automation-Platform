import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

interface ExecutionEvent {
    event_id: string;
    timestamp: string;
    stage: string;
    severity: 'info' | 'warn' | 'error' | 'success';
    category: string;
    message: string;
    details?: Record<string, any>;
}

interface ActivityLogProps {
    events: ExecutionEvent[];
    className?: string;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ events, className }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (!isPaused && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [events, isPaused]);

    return (
        <Card className={cn("flex flex-col h-full border-none shadow-none rounded-none bg-transparent", className)}>
            <CardHeader className="px-4 py-3 border-b">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Live Activity
                    <Badge variant="secondary" className="ml-auto text-xs font-normal">
                        {events.length}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent
                className="flex-1 overflow-y-auto p-0"
                ref={scrollRef}
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
            >
                <div className="flex flex-col divide-y">
                    {events.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                            Waiting for activity...
                        </div>
                    ) : (
                        events.map((event, idx) => {
                            const isLatest = idx === events.length - 1;

                            let Icon = Info;
                            let colorClass = "text-muted-foreground";

                            if (event.severity === 'info') { Icon = Info; colorClass = "text-blue-500"; }
                            if (event.severity === 'success') { Icon = CheckCircle; colorClass = "text-emerald-500"; }
                            if (event.severity === 'warn') { Icon = AlertTriangle; colorClass = "text-amber-500"; }
                            if (event.severity === 'error') { Icon = AlertCircle; colorClass = "text-destructive"; }

                            return (
                                <div key={event.event_id || idx} className={cn("flex gap-3 p-3 text-sm hover:bg-muted/50 transition-colors", isLatest && "bg-muted/20")}>
                                    <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", colorClass)} />
                                    <div className="flex-1 space-y-1">
                                        <p className="leading-tight text-foreground text-xs font-medium">
                                            {event.message}
                                        </p>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                            <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                                            <span>•</span>
                                            <span className="uppercase">{event.stage}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, Terminal } from 'lucide-react';

interface ExecutionEvent {
    event_id: string;
    timestamp: string;
    stage: string;
    severity: 'info' | 'warn' | 'error' | 'success';
    category: string;
    message: string;
    details?: Record<string, any>;
}

interface LiveActivityFeedProps {
    events: ExecutionEvent[];
    isProcessing: boolean;
}

const severityConfig = {
    info: { icon: Info, color: 'text-zinc-400', bg: 'bg-zinc-800/50' },
    success: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/30' },
    warn: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
    error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-900/30' },
};

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({ events, isProcessing }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (!isPaused && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [events, isPaused]);

    return (
        <div className="h-full flex flex-col font-mono text-xs">
            {/* Header - Transparent */}
            <div className="flex items-center justify-between px-2 py-2 mb-2">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-emerald-400 font-bold tracking-wider uppercase text-[10px]">Live Feed</span>
                </div>
                <div className="text-[10px] text-zinc-500">
                    {events.length} EVENTS
                </div>
            </div>

            {/* Log Content - Transparent & Minimal */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto space-y-1.5 px-2 custom-scrollbar mask-gradient-b"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
            >
                {events.length === 0 ? (
                    <div className="text-zinc-500 dark:text-zinc-600 italic px-2">Waiting for signal...</div>
                ) : (
                    events.map((event, idx) => {
                        const isLatest = idx === events.length - 1;
                        let colorClass = "text-zinc-500 dark:text-zinc-400";
                        if (event.severity === 'info') colorClass = "text-blue-600 dark:text-blue-400";
                        if (event.severity === 'success') colorClass = "text-emerald-600 dark:text-emerald-400";
                        if (event.severity === 'warn') colorClass = "text-amber-600 dark:text-amber-400";
                        if (event.severity === 'error') colorClass = "text-red-600 dark:text-red-400";

                        return (
                            <div
                                key={event.event_id || idx}
                                className={`flex gap-3 items-start animate-fade-in ${isLatest ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                                    } transition-opacity duration-300 bg-white/40 dark:bg-black/20 hover:bg-white/60 dark:hover:bg-black/40 p-2 rounded`}
                            >
                                <span className="text-zinc-500 dark:text-zinc-600 shrink-0 select-none text-[10px] pt-0.5">
                                    {new Date(event.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                                </span>
                                <div className="flex-1 break-words">
                                    <span className={`font-bold mr-2 uppercase text-[10px] tracking-wide ${colorClass}`}>
                                        [{event.severity}]
                                    </span>
                                    <span className="text-zinc-700 dark:text-zinc-300">
                                        {event.message}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default LiveActivityFeed;

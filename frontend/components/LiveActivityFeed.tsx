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

    const formatTime = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString('en-US', { hour12: false });
        } catch {
            return '--:--:--';
        }
    };

    return (
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-medium text-gray-200">Live Activity</span>
                    {isProcessing && (
                        <span className="flex items-center gap-1 text-[10px] text-green-400">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                            Live
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setIsPaused(!isPaused)}
                    className={`text-xs px-2 py-1 rounded ${isPaused ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300'
                        }`}
                >
                    {isPaused ? 'Resume' : 'Pause'}
                </button>
            </div>

            {/* Log Content - More compact */}
            <div
                ref={scrollRef}
                className="h-40 overflow-y-auto p-2 font-mono text-[11px] space-y-0.5"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
            >
                {events.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">
                        Waiting for activity...
                    </div>
                ) : (
                    events.map((event, idx) => {
                        const config = severityConfig[event.severity] || severityConfig.info;
                        const Icon = config.icon;

                        return (
                            <div
                                key={event.event_id || idx}
                                className={`flex items-start gap-2 px-2 py-0.5 rounded ${config.bg}`}
                            >
                                <span className="text-gray-500 shrink-0">
                                    {formatTime(event.timestamp)}
                                </span>
                                <Icon className={`w-3 h-3 mt-0.5 shrink-0 ${config.color}`} />
                                <span className={`${config.color} break-all`}>
                                    {event.message}
                                </span>
                            </div>
                        );
                    })
                )}

                {isProcessing && (
                    <div className="flex items-center gap-2 px-2 py-1 text-gray-400">
                        <span className="w-2 h-4 bg-cyan-400 animate-pulse" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveActivityFeed;

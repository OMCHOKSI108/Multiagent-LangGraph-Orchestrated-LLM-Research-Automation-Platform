import React, { useEffect, useState } from 'react';
import { Clock, Play, Pause, CheckCircle } from 'lucide-react';

interface ExecutionTimerProps {
    startedAt: string | null;
    completedAt: string | null;
    isProcessing: boolean;
}

export const ExecutionTimer: React.FC<ExecutionTimerProps> = ({
    startedAt,
    completedAt,
    isProcessing,
}) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!startedAt) {
            setElapsed(0);
            return;
        }

        const start = new Date(startedAt).getTime();

        if (completedAt) {
            // Job finished - show final time
            const end = new Date(completedAt).getTime();
            setElapsed(Math.floor((end - start) / 1000));
            return;
        }

        // Job running - update live
        const interval = setInterval(() => {
            const now = Date.now();
            setElapsed(Math.floor((now - start) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [startedAt, completedAt]);

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg border border-zinc-700">
            {/* Icon */}
            <div className="w-6 h-6 flex items-center justify-center">
                {completedAt ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                ) : isProcessing ? (
                    <Play className="w-5 h-5 text-cyan-400 animate-pulse" />
                ) : (
                    <Clock className="w-5 h-5 text-zinc-500" />
                )}
            </div>

            {/* Timer Display */}
            <div className="flex flex-col">
                <span className="text-xl font-mono text-white">
                    {formatTime(elapsed)}
                </span>
                <span className="text-xs text-zinc-500">
                    {completedAt ? 'Total time' : isProcessing ? 'Elapsed' : 'Waiting...'}
                </span>
            </div>
        </div>
    );
};

export default ExecutionTimer;

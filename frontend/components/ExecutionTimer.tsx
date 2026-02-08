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
            const end = new Date(completedAt).getTime();
            setElapsed(Math.floor((end - start) / 1000));
            return;
        }

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
        <div className="flex items-center gap-2">
            {completedAt ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
            ) : isProcessing ? (
                <Play className="w-4 h-4 text-cyan-400 animate-pulse" />
            ) : (
                <Clock className="w-4 h-4 text-zinc-500" />
            )}
            <span className="text-lg font-mono font-semibold text-white tabular-nums">
                {formatTime(elapsed)}
            </span>
        </div>
    );
};

export default ExecutionTimer;

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
    const [elapsedMs, setElapsedMs] = useState(0);

    useEffect(() => {
        if (!startedAt) {
            setElapsedMs(0);
            return;
        }

        const start = new Date(startedAt).getTime();

        const update = () => {
            const now = completedAt ? new Date(completedAt).getTime() : Date.now();
            setElapsedMs(now - start);
        };

        update(); // Initial update

        if (!completedAt) {
            const interval = setInterval(update, 83); // ~12fps for millisecond look without killing CPU
            return () => clearInterval(interval);
        }
    }, [startedAt, completedAt]);

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        const millis = Math.floor((ms % 1000) / 10); // 2 digits

        return (
            <div className="flex items-baseline font-mono text-zinc-100 leading-none">
                <span className="text-2xl font-bold">{mins.toString().padStart(2, '0')}</span>
                <span className="text-zinc-500 mx-0.5">:</span>
                <span className="text-2xl font-bold">{secs.toString().padStart(2, '0')}</span>
                <span className="text-base text-zinc-500 ml-1">.{millis.toString().padStart(2, '0')}</span>
            </div>
        );
    };

    return (
        <div className="flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur-md rounded-lg border border-zinc-800/50 shadow-lg">
            {/* Status Pulse */}
            <div className="relative flex h-3 w-3">
                {isProcessing && !completedAt && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${completedAt ? 'bg-green-500' : isProcessing ? 'bg-cyan-500' : 'bg-zinc-500'
                    }`}></span>
            </div>

            {/* Timer Display */}
            <div className="flex flex-col">
                {formatTime(elapsedMs)}
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold self-end -mt-1">
                    {completedAt ? 'Completed' : 'Elapsed'}
                </span>
            </div>
        </div>
    );
};

export default ExecutionTimer;

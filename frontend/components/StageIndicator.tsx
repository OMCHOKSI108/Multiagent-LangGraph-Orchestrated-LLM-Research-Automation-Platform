import React from 'react';
import { Check, Circle, Loader2 } from 'lucide-react';

interface Stage {
    id: string;
    label: string;
}

interface StageIndicatorProps {
    currentStage: string;
    stages?: Stage[];
}

const DEFAULT_STAGES: Stage[] = [
    { id: 'queued', label: 'Queued' },
    { id: 'orchestrating', label: 'Planning' },
    { id: 'searching', label: 'Searching Sources' },
    { id: 'scraping', label: 'Fetching Content' },
    { id: 'parsing', label: 'Parsing Documents' },
    { id: 'analyzing', label: 'Analyzing' },
    { id: 'synthesizing', label: 'Synthesizing' },
    { id: 'visualizing', label: 'Generating Visuals' },
    { id: 'writing', label: 'Writing Report' },
    { id: 'finalizing', label: 'Finalizing' },
    { id: 'completed', label: 'Completed' },
];

export const StageIndicator: React.FC<StageIndicatorProps> = ({
    currentStage,
    stages = DEFAULT_STAGES,
}) => {
    const currentIndex = stages.findIndex((s) => s.id === currentStage);

    return (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Progress</h3>
            <div className="space-y-2">
                {stages.map((stage, idx) => {
                    const isCompleted = idx < currentIndex;
                    const isCurrent = idx === currentIndex;
                    const isPending = idx > currentIndex;

                    return (
                        <div
                            key={stage.id}
                            className={`flex items-center gap-3 py-1 ${isPending ? 'opacity-40' : ''
                                }`}
                        >
                            {/* Status Icon */}
                            <div className="w-5 h-5 flex items-center justify-center">
                                {isCompleted && (
                                    <Check className="w-4 h-4 text-green-400" />
                                )}
                                {isCurrent && (
                                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                                )}
                                {isPending && (
                                    <Circle className="w-3 h-3 text-gray-500" />
                                )}
                            </div>

                            {/* Label */}
                            <span
                                className={`text-sm ${isCurrent
                                        ? 'text-cyan-300 font-medium'
                                        : isCompleted
                                            ? 'text-gray-400'
                                            : 'text-gray-500'
                                    }`}
                            >
                                {stage.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StageIndicator;

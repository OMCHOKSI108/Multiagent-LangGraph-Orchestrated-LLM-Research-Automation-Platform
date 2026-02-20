import React from 'react';
import { cn } from '../lib/utils';
import { CheckCircle2, Circle, Loader2, Clock } from 'lucide-react';

interface ExecutionEvent {
    event_id: string;
    timestamp: string;
    stage: string;
    severity: 'info' | 'warn' | 'error' | 'success';
    category: string;
    message: string;
}

interface PipelineTimelineProps {
    events: ExecutionEvent[];
    isActive: boolean;
    currentStage?: string;
    jobStatus?: string;
    className?: string;
}

const AGENT_ORDER = [
    'topic_discovery',
    'domain_intelligence',
    'historical_review',
    'slr',
    'news',
    'gap_synthesis',
    'innovation',
    'paper_decomposition',
    'technical_verification',
    'visualization',
    'scoring',
    'multi_stage_report'
];

export const PipelineTimeline: React.FC<PipelineTimelineProps> = ({ events, isActive, currentStage, jobStatus, className }) => {
    const isFailed = jobStatus === 'failed';

    const getAgentEvents = (agentName: string) =>
        events.filter(e =>
            e.stage === agentName ||
            e.message.toLowerCase().includes(agentName.replace(/_/g, ' '))
        );

    // Determine status of each agent based on event history
    const getAgentStatus = (agentName: string, blocked: boolean) => {
        const agentEvents = getAgentEvents(agentName);
        const hasStarted = agentEvents.length > 0 || (isActive && currentStage === agentName);
        const hasCompleted = agentEvents.some(e => e.severity === 'success' || e.message.includes('completed'));
        const hasFailed = agentEvents.some(e => e.severity === 'error');

        if (blocked || hasFailed || isFailed) return 'blocked';
        if (hasCompleted) return 'completed';
        if (hasStarted && isActive) return 'running';
        return 'idle';
    };

    return (
        <div className={cn("w-full h-16 border-b border-border bg-background flex items-center px-6 overflow-x-auto no-scrollbar", className)}>
            <div className="flex items-center gap-1 min-w-max">
                {AGENT_ORDER.map((agent, index) => {
                    const hasFailure = events.some(e => e.severity === 'error');
                    const blocked = hasFailure && !getAgentEvents(agent).some(e => e.severity === 'success');
                    const status = getAgentStatus(agent, blocked);
                    const isLast = index === AGENT_ORDER.length - 1;

                    return (
                        <div key={agent} className="flex items-center">
                            <div className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all",
                                status === 'completed' && "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                                status === 'running' && "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/10",
                                status === 'blocked' && "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
                                status === 'idle' && "bg-secondary border-border text-muted-foreground opacity-60"
                            )}>
                                {status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                {status === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {status === 'blocked' && <Circle className="w-3.5 h-3.5 text-red-500" />}
                                {status === 'idle' && <Circle className="w-3.5 h-3.5" />}

                                <span className="text-xs font-medium capitalize whitespace-nowrap">
                                    {agent.replace(/_/g, ' ')}
                                </span>
                            </div>

                            {!isLast && (
                                <div className={cn(
                                    "w-6 h-px mx-1",
                                    status === 'completed' ? "bg-emerald-500/30" : "bg-border"
                                )} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

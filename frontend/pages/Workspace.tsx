import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useResearchStore } from '../store';
import { JobStatus, LogEntry } from '../types';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { LiveActivityFeed } from '../components/LiveActivityFeed';
import { StageIndicator } from '../components/StageIndicator';
import { DataSourcesPanel } from '../components/DataSourcesPanel';
import { ExecutionTimer } from '../components/ExecutionTimer';
import { EditableTitle } from '../components/EditableTitle';
import {
    Send,
    FileText,
    Image as ImageIcon,
    GitGraph,
    Share,
    Loader2,
    PanelRightClose,
    PanelRightOpen,
    Bot,
    Zap,
    MoreHorizontal
} from 'lucide-react';
import mermaid from 'mermaid';

const MermaidChart = ({ chart }: { chart: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (ref.current) {
            mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart).then(res => {
                if (ref.current) ref.current.innerHTML = res.svg;
            });
        }
    }, [chart]);
    return <div ref={ref} className="bg-zinc-50 border border-zinc-200 p-6 rounded-lg flex justify-center overflow-x-auto" />;
}

export const Workspace = () => {
    const { id } = useParams();
    const {
        activeJob,
        setActiveJob,
        stopPolling,
        chatHistory,
        addChatMessage,
        executionEvents,
        dataSources,
        currentStage,
        startedAt,
        completedAt,
        subscribeToLiveEvents,
        unsubscribeLiveEvents,
        renameResearch
    } = useResearchStore();
    const [activeTab, setActiveTab] = useState<'report' | 'diagrams' | 'gallery'>('report');
    const [input, setInput] = useState('');
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
    const [showActivityFeed, setShowActivityFeed] = useState(true);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (id) {
            setActiveJob(id);
            subscribeToLiveEvents(id);
        }
        return () => {
            stopPolling();
            unsubscribeLiveEvents();
        };
    }, [id, setActiveJob, stopPolling, subscribeToLiveEvents, unsubscribeLiveEvents]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, activeJob?.logs]);

    if (!activeJob) {
        return (
            <div className="h-full flex items-center justify-center bg-zinc-50 text-zinc-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Loading workspace...</span>
            </div>
        );
    }

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        addChatMessage(input, 'user');
        setInput('');
    };

    const isProcessing = activeJob.status === JobStatus.PROCESSING || activeJob.status === JobStatus.QUEUED;

    return (
        <div className="flex h-full w-full overflow-hidden bg-zinc-50">

            {/* CENTER: Chat Interface */}
            <div className="flex-1 flex flex-col min-w-[400px] relative bg-white border-r border-zinc-200">

                {/* Header */}
                <div className="h-14 border-b border-zinc-200 flex items-center justify-between px-6 bg-white/80 backdrop-blur-sm shrink-0 z-10 sticky top-0">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <EditableTitle
                            title={activeJob.topic}
                            onSave={(newTitle) => renameResearch(activeJob.id, newTitle)}
                        />
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                            <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> {activeJob.modelUsed || 'Auto-Model'}</span>
                            {isProcessing && (
                                <>
                                    <span className="text-zinc-300">•</span>
                                    <span className="text-blue-600 font-medium">{currentStage}</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${activeJob.status === JobStatus.COMPLETED ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            activeJob.status === JobStatus.PROCESSING ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-zinc-100 text-zinc-600 border-zinc-200'
                            }`}>
                            {activeJob.status}
                        </span>
                        <button
                            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                            className="p-2 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 rounded-md transition-colors"
                        >
                            {isRightPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Live Execution Panel - shown when processing */}
                {isProcessing && (
                    <div className="border-b border-zinc-200 bg-gradient-to-b from-zinc-900 to-zinc-800 text-white">
                        {/* Compact Header Bar */}
                        <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-700">
                            <div className="flex items-center gap-4">
                                <ExecutionTimer
                                    startedAt={startedAt}
                                    completedAt={completedAt}
                                    isProcessing={isProcessing}
                                />
                                <div className="h-6 w-px bg-zinc-600" />
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                                    <span className="text-sm font-medium capitalize">{currentStage || 'Starting...'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-400">
                                <span>{dataSources.length} sources</span>
                                <span>•</span>
                                <span>{executionEvents.length} events</span>
                            </div>
                        </div>

                        {/* Activity Feed Only - Compact */}
                        <div className="p-4">
                            <LiveActivityFeed events={executionEvents} isProcessing={isProcessing} />
                        </div>
                    </div>
                )}

                {/* Chat Stream */}
                <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    <div className="max-w-3xl mx-auto space-y-8">

                        {/* Intro Message */}
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                                <Bot className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div className="space-y-1 pt-1">
                                <div className="text-sm font-medium text-zinc-900">Research Agent</div>
                                <div className="text-sm text-zinc-600 leading-relaxed bg-zinc-50 border border-zinc-100 rounded-lg p-3 rounded-tl-none">
                                    Research initialized for: <span className="font-semibold text-zinc-900">{activeJob.topic}</span>.
                                </div>
                            </div>
                        </div>

                        {/* Logs Stream (Inline) */}
                        {isProcessing && (
                            <div className="pl-12">
                                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 font-mono text-xs space-y-1.5 text-zinc-600 max-h-56 overflow-y-auto shadow-inner">
                                    {activeJob.logs.map(log => (
                                        <div key={log.id} className="flex gap-3 opacity-90">
                                            <span className="text-zinc-400 select-none">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                                            <span>{log.message}</span>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-2 text-indigo-600 animate-pulse mt-3 font-semibold">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Processing...
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Chat History */}
                        {chatHistory.map((msg) => (
                            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                {msg.role === 'assistant' ? (
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                                        <Bot className="w-4 h-4 text-indigo-600" />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0 text-zinc-600 text-xs font-bold">
                                        YOU
                                    </div>
                                )}

                                <div className={`max-w-[80%] text-sm leading-relaxed p-4 rounded-xl ${msg.role === 'user'
                                    ? 'bg-zinc-100 text-zinc-900 rounded-tr-none'
                                    : 'bg-white border border-zinc-200 text-zinc-900 rounded-tl-none shadow-subtle'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        <div ref={chatEndRef} />
                    </div>
                </div>

                {/* Input Area (Sticky) */}
                <div className="p-6 bg-white border-t border-zinc-200 shrink-0">
                    <div className="max-w-3xl mx-auto relative">
                        <form onSubmit={handleSend} className="relative group">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend(e);
                                    }
                                }}
                                disabled={isProcessing}
                                placeholder={isProcessing ? "Agent is processing..." : "Ask follow-up questions..."}
                                className="w-full bg-white border border-zinc-200 rounded-xl py-3.5 pl-4 pr-12 text-sm focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition-all resize-none shadow-sm min-h-[56px] max-h-[200px] disabled:bg-zinc-50 disabled:text-zinc-400 placeholder-zinc-400"
                                rows={1}
                                style={{ height: 'auto' }}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isProcessing}
                                className="absolute right-2.5 bottom-2.5 p-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        </form>
                        <div className="text-center mt-3 text-[11px] text-zinc-400">
                            DeepResearch can make mistakes. Verify important information.
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT: Results Panel */}
            {isRightPanelOpen && (
                <div className="w-[45%] shrink-0 flex flex-col bg-white border-l border-zinc-200 transition-all duration-300">
                    {/* Tabs */}
                    <div className="h-14 flex items-center px-4 border-b border-zinc-200 bg-white/80 backdrop-blur-sm shrink-0">
                        <div className="flex items-center gap-1 bg-zinc-100/80 p-1 rounded-lg">
                            {[
                                { id: 'report', label: 'Report', icon: FileText },
                                { id: 'diagrams', label: 'Diagrams', icon: GitGraph },
                                { id: 'gallery', label: 'Visuals', icon: ImageIcon },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === tab.id
                                        ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50'
                                        : 'text-zinc-500 hover:text-zinc-700'
                                        }`}
                                >
                                    <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="ml-auto">
                            <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors">
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-8 bg-white">
                        {activeTab === 'report' && (
                            <div className="max-w-none animate-in fade-in duration-300">
                                {activeJob.reportMarkdown ? (
                                    <MarkdownRenderer content={activeJob.reportMarkdown} />
                                ) : (
                                    <EmptyState icon={FileText} message="Generating report..." subMessage="This usually takes 2-3 minutes based on depth." />
                                )}
                            </div>
                        )}

                        {activeTab === 'diagrams' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                {activeJob.diagrams && activeJob.diagrams.length > 0 ? (
                                    activeJob.diagrams.map((chart, i) => (
                                        <div key={i} className="space-y-2">
                                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Figure {i + 1}</h4>
                                            <MermaidChart chart={chart} />
                                        </div>
                                    ))
                                ) : (
                                    <EmptyState icon={GitGraph} message="No diagrams yet" subMessage="Flowcharts and timelines will appear here." />
                                )}
                            </div>
                        )}

                        {activeTab === 'gallery' && (
                            <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-300">
                                {activeJob.images && activeJob.images.length > 0 ? (
                                    activeJob.images.map((img, i) => (
                                        <div key={i} className="group relative bg-zinc-100 rounded-lg overflow-hidden border border-zinc-200 shadow-sm">
                                            <img src={img} alt={`Asset ${i}`} className="w-full h-auto object-cover" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                                        </div>
                                    ))
                                ) : (
                                    <EmptyState icon={ImageIcon} message="No images yet" subMessage="Visual assets will appear here." />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const EmptyState = ({ icon: Icon, message, subMessage }: { icon: any, message: string, subMessage: string }) => (
    <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mb-4 border border-zinc-100">
            <Icon className="w-5 h-5 text-zinc-400" />
        </div>
        <h3 className="text-zinc-900 font-medium mb-1">{message}</h3>
        <p className="text-sm text-zinc-500">{subMessage}</p>
    </div>
);
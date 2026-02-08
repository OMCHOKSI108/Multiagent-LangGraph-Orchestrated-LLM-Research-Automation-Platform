import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useResearchStore } from '../store';
import { JobStatus, LogEntry } from '../types';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { LiveActivityFeed } from '../components/LiveActivityFeed';
import { DataSourcesPanel } from '../components/DataSourcesPanel';
import { ExecutionTimer } from '../components/ExecutionTimer';
import { EditableTitle } from '../components/EditableTitle';
import { MessageActions } from '../components/MessageActions';
import { MessageBoxLoading } from '../components/MessageBoxLoading';
import { ResearchSteps } from '../components/ResearchSteps';
import { SourcesModal } from '../components/SourcesModal';
import { LatexEditor } from '../components/LatexEditor';
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
    MoreHorizontal,
    Download,
    FileCode,
    Globe,
    ExternalLink
} from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';

// Lazy-load mermaid only when a diagram is actually rendered
let mermaidInstance: typeof import('mermaid').default | null = null;
const getMermaid = async () => {
    if (!mermaidInstance) {
        const m = await import('mermaid');
        mermaidInstance = m.default;
        mermaidInstance.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose', fontFamily: 'Inter' });
    }
    return mermaidInstance;
};

const MermaidChart = ({ chart }: { chart: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [error, setError] = useState(false);
    useEffect(() => {
        let cancelled = false;
        getMermaid().then((mermaid) => {
            if (cancelled || !ref.current) return;
            mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart).then(res => {
                if (!cancelled && ref.current) ref.current.innerHTML = res.svg;
            }).catch(() => { if (!cancelled) setError(true); });
        });
        return () => { cancelled = true; };
    }, [chart]);
    if (error) return <pre className="text-xs text-red-500 p-2">{chart}</pre>;
    return <div ref={ref} className="bg-zinc-50 dark:bg-dark-200 border border-zinc-200 dark:border-dark-300 p-6 rounded-lg flex justify-center overflow-x-auto" />;
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
        renameResearch,
        exportMarkdown,
        exportPDF,
        exportLatex
    } = useResearchStore();
    const [activeTab, setActiveTab] = useState<'report' | 'diagrams' | 'gallery' | 'sources' | 'code'>('report');
    const [input, setInput] = useState('');
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
    const [showActivityFeed, setShowActivityFeed] = useState(true);
    const [sourcesModalOpen, setSourcesModalOpen] = useState(false);
    const [exportLoading, setExportLoading] = useState<'md' | 'pdf' | 'tex' | null>(null);
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
            <div className="h-full flex items-center justify-center bg-zinc-50 dark:bg-dark-primary">
                <LoadingSpinner />
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
        <div className="flex h-full w-full overflow-hidden bg-zinc-50 dark:bg-dark-primary">

            {/* SourcesModal */}
            <SourcesModal
                isOpen={sourcesModalOpen}
                onClose={() => setSourcesModalOpen(false)}
                sources={dataSources.map(ds => ({
                    url: `https://${ds.domain}`,
                    domain: ds.domain,
                    source_type: ds.source_type,
                    status: ds.status,
                    items_found: ds.items_found,
                }))}
            />

            {/* Main Layout Container */}
            <div className="flex w-full h-full">

                {/* LEFT PANEL: Main Canvas (Chat & Live Feed) */}
                <div className="flex-1 flex flex-col relative min-w-0 bg-zinc-50 dark:bg-[#0f1117]">

                    {/* Header Overlay */}
                    <div className="absolute top-0 left-0 right-0 z-20 px-6 py-4 flex items-center justify-between bg-gradient-to-b from-zinc-50/90 via-zinc-50/50 to-transparent dark:from-[#0f1117]/90 dark:via-[#0f1117]/50 pointer-events-none">
                        <div className="pointer-events-auto">
                            <EditableTitle
                                title={activeJob.topic}
                                onSave={(newTitle) => renameResearch(activeJob.id, newTitle)}
                            />
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-1">
                                <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> {activeJob.modelUsed || 'Auto-Model'}</span>
                                {isProcessing && (
                                    <>
                                        <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                        <span className="text-blue-500 font-medium">{currentStage}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="pointer-events-auto">
                            <ExecutionTimer
                                startedAt={startedAt}
                                completedAt={completedAt}
                                isProcessing={isProcessing}
                            />
                        </div>
                    </div>

                    {/* Chat Stream (Canvas) */}
                    <div className="flex-1 overflow-y-auto px-6 pt-24 pb-32 scroll-smooth">
                        <div className="max-w-3xl mx-auto space-y-6">
                            {executionEvents.length > 0 && (
                                <div className="mb-8">
                                    <ResearchSteps events={executionEvents} isActive={isProcessing} />
                                </div>
                            )}

                            {chatHistory.map((msg) => {
                                const isStreamingMsg = msg.role === 'assistant' && msg.content === '' && isProcessing;
                                return (
                                    <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        {msg.role === 'assistant' ? (
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center shrink-0">
                                                <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-600 dark:text-zinc-400 text-xs font-bold">
                                                YOU
                                            </div>
                                        )}

                                        <div className="max-w-[85%]">
                                            <div className={`text-sm leading-relaxed p-4 rounded-2xl ${msg.role === 'user'
                                                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tr-none'
                                                : 'bg-white dark:bg-[#161b22] border border-zinc-200 dark:border-zinc-800/50 text-zinc-900 dark:text-zinc-100 rounded-tl-none shadow-sm'
                                                }`}>
                                                {isStreamingMsg ? (
                                                    <MessageBoxLoading />
                                                ) : msg.role === 'assistant' ? (
                                                    <MarkdownRenderer content={msg.content || '...'} />
                                                ) : (
                                                    msg.content
                                                )}
                                            </div>
                                            {/* Actions for assistant messages */}
                                            {msg.role === 'assistant' && msg.content && !isStreamingMsg && (
                                                <div className="mt-1.5 pl-1 opacity-0 hover:opacity-100 transition-opacity">
                                                    <MessageActions content={msg.content} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>
                    </div>

                    {/* Floating HUD (Live Feed) - Bottom Left */}
                    <div className="absolute bottom-28 left-6 w-80 z-20 pointer-events-none">
                        <div className="bg-white/80 dark:bg-black/80 backdrop-blur-md border border-zinc-200/50 dark:border-white/10 rounded-xl overflow-hidden pointer-events-auto shadow-2xl transition-all duration-300 hover:bg-white/90 dark:hover:bg-black/90">
                            <div className="h-48">
                                <LiveActivityFeed events={executionEvents} isProcessing={isProcessing} />
                            </div>
                        </div>
                    </div>

                    {/* Sticky Input Area */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-zinc-50 via-zinc-50 to-transparent dark:from-[#0f1117] dark:via-[#0f1117] pointer-events-none">
                        <div className="max-w-3xl mx-auto pointer-events-auto">
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
                                    placeholder={isProcessing ? "Agent is researching..." : "Ask follow-up questions..."}
                                    className="w-full bg-white dark:bg-[#161b22] border border-zinc-200 dark:border-zinc-800 rounded-xl py-3.5 pl-4 pr-12 text-sm text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none shadow-lg min-h-[56px] disabled:opacity-50"
                                    rows={1}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isProcessing}
                                    className="absolute right-2.5 bottom-2.5 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: Results (Report, Sources, Code) */}
                <div className="w-[500px] 2xl:w-[40%] bg-white dark:bg-[#1c2128] border-l border-zinc-200 dark:border-zinc-800 flex flex-col shadow-xl z-30">
                    {/* Tabs Header */}
                    <div className="h-14 flex items-center px-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#1c2128]/80 backdrop-blur-sm shrink-0 justify-between">
                        <div className="flex items-center gap-1 bg-zinc-100/50 dark:bg-black/20 p-1 rounded-lg">
                            {[
                                { id: 'report', label: 'Report', icon: FileText },
                                { id: 'sources', label: 'Sources', icon: Globe, count: dataSources.length },
                                { id: 'code', label: 'LaTeX', icon: FileCode },
                                { id: 'gallery', label: 'Visuals', icon: ImageIcon },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === tab.id
                                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                                        }`}
                                >
                                    <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                                    {'count' in tab && tab.count > 0 && (
                                        <span className="text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full">{tab.count}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-1">
                            <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md transition-colors">
                                <Share className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md transition-colors">
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Right Panel Content */}
                    <div className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-[#0d1117]/50 p-6 relative">
                        {activeTab === 'report' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {activeJob.reportMarkdown ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-a:text-indigo-500">
                                        <MarkdownRenderer content={activeJob.reportMarkdown} />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-96 text-center">
                                        <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-zinc-100 dark:border-zinc-700/50">
                                            <FileText className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                                        </div>
                                        <h3 className="text-zinc-900 dark:text-zinc-100 font-medium mb-1">Report Generation</h3>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">{isProcessing ? "Researching and compiling data..." : "No report generated."}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'code' && (
                            <div className="h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <LatexEditor latex={activeJob.latexSource || (activeJob.reportMarkdown ? `\\documentclass{article}\n\\title{${activeJob.topic}}\n\\begin{document}\n\n${activeJob.reportMarkdown}\n\n\\end{document}` : '')} />
                            </div>
                        )}

                        {activeTab === 'sources' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <DataSourcesPanel sources={dataSources} isProcessing={isProcessing} />
                            </div>
                        )}

                        {activeTab === 'gallery' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="grid grid-cols-2 gap-4">
                                    {activeJob.images?.map((img, i) => (
                                        <div key={i} className="aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-lg overflow-hidden">
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                    {activeJob.diagrams?.map((diag, i) => (
                                        <div key={i} className="col-span-2 bg-white dark:bg-white rounded-lg p-2 overflow-auto">
                                            <MermaidChart chart={diag} />
                                        </div>
                                    ))}
                                </div>
                                {(!activeJob.images?.length && !activeJob.diagrams?.length) && (
                                    <div className="flex flex-col items-center justify-center h-64 text-center">
                                        <ImageIcon className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-3" />
                                        <p className="text-sm text-zinc-500">No visuals generated yet.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

const EmptyState = ({ icon: Icon, message, subMessage }: { icon: any, message: string, subMessage: string }) => (
    <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-12 h-12 bg-zinc-50 dark:bg-dark-200 rounded-full flex items-center justify-center mb-4 border border-zinc-100 dark:border-dark-300">
            <Icon className="w-5 h-5 text-zinc-400" />
        </div>
        <h3 className="text-zinc-900 dark:text-zinc-100 font-medium mb-1">{message}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{subMessage}</p>
    </div>
);
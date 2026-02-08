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
    const [activeTab, setActiveTab] = useState<'report' | 'diagrams' | 'gallery' | 'sources'>('report');
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
            <div className="h-full flex items-center justify-center bg-zinc-50 dark:bg-dark-primary text-zinc-500 dark:text-zinc-400 gap-2">
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

            {/* CENTER: Chat Interface */}
            <div className="flex-1 flex flex-col min-w-[400px] relative bg-white dark:bg-dark-primary border-r border-zinc-200 dark:border-dark-300">

                {/* Header */}
                <div className="h-14 border-b border-zinc-200 dark:border-dark-300 flex items-center justify-between px-6 bg-white/80 dark:bg-dark-primary/80 backdrop-blur-sm shrink-0 z-10 sticky top-0">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <EditableTitle
                            title={activeJob.topic}
                            onSave={(newTitle) => renameResearch(activeJob.id, newTitle)}
                        />
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                            <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> {activeJob.modelUsed || 'Auto-Model'}</span>
                            {isProcessing && (
                                <>
                                    <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                    <span className="text-blue-600 dark:text-blue-400 font-medium">{currentStage}</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${activeJob.status === JobStatus.COMPLETED ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' :
                            activeJob.status === JobStatus.PROCESSING ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' :
                                'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-dark-200 dark:text-zinc-400 dark:border-dark-300'
                            }`}>
                            {activeJob.status}
                        </span>
                        <button
                            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                            className="p-2 text-zinc-400 hover:bg-zinc-50 dark:hover:bg-dark-200 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md transition-colors"
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
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center shrink-0">
                                <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="space-y-1 pt-1">
                                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Research Agent</div>
                                <div className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-dark-200 border border-zinc-100 dark:border-dark-300 rounded-lg p-3 rounded-tl-none">
                                    Research initialized for: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{activeJob.topic}</span>.
                                </div>
                            </div>
                        </div>

                        {/* Research Steps - Execution timeline */}
                        {executionEvents.length > 0 && (
                            <div className="pl-12">
                                <ResearchSteps events={executionEvents} isActive={isProcessing} />
                            </div>
                        )}

                        {/* Chat History */}
                        {chatHistory.map((msg) => {
                            const isStreamingMsg = msg.role === 'assistant' && msg.content === '' && isProcessing;
                            return (
                                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    {msg.role === 'assistant' ? (
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center shrink-0">
                                            <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-dark-200 border border-zinc-200 dark:border-dark-300 flex items-center justify-center shrink-0 text-zinc-600 dark:text-zinc-400 text-xs font-bold">
                                            YOU
                                        </div>
                                    )}

                                    <div className="max-w-[80%]">
                                        <div className={`text-sm leading-relaxed p-4 rounded-xl ${msg.role === 'user'
                                            ? 'bg-zinc-100 dark:bg-dark-200 text-zinc-900 dark:text-zinc-100 rounded-tr-none'
                                            : 'bg-white dark:bg-dark-secondary border border-zinc-200 dark:border-dark-300 text-zinc-900 dark:text-zinc-100 rounded-tl-none shadow-subtle'
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

                {/* Input Area (Sticky) */}
                <div className="p-6 bg-white dark:bg-dark-primary border-t border-zinc-200 dark:border-dark-300 shrink-0">
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
                                className="w-full bg-white dark:bg-dark-secondary border border-zinc-200 dark:border-dark-300 rounded-xl py-3.5 pl-4 pr-12 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-400 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400 outline-none transition-all resize-none shadow-sm min-h-[56px] max-h-[200px] disabled:bg-zinc-50 dark:disabled:bg-dark-200 disabled:text-zinc-400 dark:disabled:text-zinc-500 placeholder-zinc-400 dark:placeholder-zinc-500"
                                rows={1}
                                style={{ height: 'auto' }}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isProcessing}
                                className="absolute right-2.5 bottom-2.5 p-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-dark-primary rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        </form>
                        <div className="text-center mt-3 text-[11px] text-zinc-400 dark:text-zinc-500">
                            DeepResearch can make mistakes. Verify important information.
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT: Results Panel - hidden on small screens */}
            {isRightPanelOpen && (
                <div className="hidden xl:flex w-[480px] 2xl:w-[45%] shrink-0 flex-col bg-white dark:bg-dark-primary border-l border-zinc-200 dark:border-dark-300 transition-all duration-300">
                    {/* Tabs */}
                    <div className="h-14 flex items-center px-4 border-b border-zinc-200 dark:border-dark-300 bg-white/80 dark:bg-dark-primary/80 backdrop-blur-sm shrink-0">
                        <div className="flex items-center gap-1 bg-zinc-100/80 dark:bg-dark-200/80 p-1 rounded-lg">
                            {[
                                { id: 'report', label: 'Report', icon: FileText },
                                { id: 'sources', label: 'Sources', icon: Globe, count: dataSources.length },
                                { id: 'diagrams', label: 'Diagrams', icon: GitGraph },
                                { id: 'gallery', label: 'Visuals', icon: ImageIcon },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === tab.id
                                        ? 'bg-white dark:bg-dark-primary text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200/50 dark:border-dark-300'
                                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                                        }`}
                                >
                                    <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                                    {'count' in tab && tab.count > 0 && (
                                        <span className="text-[10px] bg-zinc-200 dark:bg-dark-300 px-1.5 py-0.5 rounded-full">{tab.count}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="ml-auto flex items-center gap-1">
                            {activeJob.reportMarkdown && (
                                <>
                                    <button
                                        onClick={async () => { setExportLoading('md'); await exportMarkdown(activeJob.id); setExportLoading(null); }}
                                        disabled={exportLoading !== null}
                                        title="Export Markdown"
                                        className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-dark-200 rounded-md transition-colors text-xs font-medium disabled:opacity-50"
                                    >
                                        {exportLoading === 'md' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                        onClick={async () => { setExportLoading('pdf'); await exportPDF(activeJob.id); setExportLoading(null); }}
                                        disabled={exportLoading !== null}
                                        title="Export PDF"
                                        className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-dark-200 rounded-md transition-colors text-xs font-medium disabled:opacity-50"
                                    >
                                        {exportLoading === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                        onClick={async () => { setExportLoading('tex'); await exportLatex(activeJob.id); setExportLoading(null); }}
                                        disabled={exportLoading !== null}
                                        title="Export LaTeX"
                                        className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-dark-200 rounded-md transition-colors text-xs font-medium disabled:opacity-50"
                                    >
                                        {exportLoading === 'tex' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCode className="w-3.5 h-3.5" />}
                                    </button>
                                    <div className="w-px h-5 bg-zinc-200 dark:bg-dark-300 mx-1" />
                                </>
                            )}
                            <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-dark-200 rounded-md transition-colors">
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-dark-primary">
                        {activeTab === 'report' && (
                            <div className="max-w-none animate-in fade-in duration-300">
                                {activeJob.reportMarkdown ? (
                                    <MarkdownRenderer content={activeJob.reportMarkdown} />
                                ) : activeJob.status === JobStatus.FAILED ? (
                                    <EmptyState icon={FileText} message="Report generation failed" subMessage="Check logs for details or try starting a new research." />
                                ) : activeJob.status === JobStatus.COMPLETED ? (
                                    <EmptyState icon={FileText} message="No report available" subMessage="The research completed but no report was generated." />
                                ) : (
                                    <EmptyState icon={FileText} message="Generating report..." subMessage="This usually takes 2-3 minutes based on depth." />
                                )}
                            </div>
                        )}

                        {activeTab === 'sources' && (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                {dataSources.length > 0 ? (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                                {dataSources.length} Sources Gathered
                                            </h3>
                                            <button
                                                onClick={() => setSourcesModalOpen(true)}
                                                className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                View All
                                            </button>
                                        </div>
                                        <DataSourcesPanel sources={dataSources} isProcessing={isProcessing} />
                                    </>
                                ) : (
                                    <EmptyState icon={Globe} message="No sources yet" subMessage="Data sources will appear here as research progresses." />
                                )}
                            </div>
                        )}

                        {activeTab === 'diagrams' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                {activeJob.diagrams && activeJob.diagrams.length > 0 ? (
                                    activeJob.diagrams.map((chart, i) => (
                                        <div key={i} className="space-y-2">
                                            <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Figure {i + 1}</h4>
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
                                        <div key={i} className="group relative bg-zinc-100 dark:bg-dark-200 rounded-lg overflow-hidden border border-zinc-200 dark:border-dark-300 shadow-sm">
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
        <div className="w-12 h-12 bg-zinc-50 dark:bg-dark-200 rounded-full flex items-center justify-center mb-4 border border-zinc-100 dark:border-dark-300">
            <Icon className="w-5 h-5 text-zinc-400" />
        </div>
        <h3 className="text-zinc-900 dark:text-zinc-100 font-medium mb-1">{message}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{subMessage}</p>
    </div>
);
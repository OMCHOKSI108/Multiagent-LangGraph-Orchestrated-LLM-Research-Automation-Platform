import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useResearchStore } from '../store';
import { JobStatus } from '../types';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { ActivityLog } from '../components/ActivityLog';
import { ResearchTimeline } from '../components/ResearchTimeline';
import { DataSourcesPanel } from '../components/DataSourcesPanel';
import { ExecutionTimer } from '../components/ExecutionTimer';
import { EditableTitle } from '../components/EditableTitle';
import { MessageActions } from '../components/MessageActions';
import { MessageBoxLoading } from '../components/MessageBoxLoading';
import { LatexEditor } from '../components/LatexEditor';
import { SourcesModal } from '../components/SourcesModal';
import { ExportDropdown } from '../components/ExportDropdown';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
    Send,
    FileText,
    Image as ImageIcon,
    Share,
    Download,
    FileCode,
    Globe,
    Bot,
    MoreHorizontal,
    PanelRightClose,
    PanelRightOpen,
    Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import mermaid from 'mermaid';

// Initialize Mermaid
mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose', fontFamily: 'Inter' });

const MermaidChart = ({ chart }: { chart: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (ref.current) {
            mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart)
                .then(res => {
                    if (ref.current) ref.current.innerHTML = res.svg;
                })
                .catch(() => setError(true));
        }
    }, [chart]);

    if (error) return <pre className="text-xs text-destructive p-2 overflow-auto">{chart}</pre>;
    return <div ref={ref} className="bg-muted/30 border p-4 rounded-lg flex justify-center overflow-x-auto my-4" />;
};

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

    const [activeTab, setActiveTab] = useState<'report' | 'code' | 'visuals'>('report');
    const [input, setInput] = useState('');
    const [rightPanelOpen, setRightPanelOpen] = useState(true);
    const [sourcesModalOpen, setSourcesModalOpen] = useState(false);
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
            <div className="h-full flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        <div className="flex h-full w-full overflow-hidden bg-background">
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

            {/* MAIN CONTENT AREA (Left/Center) */}
            <div className="flex-1 flex flex-col min-w-0 border-r bg-background">
                {/* Header */}
                <div className="h-14 border-b flex items-center justify-between px-6 shrink-0 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <EditableTitle
                            title={activeJob.topic}
                            onSave={(newTitle) => renameResearch(activeJob.id, newTitle)}
                            className="text-lg font-semibold tracking-tight"
                        />
                        <Badge variant={isProcessing ? "secondary" : "outline"} className="font-mono text-[10px] uppercase tracking-wider">
                            {activeJob.status}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <ExecutionTimer
                            startedAt={startedAt}
                            completedAt={completedAt}
                            isProcessing={isProcessing}
                        />
                        <ExportDropdown researchId={activeJob.id} onExport={() => { }} />
                        <Button variant="ghost" size="icon" onClick={() => setRightPanelOpen(!rightPanelOpen)}>
                            {rightPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    <div className="max-w-4xl mx-auto space-y-8 pb-32">

                        {/* Chat / Interaction Feed */}
                        <div className="space-y-6">
                            {chatHistory.map((msg) => {
                                const isStreamingMsg = msg.role === 'assistant' && msg.content === '' && isProcessing;
                                return (
                                    <div key={msg.id} className={cn("flex gap-4", msg.role === 'user' && "flex-row-reverse")}>
                                        <div className={cn(
                                            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border",
                                            msg.role === 'assistant' ? "bg-primary/10 border-primary/20" : "bg-muted border-transparent"
                                        )}>
                                            {msg.role === 'assistant' ?
                                                <Bot className="h-4 w-4 text-primary" /> :
                                                <span className="text-[10px] font-bold text-muted-foreground">YOU</span>
                                            }
                                        </div>

                                        <div className="max-w-[85%] space-y-2">
                                            <Card className={cn("shadow-sm", msg.role === 'user' && "bg-muted/50 border-none")}>
                                                <CardContent className="p-4 prose prose-sm dark:prose-invert max-w-none">
                                                    {isStreamingMsg ? (
                                                        <MessageBoxLoading />
                                                    ) : msg.role === 'assistant' ? (
                                                        <MarkdownRenderer content={msg.content || '...'} />
                                                    ) : (
                                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                                    )}
                                                </CardContent>
                                            </Card>

                                            {msg.role === 'assistant' && !isStreamingMsg && msg.content && (
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                </div>

                {/* Input Area */}
                <div className="p-4 border-t bg-background/80 backdrop-blur">
                    <div className="max-w-4xl mx-auto relative">
                        <form onSubmit={handleSend} className="relative">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={isProcessing ? "Agent is working..." : "Ask a follow-up question..."}
                                disabled={isProcessing}
                                className="pr-12 py-6 text-base shadow-sm"
                            />
                            <Button
                                type="submit"
                                size="icon"
                                className="absolute right-1.5 top-1.5 h-9 w-9"
                                disabled={!input.trim() || isProcessing}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL (Context/Tabs) */}
            {rightPanelOpen && (
                <div className="w-[400px] border-l bg-muted/10 flex flex-col shrink-0 transition-all duration-300">
                    <div className="h-14 border-b flex items-center px-4 bg-background">
                        <div className="flex p-1 bg-muted rounded-lg w-full">
                            {[
                                { id: 'report', label: 'Report', icon: FileText },
                                { id: 'visuals', label: 'Visuals', icon: ImageIcon },
                                { id: 'code', label: 'Latex', icon: FileCode },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all",
                                        activeTab === tab.id
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                    )}
                                >
                                    <tab.icon className="h-3.5 w-3.5" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {activeTab === 'report' && (
                            <>
                                {activeJob.reportMarkdown ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <MarkdownRenderer content={activeJob.reportMarkdown} />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                                        <FileText className="h-12 w-12 mb-4 opacity-20" />
                                        <p>No report generated yet.</p>
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === 'visuals' && (
                            <div className="space-y-4">
                                {activeJob.images?.map((img, i) => (
                                    <Card key={i} className="overflow-hidden">
                                        <img src={img} alt={`Visual ${i}`} className="w-full h-auto object-cover" />
                                    </Card>
                                ))}
                                {activeJob.diagrams?.map((diag, i) => (
                                    <Card key={i} className="p-2 overflow-hidden bg-white">
                                        <MermaidChart chart={diag} />
                                    </Card>
                                ))}
                                {!activeJob.images?.length && !activeJob.diagrams?.length && (
                                    <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                                        <ImageIcon className="h-12 w-12 mb-4 opacity-20" />
                                        <p>No visuals generated yet.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'code' && (
                            <LatexEditor
                                latex={activeJob.latexSource || (activeJob.reportMarkdown ? `\\documentclass{article}\n\\title{${activeJob.topic}}\n\\begin{document}\n\n${activeJob.reportMarkdown}\n\n\\end{document}` : '')}
                            />
                        )}
                    </div>

                    {/* Bottom Section: Activity & Sources */}
                    <div className="border-t bg-background h-1/3 min-h-[250px] flex flex-col">
                        <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Context</h3>
                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSourcesModalOpen(true)}>
                                View All Sources ({dataSources.length})
                            </Button>
                        </div>
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {/* Tabs for bottom panel could go here, for now split or just Activity */}
                            <ActivityLog events={executionEvents} className="flex-1" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
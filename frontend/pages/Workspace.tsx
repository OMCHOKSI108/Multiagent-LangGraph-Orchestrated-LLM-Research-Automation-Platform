import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { useResearchStore } from '../store';
import { JobStatus } from '../types';
import { Loader2, PanelLeftClose, PanelLeftOpen, Download, Share } from 'lucide-react';
import { Button } from '../components/ui/button';
import { EditableTitle } from '../components/EditableTitle';
import { ExportDropdown } from '../components/ExportDropdown';
import { toast } from 'sonner';
import { api } from '../services/api';

// Enterprise Components
import { ChatInterface } from '../components/ChatInterface';
import { PipelineTimeline } from '../components/PipelineTimeline';
import { DataExplorer } from '../components/DataExplorer';
import { DocumentPreview } from '../components/DocumentPreview';
import { ResizeHandle } from '../components/ResizeHandle';
import { LiveFeed } from '../components/LiveFeed';

export const Workspace = () => {
    const { id } = useParams();
    const {
        activeJob,
        setActiveJob,
        stopPolling,
        subscribeToLiveEvents,
        unsubscribeLiveEvents,
        renameResearch,
        executionEvents,
        dataSources,
        currentStage
    } = useResearchStore(useShallow(state => ({
        activeJob: state.activeJob,
        setActiveJob: state.setActiveJob,
        stopPolling: state.stopPolling,
        subscribeToLiveEvents: state.subscribeToLiveEvents,
        unsubscribeLiveEvents: state.unsubscribeLiveEvents,
        renameResearch: state.renameResearch,
        executionEvents: state.executionEvents,
        dataSources: state.dataSources,
        currentStage: state.currentStage
    })));

    const [sidebarOpen, setSidebarOpen] = React.useState(true);
    const [liveFeedOpen, setLiveFeedOpen] = React.useState(true);
    const [sidebarWidth, setSidebarWidth] = React.useState(() => {
        const saved = localStorage.getItem('workspace-sidebar-width');
        return saved ? parseInt(saved, 10) : 350;
    });
    const [liveFeedWidth, setLiveFeedWidth] = React.useState(() => {
        const saved = localStorage.getItem('workspace-livefeed-width');
        return saved ? parseInt(saved, 10) : 320;
    });
    const [splitRatio, setSplitRatio] = React.useState(() => {
        const saved = localStorage.getItem('workspace-split-ratio');
        return saved ? parseFloat(saved) : 0.5;
    });

    // Persist sizes to localStorage
    React.useEffect(() => {
        localStorage.setItem('workspace-sidebar-width', sidebarWidth.toString());
    }, [sidebarWidth]);

    React.useEffect(() => {
        localStorage.setItem('workspace-livefeed-width', liveFeedWidth.toString());
    }, [liveFeedWidth]);

    React.useEffect(() => {
        localStorage.setItem('workspace-split-ratio', splitRatio.toString());
    }, [splitRatio]);

    const handleSidebarResize = React.useCallback((delta: number) => {
        setSidebarWidth(prev => Math.min(Math.max(prev + delta, 280), 600));
    }, []);

    const handleLiveFeedResize = React.useCallback((delta: number) => {
        setLiveFeedWidth(prev => Math.min(Math.max(prev - delta, 280), 500));
    }, []);

    const handleSplitResize = React.useCallback((delta: number) => {
        setSplitRatio(prev => Math.min(Math.max(prev + (delta / window.innerHeight), 0.2), 0.8));
    }, []);

    const handleShare = React.useCallback(async () => {
        if (!activeJob) return;
        
        try {
            const { shareUrl } = await api.shareResearch(activeJob.id);
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Share link copied to clipboard!', {
                description: 'Anyone with this link can view your research.'
            });
        } catch (error) {
            console.error('Failed to share research:', error);
            toast.error('Failed to create share link');
        }
    }, [activeJob]);

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

    if (!activeJob) {
        return (
            <div className="h-full flex items-center justify-center bg-zinc-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                    <p className="text-zinc-500 text-sm">Loading workspace...</p>
                </div>
            </div>
        );
    }

    const isProcessing = activeJob.status === JobStatus.PROCESSING || activeJob.status === JobStatus.QUEUED;
    const hasSources = (dataSources || []).length > 0;
    const hasReport = Boolean(activeJob.reportMarkdown || activeJob.latexSource);
    const hasEvents = executionEvents.length > 0;

    const systemStatus = (() => {
        if (!hasEvents && !hasSources && !hasReport) return 'Waiting for topic';
        if (isProcessing && (currentStage === 'searching' || currentStage === 'scraping')) return 'Data gathering in progress';
        if (isProcessing) return 'Agents running';
        if (!hasReport) return 'Writing phase not started';
        return 'Agents running';
    })();

    const statusDetail = (() => {
        switch (systemStatus) {
            case 'Waiting for topic':
                return 'Submit a topic in the chat using /research <topic> to start.';
            case 'Data gathering in progress':
                return 'Sources are being collected and validated.';
            case 'Agents running':
                return 'Analysis agents are executing and updating the workspace.';
            case 'Writing phase not started':
                return 'Sources are ready; report generation has not begun yet.';
            default:
                return 'Processing…';
        }
    })();

    return (
        <div className="flex h-full w-full overflow-hidden bg-background text-foreground font-sans">

            {/* LEFT SIDEBAR: Chat & Commands */}
            <div
                className="shrink-0 border-r border-border transition-all duration-300 ease-in-out flex"
                style={{ 
                    width: sidebarOpen ? `${sidebarWidth}px` : '0px',
                    overflow: sidebarOpen ? 'visible' : 'hidden'
                }}
            >
                <div className="flex-1">
                    <ChatInterface />
                </div>
                {sidebarOpen && (
                    <ResizeHandle 
                        direction="horizontal" 
                        onResize={handleSidebarResize}
                        className="border-l border-border/50"
                    />
                )}
            </div>

            {/* MAIN WORKSPACE */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">

                {/* 1. Header & Timeline */}
                <div className="shrink-0 flex flex-col border-b border-border">
                    {/* Top Bar */}
                    <div className="h-14 flex items-center justify-between px-4 bg-white">
                        <div className="flex items-center gap-3">
                            <Link to="/" className="flex items-center justify-center h-8 w-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                            </Link>
                            <div className="h-6 w-px bg-zinc-200" />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-zinc-500"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                            >
                                {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                            </Button>

                            <div className="h-6 w-px bg-zinc-200 mx-1" />

                            <EditableTitle
                                title={activeJob.topic}
                                onSave={(newTitle) => renameResearch(activeJob.id, newTitle)}
                                className="text-sm font-semibold text-zinc-800"
                            />

                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${isProcessing ? 'bg-blue-50 text-blue-700' : 'bg-zinc-100 text-zinc-600'
                                }`}>
                                {activeJob.status}
                            </span>

                            <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-zinc-50 text-zinc-700 border border-zinc-200">
                                System: {systemStatus}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-zinc-500"
                                onClick={() => setLiveFeedOpen(!liveFeedOpen)}
                                title="Toggle Live Feed"
                            >
                                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                            </Button>
                            <ExportDropdown researchId={activeJob.id} onExport={() => { }} />
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 gap-2 text-xs"
                                onClick={handleShare}
                            >
                                <Share className="w-3.5 h-3.5" />
                                Share
                            </Button>
                        </div>
                    </div>

                    {/* Timeline */}
                    <PipelineTimeline
                        events={executionEvents}
                        isActive={isProcessing}
                        currentStage={currentStage}
                        jobStatus={activeJob.status}
                    />
                </div>

                {/* 2. Content Area (Split View with Live Feed) */}
                <div className="flex-1 flex min-h-0">

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-h-0">

                        {/* Middle: Data Explorer (Resizable) */}
                        <div 
                            className="border-b border-border bg-slate-50/50 dark:bg-card/30"
                            style={{ height: `${splitRatio * 100}%` }}
                        >
                            <DataExplorer
                                sources={dataSources as any} // Type cast to avoid strict check issues for now
                                systemStatus={systemStatus}
                                statusDetail={statusDetail}
                                visuals={[
                                    ...(activeJob.images || []).map(url => ({ type: 'image' as const, url })),
                                    ...(activeJob.diagrams || []).map(content => ({ type: 'diagram' as const, content }))
                                ]}
                            />
                        </div>

                        {/* Horizontal Resize Handle */}
                        <ResizeHandle 
                            direction="vertical" 
                            onResize={handleSplitResize}
                            className="border-t border-border/50 bg-background"
                        />

                        {/* Bottom: Document Preview */}
                        <div 
                            className="bg-white dark:bg-card"
                            style={{ height: `${(1 - splitRatio) * 100}%` }}
                        >
                            <DocumentPreview
                                markdown={activeJob.reportMarkdown}
                                latexSource={activeJob.latexSource}
                                systemStatus={systemStatus}
                                statusDetail={statusDetail}
                            />
                        </div>
                    </div>

                    {/* Right Panel: Live Feed */}
                    {liveFeedOpen && (
                        <>
                            <ResizeHandle 
                                direction="horizontal" 
                                onResize={handleLiveFeedResize}
                                className="border-r border-border/50"
                            />
                            <div
                                className="shrink-0"
                                style={{ width: `${liveFeedWidth}px` }}
                            >
                                <LiveFeed />
                            </div>
                        </>
                    )}

                </div>

            </div>
        </div>
    );
};

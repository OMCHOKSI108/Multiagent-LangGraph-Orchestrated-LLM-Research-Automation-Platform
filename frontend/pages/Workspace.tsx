import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { useResearchStore } from '../store';
import { JobStatus } from '../types';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Share } from 'lucide-react';
import { Button } from '../components/ui/button';
import { EditableTitle } from '../components/EditableTitle';
import { ExportDropdown } from '../components/ExportDropdown';
import { toast } from 'sonner';
import { api } from '../services/api';
import { Group, Panel, PanelImperativeHandle, Separator } from 'react-resizable-panels';

// Enterprise Components
import { ChatInterface } from '../components/ChatInterface';
import { DocumentPreview } from '../components/DocumentPreview';
import { LiveFeed } from '../components/LiveFeed';
import { ResearchStatusBanner } from '../components/ResearchStatusBanner';
import { ResourceTabs } from '../components/ResourceTabs';
import { Skeleton, PanelSkeleton } from '../components/ui/skeleton';

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
        currentStage,
        startedAt,
        completedAt
    } = useResearchStore(useShallow(state => ({
        activeJob: state.activeJob,
        setActiveJob: state.setActiveJob,
        stopPolling: state.stopPolling,
        subscribeToLiveEvents: state.subscribeToLiveEvents,
        unsubscribeLiveEvents: state.unsubscribeLiveEvents,
        renameResearch: state.renameResearch,
        executionEvents: state.executionEvents,
        dataSources: state.dataSources,
        currentStage: state.currentStage,
        startedAt: state.startedAt,
        completedAt: state.completedAt
    })));

    const [activeRightTab, setActiveRightTab] = React.useState<'paper' | 'resources' | 'live'>('paper');

    // Panel Refs for programmatic control
    const sidebarRef = useRef<PanelImperativeHandle>(null);
    const rightPanelRef = useRef<PanelImperativeHandle>(null);

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);

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

    const handleExport = React.useCallback(async (format: 'markdown' | 'pdf' | 'latex' | 'zip' | 'plots') => {
        if (!activeJob) return;
        try {
            if (format === 'markdown') await api.exportMarkdown(activeJob.id);
            if (format === 'pdf') await api.exportPDF(activeJob.id);
            if (format === 'latex') await api.exportLatex(activeJob.id);
            if (format === 'zip') await api.exportZip(activeJob.id);
            if (format === 'plots') await api.exportPlots(activeJob.id);
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Export failed. Please try again.');
        }
    }, [activeJob]);

    useEffect(() => {
        let cancelled = false;

        const initializeWorkspace = async () => {
            if (!id) return;
            await setActiveJob(id);
            if (!cancelled) {
                subscribeToLiveEvents(id);
            }
        };

        initializeWorkspace();

        return () => {
            cancelled = true;
            stopPolling();
            unsubscribeLiveEvents();
        };
    }, [id, setActiveJob, stopPolling, subscribeToLiveEvents, unsubscribeLiveEvents]);

    // Default to 'live' if processing, 'paper' if finished.
    useEffect(() => {
        if (!activeJob) return;
        if (activeJob.status === JobStatus.COMPLETED) setActiveRightTab('paper');
        else if (activeJob.status === JobStatus.PROCESSING || activeJob.status === JobStatus.QUEUED) {
            setActiveRightTab('live');
        }

        // Auto-expand right panel if it was collapsed and a job starts/completes important phase
        if ((activeJob.status === JobStatus.PROCESSING || activeJob.status === JobStatus.QUEUED) && isRightPanelCollapsed) {
            rightPanelRef.current?.expand();
        }
    }, [activeJob?.status]);

    if (!activeJob) {
        return (
            <div className="h-full flex bg-background w-full">
                {/* Skeleton Loading State matching the 3-pane layout */}
                <div className="w-[300px] border-r border-border p-4 space-y-4 shrink-0 hidden md:block">
                    <PanelSkeleton lines={6} />
                </div>
                <div className="flex-1 p-6 space-y-4 border-r border-border">
                    <div className="flex items-center gap-3 mb-6">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-8 w-24 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                </div>
                <div className="w-[400px] p-4 shrink-0 hidden lg:block">
                    <PanelSkeleton lines={5} />
                </div>
            </div>
        );
    }

    const toggleSidebar = () => {
        const panel = sidebarRef.current;
        if (panel) {
            if (isSidebarCollapsed) panel.expand();
            else panel.collapse();
        }
    };

    const toggleRightPanel = () => {
        const panel = rightPanelRef.current;
        if (panel) {
            if (isRightPanelCollapsed) panel.expand();
            else panel.collapse();
        }
    };

    const isProcessing = activeJob.status === JobStatus.PROCESSING;
    const systemStatus = isProcessing ? "Agents running" : "Research Completed";
    const statusDetail = isProcessing ? "Processing..." : "Report generated successfully.";

    return (
        <div className="fixed inset-0 h-screen w-screen bg-background text-foreground font-sans overflow-hidden flex flex-col">
            <Group orientation="horizontal" className="h-full w-full">

                {/* 1. LEFT SIDEBAR: Navigation & History (10% default) */}
                <Panel
                    panelRef={sidebarRef}
                    defaultSize={15}
                    minSize={10}
                    maxSize={25}
                    collapsible
                    collapsedSize={0}
                    onResize={(panelSize: any) => setIsSidebarCollapsed(panelSize <= 5)}
                />

                <Separator className="w-1 bg-border/40 hover:bg-primary/50 transition-colors flex items-center justify-center group focus:outline-none">
                    <div className="h-8 w-1 rounded-full bg-border group-hover:bg-primary transition-colors" />
                </Separator>

                {/* MAIN CONTENT AREA (Chat + Right Panel) */}
                <Panel minSize={30}>
                    <Group orientation="horizontal">

                        {/* 2. CENTER PANEL: Chat Interface */}
                        <Panel defaultSize={50} minSize={20} className="flex flex-col bg-background relative z-0">
                            {/* Center Header */}
                            <div className="h-14 shrink-0 border-b border-border flex items-center justify-between px-4 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                                <div className="flex items-center gap-3 w-full min-w-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground mr-1"
                                        onClick={toggleSidebar}
                                        title={isSidebarCollapsed ? "Open Sidebar" : "Close Sidebar"}
                                    >
                                        {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                                    </Button>
                                    <EditableTitle
                                        title={activeJob.topic}
                                        onSave={(newTitle) => renameResearch(activeJob.id, newTitle)}
                                        className="text-sm font-medium text-foreground truncate flex-1 min-w-0"
                                    />
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap hidden sm:inline-block ${isProcessing
                                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                        : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                        }`}>
                                        {activeJob.status}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <div className="h-4 w-px bg-border mx-2" />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground"
                                        onClick={toggleRightPanel}
                                        title={isRightPanelCollapsed ? "Open Research Panel" : "Close Research Panel"}
                                    >
                                        {isRightPanelCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
                                    </Button>
                                    <ExportDropdown researchId={activeJob.id} onExport={handleExport} />
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleShare} title="Share">
                                        <Share className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                </div>
                            </div>

                            {/* Chat Container */}
                            <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
                                <div className="flex-1 w-full h-full flex flex-col min-h-0">
                                    <ChatInterface />
                                </div>
                            </div>
                        </Panel>

                        <Separator className="w-1 bg-border/40 hover:bg-primary/50 transition-colors flex items-center justify-center group focus:outline-none">
                            <div className="h-8 w-1 rounded-full bg-border group-hover:bg-primary transition-colors" />
                        </Separator>

                        {/* 3. RIGHT PANEL: Research Output */}
                        <Panel
                            panelRef={rightPanelRef}
                            defaultSize={40}
                            minSize={20}
                            collapsible
                            collapsedSize={0}
                            onResize={(panelSize: any) => setIsRightPanelCollapsed(panelSize <= 5)}
                            className={isRightPanelCollapsed ? "" : "border-l border-border bg-card"}
                        >
                            <div className="flex flex-col h-full overflow-hidden">
                                {/* Research Status Banner */}
                                <ResearchStatusBanner
                                    status={activeJob.status as JobStatus}
                                    currentStage={currentStage}
                                    topic={activeJob.topic}
                                    startedAt={startedAt}
                                    completedAt={completedAt}
                                />

                                {/* Main Tabs: Paper / Resources / Live */}
                                <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm">
                                    <div className="flex items-center p-1 gap-0.5">
                                        {[
                                            { key: 'paper', label: 'Paper' },
                                            { key: 'resources', label: 'Resources' },
                                            { key: 'live', label: 'Live Feed', pulse: isProcessing },
                                        ].map((tab) => (
                                            <button
                                                key={tab.key}
                                                onClick={() => setActiveRightTab(tab.key as any)}
                                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium rounded-md transition-all ${activeRightTab === tab.key
                                                    ? 'bg-background text-foreground shadow-sm border border-border/50'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                                    }`}
                                            >
                                                {tab.label}
                                                {tab.pulse && <span className="ml-1 h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Tab Content */}
                                <div className="flex-1 overflow-hidden relative bg-card/30">
                                    {activeRightTab === 'paper' && (
                                        <DocumentPreview
                                            markdown={activeJob.reportMarkdown}
                                            latexSource={activeJob.latexSource}
                                            systemStatus={systemStatus}
                                            statusDetail={statusDetail}
                                            sources={dataSources || []}
                                            researchId={activeJob.id}
                                            images={activeJob.images || []}
                                            diagrams={activeJob.diagrams || []}
                                        />
                                    )}

                                    {activeRightTab === 'resources' && (
                                        <ResourceTabs
                                            images={activeJob.images || []}
                                            diagrams={activeJob.diagrams || []}
                                        />
                                    )}

                                    {activeRightTab === 'live' && (
                                        <LiveFeed className="border-none h-full" />
                                    )}
                                </div>
                            </div>
                        </Panel>
                    </Group>
                </Panel>
            </Group>
        </div >
    );
};

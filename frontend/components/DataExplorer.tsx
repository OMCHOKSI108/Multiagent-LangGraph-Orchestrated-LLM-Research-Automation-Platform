import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { Card } from './ui/card';
import { Button } from './ui/button';

interface DataSource {
    source_type: string;
    domain: string;
    url?: string;
    status: 'success' | 'partial' | 'failed' | 'pending';
    title?: string;
    items_found: number;
}

interface VisualAsset {
    type: 'image' | 'chart' | 'diagram';
    url?: string;
    content?: string; // for mermaid
    caption?: string;
}

interface DataExplorerProps {
    sources: DataSource[];
    visuals: VisualAsset[];
    systemStatus: string;
    statusDetail: string;
    className?: string;
    activeTab?: 'web' | 'lit' | 'data' | 'visuals';
}

export const DataExplorer: React.FC<DataExplorerProps> = ({
    sources = [],
    visuals = [],
    systemStatus,
    statusDetail,
    className,
    activeTab = 'web'
}) => {

    // Filter sources logic
    const webSources = sources.filter(s => ['web', 'google', 'monitor', 'news'].includes(s.source_type));
    const litSources = sources.filter(s => ['arxiv', 'pubmed', 'openalex', 'scholar'].includes(s.source_type));
    const dataSourcesList = sources.filter(s => ['dataset', 'kaggle', 'github'].includes(s.source_type));

    const renderEmptyState = (title: string, reason: string) => (
        <div className="col-span-2 py-12 text-center text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl bg-background">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
            <div className="text-sm text-muted-foreground">{reason}</div>
        </div>
    );

    const renderSourceTable = (data: DataSource[], emptyReason: string) => (
        <div className="border border-border rounded-xl overflow-hidden bg-background shadow-sm">
            <table className="w-full text-sm text-left">
                <thead className="bg-card border-b border-border text-muted-foreground font-medium">
                    <tr>
                        <th className="px-4 py-3 w-1/3">Source</th>
                        <th className="px-4 py-3">Details</th>
                        <th className="px-4 py-3 w-24">Status</th>
                        <th className="px-4 py-3 w-24 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/80">
                    {data.map((item, i) => (
                        <tr key={i} className="hover:bg-accent/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground truncate max-w-[200px]" title={item.domain}>
                                {item.domain}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                                {item.items_found} items found across {item.source_type}
                            </td>
                            <td className="px-4 py-3">
                                <span className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                                    item.status === 'success' && "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
                                    item.status === 'failed' && "bg-red-500/15 text-red-300 border border-red-500/30",
                                    item.status === 'pending' && "bg-secondary text-secondary-foreground border border-border",
                                    item.status === 'partial' && "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                )}>
                                    {item.status}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                                {item.url && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(item.url, '_blank')}>
                                        <ExternalLink className="h-3 w-3" />
                                    </Button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">No Data Found</div>
                                <div className="text-sm text-muted-foreground">{emptyReason}</div>
                                <div className="text-[11px] text-muted-foreground mt-2 opacity-50">Ensure agents have completed the 'Scraping' phase.</div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className={cn("flex flex-col h-full bg-card border-r border-border", className)}>
            {/* Toolbar removed - controlled by parent */}

            {/* Content Content */}
            <div className="flex-1 p-4 overflow-y-auto">
                {activeTab === 'web' && renderSourceTable(
                    webSources,
                    systemStatus === 'Waiting for topic'
                        ? 'Web resources will appear after you confirm a topic in the chat.'
                        : systemStatus === 'Data gathering in progress'
                            ? 'Web resources are being collected from search providers.'
                            : 'Web resources will populate once sources are discovered.'
                )}
                {activeTab === 'lit' && renderSourceTable(
                    litSources,
                    systemStatus === 'Waiting for topic'
                        ? 'Literature sources will appear after topic discovery begins.'
                        : systemStatus === 'Data gathering in progress'
                            ? 'Literature sources are being fetched from academic indexes.'
                            : 'Literature sources will populate once papers are found.'
                )}
                {activeTab === 'data' && renderSourceTable(
                    dataSourcesList,
                    systemStatus === 'Waiting for topic'
                        ? 'Datasets will appear after the research topic is set.'
                        : systemStatus === 'Data gathering in progress'
                            ? 'Datasets are being discovered and validated.'
                            : 'Datasets will populate once data sources are identified.'
                )}

                {activeTab === 'visuals' && (
                    <div className="grid grid-cols-2 gap-4">
                        {visuals.map((v, i) => (
                            <Card key={i} className="p-2 bg-background border-border flex flex-col gap-2">
                                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                                    {v.type === 'image' && <img src={v.url} className="object-cover w-full h-full" />}
                                    {v.type !== 'image' && <div className="text-xs text-muted-foreground font-mono">{v.content?.slice(0, 50)}...</div>}
                                </div>
                                <div className="px-1 pb-1">
                                    <div className="text-xs font-medium text-foreground">Figure {i + 1}</div>
                                    <div className="text-[10px] text-muted-foreground truncate">{v.caption || 'Generated Visual'}</div>
                                </div>
                            </Card>
                        ))}
                        {visuals.length === 0 && (
                            renderEmptyState(
                                "Figures",
                                systemStatus === 'Waiting for topic'
                                    ? 'Figures will generate after a topic is selected.'
                                    : systemStatus === 'Data gathering in progress'
                                        ? 'Figures are generated after sources are collected.'
                                        : 'Figures will appear once the visualization agent runs.'
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

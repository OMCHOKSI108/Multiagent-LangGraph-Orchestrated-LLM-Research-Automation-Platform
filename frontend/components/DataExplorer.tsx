import React, { useState } from 'react';
import { Globe, FileText, Database, Image as ImageIcon, Download, ExternalLink, Check, AlertCircle } from 'lucide-react';
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
}

const TABS = [
    { id: 'web', label: 'Web Resources', icon: Globe },
    { id: 'lit', label: 'Literature', icon: FileText },
    { id: 'data', label: 'Datasets', icon: Database },
    { id: 'visuals', label: 'Figures', icon: ImageIcon },
];

export const DataExplorer: React.FC<DataExplorerProps> = ({ sources = [], visuals = [], systemStatus, statusDetail, className }) => {
    const [activeTab, setActiveTab] = useState('web');

    // Filter sources logic
    const webSources = sources.filter(s => ['web', 'google', 'monitor', 'news'].includes(s.source_type));
    const litSources = sources.filter(s => ['arxiv', 'pubmed', 'openalex', 'scholar'].includes(s.source_type));
    const dataSourcesList = sources.filter(s => ['dataset', 'kaggle', 'github'].includes(s.source_type));

    const renderEmptyState = (title: string, reason: string) => (
        <div className="col-span-2 py-12 text-center text-zinc-400 text-sm border-2 border-dashed border-zinc-200 rounded-lg bg-white">
            <div className="text-xs uppercase tracking-wider text-zinc-400 mb-2">{title}</div>
            <div className="text-sm text-zinc-600">{reason}</div>
        </div>
    );

    const renderSourceTable = (data: DataSource[], emptyReason: string) => (
        <div className="border rounded-lg overflow-hidden bg-white">
            <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-medium">
                    <tr>
                        <th className="px-4 py-3 w-1/3">Source</th>
                        <th className="px-4 py-3">Details</th>
                        <th className="px-4 py-3 w-24">Status</th>
                        <th className="px-4 py-3 w-24 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                    {data.map((item, i) => (
                        <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-zinc-900 truncate max-w-[200px]" title={item.domain}>
                                {item.domain}
                            </td>
                            <td className="px-4 py-3 text-zinc-500">
                                {item.items_found} items found across {item.source_type}
                            </td>
                            <td className="px-4 py-3">
                                <span className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                                    item.status === 'success' && "bg-emerald-100 text-emerald-800",
                                    item.status === 'failed' && "bg-red-100 text-red-800",
                                    item.status === 'pending' && "bg-zinc-100 text-zinc-800"
                                )}>
                                    {item.status}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <ExternalLink className="h-3 w-3" />
                                </Button>
                            </td>
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
                                <div className="text-xs uppercase tracking-wider text-zinc-400 mb-2">Empty</div>
                                <div className="text-sm text-zinc-600">{emptyReason}</div>
                                <div className="text-[11px] text-zinc-400 mt-2">{statusDetail}</div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className={cn("flex flex-col h-full bg-slate-50 border-r border-border", className)}>
            {/* Toolbar */}
            <div className="px-4 py-2 border-b bg-white flex items-center gap-1 overflow-x-auto no-scrollbar">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                            activeTab === tab.id
                                ? "bg-zinc-100 text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                        )}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

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
                            <Card key={i} className="p-2 bg-white flex flex-col gap-2">
                                <div className="aspect-video bg-zinc-100 rounded flex items-center justify-center overflow-hidden">
                                    {v.type === 'image' && <img src={v.url} className="object-cover w-full h-full" />}
                                    {v.type !== 'image' && <div className="text-xs text-zinc-400 font-mono">{v.content?.slice(0, 50)}...</div>}
                                </div>
                                <div className="px-1 pb-1">
                                    <div className="text-xs font-medium text-zinc-900">Figure {i + 1}</div>
                                    <div className="text-[10px] text-zinc-500 truncate">{v.caption || 'Generated Visual'}</div>
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

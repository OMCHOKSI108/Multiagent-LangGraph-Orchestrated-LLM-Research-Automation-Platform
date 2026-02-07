import React from 'react';
import { Globe, FileText, Database, Check, X, Loader2 } from 'lucide-react';

interface DataSource {
    source_type: string;
    domain: string;
    status: 'success' | 'partial' | 'failed' | 'pending';
    items_found: number;
}

interface DataSourcesPanelProps {
    sources: DataSource[];
    isProcessing: boolean;
}

const sourceIcons: Record<string, React.FC<{ className?: string }>> = {
    arxiv: Globe,
    web: Globe,
    pdf: FileText,
    pubmed: Database,
    openalex: Database,
    wikipedia: Globe,
    default: Globe,
};

const statusConfig = {
    success: { icon: Check, color: 'text-green-400' },
    partial: { icon: Loader2, color: 'text-yellow-400' },
    failed: { icon: X, color: 'text-red-400' },
    pending: { icon: Loader2, color: 'text-zinc-400 animate-spin' },
};

export const DataSourcesPanel: React.FC<DataSourcesPanelProps> = ({
    sources,
    isProcessing,
}) => {
    // Group sources by domain
    const groupedSources = sources.reduce((acc, source) => {
        const key = source.domain || source.source_type;
        if (!acc[key]) {
            acc[key] = { ...source, items_found: 0 };
        }
        acc[key].items_found += source.items_found;
        // Keep worst status
        if (source.status === 'failed') acc[key].status = 'failed';
        else if (source.status === 'partial' && acc[key].status !== 'failed') {
            acc[key].status = 'partial';
        }
        return acc;
    }, {} as Record<string, DataSource>);

    const sourceList = Object.values(groupedSources);

    return (
        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-zinc-300">Data Sources</h3>
                {isProcessing && (
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                )}
            </div>

            {sourceList.length === 0 ? (
                <div className="text-zinc-500 text-sm text-center py-4">
                    {isProcessing ? 'Gathering sources...' : 'No sources yet'}
                </div>
            ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {sourceList.map((source, idx) => {
                        const SourceIcon = sourceIcons[source.source_type] || sourceIcons.default;
                        const StatusIcon = statusConfig[source.status]?.icon || Check;
                        const statusColor = statusConfig[source.status]?.color || 'text-zinc-400';

                        return (
                            <div
                                key={idx}
                                className="flex items-center justify-between py-1 px-2 bg-zinc-900/50 rounded"
                            >
                                <div className="flex items-center gap-2">
                                    <SourceIcon className="w-4 h-4 text-zinc-400" />
                                    <span className="text-sm text-zinc-300 truncate max-w-[120px]">
                                        {source.domain}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-500">
                                        ({source.items_found})
                                    </span>
                                    <StatusIcon className={`w-3 h-3 ${statusColor}`} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Summary */}
            {sourceList.length > 0 && (
                <div className="mt-3 pt-2 border-t border-zinc-700 text-xs text-zinc-500">
                    {sourceList.length} sources • {sources.reduce((a, s) => a + s.items_found, 0)} items
                </div>
            )}
        </div>
    );
};

export default DataSourcesPanel;

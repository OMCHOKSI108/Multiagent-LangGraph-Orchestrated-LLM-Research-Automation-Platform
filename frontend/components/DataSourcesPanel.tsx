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

const getFavicon = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

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
        if (source.status === 'failed') acc[key].status = 'failed';
        else if (source.status === 'partial' && acc[key].status !== 'failed') {
            acc[key].status = 'partial';
        }
        return acc;
    }, {} as Record<string, DataSource>);

    const sourceList = Object.values(groupedSources);

    return (
        <div className="bg-white/50 dark:bg-zinc-900/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-500" />
                    Data Sources
                </h3>
                {isProcessing && (
                    <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                )}
            </div>

            {sourceList.length === 0 ? (
                <div className="text-zinc-500 dark:text-zinc-400 text-sm text-center py-8 bg-zinc-50/50 dark:bg-zinc-800/20 rounded-lg border border-zinc-100 dark:border-zinc-800/50 border-dashed flex flex-col items-center gap-2">
                    <Globe className="w-8 h-8 opacity-20" />
                    <span>{isProcessing ? 'Scouring the web...' : 'No sources found yet'}</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                    {sourceList.map((source, idx) => {
                        const StatusIcon = statusConfig[source.status]?.icon || Check;
                        const statusColor = statusConfig[source.status]?.color || 'text-zinc-400';

                        return (
                            <div
                                key={idx}
                                className="group flex items-start gap-3 p-3 bg-white dark:bg-[#161b22] rounded-lg border border-zinc-100 dark:border-zinc-800/50 hover:border-indigo-500/30 transition-all shadow-sm hover:shadow-md"
                            >
                                <div className="w-8 h-8 rounded bg-white p-1 border border-zinc-100 shrink-0 flex items-center justify-center">
                                    <img
                                        src={getFavicon(source.domain)}
                                        alt=""
                                        className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                        }}
                                    />
                                    <Globe className="w-4 h-4 text-zinc-400 hidden" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-200 truncate" title={source.domain}>
                                        {source.domain}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded">
                                            {source.source_type}
                                        </span>
                                        <span className="text-[10px] text-zinc-400">
                                            {source.items_found} items
                                        </span>
                                    </div>
                                </div>

                                <div className={`shrink-0 p-1 rounded-full ${source.status === 'success' ? 'bg-green-500/10' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                                    <StatusIcon className={`w-3.5 h-3.5 ${statusColor}`} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DataSourcesPanel;

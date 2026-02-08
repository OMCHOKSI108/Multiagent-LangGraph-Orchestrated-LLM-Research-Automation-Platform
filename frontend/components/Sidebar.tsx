import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useResearchStore } from '../store';
import { JobStatus } from '../types';
import { Plus, Loader2, Settings, Terminal, X, Trash2 } from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';

interface SidebarProps {
    onClose?: () => void;
}

export const Sidebar = ({ onClose }: SidebarProps) => {
    const navigate = useNavigate();
    const { id: activeId } = useParams();
    const { researches, fetchResearches, deleteResearch, user, loadingList, openSettings } = useResearchStore();

    useEffect(() => {
        fetchResearches();
    }, [fetchResearches]);

    const getStatusIndicator = (status: JobStatus) => {
        switch (status) {
            case JobStatus.COMPLETED: return <div className="w-2 h-2 rounded-full bg-emerald-500" />;
            case JobStatus.PROCESSING: return <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />;
            case JobStatus.FAILED: return <div className="w-2 h-2 rounded-full bg-red-500" />;
            default: return <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-dark-300" />;
        }
    };

    const handleNavigate = (path: string) => {
        navigate(path);
        onClose?.();
    };

    return (
        <div className="w-64 h-full bg-zinc-50 dark:bg-dark-secondary border-r border-zinc-200 dark:border-dark-300 flex flex-col flex-shrink-0">


            {/* Header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-dark-300 bg-zinc-50/50 dark:bg-dark-secondary/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    <div className="w-6 h-6 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-dark-primary rounded flex items-center justify-center">
                        <Terminal className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-display font-bold">DeepResearch</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => handleNavigate('/dashboard')}
                        className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-white dark:hover:bg-dark-200 hover:text-zinc-900 dark:hover:text-zinc-100 hover:shadow-subtle rounded-md transition-all border border-transparent hover:border-zinc-200 dark:hover:border-dark-300"
                        title="New Research"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                    {/* Mobile close button */}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="lg:hidden p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-white dark:hover:bg-dark-200 rounded-md transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                <div className="px-2 py-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">History</div>

                {loadingList && (
                    <div className="flex items-center justify-center py-4 text-zinc-400 dark:text-zinc-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                )}

                {researches.map((job) => {
                    const isActive = activeId === job.id;
                    return (
                        <div
                            key={job.id}
                            className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 group transition-all ${isActive
                                ? 'bg-white dark:bg-dark-200 border border-zinc-200 dark:border-dark-300 shadow-subtle text-zinc-900 dark:text-zinc-100'
                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-dark-200 hover:border-zinc-200 dark:hover:border-dark-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:shadow-subtle border border-transparent'
                                }`}
                        >
                            <button
                                onClick={() => handleNavigate(`/research/${job.id}`)}
                                className="flex-1 flex items-center gap-3 overflow-hidden"
                            >
                                {getStatusIndicator(job.status)}
                                <div className="flex-1 overflow-hidden text-left">
                                    <div className="truncate text-sm font-medium">{job.topic}</div>
                                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">
                                        {new Date(job.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Delete this research?')) {
                                        deleteResearch(job.id);
                                        if (isActive) handleNavigate('/dashboard');
                                    }
                                }}
                                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                                title="Delete research"
                            >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-dark-300 bg-zinc-50 dark:bg-dark-secondary">
                <div className="flex items-center justify-between mb-3">
                    <ThemeSwitcher />
                </div>
                <button
                    onClick={openSettings}
                    className="w-full flex items-center justify-between p-2 hover:bg-white dark:hover:bg-dark-200 hover:shadow-subtle border border-transparent hover:border-zinc-200 dark:hover:border-dark-300 rounded-xl transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white dark:bg-dark-200 border border-zinc-200 dark:border-dark-300 flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-300">
                            {user?.name?.[0] || 'U'}
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{user?.name}</span>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Pro Plan</span>
                        </div>
                    </div>
                    <Settings className="w-4 h-4 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
                </button>
            </div>
        </div>
    );
};

import React, { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useResearchStore } from '../store';
import { JobStatus } from '../types';
import { Plus, Loader2, Settings, User, Terminal } from 'lucide-react';
import { SettingsModal } from './SettingsModal';

export const Sidebar = () => {
    const navigate = useNavigate();
    const { id: activeId } = useParams();
    const { researches, fetchResearches, user, loadingList, openSettings } = useResearchStore();

    useEffect(() => {
        fetchResearches();
    }, [fetchResearches]);

    const getStatusIndicator = (status: JobStatus) => {
        switch (status) {
            case JobStatus.COMPLETED: return <div className="w-2 h-2 rounded-full bg-emerald-500" />;
            case JobStatus.PROCESSING: return <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />;
            case JobStatus.FAILED: return <div className="w-2 h-2 rounded-full bg-red-500" />;
            default: return <div className="w-2 h-2 rounded-full bg-zinc-300" />;
        }
    };

    return (
        <div className="w-64 h-full bg-zinc-50 border-r border-zinc-200 flex flex-col flex-shrink-0">
            <SettingsModal />
            
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-200 bg-zinc-50/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 font-semibold text-zinc-900 tracking-tight">
                    <div className="w-6 h-6 bg-zinc-900 text-white rounded flex items-center justify-center">
                        <Terminal className="w-3.5 h-3.5" />
                    </div>
                    <span>DeepResearch</span>
                </div>
                <button 
                    onClick={() => navigate('/dashboard')} 
                    className="p-1.5 text-zinc-500 hover:bg-white hover:text-zinc-900 hover:shadow-subtle rounded-md transition-all border border-transparent hover:border-zinc-200" 
                    title="New Research"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                <div className="px-2 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">History</div>
                
                {loadingList && (
                    <div className="flex items-center justify-center py-4 text-zinc-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                )}

                {researches.map((job) => {
                    const isActive = activeId === job.id;
                    return (
                        <button
                            key={job.id}
                            onClick={() => navigate(`/research/${job.id}`)}
                            className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 group transition-all ${
                                isActive 
                                ? 'bg-white border border-zinc-200 shadow-subtle text-zinc-900' 
                                : 'text-zinc-600 hover:bg-white hover:border-zinc-200 hover:text-zinc-900 hover:shadow-subtle border border-transparent'
                            }`}
                        >
                            {getStatusIndicator(job.status)}
                            <div className="flex-1 overflow-hidden">
                                <div className="truncate text-sm font-medium">{job.topic}</div>
                                <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                    {new Date(job.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-zinc-200 bg-zinc-50">
                <button 
                    onClick={openSettings}
                    className="w-full flex items-center justify-between p-2 hover:bg-white hover:shadow-subtle border border-transparent hover:border-zinc-200 rounded-xl transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-700">
                            {user?.name?.[0] || 'U'}
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-xs font-medium text-zinc-900">{user?.name}</span>
                            <span className="text-[10px] text-zinc-500">Pro Plan</span>
                        </div>
                    </div>
                    <Settings className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600" />
                </button>
            </div>
        </div>
    );
};
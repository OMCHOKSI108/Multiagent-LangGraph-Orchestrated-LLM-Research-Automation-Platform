import React, { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useResearchStore } from '../store';
import { JobStatus } from '../types';
import { Plus, Loader2, Settings, Terminal, Trash2, History, LayoutDashboard } from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';

interface SidebarProps {
    onClose?: () => void;
    className?: string;
}

export const Sidebar = ({ onClose, className }: SidebarProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id: activeId } = useParams();
    const { researches, fetchResearches, deleteResearch, user, loadingList, openSettings } = useResearchStore();

    useEffect(() => {
        fetchResearches();
    }, [fetchResearches]);

    const getStatusColor = (status: JobStatus) => {
        switch (status) {
            case JobStatus.COMPLETED: return "bg-emerald-500";
            case JobStatus.PROCESSING: return "bg-amber-500 animate-pulse";
            case JobStatus.FAILED: return "bg-red-500";
            default: return "bg-zinc-300";
        }
    };

    const handleNavigate = (path: string) => {
        navigate(path);
        onClose?.();
    };

    return (
        <div className={cn("w-64 h-full bg-card border-r flex flex-col", className)}>
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-4 border-b">
                <div className="flex items-center gap-2 font-semibold">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded flex items-center justify-center">
                        <Terminal className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-display font-bold tracking-tight">sans </span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                    onClick={() => handleNavigate('/dashboard')}
                >
                    <Plus className="w-4 h-4" />
                </Button>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4 px-2 space-y-4">

                {/* Main Links */}
                <div className="space-y-1">
                    <Button
                        variant={location.pathname === '/dashboard' ? "secondary" : "ghost"}
                        className="w-full justify-start text-sm font-normal"
                        onClick={() => handleNavigate('/dashboard')}
                    >
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                    </Button>
                </div>

                {/* Research History */}
                <div>
                    <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Research History
                    </h3>
                    <div className="space-y-1">
                        {loadingList && (
                            <div className="flex justify-center py-2">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}

                        {researches.length === 0 && !loadingList && (
                            <p className="px-2 text-xs text-muted-foreground">No research yet.</p>
                        )}

                        {researches.map((job) => {
                            const isActive = activeId === job.id;
                            return (
                                <div key={job.id} className="group flex items-center gap-1 relative">
                                    <Button
                                        variant={isActive ? "secondary" : "ghost"}
                                        className={cn(
                                            "w-full justify-start text-sm font-normal truncate pr-8",
                                            isActive && "bg-secondary text-secondary-foreground"
                                        )}
                                        onClick={() => handleNavigate(`/research/${job.id}`)}
                                    >
                                        <span className={cn("mr-2 h-2 w-2 rounded-full", getStatusColor(job.status))} />
                                        <span className="truncate">{job.topic}</span>
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm('Delete this research?')) {
                                                deleteResearch(job.id);
                                                if (isActive) handleNavigate('/dashboard');
                                            }
                                        }}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                    <ThemeSwitcher />
                </div>
                <Button
                    variant="outline"
                    className="w-full justify-start px-2 h-12"
                    onClick={openSettings}
                >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                        {user?.name?.[0] || 'U'}
                    </div>
                    <div className="flex flex-col items-start overflow-hidden">
                        <span className="text-xs font-medium truncate w-full text-left">{user?.name || 'User'}</span>
                        <span className="text-[10px] text-muted-foreground">Pro Plan</span>
                    </div>
                    <Settings className="ml-auto h-4 w-4 text-muted-foreground" />
                </Button>
            </div>
        </div>
    );
};

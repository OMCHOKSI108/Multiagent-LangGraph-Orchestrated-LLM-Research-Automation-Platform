import React, { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useResearchStore } from '../store';
import { JobStatus } from '../types';
import { Plus, Loader2, Bot, Trash2, LayoutDashboard } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { DeleteWorkspaceModal } from './DeleteWorkspaceModal';

interface SidebarProps {
    onClose?: () => void;
    className?: string;
}

export const Sidebar = ({ onClose, className }: SidebarProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id: activeId } = useParams();
    const { researches, fetchResearches, deleteResearch, loadingList } = useResearchStore();
    const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; topic: string } | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);

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

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            const deletingActive = activeId === deleteTarget.id;
            await deleteResearch(deleteTarget.id);
            if (deletingActive) handleNavigate('/dashboard');
            setDeleteTarget(null);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className={cn("w-64 h-full bg-card border-r border-border flex flex-col font-sans", className)}>
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-3 shrink-0">
                <Button
                    variant="ghost"
                    className="flex-1 justify-start gap-2 px-2 hover:bg-accent text-foreground h-10 rounded-lg transition-colors border border-border"
                    onClick={() => handleNavigate('/dashboard?create=1')}
                >
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Plus className="w-4 h-4 text-muted-foreground" />
                        New chat
                    </div>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 ml-2 text-muted-foreground hover:text-foreground hover:bg-accent"
                    onClick={() => handleNavigate('/dashboard')}
                >
                    <LayoutDashboard className="w-5 h-5" />
                </Button>
            </div>

            {/* Research History */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2 custom-scrollbar">
                <div className="px-2 text-xs font-medium text-muted-foreground mb-2">Today</div>

                {loadingList && (
                    <div className="flex justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}

                {researches.map((job) => {
                    const isActive = activeId === job.id;
                    return (
                        <div key={job.id} className="group relative">
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-full justify-start text-sm font-normal h-9 px-3 truncate relative rounded-lg transition-all",
                                    isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                )}
                                onClick={() => handleNavigate(`/research/${job.id}`)}
                            >
                                <span className="truncate">{job.topic || "New conversation"}</span>
                            </Button>

                            {/* Hover Delete */}
                            <div className={cn("absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity", isActive ? "opacity-100" : "")}>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteTarget({ id: job.id, topic: job.topic });
                                    }}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border">
                <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent cursor-pointer transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-muted text-foreground flex items-center justify-center border border-border transition-colors">
                        <Bot className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground transition-colors">DeepResearch</span>
                        <span className="text-[11px] text-muted-foreground">Pro Plan</span>
                    </div>
                </div>
            </div>

            <DeleteWorkspaceModal
                open={Boolean(deleteTarget)}
                workspaceName={deleteTarget?.topic || ''}
                isDeleting={isDeleting}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
};

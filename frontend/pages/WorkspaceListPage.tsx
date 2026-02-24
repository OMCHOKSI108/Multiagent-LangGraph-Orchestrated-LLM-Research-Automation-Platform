import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Workspace } from '../types';
import { useResearchStore } from '../store';
import { toast } from 'sonner';
import {
    FolderPlus,
    FolderOpen,
    Clock,
    FileText,
    Plus,
    Trash2,
    Loader2,
    Search,
    Archive,
} from 'lucide-react';

export function WorkspaceListPage() {
    const navigate = useNavigate();
    const isAuthenticated = useResearchStore((s) => s.isAuthenticated);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [creating, setCreating] = useState(false);

    const fetchWorkspaces = async () => {
        try {
            setLoading(true);
            const data = await api.getWorkspaces();
            setWorkspaces(data);
        } catch (err: any) {
            toast.error(err.message || 'Failed to load workspaces');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) fetchWorkspaces();
    }, [isAuthenticated]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        try {
            setCreating(true);
            const ws = await api.createWorkspace(newName.trim(), newDesc.trim() || undefined);
            toast.success(`Workspace "${ws.name}" created`);
            setCreateOpen(false);
            setNewName('');
            setNewDesc('');
            navigate(`/workspace/${ws.id}`);
        } catch (err: any) {
            toast.error(err.message || 'Failed to create workspace');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Archive workspace "${name}"? Research data will be preserved.`)) return;
        try {
            await api.deleteWorkspace(id);
            toast.success('Workspace archived');
            setWorkspaces((prev) => prev.filter((w) => w.id !== id));
        } catch (err: any) {
            toast.error(err.message || 'Failed to archive workspace');
        }
    };

    const formatDate = (date: string | null | undefined) => {
        if (!date) return 'Never';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="min-h-screen p-6 md:p-10">
            {/* Header */}
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            <FolderOpen className="inline-block w-8 h-8 mr-3 text-primary" />
                            Workspaces
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Each workspace is an isolated research environment with its own topics, sources, and chat history.
                        </p>
                    </div>
                    <button
                        onClick={() => setCreateOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Workspace
                    </button>
                </div>

                {/* Create Modal */}
                {createOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <form
                            onSubmit={handleCreate}
                            className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-md mx-4"
                        >
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <FolderPlus className="w-5 h-5 text-primary" />
                                Create New Workspace
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Name *</label>
                                    <input
                                        autoFocus
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g. Quantum Computing Research"
                                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        maxLength={255}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Description (optional)</label>
                                    <textarea
                                        value={newDesc}
                                        onChange={(e) => setNewDesc(e.target.value)}
                                        placeholder="Brief description of the research focus..."
                                        rows={3}
                                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setCreateOpen(false)}
                                    className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating || !newName.trim()}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                >
                                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}

                {/* Empty State */}
                {!loading && workspaces.length === 0 && (
                    <div className="text-center py-20 px-4">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
                            <Search className="w-10 h-10 text-primary" />
                        </div>
                        <h2 className="text-2xl font-semibold mb-2">No workspaces yet</h2>
                        <p className="text-muted-foreground max-w-md mx-auto mb-6">
                            Create your first workspace to start a new research session. Each workspace provides
                            an isolated environment for your research topics.
                        </p>
                        <button
                            onClick={() => setCreateOpen(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
                        >
                            <FolderPlus className="w-4 h-4" />
                            Create Your First Workspace
                        </button>
                    </div>
                )}

                {/* Workspace Grid */}
                {!loading && workspaces.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {workspaces.map((ws) => (
                            <div
                                key={ws.id}
                                onClick={() => navigate(`/workspace/${ws.id}`)}
                                className="group relative bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
                            >
                                {/* Delete button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(ws.id, ws.name);
                                    }}
                                    className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                                    title="Archive workspace"
                                >
                                    <Archive className="w-4 h-4" />
                                </button>

                                {/* Icon & Name */}
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <FolderOpen className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-base truncate">{ws.name}</h3>
                                        {ws.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                                                {ws.description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Metadata */}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-4 pt-3 border-t border-border/50">
                                    <span className="inline-flex items-center gap-1">
                                        <FileText className="w-3.5 h-3.5" />
                                        {ws.session_count || 0} sessions
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {formatDate(ws.last_activity || ws.updated_at)}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* Create new card */}
                        <div
                            onClick={() => setCreateOpen(true)}
                            className="flex flex-col items-center justify-center gap-3 bg-card/50 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 min-h-[160px]"
                        >
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <Plus className="w-6 h-6 text-primary" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">New Workspace</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

export function WorkspaceListPage() {
    const navigate = useNavigate();
    const isAuthenticated = useResearchStore((s) => s.isAuthenticated);
    const workspaces = useResearchStore((s) => s.workspaces);
    const loading = useResearchStore((s) => s.workspacesLoading);
    const storeFetchWorkspaces = useResearchStore((s) => s.fetchWorkspaces);
    const storeCreateWorkspace = useResearchStore((s) => s.createWorkspace);
    const storeArchiveWorkspace = useResearchStore((s) => s.archiveWorkspace);
    const [createOpen, setCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (isAuthenticated) storeFetchWorkspaces();
    }, [isAuthenticated, storeFetchWorkspaces]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        try {
            setCreating(true);
            const wsId = await storeCreateWorkspace(newName.trim(), newDesc.trim() || undefined);
            setCreateOpen(false);
            setNewName('');
            setNewDesc('');
            navigate(`/workspace/${wsId}`);
        } catch (err: any) {
            toast.error(err.message || 'Failed to create workspace');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Archive workspace "${name}"? Research data will be preserved.`)) return;
        try {
            await storeArchiveWorkspace(id);
        } catch {
            // Error toast is handled by the store
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
        <div className="min-h-screen p-6 md:p-10 bg-bg text-text-c font-sans">
            {/* Header */}
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold font-sans text-text-c">
                            <FolderOpen className="inline-block w-6 h-6 mr-3 text-accent" />
                            Workspaces
                        </h1>
                        <p className="text-text-sec mt-1 text-sm">
                            Each workspace is an isolated research environment with its own topics, sources, and chat history.
                        </p>
                    </div>
                    <Button
                        onClick={() => setCreateOpen(true)}
                        variant="primary"
                    >
                        <Plus className="w-4 h-4" />
                        New Workspace
                    </Button>
                </div>

                {/* Create Modal */}
                {createOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/50 backdrop-blur-sm">
                        <form
                            onSubmit={handleCreate}
                            className="bg-surface border border-border-c rounded-xl shadow-2xl p-6 w-full max-w-md mx-4"
                        >
                            <h2 className="text-lg font-semibold font-sans mb-4 flex items-center gap-2 text-text-c">
                                <FolderPlus className="w-5 h-5 text-accent" />
                                Create New Workspace
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1.5 text-text-sec">Name *</label>
                                    <input
                                        autoFocus
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g. Quantum Computing Research"
                                        className="w-full px-4 py-2.5 rounded-lg border border-border-c bg-surface text-text-c placeholder:text-muted-c focus:outline-none focus:ring-2 focus:ring-accent/20"
                                        maxLength={255}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1.5 text-text-sec">Description (optional)</label>
                                    <textarea
                                        value={newDesc}
                                        onChange={(e) => setNewDesc(e.target.value)}
                                        placeholder="Brief description of the research focus..."
                                        rows={3}
                                        className="w-full px-4 py-2.5 rounded-lg border border-border-c bg-surface text-text-c placeholder:text-muted-c focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" isLoading={creating} disabled={creating || !newName.trim()}>
                                    Create
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                    </div>
                )}

                {/* Empty State */}
                {!loading && workspaces.length === 0 && (
                    <div className="text-center py-20 px-4">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/10 mb-6">
                            <Search className="w-10 h-10 text-accent" />
                        </div>
                        <h2 className="text-base font-semibold font-sans mb-2 text-text-c">No workspaces yet</h2>
                        <p className="text-text-sec max-w-md mx-auto mb-6 text-sm">
                            Create your first workspace to start a new research session. Each workspace provides
                            an isolated environment for your research topics.
                        </p>
                        <Button onClick={() => setCreateOpen(true)} variant="primary">
                            <FolderPlus className="w-4 h-4" />
                            Create Your First Workspace
                        </Button>
                    </div>
                )}

                {/* Workspace Grid */}
                {!loading && workspaces.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {workspaces.map((ws) => (
                            <Card
                                key={ws.id}
                                onClick={() => navigate(`/workspace/${ws.id}`)}
                                className="group relative cursor-pointer hover:bg-surface2 hover:border-border-s hover:shadow-md"
                            >
                                {/* Delete button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(ws.id, ws.name);
                                    }}
                                    className="absolute top-3 right-3 p-1.5 rounded-md text-muted-c opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all"
                                    title="Archive workspace"
                                >
                                    <Archive className="w-4 h-4" />
                                </button>

                                {/* Icon & Name */}
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                                        <FolderOpen className="w-5 h-5 text-accent" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-text-c text-base truncate group-hover:text-accent transition-colors">{ws.name}</h3>
                                        {ws.description && (
                                            <p className="text-sm text-text-sec line-clamp-2 mt-0.5">
                                                {ws.description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Metadata */}
                                <div className="flex items-center gap-4 text-xs text-muted-c mt-4 pt-3 border-t border-border-c/50">
                                    <span className="inline-flex items-center gap-1">
                                        <FileText className="w-3.5 h-3.5" />
                                        {ws.session_count || 0} sessions
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {formatDate(ws.last_activity || ws.updated_at)}
                                    </span>
                                </div>
                            </Card>
                        ))}

                        {/* Create new card */}
                        <div
                            onClick={() => setCreateOpen(true)}
                            className="flex flex-col items-center justify-center gap-3 bg-surface/50 border-2 border-dashed border-border-c rounded-xl p-8 cursor-pointer hover:border-border-s hover:bg-surface2 transition-all duration-200 min-h-[160px]"
                        >
                            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                                <Plus className="w-6 h-6 text-accent" />
                            </div>
                            <span className="text-sm font-medium text-text-sec">New Workspace</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

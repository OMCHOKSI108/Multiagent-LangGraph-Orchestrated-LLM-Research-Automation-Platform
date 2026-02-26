import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useResearchStore } from '../store';
import { api } from '../services/api';
import { ResearchSession, Workspace } from '../types';
import {
    ArrowLeft, Play, Clock, CheckCircle, XCircle, Loader2,
    FileText, Download, Trash2, FolderOpen, Upload
} from 'lucide-react';

type SessionStatus = 'queued' | 'processing' | 'completed' | 'failed';

export const WorkspaceDetailPage = () => {
    const { wid } = useParams<{ wid: string }>();
    const navigate = useNavigate();
    const { setCurrentWorkspace } = useResearchStore();

    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [sessions, setSessions] = useState<ResearchSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Research creation
    const [topic, setTopic] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // File upload
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<{ filename: string; chunks: number } | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    useEffect(() => {
        if (!wid) return;
        loadWorkspace();
    }, [wid]);

    const loadWorkspace = async () => {
        if (!wid) return;
        setLoading(true);
        setError(null);
        try {
            // getWorkspace returns { workspace, sessions, uploads }
            const data = await api.getWorkspace(wid);
            const ws = data.workspace || data;
            setWorkspace(ws);
            setCurrentWorkspace(ws);
            setSessions(data.sessions || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load workspace');
        } finally {
            setLoading(false);
        }
    };

    const handleStartResearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wid || !topic.trim()) return;

        setIsCreating(true);
        try {
            const session = await api.startWorkspaceResearch(wid, topic.trim());
            const sessionId = session.session_id || session.id;
            setSessions(prev => [{ id: sessionId, task: topic.trim(), topic: topic.trim(), title: topic.trim(), status: 'queued', created_at: new Date().toISOString(), ...session }, ...prev]);
            setTopic('');
            // Navigate to the research view
            navigate(`/research/${sessionId}`);
        } catch (err: any) {
            setError(err.message || 'Failed to start research');
        } finally {
            setIsCreating(false);
        }
    };

    const getStatusIcon = (status: SessionStatus) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            case 'processing': return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
            case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
            default: return <Clock className="w-4 h-4 text-zinc-400" />;
        }
    };

    const getStatusBadge = (status: SessionStatus) => {
        const styles: Record<SessionStatus, string> = {
            completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            processing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            failed: 'bg-red-500/10 text-red-400 border-red-500/20',
            queued: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.queued}`}>
                {status}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !workspace) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <XCircle className="w-12 h-12 text-red-400" />
                <p className="text-lg text-muted-foreground">{error || 'Workspace not found'}</p>
                <button
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
                    onClick={() => navigate('/workspaces')}
                >
                    Back to Workspaces
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    className="p-2 hover:bg-accent rounded-lg transition"
                    onClick={() => navigate('/workspaces')}
                >
                    <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                        <FolderOpen className="w-6 h-6 text-primary" />
                        {workspace.name}
                    </h1>
                    {workspace.description && (
                        <p className="text-sm text-muted-foreground mt-1">{workspace.description}</p>
                    )}
                </div>
            </div>

            {/* New Research Form */}
            <div className="bg-surface border border-border rounded-xl p-6">
                <h2 className="text-lg font-bold font-serif text-text mb-4">Start New Research</h2>
                <form onSubmit={handleStartResearch} className="flex gap-3">
                    <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Enter research topic... (e.g., 'Impact of AI on Healthcare')"
                        className="flex-1 px-4 py-3 bg-bg border border-border rounded-lg text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition"
                        disabled={isCreating}
                    />
                    <button
                        type="submit"
                        disabled={!topic.trim() || isCreating}
                        className="px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-[#D4874A] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                    >
                        {isCreating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Play className="w-4 h-4" />
                        )}
                        Start
                    </button>
                </form>
            </div>

            {/* File Upload */}
            <div className="bg-surface border border-border rounded-xl p-6">
                <h2 className="text-lg font-bold font-serif text-text mb-4">Upload Documents</h2>
                <p className="text-sm text-muted mb-4">Upload files to build the workspace knowledge base for RAG-enhanced chat.</p>
                <div className="flex items-center gap-4">
                    <label
                        className={`flex-1 flex items-center justify-center gap-3 px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition ${isUploading
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border hover:border-primary/30 hover:bg-accent/50'
                            }`}
                    >
                        {isUploading ? (
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        ) : (
                            <Upload className="w-5 h-5 text-muted-foreground" />
                        )}
                        <span className="text-sm text-muted-foreground">
                            {isUploading ? 'Uploading & embedding...' : 'Click to upload (.txt, .md, .pdf, .csv, .json, .tex)'}
                        </span>
                        <input
                            type="file"
                            className="hidden"
                            accept=".txt,.md,.pdf,.csv,.json,.tex"
                            disabled={isUploading}
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file || !wid) return;
                                setIsUploading(true);
                                setUploadResult(null);
                                setUploadError(null);
                                try {
                                    const result = await api.uploadWorkspaceFile(wid, file);
                                    setUploadResult({ filename: result.filename, chunks: result.chunks_added });
                                } catch (err: any) {
                                    setUploadError(err.message || 'Upload failed');
                                } finally {
                                    setIsUploading(false);
                                    e.target.value = '';
                                }
                            }}
                        />
                    </label>
                </div>
                {uploadResult && (
                    <div className="mt-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        <span><strong>{uploadResult.filename}</strong> — {uploadResult.chunks} chunks embedded</span>
                    </div>
                )}
                {uploadError && (
                    <div className="mt-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        <span>{uploadError}</span>
                    </div>
                )}
            </div>

            {/* Sessions List */}
            <div>
                <h2 className="text-lg font-bold font-serif text-text mb-4">
                    Research Sessions ({sessions.length})
                </h2>

                {sessions.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-border rounded-xl">
                        <FileText className="w-12 h-12 text-muted mx-auto mb-4" />
                        <p className="text-muted">No research sessions yet</p>
                        <p className="text-sm text-muted mt-1">Start your first research above!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sessions.map((session) => (
                            <div
                                key={session.id}
                                className="bg-surface border border-border rounded-xl p-4 hover:border-accent/30 transition cursor-pointer group"
                                onClick={() => navigate(`/research/${session.id}`)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {getStatusIcon(session.status as SessionStatus)}
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-semibold text-text truncate">
                                                {session.task || session.title || 'Untitled Research'}
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {new Date(session.created_at).toLocaleDateString('en-US', {
                                                    month: 'short', day: 'numeric', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit',
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        {getStatusBadge(session.status as SessionStatus)}
                                        {session.status === 'completed' && (
                                            <button
                                                className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-accent rounded transition"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(`/export/${session.id}/zip`, '_blank');
                                                }}
                                                title="Download ZIP"
                                            >
                                                <Download className="w-4 h-4 text-muted-foreground" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

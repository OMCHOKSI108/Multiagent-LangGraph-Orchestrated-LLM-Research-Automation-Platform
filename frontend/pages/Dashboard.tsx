import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useResearchStore } from '../store';
import { ArrowRight, Clock, Loader2, Trash2, Plus, FolderOpen } from 'lucide-react';
import { JobStatus, ResearchJob } from '../types';
import { Button } from '../components/ui/button';
import { DeleteWorkspaceModal } from '../components/DeleteWorkspaceModal';
import { CardSkeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';

export const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { createResearch, researches, fetchResearches, deleteResearch, loadingList } = useResearchStore();
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [depth] = useState<'quick' | 'deep'>('deep'); // Default to deep research
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; topic: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const createModalRef = useRef<HTMLDivElement | null>(null);

  // Redirect to workspaces page (Phase 2: workspace-first flow)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    // Only redirect if not explicitly creating (via ?create=1)
    if (params.get('create') !== '1') {
      navigate('/workspaces', { replace: true });
    }
  }, [navigate, location.search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = workspaceName.trim();
    if (!name) return;
    setIsSubmitting(true);
    try {
      const id = await createResearch(name, depth);
      setWorkspaceName('');
      setWorkspaceDescription('');
      setIsCreateModalOpen(false);
      navigate(`/research/${id}`);
    } catch (err: any) {
      console.error('[Dashboard] Failed to create research:', err);
      toast.error(err?.message || 'Failed to create research. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isCreateModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        setIsCreateModalOpen(false);
        return;
      }

      if (event.key !== 'Tab' || !createModalRef.current) return;

      const selectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'textarea:not([disabled])',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');
      const focusable = Array.from(createModalRef.current.querySelectorAll<HTMLElement>(selectors))
        .filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCreateModalOpen, isSubmitting]);

  const formatUpdatedAt = (job: ResearchJob) => {
    const date = job.updatedAt || job.createdAt;
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getWorkspaceDescription = (job: ResearchJob) => {
    if (job.reportMarkdown) {
      return 'Report available. Click to open workspace.';
    }
    if (job.status === JobStatus.PROCESSING) {
      return 'Research in progress.';
    }
    if (job.status === JobStatus.FAILED) {
      return 'Last run failed. Open to retry or inspect logs.';
    }
    return 'Open workspace to continue research and collaboration.';
  };

  const getStatusBadgeClass = (status: JobStatus) => {
    if (status === JobStatus.COMPLETED) {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    }
    if (status === JobStatus.PROCESSING) {
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    }
    if (status === JobStatus.FAILED) {
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    }
    return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteResearch(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
    }
  };

  return (
    <div className="relative min-h-screen bg-bg text-text font-sans">
      {/* Main Content */}
      <main className="relative min-h-screen flex flex-col items-center px-4 py-8 sm:px-6 md:px-10 lg:px-16">
        {/* Workspace Selection Interface */}
        <section className="h-full flex-grow flex flex-col items-center w-full max-w-6xl z-10">
          <div className="w-full text-center mb-10 md:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-serif mb-4 text-text">
              Select Your Workspace
            </h1>
            <p className="text-lg text-muted max-w-3xl mx-auto">
              Open an existing workspace to continue research, or create a new workspace to start a fresh investigation.
            </p>
          </div>

          {loadingList ? (
            <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : (
            researches.length > 0 && (
              <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="group min-h-56 rounded-xl border-border bg-surface border-2 border-dashed p-6 text-left transition-all hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <div className="h-full flex flex-col justify-between">
                    <div className="w-12 h-12 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                      <Plus className="w-6 h-6 text-accent" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold font-serif text-text">Create New Workspace</h3>
                      <p className="text-sm text-muted">
                        Start a new research thread with your own topic and objectives.
                      </p>
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-accent">
                        Create workspace
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </button>

                {researches.map((job) => (
                  <article
                    key={job.id}
                    className="group relative min-h-56 rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:bg-accent"
                  >
                    <div className="h-full flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${getStatusBadgeClass(job.status)}`}>
                            {job.status}
                          </span>
                          <span className="text-xs text-muted flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Updated {formatUpdatedAt(job)}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold font-serif text-text leading-snug line-clamp-2">
                          {job.topic}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {getWorkspaceDescription(job)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-4">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 text-sm font-medium text-foreground/90 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                          onClick={() => navigate(`/research/${job.id}`)}
                          aria-label={`Open ${job.topic} workspace`}
                        >
                          Open workspace
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </button>
                        <button
                          className="relative z-10 h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 transition-colors pointer-events-auto hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => {
                            setDeleteTarget({ id: job.id, topic: job.topic });
                          }}
                          aria-label={`Delete ${job.topic}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )
          )}

          {!loadingList && researches.length === 0 && (
            <div className="w-full max-w-xl text-center mt-12 bg-surface border border-border rounded-xl p-8">
              <FolderOpen className="w-10 h-10 mx-auto mb-4 text-muted" />
              <h2 className="text-xl font-bold font-serif text-text mb-2">No workspaces yet</h2>
              <p className="text-muted mb-6">
                Create your first workspace to begin organizing research.
              </p>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="h-10 px-4 gap-2"
              >
                <Plus className="w-4 h-4" />
                Create New Workspace
              </Button>
            </div>
          )}
        </section>

        {isCreateModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => {
                if (!isSubmitting) setIsCreateModalOpen(false);
              }}
              aria-hidden="true"
            />
            <div
              ref={createModalRef}
              className="relative z-50 w-full max-w-lg rounded-xl border border-border bg-card p-6 md:p-7 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-workspace-title"
            >
              <h2 id="create-workspace-title" className="text-2xl font-bold font-serif text-text mb-2">Create New Workspace</h2>
              <p className="text-sm text-muted mb-6">
                Give your workspace a clear name. You can start research right away after creation.
              </p>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="workspaceName" className="text-sm font-medium text-text">
                    Workspace Name
                  </label>
                  <input
                    id="workspaceName"
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="E.g., AI in Healthcare 2026"
                    className="h-10 w-full bg-bg border border-border rounded-lg px-3 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    maxLength={120}
                    autoFocus
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="workspaceDescription" className="text-sm font-medium text-text">
                    Short Description (Optional)
                  </label>
                  <textarea
                    id="workspaceDescription"
                    value={workspaceDescription}
                    onChange={(e) => setWorkspaceDescription(e.target.value)}
                    placeholder="Optional notes to describe this workspace"
                    className="w-full bg-bg border border-border rounded-lg p-3 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent resize-none min-h-24"
                    maxLength={240}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted">
                    Description is currently local to this form and helps team clarity during setup.
                  </p>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="sm:flex-1 h-10"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="sm:flex-1 h-10 gap-2"
                    disabled={!workspaceName.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Create Workspace
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        <DeleteWorkspaceModal
          open={Boolean(deleteTarget)}
          workspaceName={deleteTarget?.topic || ''}
          isDeleting={isDeleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            Powered by 20+ specialized AI agents for comprehensive research
          </p>
        </div>
      </main>
    </div>
  );
}

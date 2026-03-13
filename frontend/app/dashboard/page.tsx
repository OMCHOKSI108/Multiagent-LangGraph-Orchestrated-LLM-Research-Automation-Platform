'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { workspaces as wsApi, type Workspace } from '@/lib/api';
import Link from 'next/link';

function WorkspaceCard({ ws, onClick }: { ws: Workspace; onClick: () => void }) {
  const last = ws.last_activity
    ? new Date(ws.last_activity).toLocaleDateString()
    : new Date(ws.created_at).toLocaleDateString();

  return (
    <div
      onClick={onClick}
      className="border border-gray-300 px-4 py-3 mb-2 cursor-pointer hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-base mb-0.5">{ws.name}</h3>
        <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
          {ws.session_count} session{ws.session_count !== 1 ? 's' : ''}
        </span>
      </div>
      <p className="text-sm text-gray-500">
        {ws.description || 'No description'} &middot; {last}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [wsList, setWsList] = useState<Workspace[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchErr, setFetchErr] = useState('');

  // New workspace form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState('');

  // Search
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  const loadWS = useCallback(async () => {
    setFetching(true); setFetchErr('');
    try {
      const data = await wsApi.list();
      setWsList(data.workspaces || []);
    } catch (e: unknown) {
      setFetchErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { if (user) loadWS(); }, [user, loadWS]);

  async function handleCreate() {
    setCreateErr('');
    if (!newName.trim()) { setCreateErr('Name required'); return; }
    setCreating(true);
    try {
      await wsApi.create(newName.trim(), newDesc.trim() || undefined);
      setNewName(''); setNewDesc(''); setShowCreate(false);
      await loadWS();
    } catch (e: unknown) {
      setCreateErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setCreating(false);
    }
  }

  const filtered = wsList.filter(w =>
    w.name.toLowerCase().includes(query.toLowerCase()) ||
    (w.description || '').toLowerCase().includes(query.toLowerCase())
  );

  if (loading) {
    return (
      <div className="section-shell mt-16 text-slate-400 text-sm">Loading your workspaces…</div>
    );
  }

  return (
    <div className="section-shell mt-10 pb-16 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-1">Workspace hub</p>
          <h2 className="text-2xl font-semibold mb-1">My research workspaces</h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Each workspace is a long‑lived container for one project: questions, runs, reports, chat, and exports live
            together.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="self-start sm:self-auto btn-primary mt-2 sm:mt-0"
        >
          + New workspace
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="surface-card p-5">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 mb-1">Workspace name *</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. LLMs for medical question answering"
                className="input-field"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 mb-1">Description (optional)</label>
            <input
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="What is this workspace exploring?"
              className="input-field"
            />
          </div>
          {createErr && <p className="text-rose-300 text-xs mb-2">{createErr}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="btn-primary"
            >
              {creating ? 'Creating…' : 'Create workspace'}
            </button>
            <button
              onClick={() => { setShowCreate(false); setCreateErr(''); }}
              className="btn-ghost text-xs px-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      {wsList.length > 3 && (
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search workspaces by name or description…"
          className="input-field max-w-md"
        />
      )}

      {/* List */}
      <div className="surface-card p-4">
        {fetching ? (
          <p className="text-sm text-slate-400">Loading workspaces…</p>
        ) : fetchErr ? (
          <p className="text-sm text-rose-300">{fetchErr}</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-400">
            {query ? 'No workspaces match your search.' : 'No workspaces yet. Create one to start your first project.'}
          </p>
        ) : (
          filtered.map(ws => (
            <WorkspaceCard
              key={ws.id}
              ws={ws}
              onClick={() => router.push(`/workspace/${ws.id}`)}
            />
          ))
        )}
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
        <Link href="/agents" className="hover:text-emerald-300 transition-colors">Agent directory</Link>
        <Link href="/memories" className="hover:text-emerald-300 transition-colors">Global memories</Link>
        <Link href="/profile" className="hover:text-emerald-300 transition-colors">Profile &amp; API key</Link>
      </div>
    </div>
  );
}

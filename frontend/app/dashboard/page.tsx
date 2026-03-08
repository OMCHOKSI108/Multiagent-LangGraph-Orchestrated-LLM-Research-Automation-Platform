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

  if (loading) return <div className="max-w-[560px] mx-auto mt-16 px-5 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-[600px] mx-auto mt-10 px-5 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-normal m-0">My Workspaces</h2>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="border border-gray-700 px-4 py-1.5 text-sm hover:bg-gray-100 cursor-pointer bg-white"
        >
          + New Workspace
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="border border-gray-300 p-4 mb-4">
          <div className="mb-2">
            <label className="block text-xs text-gray-500 mb-1">Workspace Name *</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. AI Ethics Research"
              className="w-full border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-gray-600"
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">Description (optional)</label>
            <input
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="What is this workspace for?"
              className="w-full border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-gray-600"
            />
          </div>
          {createErr && <p className="text-red-600 text-xs mb-2">{createErr}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="border border-gray-700 px-4 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-40 cursor-pointer bg-white"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => { setShowCreate(false); setCreateErr(''); }}
              className="border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50 cursor-pointer bg-white"
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
          placeholder="Search workspaces..."
          className="w-full border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-gray-400 mb-3"
        />
      )}

      {/* List */}
      {fetching ? (
        <p className="text-sm text-gray-400">Loading workspaces...</p>
      ) : fetchErr ? (
        <p className="text-sm text-red-600">{fetchErr}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400">
          {query ? 'No workspaces match your search.' : 'No workspaces yet. Create one to start.'}
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

      {/* Quick links */}
      <hr className="border-t border-gray-100 my-6" />
      <div className="flex gap-6 text-sm text-gray-500">
        <Link href="/agents" className="hover:underline">Agent Directory</Link>
        <Link href="/memories" className="hover:underline">Memories</Link>
        <Link href="/profile" className="hover:underline">Profile &amp; API Key</Link>
      </div>
    </div>
  );
}

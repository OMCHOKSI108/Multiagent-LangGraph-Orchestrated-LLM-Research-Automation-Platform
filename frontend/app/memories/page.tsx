'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { memories as memoriesApi, type Memory } from '@/lib/api';

export default function MemoriesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mems, setMems] = useState<Memory[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchErr, setFetchErr] = useState('');

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState('');

  // Search
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!loading && !user) { router.replace('/login'); return; }
    load();
  }, [user, loading, router]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setFetching(true); setFetchErr('');
    try {
      const d = await memoriesApi.list();
      const processed = (d.memories || []).map((m: any) => ({
        ...m,
        title: m.metadata?.title || 'Untitled Memory',
        tags: m.metadata?.tags || []
      }));
      setMems(processed);
    } catch (e: unknown) {
      setFetchErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setFetching(false);
    }
  }

  async function handleCreate() {
    setCreateErr('');
    if (!title.trim() || !content.trim()) { setCreateErr('Title and content required'); return; }
    setCreating(true);
    try {
      const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean);
      await memoriesApi.create(title.trim(), content.trim(), tagArr);
      setTitle(''); setContent(''); setTags(''); setShowCreate(false);
      await load();
    } catch (e: unknown) {
      setCreateErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this memory?')) return;
    try {
      await memoriesApi.delete(id);
      setMems(prev => prev.filter(m => m.id !== id));
    } catch { /* ignore */ }
  }

  const filtered = mems.filter(m =>
    (m.title || '').toLowerCase().includes(query.toLowerCase()) ||
    m.content.toLowerCase().includes(query.toLowerCase()) ||
    (m.tags || []).some(t => t.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="max-w-[600px] mx-auto mt-10 px-5 pb-16">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-normal">Memories</h2>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="border border-gray-700 px-4 py-1.5 text-sm hover:bg-gray-100 cursor-pointer bg-white"
        >
          + New Memory
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Store important findings, notes, and context that persist across research sessions.
      </p>

      {/* Create form */}
      {showCreate && (
        <div className="border border-gray-300 p-4 mb-4">
          <div className="mb-2">
            <label className="block text-xs text-gray-500 mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Memory title"
              className="w-full border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-gray-600" />
          </div>
          <div className="mb-2">
            <label className="block text-xs text-gray-500 mb-1">Content *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder="What do you want to remember?"
              rows={4}
              className="w-full border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-gray-600 resize-none" />
          </div>
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">Tags (comma-separated)</label>
            <input value={tags} onChange={e => setTags(e.target.value)}
              placeholder="e.g. AI, research, quantum"
              className="w-full border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-gray-600" />
          </div>
          {createErr && <p className="text-red-600 text-xs mb-2">{createErr}</p>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={creating}
              className="border border-gray-700 px-4 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-40 cursor-pointer bg-white">
              {creating ? 'Saving...' : 'Save Memory'}
            </button>
            <button onClick={() => { setShowCreate(false); setCreateErr(''); }}
              className="border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50 cursor-pointer bg-white">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      {mems.length > 3 && (
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search memories..."
          className="w-full border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-gray-400 mb-3" />
      )}

      {/* List */}
      {fetching ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : fetchErr ? (
        <p className="text-sm text-red-600">{fetchErr}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400">
          {query ? 'No memories match your search.' : 'No memories saved yet. Create one to track important findings.'}
        </p>
      ) : (
        filtered.map(m => (
          <div key={m.id} className="border border-gray-200 px-4 py-3 mb-2">
            <div className="flex items-start justify-between mb-1">
              <h3 className="text-sm font-semibold">{m.title}</h3>
              <button
                onClick={() => handleDelete(m.id)}
                className="text-xs text-gray-400 hover:text-red-600 ml-2 border-none bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-1 whitespace-pre-wrap">{m.content}</p>
            <div className="flex items-center justify-between">
              <div className="flex gap-1 flex-wrap">
                {(m.tags || []).map(tag => (
                  <span key={tag} className="text-[10px] bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
              <span className="text-xs text-gray-400">{new Date(m.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

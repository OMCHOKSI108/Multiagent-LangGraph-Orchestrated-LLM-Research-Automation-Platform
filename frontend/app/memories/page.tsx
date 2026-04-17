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
    (m.tags || []).some((t: string) => t.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="section-shell pb-20">
      <div className="max-w-[720px] w-full mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Memories</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Store important findings, notes, and context that persist across research sessions.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(v => !v)}
            className="btn-primary px-4 py-1.5 text-sm"
          >
            + New Memory
          </button>
        </div>

      {/* Create form */}
      {showCreate && (
        <div className="surface-card mb-4 p-5">
          <div className="mb-3">
            <label className="block text-[11px] text-[var(--text-tertiary)] mb-1 uppercase tracking-[0.16em] font-medium">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Memory title"
              className="w-full input-field" />
          </div>
          <div className="mb-3">
            <label className="block text-[11px] text-[var(--text-tertiary)] mb-1 uppercase tracking-[0.16em] font-medium">Content *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder="What do you want to remember?"
              rows={4}
              className="w-full input-field resize-none" />
          </div>
          <div className="mb-3">
            <label className="block text-[11px] text-[var(--text-tertiary)] mb-1 uppercase tracking-[0.16em] font-medium">Tags (comma-separated)</label>
            <input value={tags} onChange={e => setTags(e.target.value)}
              placeholder="e.g. AI, research, quantum"
              className="w-full input-field" />
          </div>
          {createErr && <p className="text-[var(--accent-rose)] text-xs mb-3">{createErr}</p>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={creating}
              className="btn-primary px-4 py-1.5 text-sm disabled:opacity-40">
              {creating ? 'Saving...' : 'Save Memory'}
            </button>
            <button onClick={() => { setShowCreate(false); setCreateErr(''); }}
              className="btn-ghost px-4 py-1.5 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      {mems.length > 3 && (
        <input 
          value={query} 
          onChange={e => setQuery(e.target.value)}
          placeholder="Search memories..."
          className="w-full input-field mb-4" 
        />
      )}

      {/* List */}
      {fetching ? (
        <p className="text-sm text-[var(--text-muted)]">Loading...</p>
      ) : fetchErr ? (
        <p className="text-sm text-[var(--accent-rose)]">{fetchErr}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          {query ? 'No memories match your search.' : 'No memories saved yet. Create one to track important findings.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => (
            <div key={m.id} className="surface-card py-4 px-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold">{m.title}</h3>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="text-xs text-[var(--text-tertiary)] hover:text-[var(--accent-rose)] ml-2 border-none bg-transparent cursor-pointer transition-colors p-1 rounded hover:bg-[var(--accent-rose)]/10"
                  aria-label="Delete memory"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3 whitespace-pre-wrap">{m.content}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  {(m.tags || []).map((tag: string) => (
                    <span 
                      key={tag} 
                      className="text-[10px] px-2 py-1 rounded-full border text-[var(--accent-teal)] border-[var(--accent-teal)]/30 bg-[var(--accent-teal)]/5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-[var(--text-tertiary)]">{new Date(m.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

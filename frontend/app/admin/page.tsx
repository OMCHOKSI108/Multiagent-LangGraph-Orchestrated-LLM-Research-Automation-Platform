'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { admin as adminApi, type User, type ResearchSession, type Workspace, type Memory } from '@/lib/api';
import './admin.css';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/components/ToastProvider';
import LoadingScreen from '@/components/LoadingScreen';

type Tab = 'overview' | 'users' | 'research' | 'workspaces' | 'chats' | 'memories' | 'api-keys' | 'monitoring' | 'api-usage' | 'system-health' | 'ai-models' | 'alerts' | 'logs';

type AdminChatSession = {
  session_id: string | number;
  user_email?: string;
  message_count?: number;
  last_activity?: string;
};

type AdminApiKey = {
  id: number;
  key_name?: string;
  key_value?: string;
  user_email?: string;
};

type AdminPageData = {
  stats: Record<string, number> | null;
  users: User[];
  research: ResearchSession[];
  workspaces: Workspace[];
  chats: AdminChatSession[];
  memories: Memory[];
  apiKeys: AdminApiKey[];
  monitoring: {
    system: any;
    api_usage: any;
    database: any;
    services: any;
    ai_model: any;
    llm: any;
    alerts: any;
  } | null;
};

function safeLabel(value: unknown, fallback = 'N/A') {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function safeDate(value: unknown, mode: 'date' | 'datetime' = 'date') {
  if (!value) return 'N/A';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return 'N/A';
  return mode === 'datetime' ? date.toLocaleString() : date.toLocaleDateString();
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; onConfirm: () => void; variant?: 'danger' | 'warning' } | null>(null);
  const [data, setData] = useState<AdminPageData>({
    stats: null,
    users: [],
    research: [],
    workspaces: [],
    chats: [],
    memories: [],
    apiKeys: [],
    monitoring: null,
  });

  const [fetching, setFetching] = useState(false);
  const [err, setErr] = useState('');

  const loadTabData = useCallback(async (tab: Tab) => {
    setFetching(true);
    setErr('');
    try {
      switch (tab) {
        case 'overview':
          const statsRes = await adminApi.stats();
          setData((prev: AdminPageData) => ({ ...prev, stats: statsRes.stats }));
          break;
        case 'users':
          const usersRes = await adminApi.users();
          setData((prev: AdminPageData) => ({ ...prev, users: usersRes.users }));
          break;
        case 'research':
          const researchRes = await adminApi.research();
          setData((prev: AdminPageData) => ({ ...prev, research: researchRes.research_logs }));
          break;
        case 'workspaces':
          const workspacesRes = await adminApi.workspaces();
          setData((prev: AdminPageData) => ({ ...prev, workspaces: workspacesRes.workspaces }));
          break;
        case 'chats':
          const chatsRes = await adminApi.chatSessions();
          setData((prev: AdminPageData) => ({ ...prev, chats: chatsRes.sessions as AdminChatSession[] }));
          break;
        case 'memories':
          const memoriesRes = await adminApi.memories();
          setData((prev: AdminPageData) => ({ ...prev, memories: memoriesRes.memories }));
          break;
        case 'api-keys':
          const keysRes = await adminApi.apiKeys();
          setData((prev: AdminPageData) => ({ ...prev, apiKeys: keysRes.keys as AdminApiKey[] }));
          break;
        case 'monitoring':
        case 'api-usage':
        case 'system-health':
        case 'ai-models':
        case 'alerts':
        case 'logs':
          // Load all monitoring data for these tabs
          const monitoringRes = await adminApi.allMetrics();
          const llmMetricsRes = await adminApi.llmMetrics();
          setData((prev: AdminPageData) => ({ 
            ...prev, 
            monitoring: {
              ...monitoringRes.metrics,
              llm: llmMetricsRes.metrics
            }
          }));
          break;
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to fetch data');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'admin') { router.replace('/dashboard'); return; }
    loadTabData(activeTab);
  }, [user, loading, router, activeTab, loadTabData]);

  if (loading) return <LoadingScreen message="Checking admin access..." />;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900">
      <ConfirmModal
        isOpen={confirmAction !== null}
        title={confirmAction?.title || ''}
        description={confirmAction?.description || ''}
        confirmLabel={confirmAction?.variant === 'danger' ? 'Delete' : confirmAction?.variant === 'warning' ? 'Revoke' : 'Confirm'}
        cancelLabel="Cancel"
        variant={confirmAction?.variant || 'default'}
        onConfirm={() => { confirmAction?.onConfirm(); setConfirmAction(null); }}
        onCancel={() => setConfirmAction(null)}
      />
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight admin-gradient-text uppercase">Admin Console</h1>
            <p className="text-slate-500 text-sm mt-1">Welcome chief admin. This is your platform-wide intelligence dashboard.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">ADMIN MODE</span>
            <button onClick={() => loadTabData(activeTab)} className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200">
              <svg className={`w-4 h-4 text-slate-500 ${fetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex scrollbar-hide overflow-x-auto border-b border-slate-200 mb-8 gap-8 px-2">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'users', label: 'Users' },
            { id: 'research', label: 'Research' },
            { id: 'workspaces', label: 'Workspaces' },
            { id: 'chats', label: 'Chats' },
            { id: 'memories', label: 'Memories' },
            { id: 'api-keys', label: 'API Keys' },
            { id: 'monitoring', label: 'Monitoring' },
            { id: 'api-usage', label: 'API Usage' },
            { id: 'system-health', label: 'System Health' },
            { id: 'ai-models', label: 'AI Models' },
            { id: 'alerts', label: 'Alerts' },
            { id: 'logs', label: 'Logs' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`pb-4 text-sm font-medium transition-all relative ${
                activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {err && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            {err}
          </div>
        )}

        <main className="min-h-[60vh]">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {data.stats ? (
                Object.entries(data.stats).map(([key, value]) => (
                  <div key={key} className="admin-glass p-6 rounded-2xl flex flex-col justify-between">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{key.replace(/_/g, ' ')}</p>
                    <div className="flex items-end justify-between">
                      <h3 className="text-4xl font-bold tracking-tight text-slate-800">{value}</h3>
                      <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center text-slate-300">Loading statistics...</div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="admin-glass rounded-2xl overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-sm" aria-label="Users table">
                   <caption className="sr-only">List of all users in the system</caption>
                   <thead>
                     <tr className="bg-slate-50/50 border-b border-slate-100">
                       <th scope="col" className="text-left p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">User</th>
                       <th scope="col" className="text-left p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Role</th>
                       <th scope="col" className="text-left p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Status</th>
                       <th scope="col" className="text-left p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Joined</th>
                       <th scope="col" className="text-right p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Actions</th>
                     </tr>
                   </thead>
                  <tbody>
                    {data.users.map(u => (
                      <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                        <td className="p-4">
                          <div className="font-medium text-slate-800">{u.username}</div>
                          <div className="text-xs text-slate-400">{u.email}</div>
                        </td>
                        <td className="p-4">
                          {(() => {
                            const normalizedRole = safeLabel(u.role, 'user');
                            return (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            normalizedRole === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {normalizedRole.toUpperCase()}
                          </span>
                            );
                          })()}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span className={u.is_active ? 'text-emerald-700' : 'text-rose-700'}>{u.is_active ? 'Active' : 'Disabled'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-500 text-xs">
                          {safeDate(u.created_at)}
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={async () => {
                              const action = u.is_active ? 'disable' : 'enable';
                              await adminApi.disableUser(u.id, action);
                              loadTabData('users');
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                              u.is_active 
                                ? 'bg-white border-rose-100 text-rose-600 hover:bg-rose-50' 
                                : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                          >
                            {u.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'research' && (
            <div className="admin-glass rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="text-left p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Topic/Title</th>
                      <th className="text-left p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">User</th>
                      <th className="text-left p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Status</th>
                      <th className="text-left p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Stage</th>
                      <th className="text-right p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Created</th>
                      <th className="text-right p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.research.map(r => (
                      <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                        <td className="p-4">
                          <div className="font-medium text-slate-800 truncate max-w-[300px]">{r.title || r.topic}</div>
                          <div className="text-[10px] text-slate-400">ID: {r.id}</div>
                        </td>
                        <td className="p-4 text-xs text-slate-500">{r.user_email}</td>
                        <td className="p-4">
                          {(() => {
                            const normalizedStatus = safeLabel(r.status, 'unknown');
                            return (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              normalizedStatus === 'completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                              normalizedStatus === 'failed' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                              'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                            {normalizedStatus.toUpperCase()}
                          </span>
                            );
                          })()}
                        </td>
                        <td className="p-4 text-xs text-slate-400 capitalize">{r.current_stage || 'N/A'}</td>
                        <td className="p-4 text-right text-slate-500 text-xs">
                          {safeDate(r.created_at, 'datetime')}
                        </td>
                        <td className="p-4 text-right">
                          {(() => {
                            const normalizedStatus = safeLabel(r.status, 'unknown').toLowerCase();
                            const normalizedStage = safeLabel(r.current_stage, '').toLowerCase();
                            const canDelete =
                              normalizedStatus === 'failed'
                              || normalizedStatus === 'writing'
                              || normalizedStage === 'writing'
                              || normalizedStatus === 'running'
                              || normalizedStatus === 'processing';

                            if (!canDelete) return null;

                            return (
                              <button
                                  onClick={() => setConfirmAction({
                                    title: 'Delete Research',
                                    description: `Are you sure you want to delete research #${r.id}? This cannot be undone.`,
                                    variant: 'danger',
                                    onConfirm: async () => {
                                      try {
                                        await adminApi.deleteResearch(r.id);
                                        setData((prev: AdminPageData) => ({ ...prev, research: prev.research.filter(x => x.id !== r.id) }));
                                        addToast('Research deleted successfully', 'success');
                                      } catch {
                                        addToast('Failed to delete research', 'error');
                                      }
                                    }
                                  })}
                                className="px-3 py-1 rounded-lg text-xs font-medium border border-rose-100 text-rose-600 hover:bg-rose-50"
                              >
                                Delete
                              </button>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'workspaces' && (
            <div className="admin-glass rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="text-left p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Workspace Name</th>
                      <th className="text-left p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Owner</th>
                      <th className="text-center p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Sessions</th>
                      <th className="text-right p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.workspaces.map(w => (
                      <tr key={w.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                        <td className="p-4">
                          <div className="font-medium text-slate-800">{w.name}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{w.id}</div>
                        </td>
                        <td className="p-4 text-xs text-slate-500">{w.owner_email}</td>
                        <td className="p-4 text-center">
                          <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">{w.session_count}</span>
                        </td>
                        <td className="p-4 text-right text-slate-500 text-xs">
                          {safeDate(w.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'chats' && (
            <div className="admin-glass rounded-2xl overflow-hidden">
               <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="text-left p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Session ID</th>
                      <th className="text-left p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">User</th>
                      <th className="text-center p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Messages</th>
                      <th className="text-right p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.chats.map((c, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                        <td className="p-4 font-mono text-xs text-indigo-500">{c.session_id}</td>
                        <td className="p-4 text-xs text-slate-500">{c.user_email}</td>
                        <td className="p-4 text-center">
                          <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold text-[10px] tracking-wide">{c.message_count ?? 0}</span>
                        </td>
                        <td className="p-4 text-right text-slate-500 text-xs">
                          {safeDate(c.last_activity, 'datetime')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'memories' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.memories.map(m => (
                <div key={m.id} className="admin-glass p-5 rounded-2xl relative group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-[10px] font-bold text-slate-300 uppercase leading-none">Global Memory</div>
                    <button 
                        onClick={() => setConfirmAction({
                          title: 'Delete Memory',
                          description: 'Are you sure you want to delete this memory? This cannot be undone.',
                          variant: 'danger',
                          onConfirm: async () => {
                            try {
                              await adminApi.deleteMemory(m.id);
                              setData((prev: AdminPageData) => ({ ...prev, memories: prev.memories.filter(x => x.id !== m.id) }));
                              addToast('Memory deleted successfully', 'success');
                            } catch {
                              addToast('Failed to delete memory', 'error');
                            }
                          }
                        })}
                      className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                  <p className="text-sm text-slate-700 mb-4 line-clamp-4 italic">"{m.content}"</p>
                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-indigo-400">{m.user_email}</span>
                    <span className="text-[10px] text-slate-300">{safeDate(m.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'api-keys' && (
            <div className="space-y-6">
              {/* Generate New API Key Form */}
              <div className="admin-glass rounded-2xl p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Generate New API Key</h2>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target as HTMLFormElement);
                    const user_email = formData.get('user_email') as string;
                    const key_name = formData.get('key_name') as string;

                    if (!user_email || !key_name) {
                      addToast('Please fill in all fields', 'warning');
                      return;
                    }

                    try {
                      await adminApi.generateApiKey(user_email, key_name);
                      (e.target as HTMLFormElement).reset();
                      loadTabData('api-keys');
                      addToast('API key generated successfully!', 'success');
                    } catch (err) {
                      addToast('Failed to generate API key', 'error');
                    }
                  }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">User Email</label>
                    <input
                      type="email"
                      name="user_email"
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Key Name</label>
                    <input
                      type="text"
                      name="key_name"
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="My API Key"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Generate Key
                    </button>
                  </div>
                </form>
              </div>

              {/* API Keys Table */}
              <div className="admin-glass rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="text-left p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Key Name</th>
                        <th className="text-left p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Value</th>
                        <th className="text-left p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">User</th>
                        <th className="text-right p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Revoke</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.apiKeys.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-400">
                            No API keys generated yet. Use the form above to create your first key.
                          </td>
                        </tr>
                      ) : (
                        data.apiKeys.map(k => (
                          <tr key={k.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                            <td className="p-4 font-medium">{safeLabel(k.key_name)}</td>
                            <td className="p-4"><code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-amber-600">{`${safeLabel(k.key_value, '').slice(0, 15)}${k.key_value ? '...' : ''}` || 'N/A'}</code></td>
                            <td className="p-4 text-xs text-slate-500">{k.user_email}</td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => setConfirmAction({
                                  title: 'Revoke API Key',
                                  description: 'Are you sure you want to revoke this API key? This cannot be undone.',
                                  variant: 'warning',
                                  onConfirm: async () => {
                                    try {
                                      await adminApi.revokeApiKey(k.id);
                                      loadTabData('api-keys');
                                      addToast('API key revoked successfully', 'success');
                                    } catch {
                                      addToast('Failed to revoke API key', 'error');
                                    }
                                  }
                                })}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Monitoring Dashboard */}
          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {data.monitoring ? (
                  <>
                    {/* System Health Cards */}
                    <div className="admin-glass p-6 rounded-2xl">
                      <h3 className="text-sm font-semibold text-slate-600 mb-4">System Health</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">CPU Usage</span>
                          <span className="text-sm font-bold text-slate-800">{data.monitoring.system?.cpu?.usage || 0}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Memory</span>
                          <span className="text-sm font-bold text-slate-800">{data.monitoring.system?.memory?.percentage || 0}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Disk</span>
                          <span className="text-sm font-bold text-slate-800">{data.monitoring.system?.disk?.percentage || 0}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Database Health */}
                    <div className="admin-glass p-6 rounded-2xl">
                      <h3 className="text-sm font-semibold text-slate-600 mb-4">Database</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Size</span>
                          <span className="text-sm font-bold text-slate-800">{data.monitoring.database?.size?.formatted || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Active Conn.</span>
                          <span className="text-sm font-bold text-slate-800">{data.monitoring.database?.connections?.active || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Total Conn.</span>
                          <span className="text-sm font-bold text-slate-800">{data.monitoring.database?.connections?.total || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Services Status */}
                    <div className="admin-glass p-6 rounded-2xl">
                      <h3 className="text-sm font-semibold text-slate-600 mb-4">Services</h3>
                      <div className="space-y-2">
                        {data.monitoring.services && Object.entries(data.monitoring.services.services || {}).map(([service, status]: [string, any]) => (
                          <div key={service} className="flex justify-between items-center">
                            <span className="text-xs text-slate-500 capitalize">{service}</span>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${status.health === 'healthy' ? 'bg-green-500' : status.health === 'unhealthy' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                              <span className="text-xs font-medium">{status.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Model Status */}
                    <div className="admin-glass p-6 rounded-2xl">
                      <h3 className="text-sm font-semibold text-slate-600 mb-4">AI Models</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Active Provider</span>
                          <span className="text-sm font-bold text-slate-800">{data.monitoring.ai_model?.active_provider || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Fallback Events</span>
                          <span className="text-sm font-bold text-slate-800">{data.monitoring.ai_model?.fallback_events?.length || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="admin-glass p-6 rounded-2xl">
                      <h3 className="text-sm font-semibold text-slate-600 mb-4">LLM Usage</h3>
                      <div className="space-y-3">
                        {data.monitoring.llm && data.monitoring.llm.length > 0 ? (
                          data.monitoring.llm.map((metric: any, index: number) => (
                            <div key={index} className="bg-slate-50 rounded-lg p-3">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-medium text-slate-600">
                                  {metric.provider} - {metric.model}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {metric.requests} requests
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-slate-500">Tokens:</span>
                                  <span className="font-medium ml-1">
                                    {metric.total_tokens_input || 0} in / {metric.total_tokens_output || 0} out
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Avg Response:</span>
                                  <span className="font-medium ml-1">{metric.avg_response_time_ms || 0}ms</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Errors:</span>
                                  <span className="font-medium ml-1 text-red-600">{metric.errors || 0}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Rate Limits:</span>
                                  <span className="font-medium ml-1 text-orange-600">{metric.rate_limit_hits || 0}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-slate-400 text-center py-4">
                            No LLM usage data available
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="col-span-full py-20 text-center text-slate-300">Loading monitoring data...</div>
                )}
              </div>
            </div>
          )}

          {/* API Usage Tab */}
          {activeTab === 'api-usage' && (
            <div className="admin-glass rounded-2xl p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-6">API Usage Monitoring</h2>
              {data.monitoring?.api_usage ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(data.monitoring.api_usage).map(([provider, metrics]: [string, any]) => (
                    <div key={provider} className="bg-slate-50 rounded-xl p-4">
                      <h3 className="font-semibold text-slate-700 mb-3 capitalize">{provider}</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Requests</span>
                          <span className="text-sm font-bold">{metrics.request_count || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Success Rate</span>
                          <span className="text-sm font-bold">{metrics.success_rate || 0}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Token Usage</span>
                          <span className="text-sm font-bold">{metrics.token_usage || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Rate Limit Hits</span>
                          <span className="text-sm font-bold text-red-600">{metrics.rate_limit_hits || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-300">Loading API usage data...</div>
              )}
            </div>
          )}

          {/* System Health Tab */}
          {activeTab === 'system-health' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* System Metrics */}
                <div className="admin-glass rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-slate-800 mb-6">System Metrics</h2>
                  {data.monitoring?.system ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                        <span className="font-medium text-slate-700">CPU Usage</span>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-slate-800">{data.monitoring.system.cpu?.usage || 0}%</div>
                          <div className="w-32 bg-slate-200 rounded-full h-2 mt-1">
                            <div className="bg-indigo-600 h-2 rounded-full" style={{width: `${Math.min(data.monitoring.system.cpu?.usage || 0, 100)}%`}}></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                        <span className="font-medium text-slate-700">Memory Usage</span>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-slate-800">{data.monitoring.system.memory?.percentage || 0}%</div>
                          <div className="text-xs text-slate-500">{data.monitoring.system.memory?.used || 0} MB / {data.monitoring.system.memory?.total || 0} MB</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                        <span className="font-medium text-slate-700">Disk Usage</span>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-slate-800">{data.monitoring.system.disk?.percentage || 0}%</div>
                          <div className="text-xs text-slate-500">{data.monitoring.system.disk?.used || 0} GB / {data.monitoring.system.disk?.total || 0} GB</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                        <span className="font-medium text-slate-700">Uptime</span>
                        <div className="text-2xl font-bold text-slate-800">{Math.floor((data.monitoring.system.uptime || 0) / 3600)}h</div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 text-center text-slate-300">Loading system metrics...</div>
                  )}
                </div>

                {/* Services Status */}
                <div className="admin-glass rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-slate-800 mb-6">Service Status</h2>
                  {data.monitoring?.services ? (
                    <div className="space-y-3">
                      {Object.entries(data.monitoring.services.services || {}).map(([service, status]: [string, any]) => (
                        <div key={service} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${status.health === 'healthy' ? 'bg-green-500' : status.health === 'unhealthy' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                            <span className="font-medium text-slate-700 capitalize">{service.replace('_', ' ')}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-slate-800">{status.status}</div>
                            {status.cpu && <div className="text-xs text-slate-500">CPU: {status.cpu}%</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 text-center text-slate-300">Loading service status...</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI Models Tab */}
          {activeTab === 'ai-models' && (
            <div className="admin-glass rounded-2xl p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-6">AI Model Monitoring</h2>
              {data.monitoring?.ai_model ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h3 className="font-semibold text-slate-700 mb-2">Active Provider</h3>
                      <div className="text-2xl font-bold text-indigo-600">{data.monitoring.ai_model.active_provider || 'Unknown'}</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h3 className="font-semibold text-slate-700 mb-2">Fallback Events (24h)</h3>
                      <div className="text-2xl font-bold text-orange-600">{data.monitoring.ai_model.fallback_events?.length || 0}</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h3 className="font-semibold text-slate-700 mb-2">Model Statistics</h3>
                      <div className="text-2xl font-bold text-green-600">{data.monitoring.ai_model.model_stats?.length || 0}</div>
                    </div>
                  </div>

                  {/* Recent Fallback Events */}
                  {data.monitoring.ai_model.fallback_events?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Fallback Events</h3>
                      <div className="space-y-2">
                        {data.monitoring.ai_model.fallback_events.map((event: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span className="text-sm text-slate-700">
                                {event.from_provider} → {event.to_provider}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500">{new Date(event.timestamp).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-300">Loading AI model data...</div>
              )}
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="admin-glass rounded-2xl p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-6">System Alerts</h2>
              {data.monitoring?.alerts ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                      <div className="text-2xl font-bold text-red-600">{data.monitoring.alerts.by_severity?.critical || 0}</div>
                      <div className="text-sm text-red-700">Critical</div>
                    </div>
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                      <div className="text-2xl font-bold text-orange-600">{data.monitoring.alerts.by_severity?.warning || 0}</div>
                      <div className="text-sm text-orange-700">Warning</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <div className="text-2xl font-bold text-blue-600">{data.monitoring.alerts.by_severity?.info || 0}</div>
                      <div className="text-sm text-blue-700">Info</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <div className="text-2xl font-bold text-slate-600">{data.monitoring.alerts.total_active || 0}</div>
                      <div className="text-sm text-slate-700">Total Active</div>
                    </div>
                  </div>

                  {/* Recent Alerts */}
                  {data.monitoring.alerts.recent_alerts?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Alerts</h3>
                      <div className="space-y-3">
                        {data.monitoring.alerts.recent_alerts.map((alert: any, index: number) => (
                          <div key={index} className={`p-4 rounded-lg border ${
                            alert.severity === 'critical' ? 'bg-red-50 border-red-100' :
                            alert.severity === 'warning' ? 'bg-orange-50 border-orange-100' :
                            'bg-blue-50 border-blue-100'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-slate-800">{alert.title}</h4>
                                <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
                                <div className="flex items-center gap-4 mt-2">
                                  <span className="text-xs text-slate-500 capitalize">{alert.type}</span>
                                  <span className="text-xs text-slate-500">{new Date(alert.timestamp).toLocaleString()}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  // TODO: Implement acknowledge alert
                                  console.log('Acknowledge alert:', alert.id);
                                }}
                                className="px-3 py-1 text-xs bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                              >
                                Acknowledge
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-300">Loading alerts...</div>
              )}
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="admin-glass rounded-2xl p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-6">System Logs</h2>
              <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                <div className="mb-4">
                  <strong>Log streaming integration pending.</strong>
                </div>
                <div className="space-y-1">
                  <div>[INFO] Admin monitoring endpoint accessed</div>
                  <div>[INFO] System metrics collected successfully</div>
                  <div>[INFO] Database health check passed</div>
                  <div>[INFO] AI engine responding normally</div>
                </div>
                <div className="mt-4 text-slate-400">
                  Note: Full log streaming will be available after integrating with logging service (Winston/ELK stack).
                  Currently showing docker-compose logs via terminal.
                </div>
              </div>
            </div>
          )}

        </main>

        <footer className="mt-20 py-10 border-t border-slate-100 flex items-center justify-between text-slate-300 text-[10px] font-bold uppercase tracking-widest">
          <div>© 2026 Deep Research Multi-Agentic Platform</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-indigo-400 transition-colors">Documentation</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">System Status</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Privacy</a>
          </div>
        </footer>
      </div>
    </div>
  );
}

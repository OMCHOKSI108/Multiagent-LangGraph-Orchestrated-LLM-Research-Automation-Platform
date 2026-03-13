'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { admin as adminApi, type User, type ResearchSession, type Workspace, type Memory } from '@/lib/api';
import './admin.css';

type Tab = 'overview' | 'users' | 'research' | 'workspaces' | 'chats' | 'memories' | 'api-keys';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [data, setData] = useState<{
    stats: Record<string, number> | null;
    users: User[];
    research: ResearchSession[];
    workspaces: Workspace[];
    chats: any[];
    memories: Memory[];
    apiKeys: any[];
  }>({
    stats: null,
    users: [],
    research: [],
    workspaces: [],
    chats: [],
    memories: [],
    apiKeys: [],
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
          setData(prev => ({ ...prev, stats: statsRes.stats }));
          break;
        case 'users':
          const usersRes = await adminApi.users();
          setData(prev => ({ ...prev, users: usersRes.users }));
          break;
        case 'research':
          const researchRes = await adminApi.research();
          setData(prev => ({ ...prev, research: researchRes.research_logs }));
          break;
        case 'workspaces':
          const workspacesRes = await adminApi.workspaces();
          setData(prev => ({ ...prev, workspaces: workspacesRes.workspaces }));
          break;
        case 'chats':
          const chatsRes = await adminApi.chatSessions();
          setData(prev => ({ ...prev, chats: chatsRes.sessions }));
          break;
        case 'memories':
          const memoriesRes = await adminApi.memories();
          setData(prev => ({ ...prev, memories: memoriesRes.memories }));
          break;
        case 'api-keys':
          const keysRes = await adminApi.apiKeys();
          setData(prev => ({ ...prev, apiKeys: keysRes.keys }));
          break;
      }
    } catch (e: any) {
      setErr(e.message || 'Failed to fetch data');
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

  if (loading) return <div className="p-10 text-gray-400">Loading auth...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight admin-gradient-text uppercase">Admin Console</h1>
            <p className="text-slate-500 text-sm mt-1">Platform-wide management and intelligence dashboard.</p>
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
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="text-left p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">User</th>
                      <th className="text-left p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Role</th>
                      <th className="text-left p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Status</th>
                      <th className="text-left p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Joined</th>
                      <th className="text-right p-4 font-semibold text-slate-500 uppercase tracking-xs text-[10px]">Actions</th>
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
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            u.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span className={u.is_active ? 'text-emerald-700' : 'text-rose-700'}>{u.is_active ? 'Active' : 'Disabled'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-500 text-xs">
                          {new Date(u.created_at).toLocaleDateString()}
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
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            r.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            r.status === 'failed' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                            'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {r.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-slate-400 capitalize">{r.current_stage || 'N/A'}</td>
                        <td className="p-4 text-right text-slate-500 text-xs">
                          {new Date(r.created_at).toLocaleString()}
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
                          {new Date(w.created_at).toLocaleDateString()}
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
                          <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold text-[10px] tracking-wide">{c.message_count}</span>
                        </td>
                        <td className="p-4 text-right text-slate-500 text-xs">
                          {new Date(c.last_activity).toLocaleString()}
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
                      onClick={async () => {
                        if (confirm('Delete this memory?')) {
                          await adminApi.deleteMemory(m.id);
                          loadTabData('memories');
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                  <p className="text-sm text-slate-700 mb-4 line-clamp-4 italic">"{m.content}"</p>
                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-indigo-400">{m.user_email}</span>
                    <span className="text-[10px] text-slate-300">{new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'api-keys' && (
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
                    {data.apiKeys.map(k => (
                      <tr key={k.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                        <td className="p-4 font-medium">{k.key_name}</td>
                        <td className="p-4"><code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-amber-600">{k.key_value.substring(0, 15)}...</code></td>
                        <td className="p-4 text-xs text-slate-500">{k.user_email}</td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={async () => {
                              if (confirm('Revoke this key?')) {
                                await adminApi.revokeApiKey(k.id);
                                loadTabData('api-keys');
                              }
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

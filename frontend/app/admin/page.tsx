'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { admin as adminApi, type User } from '@/lib/api';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [fetching, setFetching] = useState(true);
  const [err, setErr] = useState('');
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'admin') { router.replace('/dashboard'); return; }
    loadAll();
  }, [user, loading, router]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAll() {
    setFetching(true); setErr('');
    try {
      const [u, s] = await Promise.allSettled([adminApi.users(), adminApi.stats()]);
      if (u.status === 'fulfilled') setUsers(u.value.users || []);
      if (s.status === 'fulfilled') setStats(s.value);
      if (u.status === 'rejected') setErr(u.reason.message);
    } finally {
      setFetching(false);
    }
  }

  async function toggleUser(u: User) {
    const action = u.is_active ? 'disable' : 'enable';
    try {
      const res = await adminApi.disableUser(u.id, action);
      setUsers(prev => prev.map(usr => usr.id === u.id ? res.user : usr));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    }
  }

  if (loading || fetching) return <div className="max-w-4xl mx-auto mt-10 px-5 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto mt-10 px-5 pb-16">
      <h2 className="text-xl font-normal mb-5">Admin Panel</h2>

      {/* System stats */}
      {stats && (
        <div className="border border-gray-200 p-4 mb-6">
          <h3 className="text-sm font-semibold mb-3">System Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(stats).map(([k, v]) => (
              <div key={k}>
                <p className="text-xs text-gray-500 capitalize">{k.replace(/_/g, ' ')}</p>
                <p className="font-semibold text-base">{String(v)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User management */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Users ({users.length})</h3>
        <button onClick={loadAll} className="text-xs border border-gray-200 px-3 py-1 hover:bg-gray-50 cursor-pointer bg-white">
          Refresh
        </button>
      </div>

      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold">ID</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold">Name</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold">Email</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold">Role</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold">Status</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold">Joined</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 text-gray-400 text-xs">{u.id}</td>
                <td className="py-2 px-3">{u.username}</td>
                <td className="py-2 px-3 text-gray-600">{u.email}</td>
                <td className="py-2 px-3 capitalize">
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${u.role === 'admin' ? 'border-purple-300 text-purple-700 bg-purple-50' : 'border-gray-200 text-gray-600 bg-gray-50'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`text-xs ${u.is_active ? 'text-green-700' : 'text-red-600'}`}>
                    {u.is_active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="py-2 px-3 text-gray-500 text-xs">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="py-2 px-3">
                  {u.id !== user?.id && (
                    <button
                      onClick={() => toggleUser(u)}
                      className={`text-xs border px-2 py-0.5 cursor-pointer bg-white
                        ${u.is_active ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-green-300 text-green-700 hover:bg-green-50'}`}
                    >
                      {u.is_active ? 'Disable' : 'Enable'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

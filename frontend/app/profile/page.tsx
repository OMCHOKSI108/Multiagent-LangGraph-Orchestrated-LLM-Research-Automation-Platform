'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { user as userApi, auth as authApi, usage, type ResearchHistoryItem, type UsageStats } from '@/lib/api';

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();

  const [history, setHistory] = useState<ResearchHistoryItem[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [histErr, setHistErr] = useState('');

  // Edit profile
  const [username, setUsername] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Password
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [passErr, setPassErr] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // API key
  const [apiKey, setApiKey] = useState('');
  const [genErr, setGenErr] = useState('');
  const [genning, setGenning] = useState(false);

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    setUsername(user.username || '');
    if (user.api_key) setApiKey(user.api_key);

    (async () => {
      try {
        const h = await userApi.history();
        setHistory(h.slice(0, 50));
      } catch (e: unknown) {
        setHistErr(e instanceof Error ? e.message : 'Failed');
      }
      try {
        const s = await usage.stats();
        setStats(s);
      } catch { /* optional */ }
    })();
  }, [user, router]);

  async function saveProfile() {
    setSaving(true); setSaveMsg('');
    try {
      await userApi.updateProfile({ username: username.trim() });
      await refreshUser();
      setSaveMsg('Saved!'); setEditMode(false);
    } catch (e: unknown) {
      setSaveMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    setPassErr(''); setPassMsg('');
    if (newPass.length < 6) { setPassErr('New password must be 6+ characters'); return; }
    setChangingPass(true);
    try {
      await userApi.changePassword(curPass, newPass);
      setPassMsg('Password changed!'); setCurPass(''); setNewPass('');
    } catch (e: unknown) {
      setPassErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setChangingPass(false);
    }
  }

  async function genApiKey() {
    setGenErr(''); setGenning(true);
    try {
      const d = await authApi.generateApiKey();
      setApiKey(d.api_key);
    } catch (e: unknown) {
      setGenErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setGenning(false);
    }
  }

  function handleLogout() { logout(); router.push('/'); }

  if (!user) return null;

  return (
    <div className="max-w-[560px] mx-auto mt-10 px-5 pb-16">
      <h2 className="text-xl font-normal mb-5">My Profile</h2>

      {/* Profile info */}
      <div className="border border-gray-200 p-4 mb-5">
        <div className="mb-3">
          <label className="block text-xs text-gray-500 mb-0.5">Name</label>
          {editMode ? (
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-gray-600 w-full"
            />
          ) : (
            <p className="text-sm">{user.username || '—'}</p>
          )}
        </div>
        <div className="mb-3">
          <label className="block text-xs text-gray-500 mb-0.5">Email</label>
          <p className="text-sm">{user.email}</p>
        </div>
        <div className="mb-3">
          <label className="block text-xs text-gray-500 mb-0.5">Role</label>
          <p className="text-sm capitalize">{user.role || 'user'}</p>
        </div>
        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-0.5">Member Since</label>
          <p className="text-sm">{new Date(user.created_at).toLocaleDateString()}</p>
        </div>

        {saveMsg && <p className="text-sm text-green-700 mb-2">{saveMsg}</p>}

        <div className="flex gap-2">
          {editMode ? (
            <>
              <button onClick={saveProfile} disabled={saving}
                className="border border-gray-700 px-4 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-40 cursor-pointer bg-white">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setEditMode(false); setUsername(user.username || ''); }}
                className="border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50 cursor-pointer bg-white">
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)}
              className="border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50 cursor-pointer bg-white">
              Edit Name
            </button>
          )}
          <button onClick={handleLogout}
            className="border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50 cursor-pointer bg-white ml-auto">
            Logout
          </button>
        </div>
      </div>

      {/* Usage stats */}
      {stats && (
        <div className="border border-gray-200 p-4 mb-5">
          <h3 className="text-sm font-semibold mb-3">Usage Statistics</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500 text-xs">Total Research</span><p className="font-semibold">{stats.total_research}</p></div>
            <div><span className="text-gray-500 text-xs">Completed</span><p className="font-semibold text-green-700">{stats.completed}</p></div>
            <div><span className="text-gray-500 text-xs">Failed</span><p className="font-semibold text-red-600">{stats.failed}</p></div>
            <div><span className="text-gray-500 text-xs">API Calls</span><p className="font-semibold">{stats.api_calls}</p></div>
          </div>
        </div>
      )}

      {/* API Key */}
      <div className="border border-gray-200 p-4 mb-5">
        <h3 className="text-sm font-semibold mb-2">API Key</h3>
        <p className="text-xs text-gray-500 mb-2">
          Used for direct research API access (<code>/research/start</code>)
        </p>
        {apiKey && (
          <div className="bg-gray-50 border border-gray-200 px-3 py-2 mb-2 font-mono text-xs break-all select-all">
            {apiKey}
          </div>
        )}
        {genErr && <p className="text-red-600 text-xs mb-2">{genErr}</p>}
        <button
          onClick={genApiKey}
          disabled={genning}
          className="border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 cursor-pointer bg-white"
        >
          {genning ? 'Generating...' : apiKey ? 'Regenerate Key' : 'Generate API Key'}
        </button>
      </div>

      {/* Change password */}
      <div className="border border-gray-200 p-4 mb-5">
        <h3 className="text-sm font-semibold mb-3">Change Password</h3>
        <div className="flex flex-col gap-2 max-w-sm">
          <input type="password" placeholder="Current password" value={curPass}
            onChange={e => setCurPass(e.target.value)}
            className="border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-gray-600" />
          <input type="password" placeholder="New password (min 6)" value={newPass}
            onChange={e => setNewPass(e.target.value)}
            className="border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-gray-600" />
          {passErr && <p className="text-red-600 text-xs">{passErr}</p>}
          {passMsg && <p className="text-green-700 text-xs">{passMsg}</p>}
          <button onClick={changePassword} disabled={changingPass}
            className="border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 cursor-pointer bg-white self-start">
            {changingPass ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>

      {/* Research History */}
      <hr className="border-t border-gray-200 my-5" />
      <h3 className="text-base font-normal mb-3">Research History</h3>
      {histErr ? (
        <p className="text-sm text-red-600">{histErr}</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-gray-400">No research history yet.</p>
      ) : (
        history.map(h => (
          <div key={h.id} className="border border-gray-200 px-4 py-2.5 mb-2">
            <h4 className="text-sm font-semibold mb-0.5">
              {h.title || h.task || h.topic || 'Untitled Research'}
            </h4>
            <p className="text-xs text-gray-500">
              <StatusBadge status={h.status} /> &middot; {new Date(h.created_at).toLocaleDateString()}
              {h.workspace_name && <> &middot; {h.workspace_name}</>}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'text-green-700',
    failed: 'text-red-600',
    running: 'text-yellow-700',
    queued: 'text-blue-700',
  };
  return <span className={colors[status] || 'text-gray-500'}>{status}</span>;
}

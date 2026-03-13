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
    <div className="section-shell pb-20">
      <div className="max-w-[720px] w-full mx-auto">
        <h2 className="text-2xl font-semibold mb-5 text-slate-50">My Profile</h2>

      {/* Profile info */}
      <div className="surface-card mb-5">
        <div className="mb-3">
          <label className="block text-[11px] text-slate-400 mb-0.5 uppercase tracking-[0.16em]">Name</label>
          {editMode ? (
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="input-field w-full"
            />
          ) : (
            <p className="text-sm text-slate-50">{user.username || '—'}</p>
          )}
        </div>
        <div className="mb-3">
          <label className="block text-[11px] text-slate-400 mb-0.5 uppercase tracking-[0.16em]">Email</label>
          <p className="text-sm text-slate-200">{user.email}</p>
        </div>
        <div className="mb-3">
          <label className="block text-[11px] text-slate-400 mb-0.5 uppercase tracking-[0.16em]">Role</label>
          <p className="text-sm capitalize text-slate-200">{user.role || 'user'}</p>
        </div>
        <div className="mb-4">
          <label className="block text-[11px] text-slate-400 mb-0.5 uppercase tracking-[0.16em]">Member Since</label>
          <p className="text-sm text-slate-200">{new Date(user.created_at).toLocaleDateString()}</p>
        </div>

        {saveMsg && <p className="text-sm text-emerald-300 mb-2">{saveMsg}</p>}

        <div className="flex gap-2">
          {editMode ? (
            <>
              <button onClick={saveProfile} disabled={saving}
                className="btn-primary px-4 py-1.5 text-sm disabled:opacity-40">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setEditMode(false); setUsername(user.username || ''); }}
                className="btn-ghost px-4 py-1.5 text-sm">
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)}
              className="btn-ghost px-4 py-1.5 text-sm">
              Edit Name
            </button>
          )}
          <button onClick={handleLogout}
            className="btn-ghost px-4 py-1.5 text-sm ml-auto text-rose-300 hover:text-rose-200">
            Logout
          </button>
        </div>
      </div>

      {/* Usage stats */}
      {stats && (
        <div className="surface-card mb-5">
          <h3 className="text-sm font-semibold mb-3 text-slate-100">Usage Statistics</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-400 text-xs">Total Research</span><p className="font-semibold text-slate-100">{stats.total_research}</p></div>
            <div><span className="text-slate-400 text-xs">Completed</span><p className="font-semibold text-emerald-300">{stats.completed}</p></div>
            <div><span className="text-slate-400 text-xs">Failed</span><p className="font-semibold text-rose-300">{stats.failed}</p></div>
            <div><span className="text-slate-400 text-xs">API Calls</span><p className="font-semibold text-slate-100">{stats.api_calls}</p></div>
          </div>
        </div>
      )}

      {/* API Key */}
      <div className="surface-card mb-5">
        <h3 className="text-sm font-semibold mb-2 text-slate-100">API Key</h3>
        <p className="text-xs text-slate-400 mb-2">
          Used for direct research API access (<code>/research/start</code>)
        </p>
        {apiKey && (
          <div className="bg-slate-900/70 border border-slate-700 px-3 py-2 mb-2 font-mono text-xs break-all select-all text-slate-100 rounded-md">
            {apiKey}
          </div>
        )}
        {genErr && <p className="text-rose-300 text-xs mb-2">{genErr}</p>}
        <button
          onClick={genApiKey}
          disabled={genning}
          className="btn-primary px-4 py-1.5 text-sm disabled:opacity-40"
        >
          {genning ? 'Generating...' : apiKey ? 'Regenerate Key' : 'Generate API Key'}
        </button>
      </div>

      {/* Change password */}
      <div className="surface-card mb-5">
        <h3 className="text-sm font-semibold mb-3 text-slate-100">Change Password</h3>
        <div className="flex flex-col gap-2 max-w-sm">
          <input type="password" placeholder="Current password" value={curPass}
            onChange={e => setCurPass(e.target.value)}
            className="input-field" />
          <input type="password" placeholder="New password (min 6)" value={newPass}
            onChange={e => setNewPass(e.target.value)}
            className="input-field" />
          {passErr && <p className="text-rose-300 text-xs">{passErr}</p>}
          {passMsg && <p className="text-emerald-300 text-xs">{passMsg}</p>}
          <button onClick={changePassword} disabled={changingPass}
            className="btn-primary px-4 py-1.5 text-sm disabled:opacity-40 self-start">
            {changingPass ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>

      {/* Research History */}
      <hr className="border-t border-slate-800 my-5" />
      <h3 className="text-base font-semibold mb-3 text-slate-100">Research History</h3>
      {histErr ? (
        <p className="text-sm text-rose-300">{histErr}</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-slate-400">No research history yet.</p>
      ) : (
        history.map(h => (
          <div key={h.id} className="surface-card mb-2 py-3 px-4">
            <h4 className="text-sm font-semibold mb-0.5 text-slate-100">
              {h.title || h.task || h.topic || 'Untitled Research'}
            </h4>
            <p className="text-xs text-slate-400">
              <StatusBadge status={h.status} /> &middot; {new Date(h.created_at).toLocaleDateString()}
              {h.workspace_name && <> &middot; {h.workspace_name}</>}
            </p>
          </div>
        ))
      )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'text-emerald-300',
    failed: 'text-rose-300',
    running: 'text-amber-300',
    queued: 'text-sky-300',
  };
  return <span className={colors[status] || 'text-slate-400'}>{status}</span>;
}

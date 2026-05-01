'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { user as userApi, auth as authApi, usage, type ResearchHistoryItem, type UsageStats } from '@/lib/api';
import PasswordStrength from '@/components/PasswordStrength';
import LoadingScreen from '@/components/LoadingScreen';

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();

  const [history, setHistory] = useState<ResearchHistoryItem[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [histErr, setHistErr] = useState('');

  const [username, setUsername] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [passErr, setPassErr] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

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

  function handleLogout() { 
    if (confirm('Are you sure you want to logout?')) {
      logout(); 
      router.push('/'); 
    }
  }

  if (!user) return null;

  return (
    <div className="section-shell pb-20">
      <div className="max-w-[720px] w-full mx-auto">
        <h2 className="text-2xl font-semibold mb-5 text-[var(--text-primary)]">My Profile</h2>

        {/* Profile info */}
        <div className="surface-card mb-5">
          <div className="mb-3">
            <label className="block text-[11px] text-[var(--text-tertiary)] mb-0.5 uppercase tracking-[0.16em]">Name</label>
            {editMode ? (
              <input
                id="profile-name"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input-field w-full"
                aria-label="Display name"
                autoComplete="name"
              />
            ) : (
              <p className="text-sm text-[var(--text-primary)]">{user.username || '—'}</p>
            )}
          </div>
          <div className="mb-3">
            <label className="block text-[11px] text-[var(--text-tertiary)] mb-0.5 uppercase tracking-[0.16em]">Email</label>
            <p className="text-sm text-[var(--text-secondary)]">{user.email}</p>
          </div>
          <div className="mb-3">
            <label className="block text-[11px] text-[var(--text-tertiary)] mb-0.5 uppercase tracking-[0.16em]">Role</label>
            <p className="text-sm capitalize text-[var(--text-secondary)]">{user.role || 'user'}</p>
          </div>
          <div className="mb-4">
            <label className="block text-[11px] text-[var(--text-tertiary)] mb-0.5 uppercase tracking-[0.16em]">Member Since</label>
            <p className="text-sm text-[var(--text-secondary)]">{new Date(user.created_at).toLocaleDateString()}</p>
          </div>

          {saveMsg && <p className="text-sm text-[var(--accent-emerald)] mb-2">{saveMsg}</p>}

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
              className="btn-ghost px-4 py-1.5 text-sm ml-auto text-[var(--accent-rose)] hover:text-[var(--accent-rose)]/80">
              Logout
            </button>
          </div>
        </div>

        {/* Usage stats */}
        {stats && (
          <div className="surface-card mb-5">
            <h3 className="text-sm font-semibold mb-3 text-[var(--text-primary)]">Usage Statistics</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-[var(--text-tertiary)] text-xs">Total Research</span><p className="font-semibold text-[var(--text-primary)]">{stats.total_research}</p></div>
              <div><span className="text-[var(--text-tertiary)] text-xs">Completed</span><p className="font-semibold text-[var(--accent-emerald)]">{stats.completed}</p></div>
              <div><span className="text-[var(--text-tertiary)] text-xs">Failed</span><p className="font-semibold text-[var(--accent-rose)]">{stats.failed}</p></div>
              <div><span className="text-[var(--text-tertiary)] text-xs">API Calls</span><p className="font-semibold text-[var(--text-primary)]">{stats.api_calls}</p></div>
            </div>
          </div>
        )}

        {/* API Key */}
        <div className="surface-card mb-5">
          <h3 className="text-sm font-semibold mb-2 text-[var(--text-primary)]">API Key</h3>
          <p className="text-xs text-[var(--text-tertiary)] mb-2">
            Used for direct research API access (<code className="text-[var(--accent-teal)]">/research/start</code>)
          </p>
          {apiKey && (
            <div className="px-3 py-2 mb-2 font-mono text-xs break-all select-all rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)]">
              {apiKey}
            </div>
          )}
          {genErr && <p className="text-[var(--accent-rose)] text-xs mb-2">{genErr}</p>}
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
          <h3 className="text-sm font-semibold mb-3 text-[var(--text-primary)]">Change Password</h3>
          <div className="flex flex-col gap-2 max-w-sm">
            <div className="relative">
              <input
                id="current-password"
                type="password"
                placeholder="Current password"
                value={curPass}
                onChange={e => setCurPass(e.target.value)}
                className="input-field pr-10 w-full"
                aria-label="Current password"
                autoComplete="current-password"
              />
            </div>
            <div className="relative">
              <input
                id="new-password"
                type={showNewPass ? 'text' : 'password'}
                placeholder="New password (min 6)"
                value={newPass}
                onChange={e => { setNewPass(e.target.value); setPassErr(''); }}
                className="input-field pr-10 w-full"
                aria-label="New password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-1"
                aria-label={showNewPass ? 'Hide password' : 'Show password'}
              >
                {showNewPass ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <PasswordStrength password={newPass} />
            {passErr && <p className="error-message-inline" role="alert">{passErr}</p>}
            {passMsg && <p className="success-message-inline" role="status">{passMsg}</p>}
            <button onClick={changePassword} disabled={changingPass}
              className="btn-primary px-4 py-1.5 text-sm disabled:opacity-40 self-start">
              {changingPass ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </div>

        {/* Research History */}
        <hr className="border-t border-[var(--border-default)] my-5" />
        <h3 className="text-base font-semibold mb-3 text-[var(--text-primary)]">Research History</h3>
        {histErr ? (
          <p className="text-sm text-[var(--accent-rose)]">{histErr}</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No research history yet.</p>
        ) : (
          history.map(h => (
            <div key={h.id} className="surface-card mb-2 py-3 px-4">
              <h4 className="text-sm font-semibold mb-0.5 text-[var(--text-primary)]">
                {h.title || h.task || h.topic || 'Untitled Research'}
              </h4>
              <p className="text-xs text-[var(--text-tertiary)]">
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
    completed: 'text-[var(--accent-emerald)]',
    failed: 'text-[var(--accent-rose)]',
    running: 'text-[var(--accent-amber)]',
    queued: 'text-[var(--accent-blue)]',
  };
  return <span className={colors[status] || 'text-[var(--text-tertiary)]'}>{status}</span>;
}

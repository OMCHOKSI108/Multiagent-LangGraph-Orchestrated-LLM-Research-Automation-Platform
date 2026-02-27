import React, { useEffect, useMemo, useState } from 'react';
import { useResearchStore } from '../store';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Camera, Copy, Eye, EyeOff, HardDrive, KeyRound, Trash2, Zap, Activity } from 'lucide-react';

export const ProfilePage = () => {
  const { user, updateProfile, apiKeys, usageStats, fetchUsageStats } = useResearchStore();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');
  const [revealProviderKey, setRevealProviderKey] = useState<Record<string, boolean>>({});
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefAutosave, setPrefAutosave] = useState(true);
  const [prefCompactSidebar, setPrefCompactSidebar] = useState(false);
  const [prefAutoscroll, setPrefAutoscroll] = useState(true);

  useEffect(() => {
    setName(user?.name || '');
    setUsername(user?.name || '');
  }, [user?.name]);

  useEffect(() => {
    fetchUsageStats().catch(() => undefined);
  }, [fetchUsageStats]);

  const initials = useMemo(() => {
    const raw = (name || user?.name || user?.email || 'U').trim();
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
  }, [name, user?.name, user?.email]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === user?.name) return;

    setIsSaving(true);
    try {
      await updateProfile(trimmed);
    } finally {
      setIsSaving(false);
    }
  };

  const maskKey = (value: string) => {
    if (!value) return '';
    if (value.length <= 8) return value;
    return `${value.slice(0, 4)}••••••••••••${value.slice(-4)}`;
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-full bg-bg px-4 py-8 sm:px-6 lg:px-8 font-sans text-text-c">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-c">Profile</h1>
          <p className="mt-1 text-sm text-text-sec">Manage your account details.</p>
        </div>

        {/* profile_header_card */}
        <Card className="rounded-2xl p-8">
          <div className="flex flex-col items-start">
            <div className="w-20 h-20 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center text-2xl font-display font-bold text-accent relative">
              {initials}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-surface2 border border-border-c flex items-center justify-center">
                <Camera className="w-4 h-4 text-text-sec" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-xl font-sans font-bold text-text-c">{user?.name || 'User'}</div>
              <div className="text-sm font-mono text-text-sec">{user?.email}</div>
              <div className="mt-2 inline-flex items-center gap-2">
                <span className="bg-accent/10 text-accent border border-accent/30 text-xs font-mono px-2 py-0.5 rounded-md">Pro Plan</span>
                <span className="text-xs font-mono text-muted-c">Member since Feb 2026</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border-c">
            {[
              { label: 'Total Researches', value: '—' },
              { label: 'Sources Analyzed', value: '—' },
              { label: 'Reports Generated', value: '—' },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center">
                <div className="font-display font-bold text-2xl text-text-c">{s.value}</div>
                <div className="text-xs font-sans text-muted-c mt-1 text-center">{s.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* account_details_card */}
        <Card className="rounded-2xl p-6">
          <div className="text-base font-sans font-semibold text-text-c mb-5">Account details</div>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-sans font-medium text-text-sec">Full Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-sans font-medium text-text-sec">Email</label>
              <Input value={user?.email || ''} readOnly aria-readonly="true" className="opacity-80" />
              <p className="text-xs font-sans text-muted-c">Email address cannot be edited.</p>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-sans font-medium text-text-sec">Username</label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-sans font-medium text-text-sec">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about your research interests..."
                className="w-full min-h-[120px] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-accent/20 rounded-lg px-4 py-2.5 text-sm transition-all"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" isLoading={isSaving} disabled={!name.trim() || name.trim() === (user?.name || '').trim()}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>

        {/* plan_usage_card */}
        <Card className="rounded-2xl p-6">
          <div className="text-base font-sans font-semibold text-text-c mb-5">Plan & usage</div>
          <div className="flex items-center justify-between p-4 bg-accent/10 border border-accent/30 rounded-xl mb-5">
            <div>
              <div className="font-display font-bold text-lg text-accent">Pro Plan</div>
              <div className="text-sm font-sans text-text-sec">Higher limits and faster research pipelines</div>
            </div>
            <Button variant="outline_accent" size="sm">Upgrade Plan</Button>
          </div>

          <div className="space-y-4">
            {[{
              label: 'Research Credits',
              icon: Zap,
              used: usageStats?.total_tokens ?? 0,
              total: Math.max(usageStats?.total_tokens ?? 0, 100000),
              fillClass: 'bg-accent',
            }, {
              label: 'API Calls',
              icon: Activity,
              used: usageStats?.total_requests ?? 0,
              total: Math.max(usageStats?.total_requests ?? 0, 1000),
              fillClass: 'bg-teal',
            }, {
              label: 'Storage Used',
              icon: HardDrive,
              used: 0,
              total: 100,
              fillClass: 'bg-amber-c',
            }].map((m) => {
              const pct = m.total ? Math.min(100, Math.round((m.used / m.total) * 100)) : 0;
              const Icon = m.icon;
              return (
                <div key={m.label}>
                  <div className="flex items-center justify-between text-xs font-mono text-text-sec mb-1.5">
                    <span className="inline-flex items-center gap-2">
                      <Icon className="w-4 h-4 text-text-sec" />
                      {m.label}
                    </span>
                    <span>{m.used} / {m.total}</span>
                  </div>
                  <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
                    <div className={m.fillClass} style={{ width: `${pct}%`, height: '100%' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* api_keys_card */}
        <Card className="rounded-2xl p-6">
          <div className="text-base font-sans font-semibold text-text-c mb-1">API Keys</div>
          <div className="text-sm font-sans text-text-sec mb-5">Provider keys used for online models.</div>

          {(['groq', 'gemini'] as const).map((provider) => {
            const value = (apiKeys as any)?.[provider] || '';
            const revealed = Boolean(revealProviderKey[provider]);
            return (
              <div key={provider} className="flex items-center justify-between p-4 bg-surface2 border border-border-c rounded-xl mb-3">
                <div className="flex flex-col gap-0.5">
                  <div className="text-sm font-sans font-medium text-text-c capitalize">{provider}</div>
                  <div className="font-mono text-xs text-muted-c">
                    {value ? (revealed ? value : maskKey(value)) : 'Not set'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={revealed ? `Hide ${provider} key` : `Reveal ${provider} key`}
                    onClick={() => setRevealProviderKey((s) => ({ ...s, [provider]: !s[provider] }))}
                  >
                    {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Copy ${provider} key`}
                    disabled={!value}
                    onClick={() => copyToClipboard(value)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${provider} key`} disabled>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </div>
            );
          })}

          <Button variant="secondary" className="w-full mt-2" disabled>
            <KeyRound className="w-4 h-4" />
            + Create New API Key
          </Button>
        </Card>

        {/* preferences_card */}
        <Card className="rounded-2xl p-6">
          <div className="text-base font-sans font-semibold text-text-c mb-5">Preferences</div>

          {[{
            label: 'Email Notifications',
            desc: 'Get notified when research jobs complete',
            value: prefEmail,
            set: setPrefEmail,
          }, {
            label: 'Auto-save Reports',
            desc: 'Automatically save reports to workspace',
            value: prefAutosave,
            set: setPrefAutosave,
          }, {
            label: 'Compact Sidebar',
            desc: 'Collapse sidebar to icon-only mode by default',
            value: prefCompactSidebar,
            set: setPrefCompactSidebar,
          }, {
            label: 'Stream Auto-scroll',
            desc: 'Auto-scroll log output during live research',
            value: prefAutoscroll,
            set: setPrefAutoscroll,
          }].map((p) => (
            <div key={p.label} className="flex items-center justify-between py-3 border-b border-border-c last:border-b-0">
              <div>
                <div className="text-sm font-sans text-text-c">{p.label}</div>
                <div className="text-xs font-sans text-muted-c mt-0.5">{p.desc}</div>
              </div>
              <button
                type="button"
                onClick={() => p.set(!p.value)}
                className={`h-6 w-11 rounded-full border transition-colors ${p.value ? 'bg-accent/30 border-accent/40' : 'bg-surface2 border-border-c'}`}
                aria-label={`Toggle ${p.label}`}
              >
                <span className={`block h-5 w-5 rounded-full bg-surface border border-border-c translate-y-0.5 transition-transform ${p.value ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </Card>

        {/* danger_zone_card */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
          <div className="text-base font-sans font-semibold text-red-400 mb-1">Danger zone</div>
          <div className="text-sm font-sans text-text-sec mb-5">Actions here are destructive and may be irreversible.</div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-sans text-text-c">Export All Data</div>
                <div className="text-xs font-sans text-muted-c mt-0.5">Download all your research data and reports as a ZIP archive</div>
              </div>
              <Button variant="secondary" size="sm" disabled>Export Data</Button>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-sans text-text-c">Delete All Workspaces</div>
                <div className="text-xs font-sans text-muted-c mt-0.5">Permanently delete all workspaces and associated research data</div>
              </div>
              <Button variant="danger" size="sm" disabled>Delete All Workspaces</Button>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-sans text-text-c">Delete Account</div>
                <div className="text-xs font-sans text-muted-c mt-0.5">Permanently delete your account. This action cannot be undone.</div>
              </div>
              <Button variant="danger" size="sm" disabled>Delete Account</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

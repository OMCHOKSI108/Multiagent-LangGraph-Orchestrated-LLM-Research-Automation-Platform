'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function SignupPage() {
  const { signup, user, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setSubmitting(true);
    try {
      await signup(name.trim(), email.trim(), password);
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => router.push('/login'), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="section-shell flex items-center justify-center py-14">
      <div className="grid w-full max-w-4xl gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-center">
        <div className="hidden md:block text-sm text-[var(--text-secondary)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-3">Create your workspace</p>
          <h2 className="text-3xl font-semibold mb-3">Sign up for MARP.</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4 max-w-md">
            One account gives you access to workspaces, live research sessions, the agent directory, and the profile area
            where your API key and usage stats live.
          </p>
          <ul className="space-y-2 text-xs text-[var(--text-muted)]">
            <li className="flex items-center gap-2">
              <span className="text-[var(--accent-teal)]">→</span>
              You can always export your workspaces and reports.
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[var(--accent-teal)]">→</span>
              Admin roles can later be granted from the console.
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[var(--accent-teal)]">→</span>
              Passwords are never stored in plain text.
            </li>
          </ul>
        </div>

        <div className="surface-card p-6 md:p-8 w-full max-w-md mx-auto">
          <h2 className="text-2xl font-semibold mb-1">Create account</h2>
          <p className="text-xs text-[var(--text-muted)] mb-6">We keep it simple – just the basics to start your research studio.</p>

          {error && (
            <div className="mb-4 rounded-lg border border-[var(--accent-rose)]/30 bg-[var(--accent-rose)]/10 px-4 py-3 text-sm text-[var(--accent-rose)]">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-lg border border-[var(--accent-emerald)]/30 bg-[var(--accent-emerald)]/10 px-4 py-3 text-sm text-[var(--accent-emerald)]">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Full name</label>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Dr. Jane Smith"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="input-field"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary mt-2"
            >
              {submitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 h-px w-full bg-[var(--border-default)]" />
          <p className="mt-4 text-sm text-[var(--text-tertiary)]">
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--accent-teal)] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

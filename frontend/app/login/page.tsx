'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') router.replace('/admin');
      else router.replace('/dashboard');
    }
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="section-shell flex items-center justify-center py-14">
      <div className="grid w-full max-w-4xl gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-center">
        <div className="hidden md:block text-sm text-[var(--text-secondary)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-3">Access your studio</p>
          <h2 className="text-3xl font-semibold mb-3">Welcome back, researcher.</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4 max-w-md">
            Log into your MARP workspace to resume long‑running projects, review literature graphs, or spin up a new deep
            research run.
          </p>
          <ul className="space-y-2 text-xs text-[var(--text-muted)]">
            <li className="flex items-center gap-2">
              <span className="text-[var(--accent-teal)]">→</span>
              All workspaces are autosaved and resumable.
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[var(--accent-teal)]">→</span>
              Your API key lives in the Profile screen for programmatic access.
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[var(--accent-teal)]">→</span>
              Admin accounts can reach the global console from here.
            </li>
          </ul>
        </div>

        <div className="surface-card p-6 md:p-8 w-full max-w-md mx-auto">
          <h2 className="text-2xl font-semibold mb-1">Log in</h2>
          <p className="text-xs text-[var(--text-muted)] mb-6">Use the same email you used when creating your MARP account.</p>

          {error && (
            <div className="mb-4 rounded-lg border border-[var(--accent-rose)]/30 bg-[var(--accent-rose)]/10 px-4 py-3 text-sm text-[var(--accent-rose)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                className="input-field"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary mt-2"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 h-px w-full bg-[var(--border-default)]" />

          <div className="mt-4 text-sm text-[var(--text-tertiary)]">
            <p>
              No account?{' '}
              <Link href="/signup" className="text-[var(--accent-teal)] hover:underline">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

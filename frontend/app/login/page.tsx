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
      const data = await login(email.trim(), password);
      // login doesn't return user, but useAuth state will update
      // and useEffect will handle the redirect. 
      // But we can also check the data if it has role
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="section-shell flex items-center justify-center py-14">
      <div className="grid w-full max-w-4xl gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-center">
        <div className="hidden md:block text-sm text-slate-300">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">Access your studio</p>
          <h2 className="text-3xl font-semibold mb-3">Welcome back, researcher.</h2>
          <p className="text-sm text-slate-300 mb-4 max-w-md">
            Log into your MARP workspace to resume long‑running projects, review literature graphs, or spin up a new deep
            research run.
          </p>
          <ul className="space-y-2 text-xs text-slate-400">
            <li>• All workspaces are autosaved and resumable.</li>
            <li>• Your API key lives in the Profile screen for programmatic access.</li>
            <li>• Admin accounts can reach the global console from here.</li>
          </ul>
        </div>

        <div className="surface-card p-6 md:p-7 w-full max-w-md mx-auto">
          <h2 className="text-2xl font-semibold mb-1">Log in</h2>
          <p className="text-xs text-slate-400 mb-5">Use the same email you used when creating your MARP account.</p>

          {error && <p className="mb-3 rounded-lg border border-rose-500/60 bg-rose-950/40 px-3 py-2 text-xs text-rose-100">{error}</p>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Email</label>
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
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Password</label>
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
              className="btn-primary mt-1"
            >
              {submitting ? 'Logging in…' : 'Login'}
            </button>
          </form>

          <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

          <div className="mt-4 flex flex-col gap-2 text-xs text-slate-400">
            <p>
              No account?{' '}
              <Link href="/signup" className="text-emerald-300 hover:text-emerald-200 underline-offset-2 hover:underline">Sign up</Link>
            </p>
            <button
              onClick={() => {
                setEmail('omchoksi99@gmail.com');
                setPassword('OMchoksi@108');
              }}
              className="self-start text-[11px] text-slate-500 hover:text-slate-200 transition-colors"
            >
              Fill admin credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

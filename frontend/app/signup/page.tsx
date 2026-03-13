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
  const [ok, setOk] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setOk('');
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setSubmitting(true);
    try {
      await signup(name.trim(), email.trim(), password);
      setOk('Account created! Redirecting to login...');
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
        <div className="hidden md:block text-sm text-slate-300">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">Create your workspace</p>
          <h2 className="text-3xl font-semibold mb-3">Sign up for MARP.</h2>
          <p className="text-sm text-slate-300 mb-4 max-w-md">
            One account gives you access to workspaces, live research sessions, the agent directory, and the profile area
            where your API key and usage stats live.
          </p>
          <ul className="space-y-2 text-xs text-slate-400">
            <li>• You can always export your workspaces and reports.</li>
            <li>• Admin roles can later be granted from the console.</li>
            <li>• Passwords are never stored in plain text.</li>
          </ul>
        </div>

        <div className="surface-card p-6 md:p-7 w-full max-w-md mx-auto">
          <h2 className="text-2xl font-semibold mb-1">Create account</h2>
          <p className="text-xs text-slate-400 mb-5">We keep it simple – just the basics to start your research studio.</p>

          {error && <p className="mb-3 rounded-lg border border-rose-500/60 bg-rose-950/40 px-3 py-2 text-xs text-rose-100">{error}</p>}
          {ok && <p className="mb-3 rounded-lg border border-emerald-500/50 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-100">{ok}</p>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Name</label>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="input-field"
              />
            </div>
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
              className="btn-primary mt-1"
            >
              {submitting ? 'Creating account…' : 'Sign up'}
            </button>
          </form>

          <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          <p className="mt-4 text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-300 hover:text-emerald-200 underline-offset-2 hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

interface AuthModalProps {
  defaultTab?: 'login' | 'signup';
  onClose: () => void;
}

export default function AuthModal({ defaultTab = 'login', onClose }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'signup'>(defaultTab);
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]    = useState('');
  const { login, signup }       = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      setSuccess('Logged in! Redirecting...');
      setTimeout(() => { onClose(); router.push('/dashboard'); }, 900);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await signup(name, email, password);
      setSuccess('Account created! Redirecting...');
      setTimeout(() => { onClose(); router.push('/dashboard'); }, 900);
    } catch (err: any) {
      setError(err?.message || 'Signup failed. Try a different email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* ── Backdrop ── */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── Modal Card ── */}
      <div className="surface-card w-full max-w-md mx-4 p-8 relative animate-slide-up">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold gradient-text mb-1">
            {tab === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            {tab === 'login' 
              ? 'Sign in to continue to MARP' 
              : 'Join MARP to start researching'}
          </p>
        </div>

        {/* Success notice */}
        {success && (
          <div className="mb-4 text-sm text-[var(--accent-emerald)] bg-[var(--accent-emerald)]/10 border border-[var(--accent-emerald)]/30 rounded-lg px-4 py-3">
            {success}
          </div>
        )}

        {/* Error notice */}
        {error && (
          <div className="mb-4 text-sm text-[var(--accent-rose)] bg-[var(--accent-rose)]/10 border border-[var(--accent-rose)]/30 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* ── Login Form ── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
              <input
                type="email" required autoFocus
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Password</label>
              <input
                type="password" required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                className="input-field"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="btn-primary w-full py-2.5"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
            <p className="text-center text-sm text-[var(--text-tertiary)]">
              No account?{' '}
              <button type="button" onClick={() => setTab('signup')} className="text-[var(--accent-teal)] hover:underline">
                Sign up
              </button>
            </p>
          </form>
        )}

        {/* ── Sign Up Form ── */}
        {tab === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Full name</label>
              <input
                type="text" required autoFocus
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Dr. Jane Smith"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
              <input
                type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Password</label>
              <input
                type="password" required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="input-field"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="btn-primary w-full py-2.5"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
            <p className="text-center text-sm text-[var(--text-tertiary)]">
              Have an account?{' '}
              <button type="button" onClick={() => setTab('login')} className="text-[var(--accent-teal)] hover:underline">
                Sign in
              </button>
            </p>
          </form>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-2xl leading-none transition-colors"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
}

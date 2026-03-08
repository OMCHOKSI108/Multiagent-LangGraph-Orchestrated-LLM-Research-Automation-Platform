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
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-[400px] mx-auto mt-16 px-5">
      <h2 className="text-xl font-normal mb-5">Login</h2>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="block text-sm text-gray-500 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Your password"
            className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-600"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="border border-gray-800 px-5 py-2 text-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-white"
        >
          {submitting ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <hr className="border-t border-gray-200 my-5" />
      <p className="text-sm">
        No account?{' '}
        <Link href="/signup" className="font-bold hover:underline">Sign Up</Link>
      </p>
    </div>
  );
}

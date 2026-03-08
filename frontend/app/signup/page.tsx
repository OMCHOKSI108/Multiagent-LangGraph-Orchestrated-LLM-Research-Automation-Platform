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
    <div className="max-w-[400px] mx-auto mt-16 px-5">
      <h2 className="text-xl font-normal mb-5">Create Account</h2>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {ok && <p className="text-green-700 text-sm mb-3">{ok}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="block text-sm text-gray-500 mb-1">Name</label>
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-600"
          />
        </div>
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
            minLength={6}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Min 6 characters"
            className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-600"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="border border-gray-800 px-5 py-2 text-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-white"
        >
          {submitting ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      <hr className="border-t border-gray-200 my-5" />
      <p className="text-sm">
        Have an account?{' '}
        <Link href="/login" className="font-bold hover:underline">Login</Link>
      </p>
    </div>
  );
}

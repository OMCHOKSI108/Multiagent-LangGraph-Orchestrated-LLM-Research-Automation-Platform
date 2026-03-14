'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/components/ThemeProvider';
import { useState } from 'react';
import Logo from '../logo.webp';

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  // Hide navbar inside workspace (workspace UI has its own header)
  if (pathname.startsWith('/workspace/')) return null;

  function handleLogout() {
    logout();
    router.push('/');
  }

  const navLink = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={`text-sm ml-4 transition-colors ${
        pathname === href
          ? 'text-emerald-400'
          : 'text-slate-200/80 hover:text-white'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-40 border-b backdrop-blur-xl h-14 marp-nav">
      <div className="section-shell h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <span className="relative h-8 w-8 overflow-hidden rounded-xl bg-slate-900/60 ring-1 ring-slate-700/70 shadow-md">
            <Image
              src={Logo}
              alt="MARP logo"
              fill
              sizes="32px"
              className="object-cover"
              priority
            />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-slate-50">
              MARP
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
              Research Studio
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center">
          {loading ? null : user ? (
            <>
              {navLink('/dashboard', 'Workspaces')}
              {navLink('/agents', 'Agents')}
              {navLink('/memories', 'Memories')}
              {navLink('/profile', 'Profile')}
              {user.role === 'admin' && navLink('/admin', 'Admin')}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="ml-4 theme-toggle inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/70 bg-slate-900/60 text-[11px] text-slate-200 hover:border-emerald-400 hover:text-emerald-300 cursor-pointer"
              >
                {theme === 'dark' ? '☀︎' : '☾'}
              </button>
              <button
                onClick={handleLogout}
                className="ml-6 text-xs font-medium uppercase tracking-[0.16em] text-slate-400 hover:text-rose-300 cursor-pointer border-none bg-transparent"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              {navLink('/login', 'Login')}
              {navLink('/signup', 'Sign Up')}
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden text-xl leading-none text-slate-200"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Open menu"
        >
          ☰
        </button>

        {menuOpen && (
          <div className="sm:hidden absolute inset-x-0 top-14 bg-slate-950/95 border-b border-slate-800 shadow-xl z-50 flex flex-col px-5 pb-5 pt-3 gap-3 text-sm">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => { toggleTheme(); setMenuOpen(false); }}
                  className="mb-1 text-xs text-slate-300 flex items-center gap-2"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/70 bg-slate-900/60 text-[11px]">
                    {theme === 'dark' ? '☀︎' : '☾'}
                  </span>
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="text-slate-100">Workspaces</Link>
                <Link href="/agents" onClick={() => setMenuOpen(false)} className="text-slate-100">Agents</Link>
                <Link href="/memories" onClick={() => setMenuOpen(false)} className="text-slate-100">Memories</Link>
                <Link href="/profile" onClick={() => setMenuOpen(false)} className="text-slate-100">Profile</Link>
                {user.role === 'admin' && <Link href="/admin" onClick={() => setMenuOpen(false)} className="text-slate-100">Admin</Link>}
                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="mt-1 text-rose-300 text-left"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { toggleTheme(); setMenuOpen(false); }}
                  className="mb-1 text-xs text-slate-300 flex items-center gap-2"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/70 bg-slate-900/60 text-[11px]">
                    {theme === 'dark' ? '☀︎' : '☾'}
                  </span>
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                <Link href="/login" onClick={() => setMenuOpen(false)} className="text-slate-100">Login</Link>
                <Link href="/signup" onClick={() => setMenuOpen(false)} className="text-slate-100">Sign Up</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

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

  if (pathname.startsWith('/workspace/')) return null;

  function handleLogout() {
    logout();
    router.push('/');
  }

  const navLink = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={`text-sm ml-4 transition-colors px-2 py-1 rounded-md ${
        pathname === href
          ? 'text-[var(--accent-teal)] bg-[var(--accent-teal-muted)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-40 border-b backdrop-blur-xl h-14 marp-nav">
      <div className="section-shell h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <span className="relative h-8 w-8 overflow-hidden rounded-xl bg-[var(--bg-surface)] ring-1 ring-[var(--border-default)] shadow-md">
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
            <span className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
              MARP
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
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
                className="ml-4 theme-toggle inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] text-[11px] text-[var(--text-muted)] hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)] cursor-pointer"
              >
                {theme === 'dark' ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              <button
                onClick={handleLogout}
                className="ml-6 text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-tertiary)] hover:text-[var(--accent-rose)] cursor-pointer border-none bg-transparent"
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
          className="sm:hidden text-xl leading-none text-[var(--text-muted)]"
          onClick={() => setMenuOpen(v => !v)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMenuOpen(v => !v); } }}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {menuOpen && (
          <div className="sm:hidden absolute inset-x-0 top-14 bg-[var(--bg-surface)]/95 border-b border-[var(--border-default)] shadow-xl z-50 flex flex-col px-5 pb-5 pt-3 gap-3 text-sm">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => { toggleTheme(); setMenuOpen(false); }}
                  className="mb-1 text-xs text-[var(--text-secondary)] flex items-center gap-2"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] text-[11px]">
                    {theme === 'dark' ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    )}
                  </span>
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="text-[var(--text-primary)]">Workspaces</Link>
                <Link href="/agents" onClick={() => setMenuOpen(false)} className="text-[var(--text-primary)]">Agents</Link>
                <Link href="/memories" onClick={() => setMenuOpen(false)} className="text-[var(--text-primary)]">Memories</Link>
                <Link href="/profile" onClick={() => setMenuOpen(false)} className="text-[var(--text-primary)]">Profile</Link>
                {user.role === 'admin' && <Link href="/admin" onClick={() => setMenuOpen(false)} className="text-[var(--text-primary)]">Admin</Link>}
                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="mt-1 text-[var(--accent-rose)] text-left"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { toggleTheme(); setMenuOpen(false); }}
                  className="mb-1 text-xs text-[var(--text-secondary)] flex items-center gap-2"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] text-[11px]">
                    {theme === 'dark' ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    )}
                  </span>
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                <Link href="/login" onClick={() => setMenuOpen(false)} className="text-[var(--text-primary)]">Login</Link>
                <Link href="/signup" onClick={() => setMenuOpen(false)} className="text-[var(--text-primary)]">Sign Up</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

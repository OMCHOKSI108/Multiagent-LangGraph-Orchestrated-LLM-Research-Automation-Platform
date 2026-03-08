'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // Hide navbar inside workspace (full-screen layout)
  if (pathname.startsWith('/workspace/')) return null;

  function handleLogout() {
    logout();
    router.push('/');
  }

  const navLink = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={`text-sm hover:underline ml-4 ${pathname === href ? 'font-bold' : ''}`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="border-b border-gray-200 h-11 px-5 flex items-center justify-between sticky top-0 bg-white z-50">
      <Link href="/" className="font-bold text-base no-underline">
        Deep Research
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
              onClick={handleLogout}
              className="ml-4 text-sm hover:underline cursor-pointer border-none bg-transparent"
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
        className="sm:hidden text-xl leading-none"
        onClick={() => setMenuOpen(v => !v)}
        aria-label="Open menu"
      >
        ☰
      </button>

      {menuOpen && (
        <div className="sm:hidden absolute top-11 right-0 bg-white border border-gray-200 shadow-md z-50 flex flex-col p-4 gap-3 text-sm min-w-[160px]">
          {user ? (
            <>
              <Link href="/dashboard" onClick={() => setMenuOpen(false)}>Workspaces</Link>
              <Link href="/agents" onClick={() => setMenuOpen(false)}>Agents</Link>
              <Link href="/memories" onClick={() => setMenuOpen(false)}>Memories</Link>
              <Link href="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
              {user.role === 'admin' && <Link href="/admin" onClick={() => setMenuOpen(false)}>Admin</Link>}
              <button onClick={() => { setMenuOpen(false); handleLogout(); }}>Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link href="/signup" onClick={() => setMenuOpen(false)}>Sign Up</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

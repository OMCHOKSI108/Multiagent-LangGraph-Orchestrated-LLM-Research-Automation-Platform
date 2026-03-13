'use client';

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

// Three.js graph — imported dynamically to avoid SSR issues
const KnowledgeGraph3D = dynamic(
  () => import('@/components/landing/KnowledgeGraph3D'),
  { ssr: false, loading: () => <div className="w-full h-full" /> }
);

const AuthModal = dynamic(() => import('@/components/landing/AuthModal'), { ssr: false });

type ModalTab = 'login' | 'signup' | null;

const FEATURES = [
  {
    label: 'Query Router',
    desc: 'Smart routing: direct answer, web search, or full multi-agent deep research — chosen automatically per query.',
  },
  {
    label: '30+ Specialized Agents',
    desc: 'Domain intelligence, literature review, gap synthesis, technical verification, IEEE paper generation, and more.',
  },
  {
    label: '7 Scraping Strategies',
    desc: 'Article extraction, academic APIs, PDF scraping, table data, metadata, multi-page crawling, search engine.',
  },
  {
    label: 'Workspace Organisation',
    desc: 'Research sessions grouped by workspace. Full history, live agent feed, sources, reports, and exports.',
  },
  {
    label: 'Slash Commands',
    desc: '/deep, /research, /gatherdata, /search — explicit control over research depth and mode.',
  },
  {
    label: 'IEEE Paper Export',
    desc: 'After research completes, generate a full IEEE-formatted academic paper with citations and methodology.',
  },
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [modal, setModal] = useState<ModalTab>(null);

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">

      {/* ── Top Nav ───────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <span className="text-sm font-semibold tracking-tight">MARP</span>
        <nav className="flex items-center gap-4">
          <button
            onClick={() => setModal('login')}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Login
          </button>
          <button
            onClick={() => setModal('signup')}
            className="text-sm bg-gray-900 text-white px-4 py-1.5 rounded hover:bg-gray-700 transition-colors"
          >
            Sign Up
          </button>
        </nav>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="pt-28 pb-12 px-6 max-w-3xl mx-auto text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Multi-Agentic Research Platform
        </h1>
        <p className="text-base text-gray-600 leading-relaxed max-w-xl mx-auto mb-8">
          A local-first AI research system that routes every query to the right depth —
          from instant answers to full multi-agent academic research with IEEE paper generation.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setModal('signup')}
            className="bg-gray-900 text-white text-sm px-6 py-2.5 rounded hover:bg-gray-700 transition-colors"
          >
            Get Started
          </button>
          <button
            onClick={() => setModal('login')}
            className="border border-gray-300 text-sm px-6 py-2.5 rounded hover:border-gray-600 transition-colors"
          >
            Login
          </button>
        </div>
      </section>

      {/* ── 3D Knowledge Graph ────────────────────────────────────────── */}
      <section className="w-full max-w-3xl mx-auto px-6" style={{ height: '320px' }}>
        <div className="w-full h-full rounded border border-gray-100 bg-gray-50 overflow-hidden">
          <KnowledgeGraph3D />
        </div>
      </section>

      {/* ── Features Grid ─────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-base font-semibold mb-6 text-gray-500 uppercase tracking-wider text-center">
          Platform Capabilities
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <div key={f.label} className="border border-gray-200 rounded p-5">
              <h3 className="text-sm font-semibold mb-1">{f.label}</h3>
              <p className="text-xs text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Slash Commands section ─────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="border border-gray-200 rounded p-6 bg-gray-50">
          <h3 className="text-sm font-semibold mb-3">Slash Command Reference</h3>
          <div className="grid grid-cols-2 gap-y-2 text-xs text-gray-700 font-mono">
            {[
              ['/deep [topic]', 'Full multi-agent deep research'],
              ['/research [topic]', 'Standard research pipeline'],
              ['/gatherdata [topic]', 'Data collection + structuring'],
              ['/search [query]', 'Web search + single scrape'],
              ['/paper', 'Generate IEEE paper from current session'],
              ['/expand [section]', 'Expand a paper section'],
            ].map(([cmd, desc]) => (
              <div key={cmd} className="col-span-2 flex gap-4">
                <span className="text-gray-900 min-w-[180px]">{cmd}</span>
                <span className="text-gray-500">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        MARP — Multi-Agentic Research Platform. Local-first.
      </footer>

      {/* ── Auth Modal ───────────────────────────────────────────────── */}
      {modal && (
        <AuthModal
          defaultTab={modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

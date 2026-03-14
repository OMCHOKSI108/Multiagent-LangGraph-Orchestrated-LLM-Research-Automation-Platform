'use client';

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Logo from '../logo.webp';

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
    <div className="relative isolate min-h-screen text-slate-50">
      {/* Hero & top section */}
      <section className="section-shell pt-20 pb-16 lg:pb-20 flex flex-col lg:flex-row items-center gap-10">
        <div className="flex-1 max-w-xl">
          <div className="mb-6">
            <span className="relative inline-flex h-12 w-12 overflow-hidden rounded-full bg-slate-900/80 ring-1 ring-slate-600/70 shadow-[0_0_0_1px_rgba(15,23,42,0.9)]">
              <Image
                src={Logo}
                alt="MARP logo"
                fill
                sizes="48px"
                className="object-cover"
                priority
              />
            </span>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80 mb-3">
            Multi‑Agent Research Environment
          </p>
          <h1 className="mb-4">
            A studio for<br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
              serious academic work
            </span>
          </h1>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-6 max-w-lg">
            MARP orchestrates dozens of specialized agents – from topic discovery and literature review to
            verification and LaTeX report drafting – so you can stay focused on the research question, not the tooling.
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <button
              onClick={() => {
                window.location.href = 'https://multiagent-lang-graph-orchestrated.vercel.app/login';
              }}
              className="btn-primary"
            >
              Start a workspace
            </button>
            <button
              onClick={() => {
                window.location.href = 'https://multiagent-lang-graph-orchestrated.vercel.app/login';
              }}
              className="btn-ghost"
            >
              Continue existing research
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Local‑first option with offline models
            </span>
            <span>IEEE‑ready LaTeX exports</span>
            <span>Designed for long‑form projects</span>
          </div>
        </div>

        <div className="flex-1 w-full max-w-md lg:max-w-lg surface-card p-4 md:p-5 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.18)_0,_transparent_60%),radial-gradient(circle_at_bottom,_rgba(79,70,229,0.18)_0,_transparent_60%)] opacity-70" />
          <div className="relative h-[260px] md:h-[300px] rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-950/80">
            <KnowledgeGraph3D />
          </div>
          <div className="relative mt-4 grid grid-cols-2 gap-3 text-[11px] text-slate-300">
            <div>
              <p className="font-semibold text-slate-100 mb-1">Live agent graph</p>
              <p className="text-slate-400">
                Watch orchestration flow through topic discovery, literature review, gap synthesis, verification, and reporting.
              </p>
            </div>
            <div className="border border-slate-700/60 rounded-xl px-3 py-2 bg-slate-900/70 font-mono">
              <p className="text-emerald-300 mb-1">/deep climate risk</p>
              <p className="text-slate-400">Launches a full multi‑stage research pipeline on the current workspace.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="section-shell pb-14">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">What MARP orchestrates</p>
            <h2 className="text-2xl md:text-3xl font-semibold mt-1 mb-2">From question to structured output</h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              The platform is opinionated around the academic workflow: discover, understand, verify, and then write. Each
              capability below is powered by a specialized agent or sub‑graph.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.label}
              className="surface-card p-4 md:p-5 flex flex-col justify-between hover:border-emerald-400/50 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.4)] transition-colors"
            >
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-slate-50 mb-1.5">{f.label}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{f.desc}</p>
              </div>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-600/60 to-transparent" />
            </div>
          ))}
        </div>
      </section>

      {/* Slash commands */}
      <section className="section-shell pb-16">
        <div className="surface-card p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Command palette</p>
              <h3 className="text-lg font-semibold text-slate-50 mt-1 mb-1">Slash commands you will actually use</h3>
              <p className="text-xs md:text-sm text-slate-300 max-w-xl">
                The chat input doubles as a command line. Short slashes map cleanly onto the underlying graphs so
                you always know what the system is doing.
              </p>
            </div>
            <button
              onClick={() => {
                window.location.href = 'https://multiagent-lang-graph-orchestrated.vercel.app/login';
              }}
              className="self-start md:self-auto btn-primary"
            >
              Open research workspace
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] md:text-xs font-mono text-slate-200">
            {[
              ['/deep [topic]', 'Full multi‑agent deep research across all stages'],
              ['/research [topic]', 'Standard research pipeline, balanced depth'],
              ['/gatherdata [topic]', 'Heavier on data collection & structuring'],
              ['/search [query]', 'Focused web search + one‑shot scrape'],
              ['/paper', 'Compile structured findings into IEEE‑style paper'],
              ['/expand [section]', 'Iterate on a specific report section'],
            ].map(([cmd, desc]) => (
              <div
                key={cmd}
                className="flex gap-3 items-start rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-2.5"
              >
                <span className="text-emerald-300 min-w-[120px]">{cmd}</span>
                <span className="text-slate-300">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-5 text-center text-[11px] text-slate-500">
        <span className="font-semibold text-slate-300">MARP</span> · Multi‑Agentic Research Platform · Built for
        researchers, not dashboards.
      </footer>

      {/* Auth Modal */}
      {modal && (
        <AuthModal
          defaultTab={modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

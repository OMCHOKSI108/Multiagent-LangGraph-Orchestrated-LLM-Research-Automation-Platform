'use client';

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Logo from '../logo.webp';

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
    icon: '',
  },
  {
    label: '30+ Specialized Agents',
    desc: 'Domain intelligence, literature review, gap synthesis, technical verification, IEEE paper generation, and more.',
    icon: '',
  },
  {
    label: '7 Scraping Strategies',
    desc: 'Article extraction, academic APIs, PDF scraping, table data, metadata, multi-page crawling, search engine.',
    icon: '',
  },
  {
    label: 'Workspace Organisation',
    desc: 'Research sessions grouped by workspace. Full history, live agent feed, sources, reports, and exports.',
    icon: '',
  },
  {
    label: 'Slash Commands',
    desc: '/deep, /research, /gatherdata, /search — explicit control over research depth and mode.',
    icon: '',
  },
  {
    label: 'Real-time Collaboration',
    desc: 'After research completes, generate a full IEEE-formatted academic paper with citations and methodology.',
    icon: '',
  },
];

const COMMANDS = [
  ['/deep [topic]', 'Full multi‑agent deep research across all stages'],
  ['/research [topic]', 'Standard research pipeline, balanced depth'],
  ['/gatherdata [topic]', 'Heavier on data collection & structuring'],
  ['/search [query]', 'Focused web search + one‑shot scrape'],
  ['/paper', 'Compile structured findings into IEEE‑style paper'],
  ['/visualize [data]', 'Generate a chart from data'],
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [modal, setModal] = useState<ModalTab>(null);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  if (loading) return null;

  return (
    <div className="relative isolate min-h-screen">
      <div className="bg-ambient" />
      
      {/* Hero Section */}
      <section className="section-shell pt-20 pb-16 lg:pb-24 flex flex-col lg:flex-row items-center gap-12 lg:gap-16 relative">
        {/* Hero content */}
        <div className="flex-1 max-w-xl relative z-10">
          {/* Logo */}
          <div className="mb-8">
            <span className="relative inline-flex h-28 w-28 overflow-hidden rounded-full glow-teal">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-teal)]/20 to-[var(--accent-blue)]/20 rounded-full" />
              <Image
                src={Logo}
                alt="MARP logo"
                fill
                sizes="112px"
                className="object-cover"
                priority
              />
            </span>
          </div>
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--accent-teal)]/20 bg-[var(--accent-teal)]/5 mb-6">
            <span className="h-2 w-2 rounded-full bg-[var(--accent-teal)] animate-pulse" />
            <span className="text-xs font-medium text-[var(--accent-teal)] tracking-wide uppercase">
              Multi‑Agent Research Environment
            </span>
          </div>
          
          {/* Headline */}
          <h1 className="mb-6">
            A studio for<br className="hidden sm:block" />
            <span className="gradient-text">serious academic work</span>
          </h1>
          
          {/* Description */}
          <p className="text-base md:text-lg leading-relaxed mb-8 max-w-lg text-[var(--text-muted)]">
            MARP orchestrates dozens of specialized agents – from topic discovery and literature review to
            verification and LaTeX report drafting – so you can stay focused on the research question, not the tooling.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <button
              onClick={() => setModal('signup')}
              className="btn-primary"
            >
              Start a workspace
            </button>
            <button
              onClick={() => setModal('login')}
              className="btn-ghost"
            >
              Continue existing research
            </button>
          </div>
          
          {/* Status indicators */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-[var(--text-tertiary)]">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--accent-teal)] animate-pulse" />
              Local‑first option with offline models
            </span>
            <span>IEEE‑ready LaTeX exports</span>
            <span>Designed for long‑form projects</span>
          </div>
        </div>

        {/* Hero visual */}
        <div className="flex-1 w-full max-w-md lg:max-w-lg relative z-10">
          <div className="surface-card p-4 md:p-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-glow-teal opacity-50" />
            
            <div className="relative h-[280px] md:h-[340px] rounded-2xl overflow-hidden border border-[var(--accent-teal)]/20 bg-[var(--bg-primary)]/80">
              <KnowledgeGraph3D />
            </div>
            
            <div className="relative mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]/60">
                <p className="font-semibold mb-2 text-[var(--text-primary)]">Live agent graph</p>
                <p className="text-sm text-[var(--text-muted)]">
                  Watch orchestration flow through topic discovery, literature review, gap synthesis, verification, and reporting.
                </p>
              </div>
              <div className="p-4 rounded-xl border border-[var(--accent-teal)]/20 bg-[var(--accent-teal)]/5 font-mono">
                <p className="text-[var(--accent-teal)] mb-2">/deep climate risk</p>
                <p className="text-sm text-[var(--text-muted)]">
                  Launches a full multi‑stage research pipeline on the current workspace.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="section-shell pb-20 relative z-10">
        <div className="flex items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-3 text-[var(--accent-teal)]">
              What MARP orchestrates
            </p>
            <h2 className="text-2xl md:text-4xl font-bold mb-3 text-[var(--text-primary)]">From question to structured output</h2>
            <p className="text-base max-w-2xl text-[var(--text-muted)]">
              The platform is opinionated around the academic workflow: discover, understand, verify, and then write. Each
              capability below is powered by a specialized agent or sub‑graph.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={f.label}
              className="surface-card p-6 flex flex-col justify-between group cursor-default"
              style={{
                background: i % 3 === 0 
                  ? 'linear-gradient(135deg, var(--accent-teal) 3%, var(--bg-card) 100%)' 
                  : i % 3 === 1 
                  ? 'linear-gradient(135deg, var(--accent-blue) 3%, var(--bg-card) 100%)'
                  : 'linear-gradient(135deg, var(--accent-violet) 3%, var(--bg-card) 100%)'
              }}
            >
              <div className="mb-4">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">{f.label}</h3>
                <p className="text-sm leading-relaxed text-[var(--text-muted)]">{f.desc}</p>
              </div>
              <div 
                className="h-px w-full" 
                style={{
                  background: i % 3 === 0 
                    ? 'linear-gradient(90deg, transparent, var(--accent-teal) 30%, transparent)' 
                    : i % 3 === 1 
                    ? 'linear-gradient(90deg, transparent, var(--accent-blue) 30%, transparent)'
                    : 'linear-gradient(90deg, transparent, var(--accent-violet) 30%, transparent)'
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Slash Commands Section */}
      <section className="section-shell pb-24 relative z-10">
        <div className="surface-card p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-teal)]/5 via-transparent to-[var(--accent-blue)]/5" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-2 text-[var(--accent-teal)]">
                Command palette
              </p>
              <h3 className="text-xl md:text-2xl font-bold mb-2 text-[var(--text-primary)]">
                Slash commands you will actually use
              </h3>
              <p className="text-sm max-w-xl text-[var(--text-muted)]">
                The chat input doubles as a command line. Short slashes map cleanly onto the underlying graphs so
                you always know what the system is doing.
              </p>
            </div>
            <button
              onClick={() => setModal('signup')}
              className="btn-primary self-start md:self-auto"
            >
              Open research workspace
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COMMANDS.map(([cmd, desc]) => (
              <div
                key={cmd}
                className="flex gap-4 items-start p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]/50 hover:border-[var(--accent-teal)]/30 hover:bg-[var(--accent-teal)]/3 transition-all duration-300"
              >
                <span className="text-sm font-mono font-semibold min-w-[130px] text-[var(--accent-teal)]">
                  {cmd}
                </span>
                <span className="text-sm text-[var(--text-muted)]">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 text-center relative z-10 border-[var(--border-default)] bg-[var(--bg-primary)]/80">
        <p className="text-sm text-[var(--text-tertiary)]">
          <span className="font-bold gradient-text-teal">MARP</span>
          {' · '}Multi‑Agentic Research Platform{' · '}Built for researchers, not dashboards.
        </p>
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

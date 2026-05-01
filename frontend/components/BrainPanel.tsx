'use client';

import { useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BrainThought {
  id: string;
  step: string;
  content: string;
  timestamp: number;
}

interface BrainPanelProps {
  thoughts: BrainThought[];
  isActive: boolean;
}

// ─── Step Config ─────────────────────────────────────────────────────────────

const STEP_CONFIG: Record<string, { label: string; colorVar: string; bgVar: string; borderVar: string }> = {
  analyzing:     { label: 'Analyzing',      colorVar: '--status-info',     bgVar: '--glow-blue',       borderVar: '--accent-blue' },
  hypothesizing: { label: 'Hypothesizing',  colorVar: '--status-warning',  bgVar: '--glow-amber',      borderVar: '--accent-amber' },
  planning:      { label: 'Planning',         colorVar: '--accent-emerald',  bgVar: '--glow-emerald',    borderVar: '--accent-emerald' },
  images:        { label: 'Image Strategy',  colorVar: '--accent-violet',   bgVar: '--glow-violet',     borderVar: '--accent-violet' },
  structure:     { label: 'Structuring',     colorVar: '--accent-rose',    bgVar: '--glow-violet',     borderVar: '--accent-rose' },
  reflecting:    { label: 'Reflecting',     colorVar: '--accent-teal',    bgVar: '--glow-teal',        borderVar: '--accent-teal' },
  default:       { label: 'Thinking',        colorVar: '--accent-violet',   bgVar: '--glow-violet',     borderVar: '--accent-violet' },
};

function getStepConfig(step: string) {
  return STEP_CONFIG[step.toLowerCase()] || STEP_CONFIG.default;
}

function BrainIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

// ─── Animated dots (thinking indicator) ──────────────────────────────────────

function ThinkingDots({ colorVar = '--accent-violet' }: { colorVar?: string }) {
  return (
    <span className="inline-flex gap-0.5 items-center ml-2">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1 h-1 rounded-full animate-bounce"
          style={{
            backgroundColor: `var(${colorVar})`,
            animationDelay: `${i * 150}ms`,
            animationDuration: '900ms',
          }}
        />
      ))}
    </span>
  );
}

// ─── Single thought card ──────────────────────────────────────────────────────

function ThoughtCard({ thought, index }: { thought: BrainThought; index: number }) {
  const [expanded, setExpanded] = useState(index < 3);
  const cfg = getStepConfig(thought.step);
  const preview = thought.content.slice(0, 120);
  const hasMore = thought.content.length > 120;

  return (
    <div
      className="rounded-xl border mb-2 overflow-hidden transition-all duration-300 hover:scale-[1.005] hover:border-[var(--accent-teal)]/30"
      style={{
        backgroundColor: `color-mix(in srgb, var(${cfg.bgVar}) 10%, transparent)`,
        borderColor: `color-mix(in srgb, var(${cfg.borderVar}) 20%, transparent)`,
        animationDelay: `${index * 40}ms`,
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0" style={{ color: `var(${cfg.colorVar})` }}><BrainIcon className="w-4 h-4" /></span>
          <span
            className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ 
              backgroundColor: `color-mix(in srgb, var(${cfg.borderVar}) 20%, transparent)`,
              color: `var(${cfg.colorVar})`
            }}
          >
            {cfg.label}
          </span>
          {!expanded && (
            <span className="text-[11px] truncate text-[var(--text-tertiary)]">
              {preview}
            </span>
          )}
          {expanded && <ThinkingDots colorVar={cfg.colorVar} />}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-[10px] text-[var(--text-tertiary)]">
            {new Date(thought.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <svg
            className="w-3.5 h-3.5 transition-transform duration-200 text-[var(--text-tertiary)]"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div
          className="px-4 pb-3 text-xs leading-relaxed whitespace-pre-wrap text-[var(--text-secondary)]"
          style={{ borderTop: `1px solid color-mix(in srgb, var(${cfg.borderVar}) 20%, transparent)` }}
        >
          <div className="pt-2">{thought.content}</div>
        </div>
      )}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyBrain({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center px-6">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{
          background: `radial-gradient(circle, color-mix(in srgb, var(--accent-violet) 15%, transparent) 0%, transparent 70%)`,
          border: `1px solid color-mix(in srgb, var(--accent-violet) 20%, transparent)`,
        }}
      >
        <span style={{ color: 'var(--accent-violet)' }}><BrainIcon className="w-7 h-7" /></span>
      </div>
      {isActive ? (
        <>
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            Brain warming up…
          </p>
          <p className="text-xs mt-1 text-[var(--text-tertiary)]">
            Thoughts will appear here as the AI reasons through your research.
          </p>
          <ThinkingDots />
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-[var(--text-muted)]">
            No brain activity yet
          </p>
          <p className="text-xs mt-1 text-[var(--text-tertiary)]">
            Start a research session to watch the AI think in real time.
          </p>
        </>
      )}
    </div>
  );
}

// ─── Main BrainPanel ─────────────────────────────────────────────────────────

export default function BrainPanel({ thoughts, isActive }: BrainPanelProps) {
  const [filterStep, setFilterStep] = useState<string>('all');

  const stepsSeen = Array.from(new Set(thoughts.map(t => t.step)));
  const filtered = filterStep === 'all' ? thoughts : thoughts.filter(t => t.step === filterStep);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--accent-violet)' }}><BrainIcon className="w-4 h-4" /></span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            AI Reasoning
          </span>
          {thoughts.length > 0 && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-mono"
              style={{ backgroundColor: 'color-mix(in srgb, var(--accent-violet) 15%, transparent)', color: 'var(--accent-violet)' }}
            >
              {thoughts.length} thoughts
            </span>
          )}
          {isActive && <ThinkingDots />}
        </div>

        {/* Step filter */}
        {stepsSeen.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterStep('all')}
              className="text-[10px] px-2 py-1 rounded-lg transition-colors"
              style={{
                backgroundColor: filterStep === 'all' ? 'color-mix(in srgb, var(--accent-violet) 20%, transparent)' : 'transparent',
                color: filterStep === 'all' ? 'var(--accent-violet)' : 'var(--text-tertiary)',
                border: filterStep === 'all' ? '1px solid color-mix(in srgb, var(--accent-violet) 30%, transparent)' : '1px solid transparent',
              }}
            >
              All
            </button>
            {stepsSeen.map(step => {
              const cfg = getStepConfig(step);
              return (
                <button
                  key={step}
                  onClick={() => setFilterStep(step)}
                  className="text-[10px] px-2 py-1 rounded-lg transition-colors"
                  style={{
                    backgroundColor: filterStep === step ? `color-mix(in srgb, var(${cfg.bgVar}) 20%, transparent)` : 'transparent',
                    color: filterStep === step ? `var(${cfg.colorVar})` : 'var(--text-tertiary)',
                    border: filterStep === step ? `1px solid color-mix(in srgb, var(${cfg.borderVar}) 30%, transparent)` : '1px solid transparent',
                  }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Thoughts list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-0">
        {filtered.length === 0 ? (
          <EmptyBrain isActive={isActive} />
        ) : (
          <>
            {filtered.map((thought, i) => (
              <ThoughtCard key={thought.id} thought={thought} index={i} />
            ))}
            {isActive && (
              <div
                className="flex items-center gap-2 p-3 rounded-xl border mt-2"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent-violet) 5%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--accent-violet) 15%, transparent)',
                }}
              >
                <span style={{ color: 'var(--accent-violet)' }}><BrainIcon className="w-4 h-4" /></span>
                <span className="text-xs text-[var(--accent-violet)]">
                  Thinking…
                </span>
                <ThinkingDots />
              </div>
            )}
          </>
        )}
      </div>

      {/* Summary footer (when done) */}
      {!isActive && thoughts.length > 0 && (
        <div
          className="flex-shrink-0 px-4 py-2 border-t text-center"
          style={{ borderColor: 'var(--border-default)' }}
        >
          <span className="text-[11px] text-[var(--text-tertiary)]">
            Reasoning complete · {thoughts.length} thought{thoughts.length !== 1 ? 's' : ''} logged
          </span>
        </div>
      )}
    </div>
  );
}

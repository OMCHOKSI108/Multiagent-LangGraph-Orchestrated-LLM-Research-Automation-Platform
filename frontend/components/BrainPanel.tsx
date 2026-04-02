'use client';

import { useState, useEffect } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BrainThought {
  id: string;
  step: string;
  content: string;
  timestamp: number;
}

interface BrainPanelProps {
  thoughts: BrainThought[];
  isActive: boolean;   // true while research is running
}

// ─── Step Config ─────────────────────────────────────────────────────────────

const STEP_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string; border: string }> = {
  analyzing:     { emoji: '🔍', label: 'Analyzing',     color: '#60A5FA', bg: 'rgba(96,165,250,0.08)',   border: 'rgba(96,165,250,0.2)' },
  hypothesizing: { emoji: '💡', label: 'Hypothesizing', color: '#FBBF24', bg: 'rgba(251,191,36,0.08)',   border: 'rgba(251,191,36,0.2)' },
  planning:      { emoji: '📋', label: 'Planning',      color: '#34D399', bg: 'rgba(52,211,153,0.08)',   border: 'rgba(52,211,153,0.2)' },
  images:        { emoji: '🖼️', label: 'Image Strategy', color: '#A78BFA', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
  structure:     { emoji: '🏗️', label: 'Structuring',   color: '#F472B6', bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.2)' },
  reflecting:    { emoji: '🌀', label: 'Reflecting',    color: '#00F5D4', bg: 'rgba(0,245,212,0.08)',    border: 'rgba(0,245,212,0.2)' },
  default:       { emoji: '🧠', label: 'Thinking',      color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)',   border: 'rgba(139,92,246,0.2)' },
};

function getStepConfig(step: string) {
  return STEP_CONFIG[step.toLowerCase()] || STEP_CONFIG.default;
}

// ─── Animated dots (thinking indicator) ──────────────────────────────────────

function ThinkingDots() {
  return (
    <span className="inline-flex gap-0.5 items-center ml-2">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1 h-1 rounded-full animate-bounce"
          style={{
            backgroundColor: '#8B5CF6',
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
  const [expanded, setExpanded] = useState(index < 3); // first 3 auto-open
  const cfg = getStepConfig(thought.step);
  const preview = thought.content.slice(0, 120);
  const hasMore = thought.content.length > 120;

  return (
    <div
      className="rounded-xl border mb-2 overflow-hidden transition-all duration-300 hover:scale-[1.005]"
      style={{
        backgroundColor: cfg.bg,
        borderColor: cfg.border,
        animationDelay: `${index * 40}ms`,
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base select-none flex-shrink-0">{cfg.emoji}</span>
          <span
            className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: cfg.border, color: cfg.color }}
          >
            {cfg.label}
          </span>
          {!expanded && (
            <span className="text-[11px] truncate" style={{ color: '#6B7280' }}>
              {preview}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-[10px]" style={{ color: '#4B5563' }}>
            {new Date(thought.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <svg
            className="w-3.5 h-3.5 transition-transform duration-200"
            style={{ color: '#6B7280', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div
          className="px-4 pb-3 text-xs leading-relaxed whitespace-pre-wrap"
          style={{ color: '#D1D5DB', borderTop: `1px solid ${cfg.border}` }}
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
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-2xl"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
          border: '1px solid rgba(139,92,246,0.2)',
        }}
      >
        🧠
      </div>
      {isActive ? (
        <>
          <p className="text-sm font-medium" style={{ color: '#D1D5DB' }}>
            Brain warming up…
          </p>
          <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
            Thoughts will appear here as the AI reasons through your research.
          </p>
          <ThinkingDots />
        </>
      ) : (
        <>
          <p className="text-sm font-medium" style={{ color: '#9CA3AF' }}>
            No brain activity yet
          </p>
          <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
            Start a research session to watch the AI think in real time.
          </p>
        </>
      )}
    </div>
  );
}

// ─── Main BrainPanel ──────────────────────────────────────────────────────────

export default function BrainPanel({ thoughts, isActive }: BrainPanelProps) {
  const [filterStep, setFilterStep] = useState<string>('all');

  const stepsSeen = Array.from(new Set(thoughts.map(t => t.step)));
  const filtered = filterStep === 'all' ? thoughts : thoughts.filter(t => t.step === filterStep);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🧠</span>
          <span className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>
            AI Reasoning
          </span>
          {thoughts.length > 0 && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-mono"
              style={{ backgroundColor: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}
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
                backgroundColor: filterStep === 'all' ? 'rgba(139,92,246,0.2)' : 'transparent',
                color: filterStep === 'all' ? '#8B5CF6' : '#6B7280',
                border: filterStep === 'all' ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
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
                    backgroundColor: filterStep === step ? cfg.bg : 'transparent',
                    color: filterStep === step ? cfg.color : '#6B7280',
                    border: filterStep === step ? `1px solid ${cfg.border}` : '1px solid transparent',
                  }}
                >
                  {cfg.emoji} {cfg.label}
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
                  backgroundColor: 'rgba(139,92,246,0.05)',
                  borderColor: 'rgba(139,92,246,0.15)',
                }}
              >
                <span className="text-base">🧠</span>
                <span className="text-xs" style={{ color: '#8B5CF6' }}>
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
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <span className="text-[11px]" style={{ color: '#4B5563' }}>
            Reasoning complete · {thoughts.length} thought{thoughts.length !== 1 ? 's' : ''} logged
          </span>
        </div>
      )}
    </div>
  );
}

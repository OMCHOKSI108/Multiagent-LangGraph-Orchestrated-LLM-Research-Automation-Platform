'use client';

import { useEffect, useState, useRef } from 'react';
import { API_ROOT } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BrainThought {
  id: string;
  step: string;
  content: string;
  timestamp: number;
}

interface LLMProvider {
  available: boolean;
  provider_name?: string;
  model_name?: string;
  error?: string;
}

interface LLMStatus {
  mode?: string;
  provider?: LLMProvider;
  config?: Record<string, unknown>;
  error?: string;
}

interface UsageStats {
  total_tokens?: number;
  total_cost?: number;
  agents?: Record<string, unknown>;
  error?: string;
}

interface LLMStatusBarProps {
  authToken?: string;
  compact?: boolean;
  thoughts?: BrainThought[];
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n?: number) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

async function fetchJson<T>(path: string, token?: string): Promise<T | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['x-auth-token'] = token;
    const res = await fetch(`${API_ROOT}${path}`, { headers });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LLMStatusBar({ 
  authToken, 
  compact = false, 
  thoughts = [], 
  className = '' 
}: LLMStatusBarProps) {
  const [status, setStatus] = useState<LLMStatus | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const [s, u] = await Promise.all([
      fetchJson<LLMStatus>('/api/agents/llm-status', authToken),
      fetchJson<UsageStats>('/api/agents/usage', authToken),
    ]);
    setStatus(s);
    setUsage(u);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [authToken]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-xs text-[var(--text-tertiary)] animate-pulse ${className}`}>
        <div className="h-2 w-2 rounded-full bg-gray-400" />
        <span>Loading LLM status...</span>
      </div>
    );
  }

  const mode = status?.mode || 'UNKNOWN';
  const provider = status?.provider;
  const isOnline = mode === 'ONLINE' || mode === 'HYBRID';
  const isOffline = mode === 'OFFLINE';
  const isReasoning = thoughts.length > 0;

  const dotColor = isReasoning ? 'var(--accent-violet)' : isOnline ? 'var(--accent-emerald)' : isOffline ? 'var(--accent-rose)' : 'var(--text-tertiary)';
  const modeColor = isReasoning ? 'var(--accent-violet)' : isOnline ? 'var(--accent-emerald)' : isOffline ? 'var(--accent-rose)' : 'var(--text-muted)';

  const providerName = provider?.provider_name || (isOffline ? 'Ollama' : '—');
  const modelName = provider?.model_name || '';
  const tokens = usage?.total_tokens;

  const latestThoughts = thoughts.slice(-3).reverse();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border transition-all duration-300 hover:bg-[var(--bg-surface-hover)] active:scale-95 ${className}`}
        style={{
          backgroundColor: showDropdown ? 'var(--bg-surface)' : 'var(--bg-elevated)',
          borderColor: showDropdown ? 'var(--accent-teal)' : 'var(--border-default)',
        }}
      >
        {/* Status dot */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            {(isOnline || isReasoning) && (
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: dotColor }}
              />
            )}
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: dotColor }}
            />
          </span>
          {!compact && (
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider" style={{ color: modeColor }}>
              {isReasoning ? 'REASONING' : mode}
            </span>
          )}
        </div>

        {/* Divider */}
        <span style={{ color: 'var(--border-default)' }}>|</span>

        {/* Provider + Model */}
        <span className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
          {providerName}
          {!compact && modelName && (
            <span style={{ color: 'var(--text-tertiary)' }}> · {modelName.split('/').pop()}</span>
          )}
        </span>

        {/* Token usage */}
        {tokens != null && tokens > 0 && (
          <>
            <span style={{ color: 'var(--border-default)' }} className="hidden sm:inline">|</span>
            <span className="text-[11px] hidden sm:flex items-center gap-1" style={{ color: 'var(--accent-violet)' }}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {fmt(tokens)}
            </span>
          </>
        )}

        <svg 
          className={`w-3 h-3 transition-transform duration-300 ml-1 ${showDropdown ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-tertiary)' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Popover */}
      {showDropdown && (
        <div 
          className="absolute right-0 top-full mt-2 w-72 rounded-xl border z-50 overflow-hidden animate-fade-in"
          style={{ 
            backgroundColor: 'var(--bg-elevated)', 
            borderColor: 'var(--border-default)',
            boxShadow: 'var(--shadow-card-hover)'
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>System Intelligence</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-blue) 10%, transparent)', color: 'var(--accent-blue)' }}>Active</span>
          </div>

          <div className="p-3 space-y-3">
            {/* Thinking Status */}
            {isReasoning ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent-violet)' }} />
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>Current Reasoning</span>
                </div>
                <div className="space-y-2">
                  {latestThoughts.map((t, i) => (
                    <div 
                      key={t.id} 
                      className="p-2 rounded-lg space-y-1"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)', borderWidth: 1 }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent-violet)' }}>{t.step}</span>
                        <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      <p className="text-[10px] line-clamp-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        {t.content}
                      </p>
                    </div>
                  ))}
                  {thoughts.length > 3 && (
                    <button className="w-full py-1.5 text-[9px] transition-colors" style={{ color: 'var(--text-tertiary)' }}>
                      View all {thoughts.length} steps in Brain tab →
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>No active reasoning session</p>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-default)' }}>
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)' }}>
                <p className="text-[9px] uppercase font-bold tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Status</p>
                <p className="text-[11px] font-medium" style={{ color: modeColor }}>
                  {mode}
                </p>
              </div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)' }}>
                <p className="text-[9px] uppercase font-bold tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Consumption</p>
                <p className="text-[11px] font-medium" style={{ color: 'var(--accent-violet)' }}>
                  {fmt(tokens)} tokens
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  mode?: string;             // OFFLINE | ONLINE | HYBRID
  provider?: LLMProvider;
  config?: Record<string, any>;
  error?: string;
}

interface UsageStats {
  total_tokens?: number;
  total_cost?: number;
  agents?: Record<string, any>;
  error?: string;
}

interface LLMStatusBarProps {
  /** JWT token for authenticated API calls */
  authToken?: string;
  /** Compact mode (single line, no label) */
  compact?: boolean;
  /** List of real-time reasoning thoughts */
  thoughts?: BrainThought[];
  /** Custom class */
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
    const id = setInterval(load, 30_000); // refresh every 30s
    return () => clearInterval(id);
  }, [authToken]);

  // Click outside listener
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
      <div className={`flex items-center gap-1.5 ${className}`}>
        <span
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: '#374151' }}
        />
        <span className="text-[11px]" style={{ color: '#4B5563' }}>Checking LLM…</span>
      </div>
    );
  }

  const mode = status?.mode || 'UNKNOWN';
  const provider = status?.provider;
  const isOnline = mode === 'ONLINE' || mode === 'HYBRID';
  const isOffline = mode === 'OFFLINE';
  const isReasoning = thoughts.length > 0;

  const dotColor = isOnline ? '#22c55e' : isOffline ? '#ef4444' : '#6B7280';
  const modeColor = isOnline ? '#86efac' : isOffline ? '#fca5a5' : '#9CA3AF';
  const modeLabel = isOnline ? 'ONLINE' : isOffline ? 'OFFLINE' : mode;

  const providerName = provider?.provider_name || (isOffline ? 'Ollama' : '—');
  const modelName = provider?.model_name || '';
  const tokens = usage?.total_tokens;

  const latestThoughts = thoughts.slice(-3).reverse();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border transition-all duration-300 hover:bg-white/5 active:scale-95 ${className}`}
        style={{
          backgroundColor: showDropdown ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.3)',
          borderColor: showDropdown ? 'rgba(0,245,212,0.3)' : 'rgba(255,255,255,0.08)',
        }}
      >
        {/* Status dot */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            {(isOnline || isReasoning) && (
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: isReasoning ? '#8B5CF6' : dotColor }}
              />
            )}
            <span
              className="relative inline-flex rounded-full h-2 w-2 shadow-[0_0_8px_rgba(34,197,94,0.3)]"
              style={{ backgroundColor: isReasoning ? '#8B5CF6' : dotColor }}
            />
          </span>
          {!compact && (
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider" style={{ color: isReasoning ? '#A78BFA' : modeColor }}>
              {isReasoning ? 'REASONING' : modeLabel}
            </span>
          )}
        </div>

        {/* Divider */}
        <span style={{ color: '#374151' }}>|</span>

        {/* Provider + Model */}
        <span className="text-[11px] flex items-center gap-1.5" style={{ color: '#9CA3AF' }}>
          {providerName}
          {!compact && modelName && (
            <span style={{ color: '#6B7280' }}> · {modelName.split('/').pop()}</span>
          )}
        </span>

        {/* Token usage */}
        {tokens != null && tokens > 0 && (
          <>
            <span style={{ color: '#374151' }} className="hidden sm:inline">|</span>
            <span className="text-[11px] hidden sm:flex items-center gap-1" style={{ color: '#8B5CF6' }}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {fmt(tokens)}
            </span>
          </>
        )}

        <svg 
          className={`w-3 h-3 transition-transform duration-300 ml-1 ${showDropdown ? 'rotate-180' : ''}`}
          style={{ color: '#4B5563' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Popover */}
      {showDropdown && (
        <div 
          className="absolute right-0 top-full mt-2 w-72 rounded-xl border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300"
          style={{ 
            backgroundColor: '#111827', 
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5), 0 0 20px rgba(139,92,246,0.1)'
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">System Intelligence</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Active</span>
          </div>

          <div className="p-3 space-y-3">
            {/* Thinking Status */}
            {isReasoning ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse" />
                  <span className="text-[11px] font-medium text-[#D1D5DB]">Current Reasoning</span>
                </div>
                <div className="space-y-2">
                  {latestThoughts.map((t, i) => (
                    <div 
                      key={t.id} 
                      className="p-2 rounded-lg bg-white/[0.03] border border-white/5 space-y-1"
                      style={{ opacity: 1 - (i * 0.25) }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#A78BFA]">{t.step}</span>
                        <span className="text-[8px] text-[#4B5563]">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      <p className="text-[10px] text-[#9CA3AF] line-clamp-2 leading-relaxed">
                        {t.content}
                      </p>
                    </div>
                  ))}
                  {thoughts.length > 3 && (
                    <button className="w-full py-1.5 text-[9px] text-[#4B5563] hover:text-[#8B5CF6] transition-colors">
                      View all {thoughts.length} steps in Brain tab →
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-[11px] text-[#6B7280]">No active reasoning session</p>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
              <div className="p-2 rounded-lg bg-white/[0.02]">
                <p className="text-[9px] text-[#4B5563] uppercase font-bold tracking-wider mb-1">Status</p>
                <p className="text-[11px] font-medium text-green-400 flex items-center gap-1">
                  {modeLabel}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.02]">
                <p className="text-[9px] text-[#4B5563] uppercase font-bold tracking-wider mb-1">Consumption</p>
                <p className="text-[11px] font-medium text-[#8B5CF6] flex items-center gap-1">
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

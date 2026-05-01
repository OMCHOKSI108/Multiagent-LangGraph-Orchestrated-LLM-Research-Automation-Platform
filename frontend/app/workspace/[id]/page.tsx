'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  workspaces as wsApi,
  events as eventsApi,
  chat as chatApi,
  exportApi,
  API_ROOT,
  type ResearchSession,
  type ResearchEvent,
  type ResearchResult,
} from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PremiumCharts from '@/components/PremiumCharts';
import LLMStatusBar from '@/components/LLMStatusBar';
import LoadingScreen from '@/components/LoadingScreen';
import ConfirmModal from '@/components/ConfirmModal';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseSlashCommand(q: string): { cmd: string; args: string } | null {
  const m = q.match(/^\/(research|deepresearch|gatherdata|help|history|profile)\s*(.*)/i);
  if (!m) return null;
  return { cmd: m[1].toLowerCase(), args: m[2].trim() };
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function normalizeImageUrl(url?: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${API_ROOT}${url}`;
  return `${API_ROOT}/${url}`;
}

function summarizeResearch(markdown?: string, fallbackTitle?: string): string {
  const text = (markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_\-\[\]\(\)`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) {
    return `Research completed for "${fallbackTitle || 'your topic'}". Open the Report tab for full details.`;
  }
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 3);
  const summary = sentences.join(' ').slice(0, 480).trim();
  return `Research completed. Easy summary:\n\n${summary}${summary.endsWith('.') ? '' : '.'}\n\nOpen the Report tab for full paper details.`;
}

function flattenObjectPreview(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value !== 'object') return String(value);

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v != null && (typeof v !== 'string' || v.trim().length > 0))
    .slice(0, 10);

  if (entries.length === 0) return '';

  const lines = entries.map(([k, v]) => {
    if (Array.isArray(v)) return `• ${k}: ${v.length} items`;
    if (v && typeof v === 'object') return `• ${k}: ${Object.keys(v as Record<string, unknown>).length} fields`;
    return `• ${k}: ${String(v).slice(0, 120)}`;
  });
  return lines.join('\n');
}

function extractLatexFromResult(result: ResearchResult | null): string {
  if (!result) return '';
  const findings = (result as any)?.final_state?.findings || (result as any)?.findings || {};
  const candidates = [
    (result as any)?.latex_source,
    (result as any)?.final_state?.latex_source,
    findings?.multi_stage_report?.latex_source,
    findings?.multi_stage_report?.response?.latex_source,
    findings?.latex_generation?.latex_source,
    findings?.latex_generation?.response,
    findings?.scientific_writing?.latex_source,
  ];
  const hit = candidates.find((c) => typeof c === 'string' && c.includes('\\'));
  return typeof hit === 'string' ? hit : '';
}

type RawRow = {
  agent: string;
  field: string;
  type: string;
  preview: string;
};

function stringifyPreview(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `${value.length} items`;
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    return `{${keys.slice(0, 6).join(', ')}${keys.length > 6 ? ', ...' : ''}}`;
  }
  return String(value);
}

function buildRawRows(findings: Record<string, any> | null | undefined): RawRow[] {
  if (!findings || typeof findings !== 'object') return [];
  const rows: RawRow[] = [];
  const LIMIT = 600;

  for (const [agent, payload] of Object.entries(findings)) {
    if (rows.length >= LIMIT) break;
    if (payload == null) {
      rows.push({ agent, field: 'value', type: 'null', preview: '' });
      continue;
    }

    if (typeof payload !== 'object') {
      rows.push({
        agent,
        field: 'value',
        type: typeof payload,
        preview: stringifyPreview(payload).slice(0, 220),
      });
      continue;
    }

    const obj = payload as Record<string, unknown>;
    const entries = Object.entries(obj);
    if (entries.length === 0) {
      rows.push({ agent, field: 'value', type: 'object', preview: '{}' });
      continue;
    }

    for (const [field, value] of entries) {
      if (rows.length >= LIMIT) break;
      const rowType = Array.isArray(value) ? 'array' : value == null ? 'null' : typeof value;
      rows.push({
        agent,
        field,
        type: rowType,
        preview: stringifyPreview(value).slice(0, 220),
      });
    }
  }

  return rows;
}

function buildLiveRawRows(feedEvents: ResearchEvent[], liveSources: any[]): RawRow[] {
  const rows: RawRow[] = [];

  for (const ev of feedEvents) {
    rows.push({
      agent: ev.stage || ev.category || 'event',
      field: 'message',
      type: 'event',
      preview: (ev.message || '').slice(0, 220),
    });

    if (ev.details && typeof ev.details === 'object') {
      for (const [k, v] of Object.entries(ev.details as Record<string, unknown>)) {
        rows.push({
          agent: ev.stage || ev.category || 'event',
          field: String(k),
          type: Array.isArray(v) ? 'array' : typeof v,
          preview: stringifyPreview(v).slice(0, 220),
        });
      }
    }
  }

  for (const src of liveSources) {
    rows.push({
      agent: src.source_type || src.domain || 'source',
      field: 'title',
      type: 'source',
      preview: String(src.title || '').slice(0, 220),
    });
    if (src.url) {
      rows.push({
        agent: src.source_type || src.domain || 'source',
        field: 'url',
        type: 'source',
        preview: String(src.url).slice(0, 220),
      });
    }
    if (src.description || src.citation_text) {
      rows.push({
        agent: src.source_type || src.domain || 'source',
        field: 'description',
        type: 'source',
        preview: String(src.description || src.citation_text || '').slice(0, 220),
      });
    }
  }

  return rows.slice(0, 800);
}

// ─── Types ───────────────────────────────────────────────────────────────────

type TabId = 'feed' | 'sources' | 'report' | 'raw';
type MsgRole = 'user' | 'bot' | 'system';

interface Msg {
  id: string | number;
  role: MsgRole;
  text: string;
  ts: number;
  kind?: 'chat' | 'thinking';
  thoughtStep?: string;
  sources?: any[];
  search_mode?: string;
}

// ─── Icons (inline SVGs) ─────────────────────────────────────────────────────

const Icons = {
  back: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  chat: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  feed: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  source: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  report: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  data: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  send: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  ),
  stop: () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  ),
  agent: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  running: () => (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  success: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  brain: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  trash: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
};

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'feed', label: 'Live Feed', icon: <Icons.feed /> },
  { id: 'sources', label: 'Sources', icon: <Icons.source /> },
  { id: 'raw', label: 'Raw Data', icon: <Icons.data /> },
  { id: 'report', label: 'Report', icon: <Icons.report /> },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function Spinner() {
  return <span className="spinner" />;
}

// ─── Icons (additional) ─────────────────────────────────────────────────────

const PanelIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
  </svg>
);

const MenuIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const RightPanelIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
  </svg>
);

// ─── Chat Bubble ─────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);

  if (msg.kind === 'thinking') {
    return (
      <div className="mb-4 animate-fadeIn">
        <details className="rounded-xl border border-[var(--accent-violet)]/25 bg-[var(--accent-violet)]/6 overflow-hidden">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm text-[var(--accent-violet)] font-medium">
            Deep Thinking {msg.thoughtStep ? `- ${msg.thoughtStep}` : ''}
          </summary>
          <div className="px-4 pb-3 pt-1 text-sm leading-relaxed whitespace-pre-wrap text-[var(--text-secondary)] border-t border-[var(--accent-violet)]/20">
            {msg.text}
          </div>
        </details>
        <div className="text-[11px] mt-1 text-[var(--text-tertiary)]">
          AI Brain - {new Date(msg.ts).toLocaleTimeString()}
        </div>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`group mb-4 ${isUser ? 'text-right' : 'text-left'} animate-fadeIn`}>
      <div
        className={`relative inline-block max-w-[85%] text-left px-4 py-3 text-sm leading-relaxed
          ${isUser
            ? 'bg-gradient-to-r from-[var(--accent-teal)]/20 to-[var(--accent-blue)]/10 border border-[var(--accent-teal)]/30 text-[var(--text-primary)]'
            : msg.role === 'system'
              ? 'bg-[var(--accent-violet)]/10 border border-[var(--accent-violet)]/30 text-[var(--text-muted)]'
              : 'bg-[var(--bg-surface)]/80 border border-[var(--border-default)] text-[var(--text-muted)]'}`}
        style={{ borderRadius: '16px' }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose-chat">{msg.text}</ReactMarkdown>

        {!isUser && msg.role !== 'system' && (
          <button
            onClick={handleCopy}
            className={`absolute -right-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg ${copied ? 'text-[var(--accent-teal)]' : 'text-[var(--text-tertiary)] hover:bg-[var(--btn-ghost-bg)]'}`}
            title="Copy response"
          >
            {copied ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            )}
          </button>
        )}
      </div>
      <div className="text-[11px] mt-1 text-[var(--text-tertiary)]">
        {isUser ? 'You' : msg.role === 'system' ? 'System' : 'AI'} ·{' '}
        {new Date(msg.ts).toLocaleTimeString()}
      </div>
    </div>
  );
}

// ─── Feed Item ────────────────────────────────────────────────────────────────

function FeedItem({ ev, index }: { ev: ResearchEvent; index: number }) {
  const sev = ev.severity || 'info';
  const isSource = ev.category === 'source';
  const detailsPreview = ev.details ? flattenObjectPreview(ev.details) : '';

  const statusConfig = {
    error: { icon: 'error', colorClass: 'text-[var(--status-error)]', bgClass: 'bg-[var(--status-error)]/10', borderClass: 'border-[var(--status-error)]/20' },
    warning: { icon: 'info', colorClass: 'text-[var(--status-warning)]', bgClass: 'bg-[var(--status-warning)]/10', borderClass: 'border-[var(--status-warning)]/20' },
    source: { icon: 'source', colorClass: 'text-[var(--accent-teal)]', bgClass: 'bg-[var(--accent-teal)]/10', borderClass: 'border-[var(--accent-teal)]/20' },
    agent: { icon: 'agent', colorClass: 'text-[var(--accent-blue)]', bgClass: 'bg-[var(--accent-blue)]/10', borderClass: 'border-[var(--accent-blue)]/20' },
    info: { icon: 'info', colorClass: 'text-[var(--accent-violet)]', bgClass: 'bg-[var(--accent-violet)]/10', borderClass: 'border-[var(--accent-violet)]/20' },
  };

  const config = statusConfig[sev as keyof typeof statusConfig] || statusConfig.info;

  return (
    <div
      className={`p-3 mb-2 rounded-xl border transition-all duration-300 hover:scale-[1.01] ${config.bgClass} ${config.borderClass}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-lg ${config.borderClass}`}>
          <span className={config.colorClass}>
            {sev === 'error' ? <Icons.error /> : sev === 'warning' ? <Icons.info /> : isSource ? <Icons.source /> : <Icons.agent />}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {ev.stage && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-[var(--accent-teal)]/10 text-[var(--accent-teal)]">
                {ev.stage}
              </span>
            )}
            <span className={`text-xs font-medium ${config.colorClass}`}>
              {ev.message || ev.category || 'Event'}
            </span>
          </div>
          <div className="text-[11px] text-[var(--text-tertiary)]">
            {new Date(ev.created_at).toLocaleTimeString()}
          </div>
          {detailsPreview && (
            <pre className="mt-2 text-[10px] p-2 rounded-lg overflow-x-auto bg-black/30 text-[var(--text-muted)]">
              {detailsPreview}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function RawDataGrid({
  findings,
  feedEvents,
  liveSources,
}: {
  findings: Record<string, any> | null | undefined;
  feedEvents: ResearchEvent[];
  liveSources: any[];
}) {
  const structuredRows = buildRawRows(findings);
  const liveRows = buildLiveRawRows(feedEvents, liveSources);
  const rows = structuredRows.length > 0 ? structuredRows : liveRows;

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--bg-surface)] flex items-center justify-center mb-4 border border-[var(--border-default)]">
          <span className="text-[var(--text-tertiary)]"><Icons.data /></span>
        </div>
        <p className="text-sm text-[var(--text-tertiary)]">No raw data available yet.</p>
        <p className="text-xs mt-1 text-[var(--text-tertiary)] opacity-70">Live events and source rows will appear here while research runs.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-default)] overflow-hidden bg-black/30">
      <div className="px-3 py-2 border-b border-[var(--border-default)] text-[11px] text-[var(--text-muted)] flex items-center justify-between">
        <span>{structuredRows.length > 0 ? 'Structured RAW output' : 'Live RAW stream'}</span>
        <span>{rows.length} rows</span>
      </div>
      <div className="max-h-[65vh] overflow-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="sticky top-0 bg-[var(--bg-surface)] border-b border-[var(--border-default)]">
            <tr>
              <th className="px-3 py-2 text-[var(--text-primary)] font-semibold">Agent</th>
              <th className="px-3 py-2 text-[var(--text-primary)] font-semibold">Field</th>
              <th className="px-3 py-2 text-[var(--text-primary)] font-semibold">Type</th>
              <th className="px-3 py-2 text-[var(--text-primary)] font-semibold">Preview</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={`${row.agent}-${row.field}-${idx}`} className="border-b border-[var(--border-default)]/50 hover:bg-white/[0.03]">
                <td className="px-3 py-2 align-top text-[var(--accent-teal)] font-medium whitespace-nowrap">{row.agent}</td>
                <td className="px-3 py-2 align-top text-[var(--text-muted)] whitespace-nowrap">{row.field}</td>
                <td className="px-3 py-2 align-top text-[var(--accent-blue)] whitespace-nowrap">{row.type}</td>
                <td className="px-3 py-2 align-top text-[var(--text-secondary)] break-words">{row.preview || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Sources Panel ────────────────────────────────────────────────────────────

const SOURCE_AGENTS: [string, string, string | null][] = [
  ['literature_review', 'Literature', 'paper_list'],
  ['slr', 'Systematic Review', 'paper_list'],
  ['historical_review', 'Historical Sources', 'literature_review_sources'],
  ['web_scraper', 'Web Sources', 'sources'],
  ['data_scraper', 'Scraped Data', 'results'],
  ['google_news', 'News', 'results'],
  ['domain_intelligence', 'Domain Intelligence', 'domain_search_results'],
  ['topic_discovery', 'Topic Discovery', 'topic_suggestions'],
  ['gap_synthesis', 'Gap Analysis', null],
  ['scoring', 'Quality Score', null],
  ['fact_check', 'Fact Check', null],
  ['bias_detection', 'Bias Detection', null],
  ['visualization', 'Visualization', 'images_metadata'],
  ['innovation', 'Innovation', null],
  ['technical_verification', 'Technical Verification', null],
  ['chat_sources', 'Chat References', 'sources'],
];

interface SourceItem {
  title?: string;
  url?: string;
  authors?: string | string[];
  abstract?: string;
  summary?: string;
  content?: string;
  snippet?: string;
  relevance?: number;
  domain?: string;
  novelty_angle?: string;
  estimated_complexity?: string;
}

function SourcesPanel({
  resultJson,
  feedEvents,
  liveSources,
}: {
  resultJson: ResearchResult | null;
  feedEvents?: any[];
  liveSources?: any[];
}) {
  if (!resultJson && (!feedEvents || feedEvents.length === 0) && (!liveSources || liveSources.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--bg-surface)] flex items-center justify-center mb-4 border border-[var(--border-default)]">
          <span className="text-[var(--text-tertiary)]"><Icons.source /></span>
        </div>
        <p className="text-sm text-[var(--text-tertiary)]">No sources discovered yet.</p>
        <p className="text-xs mt-1 text-[var(--text-tertiary)] opacity-70">Sources will appear as agents discover them.</p>
      </div>
    );
  }

  const findings = resultJson?.final_state?.findings || resultJson?.findings || {};
  const sections: JSX.Element[] = [];

  if ((feedEvents && feedEvents.length > 0) || (liveSources && liveSources.length > 0)) {
    const realtimeSources = (feedEvents || []).filter(e => e.category === 'source').map(e => ({
      title: e.details?.title || e.message,
      url: e.details?.url,
      abstract: e.details?.description || e.details?.snippet,
      domain: e.details?.domain || e.details?.source_type,
    }));
    const structuredLiveSources = (liveSources || []).map(s => ({
      title: s.title || s.url || 'Source',
      url: s.url,
      abstract: s.description || s.citation_text || '',
      domain: s.domain || s.source_type || 'web',
    }));
    const mergedSources = [...realtimeSources, ...structuredLiveSources];

    if (mergedSources.length > 0) {
      const uniqueSources = Array.from(new Map(mergedSources.map(s => [s.url || s.title, s])).values());

      sections.push(
        <div key="realtime_sources" className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-teal)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-teal)]"></span>
            </span>
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">
              Live Discovered Sources ({uniqueSources.length})
            </h4>
          </div>
          {uniqueSources.slice(0, 50).map((item, i) => (
            <div
              key={`rt-${i}`}
              className="p-4 mb-3 rounded-xl border transition-all duration-300 hover:border-[var(--accent-teal)]/30 bg-[var(--accent-teal)]/3 border-[var(--accent-teal)]/15"
            >
              <p className="font-semibold mb-1 text-sm text-[var(--text-primary)]">
                [{i + 1}] {item.title || item.url || 'Live Source'}
              </p>
              {item.domain && (
                <p className="text-xs font-medium mb-2 text-[var(--accent-teal)]">
                  Source: {item.domain}
                </p>
              )}
              {item.abstract && (
                <p className="text-xs mb-2 leading-relaxed text-[var(--text-muted)]">
                  {item.abstract.slice(0, 250)}...
                </p>
              )}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium hover:underline text-[var(--accent-teal)]"
                >
                  Open →
                </a>
              )}
            </div>
          ))}
        </div>
      );
    }
  }

  for (const [key, label, listKey] of SOURCE_AGENTS) {
    const agent = findings[key];
    if (!agent) continue;
    const resp = (agent.response ?? agent) as Record<string, unknown> | string;
    if (!resp) continue;

    if (listKey && typeof resp === 'object' && resp !== null && Array.isArray((resp as Record<string, unknown>)[listKey])) {
      const items = (resp as Record<string, SourceItem[]>)[listKey];
      if (!items.length) continue;

      if (key === 'visualization') {
        sections.push(
          <div key={key} className="mb-8">
            <h4 className="text-sm font-semibold mb-4 pb-2 border-b border-[var(--border-default)]/50 text-[var(--text-primary)]">
              {label} ({items.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.map((img: any, i: number) => (
                <div key={i} className="rounded-xl overflow-hidden bg-black/40 border border-[var(--border-default)]/50 group">
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={normalizeImageUrl(img.local || img.url || img.original)}
                      alt={img.description || img.title || `Research visualization: ${img.source_url || 'data chart'}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Image+Load+Error'; }}
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] text-[var(--text-muted)] line-clamp-2 italic">
                      {img.caption || 'Research visualization component'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        continue;
      }

      sections.push(
        <div key={key} className="mb-4">
          <h4 className="text-sm font-semibold mb-3 pb-2 border-b border-[var(--border-default)]/50 text-[var(--text-primary)]">
            {label} ({items.length})
          </h4>
          {items.slice(0, 15).map((item, i) => (
            <div
              key={i}
              className="p-3 mb-2 rounded-xl border transition-all duration-300 hover:border-[var(--accent-blue)]/30 bg-[var(--bg-surface)] border-[var(--border-default)]"
            >
              <p className="font-semibold mb-1 text-sm text-[var(--text-primary)]">
                [{i + 1}] {item.title || item.url || 'Item'}
              </p>
              {item.domain && (
                <p className="text-xs font-medium mb-1 text-[var(--accent-blue)]">
                  Domain: {item.domain}
                </p>
              )}
              {item.authors && <p className="text-xs mb-1 text-[var(--text-tertiary)]">{String(item.authors).slice(0, 120)}</p>}
              {item.novelty_angle && (
                <p className="text-xs mb-1 leading-relaxed text-[var(--accent-violet)]">
                  Angle: {item.novelty_angle}
                </p>
              )}
              {(item.abstract || item.summary || item.content || item.snippet) && (
                <p className="text-xs mb-1 leading-relaxed text-[var(--text-muted)]">
                  {(item.abstract || item.summary || item.content || item.snippet || '').slice(0, 250)}...
                </p>
              )}
              {item.estimated_complexity && (
                <span className="inline-block px-2 py-0.5 rounded text-[10px] mt-1 bg-[var(--accent-violet)]/10 text-[var(--accent-violet)]">
                  Complexity: {item.estimated_complexity}
                </span>
              )}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs block mt-2 hover:underline text-[var(--accent-teal)]"
                >
                  Open →
                </a>
              )}
            </div>
          ))}
        </div>
      );
    } else {
      const txt = typeof resp === 'string' ? resp : flattenObjectPreview(resp);
      if (txt.length < 10) continue;
      sections.push(
        <div key={key} className="mb-4">
          <h4 className="text-sm font-semibold mb-2 pb-2 text-[var(--text-primary)] border-b border-[var(--border-default)]">
            {label}
          </h4>
          <div className="p-3 text-xs leading-relaxed rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-muted)]">
            {txt.slice(0, 800)}{txt.length > 800 ? '...' : ''}
          </div>
        </div>
      );
    }
  }

  return sections.length > 0
    ? <>{sections}</>
    : <p className="text-sm text-[var(--text-tertiary)]">No structured sources. See Report tab.</p>;
}

function SectionEditor({
  section,
  wsId,
  onUpdate,
  onError
}: {
  section: any;
  wsId: string;
  onUpdate: () => void;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleEdit() {
    if (!instruction.trim() || busy) return;
    setBusy(true);
    try {
      await wsApi.editSection(wsId, section.research_id, section.id, instruction);
      setEditing(false);
      setInstruction('');
      onUpdate();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      onError('Edit failed: ' + message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="group relative pb-8 mb-8 last:border-0 last:mb-0 border-b border-[var(--border-default)]/50">
      <div className="prose-research mb-4">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
      </div>

      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105 bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] border border-[var(--accent-teal)]/20"
          >
            Edit with AI
          </button>
        ) : (
          <div className="w-full p-4 rounded-xl mt-2 bg-[var(--accent-teal)]/5 border border-[var(--accent-teal)]/20">
            <p className="text-[10px] font-mono uppercase tracking-wider mb-2 text-[var(--accent-teal)]">
              AI Edit Instruction
            </p>
            <textarea
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              placeholder="e.g., 'Make this section more technical' or 'Add a table about...'"
              className="w-full p-3 rounded-lg text-sm mb-2 outline-none transition-all duration-300 bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)]"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 text-xs rounded-lg transition-colors text-[var(--text-tertiary)]"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                className="btn-primary px-3 py-1.5 text-xs"
                disabled={busy || !instruction.trim()}
              >
                {busy ? 'Processing...' : 'Refine Section'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const wsId = params.id as string;

  const [wsName, setWsName] = useState('Workspace');
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [curSession, setCurSession] = useState<ResearchSession | null>(null);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showSlashHint, setShowSlashHint] = useState(false);

  const [running, setRunning] = useState(false);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [abort, setAbort] = useState(false);
  const abortRef = useRef(false);
  const [statusText, setStatusText] = useState('');

  const [brainThoughts, setBrainThoughts] = useState<any[]>([]);

  const [tab, setTab] = useState<TabId>('feed');
  const [feedEvents, setFeedEvents] = useState<ResearchEvent[]>([]);
  const [liveSources, setLiveSources] = useState<any[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const [resultJson, setResultJson] = useState<ResearchResult | null>(null);
  const [reportMd, setReportMd] = useState('');
  const reportBufferRef = useRef('');
  const reportThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [latexSource, setLatexSource] = useState('');
  const [compileBusy, setCompileBusy] = useState(false);
  const [sections_data, setSectionsData] = useState<any[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  const chatLogRef = useRef<HTMLDivElement>(null);

  const [showDrawer, setShowDrawer] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [rightPanelWidth, setRightPanelWidth] = useState(42);
  const isResizingRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const percentage = (1 - (e.clientX / window.innerWidth)) * 100;
      if (percentage > 15 && percentage < 85) {
        setRightPanelWidth(percentage);
      }
    };
    const handleMouseUp = () => { isResizingRef.current = false; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  const loadWorkspace = useCallback(async () => {
    try {
      const data = await wsApi.get(wsId);
      setWsName(data.workspace?.name || 'Workspace');
      setSessions(data.sessions || []);
    } catch { /* ignore */ }
  }, [wsId]);

  useEffect(() => { if (user && wsId) loadWorkspace(); }, [user, wsId, loadWorkspace]);

  useEffect(() => {
    chatLogRef.current?.scrollTo({ top: chatLogRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [feedEvents]);

  useEffect(() => {
    const latex = extractLatexFromResult(resultJson);
    if (latex) setLatexSource(latex);
  }, [resultJson]);

  useEffect(() => {
    if (!running || !runStartedAt) return;
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - runStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [running, runStartedAt]);

  function addMsg(text: string, role: MsgRole, id?: string) {
    setMsgs(prev => [...prev, { id: id || crypto.randomUUID(), role, text, ts: Date.now() }]);
  }

  function addThinkingMsg(thought: { id: string; step: string; content: string; timestamp: number }) {
    const msgId = `thinking_${thought.id}`;
    setMsgs(prev => {
      if (prev.some(m => String(m.id) === msgId)) return prev;
      return [
        ...prev,
        {
          id: msgId,
          role: 'system',
          text: thought.content,
          ts: thought.timestamp,
          kind: 'thinking',
          thoughtStep: thought.step,
        },
      ];
    });
  }

  function clearPanels() {
    setFeedEvents([]);
    setLiveSources([]);
    setResultJson(null);
    setReportMd('');
    reportBufferRef.current = '';
    if (reportThrottleRef.current) {
      clearTimeout(reportThrottleRef.current);
      reportThrottleRef.current = null;
    }
    setLatexSource('');
    setSectionsData([]);
    setBrainThoughts([]);
  }

  const stopEventPolling = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (sseReconnectTimerRef.current) {
      clearTimeout(sseReconnectTimerRef.current);
      sseReconnectTimerRef.current = null;
    }
    setSseConnected(false);
  }, []);

  const eventSourceRef = useRef<EventSource | null>(null);
  const sseReconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startEventPolling = useCallback((sid: number) => {
    stopEventPolling();

    const connectWithFreshToken = async () => {
      try {
        const tok = await eventsApi.getSSEToken(sid);
        if (!tok?.token || abortRef.current) {
          setSseConnected(false);
          return;
        }
        const streamUrl = `${API_ROOT}/api/events/stream-public/${sid}?token=${encodeURIComponent(tok.token)}`;
        const es = new EventSource(streamUrl);
        eventSourceRef.current = es;

        es.onopen = () => {
          setSseConnected(true);
        };

        es.onmessage = (evt) => {
          try {
            const payload = JSON.parse(evt.data);
            const { type, message, category, stage, severity, details, timestamp } = payload;

            if (type === 'thought' || category === 'brain_thought' || details?.is_brain_thought) {
              const thought = {
                id: payload.event_id || `bt_${Date.now()}`,
                step: details?.brain_step || 'analyzing',
                content: details?.thought_content || message || '',
                timestamp: Date.now(),
              };
              setBrainThoughts(prev => {
                if (prev.some(t => t.id === thought.id)) return prev;
                return [...prev, thought];
              });
              addThinkingMsg(thought);
            }
            else if (type === 'report' || category === 'report_chunk') {
              const chunk = details?.chunk || message || '';
              if (chunk) {
                reportBufferRef.current += chunk;
                // Throttle React state updates to every 500ms to prevent UI jank
                if (!reportThrottleRef.current) {
                  reportThrottleRef.current = setTimeout(() => {
                    setReportMd(reportBufferRef.current);
                    reportThrottleRef.current = null;
                  }, 500);
                }
                setTab('report');
              }
            }
            else if (type === 'event' || type === 'stage') {
              const incoming = {
                id: payload.id || Date.now(),
                message: message || category || 'Progress Update',
                stage,
                severity,
                category: category || 'stage',
                details,
                created_at: timestamp || new Date().toISOString(),
              } as any;

              setFeedEvents(prev => {
                const last = prev.length ? prev[prev.length - 1] : null;
                const isDuplicateStage = !!last
                  && incoming.category === 'stage'
                  && last.category === 'stage'
                  && (incoming.stage || '').toLowerCase() === (last.stage || '').toLowerCase();
                if (isDuplicateStage) {
                  return prev;
                }
                return [...prev, incoming];
              });
            }
            else if (type === 'sources' && Array.isArray(payload.sources)) {
              setLiveSources(prev => {
                const merged = [...prev, ...payload.sources];
                return Array.from(new Map(merged.map((s: any) => [s.url || `${s.domain}-${s.title}`, s])).values());
              });
            }
            else if (type === 'done') {
              setSseConnected(false);
              es.close();
            }
          } catch (err) { }
        };

        es.onerror = () => {
          setSseConnected(false);
          es.close();
          eventSourceRef.current = null;
          // Don't auto-reconnect here — the polling loop will get a fresh token
        };

        // Auto-reconnect with fresh token every 50 seconds (before 60s expiry)
        if (sseReconnectTimerRef.current) clearTimeout(sseReconnectTimerRef.current);
        sseReconnectTimerRef.current = setTimeout(() => {
          es.close();
          connectWithFreshToken();
        }, 50_000);
      } catch { }
    };

    connectWithFreshToken();
  }, [stopEventPolling]);

  async function pollResearch(sid: number) {
    setRunning(true);
    if (!runStartedAt) setRunStartedAt(Date.now());
    abortRef.current = false;
    setAbort(false);
    startEventPolling(sid);

    const MAX_POLLS = 600; // 30 min at 3s intervals
    let pollCount = 0;
    let consecutiveErrors = 0;

    while (!abortRef.current && pollCount < MAX_POLLS) {
      await sleep(3000);
      if (abortRef.current) break;

      try {
        const s = await wsApi.getResearchStatus(wsId, sid);
        consecutiveErrors = 0; // Reset on success

        if (s.status === 'completed') {
          addMsg(summarizeResearch(s.report_markdown, s.topic || s.title), 'bot');
          if (s.result_json) setResultJson(s.result_json);
          if (s.report_markdown) setReportMd(s.report_markdown);
          setStatusText('Completed');
          try {
            const sres = await wsApi.getSections(wsId, sid);
            setSectionsData(sres.sections || []);
          } catch { }
          break;
        }

        if (s.status === 'waiting') {
          setStatusText('Waiting for Selection');
          const finalState: any = s.result_json?.final_state;
          const suggestions = finalState?.topic_suggestions || finalState?.findings?.topic_discovery?.topic_suggestions || [];
          if (suggestions?.length > 0) {
            const list = suggestions.map((t: any, i: number) => `**${i + 1}. ${t.title}**\n*${t.novelty_angle || ''}*`).join('\n\n');
            addMsg(`Angles found:\n\n${list}\n\nType \`/deepresearch <topic>\` to proceed.`, 'bot');
            if (s.result_json) setResultJson(s.result_json);
            setTab('sources');
          }
          break;
        }

        if (s.status === 'failed') {
          addMsg('Research failed.', 'bot');
          setStatusText('Failed');
          break;
        }
        if (s.status === 'cancelled') {
          addMsg('Research stopped by user.', 'bot');
          setStatusText('Cancelled');
          break;
        }
        if (s.current_stage) setStatusText(s.current_stage);
        pollCount++;
      } catch {
        consecutiveErrors++;
        pollCount++;
        if (consecutiveErrors >= 5) {
          console.error('[Workspace] Stopping polling after 5 consecutive errors');
          break;
        }
      }
    }

    if (pollCount >= MAX_POLLS) {
      console.warn('[Workspace] Polling reached maximum iterations (30 min). Stopping.');
    }

    setRunning(false);
    setRunStartedAt(null);
    stopEventPolling();
    await loadWorkspace();
  }

  async function hydrateHistoricalSessionData(sessionId: number) {
    try {
      const [eventsHistory, sourcesHistory] = await Promise.all([
        eventsApi.list(sessionId),
        eventsApi.sources(sessionId),
      ]);

      const normalizedEvents = (eventsHistory || []).map((ev: any) => ({
        id: ev.id || ev.event_id || Date.now(),
        message: ev.message || ev.category || 'Progress Update',
        stage: ev.stage,
        severity: ev.severity,
        category: ev.category || 'stage',
        details: ev.details || {},
        created_at: ev.created_at || ev.timestamp || new Date().toISOString(),
      }));

      const historicalThoughts = normalizedEvents
        .filter((ev: any) => ev.category === 'brain_thought' || ev.details?.is_brain_thought)
        .map((ev: any, idx: number) => ({
          id: ev.id || `bt_hist_${idx}`,
          step: ev.details?.brain_step || ev.stage || 'analyzing',
          content: ev.details?.thought_content || ev.message || '',
          timestamp: new Date(ev.created_at).getTime() || Date.now(),
        }));

      setFeedEvents(normalizedEvents.filter((ev: any) => ev.category !== 'brain_thought'));
      setBrainThoughts(historicalThoughts);
      setMsgs(prev => {
        const existing = new Set(prev.map(m => String(m.id)));
        const thinkingMsgs = historicalThoughts
          .map((t: any) => ({
            id: `thinking_${t.id}`,
            role: 'system' as const,
            text: t.content,
            ts: t.timestamp,
            kind: 'thinking' as const,
            thoughtStep: t.step,
          }))
          .filter((m: any) => !existing.has(String(m.id)));
        return [...prev, ...thinkingMsgs];
      });
      setLiveSources(Array.isArray(sourcesHistory) ? sourcesHistory : []);
    } catch {
      // Historical hydration is best-effort and should not block session load.
    }
  }

  async function loadSession(s: ResearchSession) {
    setCurSession(s);
    setMsgs([]);
    clearPanels();
    setStatusText('');
    addMsg(`Loading: **${s.topic || s.title}**`, 'system');

    try {
      const full = await wsApi.getResearchStatus(wsId, s.id);
      addMsg(full.topic || full.title || 'Research', 'user');
      await hydrateHistoricalSessionData(s.id);

      if (full.status === 'completed') {
        addMsg(summarizeResearch(full.report_markdown, full.topic), 'bot');
        if (full.result_json) setResultJson(full.result_json);
        if (full.report_markdown) setReportMd(full.report_markdown);
        setStatusText('Completed');
        try {
          const sres = await wsApi.getSections(wsId, s.id);
          setSectionsData(sres.sections || []);
        } catch { }
        setTab('report');
      } else if (full.status === 'running' || full.status === 'queued') {
        setStatusText('Reconnecting...');
        await pollResearch(s.id);
      } else if (full.status === 'cancelled') {
        setStatusText('Cancelled');
        addMsg('Research was cancelled.', 'bot');
      }
    } catch { }
  }

  async function dispatchResearch(topic: string, depth: string) {
    clearPanels();
    setRunning(true);
    setRunStartedAt(Date.now());
    const msgId = crypto.randomUUID();
    addMsg('Analyzing query...', 'bot', msgId);

    try {
      const res = await wsApi.startResearch(wsId, topic, depth, curSession?.id);
      if (res.instant_reply) {
        setMsgs(p => p.filter(m => m.id !== msgId));
        addMsg(res.instant_reply!, 'bot');
        setRunning(false);
        return;
      }
      const sid = res.session_id!;
      setCurSession(prev => ({
        ...(prev || {} as any),
        id: sid,
        workspace_id: wsId,
        topic,
        title: topic,
        status: 'running',
        depth,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any));
      setMsgs(p => p.map(m => m.id === msgId ? { ...m, text: `Job #${sid} created (${depth}). Working...` } : m));
      await loadWorkspace();
      await pollResearch(sid);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setMsgs(p => p.filter(m => m.id !== msgId));
      addMsg('Error: ' + message, 'bot');
      setRunning(false);
    }
  }

  async function handleExport(format: 'markdown' | 'json') {
    if (!curSession) return;
    setExporting(format);
    try {
      const blob = await exportApi.download(curSession.id, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-${curSession.id}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      addMsg('Export failed: ' + message, 'bot');
    } finally {
      setExporting(null);
    }
  }

  async function handleDownloadPdf() {
    if (!curSession) return;
    setExporting('pdf');
    try {
      const blob = await exportApi.downloadPdf(curSession.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-${curSession.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      addMsg('PDF download failed: ' + message, 'bot');
    } finally {
      setExporting(null);
    }
  }

  async function handleDownloadLatex() {
    if (!curSession) return;
    setExporting('latex');
    try {
      const blob = await exportApi.downloadLatex(curSession.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-${curSession.id}.tex`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      addMsg('LaTeX download failed: ' + message, 'bot');
    } finally {
      setExporting(null);
    }
  }

  async function handleCompilePdf() {
    if (!curSession || compileBusy) return;

    const content = (latexSource || reportMd || '').trim();
    if (!content) {
      addMsg('Nothing to compile yet. Generate the report first.', 'bot');
      return;
    }

    setCompileBusy(true);
    try {
      const blob = await exportApi.compileToPdf(curSession.id, content);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-${curSession.id}-compiled.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addMsg('PDF compiled successfully.', 'system');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      addMsg('PDF compile failed: ' + message, 'bot');
    } finally {
      setCompileBusy(false);
    }
  }

  async function handleDeleteWorkspace() {
    try {
      await wsApi.delete(wsId);
      router.push('/dashboard');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      addMsg('Delete failed: ' + message, 'bot');
    }
  }

  async function handleSend() {
    const q = chatInput.trim();
    if (!q || running) return;
    setChatInput('');
    addMsg(q, 'user');
    const slash = parseSlashCommand(q);
    if (slash) {
      const dm: any = { research: 'standard', deepresearch: 'deep', gatherdata: 'gather' };
      await dispatchResearch(slash.args || 'Research', dm[slash.cmd] || 'standard');
    } else {
      await dispatchResearch(q, 'standard');
    }
  }

  async function handleCancel() {
    if (!curSession || !wsId) return;
    addMsg('Stopping research...', 'system');
    try {
      await wsApi.cancel(wsId, curSession.id);
      abortRef.current = true;
      setRunning(false);
      setRunStartedAt(null);
      addMsg('Research stopped by user', 'bot');
      stopEventPolling();
      await loadWorkspace();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      addMsg('Failed to stop: ' + message, 'bot');
    }
  }

  if (authLoading) return <LoadingScreen message="Loading workspace..." />;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden workspace-root">
      <div className="bg-ambient" />

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Workspace"
        description={`Are you sure you want to delete "${wsName}"? This action cannot be undone and will remove all research sessions and data.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => { setShowDeleteModal(false); handleDeleteWorkspace(); }}
        onCancel={() => setShowDeleteModal(false)}
      />
      <header className="h-14 px-4 flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-surface)]/90 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDrawer(!showDrawer)}
            aria-label="Toggle history drawer"
            className="p-2 rounded-lg hover:bg-[var(--btn-ghost-bg)] text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)]/50"
          >
            <MenuIcon />
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push('/dashboard'); } }}
            className="text-sm text-[var(--text-muted)] flex items-center gap-2 hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)]/50 rounded-lg px-2 py-1"
            aria-label="Back to dashboard"
          >
            <Icons.back />
            <span>Back</span>
          </button>
          <div className="h-4 w-px bg-[var(--border-default)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[280px] gradient-text-teal">{wsName}</h1>
          <button
            onClick={() => setShowDeleteModal(true)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowDeleteModal(true); } }}
            className="p-2 rounded-lg hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
            title="Delete workspace"
            aria-label="Delete workspace"
          >
            <Icons.trash />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <LLMStatusBar compact authToken={token || undefined} thoughts={brainThoughts} />
          <div className={`text-[11px] font-medium px-2 py-1 rounded-md border ${sseConnected ? 'text-[var(--accent-teal)] border-[var(--accent-teal)]/30 bg-[var(--accent-teal)]/8' : 'text-[var(--text-muted)] border-[var(--border-default)] bg-[var(--bg-surface)]/50'}`}
            title={sseConnected ? 'Live event stream connected' : 'Live stream disconnected'}
          >
            {sseConnected ? 'LIVE SSE' : 'SSE OFFLINE'}
          </div>
          {running && <div className="text-[var(--accent-teal)] text-xs font-mono flex items-center gap-2"><Icons.running /> <span>{formatDuration(elapsedSec)}</span></div>}
          {curSession && !running && <button onClick={() => handleExport('markdown')} className="px-3 py-1 rounded-lg text-xs bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20">Download</button>}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {showDrawer && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-30 lg:hidden"
              onClick={() => setShowDrawer(false)}
            />
            <aside className="fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[var(--bg-surface)]/80 border-r border-[var(--border-default)] backdrop-blur-xl transition-transform duration-300 translate-x-0">
          <div className="p-4 text-[10px] font-bold text-[var(--accent-teal)] uppercase border-b border-[var(--border-default)] tracking-[0.16em]">History</div>
          <div className="flex-1 overflow-y-auto">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => loadSession(s)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); loadSession(s); } }}
                role="option"
                aria-selected={curSession?.id === s.id}
                aria-label={`Research session: ${s.topic || s.title}`}
                className={`w-full text-left px-3 py-2.5 border-b border-[var(--border-default)]/50 hover:bg-[var(--btn-ghost-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)]/40 ${curSession?.id === s.id ? 'bg-[var(--accent-teal)]/7 border-l-2 border-[var(--accent-teal)]' : ''}`}
              >
                <p className="text-[11px] text-[var(--text-muted)] truncate">{s.topic || s.title}</p>
              </button>
            ))}
          </div>
            </aside>
          </>
        )}

        <main className="flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)]">
          <div ref={chatLogRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {msgs.map(m => <ChatBubble key={m.id} msg={m} />)}
          </div>
          <div className="p-4 border-t border-[var(--border-default)]">
            {msgs.length === 0 && (
              <div className="mb-3 rounded-xl border border-[var(--accent-teal)]/14 bg-[var(--accent-teal)]/4 p-3">
                <p className="text-[11px] text-[var(--text-muted)] mb-2">
                  Shortcuts: Use commands to run faster research workflows.
                </p>
                <div className="flex flex-wrap gap-2">
                    {['/research your topic', '/deepresearch your topic', '/gatherdata your topic'].map((cmd) => (
                    <button
                      key={cmd}
                      onClick={() => setChatInput(cmd)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setChatInput(cmd); } }}
                      className="px-2.5 py-1 rounded-md text-[11px] border border-[var(--accent-teal)]/20 text-[var(--accent-teal)] bg-[var(--bg-surface)]/50 hover:bg-[var(--accent-teal)]/8"
                      aria-label={`Use command: ${cmd}`}
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <textarea
                value={chatInput}
                onChange={e => {
                  const next = e.target.value;
                  setChatInput(next);
                  setShowSlashHint(next.trim().startsWith('/'));
                }}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Message MARP..."
                aria-label="Message input"
                aria-describedby="chat-hint"
                className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-teal)]/60 focus:ring-2 focus:ring-[var(--accent-teal)]/20 transition-all resize-none"
                rows={1}
              />
              {running ? (
                <button
                  onClick={handleCancel}
                  className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-red-500/50 flex items-center gap-2"
                  title="Stop research"
                >
                  <Icons.stop />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!chatInput.trim() || running}
                  className="btn-primary p-3"
                aria-label="Send message"
              >
                <Icons.send />
              </button>
              )}
            </div>
            {showSlashHint && (
              <div className="mt-2 flex flex-wrap gap-2">
                {['/research', '/deepresearch', '/gatherdata'].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => setChatInput(`${cmd} `)}
                    className="text-[11px] px-2 py-1 rounded-md border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-teal)]/28"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>

        {showRightPanel && (
          <aside style={{ width: `${rightPanelWidth}%` }} className="border-l border-[var(--border-default)] bg-[var(--bg-surface)]/80 backdrop-blur-xl flex flex-col relative transition-all duration-300">
            <div
              className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--accent-teal)]/50 z-10"
              onMouseDown={() => { isResizingRef.current = true; }}
            />
            <div className="p-2 border-b border-[var(--border-default)] flex flex-wrap gap-2">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTab(t.id); } }}
                  role="tab"
                  aria-selected={tab === t.id}
                  aria-controls={`${t.id}-panel`}
                  className={`px-3 py-1.5 rounded-md text-[10px] uppercase font-bold inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)]/30 ${tab === t.id ? 'text-[var(--accent-teal)] bg-[var(--accent-teal)]/8 border border-[var(--accent-teal)]/30' : 'text-[var(--text-tertiary)] border border-transparent hover:border-[var(--border-default)]'}`}
                >
                  {t.icon} <span>{t.label}</span>
                </button>
              ))}
              <div className="ml-auto text-[10px] text-[var(--text-tertiary)] px-2 py-1">
                {feedEvents.length} events · {liveSources.length} sources
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {tab === 'feed' && (
                feedEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-16 h-16 rounded-full bg-[var(--bg-surface)] flex items-center justify-center mb-4 border border-[var(--border-default)]">
                      <span className="text-[var(--text-tertiary)]"><Icons.feed /></span>
                    </div>
                    <p className="text-sm text-[var(--text-tertiary)]">No events yet.</p>
                    <p className="text-xs mt-1 text-[var(--text-tertiary)] opacity-70">Start a research session to see live agent activity.</p>
                  </div>
                ) : (
                  feedEvents.map((e, i) => <FeedItem key={i} ev={e} index={i} />)
                )
              )}
              {tab === 'report' && (
                <div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <button
                      onClick={handleCompilePdf}
                      disabled={!curSession || compileBusy}
                      className="px-3 py-1.5 rounded-lg text-xs bg-amber-500/10 text-amber-300 border border-amber-400/20 disabled:opacity-50 flex items-center gap-1.5"
                      aria-label={compileBusy ? 'Compiling PDF' : 'Compile to PDF'}
                    >
                      {compileBusy && <span className="spinner" />}
                      {compileBusy ? 'Compiling PDF...' : 'Compile to PDF'}
                    </button>
                    <button
                      onClick={handleDownloadPdf}
                      disabled={!curSession || exporting === 'pdf'}
                      className="px-3 py-1.5 rounded-lg text-xs bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] border border-[var(--accent-teal)]/20 disabled:opacity-50 flex items-center gap-1.5"
                      aria-label={exporting === 'pdf' ? 'Downloading PDF' : 'Download Report PDF'}
                    >
                      {exporting === 'pdf' && <span className="spinner" />}
                      {exporting === 'pdf' ? 'Downloading...' : 'Download Report PDF'}
                    </button>
                    <button
                      onClick={() => handleExport('markdown')}
                      disabled={!curSession || exporting === 'markdown'}
                      className="px-3 py-1.5 rounded-lg text-xs bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20 disabled:opacity-50 flex items-center gap-1.5"
                      aria-label={exporting === 'markdown' ? 'Downloading Markdown' : 'Download Markdown'}
                    >
                      {exporting === 'markdown' && <span className="spinner" />}
                      {exporting === 'markdown' ? 'Downloading...' : 'Download Markdown'}
                    </button>
                    <button
                      onClick={handleDownloadLatex}
                      disabled={!curSession || exporting === 'latex'}
                      className="px-3 py-1.5 rounded-lg text-xs bg-[var(--accent-violet)]/10 text-[var(--accent-violet)] border border-[var(--accent-violet)]/20 disabled:opacity-50 flex items-center gap-1.5"
                      aria-label={exporting === 'latex' ? 'Downloading LaTeX' : 'Download LaTeX'}
                    >
                      {exporting === 'latex' && <span className="spinner" />}
                      {exporting === 'latex' ? 'Downloading...' : 'Download LaTeX'}
                    </button>
                  </div>
                  <div className="prose prose-invert prose-sm"><ReactMarkdown remarkPlugins={[remarkGfm]}>{reportMd || 'Researching...'}</ReactMarkdown></div>
                </div>
              )}
              {tab === 'sources' && <SourcesPanel resultJson={resultJson} feedEvents={feedEvents} liveSources={liveSources} />}
              {tab === 'raw' && (
                <RawDataGrid
                  findings={(resultJson?.final_state?.findings || resultJson?.findings || {}) as Record<string, any>}
                  feedEvents={feedEvents}
                  liveSources={liveSources}
                />
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

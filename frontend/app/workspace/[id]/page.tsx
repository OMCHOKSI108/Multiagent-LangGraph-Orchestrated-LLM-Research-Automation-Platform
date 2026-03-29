'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/components/ThemeProvider';
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

  const entries = Object.entries(value as Record<string, unknown>).slice(0, 10);
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

// ─── Types ───────────────────────────────────────────────────────────────────

type TabId = 'feed' | 'sources' | 'report' | 'raw';
type MsgRole = 'user' | 'bot' | 'system';

interface Msg {
  id: string | number;
  role: MsgRole;
  text: string;
  ts: number;
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
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
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
};

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
            ? 'bg-gradient-to-r from-[#00F5D4]/20 to-[#3B82F6]/10 border border-[#00F5D4]/30 text-[#F9FAFB]'
            : msg.role === 'system'
              ? 'bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#9CA3AF]'
              : 'bg-[#111827]/80 border border-[rgba(255,255,255,0.1)] text-[#9CA3AF]'}`}
        style={{ borderRadius: '16px' }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose-chat">{msg.text}</ReactMarkdown>
        
        {/* Copy Button */}
        {!isUser && msg.role !== 'system' && (
          <button
            onClick={handleCopy}
            className="absolute -right-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-white/5"
            style={{ color: copied ? '#00F5D4' : '#6B7280' }}
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
      <div className="text-[11px] mt-1" style={{ color: '#6B7280' }}>
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
    error: { icon: 'error', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
    warning: { icon: 'info', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
    source: { icon: 'source', color: '#00F5D4', bg: 'rgba(0,245,212,0.1)', border: 'rgba(0,245,212,0.2)' },
    agent: { icon: 'agent', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' },
    info: { icon: 'info', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)' },
  };
  
  const config = statusConfig[sev as keyof typeof statusConfig] || statusConfig.info;
  
  return (
    <div 
      className="p-3 mb-2 rounded-xl border transition-all duration-300 hover:scale-[1.01]"
      style={{ 
        backgroundColor: config.bg,
        borderColor: config.border,
        animationDelay: `${index * 50}ms`
      }}
    >
      <div className="flex items-start gap-3">
        <div 
          className="p-1.5 rounded-lg"
          style={{ backgroundColor: config.border }}
        >
          <span style={{ color: config.color }}>
            {sev === 'error' ? <Icons.error /> : sev === 'warning' ? <Icons.info /> : isSource ? <Icons.source /> : <Icons.agent />}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {ev.stage && (
              <span 
                className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider"
                style={{ backgroundColor: 'rgba(0,245,212,0.1)', color: '#00F5D4' }}
              >
                {ev.stage}
              </span>
            )}
            <span className="text-xs font-medium" style={{ color: config.color }}>
              {ev.message || ev.category || 'Event'}
            </span>
          </div>
          <div className="text-[11px]" style={{ color: '#6B7280' }}>
            {new Date(ev.created_at).toLocaleTimeString()}
          </div>
          {detailsPreview && (
            <pre 
              className="mt-2 text-[10px] p-2 rounded-lg overflow-x-auto"
              style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: '#9CA3AF' }}
            >
              {detailsPreview}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sources Panel ────────────────────────────────────────────────────────────

const SOURCE_AGENTS: [string, string, string | null][] = [
  ['literature_review', 'Literature', 'papers'],
  ['web_scraper', 'Web Sources', 'sources'],
  ['data_scraper', 'Scraped Data', 'results'],
  ['google_news', 'News', 'results'],
  ['domain_intelligence', 'Domain Intelligence', null],
  ['topic_discovery', 'Topic Discovery', 'topic_suggestions'],
  ['gap_synthesis', 'Gap Analysis', null],
  ['scoring', 'Quality Score', null],
  ['fact_check', 'Fact Check', null],
  ['bias_detection', 'Bias Detection', null],
  ['visualization', 'Visualization', null],
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
        <div className="w-16 h-16 rounded-full bg-[#111827] flex items-center justify-center mb-4 border border-[rgba(255,255,255,0.1)]">
          <span style={{ color: '#6B7280' }}><Icons.source /></span>
        </div>
        <p className="text-sm" style={{ color: '#6B7280' }}>No sources discovered yet.</p>
        <p className="text-xs mt-1" style={{ color: '#4B5563' }}>Sources will appear as agents discover them.</p>
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
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F5D4] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00F5D4]"></span>
            </span>
            <h4 className="text-sm font-semibold" style={{ color: '#F9FAFB' }}>
              Live Discovered Sources ({uniqueSources.length})
            </h4>
          </div>
          {uniqueSources.slice(0, 50).map((item, i) => (
            <div 
              key={`rt-${i}`} 
              className="p-4 mb-3 rounded-xl border transition-all duration-300 hover:border-[#00F5D4]/30"
              style={{ backgroundColor: 'rgba(0,245,212,0.03)', borderColor: 'rgba(0,245,212,0.15)' }}
            >
              <p className="font-semibold mb-1 text-sm" style={{ color: '#F9FAFB' }}>
                [{i + 1}] {item.title || item.url || 'Live Source'}
              </p>
              {item.domain && (
                <p className="text-xs font-medium mb-2" style={{ color: '#00F5D4' }}>
                  Source: {item.domain}
                </p>
              )}
              {item.abstract && (
                <p className="text-xs mb-2 leading-relaxed" style={{ color: '#9CA3AF' }}>
                  {item.abstract.slice(0, 250)}...
                </p>
              )}
              {item.url && (
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs font-medium hover:underline"
                  style={{ color: '#00F5D4' }}
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

    if (listKey && typeof resp === 'object' && resp !== null && Array.isArray((resp as Record<string,unknown>)[listKey])) {
      const items = (resp as Record<string, SourceItem[]>)[listKey];
      if (!items.length) continue;
      sections.push(
        <div key={key} className="mb-4">
          <h4 className="text-sm font-semibold mb-3 pb-2" style={{ color: '#F9FAFB', borderColor: 'rgba(255,255,255,0.08)' }}>
            {label} ({items.length})
          </h4>
          {items.slice(0, 15).map((item, i) => (
            <div 
              key={i} 
              className="p-3 mb-2 rounded-xl border transition-all duration-300 hover:border-[#3B82F6]/30"
              style={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <p className="font-semibold mb-1 text-sm" style={{ color: '#F9FAFB' }}>
                [{i + 1}] {item.title || item.url || 'Item'}
              </p>
              {item.domain && (
                <p className="text-xs font-medium mb-1" style={{ color: '#3B82F6' }}>
                  Domain: {item.domain}
                </p>
              )}
              {item.authors && <p className="text-xs mb-1" style={{ color: '#6B7280' }}>{String(item.authors).slice(0, 120)}</p>}
              {item.novelty_angle && (
                <p className="text-xs mb-1 leading-relaxed" style={{ color: '#8B5CF6' }}>
                  Angle: {item.novelty_angle}
                </p>
              )}
              {(item.abstract || item.summary || item.content || item.snippet) && (
                <p className="text-xs mb-1 leading-relaxed" style={{ color: '#9CA3AF' }}>
                  {(item.abstract || item.summary || item.content || item.snippet || '').slice(0, 250)}...
                </p>
              )}
              {item.estimated_complexity && (
                <span 
                  className="inline-block px-2 py-0.5 rounded text-[10px] mt-1"
                  style={{ backgroundColor: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}
                >
                  Complexity: {item.estimated_complexity}
                </span>
              )}
              {item.url && (
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs block mt-2 hover:underline"
                  style={{ color: '#00F5D4' }}
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
          <h4 className="text-sm font-semibold mb-2 pb-2" style={{ color: '#F9FAFB', borderColor: 'rgba(255,255,255,0.08)' }}>
            {label}
          </h4>
          <div 
            className="p-3 text-xs leading-relaxed rounded-xl"
            style={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }}
          >
            {txt.slice(0, 800)}{txt.length > 800 ? '...' : ''}
          </div>
        </div>
      );
    }
  }

  return sections.length > 0
    ? <>{sections}</>
    : <p className="text-sm" style={{ color: '#6B7280' }}>No structured sources. See Report tab.</p>;
}

// ─── Section Editor ──────────────────────────────────────────────────────────

function SectionEditor({ 
  section, 
  wsId, 
  onUpdate 
}: { 
  section: any; 
  wsId: string; 
  onUpdate: () => void 
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
    } catch (e: any) {
      alert("Edit failed: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="group relative pb-8 mb-8 last:border-0 last:mb-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="prose-research mb-4">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
      </div>

      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {!editing ? (
          <button 
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105"
            style={{ backgroundColor: 'rgba(0,245,212,0.1)', color: '#00F5D4', border: '1px solid rgba(0,245,212,0.2)' }}
          >
            Edit with AI
          </button>
        ) : (
          <div 
            className="w-full p-4 rounded-xl mt-2"
            style={{ backgroundColor: 'rgba(0,245,212,0.05)', border: '1px solid rgba(0,245,212,0.2)' }}
          >
            <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: '#00F5D4' }}>
              AI Edit Instruction
            </p>
            <textarea
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              placeholder="e.g., 'Make this section more technical' or 'Add a table about...'"
              className="w-full p-3 rounded-lg text-sm mb-2 outline-none transition-all duration-300"
              style={{ 
                backgroundColor: '#111827', 
                border: '1px solid rgba(255,255,255,0.1)', 
                color: '#F9FAFB',
              }}
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setEditing(false)} 
                className="px-3 py-1.5 text-xs rounded-lg transition-colors"
                style={{ color: '#6B7280' }}
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

// ─── Main Workspace Page ──────────────────────────────────────────────────────

export default function WorkspacePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const wsId = params.id as string;

  // Workspace & sessions
  const [wsName, setWsName] = useState('Workspace');
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [curSession, setCurSession] = useState<ResearchSession | null>(null);

  // Chat messages
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showSlashHint, setShowSlashHint] = useState(false);

  // Research state
  const [running, setRunning] = useState(false);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [abort, setAbort] = useState(false);
  const abortRef = useRef(false);
  const [statusText, setStatusText] = useState('');

  // Panels
  const [tab, setTab] = useState<TabId>('feed');
  const [feedEvents, setFeedEvents] = useState<ResearchEvent[]>([]);
  const [liveSources, setLiveSources] = useState<any[]>([]);
  const [resultJson, setResultJson] = useState<ResearchResult | null>(null);
  const [reportMd, setReportMd] = useState('');
  const [latexSource, setLatexSource] = useState('');
  const [compileBusy, setCompileBusy] = useState(false);
  const [sections_data, setSectionsData] = useState<any[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  const chatLogRef = useRef<HTMLDivElement>(null);

  // Drawer & Resizing state
  const [showDrawer, setShowDrawer] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [rightPanelWidth, setRightPanelWidth] = useState(50); // percentage
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

  function clearPanels() {
    setFeedEvents([]);
    setLiveSources([]);
    setResultJson(null);
    setReportMd('');
    setLatexSource('');
    setSectionsData([]);
  }

  async function loadSession(s: ResearchSession) {
    setCurSession(s);
    setMsgs([]);
    clearPanels();
    setStatusText('');

    addMsg(`Loading session: **${s.topic || s.title || 'Research'}**...`, 'system');

    try {
      const full = await wsApi.getResearchStatus(wsId, s.id);

      setMsgs([]);
      addMsg(full.topic || full.title || 'Research query', 'user');

      if (full.status === 'completed') {
        addMsg(summarizeResearch(full.report_markdown, full.topic || full.title), 'bot');
        if (full.result_json) setResultJson(full.result_json);
        if (full.report_markdown) setReportMd(full.report_markdown);
        if ((full as any).latex_source) setLatexSource((full as any).latex_source);
        setStatusText('Completed');

        try {
          const sres = await wsApi.getSections(wsId, s.id);
          setSectionsData(sres.sections || []);
        } catch { /* ignore */ }

        try {
          const evts = await eventsApi.list(s.id);
          setFeedEvents(Array.isArray(evts) ? evts : []);
        } catch { /* ignore */ }
        try {
          const src = await eventsApi.sources(s.id);
          setLiveSources(Array.isArray(src) ? src : []);
        } catch { /* ignore */ }

        setTab('report');
      } else if (full.status === 'running' || full.status === 'queued') {
        addMsg('This research is still running. Reconnecting to live updates...', 'system');
        setStatusText('Running...');
        setRunStartedAt(full.started_at ? new Date(full.started_at).getTime() : Date.now());
        setElapsedSec(0);
        
        try {
          const ch = await chatApi.history(s.id);
          if (ch.messages && ch.messages.length > 0) {
            ch.messages.forEach(m => addMsg(m.content, m.role === 'user' ? 'user' : 'bot', String(m.id)));
          }
        } catch { /* ignore */ }

        await pollResearch(s.id);
      } else if (full.status === 'failed') {
        addMsg('This research session failed.', 'bot');
        setStatusText('Failed');
      }

      if (full.status === 'completed') {
        try {
          const ch = await chatApi.history(s.id);
          if (ch.messages && ch.messages.length > 0) {
            ch.messages.forEach(m => addMsg(m.content, m.role === 'user' ? 'user' : 'bot', String(m.id)));
          }
        } catch { /* ignore */ }
      }
    } catch (e: unknown) {
      addMsg('Error loading session: ' + (e instanceof Error ? e.message : 'Unknown'), 'bot');
    }
  }

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const stopEventPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const startEventPolling = useCallback((sid: number) => {
    stopEventPolling();
    let lastEventId = 0;
    let lastSourceCount = 0;

    (async () => {
      try {
        const tok = await eventsApi.getSSEToken(sid);
        if (!tok?.token || abortRef.current) return;
        const streamUrl = `${API_ROOT}/api/events/stream-public/${sid}?token=${encodeURIComponent(tok.token)}`;
        const es = new EventSource(streamUrl);
        eventSourceRef.current = es;

        es.onmessage = (evt) => {
          try {
            const payload = JSON.parse(evt.data);
            if (payload.type === 'event') {
              setFeedEvents(prev => [...prev, {
                id: payload.id || Date.now(),
                message: payload.message || payload.category || 'Event',
                stage: payload.stage,
                severity: payload.severity,
                category: payload.category,
                details: payload.details,
                created_at: payload.timestamp || new Date().toISOString(),
              } as any]);
            } else if (payload.type === 'sources' && Array.isArray(payload.sources)) {
              setLiveSources(prev => {
                const merged = [...prev, ...payload.sources];
                return Array.from(new Map(merged.map((s: any) => [s.url || `${s.domain}-${s.title}`, s])).values());
              });
            } else if (payload.type === 'status' && payload.current_stage) {
              setStatusText(payload.current_stage);
            } else if (payload.type === 'done') {
              try { es.close(); } catch { }
            }
          } catch { /* ignore */ }
        };

        es.onerror = () => {
          try { es.close(); } catch { }
          eventSourceRef.current = null;
        };
      } catch { /* fallback */ }
    })();

    pollingIntervalRef.current = setInterval(async () => {
      if (abortRef.current) { stopEventPolling(); return; }
      try {
        const evts = await eventsApi.list(sid);
        if (Array.isArray(evts) && evts.length > 0) {
          setFeedEvents(prev => {
            const newOnes = evts.filter((e: any) => Number(e.id) > lastEventId);
            if (newOnes.length > 0) {
              lastEventId = Number(newOnes[newOnes.length - 1].id || lastEventId);
            }
            return [...prev, ...newOnes];
          });
        }
        const src = await eventsApi.sources(sid);
        if (Array.isArray(src) && src.length > lastSourceCount) {
          setLiveSources(prev => {
            const newOnes = src.slice(lastSourceCount);
            const merged = [...prev, ...newOnes];
            return Array.from(new Map(merged.map((s: any) => [s.url || `${s.domain}-${s.title}`, s])).values());
          });
          lastSourceCount = src.length;
        }
      } catch { /* ignore */ }
    }, 3000);
  }, [stopEventPolling]);

  async function pollResearch(sid: number) {
    setRunning(true);
    if (!runStartedAt) setRunStartedAt(Date.now());
    abortRef.current = false;
    setAbort(false);

    startEventPolling(sid);
    setTab('feed');

    let lastStage = '';
    let consecutiveErrors = 0;

    try {
      for (let i = 0; i < 200; i++) {
        if (abortRef.current) break;
        await sleep(4000);
        if (abortRef.current) break;

        try {
          const s = await wsApi.getResearchStatus(wsId, sid);
          consecutiveErrors = 0;

          if (s.current_stage && s.current_stage !== lastStage) {
            lastStage = s.current_stage;
            setStatusText(lastStage);
          }
          
          if (s.status === 'completed') {
            addMsg(summarizeResearch(s.report_markdown, s.topic || s.title), 'bot');
            if (s.result_json) setResultJson(s.result_json);
            if (s.report_markdown) setReportMd(s.report_markdown);
            if ((s as any).latex_source) setLatexSource((s as any).latex_source);
            setStatusText('Completed');
            
            try {
              const sres = await wsApi.getSections(wsId, sid);
              setSectionsData(sres.sections || []);
            } catch { /* ignore */ }
            try {
              const src = await eventsApi.sources(sid);
              setLiveSources(Array.isArray(src) ? src : []);
            } catch { /* ignore */ }

            setTab('report');
            break;
          }
          
          if (s.status === 'waiting') {
            setStatusText('Waiting for Topic Selection');
            
            const finalState: any = s.result_json?.final_state;
            const suggestions = finalState?.topic_suggestions || finalState?.findings?.topic_discovery?.topic_suggestions || [];
            let outlineMsg = 'I have discovered multiple potential research angles. Please review them in the **Sources** tab and reply with `/deepresearch <Your Chosen Topic>` to lock in your topic and proceed.';
            
            if (suggestions && suggestions.length > 0) {
              const topicsList = suggestions.map((t: any, i: number) => `**${i+1}. ${t.title || 'Topic'}**\n*${t.novelty_angle || t.domain || ''}*`).join('\n\n');
              outlineMsg = `I have discovered multiple potential research angles:\n\n${topicsList}\n\nPlease reply with \`/deepresearch <Your Chosen Topic>\` to lock in your topic and proceed.`;
            }
            
            addMsg(outlineMsg, 'bot');
            
            if (finalState?.topic_suggestions || finalState?.findings?.topic_discovery) {
              setResultJson(s.result_json || null);
            }
            break; 
          }

          if (s.status === 'failed') {
            addMsg('Research failed. Please check the logs or try again.', 'bot');
            setStatusText('Failed');
            break;
          }
        } catch (err) { 
          consecutiveErrors++;
          if (consecutiveErrors > 20) {
            addMsg('Connection is unstable. We will keep retrying in background.', 'system');
            consecutiveErrors = 0;
          }
        }
      }
    } finally {
      stopEventPolling();
      setRunning(false);
      setRunStartedAt(null);
      setElapsedSec(0);
      await loadWorkspace();
    }
  }

  async function dispatchResearch(topic: string, depth: string) {
    clearPanels();
    setStatusText('Submitting...');
    setTab('feed');
    setRunning(true);
    setRunStartedAt(Date.now());
    setElapsedSec(0);
    setStatusText('Analyzing intent...');
    const processingMsgId = crypto.randomUUID();
    addMsg('Analyzing query...', 'bot', processingMsgId);

    try {
      const res = await wsApi.startResearch(wsId, topic, depth, curSession?.id);
      
      if (res.instant_reply) {
        setMsgs(prev => prev.filter(m => m.id !== processingMsgId));
        addMsg(res.instant_reply!, 'bot');
        setStatusText('');
        setRunning(false);
        return;
      }

      const sid = res.session_id!;
      setCurSession({ id: sid, topic, status: 'queued', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });

      setMsgs(prev => prev.map(m =>
        m.id === processingMsgId
          ? { ...m, text: `⏳ Job #${sid} created (${depth}). Agents working...` }
          : m
      ));

      await loadWorkspace();
      await pollResearch(sid);

      setMsgs(prev => prev.filter(m => m.id !== processingMsgId));
    } catch (e: unknown) {
      setMsgs(prev => prev.filter(m => m.id !== processingMsgId));
      addMsg('Error: ' + (e instanceof Error ? e.message : 'Failed'), 'bot');
      setStatusText('Error');
      setRunning(false);
    }
  }

  async function handleSend() {
    const q = chatInput.trim();
    if (!q || running) return;
    setChatInput('');
    setShowSlashHint(false);

    addMsg(q, 'user');

    const slash = parseSlashCommand(q);
    if (slash) {
      if (slash.cmd === 'history' || slash.cmd === 'profile') { router.push('/profile'); return; }
      const depthMap: Record<string, string> = { research: 'standard', deepresearch: 'deep', gatherdata: 'gather', help: 'standard' };
      const depth = depthMap[slash.cmd] || 'standard';
      const topic = slash.args || (slash.cmd === 'help' ? 'help' : '');
      if (!topic) { addMsg(`Please provide a topic. Usage: **/${slash.cmd} [your research topic]**`, 'bot'); return; }
      await dispatchResearch(topic, depth);
      return;
    }

    if (curSession && curSession.status === 'completed' && !slash) {
      const botMsgId = crypto.randomUUID();
      addMsg('Thinking...', 'bot', botMsgId);
      
      try {
        let fullChunk = '';
        const stream = chatApi.stream(curSession.id, q);
        
        for await (const chunk of stream) {
           // Parse SSE format (data: ...)
           const lines = chunk.split('\n');
           for (const line of lines) {
             if (line.startsWith('data: ')) {
               const data = line.slice(6);
               if (data === '[DONE]') continue;
               if (data.startsWith('[ERROR]')) throw new Error(data.slice(7));
               
               fullChunk += data;
               setMsgs(prev => prev.map(m => 
                 m.id === botMsgId ? { ...m, text: fullChunk } : m
               ));
             }
           }
        }
      } catch (e: any) {
        setMsgs(prev => prev.map(m => 
          m.id === botMsgId ? { ...m, text: `Error: ${e.message}`, role: 'system' } : m
        ));
      }
      return;
    }

    await dispatchResearch(q, 'standard');
  }

  async function handleExport(format: 'markdown' | 'json') {
    if (!curSession) return;
    try {
      const blob = await exportApi.download(curSession.id, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-${curSession.id}.${format === 'markdown' ? 'md' : 'json'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  }

  async function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleLatexExport() {
    if (!curSession) return;
    try {
      const blob = await exportApi.downloadLatex(curSession.id);
      await downloadBlob(blob, `research-${curSession.id}.tex`);
    } catch (e: any) {
      addMsg(`LaTeX export failed: ${e.message}`, 'system');
    }
  }

  async function handlePdfExport() {
    if (!curSession) return;
    try {
      const blob = await exportApi.downloadPdf(curSession.id);
      await downloadBlob(blob, `research-${curSession.id}.pdf`);
    } catch (e: any) {
      addMsg(`PDF export failed: ${e.message}`, 'system');
    }
  }

  async function handleCompilePdf() {
    if (!curSession || compileBusy) return;
    const content = latexSource || reportMd;
    if (!content?.trim()) {
      addMsg('No content available to compile yet.', 'system');
      return;
    }
    setCompileBusy(true);
    try {
      const blob = await exportApi.compileToPdf(curSession.id, content);
      await downloadBlob(blob, `research-${curSession.id}-compiled.pdf`);
    } catch (e: any) {
      addMsg(`Compile failed: ${e.message}`, 'system');
    } finally {
      setCompileBusy(false);
    }
  }

  if (authLoading) return null;

  // ─── Render ───────────────────────────────────────────────────────────────────

  const TABS: { id: TabId; label: string; icon: JSX.Element }[] = [
    { id: 'feed', label: 'Live Feed', icon: <Icons.feed /> },
    { id: 'sources', label: 'Sources', icon: <Icons.source /> },
    { id: 'report', label: 'Report', icon: <Icons.report /> },
    { id: 'raw', label: 'Raw Data', icon: <Icons.data /> },
  ];

  const findings = resultJson?.final_state?.findings || resultJson?.findings || {};
  const rawKeys = Object.keys(findings);
  const literatureCount = Array.isArray((findings as any)?.literature_review?.response?.papers)
    ? (findings as any).literature_review.response.papers.length
    : 0;
  const scrapedCount = liveSources.length;
  const galleryImages = (
    findings.visualization?.images_metadata && findings.visualization.images_metadata.length > 0
      ? findings.visualization.images_metadata
      : (liveSources || [])
          .filter((s: any) => s?.thumbnail || s?.favicon)
          .map((s: any) => ({
            original: normalizeImageUrl(s.thumbnail || s.favicon),
            source_url: s.url,
            title: s.title || s.domain || 'Source',
          }))
  );

  return (
    <div 
      className="fixed inset-0 flex flex-col workspace-root overflow-hidden"
      style={{ backgroundColor: '#0B0F1A' }}
    >
      {/* Top Bar */}
      <header 
        className="h-14 px-4 flex items-center justify-between flex-shrink-0 z-20"
        style={{ 
          background: 'linear-gradient(180deg, rgba(11,15,26,0.95) 0%, rgba(11,15,26,0.85) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}
      >
        <div className="flex items-center gap-3">
          {/* Menu toggle button */}
          <button
            onClick={() => setShowDrawer(!showDrawer)}
            className="p-2 rounded-lg transition-all duration-300 hover:bg-white/5"
            style={{ color: showDrawer ? '#00F5D4' : '#9CA3AF' }}
            title="Toggle Sessions"
          >
            <MenuIcon />
          </button>
          
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all duration-300 hover:bg-white/5"
            style={{ color: '#9CA3AF' }}
          >
            <Icons.back />
            <span className="hidden sm:inline">Back</span>
          </button>
          
          <div className="h-5 w-px hidden sm:block" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <h1 className="text-sm font-semibold hidden sm:block" style={{ color: '#F9FAFB' }}>{wsName}</h1>
          {curSession && (
            <span 
              className="px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ backgroundColor: 'rgba(0,245,212,0.1)', color: '#00F5D4' }}
            >
              {curSession.topic?.slice(0, 25) || 'Research Session'}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Right panel toggle */}
          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className="p-2 rounded-lg transition-all duration-300 hover:bg-white/5"
            style={{ color: showRightPanel ? '#00F5D4' : '#6B7280' }}
            title="Toggle Panel"
          >
            <RightPanelIcon />
          </button>
          
          {running && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="animate-pulse" style={{ color: '#00F5D4' }}><Icons.running /></span>
                <span className="text-xs font-medium hidden sm:inline" style={{ color: '#00F5D4' }}>{statusText || 'Running'}</span>
              </div>
              <span className="text-xs font-mono px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(0,245,212,0.1)', color: '#00F5D4' }}>
                {formatDuration(elapsedSec)}
              </span>
            </div>
          )}
          {!running && statusText && (
            <span className="text-xs hidden sm:inline" style={{ color: '#6B7280' }}>{statusText}</span>
          )}
          {curSession && !running && (
            <div className="flex gap-1 sm:gap-2">
              {[
                { label: 'MD', onClick: () => handleExport('markdown') },
                { label: 'PDF', onClick: handlePdfExport },
                { label: 'TEX', onClick: handleLatexExport },
                { label: 'JSON', onClick: () => handleExport('json') },
              ].map(({ label, onClick }) => (
                <button 
                  key={label}
                  onClick={onClick}
                  className="px-2 py-1 text-xs rounded-lg font-medium transition-all duration-300 hover:scale-105"
                  style={{ 
                    backgroundColor: 'rgba(59,130,246,0.1)', 
                    color: '#3B82F6',
                    border: '1px solid rgba(59,130,246,0.2)'
                  }}
                >
                  ↓ {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main Layout - Chat + Right Panel */}
      <div className="flex flex-1 min-h-0 relative">
        
        {/* LEFT DRAWER: Sessions Sidebar (Overlay) */}
        {showDrawer && (
          <>
            {/* Overlay */}
            <div 
              className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => setShowDrawer(false)}
            />
            
            {/* Drawer */}
            <aside 
              className="fixed left-0 top-14 bottom-0 z-40 flex flex-col w-64 shadow-2xl"
              style={{ 
                backgroundColor: '#111827', 
                borderRight: '1px solid rgba(255,255,255,0.08)',
                animation: 'slideIn 0.3s ease-out'
              }}
            >
              {/* Drawer Header */}
              <div 
                className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: '#6B7280' }}>
                  Sessions
                </span>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="p-1 rounded hover:bg-white/5 transition-colors"
                  style={{ color: '#6B7280' }}
                >
                  <CloseIcon />
                </button>
              </div>
              
              {/* Sessions List */}
              <div className="flex-1 overflow-y-auto py-2">
                {sessions.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-xs" style={{ color: '#6B7280' }}>No sessions yet</p>
                    <p className="text-[10px] mt-1" style={{ color: '#4B5563' }}>Start a research query below</p>
                  </div>
                ) : (
                  sessions.map(s => {
                    const label = s.topic || s.title || 'Untitled';
                    const short = label.length > 30 ? label.slice(0, 28) + '…' : label;
                    const isActive = curSession?.id === s.id;
                    const statusColors = {
                      completed: '#00F5D4',
                      running: '#3B82F6',
                      failed: '#EF4444',
                      queued: '#8B5CF6'
                    };
                    return (
                      <div
                        key={s.id}
                        onClick={() => { loadSession(s); setShowDrawer(false); }}
                        className="px-4 py-3 cursor-pointer transition-all duration-300 hover:bg-white/5"
                        style={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          backgroundColor: isActive ? 'rgba(0,245,212,0.08)' : 'transparent',
                          borderLeft: isActive ? '3px solid #00F5D4' : '3px solid transparent'
                        }}
                      >
                        <p 
                          className="text-sm font-medium truncate mb-1"
                          style={{ color: isActive ? '#F9FAFB' : '#9CA3AF' }}
                        >
                          {short}
                        </p>
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: statusColors[s.status as keyof typeof statusColors] || '#6B7280' }}
                          />
                          <span className="text-[10px]" style={{ color: '#6B7280' }}>
                            {s.status} · {new Date(s.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </aside>
          </>
        )}

        {/* CENTER: Chat (Main Focus) */}
        <main 
          className="flex flex-col flex-1 min-w-0" 
          style={{ backgroundColor: '#0B0F1A' }}
        >
          {/* Messages */}
          <div ref={chatLogRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
            {msgs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div 
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <svg className="w-10 h-10 text-[#00F5D4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: '#F9FAFB' }}>
                  Welcome to <span className="gradient-text">MARP</span>
                </h2>
                <p className="text-sm mb-6 max-w-md" style={{ color: '#9CA3AF' }}>
                  Ask a research question or trigger a pipeline with slash commands.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg">
                  {[
                    { cmd: '/research', desc: 'Standard research' },
                    { cmd: '/deepresearch', desc: 'Deep analysis' },
                    { cmd: '/gatherdata', desc: 'Data gathering' },
                  ].map(({ cmd, desc }) => (
                    <div 
                      key={cmd}
                      className="p-3 rounded-xl text-left"
                      style={{ 
                        backgroundColor: 'rgba(255,255,255,0.03)', 
                        border: '1px solid rgba(255,255,255,0.06)'
                      }}
                    >
                      <code className="text-sm font-mono" style={{ color: '#00F5D4' }}>{cmd}</code>
                      <p className="text-[10px] mt-1" style={{ color: '#6B7280' }}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {msgs.map(m => <ChatBubble key={m.id} msg={m} />)}
          </div>

          {/* Slash hint */}
          {showSlashHint && (
            <div 
              className="mx-4 sm:mx-6 mb-2 p-3 rounded-xl text-xs"
              style={{ 
                backgroundColor: 'rgba(0,245,212,0.05)', 
                border: '1px solid rgba(0,245,212,0.15)',
                color: '#9CA3AF'
              }}
            >
              <span className="font-semibold" style={{ color: '#00F5D4' }}>Commands:</span>{' '}
              /research · /deepresearch · /gatherdata · /help
            </div>
          )}

          {/* Input bar */}
          <div 
            className="p-3 sm:p-4 flex gap-3 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex-1 relative">
              <textarea
                value={chatInput}
                onChange={e => {
                  setChatInput(e.target.value);
                  setShowSlashHint(e.target.value === '/');
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="Ask a question or type / for commands..."
                rows={1}
                disabled={running}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-300 resize-none disabled:opacity-50"
                style={{ 
                  backgroundColor: 'rgba(17,24,39,0.8)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#F9FAFB',
                  boxShadow: '0 0 0 0 rgba(0,245,212,0)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#00F5D4';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0,245,212,0.15), 0 0 20px rgba(0,245,212,0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.target.style.boxShadow = '0 0 0 0 rgba(0,245,212,0)';
                }}
              />
            </div>
            {running ? (
              <button
                onClick={() => { abortRef.current = true; setAbort(true); setRunning(false); setRunStartedAt(null); setElapsedSec(0); setStatusText('Stopped'); }}
                className="px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 flex items-center gap-2"
                style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <Icons.stop />
                <span className="hidden sm:inline">Stop</span>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!chatInput.trim()}
                className="btn-primary px-4 sm:px-5 py-3 flex items-center gap-2"
              >
                <Icons.send />
                <span className="hidden sm:inline">Send</span>
              </button>
            )}
          </div>
        </main>

        {/* RIGHT: Live Feed / Tabs Panel */}
        {showRightPanel && (
          <>
            {/* Draggable Divider */}
            <div 
              className="w-1 cursor-col-resize hover:bg-teal-500/50 transition-colors z-10 flex-shrink-0"
              onMouseDown={() => { isResizingRef.current = true; }}
              style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
            />
            
            <aside 
              className="flex flex-col flex-shrink-0 min-w-0"
              style={{ 
                width: `${rightPanelWidth}%`,
                backgroundColor: '#111827', 
                borderLeft: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              {/* Tab bar */}
              <div 
                className="flex border-b flex-shrink-0"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}
              >
                {TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className="flex-1 px-2 sm:px-3 py-3 text-xs flex items-center justify-center gap-1 sm:gap-2 transition-all duration-300"
                    style={{ 
                      color: tab === t.id ? '#00F5D4' : '#6B7280',
                      backgroundColor: tab === t.id ? 'rgba(0,245,212,0.08)' : 'transparent',
                      borderBottom: tab === t.id ? '2px solid #00F5D4' : '2px solid transparent'
                    }}
                  >
                    {t.icon}
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                ))}
              </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
              {tab === 'feed' && (
                <div className="space-y-1">
                  {feedEvents.length > 0 ? (
                    feedEvents.map((e, idx) => (
                      <FeedItem key={e.id || idx} ev={e} index={idx} />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                      <Icons.feed />
                      <p className="text-xs mt-2">Waiting for live activity...</p>
                    </div>
                  )}
                </div>
              )}
              {tab === 'sources' && (
                <div className="space-y-6">
                  <SourcesPanel 
                    resultJson={resultJson} 
                    feedEvents={feedEvents} 
                    liveSources={liveSources} 
                  />
                </div>
              )}
              {tab === 'report' && (
                <div className="prose-research max-w-none text-sm">
                  {reportMd ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportMd}</ReactMarkdown>
                  ) : (
                    <p className="text-center py-8 text-[#4B5563]">Report will appear here when completed.</p>
                  )}
                </div>
              )}
              {tab === 'raw' && (
                <div className="space-y-6">
                  {rawKeys.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                        <Icons.data />
                      </div>
                      <p className="text-sm text-[#6B7280]">No raw research data available yet.</p>
                      <p className="text-[10px] text-[#4B5563] mt-1">Data will appear here as agents finish their analysis.</p>
                    </div>
                  ) : (
                    rawKeys.map(k => {
                      const data = findings[k];
                      const isVision = k === 'vision_analysis';
                      const isSLR = k === 'literature_review' || k === 'slr';
                      const isNews = k === 'news_agent' || k === 'news';
                      const cleanName = k.replace(/_/g, ' ').toUpperCase();
                      
                      return (
                        <div key={k} className="p-5 rounded-2xl bg-[#111827]/50 border border-white/5 hover:border-white/10 transition-all duration-300">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#00F5D4]">{cleanName}</h3>
                            <span className="text-[10px] py-0.5 px-2 rounded-full bg-white/5 text-[#6B7280]">Agent Data</span>
                          </div>
                          
                          {/* Vision Analysis Gallery */}
                          {isVision && (data as any)?.response?.image_analysis && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                              {(data as any).response.image_analysis.map((img: any, idx: number) => (
                                <div key={idx} className="rounded-xl overflow-hidden bg-black/40 border border-white/5 group">
                                  <div className="aspect-video relative overflow-hidden">
                                     <img 
                                      src={img.url} 
                                      alt="Analyzed"
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                      onError={(e) => { (e.target as any).src = 'https://via.placeholder.com/300x200?text=Image+Load+Error'; }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                      <a href={img.url} target="_blank" className="text-[10px] text-[#00F5D4] hover:underline">View Original →</a>
                                    </div>
                                  </div>
                                  <div className="p-3">
                                    <p className="text-xs text-[#F9FAFB] line-clamp-3 leading-relaxed">
                                      {img.analysis}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* SLR / Papers List */}
                          {isSLR && (data as any)?.response?.papers && (
                            <div className="space-y-3 mb-4">
                              {(data as any).response.papers.slice(0, 5).map((paper: any, idx: number) => (
                                <div key={idx} className="p-3 rounded-xl bg-black/30 border border-white/5 hover:border-[#00F5D4]/20 transition-colors">
                                  <h4 className="text-xs font-semibold text-[#F9FAFB] mb-1 leading-snug">{paper.title}</h4>
                                  <div className="flex flex-wrap gap-2 items-center text-[10px] text-[#6B7280]">
                                    <span className="text-[#00F5D4] opacity-80">{paper.authors?.[0] || 'Unknown Author'}</span>
                                    <span>•</span>
                                    <span>{paper.year || '2024'}</span>
                                    {paper.url && (
                                      <a href={paper.url} target="_blank" className="ml-auto text-[#3B82F6] hover:underline">View Source</a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* News / Sources List */}
                          {isNews && (data as any)?.response?.sources && (
                            <div className="grid grid-cols-1 gap-3 mb-4">
                               {(data as any).response.sources.slice(0, 6).map((src: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-black/20 border border-white/5">
                                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#00F5D4] text-[10px] font-bold">
                                    {src.source?.slice(0, 2).toUpperCase() || 'WEB'}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] text-[#F9FAFB] truncate font-medium">{src.title}</p>
                                    <p className="text-[9px] text-[#4B5563] truncate">{src.url}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="relative group">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] font-mono text-[#4B5563]">RAW JSON PAYLOAD</span>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                                }}
                                className="text-[9px] font-medium text-[#00F5D4] hover:underline"
                              >
                                Copy JSON
                              </button>
                            </div>
                            <pre className="text-[10px] font-mono overflow-x-auto text-[#6B7280] p-4 bg-black/40 rounded-xl border border-white/5 max-h-[200px] custom-scrollbar">
                              {JSON.stringify(data, null, 2)}
                            </pre>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </aside>
          </>
        )}
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .prose-chat {
          font-size: 14px;
          line-height: 1.6;
        }
        .prose-chat h1 { font-size: 1.15rem !important; font-weight: 700 !important; margin: 0.5rem 0 !important; color: #F9FAFB !important; }
        .prose-chat h2 { font-size: 1.05rem !important; font-weight: 700 !important; margin: 0.5rem 0 !important; color: #F9FAFB !important; }
        .prose-chat h3 { font-size: 0.95rem !important; font-weight: 700 !important; margin: 0.4rem 0 !important; color: #F9FAFB !important; }
        .prose-chat p { margin-bottom: 0.75em; }
        .prose-chat p:last-child { margin-bottom: 0; }
        .prose-chat strong { color: #F9FAFB; font-weight: 600; }
        .prose-chat code {
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          background-color: rgba(0,245,212,0.1);
          color: #00F5D4;
          font-size: 0.875em;
        }
        .prose-chat ul, .prose-chat ol {
          margin-left: 1.5em;
          margin-bottom: 0.75em;
        }
        .prose-chat li { margin-bottom: 0.25em; }
        .prose-chat a { color: #00F5D4; }
        .prose-chat blockquote {
          border-left: 3px solid #00F5D4;
          padding-left: 1em;
          margin-left: 0;
          color: #9CA3AF;
        }
      `}</style>
    </div>
  );
}

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
  type ChatMessage,
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

type TabId = 'feed' | 'sources' | 'report' | 'raw' | 'chat';
type MsgRole = 'user' | 'bot' | 'system';

interface Msg {
  id: string | number;
  role: MsgRole;
  text: string;
  ts: number;
  sources?: any[];
  search_mode?: string;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Spinner() {
  return <span className="spinner" />;
}

function ChatBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`mb-3 ${isUser ? 'text-right' : 'text-left'}`}>
      <div
        className={`inline-block max-w-[88%] text-left px-3 py-2 border text-sm leading-relaxed rounded-lg shadow-sm
          ${isUser
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : msg.role === 'system'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-white border-slate-200 text-slate-800'}`}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
      </div>
      <div className="text-[10px] text-slate-500 mt-0.5">
        {isUser ? 'You' : msg.role === 'system' ? 'System' : 'AI'} &middot;{' '}
        {new Date(msg.ts).toLocaleTimeString()}
      </div>
    </div>
  );
}

function FeedItem({ ev }: { ev: ResearchEvent }) {
  const sev = ev.severity || 'info';
  const color = sev === 'error' ? 'text-rose-700' : sev === 'warning' ? 'text-amber-700' : 'text-slate-700';
  const detailsPreview = ev.details ? flattenObjectPreview(ev.details) : '';
  const isSource = ev.category === 'source';
  return (
    <div className={`py-1.5 border-b border-slate-200 text-xs leading-snug ${color}`}>
      {isSource && (
        <span className="inline-block bg-emerald-50 px-1.5 rounded text-[10px] mr-1.5 text-emerald-700 border border-emerald-200">
          source
        </span>
      )}
      {ev.stage && (
        <span className="inline-block bg-slate-100 px-1.5 rounded text-[10px] mr-1.5 text-slate-700 border border-slate-200">
          {ev.stage}
        </span>
      )}
      {ev.message || ev.category || 'Event'}
      <span className="text-slate-500 ml-2">{new Date(ev.created_at).toLocaleTimeString()}</span>
      {detailsPreview && (
        <pre className="mt-1 text-[10px] text-slate-400 whitespace-pre-wrap">{detailsPreview}</pre>
      )}
    </div>
  );
}

// ─── Sources Panel ───────────────────────────────────────────────────────────

const SOURCE_AGENTS: [string, string, string | null][] = [
  ['literature_review',   '📚 Literature', 'papers'],
  ['web_scraper',         '🌐 Web Sources', 'sources'],
  ['data_scraper',        '🌐 Scraped Data', 'results'],
  ['google_news',         '📰 News', 'results'],
  ['domain_intelligence', '🧠 Domain Intelligence', null],
  ['topic_discovery',     '🔎 Topic Discovery', 'topic_suggestions'],
  ['gap_synthesis',       '🔍 Gap Analysis', null],
  ['scoring',             '📊 Quality Score', null],
  ['fact_check',          '✅ Fact Check', null],
  ['bias_detection',      '⚖️ Bias Detection', null],
  ['visualization',       '📈 Visualization', null],
  ['innovation',          '💡 Innovation', null],
  ['technical_verification', '🔬 Technical Verification', null],
  ['chat_sources',        '💬 Chat References', 'sources'],
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
    return <p className="text-slate-500 text-sm">No data yet.</p>;
  }

  const findings = resultJson?.final_state?.findings || resultJson?.findings || {};
  const sections: JSX.Element[] = [];

  // Extract real-time sources from feedEvents + dedicated source endpoint
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
      // Deduplicate by URL or title
      const uniqueSources = Array.from(new Map(mergedSources.map(s => [s.url || s.title, s])).values());
      
      sections.push(
        <div key="realtime_sources" className="mb-6">
          <h4 className="text-sm font-semibold border-b border-emerald-200 pb-1 mb-2 text-emerald-700 flex items-center gap-2">
            <span className="relative flex h-2 w-2 shadow-[0_0_8px_rgba(52,211,153,0.8)]">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live Discovered Sources ({uniqueSources.length})
          </h4>
          {uniqueSources.slice(0, 50).map((item, i) => (
            <div key={`rt-${i}`} className="border border-emerald-200 bg-emerald-50 p-2.5 mb-2 text-xs rounded transition-all hover:bg-emerald-100">
              <p className="font-semibold mb-0.5 text-slate-900">[{i + 1}] {item.title || item.url || 'Live Source'}</p>
              {item.domain && <p className="text-emerald-700 font-medium mb-1 text-[11px]">Source: {item.domain}</p>}
              {item.abstract && (
                <p className="text-slate-700 mb-1 leading-relaxed">
                  {item.abstract.slice(0, 250)}...
                </p>
              )}
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer"
                  className="text-emerald-700 hover:text-emerald-800 underline text-[11px]">
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
          <h4 className="text-sm font-semibold border-b border-slate-200 pb-1 mb-2">{label} ({items.length})</h4>
          {items.slice(0, 15).map((item, i) => (
            <div key={i} className="border border-slate-200 bg-white p-2.5 mb-2 text-xs rounded">
              <p className="font-semibold mb-0.5 text-slate-900">[{i + 1}] {item.title || item.url || 'Item'}</p>
              {item.domain && <p className="text-emerald-700 font-medium mb-1 text-[11px]">Domain: {item.domain}</p>}
              {item.authors && <p className="text-slate-500 mb-0.5">{String(item.authors).slice(0, 120)}</p>}
              {item.novelty_angle && <p className="text-indigo-700 mb-1 leading-relaxed">Angle: {item.novelty_angle}</p>}
              {(item.abstract || item.summary || item.content || item.snippet) && (
                <p className="text-slate-700 mb-1 leading-relaxed">
                  {(item.abstract || item.summary || item.content || item.snippet || '').slice(0, 250)}...
                </p>
              )}
              {item.estimated_complexity && <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] mt-1 border border-slate-200">Complexity: {item.estimated_complexity}</span>}
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer"
                  className="text-blue-700 underline text-[11px]">
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
          <h4 className="text-sm font-semibold border-b border-slate-200 pb-1 mb-2">{label}</h4>
          <div className="border border-slate-200 bg-white p-2.5 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed rounded">
            {txt.slice(0, 800)}{txt.length > 800 ? '...' : ''}
          </div>
        </div>
      );
    }
  }

  return sections.length > 0
    ? <>{sections}</>
    : <p className="text-slate-500 text-sm">No structured sources. See Report tab.</p>;
}

// ─── Chat with AI panel ──────────────────────────────────────────────────────

// AI Chat Panel removed as it is now integrated into the main chat area

// ─── Section Editor ─────────────────────────────────────────────────────────

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
    <div className="group relative border-b border-slate-200 pb-8 mb-8 last:border-0 last:mb-0">
      <div className="prose-research mb-4">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
      </div>

      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        {!editing ? (
          <button 
            onClick={() => setEditing(true)}
            className="text-[10px] bg-white border border-slate-300 px-2 py-1 rounded hover:bg-slate-50 text-slate-700"
          >
            Edit with AI
          </button>
        ) : (
          <div className="w-full bg-emerald-50 border border-emerald-200 p-3 rounded-lg mt-2">
            <p className="text-[10px] text-emerald-700 mb-2 font-mono uppercase tracking-wider">AI Edit Instruction</p>
            <textarea
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              placeholder="e.g., 'Make this section more technical' or 'Add a table about...'"
              className="w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-800 mb-2 focus:border-emerald-500/50 outline-none"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="text-[10px] text-slate-500 hover:text-slate-800">Cancel</button>
              <button 
                onClick={handleEdit} 
                className="btn-primary px-3 py-1 text-[10px]"
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

// ─── Main Workspace Page ─────────────────────────────────────────────────────

export default function WorkspacePage() {
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
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

  // Right panel
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

  // Redirect if not auth
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  // Load workspace + sessions
  const loadWorkspace = useCallback(async () => {
    try {
      const data = await wsApi.get(wsId);
      setWsName(data.workspace?.name || 'Workspace');
      setSessions(data.sessions || []);
    } catch { /* ignore */ }
  }, [wsId]);

  useEffect(() => { if (user && wsId) loadWorkspace(); }, [user, wsId, loadWorkspace]);

  // Scroll helpers
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

  // ─── Add message to chat ────────────────────────────────────────────────────

  function addMsg(text: string, role: MsgRole, id?: string) {
    setMsgs(prev => [...prev, { id: id || crypto.randomUUID(), role, text, ts: Date.now() }]);
  }

  // ─── Clear right panels ──────────────────────────────────────────────────────

  function clearPanels() {
    setFeedEvents([]);
    setLiveSources([]);
    setResultJson(null);
    setReportMd('');
    setLatexSource('');
    setSectionsData([]);
  }

  // ─── Load a previous session ─────────────────────────────────────────────────

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

        // Load granular sections
        try {
          const sres = await wsApi.getSections(wsId, s.id);
          setSectionsData(sres.sections || []);
        } catch { /* ignore */ }

        // Load event history
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
        
        // Load existing chat history if any
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

      // Always load chat history if available
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

  // ─── SSE / Event polling ──────────────────────────────────────────────────────

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

    // Try true SSE stream first (realtime), keep polling as fallback/hydration.
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
          } catch { /* ignore malformed stream chunks */ }
        };

        es.onerror = () => {
          try { es.close(); } catch { }
          eventSourceRef.current = null;
        };
      } catch {
        // fallback polling below will continue
      }
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

  // ─── Poll research status ────────────────────────────────────────────────────

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
          consecutiveErrors = 0; // Reset on success

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
            
            // Fetch sections
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
            
            // Extract topics from final payload
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
            addMsg('Connection is unstable. We will keep retrying in background. You do not need to log out.', 'system');
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

  // ─── Dispatch research ────────────────────────────────────────────────────────

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
      
      // ── Backend detected a non-research intent (greeting, help, etc.) ──
      if (res.instant_reply) {
        setMsgs(prev => prev.filter(m => m.id !== processingMsgId));
        addMsg(res.instant_reply!, 'bot');
        setStatusText('');
        setRunning(false);
        return;
      }

      const sid = res.session_id!;
      setCurSession({ id: sid, topic, status: 'queued', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });

      // Update processing message
      setMsgs(prev => prev.map(m =>
        m.id === processingMsgId
          ? { ...m, text: `⏳ Job #${sid} created (${depth}). Agents working...` }
          : m
      ));

      await loadWorkspace();
      await pollResearch(sid);

      // Remove processing message
      setMsgs(prev => prev.filter(m => m.id !== processingMsgId));
    } catch (e: unknown) {
      setMsgs(prev => prev.filter(m => m.id !== processingMsgId));
      addMsg('Error: ' + (e instanceof Error ? e.message : 'Failed'), 'bot');
      setStatusText('Error');
      setRunning(false);
    }
  }

  // ─── Send from chat ───────────────────────────────────────────────────────────

  async function handleSend() {
    const q = chatInput.trim();
    if (!q || running) return;
    setChatInput('');
    setShowSlashHint(false);

    addMsg(q, 'user');

    // Slash commands — handle navigation ones locally, rest goes to backend
    const slash = parseSlashCommand(q);
    if (slash) {
      if (slash.cmd === 'history' || slash.cmd === 'profile') { router.push('/profile'); return; }
      const depthMap: Record<string, string> = { research: 'standard', deepresearch: 'deep', gatherdata: 'gather', help: 'standard' };
      const depth = depthMap[slash.cmd] || 'standard';
      // For /help with no args, ask backend (it'll classify as help intent)
      const topic = slash.args || (slash.cmd === 'help' ? 'help' : '');
      if (!topic) { addMsg(`Please provide a topic. Usage: **/${slash.cmd} [your research topic]**`, 'bot'); return; }
      await dispatchResearch(topic, depth);
      return;
    }

    // If a session is active and NOT a slash command, it's a chat message
    if (curSession && curSession.status === 'completed' && !slash) {
      addMsg('Thinking...', 'bot', 'thinking-' + q.length);
      try {
        const res = await chatApi.send(curSession.id, q);
        setMsgs(prev => prev.filter(m => m.id !== 'thinking-' + q.length));
        
        // Add message with sources
        setMsgs(prev => [...prev, { 
          id: res.message_id || crypto.randomUUID(), 
          role: 'bot', 
          text: res.reply, 
          ts: Date.now(),
          sources: res.sources,
          search_mode: res.search_mode as any
        }]);

        // Integrate chat sources into Sources Panel
        if (res.sources && res.sources.length > 0) {
          setResultJson(prev => {
            const next = prev ? { ...prev } : {};
            const findings = next.findings || {};
            findings.chat_sources = {
              agent: 'chatbot',
              response: { sources: res.sources }
            };
            next.findings = findings;
            return next as any;
          });
        }
      } catch (e: any) {
        setMsgs(prev => prev.filter(m => m.id !== 'thinking-' + q.length));
        addMsg('Chat Error: ' + e.message, 'bot');
      }
      return;
    }

    // All other messages go to backend — it decides: instant reply or research job
    await dispatchResearch(q, 'standard');
  }

  // ─── Export helper ────────────────────────────────────────────────────────────

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

  const TABS: { id: TabId; label: string }[] = [
    { id: 'feed', label: 'Live Feed' },
    { id: 'sources', label: 'Sources' },
    { id: 'report', label: 'Report' },
    { id: 'raw', label: 'Raw Data' },
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
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      className="flex flex-col workspace-root"
    >
      {/* Workspace header */}
      <div className="border-b border-slate-200 h-11 px-4 flex items-center justify-between flex-shrink-0 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3 text-sm text-slate-700">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-slate-500 hover:text-slate-900 cursor-pointer border-none bg-transparent"
          >
            ← Back
          </button>
          <span className="font-semibold text-slate-900">{wsName}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-600">
          <button
            type="button"
            onClick={toggleTheme}
            className="border border-slate-300 px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 text-xs text-slate-700"
            title="Toggle theme"
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          {running && <><Spinner /> <span>{statusText || 'Running'}</span> <span className="font-semibold text-emerald-700">Elapsed {formatDuration(elapsedSec)}</span></>}
          {!running && statusText && <span>{statusText}</span>}
          {curSession && !running && (
            <div className="flex gap-1">
              <button onClick={() => handleExport('markdown')}
                className="border border-slate-300 px-2 py-0.5 hover:bg-slate-100 cursor-pointer bg-white text-xs text-slate-700 rounded-md">
                ↓ MD
              </button>
              <button onClick={handlePdfExport}
                className="border border-slate-300 px-2 py-0.5 hover:bg-slate-100 cursor-pointer bg-white text-xs text-slate-700 rounded-md">
                ↓ PDF
              </button>
              <button onClick={handleLatexExport}
                className="border border-slate-300 px-2 py-0.5 hover:bg-slate-100 cursor-pointer bg-white text-xs text-slate-700 rounded-md">
                ↓ TEX
              </button>
              <button onClick={() => handleExport('json')}
                className="border border-slate-300 px-2 py-0.5 hover:bg-slate-100 cursor-pointer bg-white text-xs text-slate-700 rounded-md">
                ↓ JSON
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main panels */}
      <div className="flex flex-1 min-h-0">
        {/* Left: sessions sidebar + chat */}
        <div className="flex border-r border-slate-200" style={{ width: '55%' }}>
          {/* Sessions sidebar */}
          <div
            className="border-r border-slate-200 bg-white flex flex-col flex-shrink-0"
            style={{ width: 200 }}
          >
            <div className="px-3 py-2 text-[11px] font-semibold border-b border-slate-200 uppercase tracking-[0.16em] text-slate-500">Sessions</div>
            <div className="flex-1 overflow-y-auto">
              {sessions.length === 0 ? (
                <p className="text-xs text-slate-500 px-3 pt-2">No sessions yet</p>
              ) : (
                sessions.map(s => {
                  const label = s.topic || s.title || 'Untitled';
                  const short = label.length > 30 ? label.slice(0, 28) + '…' : label;
                  const isActive = curSession?.id === s.id;
                  const stClr = s.status === 'completed' ? 'text-emerald-700' : s.status === 'running' ? 'text-amber-700' : s.status === 'failed' ? 'text-rose-700' : 'text-slate-500';
                  return (
                    <div
                      key={s.id}
                      onClick={() => loadSession(s)}
                      className={`px-3 py-2 cursor-pointer border-b border-slate-100 text-xs hover:bg-slate-50 ${isActive ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-700'}`}
                    >
                      {short}
                      <br />
                      <span className={`text-[10px] ${stClr}`}>
                        {s.status} &middot; {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex flex-col flex-1 min-w-0 bg-white">
            {/* Messages */}
            <div ref={chatLogRef} className="flex-1 overflow-y-auto p-4">
              {msgs.length === 0 && (
                <div className="text-sm text-slate-600 leading-relaxed">
                  <p className="mb-2">Welcome to <span className="font-semibold text-slate-900">{wsName}</span>.</p>
                  <p className="mb-1">Ask a research question or trigger a pipeline with slash commands:</p>
                  <p className="text-xs text-slate-600 mb-0.5 font-mono"><code>/research [topic]</code> - Standard research</p>
                  <p className="text-xs text-slate-600 mb-0.5 font-mono"><code>/deepresearch [topic]</code> - Deep analysis</p>
                  <p className="text-xs text-slate-600 font-mono"><code>/gatherdata [topic]</code> - Data gathering only</p>
                </div>
              )}
              {msgs.map(m => <ChatBubble key={m.id} msg={m} />)}
            </div>

            {/* Slash hint */}
            {showSlashHint && (
              <div className="mx-4 mb-1 text-[11px] bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700">
                <span className="font-semibold">Commands:</span> /research · /deepresearch · /gatherdata · /help
              </div>
            )}

            {/* Input bar */}
            <div className="border-t border-slate-200 p-2.5 flex gap-2 flex-shrink-0 bg-white">
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
                rows={2}
                disabled={running}
                className="flex-1 input-field resize-none disabled:opacity-60"
              />
              {running ? (
                <button
                  onClick={() => { abortRef.current = true; setAbort(true); setRunning(false); setRunStartedAt(null); setElapsedSec(0); setStatusText('Stopped'); }}
                  className="border border-rose-300 text-rose-700 px-3 py-1 text-xs rounded-lg hover:bg-rose-50 cursor-pointer bg-white self-end"
                >
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!chatInput.trim()}
                  className="btn-primary px-4 py-1.5 text-xs self-end disabled:opacity-40"
                >
                  Send
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: tabbed panels */}
        <div className="flex flex-col flex-1 min-w-0 bg-white">
          {/* Tab bar */}
          <div className="flex border-b border-slate-200 flex-shrink-0 flex-wrap">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-[11px] border-none bg-transparent cursor-pointer border-b-2 transition-colors
                  ${tab === t.id ? 'border-b-emerald-500 text-emerald-700 font-semibold' : 'border-b-transparent text-slate-500 hover:bg-slate-100'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4 text-sm">
            {/* Live Feed */}
            {tab === 'feed' && (
              <div ref={feedRef}>
                {feedEvents.length === 0 ? (
                  <p className="text-sm text-slate-500">Live agent activity will stream here.</p>
                ) : (
                  feedEvents.map((ev, i) => <FeedItem key={ev.id ?? i} ev={ev} />)
                )}
              </div>
            )}

            {/* Sources */}
            {tab === 'sources' && <SourcesPanel resultJson={resultJson} feedEvents={feedEvents} liveSources={liveSources} />}

            {/* Report */}
            {tab === 'report' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="border border-slate-200 rounded p-2 bg-white">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Agents</p>
                    <p className="text-sm font-semibold text-slate-900">{rawKeys.length}</p>
                  </div>
                  <div className="border border-slate-200 rounded p-2 bg-white">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Live Sources</p>
                    <p className="text-sm font-semibold text-emerald-300">{scrapedCount}</p>
                  </div>
                  <div className="border border-slate-200 rounded p-2 bg-white">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Papers</p>
                    <p className="text-sm font-semibold text-blue-300">{literatureCount}</p>
                  </div>
                  <div className="border border-slate-200 rounded p-2 bg-white">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Status</p>
                    <p className="text-sm font-semibold text-slate-900">{statusText || curSession?.status || 'ready'}</p>
                  </div>
                </div>

                {findings.visualization?.echarts_config && (
                  <PremiumCharts 
                    config={findings.visualization.echarts_config} 
                    title="Data Analysis & Patterns" 
                    description={findings.visualization.description}
                  />
                )}
                
                {sections_data.length > 0 ? (
                  <div className="report-sections-container">
                    {sections_data.map(sec => (
                      <SectionEditor 
                        key={sec.id} 
                        section={sec} 
                        wsId={wsId} 
                        onUpdate={() => {
                          // Refresh sections and main report markdown
                          wsApi.getSections(wsId, curSession!.id).then(res => setSectionsData(res.sections));
                          wsApi.getResearchStatus(wsId, curSession!.id).then(res => setReportMd(res.report_markdown || ''));
                        }}
                      />
                    ))}
                  </div>
                ) : reportMd ? (
                  <div className="prose-research">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportMd}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Report appears after research completes.</p>
                )}

                {(latexSource || (resultJson as any)?.latex_source || (resultJson as any)?.final_state?.latex_source) && (
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-slate-900">LaTeX Source</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(latexSource || (resultJson as any)?.latex_source || (resultJson as any)?.final_state?.latex_source || '')}
                          className="border border-slate-300 px-2 py-0.5 text-[11px] rounded hover:bg-slate-100 text-slate-700"
                        >
                          Copy
                        </button>
                        <button
                          onClick={handleCompilePdf}
                          disabled={compileBusy}
                          className="border border-emerald-700/70 px-2 py-0.5 text-[11px] rounded hover:bg-emerald-950/40 text-emerald-300 disabled:opacity-50"
                        >
                          {compileBusy ? 'Compiling...' : 'Compile PDF'}
                        </button>
                      </div>
                    </div>
                    <pre className="text-[11px] text-slate-700 bg-white border border-slate-200 rounded p-3 overflow-x-auto whitespace-pre-wrap">
                      {latexSource || (resultJson as any)?.latex_source || (resultJson as any)?.final_state?.latex_source}
                    </pre>
                  </div>
                )}

                {galleryImages && galleryImages.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 italic underline decoration-emerald-500/30">Visual Intelligence Gallery</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {galleryImages.map((img: any, i: number) => (
                        <div key={i} className="group relative rounded-xl overflow-hidden border border-slate-200 bg-white hover:border-emerald-500/40 transition-all">
                          <img 
                            src={normalizeImageUrl(img.original)} 
                            alt={`Insight ${i+1}`}
                            className="w-full h-48 object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                          />
                          <div className="p-2 bg-slate-50 text-[10px] text-slate-600 truncate backdrop-blur-sm">
                            Source: {img.source_url ? (() => { try { return new URL(img.source_url).hostname; } catch { return img.source_url; } })() : 'Generated'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Raw Data */}
            {tab === 'raw' && (
              rawKeys.length === 0
                ? <p className="text-sm text-slate-400">Raw agent data appears here.</p>
                : (
                  <div>
                    <p className="text-xs font-semibold mb-3 text-slate-600">{rawKeys.length} agents responded</p>
                    {rawKeys.map(k => {
                      const v = findings[k] as unknown;
                      const preview = typeof v === 'string'
                        ? v.slice(0, 600)
                        : JSON.stringify(v, null, 2).slice(0, 600);
                      return (
                        <div key={k} className="border border-slate-200 rounded-lg p-2.5 mb-2 bg-white">
                          <h4 className="text-xs font-semibold mb-1 text-slate-800">{k}</h4>
                          <pre className="text-[11px] text-slate-700 whitespace-pre-wrap overflow-x-auto">{preview}...</pre>
                        </div>
                      );
                    })}
                  </div>
                )
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

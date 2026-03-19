'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  workspaces as wsApi,
  events as eventsApi,
  chat as chatApi,
  exportApi,
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
            ? 'bg-emerald-500/10 border-emerald-400/60 text-emerald-100'
            : msg.role === 'system'
              ? 'bg-slate-900/70 border-slate-700 text-slate-200'
              : 'bg-slate-900/80 border-slate-700 text-slate-100'}`}
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
  const color = sev === 'error' ? 'text-rose-300' : sev === 'warning' ? 'text-amber-300' : 'text-slate-200';
  return (
    <div className={`py-1 border-b border-slate-800/80 text-xs leading-snug ${color}`}>
      {ev.stage && (
        <span className="inline-block bg-slate-900/80 px-1.5 rounded text-[10px] mr-1.5 text-slate-300 border border-slate-700/70">
          {ev.stage}
        </span>
      )}
      {ev.message || ev.category || 'Event'}
      <span className="text-slate-500 ml-2">{new Date(ev.created_at).toLocaleTimeString()}</span>
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

function SourcesPanel({ resultJson, feedEvents }: { resultJson: ResearchResult | null, feedEvents?: any[] }) {
  if (!resultJson && (!feedEvents || feedEvents.length === 0)) return <p className="text-slate-400 text-sm">No data yet.</p>;

  const findings = resultJson?.final_state?.findings || resultJson?.findings || {};
  const sections: JSX.Element[] = [];

  // Extract real-time sources from feedEvents (Live during research)
  if (feedEvents && feedEvents.length > 0) {
    const realtimeSources = feedEvents.filter(e => e.category === 'source').map(e => ({
      title: e.details?.title || e.message,
      url: e.details?.url,
      abstract: e.details?.description || e.details?.snippet,
      domain: e.details?.domain || e.details?.source_type,
    }));

    if (realtimeSources.length > 0) {
      // Deduplicate by URL or title
      const uniqueSources = Array.from(new Map(realtimeSources.map(s => [s.url || s.title, s])).values());
      
      sections.push(
        <div key="realtime_sources" className="mb-6">
          <h4 className="text-sm font-semibold border-b border-emerald-900/50 pb-1 mb-2 text-emerald-400 flex items-center gap-2">
            <span className="relative flex h-2 w-2 shadow-[0_0_8px_rgba(52,211,153,0.8)]">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live Discovered Sources ({uniqueSources.length})
          </h4>
          {uniqueSources.slice(0, 50).map((item, i) => (
            <div key={`rt-${i}`} className="border border-emerald-900/40 bg-emerald-950/20 p-2.5 mb-2 text-xs rounded transition-all hover:bg-emerald-900/30">
              <p className="font-semibold mb-0.5 text-slate-100">[{i + 1}] {item.title || item.url || 'Live Source'}</p>
              {item.domain && <p className="text-emerald-500 font-medium mb-1 text-[11px]">Source: {item.domain}</p>}
              {item.abstract && (
                <p className="text-slate-300 mb-1 leading-relaxed">
                  {item.abstract.slice(0, 250)}...
                </p>
              )}
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 underline text-[11px]">
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
          <h4 className="text-sm font-semibold border-b border-gray-100 pb-1 mb-2">{label} ({items.length})</h4>
          {items.slice(0, 15).map((item, i) => (
            <div key={i} className="border border-gray-200 p-2.5 mb-2 text-xs">
              <p className="font-semibold mb-0.5 text-slate-100">[{i + 1}] {item.title || item.url || 'Item'}</p>
              {item.domain && <p className="text-emerald-400 font-medium mb-1 text-[11px]">Domain: {item.domain}</p>}
              {item.authors && <p className="text-slate-400 mb-0.5">{String(item.authors).slice(0, 120)}</p>}
              {item.novelty_angle && <p className="text-indigo-300 mb-1 leading-relaxed">Angle: {item.novelty_angle}</p>}
              {(item.abstract || item.summary || item.content || item.snippet) && (
                <p className="text-slate-300 mb-1 leading-relaxed">
                  {(item.abstract || item.summary || item.content || item.snippet || '').slice(0, 250)}...
                </p>
              )}
              {item.estimated_complexity && <span className="inline-block px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] mt-1 border border-slate-700">Complexity: {item.estimated_complexity}</span>}
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
      const txt = typeof resp === 'string' ? resp : JSON.stringify(resp, null, 2);
      if (txt.length < 10) continue;
      sections.push(
        <div key={key} className="mb-4">
          <h4 className="text-sm font-semibold border-b border-gray-100 pb-1 mb-2">{label}</h4>
          <div className="border border-gray-200 p-2.5 text-xs text-gray-700 whitespace-pre-wrap">
            {txt.slice(0, 800)}{txt.length > 800 ? '...' : ''}
          </div>
        </div>
      );
    }
  }

  return sections.length > 0
    ? <>{sections}</>
    : <p className="text-gray-400 text-sm">No structured sources. See Report tab.</p>;
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
    <div className="group relative border-b border-slate-800/60 pb-8 mb-8 last:border-0 last:mb-0">
      <div className="prose-research mb-4">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
      </div>

      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        {!editing ? (
          <button 
            onClick={() => setEditing(true)}
            className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-1 rounded hover:bg-slate-800 text-slate-300"
          >
            Edit with AI
          </button>
        ) : (
          <div className="w-full bg-slate-900/80 border border-emerald-500/30 p-3 rounded-lg mt-2">
            <p className="text-[10px] text-emerald-400 mb-2 font-mono uppercase tracking-wider">AI Edit Instruction</p>
            <textarea
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              placeholder="e.g., 'Make this section more technical' or 'Add a table about...'"
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 mb-2 focus:border-emerald-500/50 outline-none"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="text-[10px] text-slate-400 hover:text-slate-200">Cancel</button>
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
  const [abort, setAbort] = useState(false);
  const abortRef = useRef(false);
  const [statusText, setStatusText] = useState('');

  // Right panel
  const [tab, setTab] = useState<TabId>('feed');
  const [feedEvents, setFeedEvents] = useState<ResearchEvent[]>([]);
  const [resultJson, setResultJson] = useState<ResearchResult | null>(null);
  const [reportMd, setReportMd] = useState('');
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

  // ─── Add message to chat ────────────────────────────────────────────────────

  function addMsg(text: string, role: MsgRole, id?: string) {
    setMsgs(prev => [...prev, { id: id || crypto.randomUUID(), role, text, ts: Date.now() }]);
  }

  // ─── Clear right panels ──────────────────────────────────────────────────────

  function clearPanels() {
    setFeedEvents([]);
    setResultJson(null);
    setReportMd('');
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
        addMsg(full.report_markdown || 'Research completed. See Report tab.', 'bot');
        if (full.result_json) setResultJson(full.result_json);
        if (full.report_markdown) setReportMd(full.report_markdown);
        setStatusText('✓ Completed');

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

        setTab('report');
      } else if (full.status === 'running' || full.status === 'queued') {
        addMsg('This research is still running. Reconnecting to live updates...', 'system');
        setStatusText('Running...');
        
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

  const stopEventPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const startEventPolling = useCallback((sid: number) => {
    stopEventPolling();
    let lastCount = 0;
    pollingIntervalRef.current = setInterval(async () => {
      if (abortRef.current) { stopEventPolling(); return; }
      try {
        const evts = await eventsApi.list(sid);
        if (Array.isArray(evts) && evts.length > lastCount) {
          setFeedEvents(prev => {
            const newOnes = evts.slice(lastCount);
            return [...prev, ...newOnes];
          });
          lastCount = evts.length;
        }
      } catch { /* ignore */ }
    }, 3000);
  }, [stopEventPolling]);

  // ─── Poll research status ────────────────────────────────────────────────────

  async function pollResearch(sid: number) {
    if (running) return; 
    setRunning(true);
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
            const report = s.report_markdown || 'Research completed. See Report tab.';
            addMsg(report, 'bot');
            if (s.result_json) setResultJson(s.result_json);
            if (s.report_markdown) setReportMd(s.report_markdown);
            setStatusText('✓ Completed');
            
            // Fetch sections
            try {
              const sres = await wsApi.getSections(wsId, sid);
              setSectionsData(sres.sections || []);
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
          if (consecutiveErrors > 5) {
            addMsg('Connection lost. Please refresh the page.', 'system');
            break;
          }
        }
      }
    } finally {
      stopEventPolling();
      setRunning(false);
      await loadWorkspace();
    }
  }

  // ─── Dispatch research ────────────────────────────────────────────────────────

  async function dispatchResearch(topic: string, depth: string) {
    clearPanels();
    setStatusText('Submitting...');
    setTab('feed');
    setTab('feed');
    setRunning(true);
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

  return (
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      className="flex flex-col workspace-root"
    >
      {/* Workspace header */}
      <div className="border-b border-slate-800/80 h-11 px-4 flex items-center justify-between flex-shrink-0 bg-slate-950/80 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3 text-sm text-slate-200">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-slate-400 hover:text-slate-100 cursor-pointer border-none bg-transparent"
          >
            ← Back
          </button>
          <span className="font-semibold text-slate-50">{wsName}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          {running && <><Spinner /> <span>{statusText || 'Running'}</span></>}
          {!running && statusText && <span>{statusText}</span>}
          {curSession && !running && (
            <div className="flex gap-1">
              <button onClick={() => handleExport('markdown')}
                className="border border-slate-700/70 px-2 py-0.5 hover:bg-slate-900 cursor-pointer bg-slate-950 text-xs text-slate-100 rounded-md">
                ↓ MD
              </button>
              <button onClick={() => handleExport('json')}
                className="border border-slate-700/70 px-2 py-0.5 hover:bg-slate-900 cursor-pointer bg-slate-950 text-xs text-slate-100 rounded-md">
                ↓ JSON
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main panels */}
      <div className="flex flex-1 min-h-0">
        {/* Left: sessions sidebar + chat */}
        <div className="flex border-r border-slate-800/80" style={{ width: '55%' }}>
          {/* Sessions sidebar */}
          <div
            className="border-r border-slate-800/80 bg-slate-950/60 flex flex-col flex-shrink-0"
            style={{ width: 200 }}
          >
            <div className="px-3 py-2 text-[11px] font-semibold border-b border-slate-800/80 uppercase tracking-[0.16em] text-slate-400">Sessions</div>
            <div className="flex-1 overflow-y-auto">
              {sessions.length === 0 ? (
                <p className="text-xs text-slate-500 px-3 pt-2">No sessions yet</p>
              ) : (
                sessions.map(s => {
                  const label = s.topic || s.title || 'Untitled';
                  const short = label.length > 30 ? label.slice(0, 28) + '…' : label;
                  const isActive = curSession?.id === s.id;
                  const stClr = s.status === 'completed' ? 'text-emerald-300' : s.status === 'running' ? 'text-amber-300' : s.status === 'failed' ? 'text-rose-300' : 'text-slate-500';
                  return (
                    <div
                      key={s.id}
                      onClick={() => loadSession(s)}
                      className={`px-3 py-2 cursor-pointer border-b border-slate-900 text-xs hover:bg-slate-900/80 ${isActive ? 'bg-slate-900 font-semibold text-slate-50' : 'text-slate-300'}`}
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
          <div className="flex flex-col flex-1 min-w-0 bg-slate-950/40">
            {/* Messages */}
            <div ref={chatLogRef} className="flex-1 overflow-y-auto p-4">
              {msgs.length === 0 && (
                <div className="text-sm text-slate-400 leading-relaxed">
                  <p className="mb-2">Welcome to <span className="font-semibold text-slate-100">{wsName}</span>.</p>
                  <p className="mb-1">Ask a research question or trigger a pipeline with slash commands:</p>
                  <p className="text-xs text-slate-300 mb-0.5 font-mono"><code>/research [topic]</code> — Standard research</p>
                  <p className="text-xs text-slate-300 mb-0.5 font-mono"><code>/deepresearch [topic]</code> — Deep analysis</p>
                  <p className="text-xs text-slate-300 font-mono"><code>/gatherdata [topic]</code> — Data gathering only</p>
                </div>
              )}
              {msgs.map(m => <ChatBubble key={m.id} msg={m} />)}
            </div>

            {/* Slash hint */}
            {showSlashHint && (
              <div className="mx-4 mb-1 text-[11px] bg-slate-900/80 border border-slate-700 px-3 py-1.5 rounded-lg text-slate-200">
                <span className="font-semibold">Commands:</span> /research · /deepresearch · /gatherdata · /help
              </div>
            )}

            {/* Input bar */}
            <div className="border-t border-slate-800/80 p-2.5 flex gap-2 flex-shrink-0 bg-slate-950/80">
              <textarea
                value={chatInput}
                onChange={e => {
                  setChatInput(e.target.value);
                  setShowSlashHint(e.target.value === '/');
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="Ask a question or type / for commands…"
                rows={2}
                disabled={running}
                className="flex-1 input-field resize-none disabled:opacity-60"
              />
              {running ? (
                <button
                  onClick={() => { abortRef.current = true; setAbort(true); setRunning(false); setStatusText('Stopped'); }}
                  className="border border-rose-400 text-rose-200 px-3 py-1 text-xs rounded-lg hover:bg-rose-950/60 cursor-pointer bg-slate-950 self-end"
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
        <div className="flex flex-col flex-1 min-w-0 bg-slate-950/40">
          {/* Tab bar */}
          <div className="flex border-b border-slate-800/80 flex-shrink-0 flex-wrap">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-[11px] border-none bg-transparent cursor-pointer border-b-2 transition-colors
                  ${tab === t.id ? 'border-b-emerald-400 text-emerald-300 font-semibold' : 'border-b-transparent text-slate-400 hover:bg-slate-900/60'}`}
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
                  <p className="text-sm text-slate-400">Live agent activity will stream here.</p>
                ) : (
                  feedEvents.map((ev, i) => <FeedItem key={ev.id ?? i} ev={ev} />)
                )}
              </div>
            )}

            {/* Sources */}
            {tab === 'sources' && <SourcesPanel resultJson={resultJson} />}

            {/* Report */}
            {tab === 'report' && (
              <div className="space-y-6">
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

                {findings.visualization?.images_metadata && findings.visualization.images_metadata.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-slate-800/80">
                    <h3 className="text-lg font-bold text-slate-100 mb-4 italic underline decoration-emerald-500/30">Visual Intelligence Gallery</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {findings.visualization.images_metadata.map((img: any, i: number) => (
                        <div key={i} className="group relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900/40 hover:border-emerald-500/40 transition-all">
                          <img 
                            src={img.original} 
                            alt={`Insight ${i+1}`}
                            className="w-full h-48 object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                          />
                          <div className="p-2 bg-slate-950/80 text-[10px] text-slate-400 truncate backdrop-blur-sm">
                            Source: {new URL(img.original).hostname}
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
                    <p className="text-xs font-semibold mb-3 text-slate-300">{rawKeys.length} agents responded</p>
                    {rawKeys.map(k => {
                      const v = findings[k] as unknown;
                      const preview = typeof v === 'string'
                        ? v.slice(0, 600)
                        : JSON.stringify(v, null, 2).slice(0, 600);
                      return (
                        <div key={k} className="border border-slate-800 rounded-lg p-2.5 mb-2 bg-slate-950/60">
                          <h4 className="text-xs font-semibold mb-1 text-slate-200">{k}</h4>
                          <pre className="text-[11px] text-slate-300 whitespace-pre-wrap overflow-x-auto">{preview}…</pre>
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

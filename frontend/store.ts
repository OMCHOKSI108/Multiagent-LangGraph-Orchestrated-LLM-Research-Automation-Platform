import { create } from 'zustand';
import { JobStatus, ResearchJob, LogEntry, ChatMessage, User, ApiKeys, UsageStats, Memory, SearchResponse, LLMStatus } from './types';
import { api } from './services/api';
import { toast } from 'sonner';

interface ExecutionEvent {
  event_id: string;
  timestamp: string;
  stage: string;
  severity: 'info' | 'warn' | 'error' | 'success';
  category: string;
  message: string;
  details?: Record<string, any>;
}

interface DataSource {
  source_type: string;
  domain: string;
  status: 'success' | 'partial' | 'failed' | 'pending';
  items_found: number;
  url?: string;
  title?: string;
  description?: string;
  favicon?: string;
  thumbnail?: string;
  published_date?: string;
  citation_text?: string;
}

interface ResearchStore {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  clearAuthError: () => void;
  rehydrateAuth: () => Promise<void>;
  updatePassword: (current: string, newPass: string) => Promise<void>;
  updateProfile: (name: string) => Promise<void>;

  // Settings
  apiKeys: ApiKeys;
  usageStats: UsageStats | null;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  saveApiKeys: (keys: ApiKeys) => void;
  fetchUsageStats: () => Promise<void>;
  testConnection: (provider: 'gemini' | 'groq', key: string) => Promise<{ latency: number; status: 'ok' | 'error' }>;

  // Lists
  researches: ResearchJob[];
  loadingList: boolean;

  // Active Workspace
  activeJob: ResearchJob | null;
  chatHistory: ChatMessage[];
  isPolling: boolean;

  // Live Execution State
  executionEvents: ExecutionEvent[];
  dataSources: DataSource[];
  topicSuggestions: any[]; // New
  currentStage: string;
  startedAt: string | null;
  completedAt: string | null;
  eventSource: EventSource | null;
  chatSessionId: string | null;
  setCurrentStage: (stage: string) => void;
  setStartedAt: (iso: string) => void;
  setTopicSuggestions: (suggestions: any[]) => void;

  // Actions
  fetchResearches: () => Promise<void>;
  createResearch: (topic: string, depth: 'quick' | 'deep') => Promise<string>;
  setActiveJob: (id: string) => Promise<void>;
  addChatMessage: (content: string, role: 'user' | 'assistant', signal?: AbortSignal) => Promise<void>;
  renameResearch: (id: string, title: string) => Promise<void>;
  deleteResearch: (id: string) => Promise<void>;

  // Live Events
  subscribeToLiveEvents: (id: string) => void;
  unsubscribeLiveEvents: () => void;
  addExecutionEvent: (event: ExecutionEvent) => void;
  setDataSources: (sources: DataSource[]) => void;

  // Polling
  startPolling: (id: string) => void;
  stopPolling: () => void;

  // Memories
  memories: Memory[];
  memoriesLoading: boolean;
  fetchMemories: () => Promise<void>;
  addMemory: (content: string) => Promise<void>;
  deleteMemory: (id: number) => Promise<void>;

  // Web Search
  searchResults: SearchResponse | null;
  searchLoading: boolean;
  searchWeb: (query: string, providers?: string[]) => Promise<void>;

  // Export
  exportMarkdown: (id: string) => Promise<void>;
  exportPDF: (id: string) => Promise<void>;
  exportLatex: (id: string) => Promise<void>;

  // LLM Status
  llmStatus: LLMStatus | null;
  llmStatusLoading: boolean;
  fetchLLMStatus: () => Promise<void>;

  // Providers
  providers: any;
  fetchProviders: () => Promise<void>;
}

export const useResearchStore = create<ResearchStore>((set, get) => {
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let liveSubscriptionSeq = 0;
  let liveReconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const CHAT_SESSION_MAP_KEY = 'dre_chat_sessions';
  const getChatSessionMap = (): Record<string, string> => {
    try {
      const raw = localStorage.getItem(CHAT_SESSION_MAP_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };
  const saveChatSession = (researchId: string, sessionId: string) => {
    const map = getChatSessionMap();
    map[researchId] = sessionId;
    localStorage.setItem(CHAT_SESSION_MAP_KEY, JSON.stringify(map));
  };
  const getChatSession = (researchId: string): string | null => {
    const map = getChatSessionMap();
    return map[researchId] || null;
  };

  const storedKeys = localStorage.getItem('dre_api_keys');
  const initialKeys = storedKeys ? JSON.parse(storedKeys) : {};

  return {
    user: null as User | null,
    isAuthenticated: false,
    authError: null,

    apiKeys: initialKeys,
    usageStats: null,
    isSettingsOpen: false,

    researches: [],
    loadingList: false,
    activeJob: null,
    chatHistory: [],
    isPolling: false,

    // Live execution state
    executionEvents: [],
    dataSources: [],
    topicSuggestions: [], // New state for topic proposals
    currentStage: 'queued',
    startedAt: null,
    completedAt: null,
    eventSource: null,
    chatSessionId: null,
    setCurrentStage: (stage: string) => {
      set({ currentStage: stage });
    },
    setStartedAt: (iso: string) => {
      set({ startedAt: iso });
    },
    setTopicSuggestions: (suggestions: any[]) => {
      set({ topicSuggestions: suggestions });
    },

    // Auth Actions
    login: async (email, password) => {
      set({ authError: null });
      try {
        const { token, user } = await api.login(email, password);
        localStorage.setItem('dre_token', token);
        set({ user, isAuthenticated: true });
        toast.success('Successfully logged in! Welcome back.');
      } catch (err: any) {
        console.error("Login Error:", err);
        set({ authError: err.message || 'Login failed' });
        toast.error(err.message || 'Login failed');
      }
    },

    signup: async (email, password, username) => {
      set({ authError: null });
      try {
        const { token, user } = await api.signup(email, password, username);
        localStorage.setItem('dre_token', token);
        set({ user, isAuthenticated: true });
        toast.success('Account created successfully! Welcome to the platform.');
      } catch (err: any) {
        set({ authError: err.message || 'Signup failed' });
        toast.error(err.message || 'Signup failed');
      }
    },

    logout: () => {
      // Unsubscribe from live events first
      get().unsubscribeLiveEvents();
      // Clear all localStorage
      localStorage.removeItem('dre_token');
      localStorage.removeItem('dre_api_key');
      localStorage.removeItem('dre_api_keys');
      localStorage.removeItem(CHAT_SESSION_MAP_KEY);
      // Reset ALL state to prevent data leaks
      set({
        user: null,
        isAuthenticated: false,
        researches: [],
        activeJob: null,
        chatHistory: [],
        chatSessionId: null,
        executionEvents: [],
        dataSources: [],
        topicSuggestions: [],
        currentStage: 'queued',
        startedAt: null,
        completedAt: null,
        eventSource: null,
        memories: [],
      });
    },

    clearAuthError: () => set({ authError: null }),

    rehydrateAuth: async () => {
      const token = localStorage.getItem('dre_token');
      if (!token) return;
      try {
        const user = await api.getMe();
        set({ user, isAuthenticated: true });
      } catch {
        // Token invalid or expired — clear it
        localStorage.removeItem('dre_token');
        set({ user: null, isAuthenticated: false });
      }
    },

    updatePassword: async (current, newPass) => {
      await api.updatePassword(current, newPass);
    },

    updateProfile: async (name) => {
      const user = await api.updateProfile(name);
      set({ user });
      toast.success('Profile updated successfully.');
    },

    // Settings Actions
    openSettings: () => {
      set({ isSettingsOpen: true });
      get().fetchUsageStats();
    },
    closeSettings: () => set({ isSettingsOpen: false }),

    saveApiKeys: (keys) => {
      localStorage.setItem('dre_api_keys', JSON.stringify(keys));
      // Note: dre_api_key is the backend auth key — do NOT overwrite it here
      set({ apiKeys: keys });
    },

    fetchUsageStats: async () => {
      const stats = await api.getUsageStats();
      set({ usageStats: stats });
    },

    testConnection: async (provider, key) => {
      return await api.testConnection(provider, key);
    },

    // Research Actions
    fetchResearches: async () => {
      set({ loadingList: true });
      try {
        const data = await api.getResearches();
        set({ researches: data });
      } finally {
        set({ loadingList: false });
      }
    },

    createResearch: async (topic, depth) => {
      const job = await api.createResearch(topic, depth);
      set((state) => ({ researches: [job, ...state.researches] }));
      return job.id;
    },

    setActiveJob: async (id) => {
      set({ activeJob: null, chatHistory: [], chatSessionId: null });
      const job = await api.getResearch(id);

      // Extraction Logic – visualization, report, and sources are independent
      const visResponse = job.result_json?.final_state?.findings?.visualization?.response;
      if (visResponse) {
        if (visResponse.images_metadata && Array.isArray(visResponse.images_metadata)) {
          job.images = visResponse.images_metadata.map((img: any) =>
            img.local ? `${api.BASE_URL}${img.local.startsWith('/') ? '' : '/'}${img.local}` : img.original
          );
        } else if (visResponse.image_urls && Array.isArray(visResponse.image_urls)) {
          job.images = visResponse.image_urls.map((url: string) =>
            url.startsWith('/') ? `${api.BASE_URL}${url}` : url
          );
        }

        const diagrams: string[] = [];
        if (visResponse.timeline_mermaid) diagrams.push(visResponse.timeline_mermaid);
        if (visResponse.methodology_mermaid) diagrams.push(visResponse.methodology_mermaid);
        if (visResponse.data_chart_mermaid) diagrams.push(visResponse.data_chart_mermaid);
        job.diagrams = diagrams;
      }

      // Report markdown extraction (independent of visualization)
      if (!job.reportMarkdown && job.result_json?.final_state?.findings?.multi_stage_report?.response) {
        job.reportMarkdown = job.result_json.final_state.findings.multi_stage_report.response;
      }

      // Extract Sources from result_json if available (independent of visualization)
      const sources: DataSource[] = [];
      const findings = job.result_json?.final_state?.findings;

      if (findings) {
        // Extract from Google News
        if (findings.google_news?.response?.results) {
          (findings.google_news.response.results as any[]).forEach(item => {
            let domain = 'unknown';
            try { domain = new URL(item.url).hostname.replace('www.', ''); } catch {}
            sources.push({
              source_type: 'news',
              domain,
              status: 'success',
              items_found: 1,
              url: item.url,
              title: item.title,
              description: item.snippet || item.description,
            });
          });
        }

        // Extract from Arxiv/Scholar/Literature
        if (findings.literature_review?.response?.papers) {
          (findings.literature_review.response.papers as any[]).forEach(paper => {
            let domain = 'arxiv.org';
            try { if (paper.url) domain = new URL(paper.url).hostname.replace('www.', ''); } catch {}
            sources.push({
              source_type: 'arxiv',
              domain,
              status: 'success',
              items_found: 1,
              url: paper.url,
              title: paper.title,
              description: paper.abstract || paper.summary,
            });
          });
        }

        // Extract from web_scraper (general)
        if (findings.web_scraper?.response?.sources) {
          (findings.web_scraper.response.sources as any[]).forEach(src => {
            let domain = 'unknown';
            try { domain = new URL(src).hostname.replace('www.', ''); } catch {}
            sources.push({
              source_type: 'web',
              domain,
              status: 'success',
              items_found: 1,
              url: src,
            });
          });
        }

        // Extract from discovery agent
        if (findings.discovery?.response?.results) {
          (findings.discovery.response.results as any[]).forEach((item: any) => {
            let domain = 'unknown';
            try { domain = new URL(item.url || item.link).hostname.replace('www.', ''); } catch {}
            sources.push({
              source_type: item.source_type || 'web',
              domain,
              status: 'success',
              items_found: 1,
              url: item.url || item.link,
              title: item.title,
              description: item.snippet || item.description || item.abstract,
            });
          });
        }

        // Extract from scraper results
        if (findings.scraper?.response?.results || findings.web_scraper?.response?.results) {
          const scraperResults = findings.scraper?.response?.results || findings.web_scraper?.response?.results || [];
          (scraperResults as any[]).forEach((item: any) => {
            let domain = 'unknown';
            try { domain = new URL(item.url || item.link).hostname.replace('www.', ''); } catch {}
            sources.push({
              source_type: 'web',
              domain,
              status: item.status || 'success',
              items_found: 1,
              url: item.url || item.link,
              title: item.title,
              description: item.content?.substring(0, 200) || item.description,
            });
          });
        }
      }

      if (sources.length > 0) {
        get().setDataSources(sources);
      }

      set({
        activeJob: job,
        // Fallback to createdAt if startedAt is missing, enables timer immediately
        startedAt: job.createdAt
      });

      const existingSessionId = getChatSession(id);
      if (existingSessionId) {
        try {
          const history = await api.getChatHistory(existingSessionId);
          const mappedHistory: ChatMessage[] = history.map((entry) => ({
            id: Math.random().toString(36),
            role: entry.role,
            content: entry.message,
            timestamp: entry.created_at,
          }));
          set({
            chatSessionId: existingSessionId,
            chatHistory: mappedHistory,
          });
        } catch (err) {
          console.warn('Failed to hydrate chat history for session:', existingSessionId, err);
        }
      }

      if (job.status !== JobStatus.COMPLETED && job.status !== JobStatus.FAILED) {
        get().startPolling(id);
      }
    },

    deleteResearch: async (id) => {
      try {
        await api.deleteResearch(id);
        set((state) => ({
          researches: state.researches.filter((r) => r.id !== id),
          activeJob: state.activeJob?.id === id ? null : state.activeJob,
        }));
        toast.success('Workspace deleted successfully.');
      } catch (err: any) {
        toast.error(err?.message || 'Failed to delete workspace.');
        throw err;
      }
    },

    addChatMessage: async (content, role, signal) => {
      const msg: ChatMessage = {
        id: Math.random().toString(36),
        role,
        content,
        timestamp: new Date().toISOString(),
      };
      set((state) => ({ chatHistory: [...state.chatHistory, msg] }));

      if (role === 'user') {
        const activeJob = get().activeJob;
        if (!activeJob) {
          // Add a helpful message indicating no active research
          const helpMsg: ChatMessage = {
            id: Math.random().toString(36),
            role: 'assistant',
            content: 'Please start a research first by going to the dashboard and creating a new research topic. You can then chat about your research in the workspace.',
            timestamp: new Date().toISOString(),
          };
          set((state) => ({ chatHistory: [...state.chatHistory, helpMsg] }));
          return;
        }

        // Create a placeholder assistant message for streaming
        const assistantMsgId = Math.random().toString(36);
        const assistantMsg: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
        };
        set((state) => ({ chatHistory: [...state.chatHistory, assistantMsg] }));

        try {
          const sessionId = get().chatSessionId;
          const response = await api.streamChat(activeJob.id, content, sessionId, signal);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          // Read the session ID from the response header
          const newSessionId = response.headers.get('X-Session-ID');
          if (newSessionId) {
            set({ chatSessionId: newSessionId });
            saveChatSession(activeJob.id, newSessionId);
          }

          // Stream the SSE response
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let fullText = '';

          if (reader) {
            try {
              let buffer = '';
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const rawLine of lines) {
                  // Handle CRLF by removing \r if present
                  const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;

                  if (!line.startsWith('data:')) continue;

                  // Spec-compliant parsing: remove "data:" and optional single leading space
                  let payload = line.substring(5);
                  if (payload.startsWith(' ')) {
                    payload = payload.substring(1);
                  }

                  if (!payload || payload === '[DONE]') continue;
                  if (payload.startsWith('[ERROR]')) throw new Error(payload);

                  // Accept plain text payloads and JSON payloads.
                  let delta = payload;
                  if (payload.startsWith('{') || payload.startsWith('[')) {
                    try {
                      const parsed = JSON.parse(payload);
                      delta = parsed?.delta || parsed?.token || parsed?.text || '';
                      // Validate delta is string
                      if (typeof delta !== 'string') {
                        console.warn('Non-string delta received:', delta);
                        delta = String(delta || '');
                      }
                    } catch (parseError) {
                      console.warn('JSON parse failed for payload:', payload, parseError);
                      // Use raw text only if it looks safe (no control characters)
                      delta = payload.includes('{') ? '' : payload;
                    }
                  }

                  // Skip empty or invalid deltas
                  if (!delta || typeof delta !== 'string') continue;
                  fullText += delta;
                  set((state) => ({
                    chatHistory: state.chatHistory.map((m) =>
                      m.id === assistantMsgId ? { ...m, content: fullText } : m
                    ),
                  }));
                }
              }

              // Flush trailing partial line if it is a complete SSE data payload.
              const trailing = buffer.trim();
              if (trailing.startsWith('data:')) {
                const payload = trailing.substring(5).trim();
                if (payload && payload !== '[DONE]' && !payload.startsWith('[ERROR]')) {
                  fullText += payload;
                  set((state) => ({
                    chatHistory: state.chatHistory.map((m) =>
                      m.id === assistantMsgId ? { ...m, content: fullText } : m
                    ),
                  }));
                }
              }
            } finally {
              reader.releaseLock();
            }
          }

          // If streaming produced no text, fall back to non-streaming
          if (!fullText.trim()) {
            const fallbackResponse = await api.sendChatMessage(activeJob.id, content, sessionId);
            if (fallbackResponse.sessionId) {
              set({ chatSessionId: fallbackResponse.sessionId });
              saveChatSession(activeJob.id, fallbackResponse.sessionId);
            }
            set((state) => ({
              chatHistory: state.chatHistory.map((m) =>
                m.id === assistantMsgId ? { ...m, content: fallbackResponse.reply } : m
              ),
            }));
          }
        } catch (err) {
          // Update the placeholder with error
          set((state) => ({
            chatHistory: state.chatHistory.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: 'Error: Could not reach AI engine. Please try again.' }
                : m
            ),
          }));
        }
      }
    },

    startPolling: (id: string) => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      if (get().isPolling) {
        set({ isPolling: false });
      }

      set({ isPolling: true });

      pollInterval = setInterval(async () => {
        const currentJob = get().activeJob;
        if (!currentJob || currentJob.id !== id) {
          get().stopPolling();
          return;
        }

        try {
          let updatedJob = await api.getResearch(id);

          // Extraction Logic (Duplicate of setActiveJob)
          const visResponse = updatedJob.result_json?.final_state?.findings?.visualization?.response;
          if (visResponse) {
            if (visResponse.images_metadata && Array.isArray(visResponse.images_metadata)) {
              updatedJob.images = visResponse.images_metadata.map((img: any) =>
                img.local ? `${api.BASE_URL}${img.local.startsWith('/') ? '' : '/'}${img.local}` : img.original
              );
            } else if (visResponse.image_urls && Array.isArray(visResponse.image_urls)) {
              updatedJob.images = visResponse.image_urls.map((url: string) =>
                url.startsWith('/') ? `${api.BASE_URL}${url}` : url
              );
            }

            const diagrams: string[] = [];
            if (visResponse.timeline_mermaid) diagrams.push(visResponse.timeline_mermaid);
            if (visResponse.methodology_mermaid) diagrams.push(visResponse.methodology_mermaid);
            if (visResponse.data_chart_mermaid) diagrams.push(visResponse.data_chart_mermaid);
            updatedJob.diagrams = diagrams;
          }

          // Report markdown (independent of visualization)
          if (!updatedJob.reportMarkdown && updatedJob.result_json?.final_state?.findings?.multi_stage_report?.response) {
            updatedJob.reportMarkdown = updatedJob.result_json.final_state.findings.multi_stage_report.response;
          }

          set({ activeJob: updatedJob });
          if (updatedJob.status === JobStatus.COMPLETED || updatedJob.status === JobStatus.FAILED) {
            get().stopPolling();
          }
        } catch (e) {
          console.error("Polling failed", e);
        }
      }, 3000);
    },

    stopPolling: () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      set({ isPolling: false });
    },

    // Rename Research
    renameResearch: async (id: string, title: string) => {
      await api.renameResearch(id, title);
      set((state) => ({
        researches: state.researches.map((r) =>
          r.id === id ? { ...r, topic: title } : r
        ),
        activeJob: state.activeJob?.id === id
          ? { ...state.activeJob, topic: title }
          : state.activeJob,
      }));
    },

    // Live Event Actions
    subscribeToLiveEvents: async (id: string) => {
      const subscriptionSeq = ++liveSubscriptionSeq;

      // Clean up any existing EventSource WITHOUT bumping liveSubscriptionSeq.
      // If we call unsubscribeLiveEvents() here, it increments the sequence and
      // invalidates this very subscription before it can hydrate/attach.
      const existingEs = get().eventSource;
      if (existingEs) {
        existingEs.close();
        set({ eventSource: null });
      }
      if (liveReconnectTimer) {
        clearTimeout(liveReconnectTimer);
        liveReconnectTimer = null;
      }

      const preserveState = get().activeJob?.id === id && get().executionEvents.length > 0;
      // Reset event state only for fresh workspace load, not reconnects.
      if (!preserveState) {
        set({
          executionEvents: [],
          dataSources: [],
          currentStage: 'connecting...',
          eventSource: null,
        });
      } else {
        set({ eventSource: null });
      }

      // 1. Fetch historical events to hydrate the state
      try {
        const history = await api.getResearchEvents(id);
        if (subscriptionSeq !== liveSubscriptionSeq) return;
        if (Array.isArray(history)) {
          history.forEach(event => {
            if (!event || typeof event !== 'object') return;
            get().addExecutionEvent(event);
            // Re-hydrate topic suggestions from history.
            // Prefer category, but also tolerate legacy/misclassified events that still contain suggestions.
            if (
              event.details?.suggestions &&
              Array.isArray(event.details.suggestions) &&
              (event.category === 'user_action_required' || event.details.suggestions.length > 0)
            ) {
              get().setTopicSuggestions(event.details.suggestions);
            }
            // Re-hydrate sources from history if present in events
            if (event.type === 'sources' && event.sources) {
              get().setDataSources(event.sources);
            }
          });
        }
      } catch (e) {
        console.warn('Failed to fetch event history', e);
      }

      // 1b. Fetch historical data sources to hydrate ResourceTabs
      try {
        const sources = await api.getResearchSources(id);
        if (subscriptionSeq !== liveSubscriptionSeq) return;
        if (Array.isArray(sources) && sources.length > 0) {
          get().setDataSources(sources);
        }
      } catch (e) {
        console.warn('Failed to fetch source history', e);
      }

      // 2. Set timers from active job if not set by events
      const job = get().activeJob;
      if (job && !get().startedAt) {
        set({ startedAt: job.createdAt });
      }

      // 3. Subscribe to new events
      const eventSource = api.subscribeToEvents(
        id,
        (data) => {
          if (subscriptionSeq !== liveSubscriptionSeq) return;
          switch (data.type) {
            case 'connected':
              console.log(`[SSE] Connected to event stream for research #${data.research_id}`);
              set({ currentStage: get().currentStage === 'connecting...' ? 'queued' : get().currentStage });
              break;
            case 'event':
              get().addExecutionEvent(data);
              // Check for topic suggestions (robust to category mismatches)
              if (
                data.details?.suggestions &&
                Array.isArray(data.details.suggestions) &&
                (data.category === 'user_action_required' || data.details.suggestions.length > 0)
              ) {
                get().setTopicSuggestions(data.details.suggestions);
              }
              break;
            case 'status':
              set({
                currentStage: data.current_stage || 'processing',
                startedAt: data.started_at || get().startedAt, // Keep existing if null
                completedAt: data.completed_at,
              });
              // Also update activeJob.status so the UI reacts to state transitions
              if (data.status) {
                const newStatus = data.status as JobStatus;
                set((state) => ({
                  activeJob: state.activeJob ? { ...state.activeJob, status: newStatus } : null,
                }));
              }
              // Polling fallback: if we're in topic_discovery and have no suggestions, fetch them
              if (
                data.current_stage &&
                data.current_stage.includes('topic') &&
                get().topicSuggestions.length === 0
              ) {
                api.getTopicSuggestions(id).then((result) => {
                  if (result.topic_suggestions && result.topic_suggestions.length > 0) {
                    get().setTopicSuggestions(result.topic_suggestions);
                  }
                }).catch(() => { /* ignore polling errors */ });
              }
              break;
            case 'sources':
              if (Array.isArray(data.sources) && data.sources.length > 0) {
                get().setDataSources(data.sources);
              }
              break;
            case 'done':
              // Refresh the full job data to get report, latex, etc.
              api.getResearch(id).then((updatedJob) => {
                set({ activeJob: updatedJob });
              }).catch(console.error);
              get().unsubscribeLiveEvents();
              break;
          }
        },
        (error) => {
          if (subscriptionSeq !== liveSubscriptionSeq) return;
          console.error('SSE error:', error);
          const activeStatus = get().activeJob?.status;
          const shouldReconnect = activeStatus === JobStatus.PROCESSING || activeStatus === JobStatus.QUEUED;
          if (!shouldReconnect) return;
          if (liveReconnectTimer) clearTimeout(liveReconnectTimer);
          liveReconnectTimer = setTimeout(() => {
            if (subscriptionSeq !== liveSubscriptionSeq) return;
            get().subscribeToLiveEvents(id);
          }, 1500);
        }
      );

      if (subscriptionSeq !== liveSubscriptionSeq) {
        eventSource.close();
        return;
      }
      set({ eventSource });
    },

    unsubscribeLiveEvents: () => {
      liveSubscriptionSeq++;
      if (liveReconnectTimer) {
        clearTimeout(liveReconnectTimer);
        liveReconnectTimer = null;
      }
      const es = get().eventSource;
      if (es) {
        es.close();
        set({ eventSource: null });
      }
    },

    addExecutionEvent: (event) => {
      set((state) => {
        // Deduplicate by event_id to prevent duplicates from hydration + SSE overlap
        if (event.event_id && state.executionEvents.some(e => e.event_id === event.event_id)) {
          return { currentStage: event.stage || state.currentStage };
        }
        return {
          executionEvents: [...state.executionEvents, event],
          currentStage: event.stage || state.currentStage,
        };
      });
    },

    setDataSources: (sources) => {
      set((state) => {
        const merged = new Map<string, DataSource>();
        const all = [...state.dataSources, ...sources];
        for (const src of all) {
          const key = `${src.source_type}|${src.domain}|${(src as any).url || ''}|${(src as any).title || ''}`;
          merged.set(key, src);
        }
        return { dataSources: Array.from(merged.values()) };
      });
    },

    // Memories
    memories: [],
    memoriesLoading: false,

    fetchMemories: async () => {
      set({ memoriesLoading: true });
      try {
        const data = await api.getMemories();
        set({ memories: data.memories });
      } catch (err) {
        console.error('Failed to fetch memories:', err);
      } finally {
        set({ memoriesLoading: false });
      }
    },

    addMemory: async (content: string) => {
      try {
        const memory = await api.createMemory(content);
        set((state) => ({ memories: [memory, ...state.memories] }));
      } catch (err) {
        console.error('Failed to add memory:', err);
        throw err;
      }
    },

    deleteMemory: async (id: number) => {
      try {
        await api.deleteMemory(id);
        set((state) => ({ memories: state.memories.filter(m => m.id !== id) }));
      } catch (err) {
        console.error('Failed to delete memory:', err);
        throw err;
      }
    },

    // Web Search
    searchResults: null,
    searchLoading: false,

    searchWeb: async (query: string, providers?: string[]) => {
      set({ searchLoading: true, searchResults: null });
      try {
        const results = await api.searchWeb(query, providers);
        set({ searchResults: results });
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        set({ searchLoading: false });
      }
    },

    // Export
    exportMarkdown: async (id: string) => {
      await api.exportMarkdown(id);
    },
    exportPDF: async (id: string) => {
      await api.exportPDF(id);
    },
    exportLatex: async (id: string) => {
      await api.exportLatex(id);
    },

    // LLM Status
    llmStatus: null,
    llmStatusLoading: false,
    fetchLLMStatus: async () => {
      set({ llmStatusLoading: true });
      try {
        const status = await api.getLLMStatus();
        set({ llmStatus: status });
      } catch (err: any) {
        // AI engine may be intentionally offline in local/dev. Avoid noisy console spam.
        set({
          llmStatus: {
            mode: 'OFFLINE',
            provider: {
              provider: 'local',
              model: 'unavailable',
              available: false,
            },
          } as LLMStatus,
        });
      } finally {
        set({ llmStatusLoading: false });
      }
    },

    // Providers
    providers: null,
    fetchProviders: async () => {
      try {
        const data = await api.getProviders();
        set({ providers: data });
      } catch (err) {
        console.error('Failed to fetch providers:', err);
      }
    },
  };
});

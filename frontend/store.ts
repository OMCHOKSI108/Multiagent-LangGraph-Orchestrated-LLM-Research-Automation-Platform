import { create } from 'zustand';
import { JobStatus, ResearchJob, LogEntry, ChatMessage, User, ApiKeys, UsageStats, Memory, SearchResponse } from './types';
import { api } from './services/api';

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
  currentStage: string;
  startedAt: string | null;
  completedAt: string | null;
  eventSource: EventSource | null;
  chatSessionId: string | null;
  setCurrentStage: (stage: string) => void;
  setStartedAt: (iso: string) => void;

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
}

export const useResearchStore = create<ResearchStore>((set, get) => {
  let pollInterval: ReturnType<typeof setInterval> | null = null;

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

    // Auth Actions
    login: async (email, password) => {
      set({ authError: null });
      try {
        const { token, user } = await api.login(email, password);
        localStorage.setItem('dre_token', token);
        set({ user, isAuthenticated: true });
      } catch (err: any) {
        console.error("Login Error:", err);
        set({ authError: err.message || 'Login failed' });
      }
    },

    signup: async (email, password, username) => {
      set({ authError: null });
      try {
        const { token, user } = await api.signup(email, password, username);
        localStorage.setItem('dre_token', token);
        set({ user, isAuthenticated: true });
      } catch (err: any) {
        set({ authError: err.message || 'Signup failed' });
      }
    },

    logout: () => {
      localStorage.removeItem('dre_token');
      localStorage.removeItem('dre_api_key');
      localStorage.removeItem('dre_api_keys');
      set({ user: null, isAuthenticated: false, researches: [], activeJob: null, chatHistory: [], chatSessionId: null });
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

    // Settings Actions
    openSettings: () => {
      set({ isSettingsOpen: true });
      get().fetchUsageStats();
    },
    closeSettings: () => set({ isSettingsOpen: false }),

    saveApiKeys: (keys) => {
      localStorage.setItem('dre_api_keys', JSON.stringify(keys));
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

      // Extraction Logic
      const visResponse = job.result_json?.final_state?.findings?.visualization?.response;
      if (visResponse) {
        if (visResponse.images_metadata && Array.isArray(visResponse.images_metadata)) {
          job.images = visResponse.images_metadata.map((img: any) =>
            img.local ? `http://localhost:5000/${img.local}` : img.original
          );
        } else if (visResponse.image_urls && Array.isArray(visResponse.image_urls)) {
          job.images = visResponse.image_urls;
        }

        const diagrams = [];
        if (visResponse.timeline_mermaid) diagrams.push(visResponse.timeline_mermaid);
        if (visResponse.methodology_mermaid) diagrams.push(visResponse.methodology_mermaid);
        if (visResponse.data_chart_mermaid) diagrams.push(visResponse.data_chart_mermaid);
        job.diagrams = diagrams;

        if (!job.reportMarkdown && job.result_json?.final_state?.findings?.multi_stage_report?.response) {
          job.reportMarkdown = job.result_json.final_state.findings.multi_stage_report.response;
        }
      }

      set({
        activeJob: job,
        // Fallback to createdAt if startedAt is missing, enables timer immediately
        startedAt: job.createdAt
      });

      if (job.status !== JobStatus.COMPLETED && job.status !== JobStatus.FAILED) {
        get().startPolling(id);
      }
    },

    deleteResearch: async (id) => {
      await api.deleteResearch(id);
      set((state) => ({
        researches: state.researches.filter((r) => r.id !== id),
        activeJob: state.activeJob?.id === id ? null : state.activeJob,
      }));
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
        if (!activeJob) return;

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
          }

          // Stream the SSE response
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let fullText = '';

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ') && !line.includes('[DONE]') && !line.includes('[ERROR]')) {
                  fullText += line.substring(6);
                  // Update the assistant message in place
                  set((state) => ({
                    chatHistory: state.chatHistory.map((m) =>
                      m.id === assistantMsgId ? { ...m, content: fullText } : m
                    ),
                  }));
                }
              }
            }
          }

          // If streaming produced no text, fall back to non-streaming
          if (!fullText.trim()) {
            const fallbackResponse = await api.sendChatMessage(activeJob.id, content, sessionId);
            set({ chatSessionId: fallbackResponse.sessionId });
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
      if (get().isPolling) return;

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
                img.local ? `http://localhost:5000/${img.local}` : img.original
              );
            } else if (visResponse.image_urls && Array.isArray(visResponse.image_urls)) {
              updatedJob.images = visResponse.image_urls;
            }

            const diagrams = [];
            if (visResponse.timeline_mermaid) diagrams.push(visResponse.timeline_mermaid);
            if (visResponse.methodology_mermaid) diagrams.push(visResponse.methodology_mermaid);
            if (visResponse.data_chart_mermaid) diagrams.push(visResponse.data_chart_mermaid);
            updatedJob.diagrams = diagrams;

            if (!updatedJob.reportMarkdown && updatedJob.result_json?.final_state?.findings?.multi_stage_report?.response) {
              updatedJob.reportMarkdown = updatedJob.result_json.final_state.findings.multi_stage_report.response;
            }
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
      // Clean up any existing subscription
      get().unsubscribeLiveEvents();

      // Reset event state but keep the job context
      set({
        executionEvents: [],
        dataSources: [],
        currentStage: 'connecting...',
        eventSource: null,
      });

      // 1. Fetch historical events to hydrate the state
      try {
        const history = await api.getResearchEvents(id);
        if (Array.isArray(history)) {
          history.forEach(event => {
            get().addExecutionEvent(event);
            // Re-hydrate sources from history if present in events
            if (event.type === 'sources' && event.sources) {
              get().setDataSources(event.sources);
            }
          });
        }
      } catch (e) {
        console.warn('Failed to fetch event history', e);
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
          switch (data.type) {
            case 'event':
              get().addExecutionEvent(data);
              break;
            case 'status':
              set({
                currentStage: data.current_stage || 'processing',
                startedAt: data.started_at || get().startedAt, // Keep existing if null
                completedAt: data.completed_at,
              });
              break;
            case 'sources':
              get().setDataSources(data.sources);
              break;
            case 'done':
              get().unsubscribeLiveEvents();
              break;
          }
        },
        (error) => {
          console.error('SSE error:', error);
        }
      );

      set({ eventSource });
    },

    unsubscribeLiveEvents: () => {
      const es = get().eventSource;
      if (es) {
        es.close();
        set({ eventSource: null });
      }
    },

    addExecutionEvent: (event) => {
      set((state) => ({
        executionEvents: [...state.executionEvents, event],
        currentStage: event.stage || state.currentStage,
      }));
    },

    setDataSources: (sources) => {
      set({ dataSources: sources });
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
  };
});

import { create } from 'zustand';
import { JobStatus, ResearchJob, LogEntry, ChatMessage, User, ApiKeys, UsageStats } from './types';
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

  // Actions
  fetchResearches: () => Promise<void>;
  createResearch: (topic: string, depth: 'quick' | 'deep') => Promise<string>;
  setActiveJob: (id: string) => Promise<void>;
  addChatMessage: (content: string, role: 'user' | 'assistant') => void;
  renameResearch: (id: string, title: string) => Promise<void>;

  // Live Events
  subscribeToLiveEvents: (id: string) => void;
  unsubscribeLiveEvents: () => void;
  addExecutionEvent: (event: ExecutionEvent) => void;
  setDataSources: (sources: DataSource[]) => void;

  // Polling
  startPolling: (id: string) => void;
  stopPolling: () => void;
}

export const useResearchStore = create<ResearchStore>((set, get) => {
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  const token = localStorage.getItem('dre_token');
  const storedKeys = localStorage.getItem('dre_api_keys');
  const initialAuth = !!token;
  const initialKeys = storedKeys ? JSON.parse(storedKeys) : {};

  return {
    user: initialAuth ? { id: 'u1', email: 'researcher@lab.com', name: 'Researcher' } : null,
    isAuthenticated: initialAuth,
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

    // Auth Actions
    login: async (email, password) => {
      set({ authError: null });
      try {
        const { token, user } = await api.login(email, password);
        localStorage.setItem('dre_token', token);
        set({ user, isAuthenticated: true });
      } catch (err: any) {
        set({ authError: err.message || 'Login failed' });
        throw err;
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
        throw err;
      }
    },

    logout: () => {
      localStorage.removeItem('dre_token');
      set({ user: null, isAuthenticated: false, researches: [], activeJob: null });
    },

    clearAuthError: () => set({ authError: null }),

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
      set({ activeJob: null, chatHistory: [] });
      const job = await api.getResearch(id);
      set({ activeJob: job });

      if (job.status !== JobStatus.COMPLETED && job.status !== JobStatus.FAILED) {
        get().startPolling(id);
      }
    },

    addChatMessage: async (content, role) => {
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

        try {
          const sessionId = (get() as any).chatSessionId;
          const response = await api.sendChatMessage(activeJob.id, content, sessionId);
          (set as any)({ chatSessionId: response.sessionId });

          const assistantMsg: ChatMessage = {
            id: Math.random().toString(36),
            role: 'assistant',
            content: response.reply,
            timestamp: new Date().toISOString(),
          };
          set((state) => ({ chatHistory: [...state.chatHistory, assistantMsg] }));
        } catch (err) {
          const errorMsg: ChatMessage = {
            id: Math.random().toString(36),
            role: 'assistant',
            content: 'Error: Could not reach AI engine. Please try again.',
            timestamp: new Date().toISOString(),
          };
          set((state) => ({ chatHistory: [...state.chatHistory, errorMsg] }));
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
          const updatedJob = await api.getResearch(id);
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
    subscribeToLiveEvents: (id: string) => {
      // Clean up any existing subscription
      get().unsubscribeLiveEvents();

      // Reset event state
      set({
        executionEvents: [],
        dataSources: [],
        currentStage: 'queued',
        startedAt: null,
        completedAt: null,
      });

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
                startedAt: data.started_at,
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
  };
});
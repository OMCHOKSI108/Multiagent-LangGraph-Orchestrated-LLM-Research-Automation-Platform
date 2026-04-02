'use client';

function normalizeApiBase(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export const API_BASE = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
export const API_ROOT = API_BASE.replace(/\/api$/, '');

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('dr_token') || '';
}

export function setToken(token: string) {
  localStorage.setItem('dr_token', token);
}

export function clearToken() {
  localStorage.removeItem('dr_token');
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['x-auth-token'] = token;

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string; message?: string }).error
      || (data as { error?: string; message?: string }).message
      || `HTTP ${res.status}`;
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  api_key?: string;
}

export const auth = {
  signup: (username: string, email: string, password: string) =>
    req<{ message: string }>('POST', '/auth/signup', { username, email, password }),

  login: (email: string, password: string) =>
    req<{ token: string; user: User }>('POST', '/auth/login', { email, password }),

  me: () => req<{ user: User }>('GET', '/auth/me'),

  generateApiKey: async () => {
    const data = await req<{ api_key?: string; key?: { key_value?: string } }>('POST', '/user/apikey/generate');
    return { api_key: data.api_key || data.key?.key_value || '' };
  },
};

// ─── User ─────────────────────────────────────────────────────────────────────

export interface ResearchHistoryItem {
  id: number;
  title: string;
  task?: string;
  topic?: string;
  status: string;
  created_at: string;
  workspace_name?: string;
}

export const user = {
  history: () => req<ResearchHistoryItem[]>('GET', '/user/history'),
  updateProfile: async (data: { username?: string }) => {
    const result = await req<{ user: User }>('PATCH', '/auth/me', data);
    return result.user;
  },
  changePassword: (currentPassword: string, newPassword: string) =>
    req<{ message: string }>('POST', '/auth/password', { currentPassword, newPassword }),
};

// ─── Workspaces ───────────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  user_id: number;
  name: string;
  description?: string;
  status: string;
  session_count: number;
  last_activity?: string;
  created_at: string;
  owner_email?: string;
}

export interface ResearchSession {
  id: number;
  workspace_id?: string;
  user_id?: number;
  topic?: string;
  title?: string;
  status: string;
  depth?: string;
  current_stage?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  result_json?: ResearchResult;
  report_markdown?: string;
  user_email?: string;
}

export const workspaces = {
  list: () => req<{ workspaces: Workspace[] }>('GET', '/workspaces'),

  get: (id: string) =>
    req<{ workspace: Workspace; sessions: ResearchSession[] }>('GET', `/workspaces/${id}`),

  create: (name: string, description?: string) =>
    req<{ workspace: Workspace }>('POST', '/workspaces', { name, description }),

  delete: (id: string) => req<{ message: string }>('DELETE', `/workspaces/${id}`),

  startResearch: (wid: string, topic: string, depth: string, session_id?: number) =>
    req<{ session_id: number; instant_reply?: string; message?: string }>('POST', `/workspaces/${wid}/research/start`, {
      topic,
      depth,
      session_id
    }),

  getResearchStatus: (workspaceId: string, sessionId: number) =>
    req<ResearchSession>('GET', `/workspaces/${workspaceId}/research/${sessionId}/status`),

  getSections: async (workspaceId: string, sessionId: number) => {
    const data = await req<any>('GET', `/workspaces/${workspaceId}/sessions/${sessionId}/sections`);
    if (Array.isArray(data)) return { sections: data };
    return { sections: data?.sections || [] };
  },

  editSection: (workspaceId: string, sessionId: number, sectionId: number, instruction: string) =>
    req<{ message: string; new_content: string }>('POST', `/workspaces/${workspaceId}/sessions/${sessionId}/sections/${sectionId}/edit`, { instruction }),

  getFullReport: async (workspaceId: string, sessionId: number) => {
    const data = await req<any>('GET', `/workspaces/${workspaceId}/sessions/${sessionId}/full-report`);
    return { markdown: data?.markdown || data?.report || '' };
  },
};

// ─── Research (legacy direct API) ────────────────────────────────────────────

export interface ResearchResult {
  final_state?: {
    findings?: Record<string, AgentFinding>;
    report_markdown?: string;
  };
  findings?: Record<string, AgentFinding>;
  topic_suggestions?: TopicSuggestion[];
}

export interface TopicSuggestion {
  title: string;
  domain: string;
  novelty_angle: string;
  estimated_complexity: string;
}

export interface ImageMetadata {
  original: string;
  thumbnail: string;
  description?: string;
  source_url?: string;
  title?: string;
}

export interface AgentFinding {
  response?: Record<string, any> | string;
  raw?: string;
  agent?: string;
  execution_time?: number;
  echarts_config?: Record<string, any>; // Complex ECharts object
  description?: string;
  images_metadata?: ImageMetadata[];
}

export interface ResearchSection {
  id: number;
  research_id: number;
  title: string;
  content: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export const research = {
  status: (id: number) => req<ResearchSession>('GET', `/research/status/${id}`),
};

// ─── Events ──────────────────────────────────────────────────────────────────

export interface ResearchEvent {
  id: number;
  message: string;
  stage?: string;
  severity?: 'info' | 'warning' | 'error';
  created_at: string;
  category?: string;
  details?: Record<string, any>;
}

export const events = {
  list: (researchId: number) =>
    req<ResearchEvent[]>('GET', `/events/${researchId}`),

  getSSEToken: (researchId: number) =>
    req<{ token: string }>('GET', `/events/token/${researchId}`),

  sources: (researchId: number) =>
    req<Array<Record<string, any>>>('GET', `/events/${researchId}/sources`),
};

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface ChatMessage {
  id: number | string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  sources?: ChatSource[];
  search_mode?: 'direct' | 'search' | 'keyword';
}

export const chat = {
  send: (research_id: number, message: string) =>
    req<{ reply: string; sources?: ChatSource[]; search_mode?: string; message_id?: number }>('POST', '/chat/message', {
      research_id,
      message,
    }),

  fast: (message: string, history: ChatMessage[]) =>
    req<{ reply: string; sources?: ChatSource[]; search_mode?: string }>('POST', '/chat/fast', { message, history }),

  history: (session_id: number) =>
    req<{ messages: ChatMessage[] }>('GET', `/chat/history/${session_id}`),

  stream: async function* (research_id: number, message: string) {
    const token = getToken();
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token,
      },
      body: JSON.stringify({ research_id, message }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Stream failed' }));
      throw new Error(error.error || 'Stream failed');
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) return;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      yield chunk;
    }
  },
};

// ─── Export ──────────────────────────────────────────────────────────────────

export const exportApi = {
  download: async (id: number, format: 'markdown' | 'json') => {
    const token = getToken();
    const endpoint = format === 'markdown' ? `${API_BASE}/export/${id}/markdown` : `${API_BASE}/export/${id}/json`;
    const res = await fetch(endpoint, {
      headers: { 'x-auth-token': token },
    });
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  },
  downloadLatex: async (id: number) => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/export/${id}/latex`, {
      headers: { 'x-auth-token': token },
    });
    if (!res.ok) throw new Error('LaTeX export failed');
    return res.blob();
  },
  downloadPdf: async (id: number) => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/export/${id}/pdf`, {
      headers: { 'x-auth-token': token },
    });
    if (!res.ok) throw new Error('PDF export failed');
    return res.blob();
  },
  compileToPdf: async (researchId: number, content: string) => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/export/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token,
      },
      body: JSON.stringify({ researchId, content }),
    });
    if (!res.ok) throw new Error('Compile failed');
    return res.blob();
  },
};

// ─── Memories ────────────────────────────────────────────────────────────────

export interface Memory {
  id: number;
  user_id: number;
  content: string;
  title?: string;
  tags?: string[];
  source: string;
  created_at: string;
  user_email?: string;
}

export const memories = {
  list: () => req<{ memories: Memory[] }>('GET', '/memories'),
  create: (title: string, content: string, tags?: string[]) =>
    req<Memory>('POST', '/memories', {
      content,
      metadata: { title, tags }
    }),
  delete: (id: number) => req<{ success: boolean; id: number }>('DELETE', `/memories/${id}`),
};

// ─── Agents ──────────────────────────────────────────────────────────────────

export interface AgentInfo {
  slug: string;
  name: string;
  category: string;
  description?: string;
}

export const agentsApi = {
  list: () => req<{ agents: AgentInfo[] }>('GET', '/agents'),
};

// ─── Usage ────────────────────────────────────────────────────────────────────

export interface UsageStats {
  total_research: number;
  completed: number;
  failed: number;
  api_calls: number;
  totalTokens?: number;
  cost?: number;
}

export const usage = {
  stats: () => req<UsageStats>('GET', '/usage/stats'),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const admin = {
  users: () => req<{ users: User[] }>('GET', '/admin/users'),
  disableUser: (id: number, action: 'disable' | 'enable') =>
    req<{ user: User }>('POST', `/admin/users/${id}/disable`, { action }),
  stats: () => req<{ stats: Record<string, number> }>('GET', '/admin/stats/overview'),
  research: () => req<{ research_logs: ResearchSession[] }>('GET', '/admin/research'),
  workspaces: () => req<{ workspaces: Workspace[] }>('GET', '/admin/workspaces'),
  chatSessions: () => req<{ sessions: any[] }>('GET', '/admin/chat/sessions'),
  chatHistory: (sessionId: string) => req<{ transcript: any[] }>('GET', `/admin/chat/history/${sessionId}`),
  memories: () => req<{ memories: Memory[] }>('GET', '/admin/memories'),
  deleteMemory: (id: number) => req<{ success: boolean }>('DELETE', `/admin/memories/${id}`),
  apiKeys: () => req<{ keys: any[] }>('GET', '/admin/api-keys'),
  generateApiKey: (user_email: string, key_name?: string) =>
    req<{ key: any }>('POST', '/admin/api-keys/generate', { user_email, key_name }),
  revokeApiKey: (id: number) => req<{ success: boolean }>('DELETE', `/admin/api-keys/${id}`),
};

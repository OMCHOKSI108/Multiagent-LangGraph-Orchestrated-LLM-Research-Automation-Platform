'use client';

const API_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');

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
    throw new Error(msg);
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
    req<{ token: string }>('POST', '/auth/login', { email, password }),

  me: () => req<User>('GET', '/auth/me'),

  generateApiKey: () => req<{ api_key: string }>('POST', '/auth/generate-api-key'),
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
  updateProfile: (data: { username?: string }) => req<User>('PUT', '/user/profile', data),
  changePassword: (current_password: string, new_password: string) =>
    req<{ message: string }>('PUT', '/user/password', { current_password, new_password }),
};

// ─── Workspaces ───────────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  status: string;
  session_count: number;
  last_activity?: string;
  created_at: string;
}

export interface ResearchSession {
  id: number;
  topic?: string;
  title?: string;
  status: string;
  current_stage?: string;
  created_at: string;
  updated_at: string;
  result_json?: ResearchResult;
  report_markdown?: string;
}

export const workspaces = {
  list: () => req<{ workspaces: Workspace[] }>('GET', '/workspaces'),

  get: (id: string) =>
    req<{ workspace: Workspace; sessions: ResearchSession[] }>('GET', `/workspaces/${id}`),

  create: (name: string, description?: string) =>
    req<{ workspace: Workspace }>('POST', '/workspaces', { name, description }),

  delete: (id: string) => req<{ message: string }>('DELETE', `/workspaces/${id}`),

  startResearch: (workspaceId: string, topic: string, depth: string) =>
    req<{ session_id: number | null; message?: string; intent?: string; instant_reply?: string }>(
      'POST',
      `/workspaces/${workspaceId}/research/start`,
      { topic, depth }
    ),

  getResearchStatus: (workspaceId: string, sessionId: number) =>
    req<ResearchSession>('GET', `/workspaces/${workspaceId}/research/${sessionId}/status`),
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

export interface AgentFinding {
  response?: unknown;
  raw?: string;
  agent?: string;
  execution_time?: number;
}

export const research = {
  status: (id: number) => req<ResearchSession>('GET', `/research/status/${id}`),
};

// ─── Events ──────────────────────────────────────────────────────────────────

export interface ResearchEvent {
  id: number;
  message: string;
  stage?: string;
  severity?: string;
  created_at: string;
  category?: string;
}

export const events = {
  list: (researchId: number) =>
    req<ResearchEvent[]>('GET', `/events/${researchId}`),

  getSSEToken: (researchId: number) =>
    req<{ token: string }>('POST', '/events/token', { research_id: researchId }),
};

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export const chat = {
  send: (research_id: number, message: string) =>
    req<{ reply: string; message_id?: number }>('POST', '/chat/message', {
      research_id,
      message,
    }),

  history: (research_id: number) =>
    req<{ messages: ChatMessage[] }>('GET', `/chat/history/${research_id}`),
};

// ─── Export ──────────────────────────────────────────────────────────────────

export const exportApi = {
  download: async (id: number, format: 'markdown' | 'json') => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/export/${id}?format=${format}`, {
      headers: { 'x-auth-token': token },
    });
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  },
};

// ─── Memories ────────────────────────────────────────────────────────────────

export interface Memory {
  id: number;
  title: string;
  content: string;
  tags?: string[];
  created_at: string;
}

export const memories = {
  list: () => req<{ memories: Memory[] }>('GET', '/memories'),
  create: (title: string, content: string, tags?: string[]) =>
    req<{ memory: Memory }>('POST', '/memories', { title, content, tags }),
  delete: (id: number) => req<{ message: string }>('DELETE', `/memories/${id}`),
};

// ─── Agents ──────────────────────────────────────────────────────────────────

export interface AgentInfo {
  name: string;
  category: string;
  description?: string;
  status?: string;
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
  tokens_used?: number;
}

export const usage = {
  stats: () => req<UsageStats>('GET', '/usage/stats'),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const admin = {
  users: () => req<{ users: User[] }>('GET', '/admin/users'),
  disableUser: (id: number, action: 'disable' | 'enable') =>
    req<{ user: User }>('POST', `/admin/users/${id}/disable`, { action }),
  stats: () => req<Record<string, unknown>>('GET', '/admin/stats'),
};

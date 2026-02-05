export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface ResearchJob {
  id: string;
  topic: string;
  status: JobStatus;
  depth: 'quick' | 'deep';
  createdAt: string;
  updatedAt: string;
  logs: LogEntry[];
  reportMarkdown?: string;
  diagrams?: string[];
  images?: string[];
  // AI Metadata
  modelUsed?: string;
  tokenUsage?: number;
  costEstimate?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'system' | 'assistant';
  content: string;
  timestamp: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

export interface ApiKeys {
  gemini?: string;
  groq?: string;
}

export interface UsageMetric {
  date: string;
  tokens: number;
  provider: 'gemini' | 'groq';
}

export interface UsageStats {
  totalTokens: number;
  cost: number;
  history: UsageMetric[];
}
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
  costEstimate?: number;
  reportMarkdown?: string;
  latexSource?: string;
  pdfPath?: string;
  texPath?: string;
  diagrams?: string[];
  images?: string[];
  modelUsed?: string;
  tokenUsage?: number;
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

export interface Memory {
  id: number;
  content: string;
  source: 'manual' | 'search' | 'research' | 'chat';
  source_id?: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  source: string;
  favicon: string;
  thumbnail?: string | null;
  published?: string | null;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total_results: number;
  providers_used: string[];
}

export interface DataSourceEnriched {
  source_type: string;
  domain: string;
  url?: string;
  status: 'success' | 'partial' | 'failed' | 'pending';
  items_found: number;
  title?: string;
  description?: string;
  favicon?: string;
  thumbnail?: string;
  published_date?: string;
}
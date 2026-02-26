/// <reference types="vite/client" />

import { JobStatus, ResearchJob, User, UsageStats, Memory, SearchResponse, LLMStatus } from '../types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');

class ApiService {
  public readonly BASE_URL = BASE_URL;
  private apiKeyPromise: Promise<string> | null = null;

  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('dre_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'x-auth-token': token } : {}),
    };
  }

  // Helper for fetch with error handling
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: { ...this.getHeaders(), ...options.headers },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let error: { error?: string } = { error: 'Request failed' };
      try {
        error = errorText ? JSON.parse(errorText) : error;
      } catch {
        // ignore parse error, use fallback
      }
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch (parseError) {
      console.warn('API response parse error:', parseError, 'Response text:', text);
      throw new Error('Invalid response format from server');
    }
  }

  // =====================
  // AUTH ENDPOINTS
  // =====================

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const data = await this.request<{ token: string; user: { id: number; username: string; email: string } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    return {
      token: data.token,
      user: { id: String(data.user.id), email: data.user.email, name: data.user.username },
    };
  }

  async signup(email: string, password: string, username: string): Promise<{ token: string; user: User }> {
    // Backend signup doesn't return token, need to login after
    await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    // Auto-login after signup
    return this.login(email, password);
  }

  async updatePassword(current: string, newPass: string): Promise<void> {
    await this.request('/auth/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: current, newPassword: newPass }),
    });
  }

  async getMe(): Promise<User> {
    const data = await this.request<{ user: { id: number; username: string; email: string } }>('/auth/me');
    return { id: String(data.user.id), email: data.user.email, name: data.user.username };
  }

  async updateProfile(name: string): Promise<User> {
    const data = await this.request<{ user: { id: number; username: string; email: string } }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ username: name }),
    });
    return { id: String(data.user.id), email: data.user.email, name: data.user.username };
  }

  // =====================
  // API KEY MANAGEMENT
  // =====================

  async generateApiKey(name: string = 'Frontend Key'): Promise<string> {
    const data = await this.request<{ key: { key_value: string } }>('/user/apikey/generate', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return data.key.key_value;
  }

  private async getOrCreateApiKey(): Promise<string> {
    const existingKey = localStorage.getItem('dre_api_key');
    if (existingKey) return existingKey;

    if (!this.apiKeyPromise) {
      this.apiKeyPromise = this.generateApiKey()
        .then((key) => {
          localStorage.setItem('dre_api_key', key);
          return key;
        })
        .finally(() => {
          this.apiKeyPromise = null;
        });
    }

    return this.apiKeyPromise;
  }

  // =====================
  // RESEARCH ENDPOINTS
  // =====================

  async getResearches(): Promise<ResearchJob[]> {
    const data = await this.request<any[]>('/user/history');
    return data.map(item => this.mapBackendToFrontend(item));
  }

  async getResearch(id: string): Promise<ResearchJob> {
    const data = await this.request<any>(`/research/status/${id}`);
    return this.mapBackendToFrontend(data);
  }

  async createResearch(topic: string, depth: 'quick' | 'deep'): Promise<ResearchJob> {
    const apiKey = await this.getOrCreateApiKey();

    const data = await this.request<{ job_id: number }>('/research/start', {
      method: 'POST',
      body: JSON.stringify({
        task: topic,
        depth,
        api_key: apiKey,
      }),
    });

    return {
      id: String(data.job_id),
      topic,
      depth,
      status: JobStatus.QUEUED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      logs: [],
    };
  }

  async renameResearch(id: string, title: string): Promise<void> {
    await this.request(`/research/${id}/rename`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  }

  async updateResearchState(id: string, stateUpdate: any): Promise<void> {
    await this.request(`/research/update-state`, {
      method: 'POST',
      body: JSON.stringify({ research_id: id, ...stateUpdate }),
    });
  }

  async selectTopic(id: string, topic: string): Promise<void> {
    // This method assumes `this.request` is the intended underlying fetch helper,
    // as `this.fetchWithAuth` is not defined in the current class.
    await this.request(`/research/${id}/topic`, {
      method: 'POST',
      body: JSON.stringify({ topic }),
    });
  }

  async getTopicSuggestions(id: string): Promise<{ topic_locked: boolean; selected_topic: string | null; topic_suggestions: any[] }> {
    return this.request(`/research/${id}/suggestions`);
  }

  async deleteResearch(id: string): Promise<void> {
    await this.request(`/research/${id}`, {
      method: 'DELETE',
    });
  }

  async getResearchEvents(id: string): Promise<any[]> {
    return this.request<any[]>(`/events/${id}`);
  }

  async getResearchSources(id: string): Promise<any[]> {
    return this.request<any[]>(`/events/${id}/sources`);
  }

  /**
   * Subscribe to real-time events for a research job.
   * Returns an EventSource that can be used to listen for events.
   */
  subscribeToEvents(
    researchId: string,
    onEvent: (data: any) => void,
    onError?: (error: Event) => void
  ): EventSource {
    const token = localStorage.getItem('dre_token');
    const url = `${BASE_URL}/events/stream/${researchId}${token ? `?token=${token}` : ''}`;
    const eventSource = new EventSource(url);

    const safeParse = (data: string) => {
      try { return JSON.parse(data); } catch { return {}; }
    };

    eventSource.addEventListener('agent_log', (e: any) => {
      onEvent({ type: 'event', ...safeParse(e.data) });
    });

    eventSource.addEventListener('agent_change', (e: any) => {
      onEvent({ type: 'status', ...safeParse(e.data) });
    });

    eventSource.addEventListener('complete', (e: any) => {
      onEvent({ type: 'status', status: 'completed', current_stage: 'completed', ...safeParse(e.data) });
    });

    eventSource.addEventListener('error', (e: any) => {
      console.error('SSE event error:', e);
      onError?.(e);
    });

    // Fallback for legacy events
    eventSource.onmessage = (e) => {
      const data = safeParse(e.data);
      if (Object.keys(data).length > 0) onEvent(data);
    };

    return eventSource;
  }

  // =====================
  // CHAT ENDPOINTS
  // =====================

  async sendChatMessage(researchId: string, message: string, sessionId?: string): Promise<{ sessionId: string; reply: string }> {
    const apiKey = await this.getOrCreateApiKey();

    const data = await this.request<{ session_id: string; reply: string }>('/chat/message', {
      method: 'POST',
      body: JSON.stringify({
        research_id: parseInt(researchId),
        message,
        api_key: apiKey,
        session_id: sessionId,
      }),
    });

    return {
      sessionId: data.session_id,
      reply: data.reply,
    };
  }

  async getChatHistory(sessionId: string): Promise<Array<{ role: 'user' | 'assistant'; message: string; created_at: string }>> {
    return this.request(`/chat/history/${encodeURIComponent(sessionId)}`, {
      method: 'GET',
    });
  }

  // =====================
  // MEMORY ENDPOINTS
  // =====================

  async getMemories(page: number = 1, limit: number = 50): Promise<{ memories: Memory[]; total: number }> {
    return this.request(`/memories?page=${page}&limit=${limit}`);
  }

  async createMemory(content: string, source: string = 'manual'): Promise<Memory> {
    return this.request('/memories', {
      method: 'POST',
      body: JSON.stringify({ content, source }),
    });
  }

  async deleteMemory(id: number): Promise<void> {
    await this.request(`/memories/${id}`, { method: 'DELETE' });
  }

  async searchMemories(query: string): Promise<{ results: Memory[] }> {
    return this.request('/memories/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  // =====================
  // WEB SEARCH ENDPOINT
  // =====================

  async searchWeb(query: string, providers?: string[]): Promise<SearchResponse> {
    const apiKey = await this.getOrCreateApiKey();
    return this.request('/research/search', {
      method: 'POST',
      body: JSON.stringify({ query, providers, api_key: apiKey }),
    });
  }

  // =====================
  // EXPORT ENDPOINTS
  // =====================

  async exportMarkdown(researchId: string): Promise<void> {
    const token = localStorage.getItem('dre_token');
    const response = await fetch(`${BASE_URL}/export/${researchId}/markdown`, {
      headers: token ? { 'x-auth-token': token } : {},
    });
    if (!response.ok) throw new Error('Export failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research_${researchId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async exportPDF(researchId: string): Promise<void> {
    const token = localStorage.getItem('dre_token');
    const response = await fetch(`${BASE_URL}/export/${researchId}/pdf`, {
      headers: token ? { 'x-auth-token': token } : {},
    });
    if (!response.ok) throw new Error('Export failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research_${researchId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async exportLatex(researchId: string): Promise<void> {
    const token = localStorage.getItem('dre_token');
    const response = await fetch(`${BASE_URL}/export/${researchId}/latex`, {
      headers: token ? { 'x-auth-token': token } : {},
    });
    if (!response.ok) throw new Error('Export failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research_${researchId}.tex`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- NEW: Compile Latex (Simulated) ---
  async compileLatex(researchId: string, content: string): Promise<Blob> {
    const token = localStorage.getItem('dre_token');
    const response = await fetch(`${BASE_URL}/export/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-auth-token': token } : {}),
      },
      body: JSON.stringify({ researchId, content }),
    });

    if (!response.ok) {
      throw new Error('Compilation failed');
    }

    return await response.blob();
  }
  // ---------------------------------------

  async exportZip(researchId: string): Promise<void> {
    const token = localStorage.getItem('dre_token');
    const response = await fetch(`${BASE_URL}/export/${researchId}/zip`, {
      headers: token ? { 'x-auth-token': token } : {},
    });
    if (!response.ok) throw new Error('Export failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research_${researchId}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async exportPlots(researchId: string): Promise<void> {
    const token = localStorage.getItem('dre_token');
    const response = await fetch(`${BASE_URL}/export/${researchId}/plots`, {
      headers: token ? { 'x-auth-token': token } : {},
    });
    if (!response.ok) throw new Error('Export failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research_${researchId}_plots.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Share research publicly
  async shareResearch(researchId: string): Promise<{ shareToken: string; shareUrl: string }> {
    const response = await this.request<{ shareToken: string; shareUrl: string }>(
      `/research/${researchId}/share`,
      { method: 'POST' }
    );
    return response;
  }

  async getSharedResearch(token: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/research/shared/${token}`);
    if (!response.ok) {
      throw new Error(response.status === 404 ? 'Research not found' : 'Failed to load research');
    }
    return response.json();
  }

  // =====================
  // STREAMING CHAT
  // =====================

  async streamChat(researchId: string, message: string, sessionId?: string, signal?: AbortSignal): Promise<Response> {
    const apiKey = await this.getOrCreateApiKey();
    const token = localStorage.getItem('dre_token');

    return fetch(`${BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-auth-token': token } : {}),
      },
      body: JSON.stringify({
        research_id: parseInt(researchId),
        message,
        api_key: apiKey,
        session_id: sessionId,
      }),
      signal,
    });
  }

  // =====================
  // SETTINGS (MOCK for now)
  // =====================

  async testConnection(provider: 'gemini' | 'groq', key: string): Promise<{ latency: number; status: 'ok' | 'error' }> {
    return this.request('/usage/test-connection', {
      method: 'POST',
      body: JSON.stringify({ provider, api_key: key }),
    });
  }

  async getUsageStats(): Promise<UsageStats> {
    return this.request('/usage/stats');
  }

  async healthCheck(): Promise<{ status: string }> {
    return this.request('/health', { method: 'GET' });
  }

  async getProviders(): Promise<any> {
    const aiEngineUrl = import.meta.env.VITE_AI_ENGINE_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${aiEngineUrl}/providers`);
    if (!response.ok) {
      throw new Error(`Failed to fetch providers: HTTP ${response.status}`);
    }
    return response.json();
  }

  // =====================
  // LLM STATUS
  // =====================

  /**
   * Fetches the current LLM provider status (OFFLINE/ONLINE mode,
   * active provider, key count, model config).
   * Calls the AI engine directly since it owns the LLM configuration.
   */
  async getLLMStatus(): Promise<LLMStatus> {
    const aiEngineUrl = import.meta.env.VITE_AI_ENGINE_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${aiEngineUrl}/llm/status`);
    if (!response.ok) {
      throw new Error(`LLM status check failed: HTTP ${response.status}`);
    }
    return response.json();
  }

  // =====================
  // WORKSPACE ENDPOINTS
  // =====================

  async getWorkspaces(): Promise<any[]> {
    const data = await this.request<{ workspaces: any[] }>('/workspaces');
    return data.workspaces;
  }

  async createWorkspace(name: string, description?: string): Promise<any> {
    const data = await this.request<{ workspace: any }>('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
    return data.workspace;
  }

  async getWorkspace(workspaceId: string): Promise<any> {
    return this.request(`/workspaces/${workspaceId}`);
  }

  async updateWorkspace(workspaceId: string, updates: { name?: string; description?: string }): Promise<any> {
    const data = await this.request<{ workspace: any }>(`/workspaces/${workspaceId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return data.workspace;
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.request(`/workspaces/${workspaceId}`, { method: 'DELETE' });
  }

  async startWorkspaceResearch(workspaceId: string, topic: string, depth: string = 'deep'): Promise<any> {
    return this.request(`/workspaces/${workspaceId}/research/start`, {
      method: 'POST',
      body: JSON.stringify({ topic, depth }),
    });
  }

  async getWorkspaceSessionStatus(workspaceId: string, sessionId: string): Promise<any> {
    return this.request(`/workspaces/${workspaceId}/research/${sessionId}/status`);
  }

  async lockWorkspaceTopic(workspaceId: string, sessionId: string, topic: string): Promise<void> {
    await this.request(`/workspaces/${workspaceId}/research/${sessionId}/topic`, {
      method: 'POST',
      body: JSON.stringify({ topic }),
    });
  }

  async getWorkspaceSuggestions(workspaceId: string, sessionId: string): Promise<any> {
    return this.request(`/workspaces/${workspaceId}/research/${sessionId}/suggestions`);
  }

  async getWorkspaceSources(workspaceId: string): Promise<any[]> {
    const data = await this.request<{ sources: any[] }>(`/workspaces/${workspaceId}/sources`);
    return data.sources;
  }

  async getWorkspaceSessions(workspaceId: string): Promise<any[]> {
    const data = await this.request<{ workspace: any; sessions: any[] }>(`/workspaces/${workspaceId}`);
    return data.sessions || [];
  }

  async uploadWorkspaceFile(workspaceId: string, file: File): Promise<{ success: boolean; filename: string; chunks_added: number }> {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/workspaces/${workspaceId}/upload`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || `Upload failed: ${res.status}`);
    }

    return res.json();
  }

  // =====================
  // DATA MAPPING
  // =====================

  private mapBackendToFrontend(data: any): ResearchJob {
    // Backend uses snake_case, frontend uses camelCase
    const result = data.result_json || {};
    const findings = result?.final_state?.findings || {};
    const reportResult = findings.multi_stage_report || result.multi_stage_report || result.scientific_writing || {};
    const vizResult = findings.visualization?.response || result.visualization || {};

    // Normalize report shape across old/new pipeline outputs.
    const reportMarkdown =
      reportResult.markdown_report ||
      reportResult.response ||
      data.report_markdown;
    const latexSource =
      reportResult.latex_source ||
      result.latex_generation?.latex_source ||
      data.latex_source;

    return {
      id: String(data.id),
      topic: data.task || data.title || 'Untitled Research',
      status: this.mapStatus(data.status),
      depth: 'deep', // Backend doesn't track this currently
      createdAt: data.created_at,
      updatedAt: data.updated_at || data.created_at,
      startedAt: data.started_at || data.created_at,
      completedAt: data.completed_at || null,
      currentStage: data.current_stage || null,
      logs: this.extractLogs(result),
      reportMarkdown,
      latexSource,
      pdfPath: reportResult.pdf_path,
      texPath: reportResult.tex_path,
      diagrams: this.extractDiagrams(vizResult),
      images: this.extractImages(vizResult),
      modelUsed: result.model_used || 'phi3:mini',
      tokenUsage: result.token_usage || 0,
      result_json: result,
    };
  }

  private mapStatus(status: string): JobStatus {
    switch (status?.toLowerCase()) {
      case 'queued': return JobStatus.QUEUED;
      case 'processing': return JobStatus.PROCESSING;
      case 'retry':
      case 'retrying':
      case 'stale':
        return JobStatus.PROCESSING;
      case 'completed': return JobStatus.COMPLETED;
      case 'cancelled':
      case 'failed': return JobStatus.FAILED;
      default: return JobStatus.QUEUED;
    }
  }

  private extractLogs(result: any): any[] {
    // Backend doesn't provide real-time logs currently
    // This could be enhanced with WebSockets later
    return [];
  }

  private extractDiagrams(viz: any): string[] {
    const diagrams: string[] = [];
    if (viz.timeline_mermaid) diagrams.push(viz.timeline_mermaid);
    if (viz.methodology_mermaid) diagrams.push(viz.methodology_mermaid);
    if (viz.data_chart_mermaid) diagrams.push(viz.data_chart_mermaid);
    return diagrams;
  }

  private extractImages(viz: any): string[] {
    const images: string[] = [];
    const joinPath = (path: string) => {
      if (/^https?:\/\//i.test(path)) return path;
      const cleaned = path.startsWith('/') ? path : `/${path}`;
      return `${BASE_URL}${cleaned}`;
    };

    // Legacy/Local images
    if (viz.generated_image_path) {
      images.push(joinPath(viz.generated_image_path));
    }

    if (viz.images_metadata && Array.isArray(viz.images_metadata)) {
      for (const img of viz.images_metadata) {
        if (img?.local) {
          images.push(joinPath(img.local));
        } else if (img?.original) {
          images.push(img.original);
        }
      }
    }

    // Real search images (from Google/DuckDuckGo)
    if (viz.image_urls && Array.isArray(viz.image_urls)) {
      images.push(...viz.image_urls);
    }

    return images;
  }
}

// ── Demo Mode ───────────────────────────────────────────────────────────────
// When VITE_DEMO_MODE=true the entire API layer is replaced with a client-side
// mock that works without any backend — ideal for Vercel preview deployments.
import { mockApi } from './mockApi';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

export const api: ApiService = IS_DEMO ? (mockApi as any) : new ApiService();

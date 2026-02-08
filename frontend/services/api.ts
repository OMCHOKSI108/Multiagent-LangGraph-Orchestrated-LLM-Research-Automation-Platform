import { JobStatus, ResearchJob, User, UsageStats, Memory, SearchResponse } from '../types';

const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

class ApiService {
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
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
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
    // Backend doesn't have this endpoint yet - stub for now
    console.warn('updatePassword not implemented in backend');
  }

  async getMe(): Promise<User> {
    const data = await this.request<{ user: { id: number; username: string; email: string } }>('/auth/me');
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
    let key = localStorage.getItem('dre_api_key');
    if (!key) {
      key = await this.generateApiKey();
      localStorage.setItem('dre_api_key', key);
    }
    return key;
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
    await this.request(`/events/research/${id}/rename`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  }

  async getResearchEvents(id: string): Promise<any[]> {
    return this.request<any[]>(`/events/${id}`);
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
    const eventSource = new EventSource(`${BASE_URL}/events/stream/${researchId}`);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent(data);
      } catch (err) {
        console.warn('Failed to parse SSE event:', e.data);
      }
    };

    eventSource.onerror = (e) => {
      console.error('SSE connection error:', e);
      onError?.(e);
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

  // =====================
  // STREAMING CHAT
  // =====================

  async streamChat(researchId: string, message: string, sessionId?: string): Promise<Response> {
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

  // =====================
  // DATA MAPPING
  // =====================

  private mapBackendToFrontend(data: any): ResearchJob {
    // Backend uses snake_case, frontend uses camelCase
    const result = data.result_json || {};

    return {
      id: String(data.id),
      topic: data.task || data.title || 'Untitled Research',
      status: this.mapStatus(data.status),
      depth: 'deep', // Backend doesn't track this currently
      createdAt: data.created_at,
      updatedAt: data.updated_at || data.created_at,
      logs: this.extractLogs(result),
      reportMarkdown: result.scientific_writing?.markdown_report,
      diagrams: this.extractDiagrams(result),
      images: this.extractImages(result),
      modelUsed: 'phi3:mini', // Could be extracted from result
      tokenUsage: 0,
    };
  }

  private mapStatus(status: string): JobStatus {
    switch (status?.toLowerCase()) {
      case 'queued': return JobStatus.QUEUED;
      case 'processing': return JobStatus.PROCESSING;
      case 'completed': return JobStatus.COMPLETED;
      case 'failed': return JobStatus.FAILED;
      default: return JobStatus.QUEUED;
    }
  }

  private extractLogs(result: any): any[] {
    // Backend doesn't provide real-time logs currently
    // This could be enhanced with WebSockets later
    return [];
  }

  private extractDiagrams(result: any): string[] {
    const viz = result.visualization || {};
    const diagrams: string[] = [];
    if (viz.timeline_mermaid) diagrams.push(viz.timeline_mermaid);
    if (viz.methodology_mermaid) diagrams.push(viz.methodology_mermaid);
    if (viz.data_chart_mermaid) diagrams.push(viz.data_chart_mermaid);
    return diagrams;
  }

  private extractImages(result: any): string[] {
    const viz = result.visualization || {};
    if (viz.generated_image_path) {
      return [`${BASE_URL}/${viz.generated_image_path}`];
    }
    return [];
  }
}

export const api = new ApiService();
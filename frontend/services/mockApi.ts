/**
 * Mock API Service for Demo Mode.
 *
 * Implements the same public interface as ApiService so the Zustand store
 * and all UI components work identically — but everything is client-side
 * with no backend required. Perfect for Vercel deployment.
 *
 * Accepts ONLY:  devang@gmail.com / OMchoksi@30
 */

import { JobStatus, ResearchJob, User, UsageStats, Memory, SearchResponse, LLMStatus } from '../types';
import {
  DEMO_EMAIL, DEMO_PASSWORD, DEMO_USER, DEMO_TOKEN,
  MOCK_RESEARCHES, MOCK_CHAT_HISTORY, MOCK_MEMORIES,
  MOCK_USAGE_STATS, MOCK_LLM_STATUS,
  getMockEvents, getMockSources,
} from './mockData';

// Simulate network latency
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

class MockApiService {
  public readonly BASE_URL = '';

  // ── helpers ──
  private mapMockToFrontend(data: any): ResearchJob {
    const result = data.result_json || {};
    const findings = result?.final_state?.findings || {};
    const reportResult = findings.multi_stage_report || result.multi_stage_report || {};
    const vizResult = findings.visualization?.response || result.visualization || {};

    const reportMarkdown = reportResult.markdown_report || reportResult.response || data.report_markdown;
    const latexSource = reportResult.latex_source || data.latex_source;

    return {
      id: String(data.id),
      topic: data.task || data.title || 'Untitled Research',
      status: this.mapStatus(data.status),
      depth: 'deep',
      createdAt: data.created_at,
      updatedAt: data.updated_at || data.created_at,
      startedAt: data.started_at || data.created_at,
      completedAt: data.completed_at || null,
      currentStage: data.current_stage || null,
      logs: [],
      reportMarkdown,
      latexSource,
      diagrams: this.extractDiagrams(vizResult),
      images: vizResult.image_urls || [],
      modelUsed: 'gemini-2.0-flash',
      tokenUsage: 0,
      result_json: result,
    };
  }

  private mapStatus(status: string): JobStatus {
    switch (status?.toLowerCase()) {
      case 'queued': return JobStatus.QUEUED;
      case 'processing': return JobStatus.PROCESSING;
      case 'completed': return JobStatus.COMPLETED;
      case 'cancelled':
      case 'failed': return JobStatus.FAILED;
      default: return JobStatus.QUEUED;
    }
  }

  private extractDiagrams(viz: any): string[] {
    const d: string[] = [];
    if (viz.timeline_mermaid) d.push(viz.timeline_mermaid);
    if (viz.methodology_mermaid) d.push(viz.methodology_mermaid);
    if (viz.data_chart_mermaid) d.push(viz.data_chart_mermaid);
    return d;
  }

  // ── AUTH ──

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    await delay(400);
    if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      throw new Error('Invalid credentials');
    }
    return { token: DEMO_TOKEN, user: { ...DEMO_USER } };
  }

  async signup(email: string, password: string, username: string): Promise<{ token: string; user: User }> {
    await delay(400);
    throw new Error('Signup is disabled in demo mode. Please log in with the demo account.');
  }

  async updatePassword(_current: string, _newPass: string): Promise<void> {
    await delay(200);
    throw new Error('Password change disabled in demo mode.');
  }

  async getMe(): Promise<User> {
    await delay(150);
    return { ...DEMO_USER };
  }

  async updateProfile(name: string): Promise<User> {
    await delay(200);
    return { ...DEMO_USER, name };
  }

  // ── API KEY ──

  async generateApiKey(_name?: string): Promise<string> {
    return 'demo-api-key-mock-xxxx';
  }

  // ── RESEARCH ──

  async getResearches(): Promise<ResearchJob[]> {
    await delay(300);
    return MOCK_RESEARCHES.map(r => this.mapMockToFrontend(r));
  }

  async getResearch(id: string): Promise<ResearchJob> {
    await delay(200);
    const found = MOCK_RESEARCHES.find(r => String(r.id) === id);
    if (!found) throw new Error('Research not found');
    return this.mapMockToFrontend(found);
  }

  async createResearch(topic: string, depth: 'quick' | 'deep'): Promise<ResearchJob> {
    await delay(500);
    // In demo mode, just return a mock "queued" job
    const newId = MOCK_RESEARCHES.length + 10;
    return {
      id: String(newId),
      topic,
      depth,
      status: JobStatus.QUEUED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      logs: [],
    };
  }

  async renameResearch(id: string, title: string): Promise<void> {
    await delay(200);
    // No-op in demo mode
  }

  async selectTopic(id: string, topic: string): Promise<void> {
    await delay(200);
  }

  async getTopicSuggestions(id: string): Promise<{ topic_locked: boolean; selected_topic: string | null; topic_suggestions: any[] }> {
    await delay(150);
    return { topic_locked: true, selected_topic: null, topic_suggestions: [] };
  }

  async deleteResearch(id: string): Promise<void> {
    await delay(200);
    // No-op in demo
  }

  async getResearchEvents(id: string): Promise<any[]> {
    await delay(200);
    return getMockEvents(Number(id));
  }

  async getResearchSources(id: string): Promise<any[]> {
    await delay(200);
    return getMockSources(Number(id));
  }

  // ── SSE (no-op in demo) ──

  subscribeToEvents(
    researchId: string,
    onEvent: (data: any) => void,
    _onError?: (error: Event) => void
  ): EventSource {
    // Return a dummy object that won't actually connect
    const dummy = {
      close: () => {},
      onmessage: null,
      onerror: null,
      readyState: 2, // CLOSED
      url: '',
      withCredentials: false,
      CONNECTING: 0,
      OPEN: 1,
      CLOSED: 2,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    } as unknown as EventSource;
    return dummy;
  }

  // ── CHAT ──

  async sendChatMessage(researchId: string, message: string, sessionId?: string): Promise<{ sessionId: string; reply: string }> {
    await delay(800);
    return {
      sessionId: sessionId || 'demo-session-1',
      reply: 'This is a demo response. In the real app, the AI chatbot provides context-aware responses about your research findings.',
    };
  }

  async getChatHistory(sessionId: string): Promise<Array<{ role: 'user' | 'assistant'; message: string; created_at: string }>> {
    await delay(200);
    return [...MOCK_CHAT_HISTORY];
  }

  async streamChat(researchId: string, message: string, sessionId?: string, signal?: AbortSignal): Promise<Response> {
    // Create a mock SSE response with streaming text
    const responseText = getDemoChatReply(message);
    const encoder = new TextEncoder();
    const words = responseText.split(' ');

    const stream = new ReadableStream({
      async start(controller) {
        // Send session header
        for (let i = 0; i < words.length; i++) {
          if (signal?.aborted) break;
          const word = (i === 0 ? '' : ' ') + words[i];
          controller.enqueue(encoder.encode(`data: ${word}\n\n`));
          await delay(30 + Math.random() * 40);
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'X-Session-ID': sessionId || 'demo-session-' + Date.now(),
      },
    });
  }

  // ── MEMORIES ──

  async getMemories(_page?: number, _limit?: number): Promise<{ memories: Memory[]; total: number }> {
    await delay(200);
    return { memories: MOCK_MEMORIES as any, total: MOCK_MEMORIES.length };
  }

  async createMemory(content: string, _source?: string): Promise<Memory> {
    await delay(300);
    return {
      id: Date.now(),
      content,
      source: 'manual',
      created_at: new Date().toISOString(),
    };
  }

  async deleteMemory(id: number): Promise<void> {
    await delay(150);
  }

  async searchMemories(query: string): Promise<{ results: Memory[] }> {
    await delay(300);
    const filtered = MOCK_MEMORIES.filter(m => m.content.toLowerCase().includes(query.toLowerCase()));
    return { results: filtered as any };
  }

  // ── WEB SEARCH ──

  async searchWeb(query: string, providers?: string[]): Promise<SearchResponse> {
    await delay(500);
    return {
      query,
      results: [
        { title: `Search result for "${query}"`, url: 'https://example.com/1', description: 'This is a mock search result in demo mode.', source: 'duckduckgo', favicon: '' },
        { title: `Academic paper: ${query}`, url: 'https://arxiv.org/example', description: 'A relevant academic paper from ArXiv.', source: 'arxiv', favicon: '' },
      ],
      total_results: 2,
      providers_used: ['duckduckgo', 'arxiv'],
    };
  }

  // ── EXPORT ──

  async exportMarkdown(researchId: string): Promise<void> {
    const job = MOCK_RESEARCHES.find(r => String(r.id) === researchId);
    if (!job?.report_markdown) throw new Error('No report available');
    downloadBlob(job.report_markdown, `research_${researchId}.md`, 'text/markdown');
  }

  async exportPDF(researchId: string): Promise<void> {
    // In demo mode, download the markdown as HTML
    const job = MOCK_RESEARCHES.find(r => String(r.id) === researchId);
    if (!job?.report_markdown) throw new Error('No report available');
    const html = `<!DOCTYPE html><html><head><title>${job.title}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 20px;color:#333;line-height:1.6}h1{border-bottom:2px solid #e0e0e0;padding-bottom:10px}table{border-collapse:collapse;width:100%;margin:20px 0}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}th{background:#f2f2f2}</style></head><body><div style="white-space:pre-wrap">${job.report_markdown}</div></body></html>`;
    downloadBlob(html, `research_${researchId}.html`, 'text/html');
  }

  async exportLatex(researchId: string): Promise<void> {
    const job = MOCK_RESEARCHES.find(r => String(r.id) === researchId);
    const report = job?.result_json?.final_state?.findings?.multi_stage_report as any;
    const latex = job?.latex_source || report?.latex_source;
    if (!latex) throw new Error('No LaTeX source available');
    downloadBlob(latex, `research_${researchId}.tex`, 'text/plain');
  }

  async compileLatex(researchId: string, content: string): Promise<Blob> {
    await delay(500);
    // Return an HTML blob as simulated PDF
    const html = `<!DOCTYPE html><html><head><title>Compiled LaTeX</title></head><body><pre>${content}</pre></body></html>`;
    return new Blob([html], { type: 'application/pdf' });
  }

  async exportZip(researchId: string): Promise<void> {
    // In demo mode, just download the markdown
    await this.exportMarkdown(researchId);
  }

  async exportPlots(researchId: string): Promise<void> {
    const job = MOCK_RESEARCHES.find(r => String(r.id) === researchId);
    const viz = job?.result_json?.final_state?.findings?.visualization?.response;
    if (!viz) throw new Error('No plots available');
    const content = [viz.timeline_mermaid, viz.methodology_mermaid, (viz as any).data_chart_mermaid].filter(Boolean).join('\n\n---\n\n');
    downloadBlob(content, `research_${researchId}_diagrams.txt`, 'text/plain');
  }

  // ── SHARE ──

  async shareResearch(researchId: string): Promise<{ shareToken: string; shareUrl: string }> {
    await delay(300);
    return {
      shareToken: 'demo-share-token',
      shareUrl: `${window.location.origin}/shared/demo-share-token`,
    };
  }

  async getSharedResearch(token: string): Promise<any> {
    await delay(300);
    return MOCK_RESEARCHES[0];
  }

  // ── SETTINGS / STATUS ──

  async testConnection(provider: 'gemini' | 'groq', key: string): Promise<{ latency: number; status: 'ok' | 'error' }> {
    await delay(500);
    return { latency: 142, status: 'ok' };
  }

  async getUsageStats(): Promise<UsageStats> {
    await delay(200);
    return { ...MOCK_USAGE_STATS };
  }

  async healthCheck(): Promise<{ status: string }> {
    return { status: 'ok' };
  }

  async getProviders(): Promise<any> {
    await delay(200);
    return {
      providers: [
        { name: 'gemini', available: true, models: ['gemini-2.0-flash', 'gemini-2.0-flash-thinking-exp'] },
      ],
    };
  }

  async getLLMStatus(): Promise<LLMStatus> {
    await delay(200);
    return { ...MOCK_LLM_STATUS };
  }
}

// ── Helpers ──

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getDemoChatReply(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('finding') || lower.includes('result') || lower.includes('summary')) {
    return `Based on the research findings, transformer architectures have consistently outperformed traditional approaches across all major NLP tasks. The key results show:\n\n1. **Text Classification**: 96.8% accuracy (+7.6% improvement)\n2. **Named Entity Recognition**: 94.6% accuracy\n3. **Machine Translation**: 46.4 BLEU score (+10.6 improvement)\n4. **Question Answering**: 93.2% F1 score\n\nThe research also identifies important scaling laws — larger models follow predictable power-law relationships between compute, data, and performance. However, recent efficient models like Mistral-7B show that careful training can close the gap with much larger models.`;
  }

  if (lower.includes('limitation') || lower.includes('challenge') || lower.includes('problem')) {
    return `The research identifies several key limitations:\n\n- **Quadratic complexity**: Self-attention scales as O(n²), making long documents expensive to process\n- **Hallucination**: Models generate plausible but incorrect content\n- **Environmental cost**: Training GPT-3 produced ~500 tonnes of CO₂\n- **Data contamination**: Benchmark scores may be inflated\n\nFuture research should prioritize efficient architectures (linear attention, sparse transformers) and robust evaluation frameworks.`;
  }

  if (lower.includes('method') || lower.includes('how')) {
    return `The study employed a systematic review methodology:\n\n1. **Literature Search**: Reviewed 150+ papers from ACL, EMNLP, NeurIPS, and ICML (2017-2026)\n2. **Taxonomy Development**: Classified architectures into encoder-only, decoder-only, encoder-decoder, and MoE categories\n3. **Meta-Analysis**: Aggregated performance across 50 studies on standard benchmarks\n4. **Scaling Analysis**: Evaluated compute-performance relationships following Kaplan et al. (2020)\n\nAll papers were sourced from peer-reviewed venues with rigorous selection criteria.`;
  }

  return `That's a great question about the research! In the full version, the AI chatbot provides detailed, context-aware responses based on the research paper's findings, methodology, and data sources.\n\nThe chatbot can:\n- Summarize key findings and statistics\n- Explain methodology and experimental design\n- Compare results across different studies\n- Suggest follow-up research directions\n\nFeel free to ask about specific aspects of the research!`;
}

export const mockApi = new MockApiService();

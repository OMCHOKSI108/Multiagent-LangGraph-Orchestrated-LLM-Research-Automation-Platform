'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { agentsApi } from '@/lib/api';

export interface AgentInfo {
  slug?: string;
  name: string;
  category?: string;
  description?: string;
  status?: 'active' | 'offline' | 'unknown';
}

const KNOWN_AGENTS: AgentInfo[] = [
  { slug: 'topic_discovery', name: 'topic_discovery', category: 'discovery', description: 'Identifies and refines research topics using NLP and knowledge graph techniques.' },
  { slug: 'domain_intelligence', name: 'domain_intelligence', category: 'discovery', description: 'Builds a comprehensive picture of the research domain, key players, and landscape.' },
  { slug: 'literature_review', name: 'literature_review', category: 'review', description: 'Performs systematic literature review across academic databases (Semantic Scholar, arXiv).' },
  { slug: 'systematic_literature_review', name: 'systematic_literature_review', category: 'review', description: 'Conducts formal SLR following PRISMA methodology with inclusion/exclusion criteria.' },
  { slug: 'historical_review', name: 'historical_review', category: 'review', description: 'Traces the historical development and evolution of the research topic.' },
  { slug: 'gap_synthesis', name: 'gap_synthesis', category: 'synthesis', description: 'Identifies research gaps and open problems from the collected literature.' },
  { slug: 'innovation', name: 'innovation', category: 'novelty', description: 'Proposes novel research directions and innovative solutions based on identified gaps.' },
  { slug: 'web_scraper', name: 'web_scraper', category: 'scraper', description: 'Scrapes web pages for relevant content, extracting structured data from HTML.' },
  { slug: 'data_scraper', name: 'data_scraper', category: 'scraper', description: 'Gathers structured datasets from data repositories and open data portals.' },
  { slug: 'google_news', name: 'google_news', category: 'news', description: 'Fetches recent news articles relevant to the research topic.' },
  { slug: 'paper_decomposition', name: 'paper_decomposition', category: 'ingestion', description: 'Breaks down academic papers into structured components for analysis.' },
  { slug: 'understanding', name: 'understanding', category: 'ingestion', description: 'Deeply understands and summarizes the key contributions of analyzed papers.' },
  { slug: 'technical_verification', name: 'technical_verification', category: 'critique', description: 'Verifies technical claims, equations, and methodologies for correctness.' },
  { slug: 'critique', name: 'critique', category: 'critique', description: 'Provides critical analysis of the research, identifying weaknesses and limitations.' },
  { slug: 'fact_check', name: 'fact_check', category: 'critique', description: 'Cross-validates factual claims across multiple sources.' },
  { slug: 'bias_detection', name: 'bias_detection', category: 'critique', description: 'Detects potential biases in the research and data sources.' },
  { slug: 'visualization', name: 'visualization', category: 'report', description: 'Generates charts, diagrams, and visual representations of findings.' },
  { slug: 'scoring', name: 'scoring', category: 'scoring', description: 'Assigns quality and relevance scores to research outputs.' },
  { slug: 'multi_stage_report', name: 'multi_stage_report', category: 'report', description: 'Produces the final structured research report in Markdown and LaTeX.' },
  { slug: 'chatbot', name: 'chatbot', category: 'chatbot', description: 'Interactive Q&A agent for querying and exploring research results.' },
  { slug: 'memory', name: 'memory', category: 'memory', description: 'Manages long-term memory and context across research sessions.' },
  { slug: 'reresearch', name: 'reresearch', category: 'reresearch', description: 'Re-runs or expands specific parts of the pipeline based on user feedback.' },
];

const CATEGORY_LABELS: Record<string, string> = {
  discovery: '🔍 Discovery',
  review: '📚 Review',
  synthesis: '🧩 Synthesis',
  novelty: '💡 Innovation',
  scraper: '🌐 Data Collection',
  news: '📰 News',
  ingestion: '📄 Paper Analysis',
  critique: '🔬 Critique & Verification',
  report: '📋 Reporting',
  scoring: '📊 Scoring',
  chatbot: '💬 Chatbot',
  memory: '🧠 Memory',
  reresearch: '🔄 Re-Research',
  orchestrator: '⚙️ Orchestration',
};

export default function AgentsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [agents, setAgents] = useState<AgentInfo[]>(KNOWN_AGENTS);
  const [fetchErr, setFetchErr] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {

    if (!loading && !user) {
      router.replace('/login');
      return;
    }

    const fetchAgents = async () => {
      try {
        const data = await agentsApi.list();

        if (Array.isArray(data)) {
          setAgents(data);
        } else if (data?.agents && Array.isArray(data.agents)) {
          setAgents(data.agents);
        }
      } catch (err: any) {
        setFetchErr(err.message || 'Failed to fetch agents');
      }
    };

    fetchAgents();

  }, [user, loading, router]);

  if (loading) return null;

  const grouped: Record<string, AgentInfo[]> = {};

  for (const agent of agents) {

    const name = agent.name.toLowerCase();
    const desc = (agent.description || '').toLowerCase();
    const search = filter.toLowerCase();

    if (filter && !name.includes(search) && !desc.includes(search)) continue;

    const category = agent.category || 'other';

    if (!grouped[category]) grouped[category] = [];

    grouped[category].push(agent);
  }

  return (
    <div className="section-shell pb-20">
      <div className="max-w-[900px] w-full mx-auto">

        <div className="flex items-center justify-between mb-6">

          <div>
            <h2 className="text-2xl font-semibold text-slate-50 mb-0">Agent Directory</h2>
            <p className="text-sm text-slate-400">
              {agents.length} registered agents in the pipeline
            </p>
          </div>

          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search agents..."
            className="input-field w-56"
          />

        </div>

        {fetchErr && (
          <p className="text-xs text-amber-300 mb-3">
            Note: {fetchErr} — showing built-in agent list.
          </p>
        )}

        {Object.entries(grouped).map(([category, list]) => (

          <div key={category} className="mb-8">

            <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-[0.2em]">
              {CATEGORY_LABELS[category] || category}
            </h3>

            <div className="grid gap-2">

              {list.map((agent) => {

                const status = agent.status ?? 'unknown';

                return (
                  <div
                    key={agent.name}
                    className="surface-card flex items-start gap-3 py-3 px-4"
                  >

                    <div>
                      <p className="text-sm font-semibold font-mono text-slate-50">{agent.name}</p>

                      {agent.description && (
                        <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                          {agent.description}
                        </p>
                      )}
                    </div>

                    <span
                      className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full border flex-shrink-0 capitalize
                      ${
                        status === 'active'
                          ? 'border-emerald-400/70 text-emerald-300 bg-emerald-500/10'
                          : status === 'offline'
                          ? 'border-rose-400/70 text-rose-300 bg-rose-500/10'
                          : 'border-slate-700 text-slate-300 bg-slate-900/80'
                      }`}
                    >
                      {status}
                    </span>

                  </div>
                );
              })}

            </div>

          </div>
        ))}

        {Object.keys(grouped).length === 0 && (
          <p className="text-sm text-slate-400">
            No agents match your search.
          </p>
        )}

      </div>
    </div>
  );
}
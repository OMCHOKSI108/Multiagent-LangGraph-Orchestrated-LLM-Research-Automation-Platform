import React from 'react';
import { Link } from 'react-router-dom';
import {
    Cpu, Globe, BarChart, Shield, Zap, BookOpen, FileText,
    Search, MessageSquare, Brain, Network, Database, CheckCircle2,
    ArrowRight,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

const AGENT_CATEGORIES = [
    {
        title: 'Discovery & Search',
        icon: Search,
        agents: [
            { name: 'Topic Discovery', desc: 'Generates focused research topics and sub-questions from user input.' },
            { name: 'Domain Intelligence', desc: 'Maps the knowledge domain, key authors, and landmark papers.' },
            { name: 'News Agent', desc: 'Fetches recent news and blog posts related to the research topic.' },
        ],
    },
    {
        title: 'Literature & Analysis',
        icon: BookOpen,
        agents: [
            { name: 'Historical Review', desc: 'Traces the lineage of ideas from foundational works to present.' },
            { name: 'Systematic Literature Review', desc: 'PRISMA-style structured review of relevant literature.' },
            { name: 'Paper Decomposition', desc: 'Extracts methodology, results, and contributions from papers.' },
            { name: 'Deep Understanding', desc: 'Synthesises meaning across multiple sources.' },
        ],
    },
    {
        title: 'Verification & Critique',
        icon: Shield,
        agents: [
            { name: 'Technical Verification', desc: 'Validates claims with mathematical and empirical reasoning.' },
            { name: 'Critique Agent', desc: 'Identifies limitations, biases, and open questions.' },
            { name: 'Hallucination Detector', desc: 'Flags unsupported assertions before they reach the report.' },
        ],
    },
    {
        title: 'Synthesis & Writing',
        icon: FileText,
        agents: [
            { name: 'Gap Synthesis', desc: 'Identifies unexplored intersections and open research problems.' },
            { name: 'Innovation Scout', desc: 'Proposes novel hypotheses and directions from the gap analysis.' },
            { name: 'Multi-Stage Report', desc: 'Writes a structured academic report with citations and sections.' },
        ],
    },
    {
        title: 'Chat & Memory',
        icon: MessageSquare,
        agents: [
            { name: 'Research Chatbot', desc: 'Answers follow-up questions using your workspace context.' },
            { name: 'Memory Consolidation', desc: 'Stores key facts and embeddings for cross-session retrieval.' },
            { name: 'Ingestion Agent', desc: 'Processes uploaded PDFs and documents into the vector store.' },
        ],
    },
];

const SEARCH_PROVIDERS = ['ArXiv', 'PubMed', 'OpenAlex', 'DuckDuckGo', 'Wikipedia', 'Google Scholar'];

const EXPORT_FORMATS = [
    { name: 'Markdown', desc: 'Clean .md file with full report' },
    { name: 'PDF', desc: 'Formatted PDF via LaTeX compiler' },
    { name: 'LaTeX', desc: 'Raw .tex source for academic submission' },
    { name: 'Word', desc: 'Editable .docx document' },
    { name: 'ZIP Archive', desc: 'Everything bundled — report, plots, sources' },
];

const PIPELINE_STAGES = [
    { label: '1', name: 'Topic Lock', desc: 'AI confirms research scope before processing begins.' },
    { label: '2', name: 'Orchestration', desc: 'Router decides Pipeline A (domain) or B (paper analysis).' },
    { label: '3', name: 'Parallel Research', desc: 'Up to 3 agents run simultaneously for speed.' },
    { label: '4', name: 'Synthesis', desc: 'Gap and innovation agents combine parallel findings.' },
    { label: '5', name: 'Visualization', desc: 'Charts, concept maps, and citation graphs generated.' },
    { label: '6', name: 'Scoring', desc: 'Quality, novelty, and completeness scores computed.' },
    { label: '7', name: 'Report', desc: 'Full academic report written and exported.' },
];

export const FeaturesPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-bg text-text-c font-sans">

            {/* Header */}
            <header className="fixed top-0 w-full z-50 border-b border-border-c bg-bg/80 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                    <Link to="/" className="font-bold font-display text-xl tracking-tight text-accent">DeepResearch</Link>
                    <nav className="hidden md:flex gap-6 text-sm font-medium text-text-sec">
                        <Link to="/features" className="text-accent">Features</Link>
                        <Link to="/pricing" className="hover:text-accent transition-colors">Pricing</Link>
                        <Link to="/docs" className="hover:text-accent transition-colors">Docs</Link>
                    </nav>
                    <div className="flex items-center gap-3">
                        <ThemeSwitcher />
                        <Link to="/"><Button size="sm" variant="ghost">Home</Button></Link>
                        <Link to="/login"><Button size="sm">Get Started</Button></Link>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="pt-36 pb-20 px-4 text-center">
                <div className="max-w-4xl mx-auto space-y-6">
                    <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium border border-accent/30 bg-accent/10 text-accent">
                        Platform Capabilities
                    </span>
                    <h1 className="text-5xl md:text-6xl font-bold font-display tracking-tight text-text-c">
                        Everything you need to <span className="text-accent italic">research deeply</span>
                    </h1>
                    <p className="text-xl text-text-sec max-w-2xl mx-auto">
                        29 specialized agents, 6 search providers, 5 export formats — all orchestrated automatically.
                    </p>
                    <Link to="/login">
                        <Button size="lg" className="mt-4 h-12 px-8">
                            Start Free <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Agent Categories */}
            <section className="py-20 px-4 bg-bg-sec">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-14 space-y-3">
                        <h2 className="text-3xl md:text-4xl font-bold font-display text-text-c">29 Specialized Agents</h2>
                        <p className="text-text-sec">Organized into five cooperating categories.</p>
                    </div>
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {AGENT_CATEGORIES.map((cat) => (
                            <div key={cat.title} className="bg-surface border border-border-c rounded-xl p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                                        <cat.icon className="h-4 w-4" />
                                    </div>
                                    <h3 className="font-semibold font-display text-text-c">{cat.title}</h3>
                                </div>
                                <ul className="space-y-3">
                                    {cat.agents.map((a) => (
                                        <li key={a.name} className="flex gap-3">
                                            <CheckCircle2 className="h-4 w-4 text-teal flex-shrink-0 mt-0.5" />
                                            <div>
                                                <div className="text-sm font-medium text-text-c">{a.name}</div>
                                                <div className="text-xs text-text-sec mt-0.5">{a.desc}</div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pipeline */}
            <section className="py-20 px-4 bg-bg">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-14 space-y-3">
                        <h2 className="text-3xl md:text-4xl font-bold font-display text-text-c">7-Stage Research Pipeline</h2>
                        <p className="text-text-sec">From topic to publication-ready report in a single run.</p>
                    </div>
                    <div className="space-y-4">
                        {PIPELINE_STAGES.map((stage, i) => (
                            <div key={stage.label} className="flex items-start gap-4 p-4 bg-surface border border-border-c rounded-xl">
                                <div className="h-8 w-8 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-accent text-sm font-bold font-display flex-shrink-0">
                                    {stage.label}
                                </div>
                                <div>
                                    <div className="font-semibold text-text-c">{stage.name}</div>
                                    <div className="text-sm text-text-sec mt-0.5">{stage.desc}</div>
                                </div>
                                {i < PIPELINE_STAGES.length - 1 && (
                                    <div className="ml-auto text-text-sec text-sm">→</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Search Providers */}
            <section className="py-20 px-4 bg-bg-sec">
                <div className="max-w-4xl mx-auto text-center space-y-8">
                    <div className="space-y-3">
                        <h2 className="text-3xl md:text-4xl font-bold font-display text-text-c">6 Search Providers</h2>
                        <p className="text-text-sec">Simultaneous querying across academic and general-purpose sources.</p>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center">
                        {SEARCH_PROVIDERS.map((p) => (
                            <span key={p} className="px-4 py-2 bg-surface border border-border-c rounded-full text-sm font-medium text-text-c">
                                {p}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* Export Formats */}
            <section className="py-20 px-4 bg-bg">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12 space-y-3">
                        <h2 className="text-3xl md:text-4xl font-bold font-display text-text-c">5 Export Formats</h2>
                        <p className="text-text-sec">Share your research anywhere, in any format.</p>
                    </div>
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {EXPORT_FORMATS.map((f) => (
                            <div key={f.name} className="p-5 bg-surface border border-border-c rounded-xl flex items-start gap-3">
                                <FileText className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-semibold text-text-c">{f.name}</div>
                                    <div className="text-sm text-text-sec mt-0.5">{f.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 px-4 text-center bg-bg-sec border-t border-border-c">
                <div className="max-w-xl mx-auto space-y-6">
                    <h2 className="text-3xl font-bold font-display text-text-c">Ready to try it?</h2>
                    <p className="text-text-sec">Create a free account and run your first research session in minutes.</p>
                    <Link to="/login">
                        <Button size="lg" className="px-10">Create Free Account <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    </Link>
                </div>
            </section>

            <footer className="border-t border-border-c py-8 bg-bg text-center text-sm text-text-sec">
                &copy; {new Date().getFullYear()} DeepResearch &middot;{' '}
                <Link to="/features" className="hover:text-accent">Features</Link>{' '}·{' '}
                <Link to="/pricing" className="hover:text-accent">Pricing</Link>{' '}·{' '}
                <Link to="/docs" className="hover:text-accent">Docs</Link>
            </footer>
        </div>
    );
};

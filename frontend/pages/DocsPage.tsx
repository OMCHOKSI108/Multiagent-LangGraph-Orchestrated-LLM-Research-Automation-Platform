import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, BookOpen, Zap, Code2, MessageSquare, Upload, Download, Key } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { cn } from '../lib/utils';

type Section = {
    id: string;
    title: string;
    icon: React.ElementType;
    content: React.ReactNode;
};

const CodeBlock: React.FC<{ code: string; lang?: string }> = ({ code, lang = 'bash' }) => (
    <pre className="bg-surface2 border border-border-c rounded-lg p-4 overflow-x-auto text-sm font-mono text-text-c mt-3">
        <code>{code.trim()}</code>
    </pre>
);

const SECTIONS: Section[] = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        icon: Zap,
        content: (
            <div className="space-y-4 text-text-sec text-sm leading-relaxed">
                <p>DeepResearch is a multi-agent AI platform that automates the entire academic research workflow — from topic discovery to publication-ready reports.</p>

                <h4 className="font-semibold text-text-c text-base">1. Create an account</h4>
                <p>Sign up at <Link to="/login" className="text-accent hover:underline">deepresearch.ai</Link> — no credit card required. Your first 5 sessions are free every month.</p>

                <h4 className="font-semibold text-text-c text-base">2. Create a workspace</h4>
                <p>Click <strong className="text-text-c">New Workspace</strong> from the dashboard. Give it a descriptive name — this acts as your project folder.</p>

                <h4 className="font-semibold text-text-c text-base">3. Enter a research topic</h4>
                <p>Type your research question into the prompt box. The AI will confirm the scope before processing begins (Topic Lock). You can provide additional context or upload supporting PDFs.</p>

                <h4 className="font-semibold text-text-c text-base">4. Watch live progress</h4>
                <p>The agent timeline on the right panel shows each agent's status in real time via Server-Sent Events (SSE). The pipeline typically completes in 3–15 minutes depending on scope.</p>

                <h4 className="font-semibold text-text-c text-base">5. Review and export</h4>
                <p>The report preview tab renders the full Markdown report with citations. Use the Export menu to download as PDF, LaTeX, Word, or a ZIP archive.</p>
            </div>
        ),
    },
    {
        id: 'research-pipeline',
        title: 'Research Pipeline',
        icon: BookOpen,
        content: (
            <div className="space-y-4 text-text-sec text-sm leading-relaxed">
                <p>The pipeline consists of two parallel tracks selected automatically based on your input.</p>

                <h4 className="font-semibold text-text-c text-base">Pipeline A — Domain Research</h4>
                <p>Triggered for broad topics and literature reviews. Runs Historical Review, Systematic Literature Review, and News searches in parallel, then synthesises gaps and proposes innovations.</p>

                <h4 className="font-semibold text-text-c text-base">Pipeline B — Paper Analysis</h4>
                <p>Triggered when a specific paper or set of papers is provided. Decomposes each paper, builds deep understanding, runs technical verification, and delivers a structured critique.</p>

                <h4 className="font-semibold text-text-c text-base">Common Stages</h4>
                <ul className="list-disc list-inside space-y-1">
                    <li><strong className="text-text-c">Topic Lock</strong> — AI confirms scope; you can reject and revise.</li>
                    <li><strong className="text-text-c">Orchestration</strong> — Router selects Pipeline A or B.</li>
                    <li><strong className="text-text-c">Visualization</strong> — Citation graphs and concept maps.</li>
                    <li><strong className="text-text-c">Scoring</strong> — Quality, novelty, and completeness metrics.</li>
                    <li><strong className="text-text-c">Multi-Stage Report</strong> — Structured academic report generated.</li>
                </ul>
            </div>
        ),
    },
    {
        id: 'chat',
        title: 'Chat & Q&A',
        icon: MessageSquare,
        content: (
            <div className="space-y-4 text-text-sec text-sm leading-relaxed">
                <p>Every workspace has an embedded research assistant that is aware of your full research session — including the report, sources, and uploaded files.</p>

                <h4 className="font-semibold text-text-c text-base">Asking follow-up questions</h4>
                <p>Use the chat panel (toggle with the chat icon) to ask clarifying questions, request deeper dives into specific sections, or ask for summaries of individual sources.</p>

                <h4 className="font-semibold text-text-c text-base">Streaming responses</h4>
                <p>Responses stream token-by-token in real time. If the stream is interrupted, the system automatically falls back to a non-streaming request so you never lose an answer.</p>

                <h4 className="font-semibold text-text-c text-base">Memory</h4>
                <p>Key facts from chat sessions are stored in a per-workspace vector store. This means later sessions in the same workspace have access to prior conversation context.</p>
            </div>
        ),
    },
    {
        id: 'uploads',
        title: 'File Uploads',
        icon: Upload,
        content: (
            <div className="space-y-4 text-text-sec text-sm leading-relaxed">
                <p>Pro users can upload PDF documents directly into a workspace. Uploaded files are processed by the Ingestion Agent and indexed into the workspace vector store.</p>

                <h4 className="font-semibold text-text-c text-base">Supported formats</h4>
                <p>PDF is the primary supported format. The maximum file size is 50 MB per file. Up to 10 GB total per workspace on the Pro plan.</p>

                <h4 className="font-semibold text-text-c text-base">How uploads are used</h4>
                <p>Uploaded files are automatically considered by the research agents as primary sources. The chat assistant can also directly reference and quote from uploaded documents.</p>

                <h4 className="font-semibold text-text-c text-base">Uploading via API</h4>
                <CodeBlock lang="bash" code={`curl -X POST https://api.deepresearch.ai/workspace/{id}/upload \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -F "file=@paper.pdf"`} />
            </div>
        ),
    },
    {
        id: 'exports',
        title: 'Exporting Reports',
        icon: Download,
        content: (
            <div className="space-y-4 text-text-sec text-sm leading-relaxed">
                <p>Reports can be exported immediately after a research session completes. All exports are generated on-demand and available in the workspace for 30 days.</p>

                <h4 className="font-semibold text-text-c text-base">Available formats</h4>
                <ul className="list-disc list-inside space-y-1">
                    <li><strong className="text-text-c">Markdown (.md)</strong> — Plain text with formatting, good for version control.</li>
                    <li><strong className="text-text-c">PDF</strong> — Compiled via LaTeX for professional presentation.</li>
                    <li><strong className="text-text-c">LaTeX (.tex)</strong> — Raw source for academic journal submission.</li>
                    <li><strong className="text-text-c">Word (.docx)</strong> — Editable in Microsoft Word or Google Docs.</li>
                    <li><strong className="text-text-c">ZIP</strong> — Full bundle with report, visualizations, and source list.</li>
                </ul>

                <h4 className="font-semibold text-text-c text-base">Export via API</h4>
                <CodeBlock lang="bash" code={`curl https://api.deepresearch.ai/research/{id}/export?format=pdf \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  --output report.pdf`} />
            </div>
        ),
    },
    {
        id: 'api',
        title: 'API Reference',
        icon: Code2,
        content: (
            <div className="space-y-5 text-text-sec text-sm leading-relaxed">
                <p>DeepResearch provides a REST API for programmatic access. Base URL: <code className="bg-surface2 px-1.5 py-0.5 rounded text-accent font-mono text-xs">https://api.deepresearch.ai</code></p>

                <h4 className="font-semibold text-text-c text-base">Authentication</h4>
                <p>All API requests require a Bearer token in the Authorization header. Generate API keys from your <Link to="/profile" className="text-accent hover:underline">Profile</Link> page.</p>
                <CodeBlock lang="bash" code={`curl https://api.deepresearch.ai/research \\
  -H "Authorization: Bearer dr_your_api_key"`} />

                <h4 className="font-semibold text-text-c text-base">Create a research session</h4>
                <CodeBlock lang="bash" code={`curl -X POST https://api.deepresearch.ai/research \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"topic": "quantum error correction", "depth": "deep"}'`} />

                <h4 className="font-semibold text-text-c text-base">Get session status</h4>
                <CodeBlock lang="bash" code={`curl https://api.deepresearch.ai/research/{id} \\
  -H "Authorization: Bearer YOUR_TOKEN"`} />

                <h4 className="font-semibold text-text-c text-base">Subscribe to live events (SSE)</h4>
                <CodeBlock lang="bash" code={`curl https://api.deepresearch.ai/events/stream?jobId={id} \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Accept: text/event-stream"`} />

                <p>Full OpenAPI spec available at <code className="bg-surface2 px-1.5 py-0.5 rounded text-accent font-mono text-xs">/docs</code> on the running AI Engine (port 8000).</p>
            </div>
        ),
    },
    {
        id: 'api-keys',
        title: 'API Keys',
        icon: Key,
        content: (
            <div className="space-y-4 text-text-sec text-sm leading-relaxed">
                <p>API keys are project-scoped secrets for accessing the DeepResearch API programmatically.</p>

                <h4 className="font-semibold text-text-c text-base">Generating a key</h4>
                <ol className="list-decimal list-inside space-y-1">
                    <li>Navigate to <Link to="/profile" className="text-accent hover:underline">Profile → API Keys</Link>.</li>
                    <li>Click <strong className="text-text-c">Generate New Key</strong>.</li>
                    <li>Copy the key immediately — it is only shown once.</li>
                </ol>

                <h4 className="font-semibold text-text-c text-base">Key prefix</h4>
                <p>All keys begin with <code className="bg-surface2 px-1.5 py-0.5 rounded text-accent font-mono text-xs">dr_</code> so they are easy to identify.</p>

                <h4 className="font-semibold text-text-c text-base">Rotating keys</h4>
                <p>You can revoke any key from the Profile page. Revoked keys are immediately invalidated with no grace period.</p>

                <h4 className="font-semibold text-text-c text-base">Security best practices</h4>
                <ul className="list-disc list-inside space-y-1">
                    <li>Never commit API keys to version control.</li>
                    <li>Use environment variables or secret managers.</li>
                    <li>Rotate keys periodically and after team member offboarding.</li>
                </ul>
            </div>
        ),
    },
];

export const DocsPage: React.FC = () => {
    const [expanded, setExpanded] = useState<string>('getting-started');

    return (
        <div className="min-h-screen bg-bg text-text-c font-sans">

            {/* Header */}
            <header className="fixed top-0 w-full z-50 border-b border-border-c bg-bg/80 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                    <Link to="/" className="font-bold font-display text-xl tracking-tight text-accent">DeepResearch</Link>
                    <nav className="hidden md:flex gap-6 text-sm font-medium text-text-sec">
                        <Link to="/features" className="hover:text-accent transition-colors">Features</Link>
                        <Link to="/pricing" className="hover:text-accent transition-colors">Pricing</Link>
                        <Link to="/docs" className="text-accent">Docs</Link>
                    </nav>
                    <div className="flex items-center gap-3">
                        <ThemeSwitcher />
                        <Link to="/login"><Button size="sm">Sign In</Button></Link>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-4xl mx-auto pt-32 pb-24 px-4">
                <div className="mb-10 space-y-3">
                    <h1 className="text-4xl md:text-5xl font-bold font-display text-text-c">Documentation</h1>
                    <p className="text-text-sec text-lg">Everything you need to use DeepResearch effectively.</p>
                </div>

                {/* Accordion */}
                <div className="space-y-3">
                    {SECTIONS.map((section) => {
                        const isOpen = expanded === section.id;
                        return (
                            <div
                                key={section.id}
                                className={cn(
                                    'border rounded-xl overflow-hidden transition-colors',
                                    isOpen ? 'border-accent/40 bg-surface' : 'border-border-c bg-surface'
                                )}
                            >
                                <button
                                    type="button"
                                    className="w-full flex items-center gap-3 p-5 text-left"
                                    onClick={() => setExpanded(isOpen ? '' : section.id)}
                                    aria-expanded={isOpen}
                                >
                                    <div className={cn(
                                        'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                                        isOpen ? 'bg-accent/15 text-accent' : 'bg-surface2 text-text-sec'
                                    )}>
                                        <section.icon className="h-4 w-4" />
                                    </div>
                                    <span className="font-semibold text-text-c flex-1">{section.title}</span>
                                    {isOpen
                                        ? <ChevronDown className="h-4 w-4 text-text-sec flex-shrink-0" />
                                        : <ChevronRight className="h-4 w-4 text-text-sec flex-shrink-0" />
                                    }
                                </button>
                                {isOpen && (
                                    <div className="px-5 pb-6 border-t border-border-c pt-5">
                                        {section.content}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Help CTA */}
                <div className="mt-14 p-6 bg-surface border border-border-c rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                    <div>
                        <div className="font-semibold text-text-c">Need more help?</div>
                        <div className="text-sm text-text-sec mt-1">Our full OpenAPI reference is available when the AI Engine is running.</div>
                    </div>
                    <div className="flex gap-3">
                        <a href="mailto:support@deepresearch.ai">
                            <Button variant="secondary" size="sm">Email Support</Button>
                        </a>
                        <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
                            <Button size="sm">API Reference ↗</Button>
                        </a>
                    </div>
                </div>
            </div>

            <footer className="border-t border-border-c py-8 bg-bg text-center text-sm text-text-sec">
                &copy; {new Date().getFullYear()} DeepResearch &middot;{' '}
                <Link to="/features" className="hover:text-accent">Features</Link>{' '}·{' '}
                <Link to="/pricing" className="hover:text-accent">Pricing</Link>{' '}·{' '}
                <Link to="/docs" className="hover:text-accent">Docs</Link>
            </footer>
        </div>
    );
};

import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Lazy-load mermaid only when a mermaid diagram is actually rendered
let mermaidInstance: typeof import('mermaid').default | null = null;
const getMermaid = async () => {
  if (!mermaidInstance) {
    const m = await import('mermaid');
    mermaidInstance = m.default;
    mermaidInstance.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
      fontFamily: 'Inter',
    });
  }
  return mermaidInstance;
};

interface MermaidProps {
  chart: string;
}

const MermaidDiagram: React.FC<MermaidProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);
  const id = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMermaid().then((mermaid) => {
      if (cancelled || !ref.current) return;
      mermaid.render(id.current, chart).then((result) => {
        if (!cancelled && ref.current) {
          ref.current.innerHTML = result.svg;
        }
      }).catch(() => { if (!cancelled) setError(true); });
    });
    return () => { cancelled = true; };
  }, [chart]);

  if (error) return <pre className="text-xs text-red-500 p-2">{chart}</pre>;
  return <div ref={ref} className="my-6 flex justify-center bg-zinc-50 dark:bg-dark-200 border border-zinc-200 dark:border-dark-300 p-4 rounded-lg" />;
};

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(({ content }) => {
  return (
    <div className="prose prose-sm max-w-none text-zinc-800 dark:text-zinc-200 prose-headings:font-semibold prose-headings:text-zinc-900 dark:prose-headings:text-zinc-100 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-pre:bg-zinc-50 dark:prose-pre:bg-dark-200 prose-pre:border prose-pre:border-zinc-200 dark:prose-pre:border-dark-300 prose-pre:text-zinc-800 dark:prose-pre:text-zinc-200 prose-blockquote:border-l-4 prose-blockquote:border-zinc-200 dark:prose-blockquote:border-dark-300 prose-blockquote:text-zinc-500 dark:prose-blockquote:text-zinc-400">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isMermaid = match && match[1] === 'mermaid';
            
            if (isMermaid) {
              return <MermaidDiagram chart={String(children).replace(/\n$/, '')} />;
            }

            return match ? (
              <div className="relative group my-4 rounded-lg overflow-hidden border border-zinc-200 dark:border-dark-300">
                <div className="bg-zinc-100 dark:bg-dark-200 px-3 py-1.5 border-b border-zinc-200 dark:border-dark-300 text-xs font-mono text-zinc-500 dark:text-zinc-400 flex justify-between">
                    <span>{match[1]}</span>
                </div>
                <pre className="!bg-white dark:!bg-dark-primary !m-0 !p-4 overflow-x-auto">
                    <code className={`${className} !text-sm !font-mono text-zinc-800 dark:text-zinc-200`} {...props}>
                    {children}
                    </code>
                </pre>
              </div>
            ) : (
              <code className="bg-zinc-100 dark:bg-dark-200 text-zinc-800 dark:text-zinc-200 px-1 py-0.5 rounded text-sm font-mono border border-zinc-200 dark:border-dark-300" {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
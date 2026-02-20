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
      securityLevel: 'strict',
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
  return <div ref={ref} className="my-6 flex justify-center bg-zinc-50 dark:bg-card border border-zinc-200 dark:border-border p-4 rounded-lg" />;
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(({ content, className }) => {
  return (
    <div className={`prose-research w-full max-w-none ${className || ''}`}>
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
              <div className="relative group my-4 rounded-lg overflow-hidden border border-border">
                <div className="bg-secondary px-3 py-1.5 border-b border-border text-xs font-mono text-muted-foreground flex justify-between">
                  <span>{match[1]}</span>
                </div>
                <pre className="!bg-card !m-0 !p-4 overflow-x-auto">
                  <code className={`${className} !text-sm !font-mono text-foreground`} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            ) : (
              <code className="bg-secondary text-foreground px-1 py-0.5 rounded text-sm font-mono border border-border" {...props}>
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

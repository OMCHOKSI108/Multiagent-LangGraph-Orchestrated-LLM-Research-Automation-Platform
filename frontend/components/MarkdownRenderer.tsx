import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter',
});

interface MermaidProps {
  chart: string;
}

const MermaidDiagram: React.FC<MermaidProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);
  const id = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (ref.current) {
      mermaid.render(id.current, chart).then((result) => {
        if (ref.current) {
          ref.current.innerHTML = result.svg;
        }
      });
    }
  }, [chart]);

  return <div ref={ref} className="my-6 flex justify-center bg-gray-50 border border-gray-200 p-4 rounded-lg" />;
};

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(({ content }) => {
  return (
    <div className="prose prose-sm max-w-none text-gray-800 prose-headings:font-semibold prose-headings:text-gray-900 prose-a:text-blue-600 prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 prose-pre:text-gray-800 prose-blockquote:border-l-4 prose-blockquote:border-gray-200 prose-blockquote:text-gray-500">
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
              <div className="relative group my-4 rounded-lg overflow-hidden border border-gray-200">
                <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-200 text-xs font-mono text-gray-500 flex justify-between">
                    <span>{match[1]}</span>
                </div>
                <pre className="!bg-white !m-0 !p-4 overflow-x-auto">
                    <code className={`${className} !text-sm !font-mono text-gray-800`} {...props}>
                    {children}
                    </code>
                </pre>
              </div>
            ) : (
              <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm font-mono border border-gray-200" {...props}>
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
import React, { useState, useCallback } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';

interface MessageActionsProps {
  content: string;
  onRewrite?: () => void;
}

const CopyButton: React.FC<{ content: string }> = ({ content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  }, [content]);

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md transition-all duration-200
        text-zinc-400 hover:text-zinc-600 hover:bg-light-200
        dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-dark-200
        focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <Check className="w-4 h-4 text-emerald-500" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
};

const RewriteButton: React.FC<{ onRewrite: () => void }> = ({ onRewrite }) => {
  return (
    <button
      onClick={onRewrite}
      className="p-1.5 rounded-md transition-all duration-200
        text-zinc-400 hover:text-zinc-600 hover:bg-light-200
        dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-dark-200
        focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      aria-label="Rewrite response"
      title="Rewrite response"
    >
      <RefreshCw className="w-4 h-4" />
    </button>
  );
};

export const MessageActions: React.FC<MessageActionsProps> = ({ content, onRewrite }) => {
  return (
    <div className="flex items-center gap-1">
      <CopyButton content={content} />
      {onRewrite && <RewriteButton onRewrite={onRewrite} />}
    </div>
  );
};

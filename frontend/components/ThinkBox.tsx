import React, { useState, useEffect } from 'react';
import { Brain, ChevronDown } from 'lucide-react';

interface ThinkBoxProps {
  content: string;
  isThinking: boolean;
}

export const ThinkBox: React.FC<ThinkBoxProps> = ({ content, isThinking }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-expand when thinking starts, auto-collapse when it ends
  useEffect(() => {
    if (isThinking) {
      setIsExpanded(true);
    } else if (!isThinking && isExpanded) {
      // Small delay before collapsing so user can see the final state
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isThinking]);

  if (!content && !isThinking) {
    return null;
  }

  return (
    <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 overflow-hidden transition-all duration-300">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left
          hover:bg-purple-100/50 dark:hover:bg-purple-900/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain
            className={`w-4 h-4 text-purple-500 ${
              isThinking ? 'animate-pulse' : ''
            }`}
          />
          <span className="text-sm font-medium text-purple-800 dark:text-purple-300">
            Thinking Process
          </span>
          {isThinking && (
            <span className="inline-flex items-center gap-1 text-xs text-purple-500 dark:text-purple-400">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              Processing...
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-purple-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <div
            className="rounded-lg bg-white/60 dark:bg-dark-primary/40 border border-purple-100 dark:border-purple-900/30
              px-4 py-3 max-h-64 overflow-y-auto"
          >
            <pre className="text-sm font-mono text-purple-900 dark:text-purple-200 whitespace-pre-wrap break-words leading-relaxed">
              {content}
              {isThinking && (
                <span className="inline-block w-1.5 h-4 bg-purple-500 animate-pulse ml-0.5 align-text-bottom" />
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';

export const MessageBoxLoading: React.FC = () => {
  return (
    <div className="flex gap-3 py-4 px-4">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-card flex-shrink-0 flex items-center justify-center">
        <div className="w-3 h-3 rounded-full bg-muted-foreground animate-pulse" />
      </div>

      {/* Typing bubble with animated dots */}
      <div className="flex-1">
        <div className="inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-card/80 dark:bg-card text-foreground/80 dark:text-white shadow-sm">
          <div className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="inline-block w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="inline-block w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <div className="ml-3 text-sm text-muted-foreground">AI is thinking…</div>
        </div>

        {/* Optional shimmer lines for context */}
        <div className="mt-3 space-y-2">
          <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 w-11/12 animate-pulse" />
          <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 w-9/12 animate-pulse" />
        </div>
      </div>
    </div>
  );
};

'use client';

import React from 'react';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingScreen({ message = 'Loading...', fullScreen = false }: LoadingScreenProps) {
  const containerClass = fullScreen
    ? 'min-h-screen flex items-center justify-center'
    : 'flex items-center justify-center py-20';

  return (
    <div className={`${containerClass} bg-[var(--bg-primary)]`} role="status" aria-label={message}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--border-default)] border-t-[var(--accent-teal)] animate-spin" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-r-[var(--accent-blue)]/30 animate-spin" style={{ animationDuration: '1.5s' }} />
        </div>
        <p className="text-sm text-[var(--text-muted)] animate-pulse">{message}</p>
      </div>
    </div>
  );
}

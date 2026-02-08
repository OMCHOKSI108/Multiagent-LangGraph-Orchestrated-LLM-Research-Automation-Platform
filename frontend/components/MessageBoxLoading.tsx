import React from 'react';

export const MessageBoxLoading: React.FC = () => {
  return (
    <div className="flex gap-3 py-4 px-4 animate-fade-in">
      {/* Avatar skeleton */}
      <div className="w-8 h-8 rounded-full bg-light-200 dark:bg-dark-200 animate-pulse flex-shrink-0" />

      {/* Content skeleton */}
      <div className="flex-1 space-y-3 pt-1">
        <div
          className="h-3 rounded-full bg-light-200 dark:bg-dark-200 animate-pulse w-full"
          style={{ animationDelay: '0ms' }}
        />
        <div
          className="h-3 rounded-full bg-light-200 dark:bg-dark-200 animate-pulse w-9/12"
          style={{ animationDelay: '150ms' }}
        />
        <div
          className="h-3 rounded-full bg-light-200 dark:bg-dark-200 animate-pulse w-10/12"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  );
};

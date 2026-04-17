'use client';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {icon && (
        <div className="w-16 h-16 rounded-full bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-center mb-4 text-[var(--text-tertiary)]">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-[var(--text-tertiary)] max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}

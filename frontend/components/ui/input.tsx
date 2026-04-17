'use client';

import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, type = 'text', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'w-full px-4 py-2.5 rounded-lg border bg-[var(--input-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)]/30 focus:border-[var(--accent-teal)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-[var(--accent-rose)] focus:ring-[var(--accent-rose)]/30'
              : 'border-[var(--border-default)] hover:border-[var(--border-hover)]',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-xs text-[var(--accent-rose)]">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-[var(--text-tertiary)]">{helperText}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };

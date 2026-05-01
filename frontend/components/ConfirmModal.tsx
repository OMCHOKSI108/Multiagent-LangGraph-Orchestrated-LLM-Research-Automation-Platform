'use client';

import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
  }, [onCancel]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: 'bg-[var(--accent-rose)]/10 border-[var(--accent-rose)]/20',
      iconColor: 'text-[var(--accent-rose)]',
      confirmBtn: 'bg-[var(--accent-rose)] hover:bg-[var(--accent-rose)]/90 text-white',
    },
    warning: {
      iconBg: 'bg-[var(--accent-amber)]/10 border-[var(--accent-amber)]/20',
      iconColor: 'text-[var(--accent-amber)]',
      confirmBtn: 'bg-[var(--accent-amber)] hover:bg-[var(--accent-amber)]/90 text-[var(--bg-primary)]',
    },
    default: {
      iconBg: 'bg-[var(--accent-blue)]/10 border-[var(--accent-blue)]/20',
      iconColor: 'text-[var(--accent-blue)]',
      confirmBtn: 'btn-primary',
    },
  };

  const style = variantStyles[variant];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative surface-card max-w-md w-full p-6 animate-slide-up">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border ${style.iconBg}`}>
          {variant === 'danger' ? (
            <svg className={`w-6 h-6 ${style.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          ) : variant === 'warning' ? (
            <svg className={`w-6 h-6 ${style.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className={`w-6 h-6 ${style.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <h3 id="confirm-modal-title" className="text-lg font-semibold text-center mb-2 text-[var(--text-primary)]">
          {title}
        </h3>
        <p id="confirm-modal-desc" className="text-sm text-center text-[var(--text-muted)] mb-6">
          {description}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="btn-ghost px-6"
            aria-label={cancelLabel}
            autoFocus
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 ${style.confirmBtn}`}
            aria-label={confirmLabel}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

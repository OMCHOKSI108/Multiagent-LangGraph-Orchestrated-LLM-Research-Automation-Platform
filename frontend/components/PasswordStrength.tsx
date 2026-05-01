'use client';

import React from 'react';

interface PasswordStrengthProps {
  password: string;
}

interface StrengthResult {
  score: number;
  label: string;
  color: string;
  bgColor: string;
  criteria: { label: string; met: boolean }[];
}

function evaluatePassword(password: string): StrengthResult {
  const criteria = [
    { label: 'At least 6 characters', met: password.length >= 6 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Contains number', met: /[0-9]/.test(password) },
    { label: 'Contains special character', met: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password) },
  ];

  const metCount = criteria.filter(c => c.met).length;
  const score = Math.min(metCount, 4);

  const levels = [
    { label: 'Very Weak', color: 'text-[var(--accent-rose)]', bgColor: 'bg-[var(--accent-rose)]' },
    { label: 'Weak', color: 'text-[var(--accent-rose)]', bgColor: 'bg-[var(--accent-rose)]' },
    { label: 'Fair', color: 'text-[var(--accent-amber)]', bgColor: 'bg-[var(--accent-amber)]' },
    { label: 'Good', color: 'text-[var(--accent-emerald)]', bgColor: 'bg-[var(--accent-emerald)]' },
    { label: 'Strong', color: 'text-[var(--accent-emerald)]', bgColor: 'bg-[var(--accent-emerald)]' },
  ];

  const level = levels[score];

  return {
    score,
    label: password.length === 0 ? '' : level.label,
    color: level.color,
    bgColor: level.bgColor,
    criteria,
  };
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const strength = evaluatePassword(password);

  return (
    <div className="mt-2" role="status" aria-label={`Password strength: ${strength.label}`}>
      <div className="flex gap-1 mb-2">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < strength.score ? strength.bgColor : 'bg-[var(--border-default)]'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium ${strength.color}`}>{strength.label}</span>
        <span className="text-[10px] text-[var(--text-tertiary)]">{strength.criteria.filter(c => c.met).length}/{strength.criteria.length}</span>
      </div>
      <ul className="space-y-1">
        {strength.criteria.map((c, i) => (
          <li key={i} className={`text-[10px] flex items-center gap-1.5 ${c.met ? 'text-[var(--accent-emerald)]' : 'text-[var(--text-tertiary)]'}`}>
            {c.met ? (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

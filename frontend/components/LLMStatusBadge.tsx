import React, { useEffect, useRef, useState } from 'react';
import { useResearchStore } from '../store';

/**
 * LLMStatusBadge - Displays the current LLM mode (OFFLINE/ONLINE)
 *
 * Shows a color-coded badge:
 *   🔵 OFFLINE (Ollama)  — blue indicator
 *   🟢 ONLINE  (Groq)    — green indicator
 *
 * Hover tooltip shows provider details (model, key count, etc.).
 * Auto-refreshes every 30 seconds.
 */
export const LLMStatusBadge: React.FC = () => {
    const { llmStatus, llmStatusLoading, fetchLLMStatus, isAuthenticated } = useResearchStore();
    const [showTooltip, setShowTooltip] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!isAuthenticated) return;
        fetchLLMStatus();
        intervalRef.current = setInterval(fetchLLMStatus, 30_000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchLLMStatus, isAuthenticated]);

    const isOnline = llmStatus?.mode === 'ONLINE';
    const providerName = llmStatus?.provider?.provider || 'unknown';
    const modelName = llmStatus?.provider?.model || 'unknown';

    return (
        <div
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            {/* Badge */}
            <button
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    border: '1px solid',
                    borderColor: isOnline ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)',
                    background: isOnline
                        ? 'rgba(34, 197, 94, 0.08)'
                        : 'rgba(59, 130, 246, 0.08)',
                    color: isOnline ? '#22c55e' : '#3b82f6',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    cursor: 'default',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease',
                }}
                aria-label={`LLM Mode: ${llmStatus?.mode || 'Loading'}`}
            >
                {/* Pulsing dot */}
                <span
                    style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: isOnline ? '#22c55e' : '#3b82f6',
                        boxShadow: isOnline
                            ? '0 0 6px rgba(34, 197, 94, 0.6)'
                            : '0 0 6px rgba(59, 130, 246, 0.6)',
                        animation: llmStatusLoading ? 'pulse 1.5s infinite' : 'none',
                    }}
                />
                {llmStatusLoading && !llmStatus
                    ? '...'
                    : isOnline
                        ? 'ONLINE'
                        : 'OFFLINE'}
            </button>

            {/* Tooltip */}
            {showTooltip && llmStatus && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        minWidth: '220px',
                        padding: '12px',
                        borderRadius: '8px',
                        background: 'rgba(15, 15, 25, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(12px)',
                        color: '#e2e8f0',
                        fontSize: '12px',
                        lineHeight: '1.6',
                        zIndex: 9999,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}
                >
                    <div style={{ fontWeight: 700, marginBottom: '8px', color: '#f8fafc', fontSize: '13px' }}>
                        LLM Provider Status
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#94a3b8' }}>Mode</span>
                        <span style={{ color: isOnline ? '#22c55e' : '#3b82f6', fontWeight: 600 }}>
                            {llmStatus.mode}
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#94a3b8' }}>Provider</span>
                        <span>{providerName}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#94a3b8' }}>Model</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{modelName}</span>
                    </div>

                    {llmStatus.provider?.total_keys && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#94a3b8' }}>API Keys</span>
                            <span>{llmStatus.provider.total_keys} configured</span>
                        </div>
                    )}

                    <div style={{
                        marginTop: '8px',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}>
                        <span
                            style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: llmStatus.provider?.available ? '#22c55e' : '#ef4444',
                            }}
                        />
                        <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                            {llmStatus.provider?.available ? 'Provider is reachable' : 'Provider unavailable'}
                        </span>
                    </div>
                </div>
            )}

            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
        </div>
    );
};

export default LLMStatusBadge;

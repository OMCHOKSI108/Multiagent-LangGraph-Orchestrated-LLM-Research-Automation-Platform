'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/components/ToastProvider';

interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryableStatuses?: number[];
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 8000,
  retryableStatuses: [429, 500, 502, 503, 504],
  onRetry: () => {},
};

function isRetryableError(error: Error & { status?: number }, config: Required<RetryConfig>): boolean {
  if (error.status && config.retryableStatuses.includes(error.status)) return true;
  if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('offline')) return true;
  return false;
}

function calculateDelay(attempt: number, config: Required<RetryConfig>): number {
  const delay = config.baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 500;
  return Math.min(delay + jitter, config.maxDelay);
}

export function useApiRetry(config?: RetryConfig) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { addToast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<T> => {
    let lastError: Error & { status?: number } | null = null;

    for (let attempt = 1; attempt <= mergedConfig.maxRetries + 1; attempt++) {
      try {
        const result = await operation();
        if (attempt > 1) {
          setIsRetrying(false);
          setRetryCount(0);
        }
        return result;
      } catch (err) {
        const error = err as Error & { status?: number };
        lastError = error;

        if (attempt <= mergedConfig.maxRetries && isRetryableError(error, mergedConfig)) {
          setIsRetrying(true);
          setRetryCount(attempt);
          mergedConfig.onRetry(attempt, error);

          const delay = calculateDelay(attempt, mergedConfig);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          break;
        }
      }
    }

    setIsRetrying(false);
    setRetryCount(0);

    if (lastError) {
      const friendlyMsg = getNetworkErrorMessage(lastError);
      if (operationName) {
        addToast(`${operationName}: ${friendlyMsg}`, 'error');
      }
      throw new Error(friendlyMsg);
    }

    throw new Error('Operation failed');
  }, [mergedConfig, addToast]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsRetrying(false);
    setRetryCount(0);
  }, []);

  useEffect(() => {
    return () => cancel();
  }, [cancel]);

  return { executeWithRetry, isRetrying, retryCount, cancel };
}

function getNetworkErrorMessage(error: Error & { status?: number }): string {
  if (error.status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (error.status === 500) return 'Server error. Please try again later.';
  if (error.status === 502 || error.status === 503 || error.status === 504) return 'Service temporarily unavailable. Please try again.';
  if (error.message?.includes('fetch') || error.message?.includes('network')) return 'Network connection lost. Please check your connection.';
  if (error.message?.includes('offline')) return 'You appear to be offline.';
  return error.message || 'An unexpected error occurred.';
}

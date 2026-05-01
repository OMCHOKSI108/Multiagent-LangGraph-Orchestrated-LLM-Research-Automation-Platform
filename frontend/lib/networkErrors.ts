'use client';

const NETWORK_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Session expired. Please log in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  408: 'Request timed out. Please try again.',
  429: 'Too many requests. Please wait a moment.',
  500: 'Server error. Please try again later.',
  502: 'Service temporarily unavailable.',
  503: 'Service under maintenance. Please try again later.',
  504: 'Gateway timeout. Please try again.',
};

export function getNetworkErrorMessage(error: Error & { status?: number }): string {
  if (error.status && error.status in NETWORK_ERROR_MESSAGES) {
    return NETWORK_ERROR_MESSAGES[error.status];
  }

  if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || error.message?.includes('network')) {
    return 'Network connection lost. Please check your connection and try again.';
  }

  if (error.message?.includes('offline')) {
    return 'You appear to be offline. Please reconnect and try again.';
  }

  if (error.name === 'AbortError') {
    return 'Request was cancelled.';
  }

  return error.message || 'An unexpected error occurred.';
}

export function isNetworkError(error: Error & { status?: number }): boolean {
  if (error.status === undefined && error.message) {
    return (
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('network') ||
      error.message.includes('offline')
    );
  }
  return false;
}

export function isRetryableError(error: Error & { status?: number }): boolean {
  const retryableStatuses = [429, 500, 502, 503, 504];
  if (error.status && retryableStatuses.includes(error.status)) return true;
  if (isNetworkError(error)) return true;
  return false;
}

export function shouldLogoutOnError(error: Error & { status?: number }): boolean {
  return error.status === 401 || error.status === 403;
}

import React from 'react';

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: unknown, info: React.ErrorInfo) => void;
};

type State = {
  hasError: boolean;
  error?: unknown;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Unhandled UI error', error, info);
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The UI hit an unexpected error. Refresh the page to continue.
            </p>
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Error Details
              </summary>
              <pre className="mt-2 text-xs bg-card p-2 rounded border overflow-auto max-h-32">
                {this.state.error instanceof Error 
                  ? this.state.error.message 
                  : String(this.state.error)}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

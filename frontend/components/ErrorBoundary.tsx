import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-lg p-6 md:p-8 text-center animate-fade-in">
                        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                        </div>

                        <h1 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h1>
                        <p className="text-sm text-muted-foreground mb-6">
                            The application encountered an unexpected error. Our team has been notified.
                        </p>

                        <div className="bg-muted/50 rounded-lg p-3 mb-6 text-left overflow-hidden">
                            <code className="text-xs font-mono text-red-500 break-words">
                                {this.state.error?.message || 'Unknown error occurred'}
                            </code>
                        </div>

                        <div className="flex gap-3 justify-center">
                            <Button
                                variant="outline"
                                onClick={() => window.location.href = '/'}
                                className="gap-2"
                            >
                                <Home className="w-4 h-4" />
                                Home
                            </Button>
                            <Button
                                onClick={() => window.location.reload()}
                                className="gap-2"
                            >
                                <RefreshCcw className="w-4 h-4" />
                                Reload
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary Component
 * Catches React component errors and displays fallback UI
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary]', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        this.props.onReset?.();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return typeof this.props.fallback === 'function'
                    ? this.props.fallback({ error: this.state.error, reset: this.handleReset })
                    : this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
                    <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                        {this.props.title || 'Something went wrong'}
                    </h3>
                    <p className="text-xs text-red-600 dark:text-red-400 mb-4 text-center max-w-md">
                        {this.props.message || this.state.error?.message || 'An unexpected error occurred'}
                    </p>
                    {this.props.showReset && (
                        <button
                            onClick={this.handleReset}
                            className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Try Again
                        </button>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Async Error Handler for components with async state updates
 */
export class AsyncErrorBoundary extends React.Component {
    state = { error: null };

    static getDerivedStateFromError(error) {
        return { error };
    }

    render() {
        if (this.state.error) {
            return this.props.fallback?.(this.state.error) || (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-center">
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {this.state.error.message || 'An error occurred'}
                    </p>
                    <button
                        onClick={() => this.setState({ error: null })}
                        className="mt-2 px-3 py-1 text-xs bg-red-100 dark:bg-red-800 rounded"
                    >
                        Retry
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

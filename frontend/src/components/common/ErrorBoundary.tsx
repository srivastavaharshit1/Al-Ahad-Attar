import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="mx-auto my-8 max-w-lg rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
            <span className="material-symbols-outlined text-2xl">error</span>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-red-950">
            {this.props.fallbackTitle || 'Unable to display this view'}
          </h2>
          <p className="mt-2 text-sm text-red-800">
            An unexpected error occurred while rendering this interface.
          </p>
          {this.state.error?.message && (
            <p className="mt-3 rounded-lg bg-red-100/80 p-2.5 font-mono text-xs text-red-900 break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.reload();
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Reload view
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

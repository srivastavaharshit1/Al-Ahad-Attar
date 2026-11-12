import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  title?: string;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center p-6 text-center">
          <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-sm md:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              {this.props.title || 'Something went wrong'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              An unexpected error occurred while rendering this section. You can try refreshing the page or reloading this component.
            </p>

            {this.props.showDetails && this.state.error && (
              <details className="mt-4 rounded-lg bg-slate-50 p-3 text-left text-xs text-slate-700">
                <summary className="cursor-pointer font-medium text-slate-600 hover:text-slate-900">
                  Technical error details (Admin only)
                </summary>
                <div className="mt-2 overflow-auto max-h-48 font-mono text-[11px] text-red-600">
                  <p className="font-semibold">{this.state.error.toString()}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-2 whitespace-pre-wrap text-slate-500">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Reload page
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Home className="h-4 w-4" />
                Return to store
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

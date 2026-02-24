import React, { Component, ErrorInfo, ReactNode } from 'react';
import { showToast } from './Toast';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** 
   * If true, shows a minimal inline error instead of full-page error
   * Use for non-critical sections of the app
   */
  inline?: boolean;
  /** Section name for better error reporting */
  section?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Enhanced Error Boundary Component
 * 
 * Usage:
 * - Wrap critical sections with <ErrorBoundary section="PayrollCard">
 * - For non-critical sections, use inline={true}
 * - Provides automatic toast notifications on errors
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log error for debugging
    console.error(`[ErrorBoundary${this.props.section ? `: ${this.props.section}` : ''}]`, error, errorInfo);
    
    // Show toast notification
    showToast.error(
      `Erro em ${this.props.section || 'um componente'}`,
      error.message
    );
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Future: Send to error tracking service (Sentry, etc.)
    // logErrorToService(error, errorInfo, this.props.section);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleClearCache = (): void => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Inline error (for non-critical sections)
      if (this.props.inline) {
        return (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-red-800">
                  Erro ao carregar {this.props.section || 'esta seção'}
                </h4>
                <p className="text-xs text-red-600 mt-1 truncate">
                  {this.state.error?.message || 'Erro desconhecido'}
                </p>
                <button
                  onClick={this.handleRetry}
                  className="mt-2 text-xs font-medium text-red-700 hover:text-red-800 underline"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Full-page error (for critical errors)
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-gradient-to-br from-red-50 to-orange-50 p-8 rounded-2xl">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border border-red-100">
            {/* Error Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="w-8 h-8 text-red-600" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2}
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
            
            {/* Error Message */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Opa! Algo deu errado
            </h1>
            <p className="text-gray-600 mb-6 text-sm text-center leading-relaxed">
              {this.props.section 
                ? `Ocorreu um erro ao carregar "${this.props.section}".`
                : 'O aplicativo encontrou um erro inesperado.'
              }
              <br />
              Tente uma das opções abaixo.
            </p>

            {/* Error Details */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                <span>🔍</span> Detalhe Técnico
              </p>
              <code className="text-xs text-red-600 font-mono break-all block bg-white p-2 rounded border">
                {this.state.error?.message || 'Erro desconhecido'}
              </code>
              {this.state.error?.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                    Ver stack trace
                  </summary>
                  <pre className="text-[10px] text-gray-500 font-mono mt-2 overflow-auto max-h-32 bg-white p-2 rounded">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center gap-2"
              >
                <span>🔄</span> Tentar Novamente
              </button>
              
              <button
                onClick={this.handleReload}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
              >
                <span>↻</span> Recarregar Página
              </button>
            </div>

            {/* Advanced Options */}
            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <p className="text-[10px] text-gray-400 mb-2">
                Se o problema persistir, tente limpar o cache:
              </p>
              <button
                onClick={this.handleClearCache}
                className="text-[11px] text-red-400 hover:text-red-600 underline transition-colors"
              >
                🗑️ Limpar cache local e recarregar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap components with ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: { section?: string; inline?: boolean }
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary section={options?.section || displayName} inline={options?.inline}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );
  
  WithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  return WithErrorBoundary;
}

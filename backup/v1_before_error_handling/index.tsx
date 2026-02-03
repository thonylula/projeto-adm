import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-8 text-center font-sans">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border border-red-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Opa! Algo deu errado.</h1>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              O aplicativo encontrou um erro inesperado ao carregar os dados.
              Tente atualizar a página ou verificar sua conexão com o banco de dados.
            </p>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-6 text-left overflow-hidden">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Detalhe Técnico:</p>
              <code className="text-xs text-red-500 font-mono break-all block">
                {this.state.error?.message || "Erro desconhecido"}
              </code>
            </div>

            <button
              onClick={() => {
                window.location.reload();
              }}
              className="w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center gap-2"
            >
              🔄 Recarregar Sistema
            </button>
            <p className="mt-4 text-[10px] text-gray-400">
              Se o problema persistir, entre em contato com o administrador.
            </p>
            <button
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              className="mt-2 text-[9px] text-gray-300 hover:text-red-300 underline"
            >
              Limpar cache local (avançado)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
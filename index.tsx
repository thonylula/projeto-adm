import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider, showToast } from './components/shared';
import { ErrorBoundary } from './components/shared';

/**
 * Root Error Boundary
 * Catches any unhandled errors at the top level
 */
const RootErrorFallback = (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-8 text-center font-sans">
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border border-red-100">
      <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-10 h-10 text-red-600" 
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
      
      <h1 className="text-2xl font-bold text-gray-900 mb-3">
        Sistema Indisponível
      </h1>
      <p className="text-gray-600 mb-6 text-sm leading-relaxed">
        O aplicativo encontrou um erro crítico e não pode continuar.
        <br />
        Por favor, tente recarregar a página.
      </p>

      <div className="space-y-3">
        <button
          onClick={() => window.location.reload()}
          className="w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center gap-2"
        >
          🔄 Recarregar Sistema
        </button>
        
        <button
          onClick={() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
          }}
          className="w-full px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
        >
          🗑️ Limpar Cache e Recarregar
        </button>
      </div>

      <p className="mt-6 text-[10px] text-gray-400">
        Se o problema persistir, entre em contato com o administrador do sistema.
      </p>
    </div>
  </div>
);

/**
 * Global error handler for unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
  
  // Show user-friendly toast
  showToast.error(
    'Erro de conexão',
    event.reason?.message || 'Falha ao processar requisição'
  );
  
  // Prevent default browser behavior
  event.preventDefault();
});

/**
 * Global error handler for uncaught exceptions
 */
window.addEventListener('error', (event) => {
  // Ignore ResizeObserver errors (common and usually harmless)
  if (event.message?.includes('ResizeObserver')) {
    event.preventDefault();
    return;
  }
  
  console.error('[Uncaught Error]', event.error);
  
  showToast.error(
    'Erro inesperado',
    event.message || 'Ocorreu um erro no sistema'
  );
});

// Mount the app
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary section="Sistema ADM" fallback={RootErrorFallback}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

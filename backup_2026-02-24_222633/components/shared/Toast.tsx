import React from 'react';
import { Toaster, toast } from 'react-hot-toast';

/**
 * Toast Provider Component
 * Provides global toast notifications throughout the app
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        gutter={8}
        containerStyle={{
          top: 20,
          right: 20,
        }}
        toastOptions={{
          // Default options for all toasts
          duration: 4000,
          style: {
            background: '#fff',
            color: '#1E293B',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
            fontSize: '14px',
            fontWeight: 500,
            maxWidth: '400px',
          },
          // Specific options by type
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
            style: {
              border: '1px solid #D1FAE5',
              background: '#ECFDF5',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
            style: {
              border: '1px solid #FEE2E2',
              background: '#FEF2F2',
            },
          },
          loading: {
            duration: Infinity,
            iconTheme: {
              primary: '#6366F1',
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  );
};

/**
 * Toast utility functions
 * Import these to show toasts anywhere in the app
 */
export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      icon: '✅',
    });
  },
  
  error: (message: string, details?: string) => {
    toast.error(
      <div>
        <p className="font-semibold">{message}</p>
        {details && <p className="text-xs mt-1 opacity-75">{details}</p>}
      </div>,
      {
        icon: '❌',
        duration: 6000,
      }
    );
  },
  
  warning: (message: string) => {
    toast(message, {
      icon: '⚠️',
      style: {
        border: '1px solid #FEF3C7',
        background: '#FFFBEB',
      },
      duration: 4000,
    });
  },
  
  info: (message: string) => {
    toast(message, {
      icon: 'ℹ️',
      style: {
        border: '1px solid #DBEAFE',
        background: '#EFF6FF',
      },
    });
  },
  
  loading: (message: string) => {
    return toast.loading(message, {
      icon: '⏳',
    });
  },
  
  dismiss: (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },
  
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, messages, {
      loading: {
        icon: '⏳',
      },
      success: {
        icon: '✅',
        duration: 3000,
      },
      error: {
        icon: '❌',
        duration: 5000,
      },
    });
  },
};

// Re-export toast for advanced usage
export { toast };

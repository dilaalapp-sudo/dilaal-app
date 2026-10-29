import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

/**
 * Lightweight toast notifications for the Admin Panel.
 * Success / error toasts auto-dismiss; used after destructive or mutating
 * admin actions so operators get immediate, unambiguous feedback.
 */

export type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (kind: ToastKind, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextIdRef = useRef(1);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextIdRef.current++;
      setToasts((prev) => [...prev.slice(-2), { id, kind, message }]);
      window.setTimeout(() => remove(id), kind === 'error' ? 6000 : 3500);
    },
    [remove]
  );

  const success = useCallback((message: string) => toast('success', message), [toast]);
  const error = useCallback((message: string) => toast('error', message), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      {/* Toast viewport */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => remove(t.id)}
            className={`flex items-start gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm cursor-pointer transition-all ${
              t.kind === 'success'
                ? 'bg-success-container text-on-success-container border-success/30'
                : t.kind === 'error'
                  ? 'bg-error-container text-on-error-container border-error/30'
                  : 'bg-surface-container border-outline-variant/40 text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-lg mt-0.5">
              {t.kind === 'success' ? 'check_circle' : t.kind === 'error' ? 'error' : 'info'}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
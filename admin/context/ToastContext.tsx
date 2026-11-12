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
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-xl shadow-[var(--shadow-lg)] border text-sm animate-in slide-in-from-bottom-2 fade-in backdrop-blur-sm ${
              t.kind === 'success'
                ? 'bg-success-container/95 text-on-success-container border-success/20'
                : t.kind === 'error'
                  ? 'bg-error-container/95 text-on-error-container border-error/20'
                  : 'bg-surface-container-lowest/95 border-outline-variant/30 text-on-surface'
            }`}
            style={{ animationDuration: '200ms' }}
          >
            <span
              className="material-symbols-outlined text-[20px] mt-0.5 shrink-0"
              aria-hidden="true"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {t.kind === 'success' ? 'check_circle' : t.kind === 'error' ? 'error' : 'info'}
            </span>
            <span className="flex-1 font-medium leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => remove(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 p-0.5 -mr-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-current/40"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
            </button>
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
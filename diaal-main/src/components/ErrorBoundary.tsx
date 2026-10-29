import React from 'react';

interface BoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[DILAAL] Unhandled UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-surface p-6 text-on-surface">
        <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center">
          <span className="material-symbols-outlined">error</span>
        </div>
        <h1 className="text-base font-bold">Something went wrong</h1>
        <p className="text-xs text-on-surface-variant text-center max-w-xs leading-relaxed">
          This screen crashed. Reloading usually fixes it — your saved data is kept.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2.5 rounded-full bg-primary text-on-primary text-xs font-bold cursor-pointer"
        >
          Reload
        </button>
      </div>
    );
  }
}

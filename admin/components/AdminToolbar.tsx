import React from 'react';

/** Shared toolbar tokens: stacked + full-width on phones, one row from `sm` up. */
export const toolbarClass = 'flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center';

export const toolbarSearchClass =
  'w-full sm:w-72 px-3.5 py-2.5 pl-10 text-sm rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-outline/70 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-shadow shadow-[var(--shadow-xs)]';

export const toolbarSelectClass =
  'w-full sm:w-auto px-3.5 py-2.5 text-sm rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-shadow shadow-[var(--shadow-xs)] cursor-pointer';

export const toolbarButtonClass =
  'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-on-primary hover:bg-primary/90 active:scale-[0.98] transition-all whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none shadow-[var(--shadow-sm)] focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

export const toolbarSecondaryButtonClass =
  'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-on-surface active:scale-[0.98] transition-all whitespace-nowrap disabled:opacity-50 shadow-[var(--shadow-xs)] focus-visible:ring-2 focus-visible:ring-primary/40';

export const rowButtonClass =
  'inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container hover:text-on-surface hover:border-outline-variant/50 transition-all whitespace-nowrap disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-primary/40';

export const rowButtonDangerClass =
  'inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-error/10 text-error hover:bg-error hover:text-on-error transition-all whitespace-nowrap disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-error/40';

export const rowButtonSuccessClass =
  'inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-success/10 text-success hover:bg-success hover:text-on-success transition-all whitespace-nowrap disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-success/40';

export const AdminToolbar: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`${toolbarClass} ${className}`}>{children}</div>;

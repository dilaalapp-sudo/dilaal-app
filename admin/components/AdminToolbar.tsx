import React from 'react';

/** Shared toolbar tokens: stacked + full-width on phones, one row from `sm` up. */
export const toolbarClass = 'flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center';

export const toolbarSearchClass =
  'w-full sm:w-64 px-3 py-2.5 text-sm rounded-xl border border-outline-variant/40 bg-surface text-on-surface outline-none focus:ring-2 focus:ring-primary/50';

export const toolbarSelectClass =
  'w-full sm:w-auto px-3 py-2.5 text-sm rounded-xl border border-outline-variant/40 bg-surface text-on-surface outline-none focus:ring-2 focus:ring-primary/50';

export const toolbarButtonClass =
  'w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-bold bg-primary text-on-primary hover:opacity-90 transition-opacity whitespace-nowrap disabled:opacity-50';

export const toolbarSecondaryButtonClass =
  'w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-bold border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high whitespace-nowrap disabled:opacity-50';

/** Compact action button used inside table rows and mobile cards. */
export const rowButtonClass =
  'px-2.5 py-1.5 text-[10px] font-bold rounded-lg border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high whitespace-nowrap disabled:opacity-40';

export const rowButtonDangerClass =
  'px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-error text-on-error hover:opacity-90 whitespace-nowrap disabled:opacity-40';

export const rowButtonSuccessClass =
  'px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-success text-on-success hover:opacity-90 whitespace-nowrap disabled:opacity-40';

export const AdminToolbar: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`${toolbarClass} ${className}`}>{children}</div>;

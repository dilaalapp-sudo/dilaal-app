import React from 'react';

export interface AdminColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  /** Omit from the mobile card body — use when the value is already shown in the first column. */
  hideOnCard?: boolean;
  className?: string;
}

interface AdminDataTableProps<T> {
  columns: AdminColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
  className?: string;
  rowKey?: keyof T | string;
  /** Row actions — last table column on desktop, full-width footer on mobile cards. */
  actions?: (row: T) => React.ReactNode;
  /** Rendered under the table (pagination). */
  footer?: React.ReactNode;
  minWidth?: string;
  /** Tighter rows for log-style tables. */
  dense?: boolean;
}

/**
 * The single table used across the admin panel. Desktop renders a real table
 * inside a horizontal scroller; below `md` the same data renders as stacked
 * cards so row actions are always reachable on a phone.
 */
export const AdminDataTable = <T,>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  emptyIcon = 'inbox',
  className = '',
  rowKey = 'id',
  actions,
  footer,
  minWidth = '720px',
  dense = false,
}: AdminDataTableProps<T>) => {
  if (loading) {
    return (
      <div className={`bg-surface-container rounded-2xl border border-outline-variant/25 p-4 space-y-3 ${className}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-11 animate-shimmer rounded-xl bg-surface-container-high"
            style={{ width: `${100 - i * 9}%` }}
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`bg-surface-container rounded-2xl border border-outline-variant/25 p-10 text-center ${className}`}>
        <span className="material-symbols-outlined text-[32px] text-outline/50 mb-2 block">{emptyIcon}</span>
        <p className="text-sm text-outline">{emptyMessage}</p>
      </div>
    );
  }

  const [primary, ...rest] = columns;
  const cardMeta = rest.filter((c) => !c.hideOnCard);

  return (
    <div className={`bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden shadow-[var(--shadow-xs)] ${className}`}>
      {/* Mobile: cards */}
      <div className="md:hidden divide-y divide-outline-variant/10" role="list" aria-label="Data records">
        {data.map((row, i) => (
          <article key={String((row as any)[rowKey] ?? i)} className="p-4 space-y-3 hover:bg-surface-container/40 transition-colors" role="listitem">
            <div className="text-sm text-on-surface font-medium">
              {primary.render ? primary.render(row) : (row as any)[primary.key]}
            </div>
            {cardMeta.length > 0 && (
              <dl className="space-y-2">
                {cardMeta.map((col) => (
                  <div key={col.key} className="flex items-start justify-between gap-3">
                    <dt className="text-[10px] font-bold text-outline uppercase tracking-wider leading-5 shrink-0">
                      {col.label}
                    </dt>
                    <dd className="text-xs text-on-surface text-right min-w-0 m-0">
                      {col.render ? col.render(row) : (row as any)[col.key]}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {actions && <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label="Row actions">{actions(row)}</div>}
          </article>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse" style={{ minWidth }}>
          <caption className="sr-only">{emptyMessage === 'No data available' ? 'Data table' : emptyMessage}</caption>
          <thead>
            <tr className="bg-surface-container/60 border-b border-outline-variant/15">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 ${dense ? 'py-2.5' : 'py-3.5'} text-[10px] font-bold text-on-surface-variant uppercase tracking-widest whitespace-nowrap`}
                >
                  {col.label}
                </th>
              ))}
              {actions && (
                <th scope="col" className={`px-4 ${dense ? 'py-2.5' : 'py-3.5'} text-[10px] font-bold text-on-surface-variant uppercase tracking-widest whitespace-nowrap`}>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {data.map((row, i) => (
              <tr
                key={String((row as any)[rowKey] ?? i)}
                className="group hover:bg-primary/[0.03] transition-colors duration-150 focus-within:bg-primary/[0.04]"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 ${dense ? 'py-2.5' : 'py-3.5'} text-sm text-on-surface align-middle ${col.className ?? ''}`}
                  >
                    {col.render ? col.render(row) : (row as any)[col.key]}
                  </td>
                ))}
                {actions && (
                  <td className={`px-4 ${dense ? 'py-2.5' : 'py-3.5'} align-middle`}>
                    <div className="flex items-center gap-1.5 whitespace-nowrap opacity-90 group-hover:opacity-100 transition-opacity">{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {footer}
    </div>
  );
};

import React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  busy?: boolean;
}

/** Server-driven pagination control shared by all list screens. */
export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, total, onPageChange, busy }) => {
  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant/15 text-xs text-on-surface-variant">
        <span className="font-medium">{total} record{total === 1 ? '' : 's'}</span>
      </div>
    );
  }
  return (
    <nav className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-outline-variant/15" aria-label="Pagination">
      <span className="text-xs text-on-surface-variant font-medium">
        Page <span className="text-on-surface tabular-nums">{page}</span> of <span className="text-on-surface tabular-nums">{totalPages}</span>
        <span className="hidden sm:inline"> · {total} records</span>
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || busy}
          aria-label="Previous page"
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container hover:text-on-surface hover:border-outline-variant/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">chevron_left</span>
          Prev
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || busy}
          aria-label="Next page"
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container hover:text-on-surface hover:border-outline-variant/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          Next
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">chevron_right</span>
        </button>
      </div>
    </nav>
  );
};
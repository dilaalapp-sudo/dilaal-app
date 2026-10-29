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
      <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant/15 text-xs text-outline">
        <span>{total} record{total === 1 ? '' : 's'}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant/15">
      <span className="text-xs text-outline">
        Page {page} of {totalPages} · {total} records
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || busy}
          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Prev
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || busy}
          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>
    </div>
  );
};
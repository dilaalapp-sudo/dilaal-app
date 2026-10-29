import React, { useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { AdminDataTable } from '../components/AdminDataTable';
import {
  toolbarClass,
  toolbarSearchClass,
  toolbarSelectClass,
  rowButtonClass,
  rowButtonDangerClass,
} from '../components/AdminToolbar';
import { adminJson, adminFetch, apiErrorMessage } from '../lib/adminApi';
import { useToast } from '../context/ToastContext';

interface ListingRow {
  id: string;
  title: string;
  category: string;
  moderationStatus: string;
  price: number;
  currency: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string | null;
  createdAt: string;
  reportsCount: number;
}

interface ListingsResponse {
  listings: ListingRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type ModerationAction = 'approve' | 'reject' | 'flag' | 'remove';

const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'under_review', label: 'Under review' },
  { value: 'published', label: 'Published' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'removed', label: 'Removed' },
];

const ACTION_META: Record<ModerationAction, { label: string; danger: boolean; reasonRequired: boolean }> = {
  approve: { label: 'Approve & Publish', danger: false, reasonRequired: false },
  reject: { label: 'Reject', danger: true, reasonRequired: true },
  flag: { label: 'Flag for Review', danger: true, reasonRequired: false },
  remove: { label: 'Remove', danger: true, reasonRequired: true },
};

export const AdminListingsScreen: React.FC<{ onOpenDetail?: (id: string) => void }> = ({ onOpenDetail }) => {
  const toast = useToast();
  const [data, setData] = useState<ListingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters + pagination (server-driven)
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Moderation dialog state
  const [pending, setPending] = useState<{ listing: ListingRow; action: ModerationAction } | null>(null);
  const [reason, setReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<ListingRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      setData(await adminJson<ListingsResponse>(`/api/admin/listings?${params}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listings.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to page 1 when filters change.
  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const openAction = (listing: ListingRow, action: ModerationAction) => {
    setPending({ listing, action });
    setReason('');
    setActionError(null);
  };

  const confirmAction = async () => {
    if (!pending) return;
    const { listing, action } = pending;
    if (ACTION_META[action].reasonRequired && !reason.trim()) {
      setActionError('A reason is required for this action.');
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await adminFetch(`/api/admin/listings/${listing.id}/moderate`, {
        method: 'POST',
        body: JSON.stringify({ action, reason: reason.trim() || undefined }),
      });
      if (!res.ok) throw new Error(await apiErrorMessage(res, 'Moderation failed.'));
      toast.success(`Listing ${action}d: "${listing.title}"`);
      setPending(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Moderation failed.');
    } finally {
      setActionBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActionBusy(true);
    setDeleteError(null);
    try {
      const res = await adminFetch(`/api/admin/listings/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await apiErrorMessage(res, 'Delete failed.'));
      toast.success(`Deleted "${deleteTarget.title}".`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={toolbarClass}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search listings by title…"
          aria-label="Search listings"
          className={toolbarSearchClass}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by moderation status"
          className={toolbarSelectClass}
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-error-container/20 border border-error/30 text-sm text-error">
          <span className="material-symbols-outlined text-lg">error</span>
          {error}
        </div>
      )}

      <AdminDataTable
        data={data?.listings ?? []}
        loading={loading}
        minWidth="780px"
        emptyMessage="No listings match your filters."
        columns={[
          {
            key: 'listing',
            label: 'Listing',
            render: (l: ListingRow) => (
              <div className="max-w-[240px]">
                <p className="text-sm font-semibold text-on-surface truncate">{l.title}</p>
                <p className="text-[10px] text-outline capitalize">{l.category}</p>
              </div>
            ),
          },
          {
            key: 'owner',
            label: 'Owner',
            render: (l: ListingRow) => <span className="text-xs text-on-surface-variant">{l.ownerName}</span>,
          },
          {
            key: 'price',
            label: 'Price',
            render: (l: ListingRow) => (
              <span className="text-xs text-on-surface-variant whitespace-nowrap">
                {l.price?.toLocaleString?.() ?? l.price} {l.currency}
              </span>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (l: ListingRow) => <StatusBadge status={l.moderationStatus} />,
          },
          {
            key: 'reports',
            label: 'Reports',
            render: (l: ListingRow) => <span className="text-xs">{l.reportsCount ?? 0}</span>,
          },
          {
            key: 'date',
            label: 'Date',
            render: (l: ListingRow) => (
              <span className="text-xs text-outline whitespace-nowrap">{new Date(l.createdAt).toLocaleDateString()}</span>
            ),
          },
        ]}
        actions={(l: ListingRow) => (
          <>
            <button onClick={() => onOpenDetail?.(l.id)} className={rowButtonClass}>
              View
            </button>
            {l.moderationStatus !== 'published' && (
              <button
                onClick={() => openAction(l, 'approve')}
                className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-success-container/20 border border-success/30 text-success hover:bg-success-container/40 whitespace-nowrap"
              >
                Approve
              </button>
            )}
            {l.moderationStatus !== 'removed' && (
              <button
                onClick={() => openAction(l, 'reject')}
                className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-error-container/20 border border-error/30 text-error hover:bg-error-container/40 whitespace-nowrap"
              >
                Reject
              </button>
            )}
            <button
              onClick={() => {
                setDeleteTarget(l);
                setDeleteError(null);
              }}
              className={rowButtonDangerClass}
            >
              Delete
            </button>
          </>
        )}
        footer={
          data && (
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} busy={loading} />
          )
        }
      />

      {/* Moderation confirmation dialog with required reason */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface rounded-2xl border border-outline-variant/25 shadow-xl">
            <div className="px-5 py-4 border-b border-outline-variant/25">
              <h3 className={`text-sm font-bold ${ACTION_META[pending.action].danger ? 'text-error' : 'text-on-surface'}`}>
                {ACTION_META[pending.action].label}?
              </h3>
              <p className="text-xs text-outline mt-1">"{pending.listing.title}"</p>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-outline uppercase mb-1.5">
                  Reason {ACTION_META[pending.action].reasonRequired ? '*' : '(optional)'}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder={
                    ACTION_META[pending.action].reasonRequired
                      ? 'Explain why — required, recorded in the audit log.'
                      : 'Optional context for the audit log.'
                  }
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
              {actionError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-error-container/20 border border-error/30 text-xs text-error">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {actionError}
                </div>
              )}
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-outline-variant/25">
              <button
                onClick={() => setPending(null)}
                disabled={actionBusy}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-outline hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={actionBusy || (ACTION_META[pending.action].reasonRequired && !reason.trim())}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50 ${
                  ACTION_META[pending.action].danger ? 'bg-error hover:opacity-90' : 'bg-success hover:opacity-90'
                }`}
              >
                {actionBusy ? 'Applying…' : ACTION_META[pending.action].label}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent deletion confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface rounded-2xl border border-outline-variant/25 shadow-xl">
            <div className="px-5 py-4 border-b border-outline-variant/25">
              <h3 className="text-sm font-bold text-error">Delete Listing?</h3>
              <p className="text-xs text-outline mt-1">
                “{deleteTarget.title}” will be permanently deleted from the database. This cannot be undone.
              </p>
            </div>
            <div className="p-5">
              {deleteError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-error-container/20 border border-error/30 text-xs text-error">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {deleteError}
                </div>
              )}
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-outline-variant/25">
              <button
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                disabled={actionBusy}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-outline hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={actionBusy}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-error hover:opacity-90 disabled:opacity-50"
              >
                {actionBusy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

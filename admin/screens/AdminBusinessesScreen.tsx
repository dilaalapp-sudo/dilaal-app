import React, { useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { LoadingSkeletonText } from '../components/LoadingSkeleton';
import { AdminDataTable } from '../components/AdminDataTable';
import {
  toolbarClass,
  toolbarSearchClass,
  toolbarSelectClass,
  toolbarSecondaryButtonClass,
  rowButtonClass,
  rowButtonSuccessClass,
  rowButtonDangerClass,
} from '../components/AdminToolbar';
import { adminJson, adminFetch, apiErrorMessage } from '../lib/adminApi';
import { useToast } from '../context/ToastContext';

interface BusinessRow {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string | null;
  category: string | null;
  location: string | null;
  verificationStatus: string;
  isSuspended: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface BusinessesResponse {
  businesses: BusinessRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STATUS_FILTERS = [
  { value: '', label: 'All verification states' },
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

type PendingAction =
  | { kind: 'verify'; business: BusinessRow; action: 'approve' | 'reject' }
  | { kind: 'suspend'; business: BusinessRow; suspend: boolean };

export const AdminBusinessesScreen: React.FC = () => {
  const toast = useToast();
  const [data, setData] = useState<BusinessesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('verificationStatus', status);
      setData(await adminJson<BusinessesResponse>(`/api/admin/businesses?${params}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load businesses.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const reasonRequired = pending?.kind === 'verify' && pending.action === 'reject';

  const confirmAction = async () => {
    if (!pending) return;
    if (reasonRequired && !reason.trim()) {
      setActionError('A rejection reason is required.');
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      let res: Response;
      if (pending.kind === 'verify') {
        res = await adminFetch(`/api/admin/businesses/${pending.business.id}/verify`, {
          method: 'POST',
          body: JSON.stringify({ action: pending.action, reason: reason.trim() || undefined }),
        });
      } else {
        res = await adminFetch(`/api/admin/businesses/${pending.business.id}/suspend`, {
          method: 'POST',
          body: JSON.stringify({ suspend: pending.suspend }),
        });
      }
      if (!res.ok) throw new Error(await apiErrorMessage(res, 'Action failed.'));
      toast.success(`${pending.kind === 'verify' ? 'Verification' : 'Suspension'} applied.`);
      setPending(null);
      setReason('');
      setActionError(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setActionBusy(false);
    }
  };

  const dialogTitle =
    pending?.kind === 'verify'
      ? pending.action === 'approve'
        ? 'Approve Business?'
        : 'Reject Business?'
      : pending?.suspend
        ? 'Suspend Business?'
        : 'Reactivate Business?';
  const dialogDanger =
    (pending?.kind === 'verify' && pending.action === 'reject') || (pending?.kind === 'suspend' && pending.suspend);

  if (loading) {
    return (
      <div className="p-4">
        <LoadingSkeletonText lines={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-error">
        {error}
        <button onClick={load} className="mt-2 px-3 py-1.5 text-sm font-bold bg-primary text-on-primary rounded-xl hover:bg-primary/90">
          Retry
        </button>
      </div>
    );
  }

  const businesses = data?.businesses ?? [];

  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className={toolbarClass}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search business name…"
            aria-label="Search businesses"
            className={toolbarSearchClass}
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by verification status"
            className={toolbarSelectClass}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <button onClick={load} disabled={loading} className={toolbarSecondaryButtonClass}>
            Refresh
          </button>
        </div>

        <AdminDataTable
          data={businesses}
          minWidth="760px"
          emptyIcon="business"
          emptyMessage="No businesses found."
          columns={[
            {
              key: 'business',
              label: 'Business',
              render: (b: BusinessRow) => (
                <div>
                  <div className="font-semibold text-on-surface">{b.name}</div>
                  <div className="text-xs text-outline">
                    {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '-'}
                  </div>
                </div>
              ),
            },
            {
              key: 'owner',
              label: 'Owner',
              render: (b: BusinessRow) => (
                <div>
                  <div>{b.ownerName}</div>
                  <div className="text-xs text-outline">{b.ownerEmail ?? '-'}</div>
                </div>
              ),
            },
            { key: 'category', label: 'Category', render: (b: BusinessRow) => b.category ?? '—' },
            { key: 'location', label: 'Location', render: (b: BusinessRow) => b.location ?? '—' },
            {
              key: 'status',
              label: 'Status',
              render: (b: BusinessRow) => (
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={b.verificationStatus} />
                  {b.isSuspended && <StatusBadge status="suspended" />}
                </div>
              ),
            },
          ]}
          actions={(b: BusinessRow) => (
            <>
              <button
                onClick={() => setPending({ kind: 'suspend', business: b, suspend: !b.isSuspended })}
                className={rowButtonClass}
              >
                {b.isSuspended ? 'Reactivate' : 'Suspend'}
              </button>
              <button
                onClick={() => setPending({ kind: 'verify', business: b, action: 'approve' })}
                className={rowButtonSuccessClass}
                disabled={b.verificationStatus === 'verified'}
              >
                Approve
              </button>
              <button
                onClick={() => setPending({ kind: 'verify', business: b, action: 'reject' })}
                className={rowButtonDangerClass}
                disabled={b.verificationStatus === 'rejected'}
              >
                Reject
              </button>
            </>
          )}
          footer={
            <Pagination
              page={data?.page ?? 1}
              totalPages={data?.totalPages ?? 1}
              total={data?.total ?? 0}
              onPageChange={setPage}
              busy={loading}
            />
          }
        />
      </div>

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface rounded-2xl border border-outline-variant/25 shadow-xl">
            <div className="px-5 py-4 border-b border-outline-variant/25">
              <h3 className={`text-sm font-bold ${dialogDanger ? 'text-error' : 'text-on-surface'}`}>{dialogTitle}</h3>
              <p className="text-xs text-outline mt-1">"{pending.business.name}"</p>
            </div>
            <div className="p-5">
              {pending.kind === 'verify' && pending.action === 'reject' && (
                <div>
                  <label className="block text-[11px] font-bold text-outline uppercase mb-1.5">
                    Reason <span className="text-error">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Recorded in the audit log."
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>
              )}
              {actionError && (
                <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-error-container/20 border border-error/30 text-xs text-error">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {actionError}
                </div>
              )}
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-outline-variant/25">
              <button
                onClick={() => setPending(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-outline hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={actionBusy || (reasonRequired && !reason.trim())}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-on-primary disabled:opacity-50 ${
                  dialogDanger ? 'bg-error hover:opacity-90' : 'bg-success hover:opacity-90'
                }`}
              >
                {actionBusy ? 'Applying…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
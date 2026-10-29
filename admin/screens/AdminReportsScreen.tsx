import React, { useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { AdminDataTable } from '../components/AdminDataTable';
import {
  toolbarClass,
  toolbarSelectClass,
  toolbarSecondaryButtonClass,
  rowButtonClass,
  rowButtonSuccessClass,
  rowButtonDangerClass,
} from '../components/AdminToolbar';
import { adminJson, adminFetch, apiErrorMessage } from '../lib/adminApi';
import { useToast } from '../context/ToastContext';

interface ReportRow {
  id: string;
  targetType: string;
  targetId: string;
  targetTitle: string | null;
  reporterEmail: string | null;
  reason: string;
  description: string;
  status: string;
  createdAt: string;
}

interface ReportsResponse {
  reports: ReportRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STATUS_FILTERS = [
  { value: '', label: 'All reports' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_review', label: 'In review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

type ResolutionAction = 'resolve' | 'dismiss' | 'escalate';

const RESOLUTION_LABELS: Record<ResolutionAction, string> = {
  resolve: 'Resolve',
  dismiss: 'Dismiss',
  escalate: 'Escalate to Review',
};

export const AdminReportsScreen: React.FC = () => {
  const toast = useToast();
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [pending, setPending] = useState<{ report: ReportRow; action: ResolutionAction } | null>(null);
  const [notes, setNotes] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status) params.set('status', status);
      setData(await adminJson<ReportsResponse>(`/api/admin/reports?${params}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  const confirmResolution = async () => {
    if (!pending) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await adminFetch(`/api/admin/reports/${pending.report.id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ action: pending.action, resolutionNotes: notes.trim() || undefined }),
      });
      if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to update the report.'));
      toast.success(`Report ${pending.action === 'resolve' ? 'resolved' : pending.action === 'dismiss' ? 'dismissed' : 'escalated'}.`);
      setPending(null);
      setNotes('');
      setActionError(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update the report.');
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton height="480" />;
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

  const reports = data?.reports ?? [];
  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className={toolbarClass}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
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
          data={reports}
          minWidth="720px"
          emptyIcon="report"
          emptyMessage="No reports found."
          columns={[
            {
              key: 'target',
              label: 'Target',
              render: (r: ReportRow) => (
                <div>
                  <div className="font-semibold text-on-surface">{r.targetTitle ?? r.targetId}</div>
                  <div className="text-xs text-outline">
                    {r.targetType} #{r.targetId}
                  </div>
                </div>
              ),
            },
            { key: 'reporter', label: 'Reporter', render: (r: ReportRow) => r.reporterEmail ?? '—' },
            { key: 'reason', label: 'Reason', render: (r: ReportRow) => r.reason },
            {
              key: 'status',
              label: 'Status',
              render: (r: ReportRow) => <StatusBadge status={r.status} />,
            },
          ]}
          actions={(r: ReportRow) =>
            r.status === 'pending' || r.status === 'in_review' ? (
              <>
                <button onClick={() => setPending({ report: r, action: 'resolve' })} className={rowButtonSuccessClass}>
                  Resolve
                </button>
                <button onClick={() => setPending({ report: r, action: 'dismiss' })} className={rowButtonDangerClass}>
                  Dismiss
                </button>
                <button onClick={() => setPending({ report: r, action: 'escalate' })} className={rowButtonClass}>
                  Escalate
                </button>
              </>
            ) : (
              <span className="text-[10px] text-outline">Closed</span>
            )
          }
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
              <h3 className="text-sm font-bold text-on-surface">{RESOLUTION_LABELS[pending.action]} Report?</h3>
              <p className="text-xs text-outline mt-1">"{pending.report.targetTitle ?? pending.report.targetId}"</p>
            </div>
            <div className="p-5">
              <label className="block text-[11px] font-bold text-outline uppercase mb-1.5">Resolution notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Recorded in the audit log."
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
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
                onClick={confirmResolution}
                disabled={actionBusy}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50"
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
import React, { useCallback, useEffect, useState } from 'react';
import { Pagination } from '../components/Pagination';
import { AdminDataTable } from '../components/AdminDataTable';
import { toolbarClass, toolbarSearchClass } from '../components/AdminToolbar';
import { adminJson } from '../lib/adminApi';

interface AuditLogRow {
  id: string;
  action: string;
  actorRole: string;
  actorEmail: string;
  targetEntity: string;
  details: string | null;
  targetId: string | null;
  targetType: string | null;
  timestamp: string;
}

interface AuditLogsResponse {
  auditLogs: AuditLogRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const AdminAuditLogsScreen: React.FC = () => {
  const [data, setData] = useState<AuditLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [action, setAction] = useState('');
  const [actorEmail, setActorEmail] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (action.trim()) params.set('action', action.trim());
      if (actorEmail.trim()) params.set('actorEmail', actorEmail.trim());
      setData(await adminJson<AuditLogsResponse>(`/api/admin/audit-logs?${params}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, action, actorEmail]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [action, actorEmail]);

  return (
    <div className="space-y-4">
      <div className={toolbarClass}>
        <input
          type="text"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Filter by action…"
          aria-label="Filter by action"
          className={toolbarSearchClass}
        />
        <input
          type="text"
          value={actorEmail}
          onChange={(e) => setActorEmail(e.target.value)}
          placeholder="Filter by admin email…"
          aria-label="Filter by admin email"
          className={toolbarSearchClass}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-error-container/20 border border-error/30 text-sm text-error">
          <span className="material-symbols-outlined text-lg">error</span>
          {error}
        </div>
      )}

      <AdminDataTable
        data={data?.auditLogs ?? []}
        loading={loading}
        dense
        minWidth="760px"
        emptyIcon="history"
        emptyMessage="No audit events match your filters."
        columns={[
          {
            key: 'action',
            label: 'Action',
            render: (log: AuditLogRow) => (
              <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/15 text-primary border border-primary/25 font-mono whitespace-nowrap">
                {log.action}
              </span>
            ),
          },
          {
            key: 'actor',
            label: 'Actor',
            render: (log: AuditLogRow) => (
              <div className="max-w-[180px]">
                <p className="text-xs text-on-surface-variant truncate">{log.actorEmail}</p>
                <p className="text-[10px] text-outline capitalize">{log.actorRole}</p>
              </div>
            ),
          },
          {
            key: 'target',
            label: 'Target',
            render: (log: AuditLogRow) => (
              <div className="max-w-[160px]">
                <p className="text-xs text-on-surface truncate">{log.targetEntity}</p>
                {log.targetType && <p className="text-[10px] text-outline truncate">{log.targetType}</p>}
              </div>
            ),
          },
          {
            key: 'details',
            label: 'Details',
            render: (log: AuditLogRow) => (
              <p className="text-[11px] text-on-surface-variant max-w-[320px] leading-snug line-clamp-2">
                {log.details ?? '—'}
              </p>
            ),
          },
          {
            key: 'timestamp',
            label: 'When',
            render: (log: AuditLogRow) => (
              <span className="text-[11px] text-outline whitespace-nowrap">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            ),
          },
        ]}
        footer={
          data && (
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} busy={loading} />
          )
        }
      />

      <p className="text-[11px] text-outline">
        Audit events are recorded automatically by the server and cannot be edited from this panel.
      </p>
    </div>
  );
};
import React, { useCallback, useEffect, useState } from 'react';
import { Pagination } from '../components/Pagination';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { AdminDataTable } from '../components/AdminDataTable';
import { toolbarClass, toolbarSearchClass, toolbarSelectClass, toolbarSecondaryButtonClass, rowButtonClass } from '../components/AdminToolbar';
import { adminJson, adminFetch, apiErrorMessage } from '../lib/adminApi';
import { useToast } from '../context/ToastContext';

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  isSuspended: boolean;
  isOnboardingComplete: boolean | null;
  createdAt: string;
}

interface UsersResponse {
  users: UserRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ROLE_FILTERS = [
  { value: '', label: 'All roles' },
  { value: 'buyer', label: 'Buyers' },
  { value: 'seller', label: 'Sellers' },
  { value: 'broker', label: 'Brokers' },
  { value: 'reviewer', label: 'Reviewers' },
  { value: 'admin', label: 'Admins' },
];

export const AdminUsersScreen: React.FC = () => {
  const toast = useToast();
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);

  const [pending, setPending] = useState<{ user: UserRow; suspend: boolean } | null>(null);
  const [reason, setReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [viewUser, setViewUser] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search.trim()) params.set('search', search.trim());
      if (role) params.set('role', role);
      setData(await adminJson<UsersResponse>(`/api/admin/users?${params}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [page, search, role]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, role]);

  const openSuspend = (user: UserRow, suspend: boolean) => {
    setPending({ user, suspend });
    setReason('');
    setActionError(null);
  };

  const confirmSuspend = async () => {
    if (!pending) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await adminFetch(`/api/admin/users/${pending.user.id}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ suspend: pending.suspend, reason: reason.trim() || undefined }),
      });
      if (!res.ok) throw new Error(await apiErrorMessage(res, 'Action failed.'));
      toast.success(`${pending.user.name ?? pending.user.email} ${pending.suspend ? 'suspended' : 'reactivated'}.`);
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await adminFetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await apiErrorMessage(res, 'Delete failed.'));
      toast.success(`Deleted ${deleteTarget.name ?? deleteTarget.email}.`);
      setDeleteTarget(null);
      setActionError(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Delete failed.');
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

  const users = data?.users ?? [];
  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className={toolbarClass}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            aria-label="Search users"
            className={toolbarSearchClass}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            aria-label="Filter by role"
            className={toolbarSelectClass}
          >
            {ROLE_FILTERS.map((f) => (
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
          data={users}
          minWidth="640px"
          emptyIcon="people"
          emptyMessage="No users found."
          columns={[
            {
              key: 'user',
              label: 'User',
              render: (u: UserRow) => (
                <div className="min-w-0">
                  <div className="font-semibold text-on-surface truncate">{u.name ?? 'Unnamed'}</div>
                  <div className="text-xs text-outline truncate">{u.email ?? '-'}</div>
                  {u.phone && <div className="text-xs text-outline">{u.phone}</div>}
                </div>
              ),
            },
            { key: 'role', label: 'Role', render: (u: UserRow) => <span className="capitalize">{u.role}</span> },
            {
              key: 'status',
              label: 'Status',
              render: (u: UserRow) => (
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                    u.isSuspended
                      ? 'bg-error-container text-on-error-container'
                      : 'bg-success-container text-on-success-container'
                  }`}
                >
                  {u.isSuspended ? 'Suspended' : 'Active'}
                </span>
              ),
            },
          ]}
          actions={(u: UserRow) => (
            <>
              <button onClick={() => setViewUser(u)} className={rowButtonClass} title="View user details">
                View
              </button>
              <button
                onClick={() => openSuspend(u, !u.isSuspended)}
                disabled={u.role === 'admin'}
                className={rowButtonClass}
                title={u.role === 'admin' ? 'Manage admins via the Admin Team screen.' : undefined}
              >
                {u.isSuspended ? 'Reactivate' : 'Suspend'}
              </button>
              <button
                onClick={() => {
                  setActionError(null);
                  setDeleteTarget(u);
                }}
                disabled={u.role === 'admin'}
                className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg border border-error/40 text-error hover:bg-error-container/20 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                title={u.role === 'admin' ? 'Manage admins via the Admin Team screen.' : 'Delete user'}
              >
                Delete
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
              <h3 className={`text-sm font-bold ${pending.suspend ? 'text-error' : 'text-on-surface'}`}>
                {pending.suspend ? 'Suspend Account?' : 'Reactivate Account?'}
              </h3>
              <p className="text-xs text-outline mt-1">{pending.user.name ?? pending.user.email}</p>
            </div>
            <div className="p-5">
              <label className="block text-[11px] font-bold text-outline uppercase mb-1.5">Reason (optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
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
                onClick={confirmSuspend}
                disabled={actionBusy}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 ${
                  pending.suspend ? 'bg-error hover:opacity-90' : 'bg-success hover:opacity-90'
                }`}
              >
                {actionBusy ? 'Applying…' : pending.suspend ? 'Suspend' : 'Reactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setViewUser(null)}>
          <div className="w-full max-w-md bg-surface rounded-2xl border border-outline-variant/25 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-outline-variant/25 flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface">User Details</h3>
              <button onClick={() => setViewUser(null)} className="w-8 h-8 rounded-full text-outline hover:bg-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="p-5 flex flex-col gap-3 text-sm">
              {[
                { label: 'Name', value: viewUser.name ?? 'Unnamed' },
                { label: 'Email', value: viewUser.email ?? '-' },
                { label: 'Phone', value: viewUser.phone ?? '-' },
                { label: 'Role', value: viewUser.role },
                { label: 'Status', value: viewUser.isSuspended ? 'Suspended' : 'Active' },
                { label: 'Onboarding', value: viewUser.isOnboardingComplete == null ? '-' : viewUser.isOnboardingComplete ? 'Complete' : 'Incomplete' },
                { label: 'Joined', value: viewUser.createdAt ? new Date(viewUser.createdAt).toLocaleString() : '-' },
                { label: 'ID', value: viewUser.id },
              ].map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-4">
                  <span className="text-xs font-bold text-outline uppercase">{row.label}</span>
                  <span className="text-on-surface text-right break-all">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface rounded-2xl border border-outline-variant/25 shadow-xl">
            <div className="px-5 py-4 border-b border-outline-variant/25">
              <h3 className="text-sm font-bold text-error">Delete Account?</h3>
              <p className="text-xs text-outline mt-1">
                {deleteTarget.name ?? deleteTarget.email} will be permanently removed. This cannot be undone.
              </p>
            </div>
            <div className="p-5">
              {actionError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-error-container/20 border border-error/30 text-xs text-error">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {actionError}
                </div>
              )}
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-outline-variant/25">
              <button
                onClick={() => { setDeleteTarget(null); setActionError(null); }}
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
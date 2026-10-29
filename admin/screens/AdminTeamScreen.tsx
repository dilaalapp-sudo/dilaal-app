import React, { useCallback, useEffect, useState } from 'react';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { AdminDataTable } from '../components/AdminDataTable';
import { toolbarClass, toolbarButtonClass } from '../components/AdminToolbar';
import { adminJson, adminFetch, apiErrorMessage } from '../lib/adminApi';
import { useToast } from '../context/ToastContext';

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: 'admin' | 'reviewer' | string;
  createdAt: string;
}

interface TeamResponse {
  members: TeamMember[];
  totalAdmins: number;
  totalReviewers: number;
  currentAdminId: string;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'reviewer', label: 'Reviewer' },
];

export const AdminTeamScreen: React.FC = () => {
  const toast = useToast();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [totalReviewers, setTotalReviewers] = useState(0);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<'admin' | 'reviewer'>('reviewer');
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [pendingChange, setPendingChange] = useState<{ member: TeamMember; role: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminJson<TeamResponse>('/api/admin/admin-team');
      setTeam(data.members);
      setTotalAdmins(data.totalAdmins);
      setTotalReviewers(data.totalReviewers);
      setCurrentAdminId(data.currentAdminId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the admin team.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    setAddBusy(true);
    setAddError(null);
    try {
      const res = await adminFetch('/api/admin/admin-team', {
        method: 'POST',
        body: JSON.stringify({
          email: addEmail.trim(),
          role: addRole,
          fullName: addName.trim() || undefined,
          password: addPassword || undefined,
        }),
      });
      if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to add the team member.'));
      toast.success(`${addEmail.trim()} granted '${addRole}' access.`);
      setAddOpen(false);
      setAddEmail('');
      setAddName('');
      setAddPassword('');
      setAddRole('reviewer');
      await load();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add the team member.');
    } finally {
      setAddBusy(false);
    }
  };

  const confirmRoleChange = async () => {
    if (!pendingChange) return;
    const { member, role } = pendingChange;
    try {
      const res = await adminFetch(`/api/admin/admin-team/${member.id}/role`, {
        method: 'POST',
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to update the role.'));
      toast.success(`Role updated for ${member.email}.`);
      setPendingChange(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update the role.');
      setPendingChange(null);
    }
  };

  const isSelf = (m: TeamMember) => m.id === currentAdminId;

  if (loading) {
    return <LoadingSkeleton height="400" />;
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
  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className={toolbarClass}>
          <button onClick={() => setAddOpen(true)} className={toolbarButtonClass}>
            + Add Member
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
          <div className="bg-surface-container rounded-2xl border border-outline-variant/25 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-outline">Admins</span>
              <span className="font-bold text-on-surface">{totalAdmins}</span>
            </div>
          </div>
          <div className="bg-surface-container rounded-2xl border border-outline-variant/25 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-outline">Reviewers</span>
              <span className="font-bold text-on-surface">{totalReviewers}</span>
            </div>
          </div>
        </div>

        <AdminDataTable
          data={team}
          minWidth="560px"
          emptyIcon="shield_person"
          emptyMessage='No admin team members yet. Use "Add Member" to grant access.'
          columns={[
            {
              key: 'member',
              label: 'Member',
              render: (m: TeamMember) => (
                <div className="min-w-0 max-w-[280px]">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-on-surface truncate">{m.name ?? 'Unnamed'}</p>
                    {isSelf(m) && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-primary-container text-on-primary shrink-0">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-outline truncate">{m.email}</p>
                </div>
              ),
            },
            {
              key: 'role',
              label: 'Role',
              render: (m: TeamMember) => (
                <select
                  value={m.role}
                  disabled={isSelf(m)}
                  onChange={(e) => {
                    if (e.target.value !== m.role) setPendingChange({ member: m, role: e.target.value });
                  }}
                  className="px-2 py-1.5 text-xs rounded-lg border border-outline-variant/40 bg-surface text-on-surface focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isSelf(m) ? 'You cannot change your own role.' : 'Change role'}
                >
                  <option value="admin">Admin</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="buyer">Revoke access</option>
                </select>
              ),
            },
            {
              key: 'joined',
              label: 'Joined',
              render: (m: TeamMember) => (
                <span className="text-xs text-outline whitespace-nowrap">
                  {new Date(m.createdAt).toLocaleDateString()}
                </span>
              ),
            },
          ]}
        />
      </div>

      {pendingChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface rounded-2xl border border-outline-variant/25 shadow-xl">
            <div className="px-5 py-4 border-b border-outline-variant/25">
              <h3 className="text-sm font-bold text-on-surface">Change Role?</h3>
              <p className="text-xs text-outline mt-1">{pendingChange.member.email}</p>
            </div>
            <div className="p-5">
              <p className="text-xs text-outline mb-4">
                Change role from <strong>{pendingChange.member.role}</strong> to <strong>{pendingChange.role}</strong>?
              </p>
              {pendingChange.member.role === 'admin' && pendingChange.role !== 'admin' && (
                <div className="mb-4 p-3 rounded-lg bg-pending-container/20 border border-pending/30 text-xs text-on-pending-container">
                  Warning: Demoting an admin may leave the team without sufficient administrators.
                </div>
              )}
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-outline-variant/25">
              <button
                onClick={() => setPendingChange(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-outline hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                onClick={confirmRoleChange}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-primary text-on-primary hover:bg-primary/90"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface rounded-2xl border border-outline-variant/25 shadow-xl">
            <div className="px-5 py-4 border-b border-outline-variant/25">
              <h3 className="text-sm font-bold text-on-surface">Add Team Member</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-outline uppercase mb-1.5">Email</label>
                <input
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="admin@dilaal.market"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-outline uppercase mb-1.5">Full Name</label>
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Ahmed Nur"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-outline uppercase mb-1.5">Password</label>
                <input
                  type="password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-outline uppercase mb-1.5">Role</label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as 'admin' | 'reviewer')}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {addError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-error-container/20 border border-error/30 text-xs text-error">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {addError}
                </div>
              )}
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-outline-variant/25">
              <button
                onClick={() => setAddOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-outline hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={addBusy}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50"
              >
                {addBusy ? 'Adding…' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
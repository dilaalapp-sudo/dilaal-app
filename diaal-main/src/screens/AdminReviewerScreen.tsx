import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { VerificationStatus } from '../types';
import {
  changeUserRole,
  fetchAdminStats,
  fetchAdminUsersPage,
  fetchAuditLogPage,
  fetchEvidenceForListings,
  removeListingById,
  setUserSuspension,
  signedEvidenceUrl,
  type AdminStats,
  type AdminUserRow,
  type AuditLogRow,
  type EvidenceRow,
} from '../lib/persistence';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isoDate = (value: string) => (ISO_DATE.test(value) ? value : undefined);

const EVIDENCE_LABELS: Record<string, string> = {
  title_deed: 'Title deed',
  boundary_survey: 'Boundary survey',
  broker_license: 'Broker licence',
  tax_clearance: 'Tax clearance',
  owner_id: 'Owner ID',
};

interface PendingAction {
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  run: () => Promise<void>;
}

export const AdminReviewerScreen: React.FC = () => {
  const {
    listings,
    reports,
    auditLogs,
    updateListingVerification,
    resolveReport,
    refreshFromSupabase,
    userRole,
    authUserId,
    formatPrice,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'verifications' | 'reports' | 'users' | 'audit'>(
    'verifications'
  );
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionError, setActionError] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const isAdmin = userRole === 'admin';

  // Moderation counters
  const [stats, setStats] = useState<AdminStats | null>(null);

  const refreshStats = useCallback(() => {
    fetchAdminStats().then((next) => {
      if (next) setStats(next);
    });
  }, []);

  // Accounts directory
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoadingMore, setUsersLoadingMore] = useState(false);
  const [usersDirectoryMissing, setUsersDirectoryMissing] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<
    'all' | 'user' | 'broker' | 'reviewer' | 'admin'
  >('all');

  // Evidence
  const [evidence, setEvidence] = useState<EvidenceRow[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceMissing, setEvidenceMissing] = useState(false);
  const [openingEvidence, setOpeningEvidence] = useState('');

  // Audit trail
  const [auditRows, setAuditRows] = useState<AuditLogRow[] | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [auditAction, setAuditAction] = useState('');
  const [auditActor, setAuditActor] = useState('');
  const [auditFrom, setAuditFrom] = useState('');
  const [auditTo, setAuditTo] = useState('');

  const pendingListings = useMemo(
    () =>
      listings.filter(
        (l) => l.verificationStatus === 'submitted' || l.verificationStatus === 'in_review'
      ),
    [listings]
  );

  const pendingReports = useMemo(() => reports.filter((r) => r.status === 'pending'), [reports]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Load evidence once for every listing awaiting a decision.
  const pendingListingIdsKey = pendingListings.map((l) => l.id).join(',');
  useEffect(() => {
    if (pendingListings.length === 0) {
      setEvidence([]);
      return;
    }
    let cancelled = false;
    setEvidenceLoading(true);
    fetchEvidenceForListings(pendingListings.map((l) => l.id)).then((rows) => {
      if (cancelled) return;
      setEvidenceMissing(rows === null);
      setEvidence(rows ?? []);
      setEvidenceLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // Re-run only when the set of pending listings changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingListingIdsKey]);

  // Accounts: debounced search + role filter, always from page 0.
  useEffect(() => {
    if (activeTab !== 'users') return;
    let cancelled = false;
    setUsersLoading(true);
    const timer = setTimeout(() => {
      fetchAdminUsersPage({ query: userQuery, role: userRoleFilter, offset: 0 }).then((page) => {
        if (cancelled) return;
        setUsersDirectoryMissing(page === null);
        setUsers(page?.rows ?? []);
        setUsersTotal(page?.total ?? 0);
        setUsersLoading(false);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeTab, userQuery, userRoleFilter]);

  // Audit trail: filtered server-side, newest first.
  const loadAuditPage = useCallback(
    (offset: number, append: boolean) => {
      setAuditLoading(true);
      fetchAuditLogPage({
        action: auditAction,
        actor: auditActor,
        from: isoDate(auditFrom),
        to: isoDate(auditTo),
        offset,
      }).then((page) => {
        if (page === null) {
          setAuditRows(null);
          setAuditHasMore(false);
          setAuditLoading(false);
          return;
        }
        setAuditRows((prev) => (append && prev ? [...prev, ...page.rows] : page.rows));
        setAuditHasMore(page.hasMore);
        setAuditLoading(false);
      });
    },
    [auditAction, auditActor, auditFrom, auditTo]
  );

  useEffect(() => {
    if (activeTab !== 'audit') return;
    loadAuditPage(0, false);
  }, [activeTab, loadAuditPage]);

  const loadMoreUsers = () => {
    if (usersLoadingMore) return;
    setUsersLoadingMore(true);
    fetchAdminUsersPage({
      query: userQuery,
      role: userRoleFilter,
      offset: users.length,
    }).then((page) => {
      setUsersLoadingMore(false);
      if (!page) {
        setUsersDirectoryMissing(true);
        return;
      }
      setUsers((prev) => {
        const seen = new Set(prev.map((row) => row.id));
        return [...prev, ...page.rows.filter((row) => !seen.has(row.id))];
      });
      setUsersTotal(page.total);
    });
  };

  const performSuspend = async (user: AdminUserRow) => {
    setActionError('');
    const result = await setUserSuspension(
      user.id,
      !user.suspended,
      `Moderation action by ${userRole}`
    );
    if (result.missing) {
      setActionError('Moderation tools are not enabled on this project yet.');
      return;
    }
    if (!result.success) {
      setActionError(result.error || 'Could not update this account.');
      return;
    }
    setUsers((prev) =>
      prev.map((row) => (row.id === user.id ? { ...row, suspended: !row.suspended } : row))
    );
    refreshStats();
  };

  const handleRoleChange = async (user: AdminUserRow, role: AdminUserRow['role']) => {
    setActionError('');
    const result = await changeUserRole(
      user.id,
      role as 'guest' | 'user' | 'broker' | 'reviewer' | 'admin'
    );
    if (result.missing) {
      setActionError('Role management is not enabled on this project yet.');
      return;
    }
    if (!result.success) {
      setActionError(result.error || 'Could not change this role.');
      return;
    }
    setUsers((prev) => prev.map((row) => (row.id === user.id ? { ...row, role } : row)));
  };

  const performRemoveListing = async (listingId: string) => {
    setActionError('');
    const result = await removeListingById(listingId, reviewNotes || `Removed by ${userRole}`);
    if (!result.success && !result.missing) {
      setActionError(result.error || 'Could not remove this listing.');
      return;
    }
    setSelectedListingId(null);
    setReviewNotes('');
    setEvidence((prev) => prev.filter((row) => row.listingId !== listingId));
    refreshStats();
    void refreshFromSupabase();
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;
    setActionBusy(true);
    await pendingAction.run();
    setActionBusy(false);
    setPendingAction(null);
  };

  const handleDecision = (listingId: string, status: VerificationStatus) => {
    updateListingVerification(listingId, status, reviewNotes || `Decision recorded by ${userRole}`);
    setSelectedListingId(null);
    setReviewNotes('');
    setEvidence((prev) => prev.filter((row) => row.listingId !== listingId));
    refreshStats();
  };

  const openEvidenceDocument = async (path: string) => {
    setActionError('');
    setOpeningEvidence(path);
    const url = await signedEvidenceUrl(path);
    setOpeningEvidence('');
    if (!url) {
      setActionError('This document could not be opened. Check storage access and try again.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const evidenceFor = (listingId: string) => evidence.filter((row) => row.listingId === listingId);

  const metrics = {
    pendingDeeds: stats?.pendingDeeds ?? pendingListings.length,
    pendingReports: stats?.pendingReports ?? pendingReports.length,
    suspendedUsers: stats?.suspendedUsers ?? users.filter((u) => u.suspended).length,
  };

  return (
    <div className="flex-1 flex flex-col w-full pb-24 sm:pb-12 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      {/* Role Notice Header */}
      <div className="bg-emerald-900 text-white px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-emerald-300 text-xl">admin_panel_settings</span>
            <div>
              <h2 className="text-sm font-bold">Compliance & Reviewer Hub</h2>
              <p className="text-[11px] text-emerald-200">
                Audited evidence-based verification and moderation portal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-300">Active Role:</span>
            <span className="px-2 py-1 bg-emerald-800 text-white rounded-lg border border-emerald-600 text-xs font-semibold capitalize">
              {userRole}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-4">
        {/* Queue counters */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {[
            { label: 'Pending deeds', value: metrics.pendingDeeds, icon: 'fact_check' },
            { label: 'Open reports', value: metrics.pendingReports, icon: 'report_problem' },
            { label: 'Suspended', value: metrics.suspendedUsers, icon: 'block' },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px] text-emerald-700 dark:text-emerald-400">
                {card.icon}
              </span>
              <div className="min-w-0">
                <p className="text-base font-bold leading-none">{card.value}</p>
                <p className="text-[10px] text-slate-500 truncate">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 sm:flex gap-x-4 border-b border-slate-200 dark:border-slate-800 mb-4">
          <button
            onClick={() => setActiveTab('verifications')}
            className={`pb-2.5 text-xs font-bold transition-colors flex items-center gap-1.5 border-b-2 cursor-pointer shrink-0 justify-self-start ${
              activeTab === 'verifications'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">fact_check</span>
            <span>Title Audits ({pendingListings.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`pb-2.5 text-xs font-bold transition-colors flex items-center gap-1.5 border-b-2 cursor-pointer shrink-0 justify-self-start ${
              activeTab === 'reports'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">report_problem</span>
            <span>Report Queue ({pendingReports.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-2.5 text-xs font-bold transition-colors flex items-center gap-1.5 border-b-2 cursor-pointer shrink-0 justify-self-start ${
              activeTab === 'users'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
            <span>Accounts</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-2.5 text-xs font-bold transition-colors flex items-center gap-1.5 border-b-2 cursor-pointer shrink-0 justify-self-start ${
              activeTab === 'audit'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            <span>Audit Trail</span>
          </button>
        </div>

        {actionError ? (
          <p className="mb-3 text-[11px] font-semibold text-red-700 dark:text-red-400">{actionError}</p>
        ) : null}

        {/* Tab 1: Title Verification Queue */}
        {activeTab === 'verifications' && (
          <div className="space-y-4">
            {pendingListings.length === 0 ? (
              <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">task_alt</span>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">All Verification Queues Clear</h4>
                <p className="text-xs text-slate-500 mt-1">No title deeds currently awaiting auditor review.</p>
              </div>
            ) : (
              pendingListings.map((listing) => {
                const docs = evidenceFor(listing.id);
                return (
                  <div
                    key={listing.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col md:flex-row gap-4"
                  >
                    {listing.image ? (
                      <img
                        src={listing.image}
                        alt={listing.title}
                        className="w-full md:w-36 h-28 object-cover rounded-xl shrink-0"
                      />
                    ) : (
                      <div className="w-full md:w-36 h-28 rounded-xl shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl text-slate-400">home_work</span>
                      </div>
                    )}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{listing.title}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            {listing.verificationStatus}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {listing.locationDetails} • Registry Code: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{listing.registryNumber}</span>
                        </p>
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                          Asking: {formatPrice(listing.price)}
                        </p>
                      </div>

                      {/* Attached evidence */}
                      <div className="mt-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                          Evidence on file
                        </p>
                        {evidenceLoading ? (
                          <div className="space-y-1.5 py-1">
                            <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                            <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                          </div>
                        ) : docs.length === 0 ? (
                          <p className="text-[11px] text-slate-500">
                            {evidenceMissing
                              ? 'Document storage is not enabled yet — reviewing the registry reference only.'
                              : 'No documents attached. The broker supplied a registry reference only.'}
                          </p>
                        ) : (
                          <ul className="space-y-1">
                            {docs.map((doc) => (
                              <li
                                key={doc.id}
                                className="flex items-center justify-between gap-2 text-[11px]"
                              >
                                <span className="min-w-0 truncate">
                                  <span className="font-bold text-slate-700 dark:text-slate-200">
                                    {EVIDENCE_LABELS[doc.evidenceType] || doc.evidenceType}
                                  </span>
                                  {doc.registryNumber ? (
                                    <span className="font-mono text-slate-500"> • {doc.registryNumber}</span>
                                  ) : null}
                                  {doc.issuerAuthority ? (
                                    <span className="text-slate-500"> • {doc.issuerAuthority}</span>
                                  ) : null}
                                </span>
                                {doc.documentPath ? (
                                  <button
                                    type="button"
                                    onClick={() => void openEvidenceDocument(doc.documentPath as string)}
                                    disabled={openingEvidence === doc.documentPath}
                                    className="shrink-0 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 underline cursor-pointer disabled:opacity-60"
                                  >
                                    {openingEvidence === doc.documentPath ? 'Opening…' : 'View document'}
                                  </button>
                                ) : (
                                  <span className="shrink-0 text-[10px] text-slate-400">Reference only</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {selectedListingId === listing.id ? (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                          <textarea
                            placeholder="Auditor notes (e.g. Cadastral search confirmed, beacons inspected)..."
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                            rows={2}
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleDecision(listing.id, 'approved')}
                              className="flex-1 min-w-24 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Approve Deed
                            </button>
                            <button
                              onClick={() => handleDecision(listing.id, 'more_info_required')}
                              className="flex-1 min-w-24 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Request Proof
                            </button>
                            <button
                              onClick={() => handleDecision(listing.id, 'rejected')}
                              className="flex-1 min-w-20 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => setSelectedListingId(null)}
                              className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                          <button
                            onClick={() =>
                              setPendingAction({
                                title: 'Remove this listing?',
                                body: `${listing.title} will be pulled from the marketplace immediately. The removal is written to the audit trail.`,
                                confirmLabel: 'Remove listing',
                                destructive: true,
                                run: () => performRemoveListing(listing.id),
                              })
                            }
                            className="self-start text-[11px] font-bold text-red-700 dark:text-red-400 underline cursor-pointer"
                          >
                            Remove listing from marketplace
                          </button>
                        </div>
                      ) : (
                        <div className="mt-3 pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[11px] text-slate-500">Submitted by: {listing.brokerName}</span>
                          <button
                            onClick={() => {
                              setSelectedListingId(listing.id);
                              setReviewNotes('');
                            }}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
                          >
                            <span>Review Evidence</span>
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Reports Queue */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {pendingReports.length === 0 ? (
              <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">check_circle</span>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Pending Reports</h4>
                <p className="text-xs text-slate-500 mt-1">All community and buyer safety reports have been audited.</p>
              </div>
            ) : (
              pendingReports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                        {report.reason.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                        Report on: {report.targetTitle}
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-500">{report.createdAt}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 mb-3">
                    <p className="italic">"{report.description}"</p>
                    <p className="text-[11px] text-slate-500 mt-1">Reported by: {report.reporterEmail}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        resolveReport(report.id, 'resolved');
                        refreshStats();
                      }}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Resolve & Action
                    </button>
                    <button
                      onClick={() => {
                        resolveReport(report.id, 'dismissed');
                        refreshStats();
                      }}
                      className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Dismiss (Inconclusive)
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Accounts */}
        {activeTab === 'users' && (
          <div className="space-y-3">
            {!isAdmin ? (
              <p className="text-[11px] text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                Only administrators can suspend accounts or change roles. Reviewer decisions are
                recorded in the audit trail.
              </p>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2">
                <span className="material-symbols-outlined text-[18px] text-slate-400">search</span>
                <input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Search by name or account ID"
                  className="flex-1 bg-transparent text-xs outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                />
                {userQuery ? (
                  <button
                    type="button"
                    onClick={() => setUserQuery('')}
                    aria-label="Clear search"
                    className="material-symbols-outlined text-[16px] text-slate-400 cursor-pointer"
                  >
                    close
                  </button>
                ) : null}
              </div>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value as typeof userRoleFilter)}
                className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="all">All roles</option>
                <option value="user">Users</option>
                <option value="broker">Brokers</option>
                <option value="reviewer">Reviewers</option>
                <option value="admin">Admins</option>
              </select>
            </div>

            {usersLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((row) => (
                  <div
                    key={row}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4"
                  >
                    <div className="h-3 w-40 rounded bg-slate-200 dark:bg-slate-700 animate-pulse mb-2" />
                    <div className="h-2.5 w-64 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : usersDirectoryMissing ? (
              <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Account directory unavailable
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Enable the admin migration to list accounts here.
                </p>
              </div>
            ) : users.length === 0 ? (
              <p className="py-10 text-center text-xs text-slate-500">No accounts match this filter.</p>
            ) : (
              <>
                {users.map((user) => {
                  const isSelf = Boolean(authUserId) && user.id === authUserId;
                  return (
                    <div
                      key={user.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {user.name || 'Dilaal member'}
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 capitalize">
                            {user.role}
                          </span>
                          {isSelf ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              You
                            </span>
                          ) : null}
                          {user.suspended ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                              Suspended
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">{user.id}</p>
                      </div>
                      {isAdmin && !isSelf ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={user.role}
                            onChange={(e) => void handleRoleChange(user, e.target.value)}
                            className="text-[11px] font-semibold px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                          >
                            <option value="user">user</option>
                            <option value="broker">broker</option>
                            <option value="reviewer">reviewer</option>
                            <option value="admin">admin</option>
                          </select>
                          <button
                            onClick={() =>
                              setPendingAction({
                                title: user.suspended
                                  ? 'Reinstate this account?'
                                  : 'Suspend this account?',
                                body: user.suspended
                                  ? `${user.name || 'This member'} regains access to listings and messaging immediately.`
                                  : `${user.name || 'This member'} loses access to listings, offers and messaging. The action is written to the audit trail.`,
                                confirmLabel: user.suspended ? 'Reinstate' : 'Suspend',
                                destructive: !user.suspended,
                                run: () => performSuspend(user),
                              })
                            }
                            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer text-white ${
                              user.suspended
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                          >
                            {user.suspended ? 'Reinstate' : 'Suspend'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    Showing {users.length} of {usersTotal}
                  </span>
                  {users.length < usersTotal ? (
                    <button
                      type="button"
                      onClick={loadMoreUsers}
                      disabled={usersLoadingMore}
                      className="px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 disabled:opacity-60 cursor-pointer"
                    >
                      {usersLoadingMore ? 'Loading…' : 'Load more accounts'}
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 4: Audit Trail */}
        {activeTab === 'audit' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={auditAction}
                onChange={(e) => setAuditAction(e.target.value)}
                placeholder="Filter by action (e.g. VERIFICATION_APPROVED)"
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                value={auditActor}
                onChange={(e) => setAuditActor(e.target.value)}
                placeholder="Filter by actor email"
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={auditFrom}
                  onChange={(e) => setAuditFrom(e.target.value)}
                  aria-label="Filter from date"
                  className="text-xs px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <input
                  type="date"
                  value={auditTo}
                  onChange={(e) => setAuditTo(e.target.value)}
                  aria-label="Filter to date"
                  className="text-xs px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              {auditAction || auditActor || auditFrom || auditTo ? (
                <button
                  type="button"
                  onClick={() => {
                    setAuditAction('');
                    setAuditActor('');
                    setAuditFrom('');
                    setAuditTo('');
                  }}
                  className="px-3 py-2 text-[11px] font-bold rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Clear filters
                </button>
              ) : null}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Auditable System Events</span>
                <span className="text-[11px] text-slate-500">
                  {auditRows ? `${auditRows.length} loaded` : `${auditLogs.length} cached`}
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
                {auditLoading && !auditRows ? (
                  <div className="p-4 space-y-3">
                    {[0, 1, 2].map((row) => (
                      <div key={row}>
                        <div className="h-2.5 w-32 rounded bg-slate-200 dark:bg-slate-700 animate-pulse mb-1.5" />
                        <div className="h-2.5 w-2/3 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : (auditRows ?? auditLogs).length === 0 ? (
                  <div className="py-12 text-center p-6">
                    <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-600 mb-2">history_toggle_off</span>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">No Auditable Events Yet</h4>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                      Administrative approvals, title deed decisions, and escrow milestones are recorded here.
                    </p>
                  </div>
                ) : (
                  <>
                    {(auditRows ?? auditLogs).map((log) => {
                      const createdAt = 'createdAt' in log ? log.createdAt : log.timestamp;
                      return (
                        <div key={log.id} className="p-3.5 text-xs flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              [{log.action}]
                            </span>
                            <span className="text-slate-500">
                              {createdAt ? new Date(createdAt).toLocaleString() : ''}
                            </span>
                          </div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{log.targetEntity}</p>
                          <p className="text-slate-600 dark:text-slate-400 text-[11px]">{log.details}</p>
                          <span className="text-[10px] text-slate-400">
                            Actor: {log.actorEmail} ({log.actorRole})
                          </span>
                        </div>
                      );
                    })}
                    {auditHasMore ? (
                      <div className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => loadAuditPage((auditRows ?? []).length, true)}
                          disabled={auditLoading}
                          className="px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 disabled:opacity-60 cursor-pointer"
                        >
                          {auditLoading ? 'Loading…' : 'Load older events'}
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation sheet for destructive moderation actions */}
      {pendingAction ? (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 id="confirm-title" className="text-sm font-bold text-slate-900 dark:text-white">
              {pendingAction.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              {pendingAction.body}
            </p>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                disabled={actionBusy}
                className="flex-1 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={actionBusy}
                className={`flex-1 py-2 rounded-xl text-white text-xs font-bold cursor-pointer disabled:opacity-60 ${
                  pendingAction.destructive
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {actionBusy ? 'Working…' : pendingAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

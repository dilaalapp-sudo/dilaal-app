import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Modal,
  Linking,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { typography } from '../theme';
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

type AdminTab = 'verifications' | 'reports' | 'users' | 'audit';

const EVIDENCE_LABELS: Record<string, string> = {
  title_deed: 'Title deed',
  boundary_survey: 'Boundary survey',
  broker_license: 'Broker licence',
  tax_clearance: 'Tax clearance',
  owner_id: 'Owner ID',
};

const ROLE_FILTERS = ['all', 'user', 'broker', 'reviewer', 'admin'] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isoDate = (value: string) => (ISO_DATE.test(value) ? value : undefined);

interface PendingAction {
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  run: () => Promise<void>;
}

const makeStyles = (isDark: boolean) => {
  const page = isDark ? '#020617' : '#f8fafc';
  const card = isDark ? '#0f172a' : '#ffffff';
  const border = isDark ? '#1e293b' : '#e2e8f0';
  const text = isDark ? '#ffffff' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const soft = isDark ? '#1e293b' : '#f1f5f9';
  const field = isDark ? '#1e293b' : '#f8fafc';
  const skeleton = isDark ? '#1e293b' : '#e2e8f0';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: page },
    header: { paddingHorizontal: 16, paddingTop: 14 },
    headerInner: { width: '100%', maxWidth: 896, alignSelf: 'center', gap: 8 },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
    headerTitleWrap: { flexShrink: 1 },
    headerTitle: { fontSize: 14, fontFamily: typography.bold, color: text },
    headerSub: { fontSize: 11, color: muted, lineHeight: 15 },
    roleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    roleLabel: { fontSize: 12, color: muted },
    roleChip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: isDark ? '#064e3b' : '#ecfdf5',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#059669',
    },
    roleChipText: {
      fontSize: 12,
      fontFamily: typography.semibold,
      color: isDark ? '#a7f3d0' : '#047857',
      textTransform: 'capitalize',
    },
    body: { width: '100%', maxWidth: 896, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 16 },

    metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    metricCard: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 9,
    },
    metricValue: { fontSize: 16, fontFamily: typography.bold, color: text, lineHeight: 19 },
    metricLabel: { fontSize: 9, color: muted, marginTop: 1 },

    tabsWrap: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: border },
    tabsContent: { flexDirection: 'row', gap: 16, paddingBottom: 0 },
    tab: { paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: '#059669' },
    tabInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tabText: { fontSize: 12, fontFamily: typography.bold, color: muted },
    tabTextActive: { color: isDark ? '#34d399' : '#047857' },

    stack: { gap: 16 },
    emptyCard: {
      backgroundColor: card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: border,
      padding: 24,
      alignItems: 'center',
      gap: 6,
    },
    emptyTitle: { fontSize: 14, fontFamily: typography.bold, color: isDark ? '#cbd5e1' : '#334155', textAlign: 'center' },
    emptyText: { fontSize: 12, color: muted, textAlign: 'center', lineHeight: 18 },

    listingCard: {
      backgroundColor: card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: border,
      padding: 16,
      gap: 12,
    },
    listingRow: { gap: 12 },
    thumb: { width: '100%', height: 112, borderRadius: 12 },
    thumbPlaceholder: {
      width: '100%',
      height: 112,
      borderRadius: 12,
      backgroundColor: soft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listingBody: { flex: 1, gap: 4 },
    listingTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    listingTitle: { flex: 1, fontSize: 14, fontFamily: typography.bold, color: text },
    statusChip: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: isDark ? '#451a03' : '#fef3c7',
    },
    statusChipText: { fontSize: 10, fontFamily: typography.bold, color: isDark ? '#fcd34d' : '#92400e' },
    listingMeta: { fontSize: 12, color: muted, lineHeight: 18 },
    mono: { fontFamily: typography.bold, color: isDark ? '#cbd5e1' : '#334155' },
    listingPrice: { fontSize: 12, fontFamily: typography.bold, color: isDark ? '#34d399' : '#047857', marginTop: 4 },

    evidenceBox: {
      marginTop: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: isDark ? '#1e293b66' : '#f8fafc',
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 4,
    },
    evidenceTitle: {
      fontSize: 9,
      fontFamily: typography.bold,
      color: muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    evidenceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    evidenceText: { flex: 1, fontSize: 11, color: muted },
    evidenceType: { fontFamily: typography.bold, color: isDark ? '#e2e8f0' : '#334155' },
    evidenceLink: {
      fontSize: 10,
      fontFamily: typography.bold,
      color: isDark ? '#34d399' : '#047857',
      textDecorationLine: 'underline',
    },
    evidenceEmpty: { fontSize: 11, color: muted, lineHeight: 16 },
    skeletonLine: { height: 10, borderRadius: 5, backgroundColor: skeleton },

    reviewBox: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: border,
      gap: 8,
    },
    notesInput: {
      fontSize: 12,
      padding: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: field,
      color: text,
      minHeight: 64,
      textAlignVertical: 'top',
    },
    decisionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    decisionBtn: {
      flexGrow: 1,
      flexBasis: '22%',
      paddingVertical: 7,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    decisionText: { fontSize: 12, fontFamily: typography.bold, color: '#ffffff' },
    cancelBtn: { backgroundColor: isDark ? '#334155' : '#e2e8f0' },
    cancelText: { fontSize: 12, fontFamily: typography.semibold, color: isDark ? '#cbd5e1' : '#334155' },
    listingFooter: {
      marginTop: 12,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    listingFooterText: { fontSize: 11, color: muted, flexShrink: 1 },
    reviewBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: '#047857',
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    reviewBtnText: { fontSize: 12, fontFamily: typography.bold, color: '#ffffff' },

    reportHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 8,
    },
    reportReason: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: isDark ? '#450a0a' : '#fee2e2',
    },
    reportReasonText: { fontSize: 10, fontFamily: typography.bold, color: isDark ? '#fca5a5' : '#991b1b' },
    reportTitle: { fontSize: 14, fontFamily: typography.bold, color: text, marginTop: 4 },
    reportDate: { fontSize: 11, color: muted },
    reportQuote: {
      padding: 12,
      backgroundColor: isDark ? '#1e293b99' : '#f8fafc',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      marginBottom: 12,
      gap: 4,
    },
    reportQuoteText: { fontSize: 12, fontStyle: 'italic', color: isDark ? '#cbd5e1' : '#334155', lineHeight: 18 },
    reportBy: { fontSize: 11, color: muted },
    reportActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    reportActionBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
    reportActionText: { fontSize: 12, fontFamily: typography.bold, color: '#ffffff' },
    dismissBtn: { backgroundColor: isDark ? '#334155' : '#e2e8f0' },
    dismissText: { fontSize: 12, fontFamily: typography.semibold, color: isDark ? '#cbd5e1' : '#334155' },

    searchRow: { gap: 8 },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: card,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    searchInput: { flex: 1, fontSize: 12, color: text, paddingVertical: 6 },
    clearIcon: { padding: 4 },
    filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    filterChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: card,
    },
    filterChipActive: { backgroundColor: '#047857', borderColor: '#047857' },
    filterChipText: { fontSize: 10, fontFamily: typography.semibold, color: muted },
    filterChipTextActive: { color: '#ffffff' },

    skeletonCard: {
      backgroundColor: card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: border,
      padding: 16,
      gap: 8,
    },

    pagerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 4,
      gap: 8,
    },
    pagerText: { fontSize: 11, color: muted },
    loadMoreBtn: {
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: border,
    },
    loadMoreText: { fontSize: 11, fontFamily: typography.bold, color: isDark ? '#34d399' : '#047857' },

    auditCard: {
      backgroundColor: card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: border,
      overflow: 'hidden',
    },
    auditHead: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      borderBottomWidth: 1,
      borderBottomColor: border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    auditHeadText: { fontSize: 12, fontFamily: typography.bold, color: isDark ? '#cbd5e1' : '#334155' },
    auditCount: { fontSize: 11, color: muted },
    auditRow: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: border,
      gap: 4,
    },
    auditTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    auditAction: {
      fontSize: 11,
      fontFamily: typography.bold,
      color: isDark ? '#34d399' : '#047857',
    },
    auditTime: { fontSize: 11, color: muted },
    auditEntity: { fontSize: 12, fontFamily: typography.semibold, color: isDark ? '#e2e8f0' : '#1e293b' },
    auditDetails: { fontSize: 11, color: muted, lineHeight: 16 },
    auditActor: { fontSize: 10, color: isDark ? '#64748b' : '#94a3b8' },
    auditFilterInput: {
      fontSize: 12,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: card,
      color: text,
    },

    userRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
    userName: { fontSize: 14, fontFamily: typography.bold, color: text, flexShrink: 1 },
    roleTag: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: soft,
    },
    roleTagText: { fontSize: 10, fontFamily: typography.bold, color: muted, textTransform: 'capitalize' },
    selfTag: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: isDark ? '#022c22' : '#d1fae5',
    },
    selfTagText: { fontSize: 10, fontFamily: typography.bold, color: isDark ? '#6ee7b7' : '#065f46' },
    suspendedTag: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: isDark ? '#450a0a' : '#fee2e2',
    },
    suspendedTagText: { fontSize: 10, fontFamily: typography.bold, color: isDark ? '#fca5a5' : '#991b1b' },
    userId: { fontSize: 10, color: muted, marginTop: 2 },
    userActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, alignItems: 'center' },
    roleBtn: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      borderWidth: 1,
      borderColor: border,
    },
    roleBtnActive: { backgroundColor: '#047857', borderColor: '#047857' },
    roleBtnText: { fontSize: 11, fontFamily: typography.semibold, color: muted },
    roleBtnTextActive: { color: '#ffffff' },
    actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    actionBtnText: { fontSize: 11, fontFamily: typography.bold, color: '#ffffff' },
    actionError: { fontSize: 11, fontFamily: typography.semibold, color: isDark ? '#f87171' : '#b91c1c' },
    removeLink: {
      alignSelf: 'flex-start',
      fontSize: 11,
      fontFamily: typography.bold,
      color: isDark ? '#f87171' : '#b91c1c',
      textDecorationLine: 'underline',
      marginTop: 4,
    },
    noticeCard: {
      backgroundColor: card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      padding: 12,
    },
    noticeText: { fontSize: 11, color: muted, lineHeight: 16 },

    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
      padding: 16,
    },
    modalCard: {
      width: '100%',
      maxWidth: 384,
      alignSelf: 'center',
      backgroundColor: card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: border,
      padding: 20,
      gap: 6,
    },
    sheetTitle: { fontSize: 14, fontFamily: typography.bold, color: text },
    sheetBody: { fontSize: 12, color: muted, lineHeight: 18 },
    sheetActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
    sheetBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetCancel: { backgroundColor: isDark ? '#334155' : '#e2e8f0' },
    sheetCancelText: { fontSize: 12, fontFamily: typography.bold, color: isDark ? '#cbd5e1' : '#334155' },
    sheetConfirmText: { fontSize: 12, fontFamily: typography.bold, color: '#ffffff' },

    padBottom: { height: 96 },
  });
};

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
    isDarkMode,
  } = useApp();
  const isDark = isDarkMode;
  const styles = makeStyles(isDark);
  const mutedIcon = isDark ? '#475569' : '#94a3b8';

  const isAdmin = userRole === 'admin';

  const [activeTab, setActiveTab] = useState<AdminTab>('verifications');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionError, setActionError] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Moderation counters
  const [stats, setStats] = useState<AdminStats | null>(null);
  const refreshStats = useCallback(() => {
    fetchAdminStats().then((next) => {
      if (next) setStats(next);
    });
  }, []);

  // Evidence
  const [evidence, setEvidence] = useState<EvidenceRow[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceMissing, setEvidenceMissing] = useState(false);
  const [openingEvidence, setOpeningEvidence] = useState('');

  // Accounts directory
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoadingMore, setUsersLoadingMore] = useState(false);
  const [usersDirectoryMissing, setUsersDirectoryMissing] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<(typeof ROLE_FILTERS)[number]>('all');

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
    fetchAdminUsersPage({ query: userQuery, role: userRoleFilter, offset: users.length }).then(
      (page) => {
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
      }
    );
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
    Linking.openURL(url).catch(() => {
      setActionError('This document could not be opened on this device.');
    });
  };

  const evidenceFor = (listingId: string) => evidence.filter((row) => row.listingId === listingId);

  const metrics = {
    pendingDeeds: stats?.pendingDeeds ?? pendingListings.length,
    pendingReports: stats?.pendingReports ?? pendingReports.length,
    suspendedUsers: stats?.suspendedUsers ?? users.filter((u) => u.suspended).length,
  };

  const confirmAction = () => (pendingAction ? void handleConfirm() : undefined);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 0 }} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerInner}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Icon name="admin_panel_settings" size={20} color="#059669" />
                <View style={styles.headerTitleWrap}>
                  <Text style={styles.headerTitle}>Compliance & Reviewer Hub</Text>
                  <Text style={styles.headerSub}>
                    Audited evidence-based verification and moderation portal
                  </Text>
                </View>
              </View>
              <View style={styles.roleRow}>
                <Text style={styles.roleLabel}>Role:</Text>
                <View style={styles.roleChip}>
                  <Text style={styles.roleChipText}>{userRole}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* Queue counters */}
          <View style={styles.metricsRow}>
            {[
              { label: 'Pending deeds', value: metrics.pendingDeeds, icon: 'fact_check' },
              { label: 'Open reports', value: metrics.pendingReports, icon: 'report_problem' },
              { label: 'Suspended', value: metrics.suspendedUsers, icon: 'block' },
            ].map((cardMetric) => (
              <View key={cardMetric.label} style={styles.metricCard}>
                <Icon
                  name={cardMetric.icon}
                  size={18}
                  color={isDark ? '#34d399' : '#047857'}
                />
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.metricValue}>{cardMetric.value}</Text>
                  <Text style={styles.metricLabel} numberOfLines={1}>
                    {cardMetric.label}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.tabsWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.tabsContent}>
                <Pressable
                  onPress={() => setActiveTab('verifications')}
                  style={[styles.tab, activeTab === 'verifications' && styles.tabActive]}
                >
                  <View style={styles.tabInner}>
                    <Icon name="fact_check" size={18} color={activeTab === 'verifications' ? (isDark ? '#34d399' : '#047857') : mutedIcon} />
                    <Text style={[styles.tabText, activeTab === 'verifications' && styles.tabTextActive]}>
                      Title Audits ({pendingListings.length})
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => setActiveTab('reports')}
                  style={[styles.tab, activeTab === 'reports' && styles.tabActive]}
                >
                  <View style={styles.tabInner}>
                    <Icon name="report_problem" size={18} color={activeTab === 'reports' ? (isDark ? '#34d399' : '#047857') : mutedIcon} />
                    <Text style={[styles.tabText, activeTab === 'reports' && styles.tabTextActive]}>
                      Report Queue ({pendingReports.length})
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => setActiveTab('users')}
                  style={[styles.tab, activeTab === 'users' && styles.tabActive]}
                >
                  <View style={styles.tabInner}>
                    <Icon name="manage_accounts" size={18} color={activeTab === 'users' ? (isDark ? '#34d399' : '#047857') : mutedIcon} />
                    <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
                      Accounts
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => setActiveTab('audit')}
                  style={[styles.tab, activeTab === 'audit' && styles.tabActive]}
                >
                  <View style={styles.tabInner}>
                    <Icon name="history" size={18} color={activeTab === 'audit' ? (isDark ? '#34d399' : '#047857') : mutedIcon} />
                    <Text style={[styles.tabText, activeTab === 'audit' && styles.tabTextActive]}>
                      Audit Trail
                    </Text>
                  </View>
                </Pressable>
              </View>
            </ScrollView>
          </View>

          {actionError ? (
            <Text style={[styles.actionError, { marginBottom: 12 }]}>{actionError}</Text>
          ) : null}

          {activeTab === 'verifications' && (
            <View style={styles.stack}>
              {pendingListings.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Icon name="task_alt" size={36} color={mutedIcon} />
                  <Text style={styles.emptyTitle}>All Verification Queues Clear</Text>
                  <Text style={styles.emptyText}>
                    No title deeds currently awaiting auditor review.
                  </Text>
                </View>
              ) : (
                pendingListings.map((listing) => {
                  const docs = evidenceFor(listing.id);
                  return (
                    <View key={listing.id} style={styles.listingCard}>
                      <View style={styles.listingRow}>
                        {listing.image ? (
                          <Image source={{ uri: listing.image }} style={styles.thumb} resizeMode="cover" />
                        ) : (
                          <View style={styles.thumbPlaceholder}>
                            <Icon name="home_work" size={30} color={mutedIcon} />
                          </View>
                        )}
                        <View style={styles.listingBody}>
                          <View style={styles.listingTitleRow}>
                            <Text style={styles.listingTitle}>{listing.title}</Text>
                            <View style={styles.statusChip}>
                              <Text style={styles.statusChipText}>{listing.verificationStatus}</Text>
                            </View>
                          </View>
                          <Text style={styles.listingMeta}>
                            {listing.locationDetails} • Registry Code:{' '}
                            <Text style={styles.mono}>{listing.registryNumber}</Text>
                          </Text>
                          <Text style={styles.listingPrice}>Asking: {formatPrice(listing.price)}</Text>
                        </View>
                      </View>

                      {/* Attached evidence */}
                      <View style={styles.evidenceBox}>
                        <Text style={styles.evidenceTitle}>Evidence on file</Text>
                        {evidenceLoading ? (
                          <View style={{ gap: 6, paddingVertical: 4 }}>
                            <View style={[styles.skeletonLine, { width: '66%' }]} />
                            <View style={[styles.skeletonLine, { width: '50%' }]} />
                          </View>
                        ) : docs.length === 0 ? (
                          <Text style={styles.evidenceEmpty}>
                            {evidenceMissing
                              ? 'Document storage is not enabled yet — reviewing the registry reference only.'
                              : 'No documents attached. The broker supplied a registry reference only.'}
                          </Text>
                        ) : (
                          docs.map((doc) => (
                            <View key={doc.id} style={styles.evidenceRow}>
                              <Text style={styles.evidenceText} numberOfLines={1}>
                                <Text style={styles.evidenceType}>
                                  {EVIDENCE_LABELS[doc.evidenceType] || doc.evidenceType}
                                </Text>
                                {doc.registryNumber ? (
                                  <Text style={styles.mono}> • {doc.registryNumber}</Text>
                                ) : null}
                                {doc.issuerAuthority ? ` • ${doc.issuerAuthority}` : ''}
                              </Text>
                              {doc.documentPath ? (
                                <Pressable
                                  onPress={() => void openEvidenceDocument(doc.documentPath as string)}
                                  disabled={openingEvidence === doc.documentPath}
                                >
                                  <Text style={styles.evidenceLink}>
                                    {openingEvidence === doc.documentPath
                                      ? 'Opening…'
                                      : 'View document'}
                                  </Text>
                                </Pressable>
                              ) : (
                                <Text style={[styles.evidenceText, { flex: 0 }]}>Reference only</Text>
                              )}
                            </View>
                          ))
                        )}
                      </View>

                      {selectedListingId === listing.id ? (
                        <View style={styles.reviewBox}>
                          <TextInput
                            value={reviewNotes}
                            onChangeText={setReviewNotes}
                            placeholder="Auditor notes (e.g. Cadastral search confirmed, beacons inspected)..."
                            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                            multiline
                            style={styles.notesInput}
                          />
                          <View style={styles.decisionRow}>
                            <Pressable
                              onPress={() => handleDecision(listing.id, 'approved')}
                              style={[styles.decisionBtn, { backgroundColor: '#059669' }]}
                            >
                              <Text style={styles.decisionText}>Approve Deed</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleDecision(listing.id, 'more_info_required')}
                              style={[styles.decisionBtn, { backgroundColor: '#d97706' }]}
                            >
                              <Text style={styles.decisionText}>Request Proof</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleDecision(listing.id, 'rejected')}
                              style={[styles.decisionBtn, { backgroundColor: '#dc2626' }]}
                            >
                              <Text style={styles.decisionText}>Reject</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => setSelectedListingId(null)}
                              style={[styles.decisionBtn, styles.cancelBtn]}
                            >
                              <Text style={styles.cancelText}>Cancel</Text>
                            </Pressable>
                          </View>
                          <Pressable
                            onPress={() =>
                              setPendingAction({
                                title: 'Remove this listing?',
                                body: `${listing.title} will be pulled from the marketplace immediately. The removal is written to the audit trail.`,
                                confirmLabel: 'Remove listing',
                                destructive: true,
                                run: () => performRemoveListing(listing.id),
                              })
                            }
                          >
                            <Text style={styles.removeLink}>Remove listing from marketplace</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <View style={styles.listingFooter}>
                          <Text style={styles.listingFooterText}>
                            Submitted by: {listing.brokerName}
                          </Text>
                          <Pressable
                            onPress={() => {
                              setSelectedListingId(listing.id);
                              setReviewNotes('');
                            }}
                            style={styles.reviewBtn}
                          >
                            <Text style={styles.reviewBtnText}>Review Evidence</Text>
                            <Icon name="arrow_forward" size={14} color="#ffffff" />
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {activeTab === 'reports' && (
            <View style={styles.stack}>
              {pendingReports.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Icon name="check_circle" size={36} color={mutedIcon} />
                  <Text style={styles.emptyTitle}>No Pending Reports</Text>
                  <Text style={styles.emptyText}>
                    All community and buyer safety reports have been audited.
                  </Text>
                </View>
              ) : (
                pendingReports.map((report) => (
                  <View key={report.id} style={styles.listingCard}>
                    <View style={styles.reportHead}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.reportReason}>
                          <Text style={styles.reportReasonText}>
                            {report.reason.replace(/_/g, ' ').toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.reportTitle}>Report on: {report.targetTitle}</Text>
                      </View>
                      <Text style={styles.reportDate}>{report.createdAt}</Text>
                    </View>
                    <View style={styles.reportQuote}>
                      <Text style={styles.reportQuoteText}>“{report.description}”</Text>
                      <Text style={styles.reportBy}>Reported by: {report.reporterEmail}</Text>
                    </View>
                    <View style={styles.reportActions}>
                      <Pressable
                        onPress={() => {
                          resolveReport(report.id, 'resolved');
                          refreshStats();
                        }}
                        style={[styles.reportActionBtn, { backgroundColor: '#059669' }]}
                      >
                        <Text style={styles.reportActionText}>Resolve & Action</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          resolveReport(report.id, 'dismissed');
                          refreshStats();
                        }}
                        style={[styles.reportActionBtn, styles.dismissBtn]}
                      >
                        <Text style={styles.dismissText}>Dismiss (Inconclusive)</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'users' && (
            <View style={styles.stack}>
              {!isAdmin ? (
                <View style={styles.noticeCard}>
                  <Text style={styles.noticeText}>
                    Only administrators can suspend accounts or change roles. Reviewer decisions
                    are recorded in the audit trail.
                  </Text>
                </View>
              ) : null}

              <View style={styles.searchRow}>
                <View style={styles.searchBox}>
                  <Icon name="search" size={18} color={mutedIcon} />
                  <TextInput
                    value={userQuery}
                    onChangeText={setUserQuery}
                    placeholder="Search by name or account ID"
                    placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.searchInput}
                  />
                  {userQuery ? (
                    <Pressable
                      onPress={() => setUserQuery('')}
                      accessibilityLabel="Clear search"
                      style={styles.clearIcon}
                    >
                      <Icon name="close" size={16} color={mutedIcon} />
                    </Pressable>
                  ) : null}
                </View>
                <View style={styles.filterChips}>
                  {ROLE_FILTERS.map((role) => (
                    <Pressable
                      key={role}
                      onPress={() => setUserRoleFilter(role)}
                      style={[styles.filterChip, userRoleFilter === role && styles.filterChipActive]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          userRoleFilter === role && styles.filterChipTextActive,
                        ]}
                      >
                        {role === 'all' ? 'All roles' : `${role}s`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {usersLoading ? (
                <View style={{ gap: 8 }}>
                  {[0, 1, 2].map((row) => (
                    <View key={row} style={styles.skeletonCard}>
                      <View style={[styles.skeletonLine, { width: 150, height: 12 }]} />
                      <View style={[styles.skeletonLine, { width: 240 }]} />
                    </View>
                  ))}
                </View>
              ) : usersDirectoryMissing ? (
                <View style={styles.emptyCard}>
                  <Icon name="manage_accounts" size={36} color={mutedIcon} />
                  <Text style={styles.emptyTitle}>Account directory unavailable</Text>
                  <Text style={styles.emptyText}>
                    Enable the admin migration to list accounts here.
                  </Text>
                </View>
              ) : users.length === 0 ? (
                <Text style={styles.emptyText}>No accounts match this filter.</Text>
              ) : (
                <View style={{ gap: 12 }}>
                  {users.map((user) => {
                    const isSelf = Boolean(authUserId) && user.id === authUserId;
                    return (
                      <View key={user.id} style={styles.listingCard}>
                        <View>
                          <View style={styles.userRow}>
                            <Text style={styles.userName}>{user.name || 'Dilaal member'}</Text>
                            <View style={styles.roleTag}>
                              <Text style={styles.roleTagText}>{user.role}</Text>
                            </View>
                            {isSelf ? (
                              <View style={styles.selfTag}>
                                <Text style={styles.selfTagText}>You</Text>
                              </View>
                            ) : null}
                            {user.suspended ? (
                              <View style={styles.suspendedTag}>
                                <Text style={styles.suspendedTagText}>Suspended</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.userId}>{user.id}</Text>
                        </View>
                        {isAdmin && !isSelf ? (
                          <View style={styles.userActions}>
                            {(['user', 'broker', 'reviewer', 'admin'] as const).map((role) => (
                              <Pressable
                                key={role}
                                onPress={() => void handleRoleChange(user, role)}
                                style={[styles.roleBtn, user.role === role && styles.roleBtnActive]}
                              >
                                <Text
                                  style={[
                                    styles.roleBtnText,
                                    user.role === role && styles.roleBtnTextActive,
                                  ]}
                                >
                                  {role}
                                </Text>
                              </Pressable>
                            ))}
                            <Pressable
                              onPress={() =>
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
                              style={[
                                styles.actionBtn,
                                { backgroundColor: user.suspended ? '#059669' : '#dc2626' },
                              ]}
                            >
                              <Text style={styles.actionBtnText}>
                                {user.suspended ? 'Reinstate' : 'Suspend'}
                              </Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                  <View style={styles.pagerRow}>
                    <Text style={styles.pagerText}>
                      Showing {users.length} of {usersTotal}
                    </Text>
                    {users.length < usersTotal ? (
                      <Pressable
                        onPress={loadMoreUsers}
                        disabled={usersLoadingMore}
                        style={[styles.loadMoreBtn, usersLoadingMore && { opacity: 0.6 }]}
                      >
                        <Text style={styles.loadMoreText}>
                          {usersLoadingMore ? 'Loading…' : 'Load more accounts'}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              )}
            </View>
          )}

          {activeTab === 'audit' && (
            <View style={{ gap: 12 }}>
              <View style={{ gap: 8 }}>
                <TextInput
                  value={auditAction}
                  onChangeText={setAuditAction}
                  placeholder="Filter by action (e.g. VERIFICATION_APPROVED)"
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.auditFilterInput}
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={auditActor}
                    onChangeText={setAuditActor}
                    placeholder="Filter by actor email"
                    placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.auditFilterInput, { flex: 1 }]}
                  />
                  {auditAction || auditActor || auditFrom || auditTo ? (
                    <Pressable
                      onPress={() => {
                        setAuditAction('');
                        setAuditActor('');
                        setAuditFrom('');
                        setAuditTo('');
                      }}
                      style={[styles.actionBtn, { backgroundColor: isDark ? '#334155' : '#e2e8f0', justifyContent: 'center' }]}
                    >
                      <Text style={[styles.dismissText, { fontSize: 11 }]}>Clear</Text>
                    </Pressable>
                  ) : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={auditFrom}
                    onChangeText={setAuditFrom}
                    placeholder="From YYYY-MM-DD"
                    placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.auditFilterInput, { flex: 1 }]}
                  />
                  <TextInput
                    value={auditTo}
                    onChangeText={setAuditTo}
                    placeholder="To YYYY-MM-DD"
                    placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.auditFilterInput, { flex: 1 }]}
                  />
                </View>
              </View>

              <View style={styles.auditCard}>
                <View style={styles.auditHead}>
                  <Text style={styles.auditHeadText}>Auditable System Events</Text>
                  <Text style={styles.auditCount}>
                    {auditRows ? `${auditRows.length} loaded` : `${auditLogs.length} cached`}
                  </Text>
                </View>
                {auditLoading && !auditRows ? (
                  <View style={{ padding: 16, gap: 12 }}>
                    {[0, 1, 2].map((row) => (
                      <View key={row} style={{ gap: 6 }}>
                        <View style={[styles.skeletonLine, { width: 128 }]} />
                        <View style={[styles.skeletonLine, { width: '66%' }]} />
                      </View>
                    ))}
                  </View>
                ) : (auditRows ?? auditLogs).length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Icon name="history_toggle_off" size={30} color={mutedIcon} />
                    <Text style={styles.emptyTitle}>No Auditable Events Yet</Text>
                    <Text style={styles.emptyText}>
                      Administrative approvals, title deed decisions, and escrow milestones are
                      recorded here.
                    </Text>
                  </View>
                ) : (
                  <>
                    {(auditRows ?? auditLogs).map((log) => {
                      const createdAt = 'createdAt' in log ? log.createdAt : log.timestamp;
                      return (
                        <View key={log.id} style={styles.auditRow}>
                          <View style={styles.auditTop}>
                            <Text style={styles.auditAction}>[{log.action}]</Text>
                            <Text style={styles.auditTime}>
                              {createdAt ? new Date(createdAt).toLocaleString() : ''}
                            </Text>
                          </View>
                          <Text style={styles.auditEntity}>{log.targetEntity}</Text>
                          <Text style={styles.auditDetails}>{log.details}</Text>
                          <Text style={styles.auditActor}>
                            Actor: {log.actorEmail} ({log.actorRole})
                          </Text>
                        </View>
                      );
                    })}
                    {auditHasMore ? (
                      <View style={{ padding: 12, alignItems: 'center' }}>
                        <Pressable
                          onPress={() => loadAuditPage((auditRows ?? []).length, true)}
                          disabled={auditLoading}
                          style={[styles.loadMoreBtn, auditLoading && { opacity: 0.6 }]}
                        >
                          <Text style={styles.loadMoreText}>
                            {auditLoading ? 'Loading…' : 'Load older events'}
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </>
                )}
              </View>
            </View>
          )}

          <View style={styles.padBottom} />
        </View>
      </ScrollView>

      {/* Confirmation sheet for destructive moderation actions */}
      <Modal
        visible={Boolean(pendingAction)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!actionBusy) setPendingAction(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.sheetTitle}>{pendingAction?.title}</Text>
            <Text style={styles.sheetBody}>{pendingAction?.body}</Text>
            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => setPendingAction(null)}
                disabled={actionBusy}
                style={[styles.sheetBtn, styles.sheetCancel, actionBusy && { opacity: 0.6 }]}
              >
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmAction}
                disabled={actionBusy}
                style={[
                  styles.sheetBtn,
                  {
                    backgroundColor: pendingAction?.destructive ? '#dc2626' : '#059669',
                    opacity: actionBusy ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={styles.sheetConfirmText}>
                  {actionBusy ? 'Working…' : pendingAction?.confirmLabel}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

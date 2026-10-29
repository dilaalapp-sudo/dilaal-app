import React, { useCallback, useState } from 'react';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { ToastProvider } from './context/ToastContext';
import { AdminLayout, SCREEN_TITLES } from './layouts/AdminLayout';
import { AdminLoginScreen } from './screens/AdminLoginScreen';
import { AdminDashboardScreen } from './screens/AdminDashboardScreen';
import { AdminListingsScreen } from './screens/AdminListingsScreen';
import { AdminListingDetailScreen } from './screens/AdminListingDetailScreen';
import { AdminUsersScreen } from './screens/AdminUsersScreen';
import { AdminBrokersScreen } from './screens/AdminBrokersScreen';
import { AdminTeamScreen } from './screens/AdminTeamScreen';
import { AdminBusinessesScreen } from './screens/AdminBusinessesScreen';
import { AdminCategoriesScreen } from './screens/AdminCategoriesScreen';
import { AdminReportsScreen } from './screens/AdminReportsScreen';
import { AdminAuditLogsScreen } from './screens/AdminAuditLogsScreen';
import { AdminSettingsScreen } from './screens/AdminSettingsScreen';

/**
 * DILAAL Admin Panel — application shell.
 *
 * Renders exactly one of:
 *  - splash (auth verification in flight)
 *  - AdminLoginScreen (no session)
 *  - access-denied screen (authenticated but not an admin / suspended)
 *  - the admin dashboard inside AdminLayout (server-verified admin)
 */
export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <ToastProvider>
        <AdminAppShell />
      </ToastProvider>
    </AdminAuthProvider>
  );
}

const AdminAppShell: React.FC = () => {
  const { status, deniedMessage, signOut } = useAdminAuth();
  const [adminScreen, setAdminScreen] = useState<string>('dashboard');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  const openListingDetail = useCallback((id: string) => {
    setSelectedListingId(id);
    setAdminScreen('listing-detail');
  }, []);

  const backToListings = useCallback(() => {
    setSelectedListingId(null);
    setAdminScreen('listings');
  }, []);

  const handleScreenChange = useCallback((screen: string) => {
    if (screen !== 'listing-detail') setSelectedListingId(null);
    setAdminScreen(screen);
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-surface text-on-surface">
        <span className="material-symbols-outlined text-4xl text-primary animate-pulse mb-3">verified_user</span>
        <p className="text-sm text-outline">Loading DILAAL Admin…</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <AdminLoginScreen />;
  }

  if (status === 'denied') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-surface px-4">
        <div className="w-full max-w-sm text-center bg-surface-container rounded-2xl border border-outline-variant/25 p-8">
          <span className="material-symbols-outlined text-[44px] text-outline mb-4">shield_lock</span>
          <h2 className="text-base font-bold text-on-surface">Access Denied</h2>
          <p className="text-sm text-on-surface-variant mt-2">
            {deniedMessage ?? 'This account does not have administrator privileges.'}
          </p>
          <button
            onClick={() => signOut()}
            className="mt-6 px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors"
          >
            Sign In as Another Account
          </button>
        </div>
      </div>
    );
  }

  // status === 'authenticated' — server-verified admin only.
  const screenKey = adminScreen;
  const title = SCREEN_TITLES[screenKey] ?? 'Admin';
  const isDetail = screenKey === 'listing-detail';

  const renderScreen = () => {
    switch (screenKey) {
      case 'listings':
        return <AdminListingsScreen onOpenDetail={openListingDetail} />;
      case 'listing-detail':
        return selectedListingId ? (
          <AdminListingDetailScreen listingId={selectedListingId} onBack={backToListings} />
        ) : (
          <AdminListingsScreen onOpenDetail={openListingDetail} />
        );
      case 'users':
        return <AdminUsersScreen />;
      case 'brokers':
        return <AdminBrokersScreen />;
      case 'admin-team':
        return <AdminTeamScreen />;
      case 'businesses':
        return <AdminBusinessesScreen />;
      case 'categories':
        return <AdminCategoriesScreen />;
      case 'reports':
        return <AdminReportsScreen />;
      case 'audit-logs':
        return <AdminAuditLogsScreen />;
      case 'settings':
        return <AdminSettingsScreen />;
      case 'dashboard':
      default:
        return <AdminDashboardScreen onNavigate={handleScreenChange} />;
    }
  };

  return (
    <AdminLayout
      activeScreen={screenKey}
      onScreenChange={handleScreenChange}
      title={title}
      subtitle="DILAAL Marketplace Administration"
      breadcrumbs={isDetail ? ['Listings', 'Detail'] : undefined}
      onBack={isDetail ? backToListings : undefined}
    >
      {renderScreen()}
    </AdminLayout>
  );
};
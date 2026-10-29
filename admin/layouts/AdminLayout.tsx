import React, { useState } from 'react';
import { AdminSidebar } from '../components/AdminSidebar';
import { AdminHeader } from '../components/AdminHeader';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeScreen: string;
  onScreenChange: (screen: string) => void;
  title: string;
  subtitle?: string;
  breadcrumbs?: string[];
  onBack?: () => void;
}

/** Screen titles shared by the header and breadcrumbs. */
export const SCREEN_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  listings: 'Listing Moderation',
  'listing-detail': 'Listing Details',
  users: 'User Management',
  brokers: 'Broker Directory',
  'admin-team': 'Admin Team',
  businesses: 'Business Verification',
  categories: 'Category Management',
  reports: 'Reports & Disputes',
  'audit-logs': 'Audit Trail',
  settings: 'System Settings',
};

/**
 * Admin Panel shell: collapsible sidebar (desktop), drawer (mobile),
 * sticky header with breadcrumbs, and the scrollable content area.
 * Authorization is applied by AdminApp *before* this layout renders.
 */
export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  activeScreen,
  onScreenChange,
  title,
  subtitle,
  breadcrumbs,
  onBack,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-surface text-on-surface">
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Desktop offset mirrors the fixed sidebar width (collapsed or full). */}
        <div className={`hidden sm:block shrink-0 transition-all duration-300 ${collapsed ? 'w-[76px]' : 'w-64'}`} />
        <AdminSidebar
          activeScreen={activeScreen}
          onSelect={onScreenChange}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileMenuOpen}
          setMobileOpen={setMobileMenuOpen}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            title={title}
            subtitle={subtitle}
            breadcrumbs={breadcrumbs}
            onBack={onBack}
            onMenuClick={() => setMobileMenuOpen(true)}
          />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24">{children}</main>
        </div>
      </div>
    </div>
  );
};
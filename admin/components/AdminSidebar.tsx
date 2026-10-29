import React from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';

interface AdminNavItem {
  id: string;
  label: string;
  icon: string;
  section: 'management' | 'system';
}

const ADMIN_NAV: AdminNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', section: 'management' },
  { id: 'listings', label: 'Listings', icon: 'inventory', section: 'management' },
  { id: 'users', label: 'Users', icon: 'people', section: 'management' },
  { id: 'brokers', label: 'Brokers', icon: 'badge', section: 'management' },
  { id: 'admin-team', label: 'Admin Team', icon: 'shield_person', section: 'management' },
  { id: 'businesses', label: 'Businesses', icon: 'storefront', section: 'management' },
  { id: 'categories', label: 'Categories', icon: 'category', section: 'management' },
  { id: 'reports', label: 'Reports', icon: 'flag', section: 'management' },
  { id: 'audit-logs', label: 'Audit Logs', icon: 'history', section: 'system' },
  { id: 'settings', label: 'Settings', icon: 'settings', section: 'system' },
];

interface AdminSidebarProps {
  activeScreen: string;
  onSelect: (id: string) => void;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeScreen,
  onSelect,
  collapsed = false,
  setCollapsed,
  mobileOpen = false,
  setMobileOpen,
}) => {
  const { admin, signOut } = useAdminAuth();

  const renderItem = (item: AdminNavItem) => {
    const isActive = activeScreen === item.id;
    return (
      <button
        key={item.id}
        onClick={() => {
          onSelect(item.id);
          setMobileOpen?.(false);
        }}
        title={collapsed ? item.label : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors mb-1.5 ${
          isActive
            ? 'bg-primary-container text-on-primary'
            : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
        } ${collapsed ? 'justify-center px-0' : ''}`}
      >
        <span className="material-symbols-outlined w-5 text-center shrink-0">{item.icon}</span>
        {!collapsed && <span className={isActive ? 'font-semibold' : 'font-medium'}>{item.label}</span>}
      </button>
    );
  };

  const management = ADMIN_NAV.filter((i) => i.section === 'management');
  const system = ADMIN_NAV.filter((i) => i.section === 'system');

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen?.(false)} />
      )}
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 ${
          collapsed ? 'w-[76px]' : 'w-64'
        } bg-surface border-r border-outline-variant/25 z-40 flex flex-col transition-all duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
        }`}
      >
        <div className={`flex items-center px-5 py-4 border-b border-outline-variant/25 ${collapsed ? 'justify-center px-0' : 'justify-between'}`}>
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-primary text-lg shrink-0">admin_panel_settings</span>
              <span className="font-bold text-on-surface text-sm tracking-wide truncate">DILAAL Admin</span>
            </div>
          )}
          {collapsed && <span className="material-symbols-outlined text-primary text-lg">admin_panel_settings</span>}
          {setCollapsed && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden sm:block p-1.5 text-outline hover:text-on-surface transition-colors shrink-0"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="material-symbols-outlined text-lg">
                {collapsed ? 'right_panel_open' : 'left_panel_close'}
              </span>
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <div className="px-3 mb-1">
            {!collapsed && <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">Management</p>}
            {management.map(renderItem)}
          </div>

          <div className="px-3 mt-6">
            {!collapsed && <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">System</p>}
            {system.map(renderItem)}
          </div>

          <div className="px-3 mt-6">
            {!collapsed && (
              <div className="mb-2 p-3 rounded-xl bg-surface-container-high border border-outline-variant/20">
                <p className="text-[11px] font-bold text-on-surface truncate">{admin?.name ?? 'Administrator'}</p>
                <p className="text-[10px] text-outline truncate">{admin?.email}</p>
                <span className="mt-1.5 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-primary-container text-on-primary">
                  {admin?.role}
                </span>
              </div>
            )}
            <button
              onClick={() => signOut()}
              title={collapsed ? 'Sign out' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-error hover:bg-error-container/30 dark:hover:bg-error-container/40 transition-colors ${
                collapsed ? 'justify-center px-0' : ''
              }`}
            >
              <span className="material-symbols-outlined w-5 text-center shrink-0">logout</span>
              {!collapsed && <span className="font-medium">Sign Out</span>}
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
};
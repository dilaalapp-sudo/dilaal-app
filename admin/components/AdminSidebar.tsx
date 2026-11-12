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
        type="button"
        role="listitem"
        onClick={() => {
          onSelect(item.id);
          setMobileOpen?.(false);
        }}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
        className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset ${
          isActive
            ? 'bg-primary text-on-primary shadow-sm'
            : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
        } ${collapsed ? 'justify-center px-0' : ''}`}
      >
        <span
          className={`material-symbols-outlined w-5 text-center shrink-0 text-[20px] transition-transform duration-150 ${!isActive ? 'group-hover:scale-110' : ''}`}
          aria-hidden="true"
          style={{ fontVariationSettings: isActive ? "'FILL' 1, 'wght' 500" : "'FILL' 0, 'wght' 400" }}
        >
          {item.icon}
        </span>
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
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen?.(false)}
          aria-hidden="true"
        />
      )}
      {/* Sidebar */}
      <aside
        aria-label="Admin navigation"
        className={`fixed left-0 top-0 bottom-0 ${
          collapsed ? 'w-[76px]' : 'w-[260px]'
        } bg-surface-container-lowest/95 backdrop-blur-xl border-r border-outline-variant/20 z-40 flex flex-col transition-all duration-300 ease-out shadow-[var(--shadow-sm)] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
        }`}
      >
        <div className={`flex items-center h-16 px-4 border-b border-outline-variant/15 ${collapsed ? 'justify-center px-0' : 'justify-between'}`}>
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-sm shrink-0">
                <span className="material-symbols-outlined text-on-primary text-[18px]" aria-hidden="true">shield_person</span>
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-on-surface text-sm tracking-tight block leading-none">DILAAL</span>
                <span className="text-[10px] font-semibold text-primary uppercase tracking-widest">Admin</span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-on-primary text-[18px]" aria-hidden="true">shield_person</span>
            </div>
          )}
          {setCollapsed && !collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden sm:flex p-1.5 text-outline hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">left_panel_close</span>
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Primary">
          <div>
            {!collapsed && <p className="px-3 text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Management</p>}
            <div className="space-y-0.5" role="list">
              {management.map(renderItem)}
            </div>
          </div>

          <div>
            {!collapsed && <p className="px-3 text-[10px] font-bold text-outline uppercase tracking-widest mb-2">System</p>}
            <div className="space-y-0.5" role="list">
              {system.map(renderItem)}
            </div>
          </div>
        </nav>

        <div className="p-3 border-t border-outline-variant/15 space-y-2">
          {!collapsed && (
            <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/15">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {(admin?.name || admin?.email || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-on-surface truncate">{admin?.name ?? 'Administrator'}</p>
                  <p className="text-[10px] text-on-surface-variant truncate">{admin?.email}</p>
                </div>
              </div>
              <span className="mt-2 inline-flex px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-primary/10 text-primary ring-1 ring-primary/20">
                {admin?.role ?? 'admin'}
              </span>
            </div>
          )}
          {collapsed && setCollapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              className="hidden sm:flex w-full items-center justify-center p-2 text-outline hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">right_panel_open</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => signOut()}
            aria-label="Sign out"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-colors focus-visible:ring-2 focus-visible:ring-error/40 ${
              collapsed ? 'justify-center px-0' : ''
            }`}
          >
            <span className="material-symbols-outlined w-5 text-center shrink-0 text-[20px]" aria-hidden="true">logout</span>
            {!collapsed && <span className="font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
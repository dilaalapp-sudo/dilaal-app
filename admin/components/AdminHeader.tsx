import React from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  /** Breadcrumb trail rendered after the "Admin" root, e.g. ['Listings', 'Detail']. */
  breadcrumbs?: string[];
  onBack?: () => void;
  onMenuClick?: () => void;
  showUser?: boolean;
  /** Opens the command palette / global search */
  onOpenSearch?: () => void;
  /** Optional slot for additional actions */
  actions?: React.ReactNode;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  onBack,
  onMenuClick,
  showUser = true,
  onOpenSearch,
  actions,
}) => {
  const { admin } = useAdminAuth();

  return (
    <header className="bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 sticky top-0 z-20">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16 gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              aria-label="Open navigation menu"
              className="p-2 -ml-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors md:hidden focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">menu</span>
            </button>
          )}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="p-2 -ml-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_back</span>
            </button>
          )}
          <div className="min-w-0">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-1 text-[11px] text-on-surface-variant mb-0.5" aria-label="Breadcrumb">
                <span className="font-medium">Admin</span>
                {breadcrumbs.map((crumb, i) => (
                  <React.Fragment key={i}>
                    <span className="material-symbols-outlined text-[14px] text-outline" aria-hidden="true">chevron_right</span>
                    <span
                      className={i === breadcrumbs.length - 1 ? 'text-on-surface font-semibold' : 'font-medium'}
                      aria-current={i === breadcrumbs.length - 1 ? 'page' : undefined}
                    >
                      {crumb}
                    </span>
                  </React.Fragment>
                ))}
              </nav>
            )}
            <h1 className="text-base sm:text-lg font-extrabold text-on-surface tracking-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs text-on-surface-variant truncate hidden sm:block">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              aria-label="Open search (Ctrl+K)"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container hover:border-outline-variant/50 transition-all shadow-[var(--shadow-xs)] focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">search</span>
              <span className="text-xs font-medium">Search...</span>
              <kbd className="ml-2 hidden md:inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-container border border-outline-variant/20">Ctrl K</kbd>
            </button>
          )}
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              aria-label="Open search"
              className="sm:hidden p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">search</span>
            </button>
          )}
          {actions}
          {showUser && admin && (
            <div className="hidden md:flex items-center gap-2.5 pl-3 pr-1.5 py-1 rounded-full bg-surface-container border border-outline-variant/20">
              <span className="text-xs font-medium text-on-surface-variant truncate max-w-[160px]">
                {admin.name || admin.email}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary ring-1 ring-primary/20">
                {admin.role}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
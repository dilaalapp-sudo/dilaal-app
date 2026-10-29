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
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  onBack,
  onMenuClick,
  showUser = true,
}) => {
  const { admin } = useAdminAuth();

  return (
    <div className="bg-surface-container/50 border-b border-outline-variant/25 sticky top-0 z-20 backdrop-blur bg-surface/80">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-outline hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 text-outline hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container-high md:hidden"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          )}
          <div className="min-w-0">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-1 text-[10px] text-outline mb-0.5" aria-label="Breadcrumb">
                <span>Admin</span>
                {breadcrumbs.map((crumb, i) => (
                  <React.Fragment key={i}>
                    <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                    <span className={i === breadcrumbs.length - 1 ? 'text-on-surface-variant font-semibold' : ''}>
                      {crumb}
                    </span>
                  </React.Fragment>
                ))}
              </nav>
            )}
            <h2 className="text-sm font-bold text-on-surface truncate">{title}</h2>
            {subtitle && <p className="text-[11px] text-outline truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {showUser && admin && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant/25">
              <span className="text-[10px] font-medium text-on-surface-variant truncate max-w-[140px]">
                {admin.name || admin.email}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-primary-container text-on-primary border-primary/50">
                {admin.role}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
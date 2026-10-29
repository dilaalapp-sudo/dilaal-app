import React from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';

interface AdminAccessGuardProps {
  children: React.ReactNode;
}

/**
 * Defense-in-depth client guard. The server independently enforces admin
 * authorization on every /api/admin/* call (requireAdmin); this component
 * only prevents brief UI flashes while verification is in flight.
 */
export const AdminAccessGuard: React.FC<AdminAccessGuardProps> = ({ children }) => {
  const { status } = useAdminAuth();

  if (status === 'loading') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center w-full py-12 px-6 text-center bg-surface text-on-surface">
        <span className="material-symbols-outlined text-[40px] text-outline mb-3 animate-pulse">verified_user</span>
        <p className="text-sm text-on-surface-variant">Verifying admin access…</p>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center w-full py-12 px-6 text-center bg-surface text-on-surface">
        <span className="material-symbols-outlined text-[40px] text-outline mb-3">shield_lock</span>
        <h3 className="text-base font-bold text-on-surface">Access Restricted</h3>
        <p className="text-sm text-on-surface-variant mt-1 max-w-xs">
          Admin privileges are required to use this area.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
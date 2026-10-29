import React, { useEffect, useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { adminJson } from '../lib/adminApi';

interface SystemSettings {
  marketplaceName: string;
  escrowMode: string;
  registrationEnabled: boolean;
  emailConfirmationRequired: boolean;
  defaultCurrency: string;
  supportedPaymentMethods: string[];
}

/**
 * System Settings — READ-ONLY. GET /api/admin/settings is the only settings
 * endpoint the backend implements; there is deliberately no edit control
 * because no write path exists yet.
 */
export const AdminSettingsScreen: React.FC = () => {
  const { admin } = useAdminAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await adminJson<SystemSettings>('/api/admin/settings');
        if (!cancelled) setSettings(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load settings.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Admin profile */}
      <div className="bg-surface-container rounded-2xl border border-outline-variant/25 p-5">
        <h3 className="text-sm font-bold text-on-surface mb-4">Your Admin Profile</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-outline">Name</span>
            <span className="text-on-surface font-medium">{admin?.name ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-outline">Email</span>
            <span className="text-on-surface font-medium">{admin?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-outline">Role</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary-container text-on-primary">{admin?.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-outline">Account ID</span>
            <span className="text-on-surface-variant font-mono text-xs truncate max-w-[240px]">{admin?.id}</span>
          </div>
        </div>
        <p className="text-[11px] text-outline mt-4">
          Roles are managed server-side. Use the Admin Team screen to grant or revoke access.
        </p>
      </div>

      {/* System settings (read-only) */}
      <div className="bg-surface-container rounded-2xl border border-outline-variant/25 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-on-surface">System Configuration</h3>
          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-outline-variant text-outline">Read-only</span>
        </div>

        {loading ? (
          <LoadingSkeleton height="200" />
        ) : error ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-error-container/20 border border-error/30 text-sm text-error">
            <span className="material-symbols-outlined text-lg">error</span>
            {error}
          </div>
        ) : settings ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-outline">Marketplace</span><span className="text-on-surface font-medium">{settings.marketplaceName}</span></div>
            <div className="flex justify-between"><span className="text-outline">Escrow mode</span><span className="text-on-surface font-medium capitalize">{settings.escrowMode.replaceAll('_', ' ')}</span></div>
            <div className="flex justify-between"><span className="text-outline">Registration</span><span className="text-on-surface font-medium">{settings.registrationEnabled ? 'Enabled' : 'Disabled'}</span></div>
            <div className="flex justify-between"><span className="text-outline">Email confirmation</span><span className="text-on-surface font-medium">{settings.emailConfirmationRequired ? 'Required' : 'Auto-confirmed'}</span></div>
            <div className="flex justify-between"><span className="text-outline">Default currency</span><span className="text-on-surface font-medium">{settings.defaultCurrency}</span></div>
            <div>
              <p className="text-outline mb-1.5">Payment methods</p>
              <div className="flex flex-wrap gap-1.5">
                {settings.supportedPaymentMethods.map((m) => (
                  <span key={m} className="px-2 py-1 rounded-md text-[10px] font-bold bg-surface-container-high text-on-surface-variant font-mono">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
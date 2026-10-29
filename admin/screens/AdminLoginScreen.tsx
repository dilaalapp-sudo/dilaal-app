import React, { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';

/**
 * Dedicated Admin Panel login.
 *
 * Credentials are verified by Supabase Auth, then privileges are re-verified
 * server-side (GET /api/admin/me) before the dashboard is shown. Ordinary
 * users receive a clear rejection — signing in never grants admin privileges
 * by itself, and there is no self-service registration here.
 */
export const AdminLoginScreen: React.FC = () => {
  const { signIn, isConfigured } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await signIn(email, password);
      if (!result.ok) {
        setError(result.error);
      }
    } catch {
      setError('Unexpected error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-container mb-4">
            <span className="material-symbols-outlined text-3xl text-on-primary">admin_panel_settings</span>
          </div>
          <h1 className="text-xl font-bold text-on-surface">DILAAL Admin</h1>
          <p className="text-sm text-outline mt-1">Marketplace operations panel</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface-container rounded-2xl border border-outline-variant/25 shadow-sm p-6 space-y-4"
        >
          <div>
            <label htmlFor="admin-email" className="block text-[11px] font-bold text-outline uppercase mb-1.5">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface outline-none focus:ring-2 focus:ring-primary/60"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-[11px] font-bold text-outline uppercase mb-1.5">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-outline-variant bg-surface text-on-surface outline-none focus:ring-2 focus:ring-primary/60"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-error-container/20 border border-error/30 text-xs text-error">
              <span className="material-symbols-outlined text-sm mt-px">error</span>
              <span>{error}</span>
            </div>
          )}

          {!isConfigured && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-pending-container/20 border border-pending/30 text-xs text-on-pending-container">
              <span className="material-symbols-outlined text-sm mt-px">warning</span>
              <span>Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !email || !password || !isConfigured}
            className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                Verifying…
              </>
            ) : (
              'Sign In'
            )}
          </button>

          <p className="text-[11px] text-outline text-center leading-relaxed">
            Access is restricted to authorized administrators. All sign-in attempts and admin actions are recorded in the audit log.
          </p>
        </form>
      </div>
    </div>
  );
};

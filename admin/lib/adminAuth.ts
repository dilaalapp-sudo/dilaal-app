import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import type { AdminIdentity, AdminSignInResult } from './types';

/**
 * DILAAL Admin Panel — authentication & authorization layer.
 *
 * Flow:
 *  1. Sign in with email + password against the shared Supabase Auth project.
 *  2. Call GET /api/admin/me with the session JWT. The server verifies the
 *     token with the service-role key and re-reads profiles.role from the
 *     database — the client never decides its own role.
 *  3. Only a verified 'admin' (non-suspended) identity is accepted.
 *
 * Signing in NEVER grants admin privileges by itself; ordinary users get a
 * clear "not authorized" result and no admin state is stored.
 */

const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? '';

/** Basic client-side email check (Supabase enforces its own rules server-side). */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** Current Supabase session (used to attach Bearer tokens to admin API calls). */
export async function getCurrentSession(): Promise<Session | null> {
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/** Access token for the current session, or null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.access_token ?? null;
}

/**
 * Verify admin privileges server-side. Returns the trusted identity for a
 * real admin, or a typed failure reason. Never trusts client state.
 */
export async function verifyAdminAccess(): Promise<
  { ok: true; admin: AdminIdentity } | { ok: false; error: string; reason: 'unauthenticated' | 'not_admin' | 'suspended' | 'network' | 'not_configured' }
> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: 'Supabase is not configured for the admin panel.', reason: 'not_configured' };
  }
  const token = await getAccessToken();
  if (!token) {
    return { ok: false, error: 'Not signed in.', reason: 'unauthenticated' };
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return { ok: false, error: 'Could not reach the server to verify access.', reason: 'network' };
  }

  if (res.status === 401) {
    return { ok: false, error: 'Your session has expired. Sign in again.', reason: 'unauthenticated' };
  }
  if (res.status === 403) {
    const body = await res.json().catch(() => ({}));
    const message = (body as { error?: string }).error ?? 'Admin access required.';
    const suspended = /suspend/i.test(message);
    return { ok: false, error: message, reason: suspended ? 'suspended' : 'not_admin' };
  }
  if (!res.ok) {
    return { ok: false, error: `Access verification failed (${res.status}).`, reason: 'network' };
  }

  const admin = (await res.json()) as AdminIdentity;
  return { ok: true, admin };
}

/**
 * Sign in with email + password, then verify admin privileges server-side.
 * On success the session is persisted by supabase-js; on failure nothing
 * privileged is stored or rendered.
 */
export async function signInAsAdmin(email: string, password: string): Promise<AdminSignInResult> {
  if (!supabase) return { ok: false, error: 'Supabase is not configured.', reason: 'not_configured' };
  if (!isValidEmail(email)) {
    return { ok: false, error: 'Enter a valid email address.', reason: 'invalid_credentials' };
  }

  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    const msg = error.message ?? '';
    const code = error.code ?? '';
    const lower = msg.toLowerCase();

    // Log the full error so the browser console shows exactly what Supabase said.
    if (import.meta.env.DEV) {
      console.error('[DILAAL-ADMIN] signInWithPassword failed:', { message: msg, code, status: error.status });
    }

    const invalid =
      lower.includes('invalid login') ||
      lower.includes('invalid credentials') ||
      code === 'invalid_credentials';

    if (invalid) {
      return {
        ok: false,
        error: 'Incorrect email or password.',
        reason: 'invalid_credentials',
      };
    }
    return {
      ok: false,
      error: msg || 'Sign-in failed.',
      reason: 'network',
    };
  }

  const verification = await verifyAdminAccess();
  if (!verification.ok) {
    // Not an admin (or suspended): end the session immediately so an ordinary
    // marketplace session is not left active inside the admin app.
    await supabase.auth.signOut().catch(() => {});
    return { ok: false, error: verification.error, reason: verification.reason };
  }
  return { ok: true };
}

/** Real sign-out: clears the Supabase session and all local auth state. */
export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/** Subscribe to auth state changes (session restore on refresh, sign-out). */
export function subscribeToAuthChanges(cb: (session: Session | null) => void): () => void {
  if (!supabase) return () => {};
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session);
  });
  // Emit the current session immediately so restore does not wait for an event.
  getCurrentSession().then((s) => cb(s));
  return () => listener.subscription.unsubscribe();
}
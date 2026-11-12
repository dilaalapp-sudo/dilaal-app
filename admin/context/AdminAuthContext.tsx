import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  signInAsAdmin,
  signOut as authSignOut,
  subscribeToAuthChanges,
  verifyAdminAccess,
} from '../lib/adminAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import type { AdminIdentity, AdminSignInResult } from '../lib/types';

/**
 * Admin Panel auth state machine.
 *
 * status:
 *  - 'loading'          → initial session restore / verification in flight
 *  - 'unauthenticated'  → no session (show the login screen)
 *  - 'denied'           → signed in, but the server said "not admin"/"suspended"
 *  - 'authenticated'    → server-verified admin (show the admin app)
 */
export type AdminAuthStatus = 'loading' | 'unauthenticated' | 'denied' | 'authenticated';

interface AdminAuthContextValue {
  status: AdminAuthStatus;
  admin: AdminIdentity | null;
  /** Failure reason for the 'denied' state (shown on the access-denied screen). */
  deniedMessage: string | null;
  isConfigured: boolean;
  /** Sign in + server-side verification. Resolves with the typed result. */
  signIn: (email: string, password: string) => Promise<AdminSignInResult>;
  /** Real sign-out: clears the Supabase session and resets local state. */
  signOut: () => Promise<void>;
  /** Re-run server-side verification (e.g. after sensitive actions). */
  refresh: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AdminAuthStatus>('loading');
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [deniedMessage, setDeniedMessage] = useState<string | null>(null);
  // Guards against overlapping verification runs from rapid auth events.
  const verifyingRef = useRef(false);

  const runVerification = useCallback(async () => {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    try {
      const result = await verifyAdminAccess();
      if ('ok' in result && result.ok) {
        setAdmin(result.admin);
        setDeniedMessage(null);
        setStatus('authenticated');
        return;
      }
      setAdmin(null);
      if ('reason' in result && result.reason === 'unauthenticated') {
        setDeniedMessage(null);
        setStatus('unauthenticated');
      } else if ('error' in result) {
        setDeniedMessage(result.error);
        setStatus('denied');
      } else {
        setDeniedMessage('Access denied.');
        setStatus('denied');
      }
    } finally {
      verifyingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus('unauthenticated');
      return;
    }
    const unsubscribe = subscribeToAuthChanges((session: Session | null) => {
      if (!session) {
        setAdmin(null);
        setDeniedMessage(null);
        setStatus('unauthenticated');
        return;
      }
      // Session exists (restored or fresh) — always verify privileges server-side.
      runVerification();
    });
    return unsubscribe;
  }, [runVerification]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AdminSignInResult> => {
      const result = await signInAsAdmin(email, password);
      if ('ok' in result && result.ok) {
        await runVerification();
        return result;
      }
      if ('reason' in result && (result.reason === 'not_admin' || result.reason === 'suspended')) {
        setDeniedMessage(result.error);
        setStatus('denied');
      }
      return result;
    },
    [runVerification]
  );

  const signOut = useCallback(async () => {
    await authSignOut();
    setAdmin(null);
    setDeniedMessage(null);
    setStatus('unauthenticated');
  }, []);

  const refresh = useCallback(async () => {
    await runVerification();
  }, [runVerification]);

  const value = useMemo<AdminAuthContextValue>(
    () => ({ status, admin, deniedMessage, isConfigured: isSupabaseConfigured, signIn, signOut, refresh }),
    [status, admin, deniedMessage, signIn, signOut, refresh]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

/** Access the admin auth state. Throws outside AdminAuthProvider. */
export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
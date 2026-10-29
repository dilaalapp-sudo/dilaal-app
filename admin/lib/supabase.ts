import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * DILAAL Admin Panel — Supabase browser client.
 *
 * Connects to the SAME Supabase project as the marketplace app by reusing the
 * same environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
 * This is a separate client instance so the two apps never share runtime
 * state; the database, auth users, and RLS policies are shared by design.
 *
 * The service-role key is NEVER present here — it lives only on the Express
 * server (server.ts) and is used exclusively by the /api/admin/* routes.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured: boolean = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[DILAAL-ADMIN] Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.'
  );
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
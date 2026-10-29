import { getAccessToken } from './adminAuth';

/**
 * DILAAL Admin Panel — typed API client for the /api/admin/* Express routes.
 *
 * Uses the admin app's own Supabase session (via adminAuth) as the Bearer
 * token. Every endpoint is authorized server-side by requireAdmin, which
 * verifies the JWT with the service-role key and re-checks profiles.role.
 *
 * Base URL: same-origin by default ('' → relative /api/...), which works
 * when the panel is served by the main server (dev / single-host deploy)
 * or behind a reverse proxy. Set VITE_API_BASE_URL when the API lives on
 * a different origin (e.g. admin panel on its own subdomain).
 */

const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? '';

/** Parse a JSON error body from an admin API response, if present. */
export async function apiErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

/** Call a DILAAL admin API endpoint with the admin's JWT as Bearer token. */
export async function adminFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

/** Typed helper that parses JSON and throws on non-ok responses. */
export async function adminJson<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await adminFetch(path, init);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Admin API ${res.status}: ${body || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
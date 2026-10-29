/**
 * DILAAL Admin Panel — local type definitions.
 *
 * Deliberately self-contained: the admin app does not import marketplace
 * types so the two applications stay decoupled. Values mirror the
 * `user_role` enum and API response shapes from server.ts.
 */

export type AdminRole = 'admin' | 'reviewer';

/** Roles assignable through the Admin Team screen ('buyer' = revoke access). */
export type AssignableRole = AdminRole | 'buyer';

/** The verified admin identity, as returned by GET /api/admin/me. */
export interface AdminIdentity {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
}

/** Result of the sign-in + server-side admin verification flow. */
export type AdminSignInResult =
  | { ok: true }
  | { ok: false; error: string; reason: 'invalid_credentials' | 'not_admin' | 'suspended' | 'not_configured' | 'network' | 'unauthenticated' };

/** Shared pagination envelope returned by most admin list endpoints. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
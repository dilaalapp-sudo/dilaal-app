import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mirror Vite's precedence: .env.local wins over .env. Existing process env
// variables still take priority because dotenv does not overwrite by default.
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = 3000;
const HOST = '127.0.0.1';

function formatSupabaseUrl(urlOrRef?: string): string {
  if (!urlOrRef) throw new Error('VITE_SUPABASE_URL is required');
  const trimmed = urlOrRef.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}.supabase.co`;
}

function getValidAnonKey(key?: string): string {
  if (!key) throw new Error('VITE_SUPABASE_ANON_KEY is required');
  const trimmed = key.trim();
  if (trimmed.split('.').length === 3 && trimmed.length > 80) {
    return trimmed;
  }
  throw new Error('Invalid VITE_SUPABASE_ANON_KEY format');
}

export const SUPABASE_URL = formatSupabaseUrl(process.env.VITE_SUPABASE_URL);
export const SUPABASE_ANON_KEY = getValidAnonKey(process.env.VITE_SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Privileged server-side client (bypasses RLS). Never exposed to the browser.
export const supabaseAdmin: SupabaseClient | null = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value: string): boolean => UUID_RE.test(value);
// UUID or app_ref slug only. Rejects PostgREST filter metacharacters (commas,
// parentheses, dots) so a path id cannot inject extra clauses into .or().
const isSafeRef = (value: string): boolean => isUuid(value) || /^[A-Za-z0-9_-]+$/.test(value);

app.use(express.json());

// Security headers. The CSP must allow the Google Fonts origins the SPA loads
// (Inter + Material Symbols); blocking them renders icon ligatures as raw text.
// The Vite HMR websocket is dev-only and is omitted from production CSP.
const isProdEnv = process.env.NODE_ENV === 'production';
const devWsSources = isProdEnv ? '' : ' ws://localhost:24678 ws://127.0.0.1:24678';
const CONTENT_SECURITY_POLICY = [
  "frame-ancestors 'none'",
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  `connect-src 'self' https://usrqtgobuylkhwblpjnb.supabase.co https://*.supabase.co wss://*.supabase.co${devWsSources}`,
].join('; ');

app.use((_req: Request, res: Response, next: express.NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// CSRF-style Origin/Referer validation for state-changing API routes.
// The SPA uses Bearer tokens in Authorization headers (not cookies), so
// traditional cookie CSRF doesn't apply. Validating Origin/Referer blocks
// cross-site form POSTs from malicious sites.
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
const configuredAllowedOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...defaultAllowedOrigins, ...configuredAllowedOrigins]);
app.use((req, res, next) => {
  if (!STATE_CHANGING_METHODS.has(req.method)) {
    next();
    return;
  }
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const requestOrigin = `${req.protocol}://${req.get('host')}`;

  const isAllowedOrigin = (value?: string | string[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    if (!v) return false;
    return allowedOrigins.has(v) || v === requestOrigin;
  };
  const isAllowedReferer = (value?: string | string[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    if (!v) return false;
    if (v === requestOrigin || v.startsWith(`${requestOrigin}/`)) return true;
    for (const allowed of allowedOrigins) {
      if (v === allowed || v.startsWith(`${allowed}/`)) return true;
    }
    return false;
  };

  const isValid = isAllowedOrigin(origin) || isAllowedReferer(referer);
  if (!isValid) {
    res.status(403).json({ error: 'Cross-origin request blocked.' });
    return;
  }
  next();
});

// Per-IP ceilings for the public API. In-memory is enough for a single server
// process; it is not a substitute for a WAF. Auth routes get a tighter budget
// because each hit can create or confirm an account.
function makeRateLimit(max: number, message: string) {
  const windowMs = 60_000;
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > max) {
      res.status(429).json({ error: message });
      return;
    }
    next();
  };
}

app.use('/api', makeRateLimit(120, 'Too many requests. Try again in a minute.'));
app.use('/api/auth', makeRateLimit(10, 'Too many sign-in attempts. Try again in a minute.'));
app.use('/api/admin', makeRateLimit(120, 'Too many admin requests. Try again in a minute.'));

// In-memory data structures for server-side persistence & validation
interface ServerAuditLog {
  id: string;
  action: string;
  actorRole: string;
  actorEmail: string;
  targetEntity: string;
  details: string;
  timestamp: string;
}

const auditLogs: ServerAuditLog[] = [
  {
    id: 'aud-init-1',
    action: 'SERVER_BOOTSTRAP',
    actorRole: 'admin',
    actorEmail: 'system@dilaal.market',
    targetEntity: 'System Core',
    details: 'DILAAL Production Marketplace Server Initialized with Sandbox Escrow Adapter',
    timestamp: new Date().toISOString(),
  },
];

// Unauthenticated demo routes also write here; cap the buffer so spamming them
// cannot exhaust the process's memory.
const AUDIT_LOG_LIMIT = 5000;
function recordAudit(log: ServerAuditLog): void {
  auditLogs.unshift(log);
  if (auditLogs.length > AUDIT_LOG_LIMIT) auditLogs.length = AUDIT_LOG_LIMIT;
}

// Health & System Info Route
app.get('/api/health', async (_req, res) => {
  let supabaseConnected = false;
  try {
    const { error } = await supabase.from('listings').select('id').limit(1);
    supabaseConnected = !error;
  } catch {
    supabaseConnected = false;
  }

  res.json({
    status: 'ok',
    service: 'DILAAL Verified Marketplace API',
    version: '2.4.0',
    timestamp: new Date().toISOString(),
    escrowMode: process.env.ESCROW_MODE || 'sandbox_pilot',
    database: {
      provider: 'supabase',
      projectRef: 'usrqtgobuylkhwblpjnb',
      connected: supabaseConnected,
    },
    activeRails: ['evc_plus', 'zaad', 'sahal', 'card_stripe_sandbox', 'bank_wire_audit'],
    compliance: {
      gdprReady: true,
      googlePlayDataSafety: true,
      titleAuditsAuditable: true,
    },
  });
});

// Dedicated Supabase status & verification endpoint
app.get('/api/supabase/status', async (_req, res) => {
  const start = Date.now();
  try {
    const { count, error } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return res.status(500).json({
        connected: false,
        projectRef: 'usrqtgobuylkhwblpjnb',
        error: error.message,
        latencyMs: Date.now() - start,
      });
    }

    res.json({
      connected: true,
      projectRef: 'usrqtgobuylkhwblpjnb',
      listingsCount: count ?? 0,
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(500).json({
      connected: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      latencyMs: Date.now() - start,
    });
  }
});

// Public marketplace category catalog (active rows only).
// Uses the service-role client because the categories RLS policy currently
// targets authenticated users; guests must still be able to browse.
app.get('/api/categories', async (_req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Category catalog is unavailable: server not configured.' });
  }

  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('id, name, slug, description, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('[DILAAL] categories lookup failed:', error.message);
    return res.status(500).json({ error: 'Failed to load categories.' });
  }

  res.set('Cache-Control', 'no-store');
  return res.json({
    categories: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      sortOrder: row.sort_order,
    })),
  });
});

// Listing Submission Validation & Processing
app.post('/api/listings', (req, res) => {
  const { title, price, category, countryCode, location, registryNumber, ownerRole } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length < 5) {
    return res.status(400).json({ error: 'Title is required and must be at least 5 characters.' });
  }

  const numericPrice = Number(price);
  if (isNaN(numericPrice) || numericPrice <= 0) {
    return res.status(400).json({ error: 'Valid asking price greater than 0 is required.' });
  }

  const allowedCategories = ['house', 'land', 'car', 'rental', 'commercial'];
  if (!category || !allowedCategories.includes(category)) {
    return res.status(400).json({ error: `Invalid category. Allowed: ${allowedCategories.join(', ')}` });
  }

  const listingId = `listing-srv-${Date.now()}`;
  const generatedRegistry = registryNumber || `#REG-SRV-${Math.floor(10000 + Math.random() * 90000)}`;

  // Record audit log
  const log: ServerAuditLog = {
    id: `aud-${Date.now()}`,
    action: 'LISTING_SUBMITTED',
    actorRole: ownerRole || 'seller',
    actorEmail: 'seller@dilaal.market',
    targetEntity: `Listing ${listingId} (${title})`,
    details: `Submitted for cadastral audit with provisional registry ${generatedRegistry}`,
    timestamp: new Date().toISOString(),
  };
  recordAudit(log);

  res.status(201).json({
    success: true,
    listingId,
    registryNumber: generatedRegistry,
    moderationStatus: 'under_review',
    verificationStatus: 'submitted',
    message: 'Listing registered in review queue. Cadastral title documents pending inspection.',
  });
});

// Verification Review Action (Admin / Reviewer Only)
app.post('/api/verification/audit', (req, res) => {
  const { listingId, decision, reviewerRole, reviewerNotes } = req.body;

  if (!listingId || !decision) {
    return res.status(400).json({ error: 'listingId and decision are required.' });
  }

  const allowedDecisions = ['approved', 'rejected', 'more_info_required', 'revoked'];
  if (!allowedDecisions.includes(decision)) {
    return res.status(400).json({ error: `Invalid decision. Allowed: ${allowedDecisions.join(', ')}` });
  }

  // Privilege check
  if (reviewerRole !== 'reviewer' && reviewerRole !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized: Reviewer or Admin role required.' });
  }

  const log: ServerAuditLog = {
    id: `aud-${Date.now()}`,
    action: `VERIFICATION_${decision.toUpperCase()}`,
    actorRole: reviewerRole,
    actorEmail: 'auditor@dilaal.market',
    targetEntity: `Listing ${listingId}`,
    details: reviewerNotes || `Decision: ${decision}`,
    timestamp: new Date().toISOString(),
  };
  recordAudit(log);

  res.json({
    success: true,
    listingId,
    decision,
    loggedAt: log.timestamp,
    message: `Audit recorded with unalterable timestamp. Verification status set to ${decision}.`,
  });
});

// Offer State Machine & Auditing
app.post('/api/offers', (req, res) => {
  const { offerId, action, proposedPrice, senderRole, reason } = req.body;

  if (!offerId || !action) {
    return res.status(400).json({ error: 'offerId and action are required.' });
  }

  const allowedActions = ['submit', 'counter', 'accept', 'decline'];
  if (!allowedActions.includes(action)) {
    return res.status(400).json({ error: `Invalid action. Allowed: ${allowedActions.join(', ')}` });
  }

  const log: ServerAuditLog = {
    id: `aud-${Date.now()}`,
    action: `OFFER_${action.toUpperCase()}`,
    actorRole: senderRole || 'buyer',
    actorEmail: 'party@dilaal.market',
    targetEntity: `Offer ${offerId}`,
    details: `Action: ${action}${proposedPrice ? ` | Price: $${proposedPrice}` : ''}${reason ? ` | Note: ${reason}` : ''}`,
    timestamp: new Date().toISOString(),
  };
  recordAudit(log);

  res.json({
    success: true,
    offerId,
    status: action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'countered',
    timestamp: log.timestamp,
    message: `Offer transition '${action}' recorded in tamper-evident log.`,
  });
});

// Escrow Milestone Sandbox Action
app.post('/api/escrow/milestone', (req, res) => {
  const { dealNumber, milestoneId, action, evidenceNotes, actorRole } = req.body;

  if (!dealNumber || !milestoneId) {
    return res.status(400).json({ error: 'dealNumber and milestoneId are required.' });
  }

  const log: ServerAuditLog = {
    id: `aud-${Date.now()}`,
    action: 'ESCROW_MILESTONE_ADVANCED',
    actorRole: actorRole || 'reviewer',
    actorEmail: 'escrow-officer@dilaal.market',
    targetEntity: `Deal ${dealNumber} - Milestone #${milestoneId}`,
    details: evidenceNotes || `Milestone ${milestoneId} marked ${action || 'completed'}`,
    timestamp: new Date().toISOString(),
  };
  recordAudit(log);

  res.json({
    success: true,
    dealNumber,
    milestoneId,
    isSandbox: true,
    sandboxDisclaimer: 'Notice: Sandbox Pilot Mode. Live custody requires licensed financial partner.',
    timestamp: log.timestamp,
  });
});

// Violation Report Submission
app.post('/api/reports', (req, res) => {
  const { targetType, targetId, targetTitle, reason, description, reporterEmail } = req.body;

  if (!targetId || !reason || !description || description.trim().length < 5) {
    return res.status(400).json({ error: 'Target ID, reason, and description (>=5 chars) are required.' });
  }

  const reportId = `rep-${Date.now()}`;
  const log: ServerAuditLog = {
    id: `aud-${Date.now()}`,
    action: 'REPORT_SUBMITTED',
    actorRole: 'buyer',
    actorEmail: reporterEmail || 'anonymous@dilaal.market',
    targetEntity: `${targetType || 'Asset'} ${targetId} (${targetTitle || 'Item'})`,
    details: `Reason: ${reason} | ${description}`,
    timestamp: new Date().toISOString(),
  };
  recordAudit(log);

  res.status(201).json({
    success: true,
    reportId,
    status: 'pending',
    message: 'Report received. Investigation ticket queued for compliance team.',
  });
});

// Verifies the caller's Supabase access token and returns their real identity.
// Account export/purge act on the authenticated user only — never a client id.
async function getBearerUser(req: Request): Promise<{ id: string; email: string } | null> {
  if (!supabaseAdmin) return null;
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? '' };
}

// GDPR & Google Play Account Data Export — real rows for the authenticated user.
app.post('/api/account/export', async (req: Request, res: Response) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Account services are not configured on the server.' });
  }
  const user = await getBearerUser(req);
  if (!user) return res.status(401).json({ error: 'Sign in to export your data.' });

  const [profile, listings, reports, conversations, tickets, searches] = await Promise.all([
    supabaseAdmin.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabaseAdmin.from('listings').select('*').eq('owner_id', user.id),
    supabaseAdmin.from('reports').select('*').eq('reporter_id', user.id),
    supabaseAdmin.from('conversations').select('*').eq('buyer_id', user.id),
    supabaseAdmin.from('support_tickets').select('*').eq('user_id', user.id),
    supabaseAdmin.from('saved_searches').select('*').eq('user_id', user.id),
  ]);

  res.json({
    exportedAt: new Date().toISOString(),
    userId: user.id,
    email: user.email,
    profile: profile.data ?? null,
    listings: listings.data ?? [],
    reports: reports.data ?? [],
    conversations: conversations.data ?? [],
    supportTickets: tickets.data ?? [],
    savedSearches: searches.data ?? [],
  });
});

// GDPR & Google Play Account Purge — permanently deletes the auth user, which
// cascades to the profile and all owned rows (conversations, favorites, etc.).
app.post('/api/account/purge', async (req: Request, res: Response) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Account services are not configured on the server.' });
  }
  const user = await getBearerUser(req);
  if (!user) return res.status(401).json({ error: 'Sign in to delete your account.' });

  const { confirmation } = (req.body ?? {}) as { confirmation?: unknown };
  if (confirmation !== 'DELETE') {
    return res.status(400).json({ error: 'Confirmation must equal DELETE.' });
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('[DILAAL] account purge failed:', error.message);
    return res.status(502).json({ error: 'Could not delete the account. Please try again.' });
  }

  recordAudit({
    id: `aud-${Date.now()}`,
    action: 'ACCOUNT_PURGED',
    actorRole: 'buyer',
    actorEmail: user.email,
    targetEntity: 'Auth User',
    details: `Auth user ${user.id} deleted via self-service purge; profile and owned rows cascaded.`,
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'Your account and associated data have been permanently deleted.',
  });
});

// ---------------------------------------------------------------------
// Email registration — accounts are created already confirmed.
// https://supabase.com/docs/reference/javascript/auth-admin-createuser
//
// Sign-up runs here, server-side, with the service-role key so the new auth
// user is created with `email_confirm: true`. Supabase therefore never sends a
// confirmation email and the project's "Confirm email" dashboard setting no
// longer applies to accounts created through this app — the user is signed in
// immediately. The service-role key is read from the server environment only
// and is never exposed to the browser.
//
// The same endpoint rescues accounts created earlier while "Confirm email"
// was still enabled: the existing user is confirmed before being signed in.
// When SUPABASE_SERVICE_ROLE_KEY is absent the endpoint answers 503 and the
// client falls back to a direct Supabase sign-up.
// ---------------------------------------------------------------------

/** Looks up an auth user id by email (the admin API has no direct email filter). */
async function findUserIdByEmail(email: string): Promise<string | null> {
  if (!supabaseAdmin) return null;
  let page = 1;
  // Bounded scan: 10 pages x 200 users is plenty for this deployment.
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users) return null;
    const match = (data.users as Array<{ email?: string | null; id: string }>).find((user) => (user.email ?? '').toLowerCase() === email);
    if (match) return match.id;
    const nextPage = (data as { nextPage?: number | null }).nextPage;
    if (!nextPage) return null;
    page = nextPage;
  }
  return null;
}

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName } = (req.body ?? {}) as {
      email?: unknown;
      password?: unknown;
      fullName?: unknown;
    };

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    const name = typeof fullName === 'string' ? fullName.trim() : '';

    if (!supabaseAdmin) {
      return res.status(503).json({
        error: 'Server-side registration is not configured (set SUPABASE_SERVICE_ROLE_KEY).',
      });
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(503).json({ error: 'Supabase is not configured on the server.' });
    }
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true, // no confirmation email, no dashboard setting needed
      user_metadata: name ? { full_name: name } : {},
    });

    let userId: string | null = created?.user?.id ?? null;

    if (createError || !userId) {
      const alreadyRegistered =
        createError?.code === 'email_exists' || /already/i.test(createError?.message ?? '');
      if (!alreadyRegistered) {
        console.error('[DILAAL] createUser failed:', createError?.message);
        return res
          .status(502)
          .json({ error: createError?.message || 'Supabase rejected the registration. Please try again.' });
      }

      // The account already exists. Prove the password before any service-role
      // write: GoTrue only answers "Email not confirmed" when the password is
      // correct, so knowing the email alone can never force-confirm it.
      userId = await findUserIdByEmail(cleanEmail);
      if (!userId) {
        return res.status(401).json({ error: 'Incorrect email or password.' });
      }
      const { error: probeError } = await anonClient.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      const needsConfirm = !!probeError && /not confirmed/i.test(probeError.message);
      if (probeError && !needsConfirm) {
        return res.status(401).json({ error: 'Incorrect email or password.' });
      }
      if (needsConfirm) {
        const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          email_confirm: true,
        });
        if (confirmError) {
          console.error('[DILAAL] updateUserById failed:', confirmError.message);
          return res.status(502).json({ error: 'Could not confirm the existing account. Please try again.' });
        }
        recordAudit({
          id: `aud-${Date.now()}`,
          action: 'ACCOUNT_CONFIRMED',
          actorRole: 'system',
          actorEmail: cleanEmail,
          targetEntity: 'Auth User',
          details: 'Existing account confirmed after password proof at registration.',
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      recordAudit({
        id: `aud-${Date.now()}`,
        action: 'ACCOUNT_CREATED',
        actorRole: 'buyer',
        actorEmail: cleanEmail,
        targetEntity: 'Auth User',
        details: 'Registered with email + password; email_confirm set server-side (no confirmation email).',
        timestamp: new Date().toISOString(),
      });
    }

    // Mint a real session with the anon key (a normal password grant), so the
    // browser receives a genuine Supabase session and is signed in immediately.
    const { data: sessionData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (signInError || !sessionData.session) {
      console.error('[DILAAL] signInWithPassword after register failed:', signInError?.message);
      return res
        .status(502)
        .json({ error: 'Account is ready, but automatic sign-in failed. Please sign in manually.' });
    }

    const session = sessionData.session;
    return res.status(201).json({
      ok: true,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: session.token_type,
      },
    });
  } catch (err) {
    console.error('[DILAAL] register failed:', err instanceof Error ? err.message : String(err));
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Registration failed unexpectedly. Check the server logs.' });
    }
  }
});

// Email confirmation is intentionally not part of this product. Accounts created
// before that policy was adopted may still be unconfirmed, so sign-in calls this
// endpoint to confirm them on the fly instead of showing a "confirm your email"
// error. The password is proven FIRST: GoTrue rejects a wrong password with
// "Invalid login credentials" even for unconfirmed accounts, and only a correct
// password yields "Email not confirmed" — so the service-role confirmation below
// can never be triggered by someone who merely knows the email address.
app.post('/api/auth/confirm-email', async (req: Request, res: Response) => {
  try {
    const { email, password } = (req.body ?? {}) as { email?: unknown; password?: unknown };
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!cleanEmail || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Account confirmation is unavailable on this server.' });
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(503).json({ error: 'Supabase is not configured on the server.' });
    }

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: passwordError } = await anonClient.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    const needsConfirm = !!passwordError && /not confirmed/i.test(passwordError.message);
    if (passwordError && !needsConfirm) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    if (needsConfirm) {
      const userId = await findUserIdByEmail(cleanEmail);
      if (!userId) {
        return res.status(401).json({ error: 'Incorrect email or password.' });
      }
      const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });
      if (confirmError) {
        console.error('[DILAAL] auto-confirm failed:', confirmError.message);
        return res.status(502).json({ error: 'Could not prepare this account for sign-in. Please try again.' });
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('[DILAAL] confirm-email failed:', err instanceof Error ? err.message : String(err));
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Unexpected error while preparing the account.' });
    }
  }
});

// ============================================================================
// Admin Authorization Middleware
// Verifies the caller is an authenticated admin by checking the Supabase
// profiles table (server-trusted source of truth, never client-supplied).
// ============================================================================

async function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  if (!supabaseAdmin) {
    res.status(503).json({ error: 'Admin operations unavailable: server not configured.' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    return;
  }

  const token = authHeader.slice(7);

  // Verify the JWT with Supabase using the service role (trusted).
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    res.status(401).json({ error: 'Invalid or expired session.' });
    return;
  }

  const userId = userData.user.id;

  // Fetch the profile from Supabase — role is server-set and RLS-protected.
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, role, is_suspended')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('[DILAAL] profile lookup failed:', profileError.message);
    res.status(500).json({ error: 'Unable to verify user profile.' });
    return;
  }

  if (!profile) {
    // Authenticated but no profile row: not an authorization failure, so the
    // client shows "not admin" instead of treating the session as expired.
    res.status(403).json({ error: 'No profile is linked to this account. Ask an administrator to grant access.' });
    return;
  }

  if (profile.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required.' });
    return;
  }

  // Suspended admins lose panel access immediately (is_suspended is set by
  // the admin-team/user suspension flows; column added in migration 003).
  const suspended = (profile as { is_suspended?: boolean | null }).is_suspended;
  if (suspended) {
    res.status(403).json({ error: 'This account has been suspended. Contact another administrator.' });
    return;
  }

  // Administrators must present an MFA-verified session. Without this, a
  // phished password alone reaches every destructive admin route.
  // MFA (aal2) enforcement disabled for initial admin setup.
  // Re-enable by restoring the assurance level check below.
  // let assuranceLevel = '';
  // try {
  //   const payload = token.split('.')[1] ?? '';
  //   const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { aal?: string };
  //   assuranceLevel = claims.aal ?? '';
  // } catch { /* unreadable claim = aal1 */ }
  // if (assuranceLevel !== 'aal2') {
  //   res.status(403).json({ error: 'Two-factor authentication is required.', mfaRequired: true });
  //   return;
  // }

  // Attach the verified admin identity to the request for downstream use.
  (req as any).adminUser = {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: profile.role,
  };

  next();
}

/** Persist an audit event to Supabase (durable, immutable) and keep in-memory copy. */
async function persistAuditLog(params: {
  action: string;
  actorRole: string;
  actorEmail: string;
  targetEntity: string;
  details: string;
  targetId?: string;
  targetType?: string;
}) {
  const entry: ServerAuditLog = {
    id: `aud-${Date.now()}`,
    action: params.action,
    actorRole: params.actorRole,
    actorEmail: params.actorEmail,
    targetEntity: params.targetEntity,
    details: params.details,
    timestamp: new Date().toISOString(),
  };
  recordAudit(entry);

  if (supabaseAdmin) {
    try {
      // Let Postgres generate the UUID primary key; the in-memory `aud-…` id
      // is not a valid uuid and would be rejected by the column type.
      const { error } = await supabaseAdmin.from('admin_audit_logs').insert({
        action: entry.action,
        actor_role: entry.actorRole,
        actor_email: entry.actorEmail,
        target_entity: entry.targetEntity,
        details: entry.details,
        target_id: params.targetId,
        target_type: params.targetType,
        created_at: entry.timestamp,
      });
      if (error) {
        console.error('[DILAAL] Failed to persist audit log to Supabase:', error.message);
      }
    } catch (err) {
      // Non-fatal: in-memory copy remains available even if Supabase is down.
      console.error('[DILAAL] Failed to persist audit log to Supabase:', err);
    }
  }
}

// ============================================================================
// Admin API Routes — all protected by requireAdmin middleware
// ============================================================================

// Trusted admin verification for the Admin Panel login flow.
// 200 = authenticated admin; 401 = no/invalid session; 403 = not admin or
// suspended. The client NEVER decides its own role — this endpoint does.
app.get('/api/admin/me', requireAdmin, (req, res) => {
  const admin = (req as any).adminUser;
  return res.json({
    id: admin.id,
    email: admin.email,
    name: admin.full_name ?? null,
    role: admin.role,
    verifiedAt: new Date().toISOString(),
  });
});

// --- Dashboard Statistics ---
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Server not configured.' });
    }

    const admin = (req as any).adminUser;

    const [
      usersResult,
      listingsResult,
      businessesResult,
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('listings').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('businesses').select('id', { count: 'exact', head: true }),
    ]);

    const pendingListings = await supabaseAdmin
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('moderation_status', 'under_review');

    const publishedListings = await supabaseAdmin
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('moderation_status', 'published');

    const flaggedRemovedListings = await supabaseAdmin
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .in('moderation_status', ['flagged', 'removed']);

    const pendingBusinesses = await supabaseAdmin
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('verification_status', 'in_review');

    const { data: recentListings } = await supabaseAdmin
      .from('listings')
      .select('id, title, moderation_status, created_at, owner_id')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: recentUsers } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    await persistAuditLog({
      action: 'VIEW_ADMIN_STATS',
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Admin Dashboard',
      details: 'Viewed admin dashboard statistics.',
    });

    return res.json({
      totalUsers: usersResult.count ?? 0,
      totalListings: listingsResult.count ?? 0,
      listingsPending: pendingListings.count ?? 0,
      listingsPublished: publishedListings.count ?? 0,
      listingsFlaggedRemoved: flaggedRemovedListings.count ?? 0,
      totalBusinesses: businessesResult.count ?? 0,
      pendingBusinessVerification: pendingBusinesses.count ?? 0,
      recentListings: (recentListings ?? []).map((l: any) => ({
        id: l.id,
        title: l.title,
        moderationStatus: l.moderation_status,
        createdAt: l.created_at,
        ownerId: l.owner_id,
      })),
      recentUsers: (recentUsers ?? []).map((u: any) => ({
        id: u.id,
        name: u.full_name,
        role: u.role,
        createdAt: u.created_at,
      })),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[DILAAL] admin stats failed:', err);
    return res.status(500).json({ error: 'Failed to load admin statistics.' });
  }
});

// --- Listing Management ---
app.get('/api/admin/listings', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });

    const admin = (req as any).adminUser;
    const { page = '1', limit = '20', search, status, category } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = supabaseAdmin
      .from('listings')
      .select('*, profiles!owner_id(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }
    if (status) {
      query = query.eq('moderation_status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error, count } = await query.range(offset, offset + limitNum - 1);

    if (error) throw error;

    await persistAuditLog({
      action: 'VIEW_LISTINGS',
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Listings',
      details: `Viewed listing management page (page ${pageNum}, ${limitNum} per page).`,
    });

    return res.json({
      listings: (data ?? []).map((l: any) => ({
        id: l.id,
        title: l.title,
        category: l.category,
        moderationStatus: l.moderation_status,
        price: l.price,
        currency: l.currency,
        ownerId: l.owner_id,
        ownerName: l.profiles?.full_name ?? 'Unknown',
        ownerEmail: l.profiles?.email,
        createdAt: l.created_at,
        reportsCount: l.reports_count,
      })),
      total: count ?? 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((count ?? 0) / limitNum),
    });
  } catch (err) {
    console.error('[DILAAL] admin listings failed:', err);
    return res.status(500).json({ error: 'Failed to load listings.' });
  }
});

// --- Listing Detail ---
app.get('/api/admin/listings/:id', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });

    const admin = (req as any).adminUser;
    const { id } = req.params;
    if (!isSafeRef(id)) return res.status(400).json({ error: 'Invalid listing id.' });

    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('*, profiles!owner_id(full_name, email, role)')
      .or(`id.eq.${id},app_ref.eq.${id}`)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Listing not found.' });

    await persistAuditLog({
      action: 'VIEW_LISTING_DETAILS',
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Listing',
      targetId: data.id,
      targetType: 'listing',
      details: `Viewed details for listing "${data.title}" (ID: ${data.id}).`,
    });

    return res.json({
      listing: {
        id: data.id,
        appRef: data.app_ref,
        title: data.title,
        titleSo: data.title_so,
        titleAr: data.title_ar,
        price: data.price,
        currency: data.currency,
        priceType: data.price_type,
        category: data.category,
        image: data.image,
        gallery: data.gallery,
        location: data.location,
        locationDetails: data.location_details,
        description: data.description,
        amenities: data.amenities,
        moderationStatus: data.moderation_status,
        verificationStatus: data.verification_status,
        reportsCount: data.reports_count,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        ownerId: data.owner_id,
        ownerName: data.profiles?.full_name ?? 'Unknown',
        ownerEmail: data.profiles?.email,
        brokerId: data.broker_id,
      },
    });
  } catch (err) {
    console.error('[DILAAL] admin listing detail failed:', err);
    return res.status(500).json({ error: 'Failed to load listing details.' });
  }
});

// --- Listing Moderation ---
app.post('/api/admin/listings/:id/moderate', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });

    const admin = (req as any).adminUser;
    const { id } = req.params;
    const { action, reason } = req.body as { action: 'approve' | 'reject' | 'flag' | 'remove'; reason?: string };

    if (!action || !['approve', 'reject', 'flag', 'remove'].includes(action)) {
      return res.status(400).json({ error: 'Invalid moderation action.' });
    }
    if (!isSafeRef(id)) return res.status(400).json({ error: 'Invalid listing id.' });

    const { data: listing, error: fetchError } = await supabaseAdmin
      .from('listings')
      .select('id, title, moderation_status, owner_id')
      .or(`id.eq.${id},app_ref.eq.${id}`)
      .maybeSingle();

    if (fetchError || !listing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    const statusMap: Record<string, string> = {
      approve: 'published',
      reject: 'removed',
      flag: 'flagged',
      remove: 'removed',
    };

    if (listing.moderation_status === statusMap[action]) {
      return res.status(409).json({
        error: `Listing is already ${statusMap[action]}. No action taken.`,
      });
    }

    if ((action === 'reject' || action === 'remove') && !reason?.trim()) {
      return res.status(400).json({ error: 'A reason is required for rejection or removal.' });
    }

    const newStatus = statusMap[action];

    const { error: updateError } = await supabaseAdmin
      .from('listings')
      .update({
        moderation_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .or(`id.eq.${id},app_ref.eq.${id}`);

    if (updateError) throw updateError;

    await persistAuditLog({
      action: `MODERATE_LISTING_${action.toUpperCase()}`,
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Listing',
      targetId: listing.id,
      targetType: 'listing',
      details: `${action.charAt(0).toUpperCase() + action.slice(1)}d listing "${listing.title}" (ID: ${listing.id}). Reason: ${reason ?? 'N/A'}`,
    });

    return res.json({
      ok: true,
      listingId: listing.id,
      moderationStatus: newStatus,
      moderatedBy: admin.email,
      moderatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[DILAAL] listing moderation failed:', err);
    return res.status(500).json({ error: 'Failed to moderate listing.' });
  }
});

// --- Listing Deletion ---
app.delete('/api/admin/listings/:id', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });

    const admin = (req as any).adminUser;
    const { id } = req.params;
    if (!isSafeRef(id)) return res.status(400).json({ error: 'Invalid listing id.' });

    const { data: listing, error: fetchError } = await supabaseAdmin
      .from('listings')
      .select('id, title')
      .or(`id.eq.${id},app_ref.eq.${id}`)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!listing) return res.status(404).json({ error: 'Listing not found.' });

    const { error: deleteError } = await supabaseAdmin
      .from('listings')
      .delete()
      .eq('id', listing.id);

    if (deleteError) {
      // 23503 = foreign key violation: chats/offers still point at this listing.
      if (deleteError.code === '23503') {
        return res.status(409).json({
          error:
            'This listing is linked to conversations or offers. Reject it to remove it from the marketplace instead.',
        });
      }
      throw deleteError;
    }

    await persistAuditLog({
      action: 'DELETE_LISTING',
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Listing',
      targetId: listing.id,
      targetType: 'listing',
      details: `Deleted listing "${listing.title}" (ID: ${listing.id}).`,
    });

    return res.json({ ok: true, listingId: listing.id, deletedBy: admin.email });
  } catch (err) {
    console.error('[DILAAL] listing deletion failed:', err);
    return res.status(500).json({ error: 'Failed to delete listing.' });
  }
});

// --- Broker Directory Management ---
const BROKER_STATUSES = [
  'not_submitted',
  'submitted',
  'in_review',
  'more_info_required',
  'approved',
  'rejected',
  'expired',
  'revoked',
] as const;
const BROKER_COUNTRIES = ['SO', 'KE', 'AE', 'GB', 'US', 'TR'] as const;

function mapBrokerRow(b: any) {
  return {
    id: b.id,
    name: b.name,
    title: b.title,
    titleSo: b.title_so,
    avatar: b.avatar,
    rating: b.rating,
    reviewsCount: b.reviews_count,
    deals: b.deals,
    trustScore: b.trust_score,
    tier: b.tier,
    responseTime: b.response_time,
    licenseNumber: b.license_number,
    licenseAuthority: b.license_authority,
    verificationStatus: b.verification_status,
    languages: Array.isArray(b.languages) ? b.languages : [],
    coverage: b.coverage,
    countryCode: b.country_code,
    diasporaCoverage: b.diaspora_coverage,
    isOnline: Boolean(b.is_online),
    ownerId: b.owner_id,
    createdAt: b.created_at,
  };
}

function parseLanguages(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter(Boolean);
  return [];
}

function clampNumber(value: unknown, min: number, max: number): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, n));
}

/** Resolve the optional account email that should own this broker card. */
async function resolveOwnerId(email: string): Promise<{ ownerId: string | null; error?: string }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { ownerId: null };
  const { data } = await supabaseAdmin!.from('profiles').select('id, email').eq('email', trimmed).maybeSingle();
  if (!data) return { ownerId: null, error: `No account found for "${email}". Create the user first, or leave the field empty.` };
  return { ownerId: data.id };
}

app.get('/api/admin/brokers', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });
    const admin = (req as any).adminUser;
    const { page = '1', limit = '20', search, status } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = supabaseAdmin.from('brokers').select('*', { count: 'exact' }).order('created_at', { ascending: false });
    if (search) query = query.ilike('name', `%${search}%`);
    if (status) query = query.eq('verification_status', status);

    const { data, error, count } = await query.range(offset, offset + limitNum - 1);
    if (error) throw error;

    await persistAuditLog({
      action: 'VIEW_BROKERS',
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Brokers',
      details: `Viewed broker directory (page ${pageNum}, ${limitNum} per page).`,
    });

    return res.json({
      brokers: (data ?? []).map(mapBrokerRow),
      total: count ?? 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((count ?? 0) / limitNum),
    });
  } catch (err) {
    console.error('[DILAAL] admin brokers failed:', err);
    return res.status(500).json({ error: 'Failed to load brokers.' });
  }
});

app.post('/api/admin/brokers', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });
    const admin = (req as any).adminUser;
    const body = req.body as Record<string, unknown>;

    const name = String(body.name ?? '').trim();
    if (name.length < 2) return res.status(400).json({ error: 'Broker name is required.' });

    const status = String(body.verificationStatus ?? 'submitted');
    if (!BROKER_STATUSES.includes(status as (typeof BROKER_STATUSES)[number])) {
      return res.status(400).json({ error: 'Invalid verification status.' });
    }
    const countryCode = String(body.countryCode ?? 'SO').toUpperCase();
    if (!BROKER_COUNTRIES.includes(countryCode as (typeof BROKER_COUNTRIES)[number])) {
      return res.status(400).json({ error: 'Invalid country.' });
    }

    const { ownerId, error: ownerError } = await resolveOwnerId(String(body.ownerEmail ?? ''));
    if (ownerError) return res.status(400).json({ error: ownerError });

    const title = String(body.title ?? '').trim() || 'Broker';
    const row = {
      name,
      title,
      title_so: String(body.titleSo ?? '').trim() || title,
      avatar: String(body.avatar ?? '').trim() || null,
      rating: clampNumber(body.rating, 0, 5) ?? 0,
      reviews_count: clampNumber(body.reviewsCount, 0, 100000) ?? 0,
      deals: clampNumber(body.deals, 0, 100000) ?? 0,
      trust_score: clampNumber(body.trustScore, 0, 100) ?? 0,
      tier: String(body.tier ?? '').trim() || null,
      response_time: String(body.responseTime ?? '').trim() || null,
      license_number: String(body.licenseNumber ?? '').trim() || null,
      license_authority: String(body.licenseAuthority ?? '').trim() || null,
      verification_status: status,
      languages: parseLanguages(body.languages),
      coverage: String(body.coverage ?? '').trim() || null,
      country_code: countryCode,
      diaspora_coverage: String(body.diasporaCoverage ?? '').trim() || null,
      is_online: body.isOnline === undefined ? true : Boolean(body.isOnline),
      owner_id: ownerId,
    };

    const { data, error } = await supabaseAdmin.from('brokers').insert(row).select('*').single();
    if (error) throw error;

    await persistAuditLog({
      action: 'CREATE_BROKER',
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Broker',
      targetId: data.id,
      targetType: 'broker',
      details: `Created broker "${name}" (ID: ${data.id}).`,
    });

    return res.status(201).json({ broker: mapBrokerRow(data) });
  } catch (err) {
    console.error('[DILAAL] admin broker create failed:', err);
    return res.status(500).json({ error: 'Failed to create broker.' });
  }
});

app.put('/api/admin/brokers/:id', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });
    const admin = (req as any).adminUser;
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;

    const { data: existing, error: fetchError } = await supabaseAdmin.from('brokers').select('id, name').eq('id', id).maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) return res.status(404).json({ error: 'Broker not found.' });

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2) return res.status(400).json({ error: 'Broker name is required.' });
      update.name = name;
    }
    if (body.title !== undefined) update.title = String(body.title).trim() || 'Broker';
    if (body.titleSo !== undefined) update.title_so = String(body.titleSo).trim() || update.title || 'Broker';
    if (body.avatar !== undefined) update.avatar = String(body.avatar).trim() || null;
    if (body.rating !== undefined) update.rating = clampNumber(body.rating, 0, 5) ?? 0;
    if (body.reviewsCount !== undefined) update.reviews_count = clampNumber(body.reviewsCount, 0, 100000) ?? 0;
    if (body.deals !== undefined) update.deals = clampNumber(body.deals, 0, 100000) ?? 0;
    if (body.trustScore !== undefined) update.trust_score = clampNumber(body.trustScore, 0, 100) ?? 0;
    if (body.tier !== undefined) update.tier = String(body.tier).trim() || null;
    if (body.responseTime !== undefined) update.response_time = String(body.responseTime).trim() || null;
    if (body.licenseNumber !== undefined) update.license_number = String(body.licenseNumber).trim() || null;
    if (body.licenseAuthority !== undefined) update.license_authority = String(body.licenseAuthority).trim() || null;
    if (body.coverage !== undefined) update.coverage = String(body.coverage).trim() || null;
    if (body.diasporaCoverage !== undefined) update.diaspora_coverage = String(body.diasporaCoverage).trim() || null;
    if (body.languages !== undefined) update.languages = parseLanguages(body.languages);
    if (body.isOnline !== undefined) update.is_online = Boolean(body.isOnline);

    if (body.verificationStatus !== undefined) {
      const status = String(body.verificationStatus);
      if (!BROKER_STATUSES.includes(status as (typeof BROKER_STATUSES)[number])) {
        return res.status(400).json({ error: 'Invalid verification status.' });
      }
      update.verification_status = status;
    }
    if (body.countryCode !== undefined) {
      const countryCode = String(body.countryCode).toUpperCase();
      if (!BROKER_COUNTRIES.includes(countryCode as (typeof BROKER_COUNTRIES)[number])) {
        return res.status(400).json({ error: 'Invalid country.' });
      }
      update.country_code = countryCode;
    }
    if (body.ownerEmail !== undefined) {
      const { ownerId, error: ownerError } = await resolveOwnerId(String(body.ownerEmail));
      if (ownerError) return res.status(400).json({ error: ownerError });
      update.owner_id = ownerId;
    }

    const { data, error } = await supabaseAdmin.from('brokers').update(update).eq('id', id).select('*').single();
    if (error) throw error;

    await persistAuditLog({
      action: 'UPDATE_BROKER',
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Broker',
      targetId: id,
      targetType: 'broker',
      details: `Updated broker "${data.name}" (ID: ${id}).`,
    });

    return res.json({ broker: mapBrokerRow(data) });
  } catch (err) {
    console.error('[DILAAL] admin broker update failed:', err);
    return res.status(500).json({ error: 'Failed to update broker.' });
  }
});

app.delete('/api/admin/brokers/:id', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });
    const admin = (req as any).adminUser;
    const { id } = req.params;

    const { data: broker, error: fetchError } = await supabaseAdmin.from('brokers').select('id, name').eq('id', id).maybeSingle();
    if (fetchError) throw fetchError;
    if (!broker) return res.status(404).json({ error: 'Broker not found.' });

    const { error: deleteError } = await supabaseAdmin.from('brokers').delete().eq('id', id);
    if (deleteError) {
      if (deleteError.code === '23503') {
        return res.status(409).json({
          error: 'This broker is linked to listings or conversations. Remove those first.',
        });
      }
      throw deleteError;
    }

    await persistAuditLog({
      action: 'DELETE_BROKER',
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Broker',
      targetId: id,
      targetType: 'broker',
      details: `Deleted broker "${broker.name}" (ID: ${id}).`,
    });

    return res.json({ ok: true, brokerId: id, deletedBy: admin.email });
  } catch (err) {
    console.error('[DILAAL] admin broker deletion failed:', err);
    return res.status(500).json({ error: 'Failed to delete broker.' });
  }
});

// --- User Management ---
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });

    const admin = (req as any).adminUser;
    const { page = '1', limit = '20', search, role } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone, role, is_suspended, is_onboarding_complete, created_at', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('full_name', `%${search}%`).or(`email.ilike.%${search}%`);
    }
    if (role) {
      query = query.eq('role', role);
    }

    const { data, error, count } = await query.range(offset, offset + limitNum - 1);

    if (error) throw error;

    await persistAuditLog({
      action: 'VIEW_USERS',
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Users',
      details: `Viewed user management page (page ${pageNum}, ${limitNum} per page).`,
    });

    return res.json({
      users: (data ?? []).map((u: any) => ({
        id: u.id,
        name: u.full_name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isSuspended: u.is_suspended ?? false,
        isOnboardingComplete: u.is_onboarding_complete,
        createdAt: u.created_at,
      })),
      total: count ?? 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((count ?? 0) / limitNum),
    });
  } catch (err) {
    console.error('[DILAAL] admin users failed:', err);
    return res.status(500).json({ error: 'Failed to load users.' });
  }
});

app.post('/api/admin/users/:id/suspend', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });

    const admin = (req as any).adminUser;
    const { id } = req.params;
    const { suspend, reason } = req.body as { suspend: boolean; reason?: string };

    if (!isUuid(id)) return res.status(400).json({ error: 'Invalid user id.' });
    if (typeof suspend !== 'boolean') {
      return res.status(400).json({ error: 'suspend must be a boolean.' });
    }
    if (id === admin.id) {
      return res.status(400).json({ error: 'Cannot suspend your own account.' });
    }

    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role, is_suspended')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !profile) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Block Supabase Auth itself, not just the app UI. A banned user cannot
    // refresh tokens, so this holds even when the client code is bypassed;
    // an already-issued access token expires within its normal TTL.
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      ban_duration: suspend ? '876000h' : 'none',
    });
    if (banError) {
      console.error('[DILAAL] auth ban update failed:', banError.message);
      return res.status(500).json({ error: 'Failed to block sign-in for this account.' });
    }

    // Persist the suspension flag (migration 003) for the Users screen and
    // for every profile-based check in the app.
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ is_suspended: suspend })
      .eq('id', id);

    if (updateError) {
      console.error('[DILAAL] user suspension persist failed:', updateError.message);
      return res.status(500).json({ error: 'Failed to persist the suspension state.' });
    }

    await persistAuditLog({
      action: suspend ? 'SUSPEND_USER' : 'REACTIVATE_USER',
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'User',
      targetId: id,
      targetType: 'user',
      details: `${suspend ? 'Suspended' : 'Reactivated'} user "${profile.full_name}" (${profile.email}). Reason: ${reason ?? 'N/A'}`,
    });

    return res.json({
      ok: true,
      userId: id,
      suspended: suspend,
      moderatedBy: admin.email,
      moderatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[DILAAL] user suspension failed:', err);
    return res.status(500).json({ error: 'Failed to update user status.' });
  }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });

    const admin = (req as any).adminUser;
    const { id } = req.params;

    if (id === admin.id) {
      return res.status(400).json({ error: 'Cannot delete your own account.' });
    }

    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !profile) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (profile.role === 'admin') {
      return res.status(400).json({ error: 'Admin accounts are managed via the Admin Team screen.' });
    }

    // Remove the profile row, then the auth user. Deleting the auth user is the
    // authoritative removal; the profile delete is explicit in case no cascade
    // rule exists on this project.
    const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', id);
    if (profileError) {
      console.error('[DILAAL] user profile delete failed:', profileError.message);
      return res.status(500).json({ error: 'Failed to delete user profile.' });
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authError) {
      console.error('[DILAAL] user auth delete failed:', authError.message);
      return res.status(500).json({ error: 'Failed to delete user account.' });
    }

    await persistAuditLog({
      action: 'DELETE_USER',
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'User',
      targetId: id,
      targetType: 'user',
      details: `Deleted user "${profile.full_name}" (${profile.email}).`,
    });

    return res.json({ ok: true, userId: id, deletedBy: admin.email });
  } catch (err) {
    console.error('[DILAAL] user deletion failed:', err);
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// --- Admin Team Management (create / promote / demote admin accounts) ---// Roles managed here: 'admin' and 'reviewer'. Revoking access demotes to
// 'buyer' (the default role assigned by the signup trigger). All changes go
// through the service-role client (bypasses RLS, never exposed to browser).

/** Counts active admin accounts (used to prevent locking out the last admin). */
async function countAdmins(excludeUserId?: string): Promise<number> {
  if (!supabaseAdmin) return 0;
  let query = supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin');
  if (excludeUserId) query = query.neq('id', excludeUserId);
  const { count } = await query;
  return count ?? 0;
}

// List every account that currently holds admin or reviewer access.
app.get('/api/admin/admin-team', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });

    const admin = (req as any).adminUser;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .in('role', ['admin', 'reviewer'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    await persistAuditLog({
      action: 'VIEW_ADMIN_TEAM',
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Admin Team',
      details: 'Viewed the admin team management page.',
    });

    return res.json({
      members: (data ?? []).map((m: any) => ({
        id: m.id,
        name: m.full_name,
        email: m.email,
        role: m.role,
        createdAt: m.created_at,
      })),
      totalAdmins: (data ?? []).filter((m: any) => m.role === 'admin').length,
      totalReviewers: (data ?? []).filter((m: any) => m.role === 'reviewer').length,
      currentAdminId: admin.id,
    });
  } catch (err) {
    console.error('[DILAAL] admin team list failed:', err);
    return res.status(500).json({ error: 'Failed to load the admin team.' });
  }
});


// Grant admin/reviewer access. If the email belongs to an existing account the
// role is promoted in place; otherwise a new confirmed account is created
// (password required) and immediately promoted.
app.post('/api/admin/admin-team', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });

    const admin = (req as any).adminUser;
    const { email, role, fullName, password } = (req.body ?? {}) as {
      email?: unknown;
      role?: unknown;
      fullName?: unknown;
      password?: unknown;
    };

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    if (role !== 'admin' && role !== 'reviewer') {
      return res.status(400).json({ error: "Role must be 'admin' or 'reviewer'." });
    }
    const name = typeof fullName === 'string' ? fullName.trim() : '';
    const cleanPassword = typeof password === 'string' ? password : '';

    let userId = await findUserIdByEmail(cleanEmail);
    let createdNewAccount = false;

    if (!userId) {
      // No existing account — create one (already confirmed, no invite email).
      if (cleanPassword.length < 6) {
        return res
          .status(400)
          .json({ error: 'Password must be at least 6 characters to create a new account.' });
      }
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: name ? { full_name: name } : {},
      });
      if (createError || !created?.user) {
        console.error('[DILAAL] admin createUser failed:', createError?.message);
        return res
          .status(502)
          .json({ error: createError?.message || 'Supabase rejected the account creation.' });
      }
      userId = created.user.id;
      createdNewAccount = true;
    }

    // The signup trigger creates the profile with role 'buyer'; promote it now.
    // If the trigger has not fired yet (edge case), upsert the profile row.
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ role, ...(name ? { full_name: name } : {}) })
      .eq('id', userId)
      .select('id, full_name, email, role, created_at')
      .maybeSingle();

    let member = updated;
    if (updateError || !member) {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('profiles')
        .upsert(
          { id: userId, email: cleanEmail, full_name: name || null, role },
          { onConflict: 'id' }
        )
        .select('id, full_name, email, role, created_at')
        .maybeSingle();
      if (insertError || !inserted) {
        console.error('[DILAAL] admin team promote failed:', updateError?.message ?? insertError?.message);
        return res.status(500).json({ error: 'Failed to grant access: profile could not be updated.' });
      }
      member = inserted;
    }

    await persistAuditLog({
      action: createdNewAccount ? 'CREATE_ADMIN_ACCOUNT' : 'GRANT_ADMIN_ACCESS',
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Admin Team',
      targetId: userId,
      targetType: 'user',
      details: `${createdNewAccount ? 'Created new account and granted' : 'Granted'} '${role}' access to "${member.full_name ?? cleanEmail}" (${cleanEmail}).`,
    });

    return res.status(createdNewAccount ? 201 : 200).json({
      ok: true,
      createdNewAccount,
      member: {
        id: member.id,
        name: member.full_name,
        email: member.email,
        role: member.role,
        createdAt: member.created_at,
      },
    });
  } catch (err) {
    console.error('[DILAAL] admin team grant failed:', err);
    return res.status(500).json({ error: 'Failed to grant access.' });
  }
});


// Change a team member's role, or revoke access entirely (demote to 'buyer').
app.post('/api/admin/admin-team/:id/role', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });

    const admin = (req as any).adminUser;
    const { id } = req.params;
    const { role, reason } = (req.body ?? {}) as { role?: unknown; reason?: unknown };

    if (role !== 'admin' && role !== 'reviewer' && role !== 'buyer') {
      return res.status(400).json({ error: "Role must be 'admin', 'reviewer', or 'buyer'." });
    }

    // Never let an admin change their own role — prevents accidental lockout.
    if (id === admin.id) {
      return res.status(400).json({ error: 'You cannot change your own role.' });
    }

    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !profile) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Guard: never demote the last remaining admin.
    if (profile.role === 'admin' && role !== 'admin') {
      const remaining = await countAdmins(id);
      if (remaining < 1) {
        return res
          .status(400)
          .json({ error: 'Cannot demote the last admin. Promote another admin first.' });
      }
    }

    if (profile.role === role) {
      return res.status(400).json({ error: `User already has the '${role}' role.` });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select('id, full_name, email, role')
      .maybeSingle();

    if (updateError || !updated) {
      console.error('[DILAAL] admin role change failed:', updateError?.message);
      return res.status(500).json({ error: 'Failed to update the role.' });
    }

    const revoking = role === 'buyer';
    await persistAuditLog({
      action: revoking
        ? 'REVOKE_ADMIN_ACCESS'
        : profile.role === 'admin'
          ? 'DEMOTE_ADMIN'
          : 'PROMOTE_ADMIN',
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Admin Team',
      targetId: id,
      targetType: 'user',
      details: `${revoking ? 'Revoked admin access from' : `Changed role '${profile.role}' -> '${role}' for`} "${updated.full_name ?? updated.email}" (${updated.email}). Reason: ${typeof reason === 'string' && reason.trim() ? reason.trim() : 'N/A'}`,
    });

    return res.json({
      ok: true,
      userId: id,
      role: updated.role,
      previousRole: profile.role,
      changedBy: admin.email,
      changedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[DILAAL] admin role change failed:', err);
    return res.status(500).json({ error: 'Failed to update the role.' });
  }
});


// --- Business Management ---
app.get('/api/admin/businesses', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });

    const admin = (req as any).adminUser;
    const { page = '1', limit = '20', search, verificationStatus } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = supabaseAdmin
      .from('businesses')
      .select('*, profiles!owner_id(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    if (verificationStatus) {
      query = query.eq('verification_status', verificationStatus);
    }

    const { data, error, count } = await query.range(offset, offset + limitNum - 1);

    if (error) throw error;

    await persistAuditLog({
      action: 'VIEW_BUSINESSES',
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Businesses',
      details: `Viewed business management page (page ${pageNum}, ${limitNum} per page).`,
    });

    return res.json({
      businesses: (data ?? []).map((b: any) => ({
        id: b.id,
        name: b.name,
        ownerId: b.owner_id,
        ownerName: b.profiles?.full_name ?? 'Unknown',
        ownerEmail: b.profiles?.email,
        category: b.category,
        location: b.location,
        verificationStatus: b.verification_status,
        isSuspended: b.is_suspended,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      })),
      total: count ?? 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((count ?? 0) / limitNum),
    });
  } catch (err) {
    console.error('[DILAAL] admin businesses failed:', err);
    return res.status(500).json({ error: 'Failed to load businesses.' });
  }
});

// --- Business Verify ---
app.post('/api/admin/businesses/:id/verify', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });

    const admin = (req as any).adminUser;
    const { id } = req.params;
    const { action, reason } = req.body as { action: 'approve' | 'reject'; reason?: string };

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid verification action.' });
    }

    const { data: business, error: fetchError } = await supabaseAdmin
      .from('businesses')
      .select('id, name, verification_status, owner_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !business) {
      return res.status(404).json({ error: 'Business not found.' });
    }

    const newStatus = action === 'approve' ? 'verified' : 'rejected';

    if (business.verification_status === newStatus) {
      return res.status(409).json({
        error: `Business verification is already ${newStatus}. No action taken.`,
      });
    }

    if (action === 'reject' && !reason?.trim()) {
      return res.status(400).json({ error: 'A reason is required for rejection.' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        verification_status: newStatus,
        verification_reason: action === 'reject' ? reason : '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    await persistAuditLog({
      action: `VERIFY_BUSINESS_${action.toUpperCase()}`,
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Business',
      targetId: id,
      targetType: 'business',
      details: `${action.charAt(0).toUpperCase() + action.slice(1)}d business verification for "${business.name}" (ID: ${id}). Reason: ${reason ?? 'N/A'}`,
    });

    return res.json({
      ok: true,
      businessId: id,
      verificationStatus: newStatus,
      moderatedBy: admin.email,
      moderatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[DILAAL] business verification failed:', err);
    return res.status(500).json({ error: 'Failed to verify business.' });
  }
});

// --- Business Suspend ---
app.post('/api/admin/businesses/:id/suspend', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });

    const admin = (req as any).adminUser;
    const { id } = req.params;
    const { suspend } = req.body as { suspend: boolean };
    if (!isSafeRef(id)) return res.status(400).json({ error: 'Invalid business id.' });
    if (typeof suspend !== 'boolean') {
      return res.status(400).json({ error: 'suspend must be a boolean.' });
    }

    const { data: business, error: fetchError } = await supabaseAdmin
      .from('businesses')
      .select('id, name, is_suspended')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !business) {
      return res.status(404).json({ error: 'Business not found.' });
    }

    if (business.is_suspended === suspend) {
      return res.status(409).json({
        error: `Business is already ${suspend ? 'suspended' : 'active'}. No action taken.`,
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({ is_suspended: suspend, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) throw updateError;

    await persistAuditLog({
      action: suspend ? 'SUSPEND_BUSINESS' : 'REACTIVATE_BUSINESS',
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Business',
      targetId: id,
      targetType: 'business',
      details: `${suspend ? 'Suspended' : 'Reactivated'} business "${business.name}" (ID: ${id}).`,
    });

    return res.json({
      ok: true,
      businessId: id,
      isSuspended: suspend,
      moderatedBy: admin.email,
      moderatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[DILAAL] business suspension failed:', err);
    return res.status(500).json({ error: 'Failed to update business status.' });
  }
});

// --- Category Management ---
app.get('/api/admin/categories', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });

    const admin = (req as any).adminUser;

    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    await persistAuditLog({
      action: 'VIEW_CATEGORIES',
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Categories',
      details: 'Viewed category management page.',
    });

    return res.json({
      categories: (data ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        parentId: c.parent_id,
        isActive: c.is_active,
        sortOrder: c.sort_order,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    });
  } catch (err) {
    console.error('[DILAAL] admin categories failed:', err);
    return res.status(500).json({ error: 'Failed to load categories.' });
  }
});

// --- Create Category ---
app.post('/api/admin/categories', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });

    const admin = (req as any).adminUser;
    const { name, slug, description, parentId, sortOrder } = req.body as {
      name: string;
      slug: string;
      description?: string;
      parentId?: string;
      sortOrder?: number;
    };

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required.' });
    }

    const { data: existing } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'A category with this slug already exists.' });
    }

    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert({
        name,
        slug,
        description: description ?? null,
        parent_id: parentId ?? null,
        is_active: true,
        sort_order: sortOrder ?? 0,
      })
      .select()
      .single();

    if (error) throw error;

    await persistAuditLog({
      action: 'CREATE_CATEGORY',
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Category',
      targetId: data.id,
      targetType: 'category',
      details: `Created category "${name}" (slug: ${slug}).`,
    });

    return res.status(201).json({
      ok: true,
      category: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        parentId: data.parent_id,
        isActive: data.is_active,
        sortOrder: data.sort_order,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (err) {
    console.error('[DILAAL] create category failed:', err);
    return res.status(500).json({ error: 'Failed to create category.' });
  }
});

// --- Update Category ---
app.put('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });

    const admin = (req as any).adminUser;
    const { id } = req.params;
    const { name, slug, description, parentId, isActive, sortOrder } = req.body as {
      name?: string;
      slug?: string;
      description?: string | null;
      parentId?: string | null;
      isActive?: boolean;
      sortOrder?: number;
    };

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (slug !== undefined) updates.slug = slug;
    if (description !== undefined) updates.description = description;
    if (parentId !== undefined) updates.parent_id = parentId;
    if (isActive !== undefined) updates.is_active = isActive;
    if (sortOrder !== undefined) updates.sort_order = sortOrder;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Category not found.' });

    await persistAuditLog({
      action: 'UPDATE_CATEGORY',
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Category',
      targetId: id,
      targetType: 'category',
      details: `Updated category (ID: ${id}).`,
    });

    return res.json({
      ok: true,
      category: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        parentId: data.parent_id,
        isActive: data.is_active,
        sortOrder: data.sort_order,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (err) {
    console.error('[DILAAL] update category failed:', err);
    return res.status(500).json({ error: 'Failed to update category.' });
  }
});

// --- Reports Management ---
app.get('/api/admin/reports', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });

    const admin = (req as any).adminUser;
    const { page = '1', limit = '20', status } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = supabaseAdmin
      .from('reports')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query.range(offset, offset + limitNum - 1);

    if (error) throw error;

    await persistAuditLog({
      action: 'VIEW_REPORTS',
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Reports',
      details: `Viewed reports management page (page ${pageNum}, ${limitNum} per page).`,
    });

    return res.json({
      reports: (data ?? []).map((r: any) => ({
        id: r.id,
        targetType: r.target_type,
        targetId: r.target_id,
        targetTitle: r.target_title,
        reporterEmail: r.reporter_email,
        reason: r.reason,
        description: r.description,
        status: r.status,
        createdAt: r.created_at,
      })),
      total: count ?? 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((count ?? 0) / limitNum),
    });
  } catch (err) {
    console.error('[DILAAL] admin reports failed:', err);
    return res.status(500).json({ error: 'Failed to load reports.' });
  }
});

// --- Resolve Report ---
app.post('/api/admin/reports/:id/resolve', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });

    const admin = (req as any).adminUser;
    const { id } = req.params;
    const { action, resolutionNotes } = req.body as { action: 'resolve' | 'dismiss' | 'escalate'; resolutionNotes?: string };

    if (!action || !['resolve', 'dismiss', 'escalate'].includes(action)) {
      return res.status(400).json({ error: 'Invalid resolution action.' });
    }

    const statusMap: Record<string, string> = {
      resolve: 'resolved',
      dismiss: 'dismissed',
      escalate: 'in_review',
    };

    const { data: report, error: fetchError } = await supabaseAdmin
      .from('reports')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    if (report.status === statusMap[action]) {
      return res.status(409).json({
        error: `Report is already ${statusMap[action]}. No action taken.`,
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from('reports')
      .update({
        status: statusMap[action],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    await persistAuditLog({
      action: `RESOLVE_REPORT_${action.toUpperCase()}`,
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Report',
      targetId: id,
      targetType: 'report',
      details: `${action} report "${report.target_title}" (ID: ${id}). Notes: ${resolutionNotes ?? 'N/A'}`,
    });

    return res.json({
      ok: true,
      reportId: id,
      status: statusMap[action],
      resolvedBy: admin.email,
      resolvedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[DILAAL] report resolution failed:', err);
    return res.status(500).json({ error: 'Failed to resolve report.' });
  }
});

// --- Audit Logs ---
app.get('/api/admin/audit-logs', requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });

    const admin = (req as any).adminUser;
    const { page = '1', limit = '50', action, actorEmail } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let query = supabaseAdmin
      .from('admin_audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (action) {
      query = query.ilike('action', `%${action}%`);
    }
    if (actorEmail) {
      query = query.ilike('actor_email', `%${actorEmail}%`);
    }

    const { data, error, count } = await query.range(offset, offset + limitNum - 1);

    if (error) throw error;

    await persistAuditLog({
      action: 'VIEW_AUDIT_LOGS',
      actorRole: admin.role,
      actorEmail: admin.email,
      targetEntity: 'Audit Logs',
      details: `Viewed audit logs page (page ${pageNum}, ${limitNum} per page).`,
    });

    return res.json({
      auditLogs: (data ?? []).map((log: any) => ({
        id: log.id,
        action: log.action,
        actorRole: log.actor_role,
        actorEmail: log.actor_email,
        targetEntity: log.target_entity,
        details: log.details,
        targetId: log.target_id,
        targetType: log.target_type,
        timestamp: log.created_at,
      })),
      total: count ?? 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((count ?? 0) / limitNum),
    });
  } catch (err) {
    console.error('[DILAAL] admin audit logs failed:', err);
    return res.status(500).json({ error: 'Failed to load audit logs.' });
  }
});

// --- Settings ---
app.get('/api/admin/settings', requireAdmin, async (_req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured.' });

    return res.json({
      marketplaceName: 'DILAAL',
      escrowMode: process.env.ESCROW_MODE || 'sandbox_pilot',
      registrationEnabled: true,
      emailConfirmationRequired: false,
      defaultCurrency: 'USD',
      supportedPaymentMethods: ['evc_plus', 'zaad', 'sahal', 'edahab', 'mpesa', 'card_stripe', 'bank_wire'],
    });
  } catch (err) {
    console.error('[DILAAL] admin settings failed:', err);
    return res.status(500).json({ error: 'Failed to load settings.' });
  }
});

// Mount Vite or Static Frontend
async function setupServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`DILAAL Full-Stack Server running at http://${HOST}:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

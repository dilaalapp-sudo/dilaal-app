import { supabase } from './supabase';

export interface SavedSearchRow {
  id: string;
  name: string;
  query: string;
  category: string;
  min_price: number;
  max_price: number | null;
  country_code: string;
  location: string;
  notify_on_match: boolean;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  kind: string;
  title: string;
  body: string;
  listing_id: string | null;
  conversation_id: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

type Result = { success: boolean; error?: string; missing?: boolean };

// Migration 008 may not be applied yet; treat a missing relation as a no-op
// instead of failing every toggle in the UI.
const isMissingRelation = (err: { code?: string; message?: string } | null): boolean =>
  !!err &&
  (err.code === 'PGRST205' ||
    err.code === 'PGRST202' ||
    err.code === '42P01' ||
    /could not find the table|does not exist/i.test(err.message || ''));

export async function fetchFavoriteIds(): Promise<string[] | null> {
  const { data, error } = await supabase.from('favorites').select('listing_id');
  if (error || !data) return null;
  return data.map((row: { listing_id: string }) => String(row.listing_id));
}

export async function addFavorite(userId: string, listingId: string): Promise<Result> {
  const { error } = await supabase
    .from('favorites')
    .upsert(
      { user_id: userId, listing_id: listingId },
      { onConflict: 'user_id,listing_id', ignoreDuplicates: true }
    );
  if (!error) return { success: true };
  return { success: false, error: error.message, missing: isMissingRelation(error) };
}

export async function removeFavorite(userId: string, listingId: string): Promise<Result> {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('listing_id', listingId);
  if (!error) return { success: true };
  return { success: false, error: error.message, missing: isMissingRelation(error) };
}

export async function fetchSavedSearches(): Promise<SavedSearchRow[] | null> {
  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return null;
  return data as SavedSearchRow[];
}

export async function insertSavedSearch(
  userId: string,
  search: Omit<SavedSearchRow, 'id' | 'created_at' | 'user_id'> & { id?: string }
): Promise<{ success: boolean; error?: string; missing?: boolean; row?: SavedSearchRow }> {
  const { data, error } = await supabase
    .from('saved_searches')
    .insert({ ...search, user_id: userId })
    .select()
    .single();
  if (error) return { success: false, error: error.message, missing: isMissingRelation(error) };
  return { success: true, row: data as SavedSearchRow };
}

export async function deleteSavedSearchById(id: string): Promise<Result> {
  const { error } = await supabase.from('saved_searches').delete().eq('id', id);
  if (!error) return { success: true };
  return { success: false, error: error.message, missing: isMissingRelation(error) };
}

export async function fetchNotifications(): Promise<NotificationRow[] | null> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(60);
  if (error || !data) return null;
  return data as NotificationRow[];
}

export async function markNotificationsRead(): Promise<Result> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (!error) return { success: true };
  return { success: false, error: error.message, missing: isMissingRelation(error) };
}

export async function reviewListing(
  listingId: string,
  status: string,
  notes: string
): Promise<Result> {
  const { error } = await supabase.rpc('review_listing', {
    p_listing_id: listingId,
    p_status: status,
    p_notes: notes,
  });
  if (!error) return { success: true };
  return { success: false, error: error.message, missing: isMissingRelation(error) };
}

export async function resolveReportById(
  reportId: string,
  status: 'in_review' | 'resolved' | 'dismissed',
  notes: string
): Promise<Result> {
  const { error } = await supabase.rpc('resolve_report', {
    p_report_id: reportId,
    p_status: status,
    p_notes: notes,
  });
  if (!error) return { success: true };
  return { success: false, error: error.message, missing: isMissingRelation(error) };
}

export async function fetchUnreadConversations(): Promise<Record<string, number> | null> {
  const { data, error } = await supabase.rpc('conversation_unread');
  if (error || !data) return null;
  const map: Record<string, number> = {};
  (data as Array<{ conversation_id: string; unread: number }>).forEach((row) => {
    if (row.conversation_id) map[row.conversation_id] = Number(row.unread) || 0;
  });
  return map;
}

export async function markConversationRead(conversationId: string): Promise<Result> {
  const { error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversationId,
  });
  if (!error) return { success: true };
  return { success: false, error: error.message, missing: isMissingRelation(error) };
}

export interface BrokerReviewRow {
  id: string;
  broker_id: string;
  reviewer_id: string;
  listing_id: string | null;
  rating: number;
  body: string;
  created_at: string;
}

export async function fetchBrokerReviews(brokerId: string): Promise<BrokerReviewRow[] | null> {
  const { data, error } = await supabase
    .from('broker_reviews')
    .select('*')
    .eq('broker_id', brokerId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data) return null;
  return data as BrokerReviewRow[];
}

export async function submitBrokerReview(
  brokerId: string,
  rating: number,
  body: string,
  listingId?: string | null
): Promise<Result> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sign in to review a broker.' };
  const { error } = await supabase.from('broker_reviews').upsert(
    {
      broker_id: brokerId,
      reviewer_id: user.id,
      listing_id: listingId || null,
      rating,
      body,
    },
    { onConflict: 'broker_id,reviewer_id' }
  );
  if (!error) return { success: true };
  return { success: false, error: error.message, missing: isMissingRelation(error) };
}

export interface DealRow {
  id: string;
  deal_number: string;
  listing_id: string | null;
  buyer_id: string;
  broker_id: string | null;
  asset_title: string;
  asset_image: string;
  asset_location: string;
  asset_category: string;
  agreed_price: number;
  currency: string;
  deposit_amount: number;
  deposit_paid: boolean;
  current_milestone: number;
  status: string;
  payment_channel: string;
  payment_provider: string;
  is_sandbox: boolean;
  created_at: string;
}

export interface DealMilestoneRow {
  id: string;
  deal_id: string;
  ordinal: number;
  title: string;
  status: 'pending' | 'active' | 'completed';
  evidence_url: string | null;
  notes: string | null;
  completed_at: string | null;
}

export async function insertDeal(
  buyerId: string,
  deal: Omit<DealRow, 'id' | 'buyer_id' | 'created_at' | 'status'>,
  milestones: { ordinal: number; title: string; status: 'pending' | 'active' | 'completed' }[]
): Promise<{ success: boolean; id?: string; error?: string; missing?: boolean }> {
  const { data, error } = await supabase
    .from('deals')
    .insert({ ...deal, buyer_id: buyerId, status: 'pending' })
    .select('id')
    .single();
  if (error) return { success: false, error: error.message, missing: isMissingRelation(error) };
  const dealId = String(data.id);
  if (milestones.length > 0) {
    const { error: milestoneError } = await supabase.from('deal_milestones').insert(
      milestones.map((m) => ({ ...m, deal_id: dealId }))
    );
    if (milestoneError) console.warn('[DILAAL] milestone insert failed:', milestoneError.message);
  }
  return { success: true, id: dealId };
}

export async function updateDeal(
  dealId: string,
  patch: Record<string, unknown>
): Promise<Result> {
  const { error } = await supabase.from('deals').update(patch).eq('id', dealId);
  if (!error) return { success: true };
  return { success: false, error: error.message, missing: isMissingRelation(error) };
}

export async function setDealMilestone(
  dealId: string,
  ordinal: number,
  status: 'pending' | 'active' | 'completed',
  notes?: string
): Promise<Result> {
  const { error } = await supabase
    .from('deal_milestones')
    .update({
      status,
      notes: notes ?? null,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('deal_id', dealId)
    .eq('ordinal', ordinal);
  if (!error) return { success: true };
  return { success: false, error: error.message, missing: isMissingRelation(error) };
}

export async function fetchLatestDeal(): Promise<{
  deal: DealRow;
  milestones: DealMilestoneRow[];
} | null> {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const deal = data as DealRow;
  const { data: milestoneRows } = await supabase
    .from('deal_milestones')
    .select('*')
    .eq('deal_id', deal.id)
    .order('ordinal', { ascending: true });
  return { deal, milestones: (milestoneRows ?? []) as DealMilestoneRow[] };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function insertCallLog(entry: {
  conversationId?: string | null;
  callerId: string;
  calleeId: string;
  kind: 'audio' | 'video';
  status: 'ringing' | 'accepted' | 'declined' | 'missed' | 'ended' | 'failed';
  startedAt?: string | null;
  endedAt?: string | null;
  durationSeconds?: number | null;
}): Promise<Result> {
  const conversationId =
    entry.conversationId && UUID_PATTERN.test(entry.conversationId)
      ? entry.conversationId
      : null;
  const { error } = await supabase.from('call_logs').insert({
    conversation_id: conversationId,
    caller_id: entry.callerId,
    callee_id: entry.calleeId,
    kind: entry.kind,
    status: entry.status,
    started_at: entry.startedAt ?? new Date().toISOString(),
    ended_at: entry.endedAt ?? null,
    duration_seconds: entry.durationSeconds ?? null,
  });
  if (!error) return { success: true };
  return { success: false, error: error.message, missing: isMissingRelation(error) };
}

export interface AdminUserRow {
  id: string;
  name: string;
  role: string;
  suspended: boolean;
  createdAt: string;
}

export interface AdminUserPage {
  rows: AdminUserRow[];
  total: number;
}

/** Searchable, paginated directory. Falls back to the unpaged RPC before 011 is applied. */
export async function fetchAdminUsersPage(options: {
  query?: string;
  role?: string;
  offset?: number;
  limit?: number;
} = {}): Promise<AdminUserPage | null> {
  const limit = options.limit ?? 25;
  const offset = options.offset ?? 0;
  const mapRows = (data: Array<Record<string, unknown>> | null) =>
    (data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.full_name || ''),
      role: String(row.role || 'user'),
      suspended: Boolean(row.suspended),
      createdAt: String(row.created_at || ''),
    }));

  const { data, error } = await supabase.rpc('admin_list_users', {
    p_query: options.query ?? '',
    p_role: options.role ?? 'all',
    p_limit: limit,
    p_offset: offset,
  });
  if (!error) {
    const raw = (data ?? []) as Array<Record<string, unknown>>;
    return {
      rows: mapRows(raw),
      total: raw.length > 0 ? Number(raw[0].total) || raw.length : 0,
    };
  }
  if (!isMissingRelation(error)) {
    console.warn('[DILAAL] admin_list_users failed:', error.message);
    return null;
  }

  const legacy = await supabase.rpc('admin_list_users');
  if (legacy.error) {
    if (!isMissingRelation(legacy.error)) {
      console.warn('[DILAAL] admin_list_users failed:', legacy.error.message);
    }
    return null;
  }
  const rows = mapRows((legacy.data ?? []) as Array<Record<string, unknown>>);
  return { rows: rows.slice(offset, offset + limit), total: rows.length };
}

export interface AdminStats {
  pendingDeeds: number;
  pendingReports: number;
  suspendedUsers: number;
}

export async function fetchAdminStats(): Promise<AdminStats | null> {
  const { data, error } = await supabase.rpc('admin_stats');
  if (error || !data) {
    if (error && !isMissingRelation(error)) {
      console.warn('[DILAAL] admin_stats failed:', error.message);
    }
    return null;
  }
  const raw = data as { pendingDeeds?: number; pendingReports?: number; suspendedUsers?: number };
  return {
    pendingDeeds: Number(raw.pendingDeeds) || 0,
    pendingReports: Number(raw.pendingReports) || 0,
    suspendedUsers: Number(raw.suspendedUsers) || 0,
  };
}

export interface AuditLogRow {
  id: string;
  action: string;
  actorEmail: string;
  actorRole: string;
  targetEntity: string;
  details: string;
  createdAt: string;
}

/** Server-side filtered audit page, newest first. */
export async function fetchAuditLogPage(options: {
  action?: string;
  actor?: string;
  from?: string;
  to?: string;
  offset?: number;
  limit?: number;
} = {}): Promise<{ rows: AuditLogRow[]; hasMore: boolean } | null> {
  const limit = options.limit ?? 25;
  const offset = options.offset ?? 0;
  let query = supabase
    .from('audit_logs')
    .select('id, action, actor_email, actor_role, target_entity, details, created_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.action && options.action !== 'all') query = query.eq('action', options.action);
  if (options.actor?.trim()) query = query.ilike('actor_email', `%${options.actor.trim()}%`);
  if (options.from) query = query.gte('created_at', `${options.from}T00:00:00.000Z`);
  if (options.to) query = query.lte('created_at', `${options.to}T23:59:59.999Z`);

  const { data, error, count } = await query;
  if (error) {
    if (!isMissingRelation(error)) console.warn('[DILAAL] audit_logs failed:', error.message);
    return null;
  }
  const rows = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    action: String(row.action || 'AUDIT_ENTRY'),
    actorEmail: String(row.actor_email || ''),
    actorRole: String(row.actor_role || ''),
    targetEntity: String(row.target_entity || ''),
    details: String(row.details || ''),
    createdAt: String(row.created_at || ''),
  }));
  return {
    rows,
    hasMore: typeof count === 'number' ? offset + rows.length < count : rows.length === limit,
  };
}

export interface EvidenceRow {
  id: string;
  listingId: string | null;
  evidenceType: string;
  documentRef: string;
  documentPath: string | null;
  issuerAuthority: string;
  registryNumber: string | null;
  status: string;
  createdAt: string;
}

export async function fetchEvidenceForListings(
  listingIds: string[]
): Promise<EvidenceRow[] | null> {
  const ids = listingIds.filter((id) => UUID_PATTERN.test(id));
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('verification_evidence')
    .select(
      'id, listing_id, evidence_type, document_ref, document_path, issuer_authority, registry_number, status, created_at'
    )
    .in('listing_id', ids)
    .order('created_at', { ascending: true });
  if (error) {
    if (!isMissingRelation(error)) console.warn('[DILAAL] evidence fetch failed:', error.message);
    return null;
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    listingId: row.listing_id ? String(row.listing_id) : null,
    evidenceType: String(row.evidence_type || 'title_deed'),
    documentRef: String(row.document_ref || ''),
    documentPath: row.document_path ? String(row.document_path) : null,
    issuerAuthority: String(row.issuer_authority || ''),
    registryNumber: row.registry_number ? String(row.registry_number) : null,
    status: String(row.status || 'submitted'),
    createdAt: String(row.created_at || ''),
  }));
}

export async function insertEvidence(entry: {
  listingId: string;
  brokerId?: string | null;
  uploadedBy: string;
  evidenceType: 'title_deed' | 'boundary_survey' | 'broker_license' | 'tax_clearance' | 'owner_id';
  documentRef: string;
  documentPath?: string | null;
  mimeType?: string | null;
  fileSize?: string | null;
  issuerAuthority?: string;
  registryNumber?: string | null;
}): Promise<Result> {
  const { error } = await supabase.from('verification_evidence').insert({
    listing_id: UUID_PATTERN.test(entry.listingId) ? entry.listingId : null,
    broker_id: entry.brokerId && UUID_PATTERN.test(entry.brokerId) ? entry.brokerId : null,
    uploaded_by: entry.uploadedBy,
    evidence_type: entry.evidenceType,
    document_ref: entry.documentRef,
    document_path: entry.documentPath ?? null,
    mime_type: entry.mimeType ?? null,
    file_size: entry.fileSize ?? null,
    issuer_authority: entry.issuerAuthority ?? '',
    registry_number: entry.registryNumber ?? null,
  });
  if (!error) return { success: true };
  return { success: false, error: error.message, missing: isMissingRelation(error) };
}

export async function signedEvidenceUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('verification-docs')
    .createSignedUrl(path, 600);
  if (error || !data) {
    if (error) console.warn('[DILAAL] evidence link failed:', error.message);
    return null;
  }
  return data.signedUrl;
}

export async function setUserSuspension(
  userId: string,
  suspended: boolean,
  notes = ''
): Promise<Result> {
  const { error } = await supabase.rpc('set_user_suspension', {
    p_user_id: userId,
    p_suspended: suspended,
    p_notes: notes,
  });
  if (!error) return { success: true };
  return { success: false, error: error.message, missing: isMissingRelation(error) };
}

export async function changeUserRole(
  userId: string,
  role: 'guest' | 'user' | 'broker' | 'reviewer' | 'admin'
): Promise<Result> {
  const { error } = await supabase.rpc('set_user_role', { p_user_id: userId, p_role: role });
  if (!error) return { success: true };
  return { success: false, error: error.message, missing: isMissingRelation(error) };
}

export async function removeListingById(listingId: string, notes = ''): Promise<Result> {
  const { error } = await supabase.rpc('remove_listing', {
    p_listing_id: listingId,
    p_notes: notes,
  });
  if (!error) return { success: true };
  return { success: false, error: error.message, missing: isMissingRelation(error) };
}

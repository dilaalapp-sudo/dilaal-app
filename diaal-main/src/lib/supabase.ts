import { createClient } from '@supabase/supabase-js';
import type { PropertyListing, Broker, ReportCase, AuditLog } from '../types';

const LISTING_CACHE_KEY = 'dilaal.listings.cache.v1';

export const LISTING_PAGE_SIZE = 60;

// Cold starts render the last catalog immediately instead of an empty state.
export function readCachedListings(): PropertyListing[] | null {
  try {
    const raw = localStorage.getItem(LISTING_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as PropertyListing[]) : null;
  } catch {
    return null;
  }
}

function writeCachedListings(listings: PropertyListing[]): void {
  try {
    localStorage.setItem(LISTING_CACHE_KEY, JSON.stringify(listings));
  } catch {
    // Storage can be blocked in private mode; the live catalog still works.
  }
}

export function formatSupabaseUrl(urlOrRef?: string): string {
  if (!urlOrRef) throw new Error('VITE_SUPABASE_URL is required');
  const trimmed = urlOrRef.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}.supabase.co`;
}

export function getValidAnonKey(key?: string): string {
  if (!key) throw new Error('VITE_SUPABASE_ANON_KEY is required');
  const trimmed = key.trim();
  if (trimmed.split('.').length === 3 && trimmed.length > 80) {
    return trimmed;
  }
  throw new Error('Invalid VITE_SUPABASE_ANON_KEY format');
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_URL = formatSupabaseUrl(rawUrl);
export const SUPABASE_ANON_KEY = getValidAnonKey(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Health check / connection test
export async function checkSupabaseHealth(): Promise<{
  connected: boolean;
  projectRef: string;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const { error } = await supabase.from('listings').select('id').limit(1);
    const latency = Date.now() - start;
    if (error) {
      return { connected: false, projectRef: 'usrqtgobuylkhwblpjnb', latencyMs: latency, error: error.message };
    }
    return { connected: true, projectRef: 'usrqtgobuylkhwblpjnb', latencyMs: latency };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown connection error';
    return { connected: false, projectRef: 'usrqtgobuylkhwblpjnb', latencyMs: Date.now() - start, error: message };
  }
}

// Convert Supabase database row to frontend PropertyListing
export function mapSupabaseListing(row: Record<string, unknown>): PropertyListing {
  return {
    id: String(row.id || `listing-${Date.now()}`),
    title: String(row.title || ''),
    titleSo: String(row.title_so || row.title || ''),
    titleAr: row.title_ar ? String(row.title_ar) : undefined,
    price: Number(row.price) || 0,
    currency: (row.currency as PropertyListing['currency']) || 'USD',
    priceType: (row.price_type as PropertyListing['priceType']) || 'sale',
    countryCode: (row.country_code as PropertyListing['countryCode']) || 'SO',
    location: String(row.location || ''),
    locationDetails: String(row.location_details || ''),
    registryNumber: String(row.registry_number || ''),
    beds: row.beds !== undefined && row.beds !== null ? Number(row.beds) : undefined,
    baths: row.baths !== undefined && row.baths !== null ? Number(row.baths) : undefined,
    area: String(row.area || ''),
    areaUnit: (row.area_unit as PropertyListing['areaUnit']) || 'sqm',
    garage: row.garage !== undefined && row.garage !== null ? Number(row.garage) : undefined,
    category: (row.category as PropertyListing['category']) || 'house',
    image: String(row.image || ''),
    gallery: Array.isArray(row.gallery) ? (row.gallery as string[]) : [],
    isVerified: Boolean(row.is_verified),
    verificationStatus: (row.verification_status as PropertyListing['verificationStatus']) || 'submitted',
    verifiedLabel: String(row.verified_label || ''),
    brokerId: String(row.broker_id || ''),
    brokerName: String(row.broker_name || ''),
    brokerAvatar: String(row.broker_avatar || ''),
    brokerRating: Number(row.broker_rating) || 0,
    brokerDeals: Number(row.broker_deals) || 0,
    lat: row.lat !== undefined && row.lat !== null ? Number(row.lat) : 0,
    lng: row.lng !== undefined && row.lng !== null ? Number(row.lng) : 0,
    description: String(row.description || ''),
    amenities: Array.isArray(row.amenities) ? (row.amenities as string[]) : [],
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    moderationStatus: (row.moderation_status as PropertyListing['moderationStatus']) || 'under_review',
    ownerId: row.owner_id ? String(row.owner_id) : undefined,
    reportsCount: Number(row.reports_count) || 0,
    createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    categorySpecs: (row.category_specs || row.categorySpecs) as PropertyListing['categorySpecs'],
  };
}

// Convert PropertyListing to Supabase database row format
export function mapListingToSupabase(listing: Partial<PropertyListing>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (listing.title !== undefined) row.title = listing.title;
  if (listing.titleSo !== undefined) row.title_so = listing.titleSo;
  if (listing.titleAr !== undefined) row.title_ar = listing.titleAr;
  if (listing.price !== undefined) row.price = Number(listing.price);
  if (listing.currency !== undefined) row.currency = listing.currency;
  if (listing.priceType !== undefined) row.price_type = listing.priceType;
  if (listing.countryCode !== undefined) row.country_code = listing.countryCode;
  if (listing.location !== undefined) row.location = listing.location;
  if (listing.locationDetails !== undefined) row.location_details = listing.locationDetails;
  if (listing.registryNumber !== undefined) row.registry_number = listing.registryNumber;
  if (listing.beds !== undefined) row.beds = listing.beds;
  if (listing.baths !== undefined) row.baths = listing.baths;
  if (listing.area !== undefined) row.area = listing.area;
  if (listing.areaUnit !== undefined) row.area_unit = listing.areaUnit;
  if (listing.garage !== undefined) row.garage = listing.garage;
  if (listing.category !== undefined) row.category = listing.category;
  if (listing.image !== undefined) row.image = listing.image;
  if (listing.gallery !== undefined) row.gallery = listing.gallery;
  if (listing.isVerified !== undefined) row.is_verified = listing.isVerified;
  if (listing.verificationStatus !== undefined) row.verification_status = listing.verificationStatus;
  if (listing.verifiedLabel !== undefined) row.verified_label = listing.verifiedLabel;
  if (listing.brokerId !== undefined) row.broker_id = listing.brokerId || null;
  if (listing.ownerId !== undefined) {
    row.owner_id = listing.ownerId || null;
    row.created_by = listing.ownerId || null;
  }
  if (listing.lat !== undefined) row.lat = listing.lat;
  if (listing.lng !== undefined) row.lng = listing.lng;
  if (listing.description !== undefined) row.description = listing.description;
  if (listing.amenities !== undefined) row.amenities = listing.amenities;
  if (listing.tags !== undefined) row.tags = listing.tags;
  if (listing.moderationStatus !== undefined) row.moderation_status = listing.moderationStatus;
  return row;
}

// Fetch all listings from Supabase
export async function fetchSupabaseListings(
  options: { limit?: number; offset?: number } = {}
): Promise<PropertyListing[] | null> {
  const limit = options.limit ?? LISTING_PAGE_SIZE;
  const offset = options.offset ?? 0;
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.warn('Supabase fetch listings notice:', error.message);
      return null;
    }
    if (!data || data.length === 0) {
      return [];
    }
    const mapped = data.map(mapSupabaseListing);
    if (offset === 0) writeCachedListings(mapped);
    return mapped;
  } catch (err) {
    console.warn('Supabase fetch listings error:', err);
    return null;
  }
}

// Fetch brokers from Supabase
export async function fetchSupabaseBrokers(): Promise<Broker[] | null> {
  try {
    const { data, error } = await supabase.from('brokers').select('*');
    if (error || !data || data.length === 0) {
      return null;
    }
    return data.map((b: Record<string, unknown>) => ({
      id: String(b.id),
      name: String(b.name || ''),
      title: String(b.title || ''),
      titleSo: String(b.title_so || b.title || ''),
      avatar: String(b.avatar || ''),
      rating: Number(b.rating) || 0,
      reviewsCount: Number(b.reviews_count) || 0,
      deals: Number(b.deals) || 0,
      trustScore: Number(b.trust_score) || 0,
      tier: String(b.tier || ''),
      responseTime: String(b.response_time || ''),
      licenseNumber: String(b.license_number || ''),
      licenseAuthority: String(b.license_authority || ''),
      verificationStatus: (b.verification_status as Broker['verificationStatus']) || 'submitted',
      languages: Array.isArray(b.languages) ? (b.languages as string[]) : [],
      coverage: String(b.coverage || ''),
      countryCode: (b.country_code as Broker['countryCode']) || 'SO',
      diasporaCoverage: String(b.diaspora_coverage || ''),
      isOnline: Boolean(b.is_online),
      ownerId: b.owner_id ? String(b.owner_id) : undefined,
    }));
  } catch (err) {
    console.warn('Supabase fetch brokers error:', err);
    return null;
  }
}

// Insert listing into Supabase
export async function insertSupabaseListing(listing: Partial<PropertyListing>): Promise<{
  success: boolean;
  data?: PropertyListing;
  error?: string;
}> {
  try {
    const row = mapListingToSupabase(listing);
    const { data, error } = await supabase.from('listings').insert(row).select().single();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: mapSupabaseListing(data) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to insert listing';
    return { success: false, error: message };
  }
}

// Insert report into Supabase
export async function insertSupabaseReport(report: Omit<ReportCase, 'id' | 'createdAt' | 'status'>): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const row = {
      target_type: report.targetType,
      target_id: report.targetId,
      target_title: report.targetTitle,
      reporter_email: report.reporterEmail,
      reason: report.reason,
      description: report.description,
      status: 'pending',
    };
    let { data, error } = await supabase
      .from('reports')
      .insert({ ...row, reporter_id: user?.id ?? null })
      .select('id')
      .single();
    // Projects that have not run migration 008 yet have no reporter_id column.
    if (error && /reporter_id/i.test(error.message)) {
      ({ data, error } = await supabase.from('reports').insert(row).select('id').single());
    }
    if (error) return { success: false, error: error.message };
    return { success: true, id: data ? String(data.id) : undefined };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Insert failed' };
  }
}

// Insert audit log into Supabase
export async function insertSupabaseAuditLog(log: Omit<AuditLog, 'id'>): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      action: log.action,
      actor_role: log.actorRole,
      actor_email: log.actorEmail,
      target_entity: log.targetEntity,
      details: log.details,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Insert failed' };
  }
}

// Fetch reports from Supabase
export async function fetchSupabaseReports(): Promise<ReportCase[] | null> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return null;
    return data.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      targetType: (r.target_type as ReportCase['targetType']) || 'listing',
      targetId: String(r.target_id || ''),
      targetTitle: String(r.target_title || ''),
      reporterEmail: String(r.reporter_email || ''),
      reason: (r.reason as ReportCase['reason']) || 'other',
      description: String(r.description || ''),
      status: (r.status as ReportCase['status']) || 'pending',
      createdAt: String(r.created_at || new Date().toISOString().split('T')[0]),
    }));
  } catch {
    return null;
  }
}

// Fetch audit logs from Supabase
export async function fetchSupabaseAuditLogs(): Promise<AuditLog[] | null> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return null;
    return data.map((l: Record<string, unknown>) => ({
      id: String(l.id),
      action: String(l.action || 'AUDIT_ENTRY'),
      actorRole: (l.actor_role as AuditLog['actorRole']) || 'reviewer',
      actorEmail: String(l.actor_email || 'auditor@dilaal.market'),
      targetEntity: String(l.target_entity || 'System'),
      details: String(l.details || ''),
      timestamp: String(l.created_at || new Date().toISOString()),
    }));
  } catch {
    return null;
  }
}

import { getApiBase } from './apiBase';
import { supabase } from './supabase';

export interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
}

interface CategoryPresentation {
  icon: string;
  color: string;
  translationKey?: string;
  tag?: string;
}

const KNOWN_CATEGORIES: Record<string, CategoryPresentation> = {
  house: { icon: 'home', color: 'text-primary', translationKey: 'houses', tag: 'Guri / Filla' },
  land: { icon: 'square_foot', color: 'text-secondary', translationKey: 'land', tag: 'Dhul / Boos' },
  car: { icon: 'directions_car', color: 'text-primary', translationKey: 'cars', tag: 'Baabuur' },
  rental: { icon: 'vpn_key', color: 'text-secondary', translationKey: 'rentals', tag: 'Kiro' },
  commercial: { icon: 'apartment', color: 'text-primary', translationKey: 'commercial', tag: 'Ganacsi' },
};

/**
 * Shown until the marketplace API answers. Without this, a phone that cannot
 * reach the API renders an empty filter row — search looks broken even though
 * the catalog itself comes straight from Supabase.
 */
export const DEFAULT_MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  { id: 'house', name: 'Houses', slug: 'house', description: null, sortOrder: 1 },
  { id: 'land', name: 'Land', slug: 'land', description: null, sortOrder: 2 },
  { id: 'car', name: 'Cars', slug: 'car', description: null, sortOrder: 3 },
  { id: 'rental', name: 'Rentals', slug: 'rental', description: null, sortOrder: 4 },
  { id: 'commercial', name: 'Commercial', slug: 'commercial', description: null, sortOrder: 5 },
];

/** Icon/colour/label metadata for a DB category; unknown slugs get a generic look. */
export function categoryPresentation(category: MarketplaceCategory): CategoryPresentation {
  const known = KNOWN_CATEGORIES[category.slug];
  if (known) return known;

  const text = `${category.slug} ${category.name}`.toLowerCase();
  const icon = /electr|phone|gadget|computer|appliance/.test(text)
    ? 'devices'
    : /furniture/.test(text)
      ? 'chair'
      : /service|repair|maintenance/.test(text)
        ? 'handyman'
        : /job|career|vacancy/.test(text)
          ? 'work'
          : /livestock|cattle|animal/.test(text)
            ? 'pets'
            : 'category';

  return { icon, color: 'text-secondary' };
}

/**
 * Active categories from Supabase (admin-managed catalog), with the Express
 * API as a fallback. Returns null when both failed, so callers can keep their
 * last known catalog instead of mistaking an outage for an empty catalog.
 */
export async function fetchMarketplaceCategories(): Promise<MarketplaceCategory[] | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, description, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (!error && data) {
    return data
      .map((row) => ({
        id: String(row.id ?? ''),
        name: String(row.name ?? ''),
        slug: String(row.slug ?? ''),
        description: row.description ? String(row.description) : null,
        sortOrder: Number(row.sort_order) || 0,
      }))
      .filter((category) => category.id && category.name && category.slug);
  }

  try {
    const res = await fetch(`${await getApiBase()}/api/categories`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;

    const body = (await res.json()) as { categories?: unknown };
    if (!Array.isArray(body.categories)) return null;

    return body.categories
      .map((item) => {
        const row = item as Record<string, unknown>;
        return {
          id: String(row.id ?? ''),
          name: String(row.name ?? ''),
          slug: String(row.slug ?? ''),
          description: row.description ? String(row.description) : null,
          sortOrder: Number(row.sortOrder) || 0,
        };
      })
      .filter((category) => category.id && category.name && category.slug);
  } catch {
    return null;
  }
}

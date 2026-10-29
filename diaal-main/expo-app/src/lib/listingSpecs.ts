import { PropertyListing } from '../types';

export interface SpecChip {
  icon: string;
  label: string;
}

type Translate = (key: string, fallback?: string) => string;

export function listingSpecChips(
  item: PropertyListing,
  t: Translate,
  variant: 'featured' | 'compact' = 'featured'
): SpecChip[] {
  const chips: SpecChip[] = [];
  const specs = item.categorySpecs;

  if (item.category === 'car') {
    if (specs?.year) chips.push({ icon: 'calendar_today', label: String(specs.year) });
    if (specs?.mileage || item.area)
      chips.push({ icon: 'speed', label: String(specs?.mileage || item.area) });
    if (variant === 'featured' && specs?.transmission)
      chips.push({ icon: 'settings', label: String(specs.transmission) });
  } else if (item.category === 'land') {
    if (specs?.plotDimensions || item.area)
      chips.push({ icon: 'straighten', label: String(specs?.plotDimensions || item.area) });
    if (specs?.zoning) chips.push({ icon: 'domain', label: String(specs.zoning) });
    if (variant === 'featured' && specs?.beaconsStatus)
      chips.push({ icon: 'pin_drop', label: String(specs.beaconsStatus) });
  } else if (item.category === 'commercial') {
    if (specs?.commercialType) chips.push({ icon: 'apartment', label: String(specs.commercialType) });
    if (item.area) chips.push({ icon: 'square_foot', label: String(item.area) });
    if (variant === 'featured' && specs?.stories)
      chips.push({ icon: 'stairs', label: String(specs.stories) });
  } else {
    if (item.beds) chips.push({ icon: 'bed', label: `${item.beds} ${t('beds', 'Beds')}` });
    if (item.baths && variant === 'featured')
      chips.push({ icon: 'bathtub', label: `${item.baths} ${t('baths', 'Baths')}` });
    if (item.area) chips.push({ icon: 'square_foot', label: String(item.area) });
  }

  if (variant === 'compact') {
    if (item.category === 'car' && specs?.customsDutyPaid) {
      chips.push({ icon: 'verified', label: t('customsDutyPaid', 'Duty Paid') });
    } else if (item.isVerified) {
      chips.push({ icon: 'verified', label: t('verifiedTag', 'Verified') });
    }
  }

  return chips;
}

import { Ionicons } from '@expo/vector-icons';
import type { ExpressVetRateCard } from '../api/expressVet';

export const EXPRESS_VET_CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  express_vet: 'flash',
  normal_vet: 'calendar-outline',
  neutering: 'medkit-outline',
  spaying: 'medkit-outline',
  vaccination: 'shield-checkmark-outline',
  grooming: 'cut-outline',
};

export const EXPRESS_VET_SPECIES_LABELS: Record<string, string> = {
  dog: 'Dog',
  cat: 'Cat',
  other: 'Other',
};

export const EXPRESS_VET_SPECIES_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  dog: 'paw',
  cat: 'paw-outline',
  other: 'ellipsis-horizontal-circle-outline',
};

// Lowest starting price across species for a category, scoped to one city — used for the
// "Starting from PKR X" line shown before a species is picked.
export function lowestStartingPrice(
  rateCards: ExpressVetRateCard[],
  category: string,
  cityId: number | null
): number | null {
  const matches = rateCards.filter((rc) => rc.category === category && rc.city_id === cityId);
  if (matches.length === 0) return null;
  return Math.min(...matches.map((rc) => rc.starting_price_pkr));
}

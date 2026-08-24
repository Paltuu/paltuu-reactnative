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

// Grooming is the only category priced as a cart (see
// app/(app)/express-vet/[category]/service.tsx) — every other category prices at the
// category+species level alone. Order here is the display order on that cart screen:
// "quick_clean" first (most people want the convenient package), then à la carte items.
// Keys must match `sub_service` values seeded in prisma/seed-express-vet-config.ts exactly,
// and EXPRESS_VET_GROOMING_ITEM_KEYS in the backend's lib/expressVet/catalog.ts.
export const GROOMING_SUB_SERVICE_ORDER = [
  'quick_clean',
  'medicated_bath',
  'haircut_trim',
  'de_shedding',
  'flea_tick_treatment',
  'shave',
  'nail_trimming',
  'ear_cleaning',
  'sanitary_trim',
];

// "quick_clean" was named "Full Groom Package" originally, but it doesn't include a full
// coat trim/style the way a "full groom" implies — just a bath + basic trim + nails + ears —
// so it's named for what it actually is instead.
export const GROOMING_SUB_SERVICE_LABELS: Record<string, string> = {
  quick_clean: 'Quick Clean',
  medicated_bath: 'Medicated Bath',
  haircut_trim: 'Haircut / Trim Only',
  de_shedding: 'De-shedding Treatment',
  flea_tick_treatment: 'Flea & Tick Treatment',
  shave: 'Shave',
  nail_trimming: 'Nail Trimming',
  ear_cleaning: 'Ear Cleaning',
  sanitary_trim: 'Sanitary Trim',
};

export const GROOMING_SUB_SERVICE_DESCRIPTIONS: Record<string, string> = {
  quick_clean: 'Medicated bath, haircut/trim, nail trim & ear clean — the essentials in one package',
  medicated_bath: 'Shampoo bath with a medicated/skin-friendly wash',
  haircut_trim: 'Coat trim only, no bath included',
  de_shedding: 'Deep brush-out for heavy shedders',
  flea_tick_treatment: 'Treatment wash for fleas and ticks',
  shave: 'Full coat shave-down',
  nail_trimming: 'Quick nail trim',
  ear_cleaning: 'Quick ear clean',
  sanitary_trim: 'Hygiene-area trim',
};

export const GROOMING_SUB_SERVICE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  quick_clean: 'sparkles-outline',
  medicated_bath: 'water-outline',
  haircut_trim: 'cut-outline',
  de_shedding: 'brush-outline',
  flea_tick_treatment: 'bug-outline',
  shave: 'cut-outline',
  nail_trimming: 'hand-left-outline',
  ear_cleaning: 'ear-outline',
  sanitary_trim: 'shield-outline',
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

// Same as lowestStartingPrice but across several categories at once — used for the Pets-tab
// section tiles below, where "Vet at Home" covers both express_vet + normal_vet and
// "Neutering & Spaying" covers both neutering + spaying under one tile.
export function lowestStartingPriceForCategories(
  rateCards: ExpressVetRateCard[],
  categories: string[],
  cityId: number | null
): number | null {
  const matches = rateCards.filter((rc) => categories.includes(rc.category) && rc.city_id === cityId);
  if (matches.length === 0) return null;
  return Math.min(...matches.map((rc) => rc.starting_price_pkr));
}

// The Pets-tab / express-vet index page group raw categories into 4 front-facing sections
// rather than showing 6 same-size tiles — a tile per raw category made text truncate at
// small widths, and "Normal Vet" isn't meant to be a name a client ever sees on its own:
// it's presented as one of two choices inside "Vet at Home" (see vet-at-home.tsx), the same
// way Neutering/Spaying are two choices inside "Neutering & Spaying" (see
// neutering-spaying.tsx). Vaccination and Grooming stand alone since each is only one
// category already. `route` is a two-choice picker screen; `directCategory` skips straight
// to species.tsx since there's nothing to choose between.
export const EXPRESS_VET_SECTIONS: Array<{
  key: string;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  categoryKeys: string[];
  route: string;
  featured?: boolean;
}> = [
  {
    key: 'vet_at_home',
    label: 'Vet at Home',
    subtitle: 'Express or scheduled visits',
    icon: 'medkit-outline',
    categoryKeys: ['express_vet', 'normal_vet'],
    route: '/(app)/express-vet/vet-at-home',
    featured: true,
  },
  {
    key: 'neutering_spaying',
    label: 'Neutering & Spaying',
    subtitle: 'Sterilization, done at home',
    icon: 'medical-outline',
    categoryKeys: ['neutering', 'spaying'],
    route: '/(app)/express-vet/neutering-spaying',
  },
  {
    key: 'vaccination',
    label: 'Vaccination',
    subtitle: 'Core & rabies vaccines',
    icon: 'shield-checkmark-outline',
    categoryKeys: ['vaccination'],
    route: '/(app)/express-vet/[category]/species',
  },
  {
    key: 'grooming',
    label: 'Grooming',
    subtitle: 'Bath, haircut & more, at home',
    icon: 'cut-outline',
    categoryKeys: ['grooming'],
    route: '/(app)/express-vet/[category]/species',
  },
];

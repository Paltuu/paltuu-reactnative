// Display helpers for the owner and applicant adoption screens (My Listings,
// Adoption Requests, My Applications). Mirrors the web's utils/listingDisplay.ts
// and utils/applicationFit.ts so both apps describe a listing the same way.

export type ListingStatus = 'live' | 'review' | 'paused' | 'adopted';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

/** Collapses adoption_status + admin approval into the four states the owner sees. */
export function getListingStatus(pet: { adoption_status?: string | null; approved?: boolean | null }): ListingStatus {
  if (pet.adoption_status === 'adopted' || pet.adoption_status === 'fostered') return 'adopted';
  if (pet.adoption_status === 'paused') return 'paused';
  if (!pet.approved) return 'review';
  return 'live';
}

export const LISTING_STATUS_LABEL: Record<ListingStatus, string> = {
  live: 'Live',
  review: 'In review',
  paused: 'Paused',
  adopted: 'Adopted',
};

export function requestStatus(item: { status?: string | null }): RequestStatus {
  const s = (item.status || 'pending').toLowerCase();
  return s === 'approved' || s === 'rejected' ? s : 'pending';
}

export function requestId(item: any): number {
  return item.adoption_id;
}

export function applicantName(item: any): string {
  return item.adopter_name || 'Applicant';
}

export function firstName(name?: string | null): string {
  return (name || '').trim().split(/\s+/)[0] || 'They';
}

export function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0]?.slice(0, 2) ?? '?';
  return letters.toUpperCase();
}

/** "2 yrs", "1 yr 6 mo", "8 months" */
export function formatAgeShort(months?: number | null): string {
  if (months === null || months === undefined || months < 0) return '';
  if (months === 0) return 'Newborn';
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const y = `${years} ${years === 1 ? 'yr' : 'yrs'}`;
  return rest ? `${y} ${rest} mo` : y;
}

/** "2 years", "1 year 6 months", "8 months" */
export function formatAgeLong(months?: number | null): string {
  if (months === null || months === undefined || months < 0) return '';
  if (months === 0) return 'Newborn';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const y = years ? `${years} ${years === 1 ? 'year' : 'years'}` : '';
  const m = rest ? `${rest} ${rest === 1 ? 'month' : 'months'}` : '';
  return [y, m].filter(Boolean).join(' ');
}

export function sexLabel(sex?: string | null): string {
  if (sex === 'male') return 'Male';
  if (sex === 'female') return 'Female';
  return '';
}

/** "German Shepherd · 2 yrs · Male" */
export function petSummary(pet: any): string {
  return [pet.pet_breed || pet.breed || pet.category, formatAgeShort(pet.age_months), sexLabel(pet.sex)]
    .filter(Boolean)
    .join(' · ');
}

export function petLocation(pet: any): string {
  return [pet.area, pet.city_name].filter(Boolean).join(', ');
}

export function boolLabel(value: unknown): string {
  return value === true ? 'Yes' : value === false ? 'No' : '';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** "14 Nov", or "14 Nov 2025" outside the current year. */
export function formatShortDate(value?: string | null): string {
  const d = toDate(value);
  if (!d) return '';
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === new Date().getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** "Just now", "5 min ago", "3 hours ago", "Yesterday", "3 days ago", then a date. */
export function timeAgo(value?: string | null): string {
  const d = toDate(value);
  if (!d) return '';
  const now = new Date();
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.floor((startOfToday - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
  if (days <= 0) {
    const hours = Math.floor(mins / 60);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatShortDate(value);
}

/** timeAgo for the middle of a sentence: "yesterday", "3 days ago", "on 14 Nov". */
export function timeAgoInline(value?: string | null): string {
  const t = timeAgo(value);
  if (!t) return '';
  if (/^\d+ [A-Z]/.test(t)) return `on ${t}`;
  return t.charAt(0).toLowerCase() + t.slice(1);
}

/** "Bruno", "Bruno and Snowy", "3 pets" */
export function joinPetNames(names: string[]): string {
  const unique = Array.from(new Set(names.filter(Boolean)));
  if (unique.length <= 1) return unique[0] || '';
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  return `${unique.length} pets`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export interface RequestGroup {
  petId: number;
  petName: string;
  image: string | null;
  items: any[];
}

/** Groups applications by pet, keeping the API's newest-first order for both groups and rows. */
export function groupRequestsByPet(list: any[]): RequestGroup[] {
  const groups: RequestGroup[] = [];
  const byPet = new Map<number, RequestGroup>();
  for (const item of list) {
    let group = byPet.get(item.pet_id);
    if (!group) {
      group = { petId: item.pet_id, petName: item.pet_name, image: item.image_url || null, items: [] };
      byPet.set(item.pet_id, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// How an application lines up with the pet's listed needs (web: utils/applicationFit.ts).
// Children and other pets get a verdict; time alone is free text, so the owner judges it.

export type Verdict = 'fits' | 'check' | null;

export interface FitRow {
  key: 'children' | 'pets' | 'company';
  title: string;
  pet: string;
  them: string;
  verdict: Verdict;
}

const NO_ANSWER = /^\s*(no|none|nil|nothing|n\/?a)\b/i;
const DOG_WORDS = /\b(dog|dogs|puppy|puppies)\b/i;
const CAT_WORDS = /\b(cat|cats|kitten|kittens)\b/i;

export function assessFit(app: any, pet: any): FitRow[] {
  const minAge = Number(pet?.min_age_of_children) || 0;
  const rawAge = app.age_of_youngest_child === null || app.age_of_youngest_child === undefined
    ? ''
    : String(app.age_of_youngest_child).trim();
  const noKids = !rawAge || NO_ANSWER.test(rawAge);
  const ageMatch = noKids ? null : rawAge.match(/\d+(\.\d+)?/);
  const age = ageMatch ? Number(ageMatch[0]) : null;
  const children: FitRow = {
    key: 'children',
    title: 'Children',
    pet: minAge > 0 ? `kids ${minAge} and older` : 'children of any age',
    them: noKids ? 'no children mentioned' : age !== null ? `youngest is ${rawAge.replace(/^\D+/, '')}` : rawAge,
    verdict: noKids ? 'fits' : age !== null ? (age >= minAge ? 'fits' : 'check') : null,
  };

  const dogsOk = !!pet?.can_live_with_dogs;
  const catsOk = !!pet?.can_live_with_cats;
  const text = (app.other_pets_details || '').trim();
  const none = !text || NO_ANSWER.test(text);
  const hasDog = !none && DOG_WORDS.test(text);
  const hasCat = !none && CAT_WORDS.test(text);
  const others: FitRow = {
    key: 'pets',
    title: 'Other pets',
    pet: dogsOk && catsOk
      ? 'good with dogs and cats'
      : catsOk
        ? 'good with cats only'
        : dogsOk
          ? 'good with dogs only'
          : 'not listed as good with other pets',
    them: none ? 'no other pets' : text,
    verdict: none ? 'fits' : (hasDog && !dogsOk) || (hasCat && !catsOk) ? 'check' : hasDog || hasCat ? 'fits' : null,
  };

  const company: FitRow = {
    key: 'company',
    title: 'Time alone',
    pet: pet?.must_have_someone_home ? 'needs someone home most of the day' : 'fine alone for a few hours',
    them: (app.pet_left_alone || '').trim() || 'not stated',
    verdict: null,
  };

  return [children, others, company];
}

/** "Good match" or "2 things to check"; null when nothing could be judged. */
export function fitBadge(rows: FitRow[]): { tone: 'success' | 'warning'; label: string } | null {
  const judged = rows.filter((r) => r.verdict !== null);
  if (judged.length === 0) return null;
  const checks = judged.filter((r) => r.verdict === 'check').length;
  if (checks === 0) return { tone: 'success', label: 'Good match' };
  return { tone: 'warning', label: checks === 1 ? '1 thing to check' : `${checks} things to check` };
}

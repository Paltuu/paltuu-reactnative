/**
 * Intent detection for social post captions — two independent regex checks
 * run while composing (see PostIntentModal + app/create-post.tsx):
 *
 *   1. PET SALE  — Paltuu does not allow buying or selling pets. A match
 *      gets the author a hard warning before they post, and the server
 *      re-runs the same check on create and tags the row
 *      `content_notice_reason = 'pet_sale'` so every viewer sees a public
 *      disclaimer on the card (see PostCard's PetSaleNoticeBanner).
 *   2. ADOPTION  — a rehoming post written as a social post. Nothing is
 *      flagged or blocked; the author just gets a nudge that the Adopt
 *      section is the better place for it (real listing fields, and it
 *      reaches web + social visitors, not only their followers).
 *
 * The sale half is a CLIENT-SIDE MIRROR of
 * paltuu-nextjs/petproj/lib/moderation/petSaleDetection.ts, which is the
 * canonical copy — keep the two in sync manually, same arrangement as
 * badWords.ts next door. It is NOT a security boundary: it never blocks a
 * submission, it only warns. The adoption half is client-only — it has no
 * server-side consequence, so there is nothing to mirror.
 *
 * Both are first-pass heuristics, not classifiers, and will get things
 * wrong in both directions. The admin panel (restore / manual flag) is the
 * correction path for the sale side; the adoption side is a dismissible
 * suggestion, so a false positive costs one tap.
 */

// ── Price signals ────────────────────────────────────────────────────────────
// Used only to promote a WEAK sale phrase into a match. Kept deliberately
// narrow: a bare number alone is never a price signal on its own.

const CURRENCY_WORD_RE = /\b(?:pkr|rs|rupees?|rupay|rupaye|rupya)\b|\brs\./i;
// Not wrapped in \b — the symbols aren't word characters, so a boundary
// assertion next to them only holds when they're glued to a letter/digit.
const CURRENCY_SYMBOL_RE = /[₨₹]/;
// "4k", "15,000", "5000/-", "4000 each", "3500 only", "2000 per kitten".
const PRICE_SHAPE_RE = /\b\d{1,4}\s?k\b|\b\d{1,3}(?:,\d{3})+\b|\b\d[\d,]*\s*\/-|\b\d{3,6}\s*(?:each|only|final|fix(?:ed)?|per\b)/i;
// A 3–6 digit run standing alone ("4000") — weak on its own, so it only
// counts as a price signal when a sale phrase is already present.
const BARE_AMOUNT_RE = /\b\d{3,6}\b/;

// ── Sale phrases ─────────────────────────────────────────────────────────────
// STRONG matches alone. These read as a commercial listing on a pet app with
// or without a number attached ("kitten for sale", "billi bechni hai").

const STRONG_SALE_PHRASES = [
    // --- English ---
    'for sale', 'up for sale', 'available for sale', 'for selling',
    'sale post', 'selling my', 'selling this', 'selling her', 'selling him',
    'selling them', 'want to sell', 'wanna sell', 'looking to sell',
    'contact to buy', 'contact for price', 'dm for price', 'inbox for price',
    'serious buyers', 'serious buyer', 'genuine buyers', 'genuine buyer',
    'no time wasters', 'best offer', 'reasonable offer',
    'final price', 'fixed price', 'price fix', 'price is fixed',

    // --- Roman Urdu/Hindi ---
    'bechna hai', 'bechni hai', 'bechne hai', 'bechna h', 'bechni h',
    'bech raha', 'bech rahi', 'bech dena', 'bech dunga', 'bech doon',
    'bikri', 'bikri ke liye', 'bikau', 'bikaoo', 'bikaao',
    'bikna hai', 'bikta hai', 'bikti hai', 'bikaana', 'bikana',
    'sale ke liye', 'sale par', 'sale pe',
    'price final hai', 'qeemat final', 'rate final',
];

// WEAK needs a price signal alongside it. On their own these turn up
// constantly in unrelated posts ("I'd never sell her", "great price on this
// litter box"), so matching them bare would over-trigger badly.
const WEAK_SALE_PHRASES = [
    // --- English ---
    'sell', 'selling', 'sold', 'buy', 'buyer', 'buyers', 'purchase',
    'price', 'priced', 'pricing', 'negotiable', 'nego', 'offer',
    'cod', 'cash on delivery', 'advance payment', 'advance booking',
    'delivery available', 'home delivery', 'deliver anywhere',
    'easypaisa', 'easy paisa', 'jazzcash', 'jazz cash', 'bank transfer',
    '1st come 1st serve', 'first come first serve', 'first come first served',

    // --- Roman Urdu/Hindi ---
    'qeemat', 'qimat', 'keemat', 'daam', 'rate', 'demand', 'paisay', 'paise',
    'kharidna', 'kharid lo', 'khareedna', 'le lo',
];

// Slogans and disclaimers that contain sale vocabulary but say the opposite.
// Stripped from the text before matching rather than special-cased per
// phrase, so "adopt don't shop, she's not for sale" stays clean.
const SALE_EXCLUSIONS = [
    "adopt don't shop", 'adopt dont shop', 'adopt not shop',
    "don't shop adopt", 'dont shop adopt',
    'not for sale', 'nahi bechni', 'nahi bechna', 'never sell', 'not selling',
    'no sale', 'free of cost', 'bilkul free', 'free me',
];

// ── Adoption phrases ─────────────────────────────────────────────────────────
// STRONG matches alone — explicit enough that the author is clearly placing
// or seeking a pet, not just talking about adoption in the abstract.

const STRONG_ADOPTION_PHRASES = [
    // --- English ---
    'for adoption', 'up for adoption', 'available for adoption',
    'giving for adoption', 'give for adoption', 'giving away for adoption',
    'giving her for adoption', 'giving him for adoption', 'giving them for adoption',
    'open for adoption', 'ready for adoption', 'adoption post',
    'rehome', 'rehomed', 'rehoming', 're-home', 're-homing',
    'free to a good home', 'free to good home', 'free to loving home',
    'needs a home', 'need a home', 'needs a new home', 'need a new home',
    'needs a loving home', 'needs a forever home',
    'looking for a home', 'looking for a new home',
    'looking for a loving home', 'looking for a forever home',
    'forever home', 'willing to adopt', 'want to adopt', 'wants to adopt',
    'anyone willing to adopt', 'please adopt', 'adopt her', 'adopt him',
    'adopt them', 'adopt this', 'adopt these', 'adopt my',

    // --- Roman Urdu/Hindi ---
    'adoption ke liye', 'adopt karna', 'adopt kar lo', 'adopt karlo',
    'adoption chahiye', 'ghar chahiye', 'naya ghar chahiye', 'ghar dena',
    'goad lena', 'god lena', 'muft dena',
];

// WEAK needs a pet word nearby — "adoption" and "good home" are ordinary
// vocabulary and shouldn't nudge someone writing about, say, adopting a
// habit or praising a shelter.
const WEAK_ADOPTION_PHRASES = [
    'adoption', 'adopt', 'good home', 'loving home', 'new home', 'shelter',
];

const PET_WORDS = [
    'cat', 'cats', 'kitten', 'kittens', 'kitty', 'billi', 'billa', 'bili',
    'dog', 'dogs', 'puppy', 'puppies', 'pup', 'pups', 'kutta', 'kutiya', 'kuttay',
    'pet', 'pets', 'rabbit', 'rabbits', 'bunny', 'bunnies', 'khargosh',
    'parrot', 'parrots', 'bird', 'birds', 'tota', 'budgie', 'budgies',
    'hamster', 'hamsters', 'fish', 'turtle', 'tortoise',
    'persian', 'siamese', 'ragdoll', 'husky', 'labrador', 'german shepherd',
];

const ADOPTION_EXCLUSIONS = [
    "adopt don't shop", 'adopt dont shop', 'adopt not shop',
    "don't shop adopt", 'dont shop adopt',
    'adopted', 'got adopted', 'has been adopted', 'already adopted',
    'found a home', 'found her home', 'found his home', 'found a forever home',
];

// ── Matching ─────────────────────────────────────────────────────────────────

function escapeForRegex(word: string): string {
    return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
}

function buildMatcher(phrases: string[], flags = 'i'): RegExp {
    return new RegExp(`\\b(?:${phrases.map(escapeForRegex).join('|')})\\b`, flags);
}

function buildStripper(phrases: string[]): RegExp {
    return new RegExp(`\\b(?:${phrases.map(escapeForRegex).join('|')})\\b`, 'gi');
}

const STRONG_SALE_RE = buildMatcher(STRONG_SALE_PHRASES, 'gi');
const WEAK_SALE_RE = buildMatcher(WEAK_SALE_PHRASES);
const SALE_EXCLUSION_RE = buildStripper(SALE_EXCLUSIONS);

const STRONG_ADOPTION_RE = buildMatcher(STRONG_ADOPTION_PHRASES, 'gi');
const WEAK_ADOPTION_RE = buildMatcher(WEAK_ADOPTION_PHRASES);
const PET_WORD_RE = buildMatcher(PET_WORDS);
const ADOPTION_EXCLUSION_RE = buildStripper(ADOPTION_EXCLUSIONS);

// "she is not for sale", "inhe bechna nahi hai" — a negator within the two
// words before a strong phrase inverts it. Cheap approximation of intent;
// the real correction path is the author dismissing the warning.
const NEGATION_BEFORE_RE = /\b(?:not|no|never|nahi|nahin|dont|don't|doesn't|didnt|didn't|isn't|isnt|aren't|arent|won't|wont)\b(?:\W+\w+){0,2}\W*$/i;

/** True when any match of `re` in `text` survives the negation check. */
function hasUnnegatedMatch(re: RegExp, text: string): boolean {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        if (!NEGATION_BEFORE_RE.test(text.slice(0, m.index))) return true;
        // Zero-length matches can't happen here (every phrase has length),
        // but guard the loop anyway so a future empty entry can't hang it.
        if (m.index === re.lastIndex) re.lastIndex++;
    }
    return false;
}

/**
 * True when `text` reads as a pet-for-sale listing: either a strong sale
 * phrase on its own, or a weak one backed by a price signal.
 */
export function hasPetSaleMatch(text: string): boolean {
    if (!text) return false;
    const cleaned = text.replace(SALE_EXCLUSION_RE, ' ');
    if (hasUnnegatedMatch(STRONG_SALE_RE, cleaned)) return true;
    if (!WEAK_SALE_RE.test(cleaned)) return false;
    return (
        CURRENCY_WORD_RE.test(cleaned) ||
        CURRENCY_SYMBOL_RE.test(cleaned) ||
        PRICE_SHAPE_RE.test(cleaned) ||
        BARE_AMOUNT_RE.test(cleaned)
    );
}

/**
 * True when `text` reads as a rehoming/adoption listing: either a strong
 * adoption phrase on its own, or a weak one alongside a pet word.
 */
export function hasAdoptionIntentMatch(text: string): boolean {
    if (!text) return false;
    const cleaned = text.replace(ADOPTION_EXCLUSION_RE, ' ');
    if (hasUnnegatedMatch(STRONG_ADOPTION_RE, cleaned)) return true;
    return WEAK_ADOPTION_RE.test(cleaned) && PET_WORD_RE.test(cleaned);
}

export type PostIntent = 'pet_sale' | 'adoption' | null;

/**
 * Single verdict for the composer. Sale wins over adoption when both match
 * — a listing that mentions both ("adoption fee 5000, serious buyers only")
 * is the case the sale warning exists for, and showing the friendly Adopt
 * nudge instead would be exactly the wrong signal.
 */
export function detectPostIntent(text: string): PostIntent {
    if (!text) return null;
    if (hasPetSaleMatch(text)) return 'pet_sale';
    if (hasAdoptionIntentMatch(text)) return 'adoption';
    return null;
}

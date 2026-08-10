/**
 * CLIENT-SIDE MIRROR — used only to show an inline "this may be flagged"
 * warning while composing/typing (see ContentWarningBanner and
 * IdentityWarningBanner). It is NOT a security boundary: it never blocks a
 * submission, and the server re-checks the same words authoritatively — see
 * paltuu-nextjs/petproj/lib/moderation/badWords.ts, which is the canonical
 * copy. Keep the two in sync manually; they're small enough that a shared
 * package wasn't worth the cross-repo wiring.
 *
 * SEVERE covers two things — enough to auto shadow-hide a post/comment or
 * hard-reject an identity field (name/username/bio/pet name/pet bio):
 *   1) Slurs/hate speech (racial/ethnic/religious/homophobic/transphobic/
 *      ableist) and bestiality/animal-abuse references — same bar in every
 *      language.
 *   2) ALL Roman Urdu/Hindi profanity (madarchod, chutiya, gaand, randi,
 *      harami, ...) — a deliberate, asymmetric product call: this is the
 *      primary language of abuse on this app given its Pakistan market, so
 *      it's held to a stricter bar than its English equivalent.
 * English general profanity ("fuck"/"cunt"/"bastard"), even strong
 * ("fucks bad bitches" in a pet bio), is MILD — allowed, just flagged. See
 * the Next.js copy for the full rationale and the pet-app vocabulary
 * collisions kept out of SEVERE ("bitch"/"kutta"/"gadha"/"suar"/"pilla"/
 * "ullu"/"sex"/"gandi"/"dalal"...) — those aren't profanity to begin with.
 */

export const SEVERE_WORDS = [
    // --- English: racial/ethnic slurs, hate terms ---
    'chink', 'coon', 'jap', 'spac', 'nazi',
    'n1gga', 'n1gger', 'nigg3r', 'nigg4h', 'nigga', 'niggah', 'niggas', 'niggaz', 'nigger', 'niggers',

    // --- English: homophobic / transphobic / ableist slurs ---
    'fag', 'fagging', 'faggitt', 'faggot', 'faggs', 'fagot', 'fagots', 'fags',
    'gaylord', 'homo', 'dyke', 'retard', 'heshe', 'shemale',

    // --- English: bestiality / animal-abuse content ---
    'beastial', 'beastiality', 'bestial', 'bestiality',

    // --- Roman Urdu/Hindi: transphobic slurs, hate terms ---
    'hijda', 'hijra', 'hijade', 'chakka', 'takke',
    'porkistan',

    // --- Roman Urdu/Hindi: strong sexual / incest-based / degrading
    // insults — treated as SEVERE unlike their English equivalents ---
    'bahenchod', 'behenchod', 'bhenchod', 'bhenchodd', 'bsdk', 'b.s.d.k',
    'bhosada', 'bhosda', 'bhosdaa', 'bhosdike', 'bhonsdike', 'bhosdiki', 'bhosdiwala', 'bhosdiwale',
    'bhosdi', 'bhosri wala', 'bhosdi wala', 'bhonsri wala',
    'bhosadchodal', 'bhosadchod',
    'madarchod', 'madarchodd', 'madarchood', 'madarchoot', 'madarchut',
    'chod', 'chodd', 'chodna', 'chudna', 'chud', 'chodu', 'chodela',
    'chodo', 'chodi', 'chodne', 'chodva', 'chudo', 'chudi', 'chudne', 'chudva', 'chodai', 'chuda', 'chudai', 'chudvana',
    'chudwa', 'chudwaa', 'chudwane', 'chudwaane',
    'chutia', 'chutiya', 'chutiye', 'chutiyapa', 'chutmar', 'chut', 'choot', 'chute',
    'gaand', 'gand', 'gandu', 'gaandu', 'gandfat', 'gandfut', 'gandiya', 'gandiye', 'bund',
    'gandphatu', 'gandphati', 'gandphata', 'gandphaton', 'gand phatu', 'gand phati', 'gand phata', 'gand phaton',
    'gaandmasti', 'gand masti', 'gandmarna', 'gandmaru', 'gandmarana', 'gandmari',
    'gand marna', 'gand maru', 'gand mari', 'gand marana',
    'lund', 'land', 'lundwa', 'laude', 'laudey', 'laura', 'lora', 'lauda', 'lavda', 'lawda', 'loda', 'lode',
    'laundi', 'loundi', 'laundiya', 'loundiya', 'lulli', 'nunni', 'nunnu', 'gadhalund',
    'raand', 'rand', 'randi', 'randy', 'randwa', 'randhwa', 'randibazar', 'randibazaar',
    'chinaal', 'chinal', 'ghasti', 'ghassad',
    'harami', 'haramjada', 'haraamjaada', 'haramzyada', 'haraamzyaada', 'haraamjaade', 'haraamzaade',
    'haramzada', 'haramzadi', 'haramia', 'haraamkhor', 'haramkhor',
    'bhadua', 'bhaduaa', 'bhadva', 'bhadvaa', 'bhadwa', 'bhadwaa', 'bhandwa', 'bhadwe', 'bhadwon', 'bhadwi',
    'bhadwapanti', 'bhandi',
    'chut marike', 'land marike', 'gand mari ke', 'muth marna',
];

export const SEVERE_PHRASES = [
    'kutte ki zat', 'suar ki aulad', 'suar ki zat', 'gadhe ki aulad', 'gadhe ki zat',
    'bandar ki aulad', 'bandar ki zat', 'bhains ki aulad', 'bhains ki zat',
    'ullu ki aulad', 'ullu ki zat', 'lomdi ki aulad', 'lomdi ki zat',
    'bhed ki aulad', 'bhed ki zat', 'bakri ki aulad', 'bakri ki zat',
    'billi ki aulad', 'billi ki zat', 'mendhak ki aulad', 'mendhak ki zat',

    // --- Racist phrases: the individual words are common vocabulary, so
    // only the combination (invoking slavery/dehumanization rhetoric) is
    // SEVERE, not the bare words — see the Next.js copy for rationale. ---
    'slavery black monkey', 'black monkey slavery', 'monkey slavery',
];

export const MILD_WORDS = [
    // --- English: general profanity / crude-but-not-degrading / body-slang ---
    '4r5e', '5h1t', '5hit', 'a55', 'anal', 'anus', 'ar5e', 'arrse', 'arse', 'ass', 'asses', 'a_s_s',
    'b!tch', 'b17ch', 'b1tch', 'bi+ch', 'biatch', 'bitch', 'bitcher', 'bitchers', 'bitches', 'bitchin', 'bitching',
    'l3i+ch', 'l3itch',
    'b00bs', 'boob', 'boobs', 'booobs', 'boooobs', 'booooobs', 'booooooobs', 'breasts',
    'ballbag', 'balls', 'ballsack', 'bellend', 'boner', 'buceta', 'bugger', 'bum', 'butt', 'butthole',
    'buttmuch', 'buttplug',
    'c0ck', 'cawk', 'cipa', 'cl1t', 'clit', 'clitoris', 'clits', 'cock', 'cockface', 'cockhead',
    'cockmunch', 'cockmuncher', 'cocks', 'cok', 'cox',
    'crap', 'cum', 'cummer', 'cumming', 'cums', 'cyberfuc', 'cyberfuck', 'cyberfucked', 'cyberfucker',
    'cyberfuckers', 'cyberfucking',
    'damn', 'dink', 'dinks', 'dirsa', 'doggin', 'dogging', 'donkeyribber',
    'f4nny', 'fanny', 'fannyflaps', 'fannyfucker', 'fanyy', 'fatass', 'flange',
    'fingerfuck', 'fingerfucked', 'fingerfucker', 'fingerfuckers', 'fingerfucking', 'fingerfucks',
    'fistfuck', 'fistfucked', 'fistfucker', 'fistfuckers', 'fistfucking', 'fistfuckings', 'fistfucks',
    'God', 'god-dam', 'god-damned', 'goddamn', 'goddamned', 'hell', 'bloody',
    'horniest', 'horny', 'lust', 'lusting',
    'jism', 'jiz', 'jizm', 'jizz', 'spunk', 'semen',
    'jap',
    'kawk', 'kock', 'kondum', 'kondums', 'kum', 'kummer', 'kumming', 'kums',
    'm0f0', 'm0fo', 'mo-fo', 'mof0', 'mofo',
    'masochist', 'sadist',
    'muff', 'numbnuts', 'nutsack',
    'pawn', 'pecker', 'penis', 'labia', 'vulva', 'vagina', 'testical', 'testicle', 'scroat', 'scrote', 'scrotum',
    'pimpis', 'piss', 'pissed', 'pisser', 'pissers', 'pisses', 'pissflaps', 'pissin', 'pissing', 'pissoff',
    'poop', 'pube',
    'pusse', 'pussi', 'pussies', 'pussy', 'pussys',
    'rectum', 'schlong', 'screwing',
    's hit', 's.o.b.', 'sh!+', 'sh!t', 'sh1t', 'shi+', 's_h_i_t', 'shit', 'shite', 'shited', 'shitey',
    'shiting', 'shitings', 'shits', 'shitted', 'shitter', 'shitters', 'shitting', 'shittings', 'shitty',
    'shag', 'shagger', 'shaggin', 'shagging',
    'smut', 'snatch',
    't1tt1e5', 't1tties', 'teets', 'teez', 'tit', 'titfuck', 'tits', 'titt', 'tittie5', 'tittiefucker',
    'titties', 'tittyfuck', 'tittywank', 'titwank',
    'turd', 'wang', 'whoar', 'willies', 'willy', 'w00se',
    'goatse', 'boiolas', 'bollock', 'bollok',

    // --- English: general/strong profanity — allowed, warn-only ---
    'bastard', 'son-of-a-bitch',
    'whore', 'hoar', 'hoare', 'hoer', 'hore', 'slut', 'sluts', 'skank',
    'cnut', 'cunt', 'cuntlick', 'cuntlicker', 'cuntlicking', 'cunts',
    'mothafuck', 'mothafucka', 'mothafuckas', 'mothafuckaz', 'mothafucked', 'mothafucker', 'mothafuckers',
    'mothafuckin', 'mothafucking', 'mothafuckings', 'mothafucks',
    'mother fucker', 'motherfuck', 'motherfucked', 'motherfucker', 'motherfuckers', 'motherfuckin',
    'motherfucking', 'motherfuckings', 'motherfuckka', 'motherfucks',
    'muthafecker', 'muthafuckker', 'muther', 'mutherfucker', 'mutha',
    'f u c k', 'f u c k e r', 'f_u_c_k', 'fcuk', 'fcuker', 'fcuking', 'feck', 'fecker',
    'fook', 'fooker', 'fuck', 'fucka', 'fucked', 'fucker', 'fuckers', 'fuckhead', 'fuckheads',
    'fuckin', 'fucking', 'fuckings', 'fuckingshitmotherfucker', 'fuckme', 'fucks', 'fuckwhit', 'fuckwit',
    'fuk', 'fuker', 'fukker', 'fukkin', 'fuks', 'fukwhit', 'fukwit', 'fux', 'fux0r',
    'phuck', 'phuk', 'phuked', 'phuking', 'phukked', 'phukking', 'phuks', 'phuq',
    'c0cksucker', 'cock-sucker', 'cocksuck', 'cocksucked', 'cocksucker', 'cocksucking', 'cocksucks',
    'cocksuka', 'cocksukka', 'coksucka', 'cokmuncher', 'carpet muncher',
    'ass-fucker', 'assfucker', 'assfukka', 'asshole', 'assholes', 'asswhole',
    'dick', 'd1ck', 'dlck', 'dickhead', 'prick', 'pricks',
    'knob', 'knobead', 'knobed', 'knobend', 'knobhead', 'knobjocky', 'knobjokey', 'nob jokey', 'nobhead',
    'nobjocky', 'nobjokey', 'nob',
    'wank', 'wanker', 'wanky', 'tosser',
    'tw4t', 'twat', 'twathead', 'twatty', 'twunt', 'twunter',
    'pigfucker', 'dog-fucker', 'bunny fucker', 'fudge packer', 'fudgepacker',
    'shitdick', 'shitfuck', 'shitfull', 'shithead',
    'doosh', 'duche', 'penisfucker', 'smegma',

    // --- English: explicit sexual content / acts — warn-only ---
    'blowjob', 'blowjobs', 'blow job', 'cumshot', 'gangbang', 'gangbanged', 'gangbangs',
    'hardcoresex', 'hotsex', 'phonesex', 'gaysex',
    'cunilingus', 'cunillingus', 'cunnilingus', 'kunilingus', 'fellate', 'fellatio', 'felching',
    'rimjaw', 'rimming',
    'm45terbate', 'ma5terb8', 'ma5terbate', 'master-bate', 'masterb8', 'masterbat*', 'masterbat3',
    'masterbate', 'masterbation', 'masterbations', 'masturbate',
    'porn', 'porno', 'pornography', 'pornos', 'pron', 'p0rn',
    'orgasim', 'orgasims', 'orgasm', 'orgasms',
    'ejaculate', 'ejaculated', 'ejaculates', 'ejaculating', 'ejaculatings', 'ejaculation', 'ejakulate',
    'jack-off', 'jackoff', 'jerk-off', 'xrated', 'xxx',
    'dildo', 'dildos', 'viagra', 'v14gra', 'v1gra', 'cyalis',

    // --- Roman Urdu/Hindi: literal animal/body vocabulary (pet-app collisions) and mild/casual terms ---
    'aad', 'aand',
    'bevda', 'bewda', 'bevdey', 'bewday',
    'bevakoof', 'bevkoof', 'bevkuf', 'bewakoof', 'bewkoof', 'bewkuf',
    'bakchod', 'bakchodd', 'bakchodi',
    'babbe', 'babbey', 'bube', 'bubey', 'mamme', 'mammey', 'boobley', 'buuble', 'baable',
    'bur', 'burr', 'buurr', 'buur',
    'charsi',
    'chooche', 'choochi', 'chuchi', 'chuchiyan', 'chuuche',
    'chuttad', 'chutad',
    'dalaal', 'dalal', 'dalle', 'dalley',
    'fattu',
    'gadha', 'gadhe',
    'goo', 'gu',
    'gote', 'gotey', 'gotte',
    'hag', 'haggu', 'hagne', 'hagney',
    'jhat', 'jhaat', 'jhaatu', 'jhatu', 'jhaant',
    'kutta', 'kutte', 'kuttey',
    'kutia', 'kutiya', 'kuttiya', 'kutti',
    'landi', 'landy',
    'ling',
    'launda', 'lounde', 'laundey',
    'maar', 'maro', 'marunga', 'marana', 'marani', 'marane',
    'moot', 'mut', 'mootne', 'mutne', 'mooth', 'muth', 'muthi', 'mutthal',
    'paaji', 'paji',
    'pesaab', 'pesab', 'peshaab', 'peshab', 'pisaab', 'pisab',
    'pkmkb',
    'pilla', 'pillay', 'pille', 'pilley',
    'suar',
    'tatte', 'tatti', 'tatty',
    'ullu',
    'gandi',
    'jigolo',
    'kamina', 'kamini',
    'bakland',
    'badir', 'badirchand',
];

export interface BadWordMatch {
    severe: string[];
    mild: string[];
}

function escapeForRegex(word: string): string {
    return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
}

function buildMatcher(words: string[]): RegExp | null {
    if (words.length === 0) return null;
    const pattern = words.map(escapeForRegex).join('|');
    return new RegExp(`\\b(?:${pattern})\\b`, 'gi');
}

const SEVERE_RE = buildMatcher([...SEVERE_WORDS, ...SEVERE_PHRASES]);
const MILD_RE = buildMatcher(MILD_WORDS);

const LEET_SUBSTITUTIONS: Record<string, string> = {
    '!': 'i', '1': 'i', '0': 'o', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '+': 't',
};
const LEET_RE = new RegExp(`[${Object.keys(LEET_SUBSTITUTIONS).map((c) => `\\${c}`).join('')}]`, 'g');

/**
 * Normalizes common leetspeak substitutions ("n!gga", "sl4very") to plain
 * letters before matching — see the Next.js copy (canonical) for the full
 * rationale. Kept in sync manually like the rest of this file.
 */
export function normalizeLeetspeak(text: string): string {
    return text.replace(LEET_RE, (ch) => LEET_SUBSTITUTIONS[ch] ?? ch);
}

/**
 * Scans free text for SEVERE and MILD matches, for the composer's inline
 * warning only. Case-insensitive, whole-word. Returns deduped, lowercased
 * matches — empty arrays for clean text.
 */
export function matchBadWords(text: string): BadWordMatch {
    if (!text) return { severe: [], mild: [] };
    const normalized = normalizeLeetspeak(text);
    const severe = SEVERE_RE ? Array.from(new Set((normalized.match(SEVERE_RE) ?? []).map((w) => w.toLowerCase()))) : [];
    const mild = MILD_RE ? Array.from(new Set((normalized.match(MILD_RE) ?? []).map((w) => w.toLowerCase()))) : [];
    return { severe, mild };
}

/**
 * Identity fields (display name, username, pet name, bios) get glued
 * together with underscores/periods/digits instead of spaces — "chink_boy"
 * — where \b never breaks (both '_' and digits are \w). Normalizing those
 * separators to spaces before matching still relies on \b, so it does NOT
 * false-positive on e.g. "raccoon_lover" containing "coon".
 */
export function normalizeForIdentifierMatch(text: string): string {
    return text.replace(/[._]+/g, ' ').replace(/\d+/g, ' ');
}

/** Same warn-only usage as matchBadWords, just pre-normalized for identity fields. */
export function matchBadWordsIdentity(text: string): BadWordMatch {
    if (!text) return { severe: [], mild: [] };
    return matchBadWords(normalizeForIdentifierMatch(text));
}

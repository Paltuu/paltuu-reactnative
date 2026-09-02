import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Animated, { SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useAuthStore } from '../../../src/stores/authStore';
import { useLocationStore } from '../../../src/stores/locationStore';
import { petApi } from '../../../src/api/pets';
import { expressVetApi } from '../../../src/api/expressVet';
import { EXPRESS_VET_SECTIONS } from '../../../src/constants/expressVet';
import { useActiveExpressVetRequest } from '../../../src/hooks/useActiveExpressVetRequest';
import { StaggeredPlaceholder } from '../../../src/components/common/CyclingText';
import { FONTS } from '../../../src/constants/typography';
import { SkeletonCircle } from '../../../src/components/common/Skeleton';
import { subscribeToTabPress } from '../../../src/utils/tabPressSubscription';
import { PawrvezDialog } from '../../../src/components/common/mascot';
import { storage } from '../../../src/utils/storage';

const H_PAD = 20;
const DARK = '#1A1A2E';
const TILE_BG = '#F5F5F5';

// Greeting subtitles — cycle the same way the search tab cycles its placeholders.
const GREETING_LINES = [
  'Welcome back to the pet community.',
  'Every pet deserves a loving home.',
  'A new friend might be one tap away.',
  "Ready to find your perfect match?",
  'Your pet deserves the best care.',
];
const GREETING_INTERVAL = 6500;

const NEARBY_FETCH_LIMIT = 10;
const NEARBY_VISIBLE_COUNT = 5;
const NEARBY_ROTATE_INTERVAL = 4000;

const getPetImage = (pet: any): string =>
  pet.main_image || pet.image_url || pet.profile_image_url || pet.image || null;

// Owns its own interval/state so the greeting tick only re-renders this small
// subtree instead of the entire Pets tab (hero tile, images, nearby list, ...).
const GreetingText = React.memo(function GreetingText({
  firstName,
  isFocused,
}: {
  firstName: string;
  isFocused: boolean;
}) {
  const [greetingIndex, setGreetingIndex] = useState(0);
  useEffect(() => {
    if (!isFocused) return;
    const timer = setInterval(() => {
      setGreetingIndex((prev) => (prev + 1) % GREETING_LINES.length);
    }, GREETING_INTERVAL);
    return () => clearInterval(timer);
  }, [isFocused]);

  return (
    <View style={styles.topBar}>
      <Text style={styles.greetingTitle}>Hey {firstName}</Text>
      <StaggeredPlaceholder text={GREETING_LINES[greetingIndex]} style={styles.greetingSubtitle} wrap />
    </View>
  );
});

// Same isolation as GreetingText — the 4s rotation shouldn't re-render the
// rest of the screen, just this carousel.
const NearbyPetsCarousel = React.memo(function NearbyPetsCarousel({
  nearbyPages,
  isNearbyLoading,
  isFocused,
  cityName,
  hasCity,
  isEmpty,
  onPress,
}: {
  nearbyPages: any[][];
  isNearbyLoading: boolean;
  isFocused: boolean;
  cityName?: string | null;
  hasCity: boolean;
  isEmpty: boolean;
  onPress: () => void;
}) {
  const [nearbyPage, setNearbyPage] = useState(0);
  useEffect(() => {
    setNearbyPage(0);
  }, [nearbyPages.length]);
  useEffect(() => {
    if (!isFocused || nearbyPages.length <= 1) return;
    const timer = setInterval(() => {
      setNearbyPage((prev) => (prev + 1) % nearbyPages.length);
    }, NEARBY_ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [isFocused, nearbyPages.length]);

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.nearbyTile}>
      <View style={styles.nearbyHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.nearbyTitle}>Pets Near You</Text>
          <Text style={styles.nearbySub}>
            {!hasCity
              ? 'Turn on location to see pets in your city'
              : isEmpty
                ? `No pets listed in ${cityName} yet`
                : `Recently listed in ${cityName}`}
          </Text>
        </View>
        {/* Same grey as the hero / lost-found tiles' sub-rows. */}
        <Ionicons name="arrow-forward" size={16} color="#999999" />
      </View>

      <View style={styles.nearbyCirclesViewport}>
        {isNearbyLoading ? (
          <View className="flex-row gap-3">
            {Array.from({ length: NEARBY_VISIBLE_COUNT }).map((_, i) => (
              <SkeletonCircle key={`skeleton-${i}`} size={56} />
            ))}
          </View>
        ) : isEmpty ? (
          <View style={styles.nearbyEmpty}>
            <Text style={styles.nearbyEmptyText}>
              {hasCity
                ? 'Be the first to list a pet here — tap to browse all pets.'
                : 'We need your location to find pets listed in your city.'}
            </Text>
          </View>
        ) : (
          <Animated.View
            key={nearbyPage}
            entering={SlideInRight.duration(350)}
            exiting={SlideOutLeft.duration(350)}
            style={styles.nearbyCirclesRow}
          >
            {nearbyPages[nearbyPage].map((pet) => (
              <View key={pet.pet_id} style={styles.nearbyCircle}>
                <Image
                  source={
                    getPetImage(pet) ? { uri: getPetImage(pet) } : require('../../../assets/dog-placeholder.webp')
                  }
                  style={styles.nearbyCircleImg}
                  contentFit="cover"
                />
              </View>
            ))}
          </Animated.View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// Illustration per section, keyed by EXPRESS_VET_SECTIONS' `key` — pixel-art icons matching
// what each section actually is (stethoscope/scissors/vaccine/grooming tools), converted to
// webp from the vets-pixel source set.
// Neutering/Spaying and Vaccination deliberately have no entry here — those two tiles keep
// the empty illustration slot (per product direction) while Doorstep Vet and Grooming keep
// their artwork.
const BENTO_ILLUSTRATIONS: Record<string, any> = {
  vet_at_home: require('../../../assets/pets-hub/vet-stethoscope.webp'),
  grooming: require('../../../assets/pets-hub/vet-grooming.webp'),
};

// Karachi-only. Replaces NearbyPetsCarousel in that layout (see PetsHubScreen). Bento-style
// grid (not all tiles the same size) matching the rest of the Pets tab's visual language —
// TILE_BG background like every other tile here, no brand-color highlight on any one card.
// Grouped into 4 sections (see EXPRESS_VET_SECTIONS) instead of 6 raw categories, and each
// section deep-links straight into its picker/species screen, skipping the express-vet index.
const VetAtHomeSections = React.memo(function VetAtHomeSections({
  onPressSection,
}: {
  onPressSection: (section: (typeof EXPRESS_VET_SECTIONS)[number]) => void;
}) {
  const [vetAtHome, neuteringSpaying, vaccination, grooming] = EXPRESS_VET_SECTIONS;

  // Title/subtitle now live in <VetsAtHomePresents> above these tiles, which doubles as the
  // divider between the everyday pet tiles and this feature's own section.
  return (
    <View style={{ gap: 10 }}>
      {/* Hero row — full width, the primary/most-urgent entry point. Taller than the other
          tiles (bentoHero, not bentoSmall/bentoTall's shared height budget) so the stethoscope
          illustration — roughly square, unlike this tile's wide aspect ratio — has real room
          instead of rendering small and centered in a lot of empty space. */}
      <BentoTile
        section={vetAtHome}
        onPress={() => onPressSection(vetAtHome)}
        tileStyle={styles.bentoHero}
        badge="20% OFF"
        heroLayout
      />

      {/* One tall tile on the left, matched in total height by two small tiles stacked on
          the right — the "not all tiles the same size" bento layout. */}
      <View style={styles.bentoRow}>
        <BentoTile section={grooming} onPress={() => onPressSection(grooming)} tileStyle={styles.bentoTall} />
        <View style={styles.bentoColumn}>
          <BentoTile
            section={neuteringSpaying}
            onPress={() => onPressSection(neuteringSpaying)}
            tileStyle={styles.bentoSmall}
          />
          <BentoTile
            section={vaccination}
            onPress={() => onPressSection(vaccination)}
            tileStyle={styles.bentoSmall}
          />
        </View>
      </View>
    </View>
  );
});

// Divider between the everyday pet tiles (adopt/rehome/vets directory/lost & found, all
// cities) and the Karachi-only Vets at Home section below it. The wordmark is the actual
// logo asset in place of the word "Paltuu" — not a font rendering of the name.
const VetsAtHomePresents = React.memo(function VetsAtHomePresents() {
  return (
    <View style={styles.presentsWrap}>
      <View style={styles.presentsBrandRow}>
        <Image
          source={require('../../../assets/paltuu_bilkul_tight.svg')}
          style={styles.presentsLogo}
          contentFit="contain"
        />
        <Text style={styles.presentsText}>Home Vets</Text>
      </View>
      <Text style={styles.presentsCta}>Certified vets & caretakers, at your doorstep in Karachi</Text>
    </View>
  );
});

function BentoTile({
  section,
  onPress,
  tileStyle,
  badge,
  heroLayout,
}: {
  section: (typeof EXPRESS_VET_SECTIONS)[number];
  onPress: () => void;
  tileStyle: any;
  badge?: string;
  heroLayout?: boolean;
}) {
  const illustration = BENTO_ILLUSTRATIONS[section.key];

  // Hero variant (Doorstep Vet) — mirrors heroTile/karachiBigTile's own bleed-art pattern
  // elsewhere in this file: text pinned bottom-left in its own flex column, a fixed-width
  // spacer reserves layout room on the right, and the actual illustration is absolutely
  // positioned oversized/bleeding out of that space rather than being letterboxed small and
  // centered like the small/tall tiles below it.
  if (heroLayout) {
    return (
      <TouchableOpacity activeOpacity={0.9} style={[styles.bentoTile, tileStyle, styles.bentoHeroRow]} onPress={onPress}>
        {badge ? (
          <View style={styles.bentoBadge}>
            <Text style={styles.bentoBadgeText}>{badge}</Text>
          </View>
        ) : null}
        <View style={styles.bentoHeroText}>
          <Text style={styles.bentoLabel} numberOfLines={2}>
            {section.label}
          </Text>
          <Text style={styles.bentoCtaText} numberOfLines={2}>
            {section.subtitle}
          </Text>
        </View>
        <View style={styles.bentoHeroIllustrationSpace} />
        {illustration && (
          <Image source={illustration} style={styles.bentoHeroIllustrationImg} contentFit="contain" />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.9} style={[styles.bentoTile, tileStyle]} onPress={onPress}>
      {badge ? (
        <View style={styles.bentoBadge}>
          <Text style={styles.bentoBadgeText}>{badge}</Text>
        </View>
      ) : null}
      <View style={styles.bentoIllustration}>
        {illustration && (
          <Image source={illustration} style={styles.bentoIllustrationImg} contentFit="contain" />
        )}
      </View>
      <View style={styles.bentoFooter}>
        <Text style={styles.bentoLabel} numberOfLines={2}>
          {section.label}
        </Text>
        <Text style={styles.bentoCtaText} numberOfLines={2}>
          {section.subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function PetsHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const user = useAuthStore((state) => state.user);
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there';

  const [showMascotDialog, setShowMascotDialog] = useState(false);

  // First-visit tip introducing what Pet Hub is for. Shown once ever.
  useEffect(() => {
    (async () => {
      if (await storage.isPetHubMascotSeen()) return;
      await storage.markPetHubMascotSeen();
      setShowMascotDialog(true);
    })();
  }, []);

  const { cityId, cityName } = useLocationStore();

  // Gates the Karachi-only Vets at Home layout (see §9/§10 of the handoff doc). An unresolved
  // city or a still-loading config must fall back to the default (non-Karachi) layout below —
  // both `cityId == null` and `isPending` naturally make `isKarachiExpressVet` false.
  const { data: expressVetConfig } = useQuery({
    queryKey: ['express-vet-config'],
    queryFn: expressVetApi.getConfig,
    staleTime: 1000 * 60 * 30,
  });
  const isKarachiExpressVet = !!cityId && !!expressVetConfig?.enabled_cities.city_ids.includes(cityId);
  const { activeRequest } = useActiveExpressVetRequest(isKarachiExpressVet);

  // Strictly the user's own city — no nationwide fallback. A tile headed
  // "Pets Near You" that quietly lists pets from other cities is misleading,
  // so an empty city renders an empty state instead (see NearbyPetsCarousel).
  const { data: cityPetsData, isPending: isCityPetsPending, refetch: refetchCityPets } = useQuery({
    queryKey: ['nearby-pets', cityId],
    queryFn: () =>
      petApi.getAdoptionPets({
        city: String(cityId),
        limit: NEARBY_FETCH_LIMIT,
      }),
    enabled: !!cityId && !isKarachiExpressVet,
  });
  const nearbyPets: any[] = cityPetsData?.data ?? [];

  // Re-tapping the Pets tab while already on it refreshes the nearby-pets data.
  useEffect(() => {
    return subscribeToTabPress('pets', () => {
      refetchCityPets();
    });
  }, [refetchCityPets]);

  // `isPending` stays true forever while the query is disabled, so the
  // skeleton has to be gated on actually having a city to fetch for.
  const isNearbyLoading = !!cityId && isCityPetsPending;
  const isNearbyEmpty = !cityId || (!isNearbyLoading && nearbyPets.length === 0);

  const nearbyPages = useMemo(() => {
    const pages: any[][] = [];
    for (let i = 0; i < nearbyPets.length; i += NEARBY_VISIBLE_COUNT) {
      pages.push(nearbyPets.slice(i, i + NEARBY_VISIBLE_COUNT));
    }
    return pages.length ? pages : [[]];
  }, [nearbyPets]);

  // Extracted so the Karachi branch below can reorder these ahead of the Vets at Home
  // section while the non-Karachi branch keeps them exactly where they always were — same
  // elements either way, just placed differently.

  // Tile — Adopt a Pet (Hero). `city: 'all'` clears any city left in Adopt's cached filters:
  // this is the "browse everything" entry point, so it must not inherit the city Pets Near
  // You last set.
  const heroTile = (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push({ pathname: '/(app)/adopt', params: { city: 'all' } } as any)}
      // Shorter on the Karachi layout only — there's more competing for space above the fold
      // once the squareRow/Lost&Found/Vets-at-Home section all sit on the same screen.
      // Every other city keeps the original height untouched.
      style={[styles.heroTile, isKarachiExpressVet && styles.heroTileShort]}
    >
      <View style={styles.heroText}>
        <Text style={styles.heroHeadline}>
          Find Your{'\n'}Forever Friend
        </Text>
        <View style={styles.lostFoundSubRow}>
          <Text style={styles.lostFoundSubText}>Adopt a Pet Now</Text>
          <Ionicons name="arrow-forward" size={12} color="#999999" />
        </View>
      </View>
      <View style={styles.heroIllustrationSpace}>
        <Image
          source={require('../../../assets/pets-hub/huugging.webp')}
          style={styles.heroIllustrationImg}
          contentFit="contain"
        />
      </View>
    </TouchableOpacity>
  );

  // Row — Vets & Clinics / Rehome a Pet. Non-Karachi only from here on (see the Karachi
  // branch below for karachiBigTile/karachiSquareRow, which swap Clinics and Lost & Found
  // between these two shapes) — left exactly as it always was.
  const squareRow = (
    <View style={styles.squareRow}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push('/(app)/pet-care' as any)}
        style={styles.squareTile}
      >
        <View style={styles.squareIllustration}>
          <Image
            source={require('../../../assets/pets-hub/doctor.webp')}
            style={styles.clinicIllustrationImg}
            contentFit="contain"
          />
        </View>
        <View style={styles.squareFooter}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.squareLabel}>Find Vets</Text>
            <Text style={styles.squareSub}>& Clinics Near You</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push('/(app)/create-pet' as any)}
        style={styles.squareTile}
      >
        <View style={styles.squareIllustration}>
          <Image
            source={require('../../../assets/pets-hub/playing.webp')}
            style={styles.squareIllustrationImg}
            contentFit="contain"
          />
        </View>
        <View style={styles.squareFooter}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.squareLabel}>Find a New Home</Text>
            <Text style={styles.squareSub}>for Your Pet</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  // Tile — Lost & Found. Non-Karachi only from here on — full tile, unchanged, the least
  // important tile/feature on this page but not visually demoted to a slim link.
  const lostFoundTile = (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push('/(app)/create-lost-found' as any)}
      style={styles.lostFoundStrip}
    >
      <Image
        source={require('../../../assets/pets-hub/sad.webp')}
        style={styles.lostFoundImg}
        contentFit="contain"
      />
      <View style={styles.lostFoundTextCol}>
        <Text style={styles.lostFoundText}>Lost or Found a Pet?</Text>
        <View style={styles.lostFoundSubRow}>
          <Text style={styles.lostFoundSubText}>Report here</Text>
          <Ionicons name="arrow-forward" size={12} color="#999999" />
        </View>
      </View>
    </TouchableOpacity>
  );

  // Karachi only — same two tiles, swapped shapes: Vets & Clinics moves into the big strip
  // tile (it's the more useful everyday link once Vets at Home exists below), Lost & Found
  // moves into a small square alongside "Find a New Home for Your Pet". Reduced height on
  // the big tile per product direction, matching heroTileShort above.
  // Same text-left / illustration-bleeding-right structure as heroTile (not the small
  // inline-icon pattern lostFoundStrip normally uses) — the small icon read as cramped at
  // this tile's height, per product feedback.
  const karachiBigTile = (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push('/(app)/pet-care' as any)}
      style={[styles.heroTile, styles.heroTileShort]}
    >
      {/* Mirror of heroTile's layout: illustration on the left, text on the right. */}
      <View style={styles.heroIllustrationSpace}>
        <Image
          source={require('../../../assets/pets-hub/doctor.webp')}
          style={styles.clinicsWideIllustrationImg}
          contentFit="contain"
        />
      </View>
      <View style={styles.clinicsWideText}>
        <Text style={styles.lostFoundText}>Find Vets{'\n'}& Clinics</Text>
        <View style={styles.lostFoundSubRow}>
          <Text style={styles.lostFoundSubText}>Near You</Text>
          <Ionicons name="arrow-forward" size={12} color="#999999" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const karachiSquareRow = (
    <View style={styles.squareRow}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push('/(app)/create-lost-found' as any)}
        style={styles.squareTile}
      >
        <View style={styles.squareIllustration}>
          <Image
            source={require('../../../assets/pets-hub/sad.webp')}
            style={styles.squareIllustrationImg}
            contentFit="contain"
          />
        </View>
        <View style={styles.squareFooter}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.squareLabel}>Lost or Found</Text>
            <Text style={styles.squareSub}>a Pet?</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push('/(app)/create-pet' as any)}
        style={styles.squareTile}
      >
        <View style={styles.squareIllustration}>
          <Image
            source={require('../../../assets/pets-hub/playing.webp')}
            style={styles.squareIllustrationImg}
            contentFit="contain"
          />
        </View>
        <View style={styles.squareFooter}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.squareLabel}>Find a New Home</Text>
            <Text style={styles.squareSub}>for Your Pet</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* ── Scrollable Content ─────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top Bar (now inside ScrollView) ───────────────── */}
        <GreetingText firstName={firstName} isFocused={isFocused} />

        {heroTile}
        <View style={{ height: 12 }} />

        {isKarachiExpressVet ? (
          <>
            {/* Karachi: every everyday-pet tile (adopt/vets-directory/rehome/lost&found) is
                grouped at the top, same as every other city — Vets at Home is a distinct
                section below its own divider, not interleaved with them. Pets Near You is
                dropped entirely here since it's redundant with the hero tile above.
                Vets & Clinics and Lost & Found swap tile shapes here specifically (see
                karachiBigTile/karachiSquareRow above) — the non-Karachi pairing below is
                untouched. Wide / squared×2 / wide rhythm: hero, then the two squares, then
                the Vets & Clinics wide tile. */}
            {karachiSquareRow}
            <View style={{ height: 12 }} />
            {karachiBigTile}

            <View style={{ height: 20 }} />
            <VetsAtHomePresents />
            <View style={{ height: 12 }} />

            <VetAtHomeSections
              onPressSection={(section) => {
                // One booking at a time — the server rejects a second submission anyway (see
                // requests/route.ts's active-booking guard), so redirect straight to the
                // existing one instead of walking the user through a form that'll fail at the end.
                if (activeRequest) {
                  router.push({
                    pathname: '/(app)/express-vet/requests/[id]',
                    params: { id: activeRequest.request_id },
                  } as any);
                  return;
                }
                // Vaccination/Grooming have one underlying category each — go straight to
                // species.tsx. Vet at Home / Neutering & Spaying cover two categories, so they
                // route to a picker screen first (see EXPRESS_VET_SECTIONS' `route` field).
                if (section.categoryKeys.length === 1) {
                  router.push({
                    pathname: '/(app)/express-vet/[category]/species',
                    params: { category: section.categoryKeys[0] },
                  } as any);
                } else {
                  router.push(section.route as any);
                }
              }}
            />
          </>
        ) : (
          <>
            {/* Pets Near You — taller, rotating circular avatars. Opens Adopt with
                the user's city pre-selected so the grid matches what the tile was
                previewing; with no city resolved it passes 'all' rather than
                inheriting a stale city from the cached filters. */}
            <NearbyPetsCarousel
              nearbyPages={nearbyPages}
              isNearbyLoading={isNearbyLoading}
              isFocused={isFocused}
              cityName={cityName}
              hasCity={!!cityId}
              isEmpty={isNearbyEmpty}
              onPress={() =>
                router.push({
                  pathname: '/(app)/adopt',
                  params: { city: cityId ? String(cityId) : 'all' },
                } as any)
              }
            />
            <View style={{ height: 12 }} />
            {squareRow}
            <View style={{ height: 12 }} />
            {lostFoundTile}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <PawrvezDialog
        visible={showMascotDialog}
        text="Pet Hub: adopt a pet, list yours for adoption, or find vets and grooming nearby."
        onDismiss={() => setShowMascotDialog(false)}
        actionLabel="Got it"
        onAction={() => setShowMascotDialog(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  // ── Top bar
  topBar: {
    marginBottom: 16,
  },
  greetingTitle: {
    fontFamily: FONTS.heading,
    fontSize: 24,
    color: DARK,
    marginBottom: 4,
  },
  greetingSubtitle: {
    fontFamily: FONTS.headingSemi,
    fontSize: 12,
    color: '#555555',
  },

  // ── Scroll content
  scrollContent: {
    paddingHorizontal: H_PAD,
  },

  // ── Hero tile
  heroTile: {
    height: 140,
    borderRadius: 20,
    backgroundColor: TILE_BG,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  // Karachi only (see heroTile's usage in PetsHubScreen) — the illustration is absolutely
  // positioned and anchored bottom-right (see heroIllustrationImg below), so shrinking the
  // tile just crops more of its top off; nothing needs resizing to match.
  heroTileShort: {
    height: 110,
  },
  heroText: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingLeft: 20,
    paddingTop: 24,
    paddingBottom: 14,
  },
  heroHeadline: {
    fontFamily: FONTS.bodyBold,
    fontSize: 22,
    lineHeight: 23,
    color: DARK,
  },
  heroIllustrationSpace: {
    width: 140,
  },
  heroIllustrationImg: {
    position: 'absolute',
    bottom: -14,
    right: -50,
    width: 245,
    height: 245 / (2816 / 1536),
  },
  // Karachi only — karachiBigTile ("Find Vets & Clinics") reuses heroTile's shape/structure
  // but at a shorter height, so this bleeds less dramatically than heroIllustrationImg.
  // Anchored bottom-LEFT (image sits on the left, text on the right — the mirror image of
  // heroTile's layout, see clinicsWideText below).
  clinicsWideIllustrationImg: {
    position: 'absolute',
    bottom: -22,
    left: 8,
    width: 155,
    height: 155,
  },
  // Text column for karachiBigTile — same box as heroText but right-padded/right-aligned
  // since the illustration is on the left here instead of the right.
  clinicsWideText: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: 20,
    paddingTop: 24,
    paddingBottom: 14,
  },

  // ── Pets Near You tile (taller, rotating circular avatars)
  nearbyTile: {
    borderRadius: 20,
    backgroundColor: TILE_BG,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  nearbyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nearbyTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 20,
    color: DARK,
  },
  nearbySub: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  nearbyCirclesViewport: {
    height: 56,
    marginTop: 14,
    overflow: 'hidden',
  },
  nearbyCirclesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nearbyCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#E5E5E5',
  },
  nearbyEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  nearbyEmptyText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: '#999999',
  },
  nearbyCircleImg: {
    width: '100%',
    height: '100%',
  },

  // ── "Paltuu presents Vets at Home" divider (Karachi only) — separates the everyday pet
  // tiles above from the Vets at Home section below. The logo mark stands in for the word
  // "Paltuu" rather than the name being set in text.
  presentsWrap: {
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  presentsBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presentsLogo: {
    width: 28 * (2210 / 1173),
    height: 28,
  },
  presentsText: {
    fontFamily: FONTS.pixel,
    // Pixeled renders visually larger/wider than the DMSans this used to be, so 18 (the old
    // size) overpowered the subtitle beneath it — 14 reads as the same optical weight.
    fontSize: 14,
    color: DARK,
  },
  presentsCta: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
    textAlign: 'center',
  },
  // Bento grid — every tile shares the same neutral TILE_BG used everywhere else on this
  // page, no per-tile color; size is what varies (hero + stacked small + tall).
  bentoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bentoColumn: {
    flex: 1,
    gap: 10,
  },
  bentoTile: {
    borderRadius: 20,
    backgroundColor: TILE_BG,
    overflow: 'hidden',
  },
  bentoBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    backgroundColor: '#A03048',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  bentoBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  bentoHero: {
    height: 130,
  },
  bentoHeroRow: {
    flexDirection: 'row',
  },
  bentoHeroText: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 14,
  },
  // Fixed-width spacer reserving layout room on the right for the illustration.
  bentoHeroIllustrationSpace: {
    width: 140,
  },
  // Sized deliberately larger than the tile so the stethoscope bleeds past the top and bottom
  // edges and gets cropped by bentoTile's overflow:'hidden' — same bleed treatment the other
  // hero tiles on this page use. Negative top/bottom insets make the image box 162 high on a
  // 130-high tile; contentFit:'contain' then renders the ~square art at the 140 width, and the
  // 15° rotation pushes its corners out further still.
  bentoHeroIllustrationImg: {
    position: 'absolute',
    top: -16,
    bottom: -16,
    right: 10,
    width: 140,
    transform: [{ rotate: '-15deg' }],
  },
  bentoSmall: {
    flex: 1,
    // 76 was too tight: a 2-line label + 2-line subtitle in bentoFooter (~77px incl.
    // padding) left zero room for bentoIllustration and got clipped by this tile's
    // overflow:hidden, hiding the bottom of the CTA text (e.g. "Neutering & Spaying").
    // 100 leaves real breathing room even in that worst-case wrap.
    height: 100,
  },
  bentoTall: {
    flex: 1,
    height: 210, // matches bentoSmall(100) + gap(10) + bentoSmall(100)
  },
  bentoIllustration: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  bentoIllustrationImg: {
    width: '100%',
    height: '100%',
  },
  bentoFooter: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
  },
  bentoLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    lineHeight: 16,
    color: DARK,
  },
  bentoCtaText: {
    fontFamily: FONTS.body,
    fontSize: 11,
    lineHeight: 13,
    color: '#999999',
    marginTop: 1,
  },

  // ── Square tiles
  squareRow: {
    flexDirection: 'row',
    gap: 10,
  },
  squareTile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 20,
    backgroundColor: TILE_BG,
    overflow: 'hidden',
  },
  squareIllustration: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareIllustrationImg: {
    width: 104,
    height: 104,
  },
  clinicIllustrationImg: {
    width: 120,
    height: 120,
  },
  squareFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  squareLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: DARK,
    textAlign: 'center',
  },
  squareSub: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: DARK,
    textAlign: 'center',
  },

  // ── Lost & Found strip (non-Karachi) / big tile shape reused for Karachi's Vets & Clinics
  lostFoundStrip: {
    height: 116,
    borderRadius: 14,
    backgroundColor: TILE_BG,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 24,
    paddingBottom: 14,
    gap: 12,
  },
  lostFoundImg: {
    width: 96,
    height: 96,
  },
  lostFoundTextCol: {
    alignItems: 'flex-end',
  },
  lostFoundText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 22,
    lineHeight: 23,
    color: DARK,
    textAlign: 'right',
  },
  lostFoundSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  lostFoundSubText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#999999',
    textAlign: 'right',
  },
});

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
import { EXPRESS_VET_CATEGORY_ICONS, lowestStartingPrice } from '../../../src/constants/expressVet';
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

// Karachi-only. Replaces NearbyPetsCarousel in that layout (see PetsHubScreen) — each card
// deep-links straight into that category's species picker, skipping the express-vet index screen.
const VetsAtHomeCarousel = React.memo(function VetsAtHomeCarousel({
  categories,
  rateCards,
  cityId,
  onPressCategory,
  onPressSeeAll,
}: {
  categories: { key: string; label: string }[];
  rateCards: any[];
  cityId: number | null;
  onPressCategory: (categoryKey: string) => void;
  onPressSeeAll: () => void;
}) {
  return (
    <View style={styles.vetsAtHomeTile}>
      <TouchableOpacity activeOpacity={0.7} onPress={onPressSeeAll} style={styles.nearbyHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.nearbyTitle}>Vets at Home</Text>
          <Text style={styles.nearbySub}>Home-visit vet & grooming care</Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color="#999999" />
      </TouchableOpacity>

      <View style={styles.vetsAtHomeGrid}>
        {categories.map((category) => {
          const price = lowestStartingPrice(rateCards, category.key, cityId);
          return (
            <TouchableOpacity
              key={category.key}
              activeOpacity={0.9}
              style={styles.vetsAtHomeCard}
              onPress={() => onPressCategory(category.key)}
            >
              <View style={styles.vetsAtHomeCardIcon}>
                <Ionicons
                  name={EXPRESS_VET_CATEGORY_ICONS[category.key] ?? 'paw'}
                  size={22}
                  color="#A03048"
                />
              </View>
              <Text style={styles.vetsAtHomeCardLabel} numberOfLines={1}>
                {category.label}
              </Text>
              <Text style={styles.vetsAtHomeCardPrice} numberOfLines={1}>
                {price != null ? `From PKR ${price.toLocaleString()}` : 'Coming soon'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

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
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
      >
        {/* ── Top Bar (now inside ScrollView) ───────────────── */}
        <GreetingText firstName={firstName} isFocused={isFocused} />

        {/* Tile 1 — Adopt a Pet (Hero). `city: 'all'` clears any city left in
            Adopt's cached filters: this is the "browse everything" entry point,
            so it must not inherit the city Pets Near You last set. */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push({ pathname: '/(app)/adopt', params: { city: 'all' } } as any)}
          style={styles.heroTile}
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

        <View style={{ height: 12 }} />

        {/* Karachi: Pets Near You is redundant with the hero tile's adoption entry point,
            so it's replaced by the Vets at Home carousel — the main advertising surface
            for that feature. Everywhere else, today's layout is untouched. */}
        {isKarachiExpressVet ? (
          <VetsAtHomeCarousel
            categories={expressVetConfig?.categories ?? []}
            rateCards={expressVetConfig?.rate_cards ?? []}
            cityId={cityId}
            onPressCategory={(categoryKey) =>
              router.push({
                pathname: '/(app)/express-vet/[category]/species',
                params: { category: categoryKey },
              } as any)
            }
            onPressSeeAll={() => router.push('/(app)/express-vet' as any)}
          />
        ) : (
          // Pets Near You — taller, rotating circular avatars. Opens Adopt with
          // the user's city pre-selected so the grid matches what the tile was
          // previewing; with no city resolved it passes 'all' rather than
          // inheriting a stale city from the cached filters.
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
        )}

        <View style={{ height: 12 }} />

        {/* Row — Vets & Clinics / Rehome a Pet */}
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

        <View style={{ height: 12 }} />

        {/* Tile 3 — Lost & Found. Karachi: demoted to the least prominent element on the
            screen per product direction, shrunk to a slim link instead of an illustrated tile. */}
        {isKarachiExpressVet ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(app)/create-lost-found' as any)}
            style={styles.lostFoundSlim}
          >
            <Text style={styles.lostFoundSlimText}>Lost or Found a Pet?</Text>
            <Ionicons name="arrow-forward" size={14} color="#999999" />
          </TouchableOpacity>
        ) : (
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
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <PawrvezDialog
        visible={showMascotDialog}
        text="This is Pet Hub! Find pets looking for a home, list your own pet up for adoption, or track down trusted vets and grooming spots nearby."
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
    bottom: 0,
    right: -50,
    width: 274.4,
    height: 274.4 / (2816 / 1536),
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

  // ── Vets at Home carousel (Karachi only)
  vetsAtHomeTile: {
    borderRadius: 20,
    backgroundColor: TILE_BG,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  vetsAtHomeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  vetsAtHomeCard: {
    width: '31%',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 6,
  },
  vetsAtHomeCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8E9EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vetsAtHomeCardLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: DARK,
  },
  vetsAtHomeCardPrice: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: '#999999',
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

  // ── Lost & Found strip
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

  // ── Lost & Found, Karachi-demoted slim variant
  lostFoundSlim: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  lostFoundSlimText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: '#999999',
  },
});

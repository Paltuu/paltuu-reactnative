import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated as RNAnimated,
} from 'react-native';
import Animated, { SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useAuthStore } from '../../src/stores/authStore';
import { useLocationStore } from '../../src/stores/locationStore';
import { petApi } from '../../src/api/pets';
import { StaggeredPlaceholder } from '../../src/components/common/CyclingText';
import { FONTS } from '../../src/constants/typography';

const H_PAD = 20;
const ROSE = '#A03048';
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

export default function PetsHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const user = useAuthStore((state) => state.user);
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there';

  const [greetingIndex, setGreetingIndex] = useState(0);
  useEffect(() => {
    if (!isFocused) return;
    const timer = setInterval(() => {
      setGreetingIndex((prev) => (prev + 1) % GREETING_LINES.length);
    }, GREETING_INTERVAL);
    return () => clearInterval(timer);
  }, [isFocused]);

  const fadeAnim = useRef(new RNAnimated.Value(0.4)).current;
  useEffect(() => {
    if (!isFocused) return;
    const animation = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(fadeAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        RNAnimated.timing(fadeAnim, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [isFocused, fadeAnim]);

  const { cityId, cityName } = useLocationStore();

  const { data: cityPetsData, isPending: isCityPetsPending, isFetched: isCityPetsFetched } = useQuery({
    queryKey: ['nearby-pets', cityId],
    queryFn: () =>
      petApi.getAdoptionPets({
        city: cityId ? String(cityId) : undefined,
        limit: NEARBY_FETCH_LIMIT,
      }),
  });
  const cityPets: any[] = cityPetsData?.data ?? [];

  // TODO: tentative fallback — if the user's city has no listings, just show
  // the most recent pets nationwide rather than an empty tile. Revisit once
  // we know what a better "no pets nearby" experience should look like
  // (e.g. nearest neighbouring cities instead of a blanket nationwide list).
  const noCityResults = isCityPetsFetched && cityPets.length === 0 && !!cityId;
  const { data: fallbackPetsData, isPending: isFallbackPending } = useQuery({
    queryKey: ['nearby-pets-fallback'],
    queryFn: () => petApi.getAdoptionPets({ limit: NEARBY_FETCH_LIMIT }),
    enabled: noCityResults,
  });

  const isNearbyLoading = isCityPetsPending || (noCityResults && isFallbackPending);

  const usingFallback = noCityResults && !!fallbackPetsData;
  const nearbyPets: any[] = usingFallback ? fallbackPetsData?.data ?? [] : cityPets;

  const nearbyPages = useMemo(() => {
    const pages: any[][] = [];
    for (let i = 0; i < nearbyPets.length; i += NEARBY_VISIBLE_COUNT) {
      pages.push(nearbyPets.slice(i, i + NEARBY_VISIBLE_COUNT));
    }
    return pages.length ? pages : [[]];
  }, [nearbyPets]);

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
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      {/* ── Top Bar (non-scrollable) ───────────────────────── */}
      <View style={styles.topBar}>
        <Text style={styles.greetingTitle}>Hey {firstName}</Text>
        <StaggeredPlaceholder
          text={GREETING_LINES[greetingIndex]}
          style={styles.greetingSubtitle}
          wrap
        />
      </View>

      {/* ── Scrollable Content ─────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tile 1 — Adopt a Pet (Hero) */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/(app)/adopt' as any)}
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
              source={require('../../assets/pets-hub/huugging.png')}
              style={styles.heroIllustrationImg}
              contentFit="contain"
            />
          </View>
        </TouchableOpacity>

        <View style={{ height: 12 }} />

        {/* Pets Near You — taller, rotating circular avatars */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/(app)/adopt' as any)}
          style={styles.nearbyTile}
        >
          <View style={styles.nearbyHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nearbyTitle}>Pets Near You</Text>
              <Text style={styles.nearbySub}>
                Recently listed
                {cityName && !usingFallback ? ` in ${cityName}` : ' near you'}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={ROSE} />
          </View>

          <View style={styles.nearbyCirclesViewport}>
            {isNearbyLoading ? (
              <RNAnimated.View
                style={{ opacity: fadeAnim }}
                className="flex-row gap-3"
              >
                {Array.from({ length: NEARBY_VISIBLE_COUNT }).map((_, i) => (
                  <View key={`skeleton-${i}`} style={styles.nearbyCircle} />
                ))}
              </RNAnimated.View>
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
                        getPetImage(pet)
                          ? { uri: getPetImage(pet) }
                          : require('../../assets/dog-placeholder.png')
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
                source={require('../../assets/pets-hub/doctor.png')}
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
                source={require('../../assets/pets-hub/playing.png')}
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

        {/* Tile 3 — Lost & Found Strip */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/(app)/lost-found' as any)}
          style={styles.lostFoundStrip}
        >
          <Image
            source={require('../../assets/pets-hub/sad.png')}
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

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  // ── Top bar
  topBar: {
    paddingHorizontal: H_PAD,
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
    overflow: 'visible',
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
    color: '#555555',
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
  nearbyCircleImg: {
    width: '100%',
    height: '100%',
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
});

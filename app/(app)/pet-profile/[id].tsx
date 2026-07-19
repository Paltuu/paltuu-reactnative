import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  RefreshControl,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { petProfilesApi, PetProfile, PetProfilePhoto } from '../../../src/api/petProfiles';
import { useAuthStore } from '../../../src/stores/authStore';
import { useLocationStore } from '../../../src/stores/locationStore';
import PostCard from '../../../src/components/social/PostCard';
import { SocialPost } from '../../../src/api/social';
import { Avatar } from '../../../src/components/common/Avatar';
import { PetIdCard } from '../../../src/components/pets/PetIdCard';
import { PolaroidCard } from '../../../src/components/pets/PolaroidCard';
import { PetProfileScreenSkeleton } from '../../../src/components/common/PetProfileScreenSkeleton';
import { withFocusUnmount } from '../../../src/components/common/withFocusUnmount';

const { width } = Dimensions.get('window');
// Grid has 2px of container padding on each side plus a 2px gap between the
// 3 columns (2 gaps total) — subtract both before dividing, or the 3rd
// column overflows the row and wraps down to a 2-per-row layout.
const GALLERY_COL_SIZE = (width - 2 * 2 - 2 * 2) / 3;
const AVATAR_SIZE = 88;
// Gap between the (screen-centered) pet name and the Edit pill to its right.
const NAME_EDIT_GAP = 15;

// Species → emoji badge mapping for personality
const speciesEmoji: Record<string, string> = {
  cat: '🐱', dog: '🐶', bird: '🐦', rabbit: '🐰',
  hamster: '🐹', fish: '🐠', turtle: '🐢', parrot: '🦜',
};

const getSpeciesEmoji = (species: string) =>
  speciesEmoji[species?.toLowerCase()] ?? '🐾';

// The backend's calculateAge returns full text ("5 years 6 months") sized for
// prose contexts (listings, etc). In the stats row it needs to sit shoulder
// to shoulder with one-word values like "Cat"/"Male" without wrapping onto a
// second line and throwing the row's vertical rhythm off, so abbreviate it
// here rather than changing the shared backend format.
const abbreviateAge = (age: string | null | undefined): string => {
  if (!age) return '—';
  return age
    .replace(/\byears?\b/g, 'y')
    .replace(/\bmonths?\b/g, 'm')
    .replace(/less than a m/, '<1m')
    .replace(/\s+/g, ' ')
    .trim();
};

// Splits "5y 6m" into digit runs (rendered at the normal stat size) and unit
// letter runs (rendered smaller) — `statValue`'s own textTransform:'capitalize'
// would otherwise uppercase the units ("5Y 6M"), so unit spans explicitly
// force lowercase to override that inherited transform.
const renderAgeValue = (age: string) => {
  const parts = age.split(/(\d+)/).filter((p) => p.length > 0);
  return parts.map((part, i) => (
    <Text key={i} style={/^\d+$/.test(part) ? undefined : s.statValueUnit}>
      {part}
    </Text>
  ));
};

type Tab = 'posts' | 'gallery' | 'about';
const TABS: Tab[] = ['posts', 'gallery', 'about'];

function PetProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const petId = params.id as string;
  const from = params.from as string;

  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<PetProfile | null>(null);
  const [photos, setPhotos] = useState<PetProfilePhoto[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [nameWidth, setNameWidth] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<PetProfilePhoto | null>(null);
  const pagerRef = useRef<ScrollView>(null);
  // Tab bar taps and pager swipes both drive `activeTab` — this guards against
  // the tap-triggered scrollTo's own onMomentumScrollEnd firing setActiveTab
  // again with a stale index while the animation is still in flight.
  const isProgrammaticScroll = useRef(false);

  const goToTab = (tab: Tab) => {
    setActiveTab(tab);
    isProgrammaticScroll.current = true;
    pagerRef.current?.scrollTo({ x: TABS.indexOf(tab) * width, animated: true });
  };

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isOwner = user?.id && profile?.owner_id && Number(user.id) === Number(profile.owner_id);

  const goBack = () => {
    if (from === 'profile') {
      router.navigate('/(app)/profile');
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/(app)/profile');
    }
  };

  useEffect(() => { fetchProfile(); }, [petId]);
  // Tab content now sits in a swipeable pager where every tab is mounted at
  // once (paging needs all pages present side by side), so both tabs' data
  // is fetched together up front instead of gated behind `activeTab`.
  useEffect(() => { fetchPosts(true); }, [petId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchProfile(), fetchPhotos(), fetchPosts(true)]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Preload photos for hero banner too
  useEffect(() => {
    if (profile) fetchPhotos();
  }, [profile?.pet_profile_id]);

  const fetchProfile = async () => {
    try {
      setIsLoadingProfile(true);
      const data = await petProfilesApi.getPetProfile(petId);
      setProfile(data);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to load pet profile.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const fetchPhotos = async () => {
    try {
      setIsLoadingPhotos(true);
      const res = await petProfilesApi.getPetPhotos(petId);
      setPhotos(res.photos);
    } catch (error) {
      console.error('Fetch Photos Error:', error);
    } finally {
      setIsLoadingPhotos(false);
    }
  };

  const fetchPosts = async (reset = false) => {
    if (isLoadingPosts) return;
    try {
      setIsLoadingPosts(true);
      const cursor = reset ? null : nextCursor;
      const res = await petProfilesApi.getTaggedPosts(petId, cursor);
      setPosts(reset ? res.posts : (prev) => [...prev, ...res.posts]);
      setNextCursor(res.next_cursor);
      setHasMorePosts(res.has_more);
    } catch (error) {
      console.error('Fetch Posts Error:', error);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const handleListForAdoption = () => {
    Alert.alert(
      'List for Adoption',
      `Would you like to list this pet for adoption? This will create a structured adoption listing pre-filled with this profile's details.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'List Pet',
          onPress: async () => {
            try {
              setIsConverting(true);
              const locationCityId = useLocationStore.getState().cityId;
              const res = await petProfilesApi.convertPetToAdoption(
                petId,
                locationCityId ? { city_id: locationCityId } : undefined
              );
              if (res.success) {
                Alert.alert('Success', 'Adoption listing created!', [
                  { text: 'View Listing', onPress: () => router.push({ pathname: '/(app)/pet-details', params: { id: res.pet_id } }) },
                  { text: 'OK', onPress: fetchProfile },
                ]);
              }
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to list pet.');
            } finally {
              setIsConverting(false);
            }
          },
        },
      ]
    );
  };

  // ── Loading & Error States ────────────────────────────────────────────────
  if (isLoadingProfile) {
    return <PetProfileScreenSkeleton insetsTop={insets.top} />;
  }
  if (!profile) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <Ionicons name="paw-outline" size={56} color="#E5E7EB" />
        <Text style={s.emptyTitle}>Profile not found</Text>
        <TouchableOpacity onPress={goBack} style={s.backBtn}>
          <Text style={s.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>

      {/* ── Scrollable Body ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ marginBottom: insets.bottom }}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#a03048']}
            tintColor="#a03048"
          />
        }
      >
        {/* ── Top bar ── */}
        <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={goBack} style={s.menuBtn}>
            <Ionicons name="chevron-back" size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* ── Avatar (square, rounded — the one intentional shape difference from a person profile) ── */}
        <View style={s.avatarCenter}>
          {profile.avatar_url ? (
            <Avatar uri={profile.avatar_url} size={AVATAR_SIZE} shape="square" radius={16} />
          ) : (
            <View style={s.avatarFallback}>
              <Text style={s.avatarFallbackEmoji}>{getSpeciesEmoji(profile.species)}</Text>
            </View>
          )}
        </View>

        {/* ── IDENTITY BLOCK ── */}
        <View style={s.identityBlock}>
          {/* Name + Edit — the name is auto-sized and centered on the full-width
              row (so it sits at true screen-center regardless of length), and
              Edit is absolutely positioned from screen-center + half the name's
              measured width + a fixed gap. Because Edit is out of flow, it never
              shifts the name off-center. The full-width container is what makes
              `left: '50%'` resolve to the screen's center rather than the name
              box's — the bug in the earlier measured version. */}
          <View style={s.nameEditRow}>
            <Text
              style={s.petName}
              numberOfLines={1}
              onLayout={(e) => setNameWidth(e.nativeEvent.layout.width)}
            >
              {profile.name}
            </Text>
            {isOwner && nameWidth > 0 && (
              <TouchableOpacity
                style={[s.editSmallBtn, { left: '50%', marginLeft: nameWidth / 2 + NAME_EDIT_GAP }]}
                onPress={() => router.push({ pathname: '/(app)/pet-profile/create', params: { editId: profile.pet_profile_id } })}
              >
                <Text style={s.editSmallBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          {(profile.breed || profile.species) && (
            <Text style={s.petBreed}>
              {[profile.breed, profile.species].filter(Boolean).join(' · ')}
            </Text>
          )}

          {/* ── Stats Ribbon — same plain value/label/separator treatment as a person profile ── */}
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statValue}>{profile.species}</Text>
              <Text style={s.statLabel}>Species</Text>
            </View>
            <View style={s.statSep} />
            <View style={s.statItem}>
              <Text style={s.statValue}>{profile.gender || '—'}</Text>
              <Text style={s.statLabel}>Gender</Text>
            </View>
            <View style={s.statSep} />
            <View style={s.statItem}>
              <Text style={s.statValue}>{renderAgeValue(abbreviateAge(profile.age))}</Text>
              <Text style={s.statLabel}>Age</Text>
            </View>
          </View>

          {/* ── Bio — same placement/styling as a person profile, always visible ── */}
          {profile.bio ? (
            <Text style={s.bio}>{profile.bio}</Text>
          ) : isOwner ? (
            <TouchableOpacity
              style={s.addBioBtn}
              onPress={() => router.push({ pathname: '/(app)/pet-profile/create', params: { editId: profile.pet_profile_id } })}
            >
              <Ionicons name="add" size={10} color="#000000" />
              <Text style={s.addBioBtnText}>Add Bio</Text>
              <Text style={s.addBioBtnDot}>·</Text>
              <Text style={s.addBioBtnExample} numberOfLines={1}>Tell us about {profile.name}...</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ── ADOPTION / STATUS BANNERS ── */}
        {/* Rehome prompt hidden for now — uncomment to re-enable.
        {isOwner && !profile.is_listed_for_adoption && (
          <View style={s.rehomeBanner}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={s.rehomeBannerTitle}>Looking to rehome?</Text>
              <Text style={s.rehomeBannerSub}>Convert this profile into a structured adoption listing.</Text>
            </View>
            <TouchableOpacity onPress={handleListForAdoption} disabled={isConverting} style={s.rehomeBtn}>
              {isConverting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.rehomeBtnText}>List Pet</Text>}
            </TouchableOpacity>
          </View>
        )}
        */}

        {profile.is_listed_for_adoption && profile.adoption_listing_id && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(app)/pet-details', params: { id: profile.adoption_listing_id } })}
            style={s.adoptionBanner}
          >
            <View style={s.adoptionBannerDot} />
            <View style={{ flex: 1 }}>
              <Text style={s.adoptionBannerTitle}>Listed for Adoption</Text>
              <Text style={s.adoptionBannerSub}>Tap to view the active listing</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#92400E" />
          </TouchableOpacity>
        )}

        {/* ── ICON-ONLY TAB BAR (matches a person profile exactly) ── */}
        <View style={s.tabBar}>
          {(['posts', 'gallery', 'about'] as Tab[]).map((tab) => {
            const active = tab === activeTab;
            const icons: Record<Tab, any> = {
              posts: 'chatbubble-ellipses-outline',
              gallery: 'images-outline',
              about: 'information-circle-outline',
            };
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => goToTab(tab)}
                style={s.tabItem}
                activeOpacity={0.7}
              >
                <Ionicons name={icons[tab]} size={20} color={active ? '#a03048' : '#9CA3AF'} />
                {active && <View style={s.tabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── TAB CONTENT — swipeable pager, all three tabs mounted side by
              side so a finger swipe can carry you between them; the tab bar
              above drives the same pager via goToTab(). No explicit height is
              set on the row: a horizontal ScrollView with alignItems:
              'flex-start' sizes itself to its tallest child, same as any
              other flexbox row, so it's stable even while post images are
              still loading — measuring each page's height live and feeding
              it back as the container's height (an earlier approach here)
              made the pager visibly grow in increments as async content
              settled, reading like something sliding up to cover the page. ── */}
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => {
            isProgrammaticScroll.current = false;
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setActiveTab(TABS[index] ?? TABS[0]);
          }}
          contentContainerStyle={{ alignItems: 'flex-start' }}
        >
        {/* POSTS TAB */}
        <View style={{ width, marginTop: 8 }}>
            {posts.length > 0 ? (
              <FlatList
                data={posts}
                scrollEnabled={false}
                keyExtractor={(item) => item.post_id}
                renderItem={({ item }) => (
                  <PostCard
                    post={item}
                    onPress={() => router.push({ pathname: '/post/[id]', params: { id: item.post_id } })}
                  />
                )}
                onEndReached={() => { if (hasMorePosts) fetchPosts(); }}
                onEndReachedThreshold={0.5}
                ListFooterComponent={isLoadingPosts ? <ActivityIndicator size="small" color="#a03048" style={{ marginVertical: 16 }} /> : null}
              />
            ) : isLoadingPosts ? (
              <View style={s.emptyState}>
                <ActivityIndicator size="small" color="#a03048" />
              </View>
            ) : (
              <View style={s.emptyState}>
                <Ionicons name="chatbubble-outline" size={48} color="#E5E7EB" />
                <Text style={s.emptyTitle}>No posts yet</Text>
                <Text style={s.emptySub}>Posts tagging {profile.name} will appear here.</Text>
              </View>
            )}
          </View>

        {/* GALLERY TAB */}
        <View style={[s.galleryGrid, { width }]}>
            {photos.length > 0 ? (
              photos.map((photo) => (
                <TouchableOpacity key={photo.photo_id} style={s.galleryCell} onPress={() => setSelectedPhoto(photo)} activeOpacity={0.85}>
                  <Image source={{ uri: photo.photo_url }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                  {photo.caption ? (
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={s.captionGradient}>
                      <Text style={s.captionText} numberOfLines={1}>{photo.caption}</Text>
                    </LinearGradient>
                  ) : null}
                </TouchableOpacity>
              ))
            ) : isLoadingPhotos ? (
              <View style={[s.emptyState, { width }]}>
                <ActivityIndicator size="small" color="#a03048" />
              </View>
            ) : (
              <View style={[s.emptyState, { width }]}>
                <Ionicons name="images-outline" size={48} color="#E5E7EB" />
                <Text style={s.emptyTitle}>No photos yet</Text>
                <Text style={s.emptySub}>
                  {isOwner ? 'Add photos from the gallery manager.' : `${profile.name} doesn't have any photos yet.`}
                </Text>
              </View>
            )}
          </View>

        {/* ABOUT TAB — nothing but the ID card itself. */}
        <View style={[s.aboutContainer, { width }]}>
            <PetIdCard
              pet={{
                pet_profile_id: profile.pet_profile_id,
                name: profile.name,
                species: profile.species,
                breed: profile.breed,
                gender: profile.gender,
                date_of_birth: profile.date_of_birth,
                avatar_url: profile.avatar_url,
                owner_name: profile.owner_name,
                created_at: profile.created_at,
              }}
            />
          </View>
        </ScrollView>
      </ScrollView>

      {/* Floating add-photo action — only surface while Gallery is active, so
          it doesn't compete with Posts/About, and only for the owner. */}
      {isOwner && activeTab === 'gallery' && (
        <TouchableOpacity
          style={[s.galleryFab, { bottom: insets.bottom + 20 }]}
          onPress={() => router.push({ pathname: '/(app)/pet-profile/gallery-manager', params: { petId: profile.pet_profile_id } })}
        >
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Polaroid-style full photo view for a tapped gallery cell */}
      <Modal visible={!!selectedPhoto} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setSelectedPhoto(null)}>
        <TouchableOpacity style={s.polaroidBackdrop} activeOpacity={1} onPress={() => setSelectedPhoto(null)}>
          <TouchableOpacity activeOpacity={1} style={s.polaroidWrap} onPress={() => {}}>
            {selectedPhoto && <PolaroidCard uri={selectedPhoto.photo_url} caption={selectedPhoto.caption} />}
            <TouchableOpacity style={s.polaroidClose} onPress={() => setSelectedPhoto(null)} hitSlop={10}>
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 32 },

  // ── TOP BAR ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  menuBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── AVATAR (square, rounded — the one shape difference from a person profile) ──
  avatarCenter: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(160,48,72,0.2)',
    backgroundColor: '#FAF0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackEmoji: {
    fontSize: 36,
  },

  // ── IDENTITY ──
  identityBlock: {
    alignItems: 'center',
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  nameEditRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  petName: {
    fontSize: 24,
    fontFamily: 'Montserrat_700Bold',
    color: '#111827',
    letterSpacing: -0.3,
    textAlign: 'center',
    // Leave room on both sides so a long name truncates instead of pushing
    // the absolutely-positioned Edit pill off the right edge.
    maxWidth: width - 140,
  },
  petBreed: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
    color: '#6B7280',
    textAlign: 'center',
  },
  editSmallBtn: {
    position: 'absolute',
    // Vertically center against the taller name text (pill ≈ 20px tall).
    top: '50%',
    transform: [{ translateY: -10 }],
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  editSmallBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#111827',
  },
  bio: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  addBioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    marginTop: 12,
    maxWidth: width - 80,
  },
  addBioBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#000000',
  },
  addBioBtnDot: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  addBioBtnExample: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: '#000000',
    flexShrink: 1,
  },

  // ── STATS ── (same plain value/label/separator treatment as a person profile)
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
    color: '#111827',
    letterSpacing: -0.5,
    textTransform: 'capitalize',
  },
  statValueUnit: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#111827',
    textTransform: 'lowercase',
  },
  statLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statSep: {
    width: 1,
    height: 32,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 12,
  },

  // ── BANNERS ──
  rehomeBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#FAF0F2',
    borderWidth: 1,
    borderColor: 'rgba(160,48,72,0.2)',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rehomeBannerTitle: { fontSize: 13, fontFamily: 'DMSans_700Bold', color: '#111827' },
  rehomeBannerSub: { fontSize: 11, fontFamily: 'Montserrat_400Regular', color: '#6B7280', marginTop: 2 },
  rehomeBtn: {
    backgroundColor: '#a03048',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 14,
  },
  rehomeBtnText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'DMSans_700Bold' },

  adoptionBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adoptionBannerDot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: '#D97706',
  },
  adoptionBannerTitle: { fontSize: 13, fontFamily: 'DMSans_700Bold', color: '#92400E' },
  adoptionBannerSub: { fontSize: 11, fontFamily: 'Montserrat_400Regular', color: '#B45309', marginTop: 2 },

  // ── TABS (icon-only, matches a person profile exactly) ──
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
    marginTop: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    width: 32,
    height: 2.5,
    backgroundColor: '#a03048',
    borderRadius: 2,
  },

  // ── GALLERY ──
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    padding: 2,
    marginTop: 4,
  },
  galleryCell: {
    width: GALLERY_COL_SIZE,
    height: GALLERY_COL_SIZE,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    borderRadius: 4,
    position: 'relative',
  },
  galleryFab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#a03048',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  polaroidBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  polaroidWrap: {
    width: '100%',
    maxWidth: 320,
  },
  polaroidClose: {
    position: 'absolute',
    top: -44,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 6,
  },
  captionGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 6,
  },
  captionText: {
    fontSize: 10,
    fontFamily: 'Montserrat_500Medium',
    color: '#FFFFFF',
  },

  // ── ABOUT ──
  aboutContainer: {
    padding: 20,
  },

  // ── EMPTY + ERRORS ──
  emptyState: {
    paddingVertical: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: '#374151',
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  backBtn: {
    marginTop: 20,
    backgroundColor: '#a03048',
    paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: 16,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
  },
});

export default withFocusUnmount(PetProfileScreen);

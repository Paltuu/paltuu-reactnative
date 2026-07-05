import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { petProfilesApi, PetProfile, PetProfilePhoto } from '../../../src/api/petProfiles';
import { useAuthStore } from '../../../src/stores/authStore';
import PostCard from '../../../src/components/social/PostCard';
import { SocialPost } from '../../../src/api/social';

const { width } = Dimensions.get('window');
const GALLERY_COL_SIZE = (width - 4) / 3;

// Species → emoji badge mapping for personality
const speciesEmoji: Record<string, string> = {
  cat: '🐱', dog: '🐶', bird: '🐦', rabbit: '🐰',
  hamster: '🐹', fish: '🐠', turtle: '🐢', parrot: '🦜',
};

const getSpeciesEmoji = (species: string) =>
  speciesEmoji[species?.toLowerCase()] ?? '🐾';

const formatDOB = (dob: string | null) => {
  if (!dob) return null;
  const d = new Date(dob);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

type Tab = 'posts' | 'gallery' | 'about';

export default function PetProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const petId = params.id as string;
  const from = params.from as string;

  const { user } = useAuthStore();
  const [profile, setProfile] = useState<PetProfile | null>(null);
  const [photos, setPhotos] = useState<PetProfilePhoto[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('posts');

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
  useEffect(() => {
    if (activeTab === 'gallery') fetchPhotos();
    else if (activeTab === 'posts') fetchPosts(true);
  }, [activeTab, petId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchProfile();
      if (activeTab === 'gallery') {
        await fetchPhotos();
      } else if (activeTab === 'posts') {
        await fetchPosts(true);
      }
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
              const res = await petProfilesApi.convertPetToAdoption(petId);
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
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#a03048" />
      </View>
    );
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
          {isOwner && (
            <View style={s.ownerActions}>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/(app)/pet-profile/create', params: { editId: profile.pet_profile_id } })}
                style={s.menuBtn}
              >
                <Ionicons name="create-outline" size={22} color="#000000" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/(app)/pet-profile/gallery-manager', params: { petId: profile.pet_profile_id } })}
                style={s.menuBtn}
              >
                <Ionicons name="images-outline" size={22} color="#000000" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── IDENTITY BLOCK ── */}
        <View style={s.identityBlock}>
          {/* Name + meta */}
          <Text style={s.petName}>{profile.name}</Text>
          {(profile.breed || profile.species) && (
            <Text style={s.petBreed}>
              {[profile.breed, profile.species].filter(Boolean).join(' · ')}
            </Text>
          )}

          {/* ── Stats Ribbon ── */}
          <View style={s.statsRow}>
            {profile.age && (
              <View style={s.statChip}>
                <Ionicons name="calendar-outline" size={13} color="#a03048" />
                <Text style={s.statText}>{profile.age}</Text>
              </View>
            )}
            {profile.gender && (
              <View style={s.statChip}>
                <Ionicons
                  name={profile.gender?.toLowerCase() === 'male' ? 'male' : 'female'}
                  size={13}
                  color="#a03048"
                />
                <Text style={s.statText}>{profile.gender}</Text>
              </View>
            )}
            <View style={s.statChip}>
              <MaterialCommunityIcons name="paw" size={13} color="#a03048" />
              <Text style={s.statText}>{profile.species}</Text>
            </View>
          </View>
        </View>

        {/* ── ADOPTION / STATUS BANNERS ── */}
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

        {/* ── PREMIUM TAB BAR ── */}
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
                onPress={() => setActiveTab(tab)}
                style={[s.tabItem, active && s.tabItemActive]}
                activeOpacity={0.7}
              >
                <Ionicons name={icons[tab]} size={18} color={active ? '#a03048' : '#9CA3AF'} />
                <Text style={[s.tabLabel, active && s.tabLabelActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── TAB CONTENT ── */}

        {/* POSTS TAB */}
        {activeTab === 'posts' && (
          <View style={{ marginTop: 8 }}>
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
        )}

        {/* GALLERY TAB */}
        {activeTab === 'gallery' && (
          <View style={s.galleryGrid}>
            {photos.length > 0 ? (
              photos.map((photo, idx) => (
                <View
                  key={photo.photo_id}
                  style={[
                    s.galleryCell,
                    // Every 7th image is a feature tile (double wide)
                    idx % 7 === 0 && s.galleryCellFeatured,
                  ]}
                >
                  <Image source={{ uri: photo.photo_url }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                  {photo.caption ? (
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={s.captionGradient}>
                      <Text style={s.captionText} numberOfLines={1}>{photo.caption}</Text>
                    </LinearGradient>
                  ) : null}
                </View>
              ))
            ) : isLoadingPhotos ? (
              <View style={[s.emptyState, { width }]}>
                <ActivityIndicator size="small" color="#a03048" />
              </View>
            ) : (
              <View style={[s.emptyState, { width }]}>
                <Ionicons name="images-outline" size={48} color="#E5E7EB" />
                <Text style={s.emptyTitle}>No photos yet</Text>
                <Text style={s.emptySub}>Add photos from the gallery manager.</Text>
              </View>
            )}
          </View>
        )}

        {/* ABOUT TAB */}
        {activeTab === 'about' && (
          <View style={s.aboutContainer}>

            {/* Bio card */}
            {profile.bio && (
              <View style={s.aboutCard}>
                <View style={s.aboutCardHeader}>
                  <View style={s.aboutCardIcon}>
                    <Ionicons name="heart" size={14} color="#a03048" />
                  </View>
                  <Text style={s.aboutCardTitle}>About {profile.name}</Text>
                </View>
                <Text style={s.bioText}>{profile.bio}</Text>
              </View>
            )}

            {/* Details card */}
            <View style={s.aboutCard}>
              <View style={s.aboutCardHeader}>
                <View style={s.aboutCardIcon}>
                  <Ionicons name="paw" size={14} color="#a03048" />
                </View>
                <Text style={s.aboutCardTitle}>Details</Text>
              </View>

              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Species</Text>
                <View style={s.detailValueRow}>
                  <Text style={s.detailValueEmoji}>{getSpeciesEmoji(profile.species)}</Text>
                  <Text style={s.detailValue}>{profile.species}</Text>
                </View>
              </View>

              {profile.breed && (
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>Breed</Text>
                  <Text style={s.detailValue}>{profile.breed}</Text>
                </View>
              )}

              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Gender</Text>
                <View style={s.detailValueRow}>
                  <Ionicons
                    name={profile.gender?.toLowerCase() === 'male' ? 'male' : 'female'}
                    size={13}
                    color="#a03048"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={s.detailValue}>{profile.gender}</Text>
                </View>
              </View>

              {profile.age && (
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>Age</Text>
                  <Text style={s.detailValue}>{profile.age}</Text>
                </View>
              )}

              {profile.date_of_birth && (
                <View style={[s.detailRow, { borderBottomWidth: 0 }]}>
                  <Text style={s.detailLabel}>Date of Birth</Text>
                  <Text style={s.detailValue}>{formatDOB(profile.date_of_birth)}</Text>
                </View>
              )}
            </View>

            {/* Joined card */}
            <View style={s.aboutCard}>
              <View style={s.aboutCardHeader}>
                <View style={s.aboutCardIcon}>
                  <Ionicons name="sparkles" size={14} color="#a03048" />
                </View>
                <Text style={s.aboutCardTitle}>On Paltuu since</Text>
              </View>
              <Text style={s.bioText}>
                {new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
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
  ownerActions: { flexDirection: 'row', marginLeft: 'auto', gap: 4 },

  // ── IDENTITY ──
  identityBlock: {
    alignItems: 'center',
    marginTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  petName: {
    fontSize: 24,
    fontFamily: 'Montserrat_700Bold',
    color: '#111827',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  petBreed: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
    color: '#6B7280',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FAF0F2',
    borderWidth: 1,
    borderColor: 'rgba(160,48,72,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#a03048',
    textTransform: 'capitalize',
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

  // ── TABS ──
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
    marginTop: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#a03048',
  },
  tabLabel: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#9CA3AF',
  },
  tabLabelActive: {
    color: '#a03048',
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
  galleryCellFeatured: {
    width: GALLERY_COL_SIZE * 2 + 2,
    height: GALLERY_COL_SIZE * 1.4,
    borderRadius: 6,
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
    gap: 16,
  },
  aboutCard: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 20,
    padding: 18,
  },
  aboutCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  aboutCardIcon: {
    width: 26, height: 26,
    borderRadius: 13,
    backgroundColor: '#FAF0F2',
    alignItems: 'center', justifyContent: 'center',
  },
  aboutCardTitle: {
    fontSize: 13,
    fontFamily: 'DMSans_700Bold',
    color: '#111827',
  },
  bioText: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    color: '#4B5563',
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
    color: '#9CA3AF',
  },
  detailValueRow: { flexDirection: 'row', alignItems: 'center' },
  detailValueEmoji: { fontSize: 13, marginRight: 6 },
  detailValue: {
    fontSize: 13,
    fontFamily: 'DMSans_700Bold',
    color: '#111827',
    textTransform: 'capitalize',
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

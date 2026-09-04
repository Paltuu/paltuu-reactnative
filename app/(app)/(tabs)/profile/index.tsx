import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  FlatList,
  Share,
  Alert,
  ScrollView,
  BackHandler,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../../../src/stores/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { socialApi, SocialPost } from '../../../../src/api/social';
import { petProfilesApi } from '../../../../src/api/petProfiles';
import client from '../../../../src/api/client';
import PostCardShared from '../../../../src/components/social/PostCard';
import { Avatar } from '../../../../src/components/common/Avatar';
import { PetIdCard } from '../../../../src/components/pets/PetIdCard';
import { ProfileScreenSkeleton } from '../../../../src/components/common/ProfileScreenSkeleton';
import { usePullToRefresh, PullToRefreshView } from '../../../../src/components/common/PullToRefresh';
import { subscribeToTabPress } from '../../../../src/utils/tabPressSubscription';
import { getShareUrl } from '../../../../src/utils/share';
import { COLORS } from '../../../../src/constants/colors';
import { PawrvezDialog } from '../../../../src/components/common/mascot';
import { storage } from '../../../../src/utils/storage';
import { BadgeInfoModal } from '../../../../src/components/social/BadgeInfoModal';
import { useTabBarStore } from '../../../../src/stores/tabBarStore';
import { useNotchStopperStore } from '../../../../src/stores/notchStopperStore';

const VerifiedIcon = require('../../../../assets/icons/verified-check-svgrepo-com.svg');
const DayOneIcon = require('../../../../assets/icons/day1-badge.svg');

const Icons = {
  pawLikeSelect: require('../../../../assets/icons/paw-like-select.svg'),
  pawLikeUnselect: require('../../../../assets/icons/paw-like-unselect.svg'),
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AVATAR_SIZE = 96;

// ─── Design tokens ────────────────────────────────────────────────────────────
const DS = {
  primary: '#A03048',
  primaryLight: 'rgba(160,48,72,0.10)',
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  dark: '#111111',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  gray100: '#F3F4F6',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCount(n: number = 0): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'now';
  try {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  } catch {
    return 'now';
  }
}

// The Pets tab renders shared PetIdCard components (CNIC-style ID cards);
// standard posts (including reposts, rendered inline via PostCardShared's own
// repost handling) use the shared PostCard — there is no separate Reposts tab.

// ─── Tab config ───────────────────────────────────────────────────────────────

const TAB_CONFIG = [
  {
    key: 'Posts',
    renderIcon: (active: boolean) => (
      <Ionicons name={active ? 'grid' : 'grid-outline'} size={22} color={active ? DS.primary : DS.gray400} />
    ),
  },
  {
    key: 'Pets',
    renderIcon: (active: boolean) => (
      <ExpoImage source={active ? Icons.pawLikeSelect : Icons.pawLikeUnselect} style={{ width: 24, height: 24 }} contentFit="contain" />
    ),
  },
] as const;

type TabKey = typeof TAB_CONFIG[number]['key'];
const TAB_KEYS = TAB_CONFIG.map((t) => t.key);

// ─── First-visit intro ────────────────────────────────────────────────────────

// One slide per bubble. Each MUST stay within the Pawrvez copy budget — 90 chars
// max including spaces (3 lines of art, nothing catches the overflow), and no
// em dashes: Pixeled has no glyph for them. See PawrvezDialog's `text` prop.
const PROFILE_INTRO_DIALOGS = [
  'This is your profile - your own corner of Paltuu.',                             // 49
  'Pet parent? Add your pet under the paw tab below so they get their own space.', // 77
];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  // create-post <-> home <-> pets <-> search <-> profile (end of chain, no left swipe)

  const [activeTab, setActiveTab] = useState<TabKey>('Posts');
  const [imageModal, setImageModal] = useState<'profile' | 'cover' | null>(null);
  const [uploading, setUploading] = useState<'profile' | 'cover' | null>(null);
  const [selectedLocalAsset, setSelectedLocalAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [nameBlockWidth, setNameBlockWidth] = useState(0);
  // -1 = hidden; otherwise the index of the slide currently on screen.
  const [introDialogIndex, setIntroDialogIndex] = useState(-1);
  const [showDayOneBadgeInfo, setShowDayOneBadgeInfo] = useState(false);

  // First-visit tip introducing the profile page. Shown once ever.
  useEffect(() => {
    (async () => {
      if (await storage.isProfileIntroMascotSeen()) return;
      await storage.markProfileIntroMascotSeen();
      setIntroDialogIndex(0);
    })();
  }, []);

  const advanceIntroDialog = () =>
    setIntroDialogIndex((i) => (i + 1 < PROFILE_INTRO_DIALOGS.length ? i + 1 : -1));

  const listRef = useRef<FlatList>(null);
  const scrollYRef = useRef(0);

  // Swiping between the Posts/Pets sub-tabs — kept in a ref so the
  // PanResponder (created once) always reads the current tab instead of
  // whatever it was on first render.
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  const goToAdjacentTab = useCallback((direction: 1 | -1) => {
    const idx = TAB_KEYS.indexOf(activeTabRef.current);
    const nextIdx = idx + direction;
    if (nextIdx >= 0 && nextIdx < TAB_KEYS.length) {
      setActiveTab(TAB_KEYS[nextIdx]);
    }
  }, []);

  // Only captures a clearly horizontal drag (well past vertical-scroll
  // territory) so it doesn't fight the list's own vertical scrolling or the
  // outer bottom-tab-bar's own swipe-between-screens gesture. Also only
  // captures when the drag actually has an adjacent sub-tab to land on —
  // e.g. swiping right while already on "Posts" (the first sub-tab) used to
  // still get captured here and silently do nothing, which ate the gesture
  // the outer bottom-tab pager needed to swipe back to Search. Letting it
  // fall through at that edge lets the pager see it instead.
  const tabSwipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
        const { dx, dy } = gestureState;
        if (!(Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy) * 2.5)) return false;
        const idx = TAB_KEYS.indexOf(activeTabRef.current);
        const wouldGoNext = dx < 0; // swipe left → next sub-tab
        const nextIdx = idx + (wouldGoNext ? 1 : -1);
        return nextIdx >= 0 && nextIdx < TAB_KEYS.length;
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx <= -60) {
          goToAdjacentTab(1); // swipe left → next tab
        } else if (gestureState.dx >= 60) {
          goToAdjacentTab(-1); // swipe right → previous tab
        }
      },
    })
  ).current;

  const userId = user?.id;

  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ['social-profile', userId],
    queryFn: () => socialApi.getProfile(userId!),
    enabled: !!userId,
  });

  const { data: petsData, isLoading: isPetsLoading } = useQuery({
    queryKey: ['social-pets', userId],
    queryFn: () => petProfilesApi.getUserPetProfiles(userId!),
    enabled: !!userId && activeTab === 'Pets',
  });

  // Warm the Pets sub-tab's cache while the user is still on Posts, so
  // tapping "Pets" reads from cache instead of showing a fresh spinner.
  useEffect(() => {
    if (!userId) return;
    queryClient.prefetchQuery({
      queryKey: ['social-pets', userId],
      queryFn: () => petProfilesApi.getUserPetProfiles(userId),
    });
  }, [userId, queryClient]);

  const profile = profileData?.profile || (user as any);

  const tabData: Record<TabKey, any[]> = {
    Posts: profileData?.posts || [],
    Pets: petsData?.pets || petsData?.pet_profiles || [],
  };

  const isTabLoading =
    (activeTab === 'Posts' && isProfileLoading) ||
    (activeTab === 'Pets' && isPetsLoading);

  // ── Pull-to-refresh ──────────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['social-profile', userId] });
    await queryClient.invalidateQueries({ queryKey: ['social-pets', userId] });
  }, [queryClient, userId]);

  // Shared app-wide pull-to-refresh — same drag weight, distance and indicator
  // size as every other screen (see PullToRefresh.tsx).
  const pull = usePullToRefresh(handleRefresh);

  // The FlatList is no longer force-remounted on tab switch (that was what
  // caused the avatar/icons in the header to flicker — see ListHeader below),
  // so reset scroll position ourselves instead of getting it for free from a
  // fresh mount.
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [activeTab]);

  // Instagram-style re-tap: if the profile is scrolled down, scroll to top;
  // if it's already at the top, refresh the profile data instead.
  useEffect(() => {
    return subscribeToTabPress('profile', () => {
      if (scrollYRef.current > 40) {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      } else {
        pull.triggerRefresh();
      }
    });
  }, [pull.triggerRefresh]);

  // The list can lose its scroll offset when this screen is covered and
  // re-shown (e.g. after opening a post's fullscreen media viewer and coming
  // back) — the underlying list briefly lays out at zero size during the
  // screen transition and resets to the top. Restore the last known offset
  // once focus returns.
  useFocusEffect(
    useCallback(() => {
      if (scrollYRef.current > 0) {
        listRef.current?.scrollToOffset({ offset: scrollYRef.current, animated: false });
      }
    }, [])
  );

  // ── Share profile ────────────────────────────────────────────────────────────

  const handleShareProfile = async () => {
    try {
      await Share.share({ title: 'Paltuu Profile', message: getShareUrl(`profile/${profile?.user_id ?? userId}`) });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // ── Image upload ────────────────────────────────────────────────────────────

  const closeModal = () => {
    setSelectedLocalAsset(null);
    setImageModal(null);
  };

  // Rendered as a plain in-tree overlay rather than a native <Modal> (see
  // below) — preserve hardware-back-closes-viewer behavior manually.
  useEffect(() => {
    if (!imageModal) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeModal();
      return true;
    });
    return () => sub.remove();
  }, [imageModal]);

  // The overlay lives inside this tab screen's tree, so the bottom tab bar would
  // otherwise sit on top of the photo and the global notch stopper (a solid bar
  // at zIndex 9999 in (app)/_layout.tsx) would leave a white band across the top.
  // Send both away for as long as the viewer is open.
  useEffect(() => {
    if (!imageModal) return;
    const { hideTabBar, showTabBar } = useTabBarStore.getState();
    const { hideNotchStopper, showNotchStopper } = useNotchStopperStore.getState();
    hideTabBar();
    hideNotchStopper();
    return () => {
      showTabBar();
      showNotchStopper();
    };
  }, [imageModal]);

  const handlePickAndUpload = async (type: 'profile' | 'cover') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    Alert.alert('Change Photo', '', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const cam = await ImagePicker.requestCameraPermissionsAsync();
          if (!cam.granted) return;
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: type === 'cover' ? [3, 1] : [1, 1],
            quality: 0.9,
          });
          if (!result.canceled && result.assets?.[0]) {
            setSelectedLocalAsset(result.assets[0]);
          }
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: type === 'cover' ? [3, 1] : [1, 1],
            quality: 0.9,
          });
          if (!result.canceled && result.assets?.[0]) {
            setSelectedLocalAsset(result.assets[0]);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadImage = async () => {
    if (!selectedLocalAsset || !imageModal) return;
    const type = imageModal;
    setUploading(type);
    try {
      const mimeType = selectedLocalAsset.mimeType || 'image/jpeg';
      const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';

      const formData = new FormData();
      formData.append('file', {
        uri: selectedLocalAsset.uri,
        name: `${type}.${ext}`,
        type: mimeType,
      } as any);

      const endpoint = type === 'profile'
        ? '/social/profile/avatar'
        : '/social/profile/cover';

      await client.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      queryClient.invalidateQueries({ queryKey: ['social-profile', userId] });
      closeModal();
    } catch {
      Alert.alert('Upload failed', 'Please try again.');
    } finally {
      setUploading(null);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: any }) => {
    if (activeTab === 'Posts') {
      // The API returns the full author block (name, image, handle, verified,
      // founding_club) on each post, so nothing is patched in here. It used to
      // be, and the patch silently dropped the badge fields it didn't know to
      // copy — which is why verified/day-one never showed on profile cards.
      return (
        <PostCardShared
          post={item as SocialPost}
          onPress={() => router.push(`/post/${item.post_id}`)}
        />
      );
    }
    // Only remaining tab is Pets.
    const pet = item as any;
    return (
      <View style={s.petCardRow}>
        <PetIdCard
          pet={{
            pet_profile_id: pet.pet_profile_id,
            name: pet.name,
            species: pet.species,
            breed: pet.breed,
            gender: pet.gender,
            date_of_birth: pet.date_of_birth,
            avatar_url: pet.avatar_url,
            owner_name: profile.name,
            created_at: pet.created_at,
          }}
          onPress={() => router.push({ pathname: '/(app)/pet-profile/[id]', params: { id: pet.pet_profile_id, from: 'profile' } })}
        />
      </View>
    );
  };

  const currentImageUri = selectedLocalAsset?.uri ||
    (imageModal === 'profile' ? profile?.profile_image_url : profile?.cover_photo_url);

  // Rendered below as `ListHeaderComponent={ListHeader()}` — an element, not
  // this function itself. Passing the function directly would hand FlatList
  // a brand-new component "type" every render (a fresh arrow function each
  // time), which makes React tear down and remount the whole header —
  // avatar image included — instead of just re-rendering it, flickering the
  // avatar/icons on every render (most visibly on tab switch).
  const ListHeader = () => (
    <View style={s.headerWrapper}>
      {/* Top action bar */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.menuBtn} onPress={() => router.push('/create-post')}>
          <ExpoImage
            source={require('../../../../assets/icons/plus-solid.svg')}
            style={{ width: 24, height: 24 }}
            contentFit="contain"
            tintColor="#000000"
          />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={s.menuBtn} onPress={handleShareProfile}>
            <ExpoImage
              source={require('../../../../assets/icons/share-solid.svg')}
              style={{ width: 22, height: 22 }}
              contentFit="contain"
              tintColor="#000000"
            />
          </TouchableOpacity>
          <TouchableOpacity style={s.menuBtn} onPress={() => router.push('/(app)/profile-menu' as any)}>
            <ExpoImage
              source={require('../../../../assets/icons/hamburger-solid-2.svg')}
              style={{ width: 24, height: 24 }}
              contentFit="contain"
              tintColor="#000000"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Avatar */}
      <View style={s.avatarCenter}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setImageModal('profile')}
          style={{ position: 'relative' }}
        >
          <Avatar
            uri={profile?.profile_image_url}
            size={AVATAR_SIZE}
          />
        </TouchableOpacity>
      </View>

      {/* Identity */}
      <View style={{ alignItems: 'center', position: 'relative' }}>
        <View
          style={{ alignItems: 'center' }}
          onLayout={(e) => setNameBlockWidth(e.nativeEvent.layout.width)}
        >
          <Text style={s.displayName}>{profile?.name || 'User'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, marginBottom: 8 }}>
            <Text style={[s.usernameText, { marginTop: 0, marginBottom: 0 }]}>
              @{profile?.social_username || profile?.username || 'user'}
            </Text>
            {!!profile?.verified && (
              <ExpoImage source={VerifiedIcon} style={{ width: 14, height: 14 }} tintColor={COLORS.primary} />
            )}
            {!!profile?.founding_club && (
              <TouchableOpacity onPress={() => setShowDayOneBadgeInfo(true)} hitSlop={8}>
                <ExpoImage source={DayOneIcon} style={{ width: 14, height: 14 }} tintColor={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {nameBlockWidth > 0 && (
          <TouchableOpacity
            style={[
              s.editSmallBtn,
              { position: 'absolute', left: '50%', marginLeft: nameBlockWidth / 2 + 14, top: 5 },
            ]}
            onPress={() => router.push('/(app)/profile/edit')}
          >
            <Text style={s.editSmallBtnText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <TouchableOpacity
          style={s.statItem}
          onPress={() => router.push({
            pathname: '/(app)/follow-list',
            params: { userId: profile.user_id, type: 'followers', name: profile.name }
          })}
        >
          <Text style={s.statValue}>
            {formatCount(profile?.follower_count || profile?.followers_count || 0)}
          </Text>
          <Text style={s.statLabel}>Followers</Text>
        </TouchableOpacity>
        <View style={s.statSep} />
        <TouchableOpacity
          style={s.statItem}
          onPress={() => router.push({
            pathname: '/(app)/follow-list',
            params: { userId: profile.user_id, type: 'following', name: profile.name }
          })}
        >
          <Text style={s.statValue}>
            {formatCount(profile?.following_count || 0)}
          </Text>
          <Text style={s.statLabel}>Following</Text>
        </TouchableOpacity>
        <View style={s.statSep} />
        <View style={s.statItem}>
          <Text style={s.statValue}>
            {formatCount(profile?.post_count || profile?.posts_count || 0)}
          </Text>
          <Text style={s.statLabel}>Posts</Text>
        </View>
      </View>

      {profile?.bio ? (
        <Text style={s.bio}>{profile.bio}</Text>
      ) : (
        <TouchableOpacity style={s.addBioBtn} onPress={() => router.push('/(app)/profile/edit')}>
          <ExpoImage
            source={require('../../../../assets/icons/plus-solid.svg')}
            style={{ width: 10, height: 10 }}
            contentFit="contain"
            tintColor="#000000"
          />
          <Text style={s.addBioBtnText}>Add Bio</Text>
          <Text style={s.addBioBtnDot}>·</Text>
          <Text style={s.addBioBtnExample} numberOfLines={1}>I am a cat rescuer...</Text>
        </TouchableOpacity>
      )}

      {/* Icon tab bar */}
      <View style={s.tabBar}>
        {TAB_CONFIG.map(({ key, renderIcon }) => (
          <TouchableOpacity
            key={key}
            style={s.tabItem}
            onPress={() => setActiveTab(key)}
            activeOpacity={0.7}
          >
            {renderIcon(activeTab === key)}
            {activeTab === key && <View style={s.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'Pets' && (
        <TouchableOpacity
          onPress={() => router.push('/(app)/pet-profile/create')}
          style={s.addPetBtn}
        >
          <ExpoImage
            source={require('../../../../assets/icons/plus-solid.svg')}
            style={{ width: 14, height: 14 }}
            contentFit="contain"
            tintColor={DS.primary}
          />
          <Text style={s.addPetBtnText}>
            {(tabData.Pets?.length ?? 0) > 0 ? 'Add Another Pet' : 'Add Your Pet'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Loading state ────────────────────────────────────────────────────────────

  if (isProfileLoading) {
    return <ProfileScreenSkeleton insetsTop={insets.top} />;
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={s.screen}>
      <View style={{ flex: 1 }} {...tabSwipeResponder.panHandlers}>
        {/* The spinner band starts just below the status bar — the profile's own
            top bar scrolls with the list, so there's no fixed header to clear. */}
        <PullToRefreshView pull={pull} indicatorTop={insets.top}>
        <FlatList
          ref={listRef}
          data={tabData[activeTab]}
          keyExtractor={(item, idx) =>
            activeTab === 'Pets'
              ? `pet-${item.pet_profile_id ?? idx}`
              : (item.post_id ?? item.id ?? idx).toString()
          }
          renderItem={renderItem}
          ListHeaderComponent={ListHeader()}
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={activeTab === 'Pets' && !isTabLoading ? s.emptyStatePets : s.emptyState}>
              {isTabLoading ? (
                <ActivityIndicator size="small" color={DS.primary} />
              ) : activeTab === 'Pets' ? (
                <View style={{ width: '100%' }}>
                  <View style={{ paddingHorizontal: 8 }}>
                    <PetIdCard isPlaceholder />
                    <Text style={s.placeholderCardCaption}>This could be your pet.</Text>
                  </View>
                </View>
              ) : (
                <>
                  <ExpoImage source={Icons.pawLikeUnselect} style={{ width: 40, height: 40 }} contentFit="contain" tintColor={DS.gray100} />
                  <Text style={s.emptyText}>Nothing here yet</Text>
                </>
              )}
            </View>
          }
        />
        </PullToRefreshView>
      </View>


      {/* ── Image viewer / uploader ─────────────────────────────────────────────
            Rendered in-tree (not via React Native's <Modal>) — Android's native
            Modal window doesn't compose reliably with this screen's edge-to-edge
            translucent status/nav bars (statusBarTranslucent/navigationBarTranslucent
            on Modal), leaving gaps where the screen behind shows through. A plain
            absolutely-positioned overlay lives in the same window and inherits the
            same safe-area handling as the rest of the screen, so it can't gap. ── */}
      {imageModal !== null && (
        <View style={[s.imgModalBg, StyleSheet.absoluteFillObject, { zIndex: 100, elevation: 100 }]}>
          {/* Header */}
          <View style={[s.imgModalHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={closeModal} style={s.imgModalClose}>
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={s.imgModalTitle}>
              {imageModal === 'profile' ? 'Profile Photo' : 'Cover Photo'}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Image */}
          <View style={s.imgModalContent}>
            {currentImageUri ? (
              <Image
                source={{ uri: currentImageUri }}
                style={s.imgModalImage}
                resizeMode="contain"
              />
            ) : (
              <View style={s.imgModalPlaceholder}>
                <Ionicons name="image-outline" size={64} color="rgba(255,255,255,0.25)" />
                <Text style={s.imgModalPlaceholderText}>No photo yet</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={[s.imgModalActions, { paddingBottom: insets.bottom + 28 }]}>
            {selectedLocalAsset ? (
              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  style={s.imgModalBtn}
                  onPress={uploadImage}
                  disabled={uploading !== null}
                  activeOpacity={0.8}
                >
                  {uploading !== null ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
                      <Text style={s.imgModalBtnText}>Upload Photo</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.imgModalBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#FFFFFF' }]}
                  onPress={() => handlePickAndUpload(imageModal!)}
                  disabled={uploading !== null}
                  activeOpacity={0.8}
                >
                  <Text style={[s.imgModalBtnText, { color: '#FFFFFF' }]}>Select Different</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={s.imgModalBtn}
                onPress={() => handlePickAndUpload(imageModal!)}
                disabled={uploading !== null}
                activeOpacity={0.8}
              >
                {uploading === imageModal ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
                    <Text style={s.imgModalBtnText}>
                      {currentImageUri ? 'Change Photo' : 'Upload Photo'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <PawrvezDialog
        visible={introDialogIndex >= 0}
        text={PROFILE_INTRO_DIALOGS[introDialogIndex] ?? ''}
        onDismiss={() => setIntroDialogIndex(-1)}
        actionLabel={introDialogIndex >= PROFILE_INTRO_DIALOGS.length - 1 ? 'Got it' : 'Next'}
        onAction={advanceIntroDialog}
      />

     <BadgeInfoModal
        visible={showDayOneBadgeInfo}
        onClose={() => setShowDayOneBadgeInfo(false)}
        icon={DayOneIcon}
        title="Day 1"
        description={`${profile?.name || 'This user'} is a Paltuu Day 1`}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DS.bg,
  },
  // ─ Header wrapper ─
  headerWrapper: {
    backgroundColor: DS.surface,
    marginBottom: 8,
  },

  // ─ Top bar ─
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─ Avatar ─
  avatarCenter: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },

  // ─ Identity ─
  displayName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 23,
    color: DS.dark,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  usernameText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: DS.gray500,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  editSmallBtn: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: DS.gray100,
  },
  editSmallBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: DS.dark,
  },

  bio: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: DS.gray500,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    marginTop: 2,
    marginBottom: 16,
  },
  addBioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: DS.gray100,
    marginTop: 2,
    marginBottom: 16,
    maxWidth: SCREEN_WIDTH - 80,
  },
  addBioBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#000000',
  },
  addBioBtnDot: {
    fontSize: 13,
    color: DS.gray400,
  },
  addBioBtnExample: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: '#000000',
    flexShrink: 1,
  },

  // ─ Stats ─
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 2,
    marginBottom: 6,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
    color: DS.dark,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: DS.gray400,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statSep: {
    width: 1,
    height: 32,
    backgroundColor: DS.gray100,
  },

  // ─ Tab bar ─
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: DS.gray100,
    backgroundColor: DS.surface,
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
    backgroundColor: DS.primary,
    borderRadius: 2,
  },

  // Matches PetIdCard's own card styling (white bg, same border weight/color,
  // same radius, same horizontal inset as the cards in petCardRow) so the
  // "Add Another Pet" action reads as one more slot in the same card stack.
  addPetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(160,48,72,0.55)',
    backgroundColor: '#FFFFFF',
    marginTop: 14,
    marginBottom: 6,
  },
  addPetBtnText: {
    color: DS.primary,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
  },

  // ─ Pet ID cards ─
  petCardRow: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  // ─ Empty state ─
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyStatePets: {
    alignItems: 'center',
    paddingTop: 4,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: DS.gray400,
  },
  placeholderCardCaption: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: DS.gray400,
    textAlign: 'center',
    marginTop: 10,
  },


  // ─ Image modal ─
  imgModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
  },
  imgModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  imgModalClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgModalTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  imgModalContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgModalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: '#000000',
  },
  imgModalPlaceholder: {
    alignItems: 'center',
    gap: 12,
  },
  imgModalPlaceholderText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  imgModalActions: {
    paddingHorizontal: 24,
    gap: 12,
  },
  imgModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: DS.primary,
    borderRadius: 14,
    height: 50,
  },
  imgModalBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});

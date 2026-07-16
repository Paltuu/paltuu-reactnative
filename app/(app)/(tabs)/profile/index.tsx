import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Image,
  ActivityIndicator,
  Animated,
  StyleSheet,
  Dimensions,
  FlatList,
  Share,
  Modal,
  Switch,
  Alert,
  ScrollView,
  RefreshControl,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../../../src/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi, SocialPost } from '../../../../src/api/social';
import { petProfilesApi } from '../../../../src/api/petProfiles';
import client from '../../../../src/api/client';
import PostCardShared from '../../../../src/components/social/PostCard';
import { Avatar } from '../../../../src/components/common/Avatar';
import { PetIdCard } from '../../../../src/components/pets/PetIdCard';
import { ProfileScreenSkeleton } from '../../../../src/components/common/ProfileScreenSkeleton';
import { subscribeToTabPress } from '../../../../src/utils/tabPressSubscription';
import { getShareUrl } from '../../../../src/utils/share';
import { COLORS } from '../../../../src/constants/colors';

const VerifiedIcon = require('../../../../assets/icons/verified-check-svgrepo-com.svg');

const Icons = {
  pawLikeSelect: require('../../../../assets/icons/paw-like-select.svg'),
  pawLikeUnselect: require('../../../../assets/icons/paw-like-unselect.svg'),
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MENU_WIDTH = SCREEN_WIDTH;
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

// ─── Menu Item ────────────────────────────────────────────────────────────────

const MenuItem = ({
  icon,
  label,
  onPress,
  danger = false,
  right,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}) => (
  <TouchableOpacity style={s.menuItemRow} onPress={onPress} activeOpacity={0.65}>
    <View style={s.menuItemLeft}>
      <Ionicons name={icon as any} size={21} color={danger ? DS.primary : DS.dark} />
      <Text style={[s.menuItemText, danger && { color: DS.primary }]}>{label}</Text>
    </View>
    {right ?? <Ionicons name="chevron-forward" size={15} color={DS.gray400} />}
  </TouchableOpacity>
);

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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  // create-post <-> home <-> pets <-> search <-> profile (end of chain, no left swipe)

  const [activeTab, setActiveTab] = useState<TabKey>('Posts');
  const [menuVisible, setMenuVisible] = useState(false);
  const [imageModal, setImageModal] = useState<'profile' | 'cover' | null>(null);
  const [uploading, setUploading] = useState<'profile' | 'cover' | null>(null);
  const [selectedLocalAsset, setSelectedLocalAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nameBlockWidth, setNameBlockWidth] = useState(0);

  const menuSlideX = useRef(new Animated.Value(MENU_WIDTH)).current;

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

  const togglePrivacyMutation = useMutation({
    mutationFn: (newPrivacy: boolean) => socialApi.togglePrivacy(newPrivacy),
    onMutate: async (newPrivacy) => {
      await queryClient.cancelQueries({ queryKey: ['social-profile', userId] });
      const previousProfile = queryClient.getQueryData(['social-profile', userId]);
      queryClient.setQueryData(['social-profile', userId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          profile: {
            ...old.profile,
            is_private: newPrivacy,
          }
        };
      });
      return { previousProfile };
    },
    onError: (err, newPrivacy, context: any) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(['social-profile', userId], context.previousProfile);
      }
      Alert.alert('Error', 'Failed to update privacy settings.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['social-profile', userId] });
    }
  });

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
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['social-profile', userId] });
      await queryClient.invalidateQueries({ queryKey: ['social-pets', userId] });
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, userId]);

  // Re-tapping the Profile tab while already on it refreshes the profile data.
  useEffect(() => {
    return subscribeToTabPress('profile', () => {
      handleRefresh();
    });
  }, [handleRefresh]);

  // ── Menu animation ──────────────────────────────────────────────────────────
  const openMenu = () => {
    menuSlideX.setValue(MENU_WIDTH);
    setMenuVisible(true);
    setTimeout(() => {
      Animated.timing(menuSlideX, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }, 32);
  };

  const closeMenu = () => {
    Animated.timing(menuSlideX, {
      toValue: MENU_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  };

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
      const postWithAuthor: SocialPost = {
        ...item,
        user_id: profile.user_id,
        author_name: profile.name,
        author_image: profile.profile_image_url,
        social_username: profile.social_username || profile.username,
      };
      return (
        <PostCardShared
          post={postWithAuthor}
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

  const ListHeader = () => (
    <View style={s.headerWrapper}>
      {/* Top action bar */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={{ width: 40 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={s.menuBtn} onPress={handleShareProfile}>
            <ExpoImage
              source={require('../../../../assets/icons/share-solid.svg')}
              style={{ width: 22, height: 22 }}
              contentFit="contain"
              tintColor="#000000"
            />
          </TouchableOpacity>
          <TouchableOpacity style={s.menuBtn} onPress={() => (menuVisible ? closeMenu() : openMenu())}>
            <ExpoImage
              source={require('../../../../assets/icons/hamburger-solid.svg')}
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

      {activeTab === 'Pets' && (tabData.Pets?.length ?? 0) > 0 && (
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
          <Text style={s.addPetBtnText}>Add Another Pet</Text>
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
      <FlatList
        key={activeTab}
        data={tabData[activeTab]}
        keyExtractor={(item, idx) =>
          activeTab === 'Pets'
            ? `pet-${item.pet_profile_id ?? idx}`
            : (item.post_id ?? item.id ?? idx).toString()
        }
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[DS.primary]}
            tintColor={DS.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyState}>
            {isTabLoading ? (
              <ActivityIndicator size="small" color={DS.primary} />
            ) : activeTab === 'Pets' ? (
              <View style={{ width: '100%', paddingHorizontal: 8 }}>
                <PetIdCard isPlaceholder />
                <Text style={s.placeholderCardCaption}>This could be your pet.</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(app)/pet-profile/create')}
                  style={{
                    backgroundColor: DS.primary,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 12,
                    marginTop: 16,
                    alignSelf: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontFamily: 'Montserrat_600SemiBold', fontSize: 13 }}>
                    Add Your Pet
                  </Text>
                </TouchableOpacity>
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

      {/* ── Side drawer menu ────────────────────────────────────────────────── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
        presentationStyle="overFullScreen"
      >
        <Pressable style={s.menuOverlay} onPress={closeMenu}>
          <Animated.View style={[s.menuPanel, { transform: [{ translateX: menuSlideX }] }]}>
            <Pressable onPress={() => { }} style={{ flex: 1 }}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
              >
                {/* Header */}
                <View style={[s.menuHeader, { paddingTop: insets.top + 20 }]}>
                  <Avatar
                    uri={profile?.profile_image_url}
                    size={52}
                  />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={s.menuHeaderName} numberOfLines={1}>
                      {profile?.name || 'User'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={s.menuHeaderUsername} numberOfLines={1}>
                        @{profile?.social_username || profile?.username || 'user'}
                      </Text>
                      {!!profile?.verified && (
                        <ExpoImage source={VerifiedIcon} style={{ width: 12, height: 12 }} tintColor={COLORS.primary} />
                      )}
                    </View>
                  </View>
                  <TouchableOpacity onPress={closeMenu} hitSlop={12} style={{ padding: 4 }}>
                    <Ionicons name="close" size={24} color={DS.dark} />
                  </TouchableOpacity>
                </View>

                <View style={s.menuDivider} />

                <MenuItem
                  icon="settings-outline"
                  label="Settings"
                  onPress={() => { closeMenu(); router.push('/(app)/profile/settings'); }}
                />
                <MenuItem
                  icon="bookmark-outline"
                  label="Saved Posts"
                  onPress={() => { closeMenu(); router.push('/(app)/profile/saved'); }}
                />
                <MenuItem
                  icon="paw-outline"
                  label="My Adoption Listings"
                  onPress={() => { closeMenu(); router.push('/(app)/my-listings'); }}
                />
                <MenuItem
                  icon="mail-outline"
                  label="Adoption Requests"
                  onPress={() => { closeMenu(); router.push('/(app)/adoption-requests'); }}
                />
                <MenuItem
                  icon="document-text-outline"
                  label="My Applications"
                  onPress={() => { closeMenu(); router.push('/(app)/my-applications'); }}
                />

                {/* Account privacy toggle */}
                <View style={s.menuItemRow}>
                  <View style={s.menuItemLeft}>
                    <Ionicons name="lock-closed-outline" size={21} color={DS.dark} />
                    <Text style={s.menuItemText}>Private Account</Text>
                  </View>
                  <Switch
                    value={profile?.is_private ?? false}
                    onValueChange={(val) => togglePrivacyMutation.mutate(val)}
                    disabled={togglePrivacyMutation.isPending}
                    trackColor={{ true: DS.primary, false: DS.gray100 }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={s.menuDivider} />

                <MenuItem
                  icon="help-circle-outline"
                  label="Help"
                  onPress={() => { closeMenu(); router.push('/(app)/profile/help'); }}
                />
                <MenuItem
                  icon="information-circle-outline"
                  label="About"
                  onPress={() => { closeMenu(); router.push('/(app)/profile/about'); }}
                />
                <MenuItem
                  icon="shield-outline"
                  label="Privacy Center"
                  onPress={() => { closeMenu(); router.push('/(app)/profile/privacy'); }}
                />
                <MenuItem
                  icon="remove-circle-outline"
                  label="Blocked Users"
                  onPress={() => { closeMenu(); router.push('/(app)/profile/blocked'); }}
                />

                <View style={s.menuDivider} />

                <MenuItem
                  icon="log-out-outline"
                  label="Log Out"
                  danger
                  right={<View />}
                  onPress={() => { closeMenu(); logout(); }}
                />
              </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

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

  // ─ Menu drawer ─
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  menuPanel: {
    width: MENU_WIDTH,
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: DS.surface,
    shadowColor: '#000',
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  menuHeaderName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: DS.dark,
  },
  menuHeaderUsername: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: DS.gray500,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: DS.gray100,
    marginVertical: 6,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  menuItemText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: DS.dark,
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

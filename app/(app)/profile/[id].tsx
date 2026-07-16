import React, { useState, useRef, useEffect } from 'react';
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
  Modal,
  Alert,
  ScrollView,
  Share,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../../src/stores/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { socialApi, SocialPost } from '../../../src/api/social';
import client from '../../../src/api/client';
import PostCardShared from '../../../src/components/social/PostCard';
import { useSocialActions } from '../../../src/hooks/useSocialActions';
import { ReportBottomSheet } from '../../../src/components/social/ReportBottomSheet';
import { useMutation } from '@tanstack/react-query';
import { NO_PROFILE_IMAGE } from '../../../src/constants/images';
import { Avatar } from '../../../src/components/common/Avatar';
import { PetIdCard } from '../../../src/components/pets/PetIdCard';
import { petProfilesApi } from '../../../src/api/petProfiles';
import { ProfileScreenSkeleton } from '../../../src/components/common/ProfileScreenSkeleton';
import { withFocusUnmount } from '../../../src/components/common/withFocusUnmount';
import { COLORS } from '../../../src/constants/colors';

const VerifiedIcon = require('../../../assets/icons/verified-check-svgrepo-com.svg');
import { getShareUrl } from '../../../src/utils/share';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AVATAR_SIZE = 96;

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

const Icons = {
  pawLikeSelect: require('../../../assets/icons/paw-like-select.svg'),
  pawLikeUnselect: require('../../../assets/icons/paw-like-unselect.svg'),
};

function formatCount(n: number = 0): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// The Pets tab renders the user's personal pet profiles as shared PetIdCard
// components (CNIC-style ID cards), reading from petProfilesApi.getUserPetProfiles.
// Reposts render inline in the Posts tab (via PostCardShared's own repost
// handling) — there is no separate Reposts tab.

const TAB_CONFIG = [
  { key: 'Posts', renderIcon: (active: boolean) => <Ionicons name={active ? 'grid' : 'grid-outline'} size={22} color={active ? DS.primary : DS.gray400} /> },
  { key: 'Pets', renderIcon: (active: boolean) => <ExpoImage source={active ? Icons.pawLikeSelect : Icons.pawLikeUnselect} style={{ width: 24, height: 24 }} contentFit="contain" /> },
] as const;

function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const currentUser = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toggleFollow, isFollowing: followMutationLoading } = useSocialActions();

  const [activeTab, setActiveTab] = useState<any>('Posts');
  const [imageModal, setImageModal] = useState<'profile' | 'cover' | null>(null);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);

  // Rendered as a plain in-tree overlay rather than a native <Modal> (see
  // below) — preserve hardware-back-closes-viewer behavior manually.
  useEffect(() => {
    if (!imageModal) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setImageModal(null);
      return true;
    });
    return () => sub.remove();
  }, [imageModal]);

  const userId = id as string;
  const isMe = String(currentUser?.id) === String(userId);

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

  const profile = profileData?.profile;

  const tabData: any = {
    Posts: profileData?.posts || [],
    Pets: petsData?.pets || [],
  };

  const isBlockedByMe = profile?.is_blocked_by_me;
  const isBlockingMe = profile?.is_blocking_me;
  const isPrivateLocked = profile?.is_private_locked;
  const isLocked = isPrivateLocked || isBlockedByMe || isBlockingMe;
  const isTabLoading = (activeTab === 'Posts' && isProfileLoading) || (activeTab === 'Pets' && isPetsLoading);

  const blockMutation = useMutation({
    mutationFn: () => socialApi.blockUser(userId),
    onSuccess: () => {
      import('react-native-toast-message').then((mod) => {
        mod.default.show({ type: 'success', text1: 'User blocked' });
      });
      queryClient.setQueryData(['social-feed'], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.filter((p: any) => String(p.user_id) !== String(userId))
          }))
        };
      });
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['social-profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['social-search'] });
      queryClient.invalidateQueries({ queryKey: ['social-explore'] });
    },
    onError: () => {
      import('react-native-toast-message').then((mod) => {
        mod.default.show({ type: 'error', text1: 'Could not block user' });
      });
    }
  });

  const handleShareProfile = async () => {
    try {
      await Share.share({ title: 'Paltuu Profile', message: getShareUrl(`profile/${profile?.user_id ?? userId}`) });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const unblockMutation = useMutation({
    mutationFn: () => socialApi.unblockUser(userId),
    onSuccess: () => {
      import('react-native-toast-message').then((mod) => {
        mod.default.show({ type: 'success', text1: 'User unblocked' });
      });
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['social-profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
    },
    onError: () => {
      import('react-native-toast-message').then((mod) => {
        mod.default.show({ type: 'error', text1: 'Could not unblock user' });
      });
    }
  });

  const handleUnblock = () => {
    Alert.alert(
      'Unblock User',
      `Unblock ${profile?.name}? They will be able to see your profile and posts again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unblock', style: 'default', onPress: () => unblockMutation.mutate() },
      ]
    );
  };

  const handleProfileMenu = () => {
    import('react-native').then(({ ActionSheetIOS, Platform, Alert }) => {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Cancel', 'Report Profile', 'Block User'],
            destructiveButtonIndex: 2,
            cancelButtonIndex: 0,
          },
          (btnIdx) => {
            if (btnIdx === 1) setReportSheetVisible(true);
            else if (btnIdx === 2) {
              Alert.alert('Block User', 'Are you sure you want to block this user?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Block', style: 'destructive', onPress: () => blockMutation.mutate() },
              ]);
            }
          }
        );
      } else {
        Alert.alert('Profile Options', undefined, [
          { text: 'Report Profile', onPress: () => setReportSheetVisible(true) },
          { text: 'Block User', style: 'destructive', onPress: () => {
              Alert.alert('Block User', 'Are you sure you want to block this user?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Block', style: 'destructive', onPress: () => blockMutation.mutate() },
              ]);
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]);
      }
    });
  };

  const renderItem = ({ item }: { item: any }) => {
    if (activeTab === 'Posts') {
      const postWithAuthor: SocialPost = {
        ...item,
        user_id: profile?.user_id,
        author_name: profile?.name,
        author_image: profile?.profile_image_url,
        social_username: profile?.social_username || profile?.username,
      };
      return <PostCardShared post={postWithAuthor} onPress={() => router.push(`/post/${item.post_id}`)} />;
    }
    // Only remaining tab is Pets.
    return (
      <View style={s.petCardRow}>
        <PetIdCard
          pet={{
            pet_profile_id: item.pet_profile_id,
            name: item.name,
            species: item.species,
            breed: item.breed,
            gender: item.gender,
            date_of_birth: item.date_of_birth,
            avatar_url: item.avatar_url,
            owner_name: profile?.name,
            created_at: item.created_at,
          }}
          onPress={() => router.push({ pathname: '/(app)/pet-profile/[id]', params: { id: item.pet_profile_id } })}
        />
      </View>
    );
  };

  const ListHeader = () => (
    <View style={s.headerWrapper}>
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.menuBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' }}>
          <TouchableOpacity style={s.menuBtn} onPress={handleShareProfile}>
            <Ionicons name="share-social-outline" size={22} color="#000000" />
          </TouchableOpacity>
          {!isMe && !isBlockedByMe && !isBlockingMe && (
            <TouchableOpacity style={s.menuBtn} onPress={handleProfileMenu}>
              <Ionicons name="ellipsis-horizontal" size={24} color="#000000" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={s.avatarCenter}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => setImageModal('profile')}>
          <Avatar uri={profile?.profile_image_url} size={AVATAR_SIZE} />
        </TouchableOpacity>
      </View>

      <Text style={s.displayName}>{profile?.name || 'User'}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 2, marginBottom: 8 }}>
        <Text style={[s.usernameText, { marginTop: 0, marginBottom: 0 }]}>
          @{profile?.social_username || profile?.username || 'user'}
        </Text>
        {!!profile?.verified && (
          <ExpoImage source={VerifiedIcon} style={{ width: 14, height: 14 }} tintColor={COLORS.primary} />
        )}
      </View>

      <View style={s.statsRow}>
        <TouchableOpacity style={s.statItem} onPress={() => router.push({ pathname: '/(app)/follow-list', params: { userId: profile?.user_id, type: 'followers', name: profile?.name } })}>
          <Text style={s.statValue}>{formatCount(profile?.follower_count || 0)}</Text>
          <Text style={s.statLabel}>Followers</Text>
        </TouchableOpacity>
        <View style={s.statSep} />
        <TouchableOpacity style={s.statItem} onPress={() => router.push({ pathname: '/(app)/follow-list', params: { userId: profile?.user_id, type: 'following', name: profile?.name } })}>
          <Text style={s.statValue}>{formatCount(profile?.following_count || 0)}</Text>
          <Text style={s.statLabel}>Following</Text>
        </TouchableOpacity>
        <View style={s.statSep} />
        <View style={s.statItem}>
          <Text style={s.statValue}>{formatCount(profile?.post_count || 0)}</Text>
          <Text style={s.statLabel}>Posts</Text>
        </View>
      </View>

      {!!profile?.bio && <Text style={s.bio}>{profile.bio}</Text>}

      <View style={s.btnRow}>
        {isMe ? (
          <TouchableOpacity style={s.btnSecondary} onPress={() => router.push('/(app)/profile')}>
            <Text style={s.btnSecondaryText}>Go to My Profile</Text>
          </TouchableOpacity>
        ) : isBlockedByMe ? (
          <TouchableOpacity
            style={s.btnPrimary}
            onPress={handleUnblock}
            disabled={unblockMutation.isPending}
          >
            {unblockMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.btnPrimaryText}>Unblock</Text>
            )}
          </TouchableOpacity>
        ) : !isBlockingMe ? (
          <TouchableOpacity
            style={[s.btnPrimary, profile?.is_following && s.btnSecondary]}
            onPress={() => toggleFollow(userId)}
            disabled={followMutationLoading}
          >
            <Text style={[s.btnPrimaryText, profile?.is_following && s.btnSecondaryText]}>
              {profile?.is_following ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {!isLocked ? (
        <View style={s.tabBar}>
          {TAB_CONFIG.map(({ key, renderIcon }) => (
            <TouchableOpacity key={key} style={s.tabItem} onPress={() => setActiveTab(key)} activeOpacity={0.7}>
              {renderIcon(activeTab === key)}
              {activeTab === key && <View style={s.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Ionicons name="lock-closed-outline" size={48} color={DS.gray400} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: DS.dark, marginTop: 12, textAlign: 'center' }}>
            {isBlockedByMe ? "You've blocked this account" : isBlockingMe ? "This account is not available" : "This account is private"}
          </Text>
          <Text style={{ fontSize: 14, color: DS.gray500, marginTop: 8, textAlign: 'center' }}>
            {isBlockedByMe ? "Unblock this user to see their profile and posts." : isBlockingMe ? "You cannot view this user's posts." : "Follow this user to see their posts and pets."}
          </Text>
        </View>
      )}
    </View>
  );

  if (isProfileLoading) return <ProfileScreenSkeleton insetsTop={insets.top} />;

  return (
    <View style={s.screen}>
      <FlatList
        data={tabData[activeTab]}
        keyExtractor={(item, idx) => (item.post_id ?? item.pet_id ?? item.id ?? idx).toString()}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
        style={{ marginBottom: insets.bottom }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={s.postDivider} />}
        ListEmptyComponent={
          isLocked ? null : (
            <View style={s.emptyState}>
              {isTabLoading ? (
                <ActivityIndicator size="small" color={DS.primary} />
              ) : (
                <>
                  <ExpoImage source={Icons.pawLikeUnselect} style={{ width: 40, height: 40 }} contentFit="contain" tintColor={DS.gray100} />
                  <Text style={s.emptyText}>Nothing here yet</Text>
                </>
              )}
            </View>
          )
        }
      />

      {/* Image Viewer — plain in-tree overlay, not a native <Modal> (see the
          matching comment in (tabs)/profile/index.tsx for why). */}
      {imageModal !== null && (
        <View style={[s.imgModalBg, StyleSheet.absoluteFillObject, { zIndex: 100, elevation: 100 }]}>
          <View style={[s.imgModalHeader, { paddingTop: insets.top + 8 }]}><TouchableOpacity onPress={() => setImageModal(null)} style={s.imgModalClose}><Ionicons name="close" size={26} color="#FFFFFF" /></TouchableOpacity><Text style={s.imgModalTitle}>{imageModal === 'profile' ? 'Profile Photo' : 'Cover Photo'}</Text><View style={{ width: 40 }} /></View>
          <View style={s.imgModalContent}>{imageModal === 'profile' ? (<Image source={profile?.profile_image_url ? { uri: profile.profile_image_url } : NO_PROFILE_IMAGE} style={s.imgModalImage} resizeMode="contain" />) : (profile?.cover_photo_url ? <Image source={{ uri: profile.cover_photo_url }} style={s.imgModalImage} resizeMode="contain" /> : <View style={s.center}><Ionicons name="image-outline" size={80} color="white" /></View>)}</View>
        </View>
      )}

      <ReportBottomSheet
        visible={reportSheetVisible}
        onClose={() => setReportSheetVisible(false)}
        targetType="user"
        targetId={userId}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  headerWrapper: { backgroundColor: DS.surface, marginBottom: 8 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 },
  menuBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  avatarCenter: { alignItems: 'center', marginTop: 8, marginBottom: 12 },

  // ─ Identity ─ (synced with profile/index.tsx)
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

  // ─ Stats ─ (synced with profile/index.tsx)
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 2,
    marginBottom: 6,
  },
  statItem: { flex: 1, alignItems: 'center' },
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
  statSep: { width: 1, height: 32, backgroundColor: DS.gray100 },

  // ─ Follow / Go-to-my-profile row — own-profile screen has no equivalent
  // (Edit/Share live in the top bar there instead), so these are [id]-only.
  btnRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 4, marginBottom: 12, gap: 10 },
  btnPrimary: { flex: 1, height: 36, backgroundColor: DS.primary, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  btnSecondary: { flex: 1, height: 36, backgroundColor: DS.gray100, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  btnSecondaryText: { color: DS.dark, fontSize: 14, fontWeight: '600' },

  // ─ Tab bar ─ (synced with profile/index.tsx)
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: DS.gray100,
    backgroundColor: DS.surface,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    width: 32,
    height: 2.5,
    backgroundColor: DS.primary,
    borderRadius: 2,
  },

  // ─ List ─
  postDivider: { height: 8, backgroundColor: DS.bg },

  // ─ Card ─ (synced with profile/index.tsx)
  card: { backgroundColor: DS.surface, paddingTop: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  cardName: { fontFamily: 'Montserrat_600SemiBold', fontSize: 15, color: DS.dark },
  cardMeta: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: DS.gray500, marginTop: 1 },
  cardContent: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: DS.dark,
    lineHeight: 21,
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  // ─ Actions ─
  thinDivider: { height: 0.5, backgroundColor: DS.gray100, marginHorizontal: 16, marginTop: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionCount: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: DS.gray400 },

  // ─ Pet ID cards ─
  petCardRow: { paddingHorizontal: 16, marginBottom: 14 },

  // ─ Repost ─
  repostLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, marginBottom: 8 },
  repostLabelText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: DS.primary },
  repostInset: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: DS.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DS.gray100,
  },

  // ─ Empty state ─
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: DS.gray400 },

  // ─ Image modal ─
  imgModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)' },
  imgModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  imgModalClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  imgModalTitle: { fontFamily: 'Montserrat_600SemiBold', fontSize: 16, color: '#FFFFFF' },
  imgModalContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imgModalImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH, backgroundColor: '#000000' },
});

export default withFocusUnmount(UserProfileScreen);

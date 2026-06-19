import React, { useState, useRef } from 'react';
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
  pawSelect: require('../../../assets/icons/MAIN_PAW_select.svg'),
  pawUnselect: require('../../../assets/icons/MAIN_PAW_unselect.svg'),
  pawLikeSelect: require('../../../assets/icons/paw-like-select.svg'),
  pawLikeUnselect: require('../../../assets/icons/paw-like-unselect.svg'),
  repostSelect: require('../../../assets/icons/repost-select.svg'),
  repostUnselect: require('../../../assets/icons/repost-unselect.svg'),
};

function formatCount(n: number = 0): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const AvatarCircle = ({ uri, size, initials, style }: any) => (
  <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: DS.gray100 }, style]}>
    {uri ? <Image source={{ uri }} style={{ width: size, height: size, backgroundColor: '#FFFFFF' }} resizeMode="cover" /> : <Text style={{ fontSize: size * 0.36, fontWeight: '600', color: DS.primary }}>{initials}</Text>}
  </View>
);

const PetCard = ({ item, user }: any) => {
  const initials = (user?.name || 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <AvatarCircle uri={user?.profile_image_url} size={40} initials={initials} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.cardName}>{user?.name || 'User'}</Text>
          <Text style={s.cardMeta}>@{user?.social_username || user?.username || 'user'}</Text>
        </View>
      </View>
      <View style={s.chipRow}>
        <View style={s.chip}><ExpoImage source={Icons.pawSelect} style={{ width: 11, height: 11 }} contentFit="contain" /><Text style={s.chipText}>{item.pet_name}</Text></View>
        {item.pet_breed && <View style={[s.chip, { backgroundColor: DS.gray100 }]}><Text style={[s.chipText, { color: DS.gray500 }]}>{item.pet_breed}</Text></View>}
      </View>
      {item.main_image && <Image source={{ uri: item.main_image }} style={s.cardMedia} resizeMode="cover" />}
    </View>
  );
};

const RepostCard = ({ item, user }: any) => {
  const initials = (user?.name || 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <AvatarCircle uri={user?.profile_image_url} size={40} initials={initials} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.cardName}>{user?.name || 'User'}</Text>
          <Text style={s.cardMeta}>@{user?.social_username || user?.username || 'user'}</Text>
        </View>
      </View>
      <View style={s.repostLabel}><ExpoImage source={Icons.repostSelect} style={{ width: 13, height: 13 }} contentFit="contain" /><Text style={s.repostLabelText}>{user?.name || 'User'} reposted</Text></View>
      <View style={s.repostInset}><Text style={s.cardContent}>{item.content}</Text></View>
      <View style={s.thinDivider} />
      <View style={s.actionRow}>
        <TouchableOpacity style={s.actionBtn}><ExpoImage source={Icons.pawLikeUnselect} style={{ width: 22, height: 22 }} contentFit="contain" /><Text style={s.actionCount}>{formatCount(item.like_count || 0)}</Text></TouchableOpacity>
        <TouchableOpacity style={s.actionBtn}><Ionicons name="chatbubble-outline" size={20} color={DS.gray400} /></TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, { marginLeft: 'auto' }]}><Ionicons name="arrow-redo-outline" size={20} color={DS.gray400} /></TouchableOpacity>
      </View>
    </View>
  );
};

const TAB_CONFIG = [
  { key: 'Posts', renderIcon: (active: boolean) => <Ionicons name={active ? 'grid' : 'grid-outline'} size={22} color={active ? DS.primary : DS.gray400} /> },
  { key: 'Pets', renderIcon: (active: boolean) => <ExpoImage source={active ? Icons.pawLikeSelect : Icons.pawLikeUnselect} style={{ width: 24, height: 24 }} contentFit="contain" /> },
  { key: 'Reposts', renderIcon: (active: boolean) => <ExpoImage source={active ? Icons.repostSelect : Icons.repostUnselect} style={{ width: 24, height: 24 }} contentFit="contain" /> },
] as const;

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const { user: currentUser } = useAuthStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toggleFollow, isFollowing: followMutationLoading } = useSocialActions();

  const [activeTab, setActiveTab] = useState<any>('Posts');
  const [imageModal, setImageModal] = useState<'profile' | 'cover' | null>(null);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);

  const userId = id as string;
  const isMe = String(currentUser?.id) === String(userId);

  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ['social-profile', userId],
    queryFn: () => socialApi.getProfile(userId!),
    enabled: !!userId,
  });

  const { data: repostsData, isLoading: isRepostsLoading } = useQuery({
    queryKey: ['social-reposts', userId],
    queryFn: () => socialApi.getReposts(userId!),
    enabled: !!userId && activeTab === 'Reposts',
  });

  const { data: petsData, isLoading: isPetsLoading } = useQuery({
    queryKey: ['social-pets', userId],
    queryFn: () => socialApi.getPets(userId!),
    enabled: !!userId && activeTab === 'Pets',
  });

  const profile = profileData?.profile;
  const initials = (profile?.name || 'U').split(' ').map((w: any) => w[0]).join('').slice(0, 2).toUpperCase();

  const tabData: any = {
    Posts: profileData?.posts || [],
    Pets: petsData?.pets || [],
    Reposts: repostsData?.reposts || [],
  };

  const isBlockedByMe = profile?.is_blocked_by_me;
  const isBlockingMe = profile?.is_blocking_me;
  const isPrivateLocked = profile?.is_private_locked;
  const isLocked = isPrivateLocked || isBlockedByMe || isBlockingMe;
  const isTabLoading = (activeTab === 'Posts' && isProfileLoading) || (activeTab === 'Pets' && isPetsLoading) || (activeTab === 'Reposts' && isRepostsLoading);

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
      const shareText = `Check out ${profile?.name || 'this profile'} on Paltuu\n\npaltuu://profile/${profile?.user_id ?? userId}`;
      await Share.share({ title: 'Paltuu Profile', message: shareText });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
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
    if (activeTab === 'Pets') return <PetCard item={item} user={profile} />;
    return <RepostCard item={item} user={profile} />;
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
          <AvatarCircle uri={profile?.profile_image_url} size={AVATAR_SIZE} initials={initials} />
        </TouchableOpacity>
      </View>

      <Text style={s.displayName}>{profile?.name || 'User'}</Text>
      <Text style={s.usernameText}>@{profile?.social_username || profile?.username || 'user'}</Text>

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
        ) : !isBlockedByMe && !isBlockingMe ? (
          <TouchableOpacity 
            style={[s.btnPrimary, profile?.is_following && s.btnSecondary]} 
            onPress={() => toggleFollow(userId)}
            disabled={followMutationLoading}
          >
            {followMutationLoading ? (
              <ActivityIndicator size="small" color={profile?.is_following ? DS.primary : "#fff"} />
            ) : (
              <Text style={[s.btnPrimaryText, profile?.is_following && s.btnSecondaryText]}>
                {profile?.is_following ? 'Following' : 'Follow'}
              </Text>
            )}
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
            {isBlockedByMe ? "You must unblock this user in Blocked Users to see their posts." : isBlockingMe ? "You cannot view this user's posts." : "Follow this user to see their posts and pets."}
          </Text>
        </View>
      )}
    </View>
  );

  if (isProfileLoading) return <View style={[s.screen, s.center]}><ActivityIndicator size="large" color={DS.primary} /></View>;

  return (
    <View style={s.screen}>
      <FlatList
        data={tabData[activeTab]}
        keyExtractor={(item, idx) => (item.post_id ?? item.pet_id ?? item.id ?? idx).toString()}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
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

      {/* Image Viewer */}
      <Modal visible={imageModal !== null} transparent animationType="fade" onRequestClose={() => setImageModal(null)}>
        <View style={s.imgModalBg}>
          <View style={[s.imgModalHeader, { paddingTop: insets.top + 8 }]}><TouchableOpacity onPress={() => setImageModal(null)} style={s.imgModalClose}><Ionicons name="close" size={26} color="#FFFFFF" /></TouchableOpacity><Text style={s.imgModalTitle}>{imageModal === 'profile' ? 'Profile Photo' : 'Cover Photo'}</Text><View style={{ width: 40 }} /></View>
          <View style={s.imgModalContent}>{imageModal === 'profile' ? (profile?.profile_image_url ? <Image source={{ uri: profile.profile_image_url }} style={s.imgModalImage} resizeMode="contain" /> : <View style={s.center}><Ionicons name="person-outline" size={80} color="white" /></View>) : (profile?.cover_photo_url ? <Image source={{ uri: profile.cover_photo_url }} style={s.imgModalImage} resizeMode="contain" /> : <View style={s.center}><Ionicons name="image-outline" size={80} color="white" /></View>)}</View>
        </View>
      </Modal>

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
  headerWrapper: { backgroundColor: DS.surface, marginBottom: 4 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  menuBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  avatarCenter: { alignItems: 'center', marginTop: 8, marginBottom: 12 },
  displayName: { fontSize: 20, fontWeight: '800', color: DS.dark, textAlign: 'center' },
  usernameText: { fontSize: 14, color: DS.gray500, textAlign: 'center', marginTop: 2 },
  bio: { fontSize: 14, color: '#4B5563', textAlign: 'center', marginTop: 2, marginBottom: 4, paddingHorizontal: 32, lineHeight: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, marginBottom: 0, paddingHorizontal: 20 },
  statItem: { alignItems: 'center', paddingHorizontal: 15 },
  statValue: { fontSize: 15, fontWeight: '800', color: DS.dark },
  statLabel: { fontSize: 11, color: DS.gray500, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  statSep: { width: 1, height: 24, backgroundColor: '#E5E7EB' },
  btnRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 24, gap: 10 },
  btnPrimary: { flex: 1, height: 44, backgroundColor: DS.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  btnSecondary: { flex: 1, height: 44, backgroundColor: DS.gray100, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  btnSecondaryText: { color: DS.dark, fontSize: 15, fontWeight: '600' },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 20 },
  tabItem: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center' },
  tabUnderline: { position: 'absolute', bottom: 0, width: 40, height: 3, backgroundColor: DS.primary, borderRadius: 1.5 },
  postDivider: { height: 8, backgroundColor: DS.bg },
  card: { backgroundColor: '#FFFFFF', padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardName: { fontSize: 15, fontWeight: '700', color: DS.dark },
  cardMeta: { fontSize: 13, color: DS.gray500 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: DS.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 4 },
  chipText: { fontSize: 12, color: DS.primary, fontWeight: '600' },
  cardMedia: { width: '100%', height: 240, borderRadius: 12, marginTop: 4 },
  repostLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginLeft: 52 },
  repostLabelText: { fontSize: 13, color: DS.gray500, fontWeight: '600' },
  repostInset: { marginLeft: 52, padding: 12, backgroundColor: DS.gray100, borderRadius: 12 },
  cardContent: { fontSize: 15, color: DS.dark, lineHeight: 22 },
  thinDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { fontSize: 14, color: DS.gray500, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: DS.gray400, marginTop: 12, fontSize: 15 },
  imgModalBg: { flex: 1, backgroundColor: 'black' },
  imgModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  imgModalClose: { padding: 8 },
  imgModalTitle: { color: 'white', fontSize: 17, fontWeight: '600' },
  imgModalContent: { flex: 1, justifyContent: 'center' },
  imgModalImage: { width: '100%', height: '100%' },
});

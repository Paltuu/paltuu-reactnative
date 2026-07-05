import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../../src/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi, SocialPost } from '../../../src/api/social';
import { petProfilesApi } from '../../../src/api/petProfiles';
import client from '../../../src/api/client';
import PostCardShared from '../../../src/components/social/PostCard';
import { MentionText } from '../../../src/components/social/MentionText';

const Icons = {
  pawSelect: require('../../../assets/icons/MAIN_PAW_select.svg'),
  pawUnselect: require('../../../assets/icons/MAIN_PAW_unselect.svg'),
  pawLikeSelect: require('../../../assets/icons/paw-like-select.svg'),
  pawLikeUnselect: require('../../../assets/icons/paw-like-unselect.svg'),
  repostSelect: require('../../../assets/icons/repost-select.svg'),
  repostUnselect: require('../../../assets/icons/repost-unselect.svg'),
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MENU_WIDTH = SCREEN_WIDTH;
const AVATAR_SIZE = 96;
const GRID_PADDING = 16;
const GRID_GAP = 12;
const PET_CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

const SPECIES_EMOJI: Record<string, string> = {
  cat: '🐱', dog: '🐶', bird: '🐦', rabbit: '🐰',
  hamster: '🐹', fish: '🐠', turtle: '🐢', parrot: '🦜',
};
const getSpeciesEmoji = (species?: string | null) =>
  SPECIES_EMOJI[species?.toLowerCase() ?? ''] ?? '🐾';

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

function chunkPairs<T>(arr: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) rows.push(arr.slice(i, i + 2));
  return rows;
}

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

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AvatarCircle = ({
  uri,
  size,
  initials,
  style,
}: {
  uri?: string | null;
  size: number;
  initials: string;
  style?: any;
}) => (
  <View
    style={[
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: DS.gray100,
      },
      style,
    ]}
  >
    {uri ? (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, backgroundColor: '#FFFFFF' }}
        resizeMode="cover"
      />
    ) : (
      <Text
        style={{
          fontSize: size * 0.36,
          fontFamily: 'Montserrat_600SemiBold',
          color: DS.primary,
        }}
      >
        {initials}
      </Text>
    )}
  </View>
);

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

// Internal PetCard and RepostCard remain for now as they are specific layouts
// but we will use the shared PostCard for standard posts.

// ─── Pet Card ─────────────────────────────────────────────────────────────────

const PetCard = ({ item, onPress }: { item: any; onPress: () => void }) => {
  const metaLine = [item.breed, item.age].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity style={s.petCard} onPress={onPress} activeOpacity={0.9}>
      {item.avatar_url ? (
        <ExpoImage source={{ uri: item.avatar_url }} style={s.petCardImage} contentFit="cover" />
      ) : (
        <View style={[s.petCardImage, s.petCardImageFallback]}>
          <Text style={s.petCardFallbackEmoji}>{getSpeciesEmoji(item.species)}</Text>
        </View>
      )}

      {item.is_listed_for_adoption && (
        <View style={s.adoptionBadge}>
          <Text style={s.adoptionBadgeText}>For Adoption</Text>
        </View>
      )}

      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.78)']} style={s.petCardGradient}>
        <View style={s.petCardNameRow}>
          <Text style={s.petCardEmoji}>{getSpeciesEmoji(item.species)}</Text>
          <Text style={s.petCardName} numberOfLines={1}>{item.name}</Text>
        </View>
        {!!metaLine && (
          <Text style={s.petCardMeta} numberOfLines={1}>{metaLine}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

// ─── Repost Card ──────────────────────────────────────────────────────────────

const RepostCard = ({ item, user }: { item: any; user: any }) => {
  const initials = (user?.name || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <AvatarCircle uri={user?.profile_image_url} size={40} initials={initials} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.cardName}>{user?.name || 'User'}</Text>
          <Text style={s.cardMeta}>@{user?.social_username || user?.username || 'user'}</Text>
        </View>
      </View>

      <View style={s.repostLabel}>
        <ExpoImage source={Icons.repostSelect} style={{ width: 13, height: 13 }} contentFit="contain" />
        <Text style={s.repostLabelText}>{user?.name || 'User'} reposted</Text>
      </View>

      <View style={s.repostInset}>
        <MentionText
          content={item.content}
          textStyle={[s.cardContent, { color: DS.dark, paddingHorizontal: 0, marginBottom: 0 }]}
        />
      </View>

      <View style={s.thinDivider} />
      <View style={s.actionRow}>
        <TouchableOpacity style={s.actionBtn}>
          <ExpoImage source={Icons.pawLikeUnselect} style={{ width: 22, height: 22 }} contentFit="contain" />
          <Text style={s.actionCount}>{formatCount(item.like_count || 0)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn}>
          <Ionicons name="chatbubble-outline" size={20} color={DS.gray400} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, { marginLeft: 'auto' }]}>
          <Ionicons name="arrow-redo-outline" size={20} color={DS.gray400} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

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
  {
    key: 'Reposts',
    renderIcon: (active: boolean) => (
      <ExpoImage source={active ? Icons.repostSelect : Icons.repostUnselect} style={{ width: 24, height: 24 }} contentFit="contain" />
    ),
  },
] as const;

type TabKey = typeof TAB_CONFIG[number]['key'];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>('Posts');
  const [menuVisible, setMenuVisible] = useState(false);
  const [imageModal, setImageModal] = useState<'profile' | 'cover' | null>(null);
  const [uploading, setUploading] = useState<'profile' | 'cover' | null>(null);
  const [selectedLocalAsset, setSelectedLocalAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nameBlockWidth, setNameBlockWidth] = useState(0);

  // ── Inline editing state ──────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editBioHeight, setEditBioHeight] = useState(40);
  const nameInputRef = useRef<TextInput>(null);
  const usernameInputRef = useRef<TextInput>(null);
  const bioInputRef = useRef<TextInput>(null);

  const menuSlideX = useRef(new Animated.Value(MENU_WIDTH)).current;

  const userId = user?.id;

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
    queryFn: () => petProfilesApi.getUserPetProfiles(userId!),
    enabled: !!userId && activeTab === 'Pets',
  });

  // ── Sync edit fields when profile loads or editing starts ─────────────────
  useEffect(() => {
    if (isEditing && profile) {
      setEditName(profile.name || '');
      setEditUsername(profile.social_username || profile.username || '');
      setEditBio(profile.bio || '');
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isEditing]);

  // ── Inline update mutation ────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (payload: any) => socialApi.updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-profile', userId] });
      setIsEditing(false);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error?.message || 'Failed to update profile.');
    },
  });

  const handleInlineSave = () => {
    if (!editName.trim()) {
      Alert.alert('Name required', 'Display name cannot be empty.');
      return;
    }
    updateMutation.mutate({
      name: editName.trim(),
      social_username: editUsername.trim().toLowerCase(),
      bio: editBio.trim(),
    });
  };

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

  const initials = (profile?.name || 'U')
    .split(' ')
    .map((w: any) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const tabData: Record<TabKey, any[]> = {
    Posts: profileData?.posts || [],
    Pets: petsData?.pets || petsData?.pet_profiles || [],
    Reposts: repostsData?.reposts || [],
  };

  const isTabLoading =
    (activeTab === 'Posts' && isProfileLoading) ||
    (activeTab === 'Pets' && isPetsLoading) ||
    (activeTab === 'Reposts' && isRepostsLoading);

  // ── Pull-to-refresh ──────────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['social-profile', userId] });
      await queryClient.invalidateQueries({ queryKey: ['social-reposts', userId] });
      await queryClient.invalidateQueries({ queryKey: ['social-pets', userId] });
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, userId]);

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
      const shareText = `Check out ${profile?.name || 'this profile'} on Paltuu\n\npaltuu://profile/${profile?.user_id ?? userId}`;
      await Share.share({ title: 'Paltuu Profile', message: shareText });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // ── Image upload ────────────────────────────────────────────────────────────

  const closeModal = () => {
    setSelectedLocalAsset(null);
    setImageModal(null);
  };

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
    if (activeTab === 'Pets') {
      const row = item as any[];
      return (
        <View style={s.petGridRow}>
          {row.map((pet) => (
            <PetCard
              key={pet.pet_profile_id ?? pet.pet_id ?? pet.id}
              item={pet}
              onPress={() => router.push({ pathname: '/(app)/pet-profile/[id]', params: { id: pet.pet_profile_id, from: 'profile' } })}
            />
          ))}
          {row.length === 1 && <View style={{ width: PET_CARD_WIDTH }} />}
        </View>
      );
    }
    return <RepostCard item={item} user={profile} />;
  };

  const petRows = activeTab === 'Pets' ? chunkPairs(tabData.Pets) : [];

  const currentImageUri = selectedLocalAsset?.uri ||
    (imageModal === 'profile' ? profile?.profile_image_url : profile?.cover_photo_url);

  const ListHeader = () => (
    <View style={s.headerWrapper}>
      {/* Top action bar */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        {isEditing ? (
          <TouchableOpacity onPress={() => setIsEditing(false)} style={s.topBarCancelBtn}>
            <Text style={s.topBarCancelText}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}

        {isEditing ? (
          <TouchableOpacity
            onPress={handleInlineSave}
            disabled={updateMutation.isPending}
            style={[s.topBarSaveBtn, updateMutation.isPending && { opacity: 0.6 }]}
          >
            {updateMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.topBarSaveText}>Save</Text>}
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={s.menuBtn} onPress={handleShareProfile}>
              <ExpoImage
                source={require('../../../assets/icons/share-solid.svg')}
                style={{ width: 22, height: 22 }}
                contentFit="contain"
                tintColor="#000000"
              />
            </TouchableOpacity>
            <TouchableOpacity style={s.menuBtn} onPress={() => (menuVisible ? closeMenu() : openMenu())}>
              <ExpoImage
                source={require('../../../assets/icons/hamburger-solid.svg')}
                style={{ width: 24, height: 24 }}
                contentFit="contain"
                tintColor="#000000"
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Avatar */}
      <View style={s.avatarCenter}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setImageModal('profile')}
          style={{ position: 'relative' }}
        >
          <AvatarCircle
            uri={profile?.profile_image_url}
            size={AVATAR_SIZE}
            initials={initials}
          />
          {isEditing && (
            <View style={s.avatarCamBadge}>
              {uploading === 'profile'
                ? <ActivityIndicator size="small" color="#fff" style={{ width: 16, height: 16 }} />
                : <Ionicons name="camera" size={15} color="#fff" />}
            </View>
          )}
        </TouchableOpacity>
        {isEditing && (
          <Text style={s.changePhotoHint}>Tap to change photo</Text>
        )}
      </View>

      {/* Identity */}
      <View style={{ alignItems: 'center', position: 'relative' }}>
        {isEditing ? (
          <View style={{ width: SCREEN_WIDTH - 48, alignItems: 'center' }}>
            <TextInput
              ref={nameInputRef}
              value={editName}
              onChangeText={setEditName}
              style={s.editNameInput}
              placeholder="Your name"
              placeholderTextColor={DS.gray400}
              maxLength={60}
              textAlign="center"
              returnKeyType="next"
              onSubmitEditing={() => usernameInputRef.current?.focus()}
            />
            <TextInput
              ref={usernameInputRef}
              value={editUsername}
              onChangeText={(t) => setEditUsername(t.replace(/\s/g, '').toLowerCase())}
              style={s.editUsernameInput}
              placeholder="username"
              placeholderTextColor={DS.gray400}
              autoCapitalize="none"
              autoCorrect={false}
              textAlign="center"
              returnKeyType="next"
              onSubmitEditing={() => bioInputRef.current?.focus()}
            />
          </View>
        ) : (
          <View
            style={{ alignItems: 'center' }}
            onLayout={(e) => setNameBlockWidth(e.nativeEvent.layout.width)}
          >
            <Text style={s.displayName}>{profile?.name || 'User'}</Text>
            <Text style={s.usernameText}>
              @{profile?.social_username || profile?.username || 'user'}
            </Text>
          </View>
        )}
        {!isEditing && nameBlockWidth > 0 && (
          <TouchableOpacity
            style={[
              s.editSmallBtn,
              { position: 'absolute', left: '50%', marginLeft: nameBlockWidth / 2 + 14, top: 5 },
            ]}
            onPress={() => setIsEditing(true)}
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

      {isEditing ? (
        <TextInput
          ref={bioInputRef}
          value={editBio}
          onChangeText={setEditBio}
          style={[s.editBioInput, { height: Math.max(40, editBioHeight) }]}
          placeholder="Add a bio…"
          placeholderTextColor={DS.gray400}
          multiline
          maxLength={200}
          textAlign="center"
          onContentSizeChange={(e) =>
            setEditBioHeight(e.nativeEvent.contentSize.height + 8)
          }
        />
      ) : profile?.bio ? (
        <Text style={s.bio}>{profile.bio}</Text>
      ) : (
        <TouchableOpacity style={s.addBioBtn} onPress={() => setIsEditing(true)}>
          <ExpoImage
            source={require('../../../assets/icons/plus-solid.svg')}
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
          <Ionicons name="add-circle-outline" size={18} color={DS.primary} />
          <Text style={s.addPetBtnText}>Add Another Pet</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Loading state ────────────────────────────────────────────────────────────

  if (isProfileLoading) {
    return (
      <View style={[s.screen, s.loadingCenter]}>
        <ActivityIndicator size="large" color={DS.primary} />
      </View>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={s.screen}>
      <FlatList
        key={activeTab}
        data={activeTab === 'Pets' ? petRows : tabData[activeTab]}
        keyExtractor={(item, idx) =>
          activeTab === 'Pets'
            ? `pet-row-${idx}`
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
            ) : (
              <>
                <ExpoImage source={Icons.pawLikeUnselect} style={{ width: 40, height: 40 }} contentFit="contain" tintColor={DS.gray100} />
                <Text style={s.emptyText}>Nothing here yet</Text>
                {activeTab === 'Pets' && (
                  <TouchableOpacity
                    onPress={() => router.push('/(app)/pet-profile/create')}
                    style={{
                      backgroundColor: DS.primary,
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 12,
                      marginTop: 12,
                    }}
                  >
                    <Text style={{ color: '#fff', fontFamily: 'Montserrat_600SemiBold', fontSize: 13 }}>
                      Create Pet Profile
                    </Text>
                  </TouchableOpacity>
                )}
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
                  <AvatarCircle
                    uri={profile?.profile_image_url}
                    size={52}
                    initials={initials}
                  />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={s.menuHeaderName} numberOfLines={1}>
                      {profile?.name || 'User'}
                    </Text>
                    <Text style={s.menuHeaderUsername} numberOfLines={1}>
                      @{profile?.social_username || profile?.username || 'user'}
                    </Text>
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

      {/* ── Image viewer / uploader ─────────────────────────────────────────── */}
      <Modal
        visible={imageModal !== null}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={s.imgModalBg}>
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
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DS.bg,
  },
  loadingCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─ Header wrapper ─
  headerWrapper: {
    backgroundColor: DS.surface,
    marginBottom: 4,
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
  topBarCancelBtn: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  topBarCancelText: {
    fontSize: 15,
    color: DS.dark,
    fontFamily: 'DMSans_400Regular',
  },
  topBarSaveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 22,
    backgroundColor: DS.primary,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Montserrat_700Bold',
  },

  // ─ Avatar ─
  avatarCenter: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  avatarCamBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  changePhotoHint: {
    marginTop: 6,
    fontSize: 12,
    color: DS.primary,
    fontFamily: 'Montserrat_600SemiBold',
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

  // ─ Inline edit inputs ─
  editNameInput: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 22,
    color: DS.dark,
    textAlign: 'center',
    letterSpacing: -0.3,
    borderWidth: 1,
    borderColor: '#E4E6EF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
    width: '100%',
  },
  editUsernameInput: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: DS.gray500,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#E4E6EF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
    width: '100%',
  },
  editBioInput: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: DS.gray500,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: '#E4E6EF',
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  editActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 4,
  },
  cancelEditBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E4E6EF',
  },
  cancelEditBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: DS.dark,
  },
  saveEditBtn: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: DS.primary,
    minWidth: 80,
    alignItems: 'center',
  },
  saveEditBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#fff',
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

  // ─ Card ─
  card: {
    backgroundColor: DS.surface,
    paddingTop: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  cardName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
    color: DS.dark,
  },
  cardMeta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: DS.gray500,
    marginTop: 1,
  },
  cardContent: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: DS.dark,
    lineHeight: 21,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  addPetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: DS.primaryLight,
    marginTop: 14,
    marginBottom: 6,
  },
  addPetBtnText: {
    color: DS.primary,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
  },

  // ─ Pet grid ─
  petGridRow: {
    flexDirection: 'row',
    paddingHorizontal: GRID_PADDING,
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  petCard: {
    width: PET_CARD_WIDTH,
    aspectRatio: 3 / 4,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: DS.gray100,
  },
  petCardImage: {
    width: '100%',
    height: '100%',
  },
  petCardImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.primaryLight,
  },
  petCardFallbackEmoji: {
    fontSize: 46,
  },
  adoptionBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: DS.primary,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  adoptionBadgeText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 10,
    color: '#fff',
  },
  petCardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 32,
    paddingBottom: 12,
  },
  petCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  petCardEmoji: {
    fontSize: 13,
  },
  petCardName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#fff',
    flexShrink: 1,
  },
  petCardMeta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },

  // ─ Actions ─
  thinDivider: {
    height: 0.5,
    backgroundColor: DS.gray100,
    marginHorizontal: 16,
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionCount: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: DS.gray400,
  },

  // ─ Repost ─
  repostLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  repostLabelText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: DS.primary,
  },
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

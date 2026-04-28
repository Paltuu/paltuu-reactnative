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
  Share,
  Modal,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/stores/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { socialApi } from '../../src/api/social';
import client from '../../src/api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MENU_WIDTH = Math.round(SCREEN_WIDTH * 0.82);
const COVER_H = 210;
const AVATAR_SIZE = 96;

// ─── Design tokens ────────────────────────────────────────────────────────────
const DS = {
  primary: '#A03048',
  primaryLight: 'rgba(160,48,72,0.10)',
  bg: '#FDF7F8',
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

// ─── Post Card ────────────────────────────────────────────────────────────────

const PostCard = ({ item, user }: { item: any; user: any }) => {
  const [pawHit, setPawHit] = useState(false);

  const initials = (user?.name || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const mainMedia = item.media?.[0]?.url;

  const handleShare = async () => {
    try {
      await Share.share({ message: item.content || 'Check this out on Paltuu!' });
    } catch {}
  };

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <AvatarCircle uri={user?.profile_image_url} size={40} initials={initials} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.cardName}>{user?.name || 'User'}</Text>
          <Text style={s.cardMeta}>
            @{user?.social_username || user?.username || 'user'} · {formatDate(item.created_at)}
          </Text>
        </View>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="ellipsis-horizontal" size={20} color={DS.gray400} />
        </TouchableOpacity>
      </View>

      {!!item.content && (
        <Text style={[s.cardContent, mainMedia ? {} : { fontSize: 16 }]}>
          {item.content}
        </Text>
      )}

      {mainMedia && (
        <Image
          source={{ uri: mainMedia }}
          style={[s.cardMedia, { backgroundColor: '#FFFFFF' }]}
          resizeMode="cover"
        />
      )}

      <View style={s.thinDivider} />

      <View style={s.actionRow}>
        <TouchableOpacity style={s.actionBtn}>
          <Ionicons name="chatbubble-outline" size={20} color={DS.gray400} />
          <Text style={s.actionCount}>{formatCount(item.comment_count || 0)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn}>
          <Ionicons name="repeat-outline" size={22} color={DS.gray400} />
          <Text style={s.actionCount}>{formatCount(item.repost_count || 0)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={() => setPawHit((v) => !v)}>
          <MaterialCommunityIcons
            name={pawHit ? 'paw' : 'paw-outline'}
            size={22}
            color={pawHit ? DS.primary : DS.gray400}
          />
          <Text style={[s.actionCount, pawHit && { color: DS.primary }]}>
            {formatCount((item.like_count || 0) + (pawHit ? 1 : 0))}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.actionBtn, { marginLeft: 'auto' }]} onPress={handleShare}>
          <Ionicons name="arrow-redo-outline" size={20} color={DS.gray400} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Pet Card ─────────────────────────────────────────────────────────────────

const PetCard = ({ item, user }: { item: any; user: any }) => {
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

      <View style={s.chipRow}>
        <View style={s.chip}>
          <MaterialCommunityIcons name="paw" size={11} color={DS.primary} />
          <Text style={s.chipText}>{item.pet_name}</Text>
        </View>
        {item.pet_breed && (
          <View style={[s.chip, { backgroundColor: DS.gray100 }]}>
            <Text style={[s.chipText, { color: DS.gray500 }]}>{item.pet_breed}</Text>
          </View>
        )}
        {item.age_months != null && (
          <View style={[s.chip, { backgroundColor: DS.gray100 }]}>
            <Text style={[s.chipText, { color: DS.gray500 }]}>
              {item.age_months >= 12 ? `${Math.floor(item.age_months / 12)}y` : `${item.age_months}m`}
            </Text>
          </View>
        )}
      </View>

      {item.main_image && (
        <Image
          source={{ uri: item.main_image }}
          style={[s.cardMedia, { backgroundColor: '#FFFFFF' }]}
          resizeMode="cover"
        />
      )}
    </View>
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
        <Ionicons name="repeat" size={13} color={DS.primary} />
        <Text style={s.repostLabelText}>{user?.name || 'User'} reposted</Text>
      </View>

      <View style={s.repostInset}>
        <Text style={[s.cardContent, { color: DS.dark, paddingHorizontal: 0, marginBottom: 0 }]}>
          {item.content}
        </Text>
      </View>

      <View style={s.thinDivider} />
      <View style={s.actionRow}>
        <TouchableOpacity style={s.actionBtn}>
          <MaterialCommunityIcons name="paw-outline" size={22} color={DS.gray400} />
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
      <MaterialCommunityIcons name={active ? 'paw' : 'paw-outline'} size={24} color={active ? DS.primary : DS.gray400} />
    ),
  },
  {
    key: 'Reposts',
    renderIcon: (active: boolean) => (
      <Ionicons name="repeat" size={24} color={active ? DS.primary : DS.gray400} />
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
    queryFn: () => socialApi.getPets(userId!),
    enabled: !!userId && activeTab === 'Pets',
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
    Pets: petsData?.pets || [],
    Reposts: repostsData?.reposts || [],
  };

  const isTabLoading =
    (activeTab === 'Posts' && isProfileLoading) ||
    (activeTab === 'Pets' && isPetsLoading) ||
    (activeTab === 'Reposts' && isRepostsLoading);

  // ── Menu animation ──────────────────────────────────────────────────────────

  const openMenu = () => {
    setMenuVisible(true);
    Animated.spring(menuSlideX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(menuSlideX, {
      toValue: MENU_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  };

  // ── Image upload ────────────────────────────────────────────────────────────

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
            await uploadImage(result.assets[0], type);
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
            await uploadImage(result.assets[0], type);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset, type: 'profile' | 'cover') => {
    setUploading(type);
    try {
      // Use the real MIME type from the picker so the server can handle HEIC/HEIF correctly.
      // Fall back to image/jpeg only if the picker doesn't report one.
      const mimeType = asset.mimeType || 'image/jpeg';
      const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';

      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
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
      setImageModal(null);
    } catch {
      Alert.alert('Upload failed', 'Please try again.');
    } finally {
      setUploading(null);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: any }) => {
    if (activeTab === 'Posts') return <PostCard item={item} user={profile} />;
    if (activeTab === 'Pets') return <PetCard item={item} user={profile} />;
    return <RepostCard item={item} user={profile} />;
  };

  const currentImageUri =
    imageModal === 'profile' ? profile?.profile_image_url : profile?.cover_photo_url;

  const ListHeader = () => (
    <View style={s.headerWrapper}>
      {/* Top action bar — floats over cover */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={{ width: 40 }} />
        <TouchableOpacity style={s.menuBtn} onPress={openMenu}>
          <Ionicons name="menu" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Cover photo */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setImageModal('cover')}
      >
        <View style={[s.coverWrapper, { height: COVER_H + insets.top }]}>
          {profile?.cover_photo_url ? (
            <Image
              source={{ uri: profile.cover_photo_url }}
              style={[s.coverImage, { backgroundColor: '#FFFFFF' }]}
              resizeMode="cover"
            />
          ) : (
            <View style={s.coverPlaceholder} />
          )}
          <View style={s.coverEditHint}>
            <Ionicons name="camera-outline" size={16} color="rgba(255,255,255,0.85)" />
          </View>
        </View>
      </TouchableOpacity>

      {/* Avatar */}
      <View style={s.avatarCenter}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => setImageModal('profile')}>
          <AvatarCircle
            uri={profile?.profile_image_url}
            size={AVATAR_SIZE}
            initials={initials}
            style={s.avatarBorder}
          />
          <View style={s.avatarEditBadge}>
            <Ionicons name="camera" size={12} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Identity */}
      <Text style={s.displayName}>{profile?.name || 'User'}</Text>
      <Text style={s.usernameText}>
        @{profile?.social_username || profile?.username || 'user'}
      </Text>

      {!!profile?.bio && <Text style={s.bio}>{profile.bio}</Text>}

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.statItem}>
          <Text style={s.statValue}>
            {formatCount(profile?.follower_count || profile?.followers_count || 0)}
          </Text>
          <Text style={s.statLabel}>Followers</Text>
        </View>
        <View style={s.statSep} />
        <View style={s.statItem}>
          <Text style={s.statValue}>
            {formatCount(profile?.following_count || 0)}
          </Text>
          <Text style={s.statLabel}>Following</Text>
        </View>
        <View style={s.statSep} />
        <View style={s.statItem}>
          <Text style={s.statValue}>
            {formatCount(profile?.post_count || profile?.posts_count || 0)}
          </Text>
          <Text style={s.statLabel}>Posts</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={s.btnRow}>
        <TouchableOpacity style={s.btnSecondary}>
          <Text style={s.btnSecondaryText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnSecondary}>
          <Ionicons name="share-social-outline" size={16} color={DS.primary} style={{ marginRight: 6 }} />
          <Text style={s.btnSecondaryText}>Share</Text>
        </TouchableOpacity>
      </View>

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
        data={tabData[activeTab]}
        keyExtractor={(item, idx) =>
          (item.post_id ?? item.pet_id ?? item.id ?? idx).toString()
        }
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={s.postDivider} />}
        ListEmptyComponent={
          <View style={s.emptyState}>
            {isTabLoading ? (
              <ActivityIndicator size="small" color={DS.primary} />
            ) : (
              <>
                <MaterialCommunityIcons name="paw-outline" size={40} color={DS.gray100} />
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
      >
        <Pressable style={s.menuOverlay} onPress={closeMenu}>
          <Animated.View style={[s.menuPanel, { transform: [{ translateX: menuSlideX }] }]}>
            <Pressable onPress={() => {}} style={{ flex: 1 }}>
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
                </View>

                <View style={s.menuDivider} />

                <MenuItem icon="settings-outline" label="Settings" onPress={closeMenu} />
                <MenuItem icon="paw-outline" label="My Adoption Listings" onPress={closeMenu} />
                <MenuItem icon="document-text-outline" label="My Applications" onPress={closeMenu} />

                {/* Account privacy toggle */}
                <View style={s.menuItemRow}>
                  <View style={s.menuItemLeft}>
                    <Ionicons name="lock-closed-outline" size={21} color={DS.dark} />
                    <Text style={s.menuItemText}>Private Account</Text>
                  </View>
                  <Switch
                    value={profile?.is_private ?? false}
                    onValueChange={() => {}}
                    trackColor={{ true: DS.primary, false: DS.gray100 }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={s.menuDivider} />

                <MenuItem icon="help-circle-outline" label="Help" onPress={closeMenu} />
                <MenuItem icon="information-circle-outline" label="About" onPress={closeMenu} />
                <MenuItem icon="shield-outline" label="Privacy Center" onPress={closeMenu} />
                <MenuItem icon="remove-circle-outline" label="Blocked" onPress={closeMenu} />

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
        onRequestClose={() => setImageModal(null)}
      >
        <View style={s.imgModalBg}>
          {/* Header */}
          <View style={[s.imgModalHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={() => setImageModal(null)} style={s.imgModalClose}>
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
                  <Text style={s.imgModalBtnText}>Change Photo</Text>
                </>
              )}
            </TouchableOpacity>
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

  // ─ Top bar (floats over cover) ─
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    zIndex: 10,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─ Cover ─
  coverWrapper: {
    marginHorizontal: 4,
    marginTop: 0,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    backgroundColor: DS.primaryLight,
  },
  coverEditHint: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    padding: 5,
  },

  // ─ Avatar ─
  avatarCenter: {
    alignItems: 'center',
    marginTop: -(AVATAR_SIZE / 2),
    marginBottom: 12,
  },
  avatarBorder: {
    borderWidth: 4,
    borderColor: DS.surface,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: DS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: DS.surface,
  },

  // ─ Identity ─
  displayName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 24,
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
    marginBottom: 12,
  },

  // ─ Stats ─
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 20,
    color: DS.dark,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
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

  // ─ Buttons ─
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  btnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: DS.primary,
  },
  btnSecondaryText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: DS.primary,
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

  // ─ List ─
  postDivider: {
    height: 8,
    backgroundColor: DS.bg,
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
  cardMedia: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: DS.gray100,
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

  // ─ Pet chips ─
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: DS.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: DS.primary,
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
    height: '100%',
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

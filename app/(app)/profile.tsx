import React, { useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { socialApi } from '../../src/api/social';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Design tokens (from DESIGN_SYSTEM.md) ───────────────────────────────────
const DS = {
  primary: '#A03048',
  primaryLight: 'rgba(160,48,72,0.10)',
  bg: '#F2F2F2',
  surface: '#FFFFFF',
  dark: '#111111',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  gray100: '#F3F4F6',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
        backgroundColor: DS.primaryLight,
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
      <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
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
      {/* Header */}
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

      {/* Caption */}
      {!!item.content && (
        <Text style={[s.cardContent, mainMedia ? {} : { fontSize: 16 }]}>
          {item.content}
        </Text>
      )}

      {/* Media */}
      {mainMedia && (
        <Image
          source={{ uri: mainMedia }}
          style={s.cardMedia}
          resizeMode="cover"
        />
      )}

      {/* Divider */}
      <View style={s.thinDivider} />

      {/* Action row */}
      <View style={s.actionRow}>
        {/* Comment */}
        <TouchableOpacity style={s.actionBtn}>
          <Ionicons name="chatbubble-outline" size={20} color={DS.gray400} />
          <Text style={s.actionCount}>{formatCount(item.comment_count || 0)}</Text>
        </TouchableOpacity>

        {/* Repost */}
        <TouchableOpacity style={s.actionBtn}>
          <Ionicons name="repeat-outline" size={22} color={DS.gray400} />
          <Text style={s.actionCount}>{formatCount(item.repost_count || 0)}</Text>
        </TouchableOpacity>

        {/* Paw */}
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

        {/* Share — pushed to far right */}
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

      {/* Pet info chips */}
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
        <Image source={{ uri: item.main_image }} style={s.cardMedia} resizeMode="cover" />
      )}
    </View>
  );
};

// ─── Repost Card ─────────────────────────────────────────────────────────────

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

      {/* Repost label */}
      <View style={s.repostLabel}>
        <Ionicons name="repeat" size={13} color={DS.primary} />
        <Text style={s.repostLabelText}>{user?.name || 'User'} reposted</Text>
      </View>

      {/* Content inset */}
      <View style={s.repostInset}>
        <Text style={[s.cardContent, { color: DS.dark }]}>{item.content}</Text>
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

// ─── Tab icon components ──────────────────────────────────────────────────────

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
  const [activeTab, setActiveTab] = useState<TabKey>('Posts');

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

  const renderItem = ({ item }: { item: any }) => {
    if (activeTab === 'Posts') return <PostCard item={item} user={profile} />;
    if (activeTab === 'Pets') return <PetCard item={item} user={profile} />;
    return <RepostCard item={item} user={profile} />;
  };

  const ListHeader = () => (
    <View style={s.headerWrapper}>
      {/* ── Top action bar ─────────────────────────────────────── */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.iconBtn}>
          <Ionicons name="settings-outline" size={22} color={DS.dark} />
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color={DS.gray500} />
        </TouchableOpacity>
      </View>

      {/* ── Cover photo ────────────────────────────────────────── */}
      {profile?.cover_photo_url ? (
        <View style={s.coverWrapper}>
          <Image
            source={{ uri: profile.cover_photo_url }}
            style={s.coverImage}
            resizeMode="cover"
          />
        </View>
      ) : (
        <View style={s.coverWrapper}>
          <View style={s.coverPlaceholder} />
        </View>
      )}

      {/* ── Avatar (centered, overlapping cover) ─────────────── */}
      <View style={s.avatarCenter}>
        <AvatarCircle
          uri={profile?.profile_image_url}
          size={96}
          initials={initials}
          style={s.avatarBorder}
        />
      </View>

      {/* ── Name & username ────────────────────────────────────── */}
      <Text style={s.displayName}>{profile?.name || 'User'}</Text>
      <Text style={s.usernameText}>
        @{profile?.social_username || profile?.username || 'user'}
      </Text>

      {/* ── Bio ────────────────────────────────────────────────── */}
      {!!profile?.bio && <Text style={s.bio}>{profile.bio}</Text>}

      {/* ── Stats row ──────────────────────────────────────────── */}
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

      {/* ── Action buttons ─────────────────────────────────────── */}
      <View style={s.btnRow}>
        <TouchableOpacity style={s.btnSecondary}>
          <Text style={s.btnSecondaryText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnSecondary}>
          <Ionicons name="share-social-outline" size={16} color={DS.primary} style={{ marginRight: 6 }} />
          <Text style={s.btnSecondaryText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* ── Icon-only tab bar ──────────────────────────────────── */}
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

  if (isProfileLoading) {
    return (
      <View style={[s.screen, s.loadingCenter]}>
        <ActivityIndicator size="large" color={DS.primary} />
      </View>
    );
  }

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
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const COVER_H = 140;
const AVATAR_SIZE = 96;
const AVATAR_LIFT = AVATAR_SIZE / 2 + 8; // how much avatar pokes above cover bottom

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DS.bg,
  },
  loadingCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─ Header wrapper (white surface) ─
  headerWrapper: {
    backgroundColor: DS.surface,
    marginBottom: 4,
  },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─ Cover ─
  coverWrapper: {
    marginHorizontal: 16,
    marginTop: 64, // clears the top bar with extra space
    marginBottom: 8, // space below cover
    borderRadius: 16,
    overflow: 'hidden',
    height: COVER_H,
    backgroundColor: DS.gray100,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    backgroundColor: DS.primaryLight,
  },

  // ─ Avatar (sits below cover, centered) ─
  avatarCenter: {
    alignItems: 'center',
    marginTop: -(AVATAR_SIZE / 2),
    marginBottom: 12,
  },
  avatarBorder: {
    borderWidth: 4,
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

  // ─ Tab bar (icon only) ─
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

  // ─ Post divider (Instagram-style gap) ─
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
});
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  StyleSheet,
  Dimensions,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 200;
const AVATAR_SIZE = 88;
const AVATAR_OVERLAP = AVATAR_SIZE / 2;

// ─── Mock data (replace with API calls) ──────────────────────────────────────

const MOCK_USER = {
  name: 'Sara Ahmed',
  username: '@sara.paltuu',
  bio: 'Dog mom 🐾 • Rescue advocate • Lahore 🇵🇰',
  follower_count: 1240,
  following_count: 318,
  post_count: 47,
  profile_image_url: null,   // replace with user?.profile_image_url
  cover_photo_url: null,     // replace with user?.cover_photo_url
};

const MOCK_POSTS = Array.from({ length: 8 }, (_, i) => ({
  id: `post-${i}`,
  type: 'post',
  content: i % 3 === 0
    ? 'Just rescued this little one from the streets of DHA. He needed a home and we needed him 🐶❤️'
    : i % 3 === 1
      ? 'Reminder: monsoon season is dangerous for strays. Please put out water and shelter if you can. Small acts matter.'
      : 'Took Mochi to the vet today for his annual checkup — clean bill of health! 🐾 Dr. Raza at PetCare Clinic is amazing.',
  image_url: null,
  time: `${i + 1}h`,
  likes: Math.floor(Math.random() * 120) + 5,
  comments: Math.floor(Math.random() * 30),
  reposts: Math.floor(Math.random() * 15),
}));

const MOCK_PETS = Array.from({ length: 4 }, (_, i) => ({
  id: `pet-${i}`,
  type: 'pet',
  name: ['Mochi', 'Luna', 'Bruno', 'Cleo'][i],
  breed: ['Golden Retriever', 'Persian Cat', 'Labrador', 'Husky'][i],
  age: ['2 yrs', '4 yrs', '1 yr', '3 yrs'][i],
  content: `Meet ${['Mochi', 'Luna', 'Bruno', 'Cleo'][i]}! ${['Loves belly rubs and hates bath time 😂', 'Queen of the house and she knows it 👑', 'Still a puppy at heart, absolute chaos mode 24/7', 'Escape artist extraordinaire. We\'ve given up.'][i]}`,
  image_url: null,
  time: `${(i + 1) * 2}d`,
  likes: Math.floor(Math.random() * 200) + 20,
  comments: Math.floor(Math.random() * 40),
}));

const MOCK_REPOSTS = Array.from({ length: 5 }, (_, i) => ({
  id: `repost-${i}`,
  type: 'repost',
  original_author: ['Paltuu Official', 'Dr. Ayesha Vet', 'Rescue Karachi', 'PetCare PK', 'Furry Friends'][i],
  original_username: ['@paltuu', '@dr.ayesha', '@rescuekhi', '@petcarepk', '@furryfriendspk'][i],
  original_avatar: null,
  content: [
    'Adoption drives this weekend at Packages Mall, Lahore! Come meet 30+ animals looking for forever homes 🏠',
    'Reminder: cats should NOT be given cow milk. It causes digestive issues. Fresh water only!',
    '12 dogs rescued from an abandoned factory in SITE area. All need medical attention. DM to help.',
    'New branch opening in Gulshan-e-Iqbal this Friday. 20% off all vaccines launch week! 💉',
    'Heart-warming: 84-year-old dada ji adopted a senior dog. They found each other 🥺',
  ][i],
  time: `${i + 1}d`,
  likes: Math.floor(Math.random() * 300) + 50,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const Avatar = ({
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
        backgroundColor: '#F3E0E4',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      },
      style,
    ]}
  >
    {uri ? (
      <Image source={{ uri }} style={{ width: size, height: size }} />
    ) : (
      <Text style={{ fontSize: size * 0.35, fontFamily: 'Montserrat_700Bold', color: '#a03048' }}>
        {initials}
      </Text>
    )}
  </View>
);

// Twitter-style post card
const PostCard = ({ item, user }: { item: any; user: any }) => {
  const initials = (user?.name || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.card}>
      <Avatar uri={user?.profile_image_url} size={42} initials={initials} style={styles.cardAvatar} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{user?.name || MOCK_USER.name}</Text>
          <Text style={styles.cardUsername}>{MOCK_USER.username}</Text>
          <Text style={styles.cardDot}>·</Text>
          <Text style={styles.cardTime}>{item.time}</Text>
        </View>
        <Text style={styles.cardContent}>{item.content}</Text>
        {item.image_url && (
          <Image
            source={{ uri: item.image_url }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.cardAction}>
            <Ionicons name="chatbubble-outline" size={16} color="#9CA3AF" />
            <Text style={styles.cardActionText}>{item.comments}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardAction}>
            <Ionicons name="repeat-outline" size={16} color="#9CA3AF" />
            <Text style={styles.cardActionText}>{item.reposts}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardAction}>
            <Ionicons name="heart-outline" size={16} color="#9CA3AF" />
            <Text style={styles.cardActionText}>{item.likes}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Pet card — slightly richer with breed/age badge
const PetCard = ({ item, user }: { item: any; user: any }) => {
  const initials = (user?.name || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.card}>
      <Avatar uri={user?.profile_image_url} size={42} initials={initials} style={styles.cardAvatar} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{user?.name || MOCK_USER.name}</Text>
          <Text style={styles.cardUsername}>{MOCK_USER.username}</Text>
          <Text style={styles.cardDot}>·</Text>
          <Text style={styles.cardTime}>{item.time}</Text>
        </View>
        {/* Pet badge */}
        <View style={styles.petBadgeRow}>
          <View style={styles.petBadge}>
            <Ionicons name="paw" size={11} color="#a03048" />
            <Text style={styles.petBadgeText}>{item.name}</Text>
          </View>
          <View style={[styles.petBadge, { backgroundColor: '#F5F5F5' }]}>
            <Text style={[styles.petBadgeText, { color: '#6B7280' }]}>{item.breed}</Text>
          </View>
          <View style={[styles.petBadge, { backgroundColor: '#F5F5F5' }]}>
            <Text style={[styles.petBadgeText, { color: '#6B7280' }]}>{item.age}</Text>
          </View>
        </View>
        <Text style={styles.cardContent}>{item.content}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.cardAction}>
            <Ionicons name="chatbubble-outline" size={16} color="#9CA3AF" />
            <Text style={styles.cardActionText}>{item.comments}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardAction}>
            <Ionicons name="heart-outline" size={16} color="#9CA3AF" />
            <Text style={styles.cardActionText}>{item.likes}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Repost card — shows original author inline
const RepostCard = ({ item, user }: { item: any; user: any }) => {
  const initials = (user?.name || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const origInitials = item.original_author
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.card}>
      <Avatar uri={user?.profile_image_url} size={42} initials={initials} style={styles.cardAvatar} />
      <View style={styles.cardBody}>
        {/* Repost label */}
        <View style={styles.repostLabel}>
          <Ionicons name="repeat" size={13} color="#a03048" />
          <Text style={styles.repostLabelText}>{user?.name || MOCK_USER.name} reposted</Text>
        </View>
        {/* Original post inset */}
        <View style={styles.repostInset}>
          <View style={styles.repostInsetHeader}>
            <Avatar uri={item.original_avatar} size={28} initials={origInitials} />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.cardName}>{item.original_author}</Text>
              <Text style={[styles.cardUsername, { fontSize: 11 }]}>{item.original_username}</Text>
            </View>
            <Text style={[styles.cardTime, { marginLeft: 'auto' }]}>{item.time}</Text>
          </View>
          <Text style={[styles.cardContent, { marginTop: 8, color: '#374151' }]}>{item.content}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.cardAction}>
            <Ionicons name="heart-outline" size={16} color="#9CA3AF" />
            <Text style={styles.cardActionText}>{item.likes}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const TABS = ['Posts', 'Pets', 'Reposts'] as const;
type TabType = typeof TABS[number];

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('Posts');
  const scrollY = useRef(new Animated.Value(0)).current;

  // Use real user data with mock fallback
  const profile = {
    name: user?.name || MOCK_USER.name,
    username: (user as any)?.username || MOCK_USER.username,
    bio: (user as any)?.bio || MOCK_USER.bio,
    follower_count: (user as any)?.follower_count ?? MOCK_USER.follower_count,
    following_count: (user as any)?.following_count ?? MOCK_USER.following_count,
    post_count: (user as any)?.post_count ?? MOCK_USER.post_count,
    profile_image_url: user?.profile_image_url || null,
    cover_photo_url: (user as any)?.cover_photo_url || null,
  };

  const initials = profile.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Cover parallax
  const coverTranslate = scrollY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [50, 0, -30],
    extrapolate: 'clamp',
  });

  const tabData: Record<TabType, any[]> = {
    Posts: MOCK_POSTS,
    Pets: MOCK_PETS,
    Reposts: MOCK_REPOSTS,
  };

  const renderItem = ({ item }: { item: any }) => {
    if (activeTab === 'Posts') return <PostCard item={item} user={user} />;
    if (activeTab === 'Pets') return <PetCard item={item} user={user} />;
    return <RepostCard item={item} user={user} />;
  };

  const ListHeader = () => (
    <View>
      {/* ── Cover photo ─────────────────────────────────────────────────── */}
      <View style={{ height: COVER_HEIGHT, overflow: 'hidden' }}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ translateY: coverTranslate }] },
          ]}
        >
          {profile.cover_photo_url ? (
            <Image
              source={{ uri: profile.cover_photo_url }}
              style={{ width: '100%', height: COVER_HEIGHT + 60 }}
              resizeMode="cover"
            />
          ) : (
            // Placeholder gradient-style cover
            <View style={styles.coverPlaceholder}>
              <View style={styles.coverGradientLayer1} />
              <View style={styles.coverGradientLayer2} />
              {/* Decorative paw prints */}
              <Text style={styles.coverDecor}>🐾 🐾 🐾</Text>
            </View>
          )}
        </Animated.View>

        {/* Top action bar — settings + logout float over cover */}
        <View style={[styles.coverActions, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.coverActionBtn}
            onPress={logout}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.coverActionBtn}>
            <Ionicons name="settings-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Avatar row — overlapping the cover bottom edge ───────────────── */}
      <View style={styles.avatarRow}>
        <View style={styles.avatarWrapper}>
          <Avatar
            uri={profile.profile_image_url}
            size={AVATAR_SIZE}
            initials={initials}
            style={styles.avatar}
          />
          {/* Online dot */}
          <View style={styles.onlineDot} />
        </View>
        {/* Edit button floats on the right at the same level */}
        <TouchableOpacity style={styles.editBtn}>
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* ── Identity ─────────────────────────────────────────────────────── */}
      <View style={styles.identity}>
        <Text style={styles.displayName}>{profile.name}</Text>
        <Text style={styles.username}>{profile.username}</Text>
        {!!profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
      </View>

      {/* ── Stats row ────────────────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statItem}>
          <Text style={styles.statValue}>{formatCount(profile.follower_count)}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem}>
          <Text style={styles.statValue}>{formatCount(profile.following_count)}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatCount(profile.post_count)}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
      </View>

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab}
            </Text>
            {activeTab === tab && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={tabData[activeTab]}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="paw-outline" size={40} color="#E5E7EB" />
            <Text style={styles.emptyText}>Nothing here yet</Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  // ── Cover ──
  coverPlaceholder: {
    width: '100%',
    height: COVER_HEIGHT + 60,
    backgroundColor: '#1a0a0f',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverGradientLayer1: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#a03048',
    opacity: 0.85,
  },
  coverGradientLayer2: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2d0a16',
    opacity: 0.5,
    // Diagonal slash effect
    transform: [{ skewY: '-8deg' }, { translateY: 40 }],
  },
  coverDecor: {
    fontSize: 32,
    opacity: 0.15,
    letterSpacing: 12,
  },
  coverActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  coverActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Avatar row ──
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: -AVATAR_OVERLAP,
    marginBottom: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    borderWidth: 4,
    borderColor: '#FAFAFA',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FAFAFA',
  },
  editBtn: {
    height: 36,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#a03048',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  editBtnText: {
    fontSize: 13,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#a03048',
    letterSpacing: 0.2,
  },

  // ── Identity ──
  identity: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  displayName: {
    fontSize: 20,
    fontFamily: 'Montserrat_700Bold',
    color: '#111827',
    letterSpacing: -0.3,
  },
  username: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#374151',
    lineHeight: 20,
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    color: '#111827',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: '#9CA3AF',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },

  // ── Tab bar ──
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
    color: '#9CA3AF',
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: '#a03048',
    fontFamily: 'Montserrat_600SemiBold',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2.5,
    backgroundColor: '#a03048',
    borderRadius: 2,
  },

  // ── Post / Feed cards ──
  card: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardAvatar: {
    marginRight: 12,
    marginTop: 2,
  },
  cardBody: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 6,
    gap: 3,
  },
  cardName: {
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#111827',
  },
  cardUsername: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#9CA3AF',
  },
  cardDot: {
    fontSize: 13,
    color: '#D1D5DB',
  },
  cardTime: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#9CA3AF',
  },
  cardContent: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#1F2937',
    lineHeight: 21,
  },
  cardImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 10,
    backgroundColor: '#F3F4F6',
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 20,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardActionText: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#9CA3AF',
  },

  // ── Pet card extras ──
  petBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  petBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FDF2F4',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  petBadgeText: {
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
    color: '#a03048',
  },

  // ── Repost card extras ──
  repostLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  repostLabelText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: '#a03048',
  },
  repostInset: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 12,
    marginBottom: 4,
  },
  repostInsetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ── Empty state ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#D1D5DB',
  },
});
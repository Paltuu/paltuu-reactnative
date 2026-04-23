// index.tsx — card-style feed
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, Dimensions, Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { HEADER_HEIGHT } from '../../src/components/common/MainHeader';
import { useHeaderContext } from '../../src/context/HeaderContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const PRIMARY = '#A03048';
const MUTED = '#C4C4C4';
const CARD_W = width - 32; // 16px margin each side
const CARD_RADIUS = 20;

/* ── Mock data ── */
const MOCK_POSTS = [
  {
    post_id: 1,
    user: { name: 'Ayesha Khan', profile_image_url: null },
    pet: { pet_name: 'Milo', pet_type: 'cat' },
    post_type: 'image',
    content: 'Milo finally learned to sit on command 🐾 Took us three weeks but we did it!',
    media: [{ url: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800', media_type: 'image' }],
    like_count: 42, comment_count: 7, created_at: '2h ago',
    liked: false, liked_by: ['Sara', 'Hamza'],
  },
  {
    post_id: 2,
    user: { name: 'Ahmed Raza', profile_image_url: null },
    pet: null, post_type: 'text',
    content: 'Can anyone recommend a good vet in DHA Phase 6 for a senior dog? Need someone experienced with joint issues. Thanks in advance! 🙏',
    media: [], like_count: 18, comment_count: 12,
    created_at: '4h ago', liked: true, liked_by: ['Zara'],
  },
  {
    post_id: 3,
    user: { name: 'Sara Ali', profile_image_url: null },
    pet: { pet_name: 'Bruno', pet_type: 'dog' }, post_type: 'image',
    content: "Bruno's first day at the beach! Scared of waves at first — now he won't leave 😂",
    media: [
      { url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800', media_type: 'image' },
      { url: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=800', media_type: 'image' },
      { url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800', media_type: 'image' },
    ],
    like_count: 156, comment_count: 23, created_at: '6h ago',
    liked: false, liked_by: ['Ayesha', 'Hamza'],
  },
  {
    post_id: 4,
    user: { name: 'Paltuu Rescues', profile_image_url: null },
    pet: { pet_name: 'Luna', pet_type: 'cat' }, post_type: 'image',
    content: 'Luna was found abandoned near Boat Basin. After 2 weeks of care she is healthy and ready for her forever home.',
    media: [{ url: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=800', media_type: 'image' }],
    like_count: 312, comment_count: 45, created_at: '8h ago',
    liked: false, liked_by: ['Sara', 'Ahmed'], badge: 'rescue',
  },
  {
    post_id: 5,
    user: { name: 'Umer Noor', profile_image_url: null },
    pet: { pet_name: 'Simba', pet_type: 'cat' }, post_type: 'image',
    content: 'One month since we adopted Simba through Paltuu. Best decision we ever made ❤️',
    media: [{ url: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=800', media_type: 'image' }],
    like_count: 89, comment_count: 14, created_at: '12h ago',
    liked: false, liked_by: ['Ayesha'], badge: 'adoption_journey',
  },
];

const MOCK_LOST: any = {
  post_id: 'lf1', pet_name: 'Rocky', breed: 'German Shepherd',
  gender: 'Male', age: '3y', area: 'DHA Phase 5', time: '3h ago',
  image: 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=400',
};

/* ── Avatar ── */
const Avatar = ({ name, uri, size = 36 }: { name: string; uri?: string | null; size?: number }) => {
  const initials = (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#fdf0f2', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.34, fontWeight: '700', color: PRIMARY }}>{initials}</Text>
    </View>
  );
};

/* ── Pet chip ── */
const PetChip = ({ name }: { name: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fdf0f2', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2, gap: 3 }}>
    <Ionicons name="paw" size={9} color={PRIMARY} />
    <Text style={{ fontSize: 11, color: PRIMARY, fontWeight: '600' }}>{name}</Text>
  </View>
);

/* ── Badge ── */
const PostBadge = ({ type }: { type: string }) => {
  const map: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    rescue: { label: 'Rescue Story', color: '#dc2626', bg: '#fef2f2', icon: 'medkit-outline' },
    adoption_journey: { label: 'Adoption Journey', color: PRIMARY, bg: '#fdf0f2', icon: 'heart-outline' },
  };
  const c = map[type];
  if (!c) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.bg, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 10 }}>
      <Ionicons name={c.icon} size={11} color={c.color} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: c.color }}>{c.label}</Text>
    </View>
  );
};

/* ── Media — fills card width, rounded bottom corners only ── */
const MediaBlock = ({ media }: { media: any[] }) => {
  if (!media?.length) return null;
  const imgH = Math.round(CARD_W * 0.72);
  const bottomRadius = { borderBottomLeftRadius: CARD_RADIUS, borderBottomRightRadius: CARD_RADIUS };

  if (media.length === 1) {
    return (
      <Image
        source={{ uri: media[0].url }}
        style={{ width: CARD_W, height: imgH, ...bottomRadius }}
        contentFit="cover"
      />
    );
  }

  if (media.length === 2) {
    const half = Math.floor((CARD_W - 2) / 2);
    return (
      <View style={{ flexDirection: 'row', gap: 2, overflow: 'hidden', ...bottomRadius }}>
        <Image source={{ uri: media[0].url }} style={{ width: half, height: imgH }} contentFit="cover" />
        <Image source={{ uri: media[1].url }} style={{ width: half, height: imgH }} contentFit="cover" />
      </View>
    );
  }

  // 3+ — big left, stacked right
  const bigW = Math.floor(CARD_W * 0.62);
  const smallW = CARD_W - bigW - 2;
  const smallH = Math.floor((imgH - 2) / 2);
  return (
    <View style={{ flexDirection: 'row', gap: 2, height: imgH, overflow: 'hidden', ...bottomRadius }}>
      <Image source={{ uri: media[0].url }} style={{ width: bigW, height: imgH }} contentFit="cover" />
      <View style={{ gap: 2 }}>
        <Image source={{ uri: media[1].url }} style={{ width: smallW, height: smallH }} contentFit="cover" />
        <View style={{ width: smallW, height: smallH, overflow: 'hidden' }}>
          <Image source={{ uri: media[2].url }} style={{ width: smallW, height: smallH }} contentFit="cover" />
          {media.length > 3 && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>+{media.length - 3}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

/* ── Likes preview ── */
const LikesRow = ({ count, names }: { count: number; names?: string[] }) => {
  if (!count) return null;
  const colors = [PRIMARY, '#7c3aed', '#059669'];
  const show = (names || []).slice(0, 3);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 2 }}>
      <View style={{ flexDirection: 'row' }}>
        {show.map((n, i) => (
          <View key={i} style={{ width: 17, height: 17, borderRadius: 9, backgroundColor: colors[i % colors.length], borderWidth: 1.5, borderColor: '#fff', marginLeft: i === 0 ? 0 : -5, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 7, color: '#fff', fontWeight: '800' }}>{n[0]}</Text>
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
        {show[0] && <Text style={{ fontWeight: '700', color: '#374151' }}>{show[0]} </Text>}
        {count > 1 ? `and ${count - 1} others` : ''}
      </Text>
    </View>
  );
};

/* ── Post card ── */
const PostCard = ({ post }: { post: any }) => {
  const [liked, setLiked] = useState(post.liked);
  const [count, setCount] = useState(post.like_count);
  const isText = !post.media?.length;

  const toggleLike = () => {
    setLiked((p: boolean) => !p);
    setCount((p: number) => liked ? p - 1 : p + 1);
  };

  return (
    <View style={{
      width: CARD_W,
      marginHorizontal: 16,
      backgroundColor: '#fff',
      borderRadius: CARD_RADIUS,
      // subtle shadow for card lift
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
      overflow: 'hidden',
    }}>

      {/* ── Header ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 13, paddingBottom: 10, gap: 10 }}>
        <Pressable>
          <Avatar name={post.user.name} uri={post.user.profile_image_url} />
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#111', letterSpacing: -0.2 }}>
              {post.user.name}
            </Text>
            {post.pet && <PetChip name={post.pet.pet_name} />}
          </View>
          <Text style={{ fontSize: 11, color: '#B8B8B8' }}>{post.created_at}</Text>
        </View>
        <TouchableOpacity hitSlop={10}>
          <Ionicons name="ellipsis-horizontal" size={18} color={MUTED} />
        </TouchableOpacity>
      </View>

      {/* ── Caption — always first, always readable ── */}
      <View style={{ paddingHorizontal: 14, paddingBottom: isText ? 16 : 12 }}>
        {post.badge && <PostBadge type={post.badge} />}
        <Text style={{
          fontSize: isText ? 16 : 14,
          lineHeight: isText ? 26 : 22,
          color: '#1a1a1a',
          letterSpacing: -0.1,
        }}>
          {post.content}
        </Text>
      </View>

      {/* ── Media — hugs bottom of card ── */}
      <MediaBlock media={post.media} />

      {/* ── Likes preview ── */}
      {!isText && <LikesRow count={count} names={post.liked_by} />}

      {/* ── Actions ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14,
        paddingTop: isText ? 4 : 8,
        paddingBottom: 13,
        gap: 16,
      }}>
        <TouchableOpacity onPress={toggleLike} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} hitSlop={10}>
          <Ionicons name={liked ? 'paw' : 'paw-outline'} size={21} color={liked ? PRIMARY : MUTED} />
          {count > 0 && <Text style={{ fontSize: 13, fontWeight: '600', color: liked ? PRIMARY : '#9CA3AF' }}>{count}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} hitSlop={10}>
          <Ionicons name="chatbubble-outline" size={19} color={MUTED} />
          {post.comment_count > 0 && <Text style={{ fontSize: 13, fontWeight: '600', color: '#9CA3AF' }}>{post.comment_count}</Text>}
        </TouchableOpacity>
        <TouchableOpacity hitSlop={10}>
          <Ionicons name="arrow-redo-outline" size={19} color={MUTED} />
        </TouchableOpacity>
        <TouchableOpacity style={{ marginLeft: 'auto' }} hitSlop={10}>
          <Ionicons name="bookmark-outline" size={19} color={MUTED} />
        </TouchableOpacity>
      </View>

    </View>
  );
};

/* ── Lost & found — also a card ── */
const LostCard = ({ item }: { item: any }) => (
  <View style={{
    width: CARD_W, marginHorizontal: 16,
    backgroundColor: '#fff', borderRadius: CARD_RADIUS,
    borderLeftWidth: 3, borderLeftColor: '#F59E0B',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    paddingHorizontal: 16, paddingVertical: 14,
    overflow: 'hidden',
  }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <View style={{ backgroundColor: '#FFFBEB', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#B45309' }}>Lost pet nearby</Text>
      </View>
      <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{item.area}</Text>
      <Text style={{ fontSize: 11, color: MUTED, marginLeft: 'auto' }}>{item.time}</Text>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
      <Image source={{ uri: item.image }} style={{ width: 58, height: 58, borderRadius: 12 }} contentFit="cover" />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>{item.pet_name}</Text>
        <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{item.breed} · {item.gender} · {item.age}</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: PRIMARY, marginTop: 5 }}>Contact owner →</Text>
      </View>
    </View>
  </View>
);

/* ── Screen ── */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { onScroll } = useHeaderContext();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const feedData: any[] = [];
  MOCK_POSTS.forEach((post, i) => {
    feedData.push({ type: 'post', data: post });
    if (i === 1) feedData.push({ type: 'lost', data: MOCK_LOST });
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#F2F2F2' }}>
      <FlatList
        data={feedData}
        renderItem={({ item }) =>
          item.type === 'lost'
            ? <LostCard item={item.data} />
            : <PostCard post={item.data} />
        }
        keyExtractor={(item) => `${item.type}-${item.data.post_id}`}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: HEADER_HEIGHT + insets.top + 8,
          paddingBottom: 100,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
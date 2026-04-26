// index.tsx — card-style feed with Mock Data
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
import { CommentsBottomSheet } from '../../src/components/social/CommentsBottomSheet';

const { width } = Dimensions.get('window');
const PRIMARY = '#A03048';
const MUTED = '#C4C4C4';
const CARD_W = width - 32; // 16px margin each side
const CARD_RADIUS = 20;

/* ── Mock data ── */
const MOCK_POSTS = [
  {
    post_id: 'm1',
    author_name: 'Ayesha Khan',
    author_image: null,
    pet_name: 'Milo',
    post_type: 'image',
    content: 'Milo finally learned to sit on command 🐾 Took us three weeks but we did it!',
    media: [{ url: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800', media_type: 'image' }],
    like_count: 42, comment_count: 7, created_at: '2024-04-26T10:00:00Z',
    is_liked: false,
  },
  {
    post_id: 'm2',
    author_name: 'Ahmed Raza',
    author_image: null,
    pet_name: null,
    post_type: 'text',
    content: 'Can anyone recommend a good vet in DHA Phase 6 for a senior dog? Need someone experienced with joint issues. Thanks in advance! 🙏',
    media: [],
    like_count: 18, comment_count: 12, created_at: '2024-04-26T08:00:00Z',
    is_liked: true,
  },
  {
    post_id: 'm3',
    author_name: 'Sara Ali',
    author_image: null,
    pet_name: 'Bruno',
    post_type: 'image',
    content: "Bruno's first day at the beach! Scared of waves at first — now he won't leave 😂",
    media: [
      { url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800', media_type: 'image' },
      { url: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=800', media_type: 'image' },
    ],
    like_count: 156, comment_count: 23, created_at: '2024-04-26T06:00:00Z',
    is_liked: false,
  }
];

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

/* ── Media ── */
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

  const bigW = Math.floor(CARD_W * 0.62);
  const smallW = CARD_W - bigW - 2;
  const smallH = Math.floor((imgH - 2) / 2);
  return (
    <View style={{ flexDirection: 'row', gap: 2, height: imgH, overflow: 'hidden', ...bottomRadius }}>
      <Image source={{ uri: media[0].url }} style={{ width: bigW, height: imgH }} contentFit="cover" />
      <View style={{ gap: 2 }}>
        <Image source={{ uri: media[1].url }} style={{ width: smallW, height: smallH }} contentFit="cover" />
      </View>
    </View>
  );
};

/* ── Post card ── */
const PostCard = ({ post, onCommentPress }: { post: any; onCommentPress: () => void }) => {
  const [liked, setLiked] = useState(post.is_liked);
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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
      overflow: 'hidden',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 13, paddingBottom: 10, gap: 10 }}>
        <Pressable>
          <Avatar name={post.author_name} uri={post.author_image} />
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#111', letterSpacing: -0.2 }}>
              {post.author_name}
            </Text>
            {post.pet_name && <PetChip name={post.pet_name} />}
          </View>
          <Text style={{ fontSize: 11, color: '#B8B8B8' }}>{post.created_at ? '2h ago' : 'now'}</Text>
        </View>
        <TouchableOpacity hitSlop={10}>
          <Ionicons name="ellipsis-horizontal" size={18} color={MUTED} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 14, paddingBottom: isText ? 16 : 12 }}>
        <Text style={{
          fontSize: isText ? 16 : 14,
          lineHeight: isText ? 26 : 22,
          color: '#1a1a1a',
          letterSpacing: -0.1,
        }}>
          {post.content}
        </Text>
      </View>

      <MediaBlock media={post.media} />

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
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} 
          hitSlop={10}
          onPress={onCommentPress}
        >
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

/* ── Screen ── */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { onScroll } = useHeaderContext();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | number | null>(null);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const openComments = (postId: string | number) => {
    setSelectedPostId(postId);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F2F2F2' }}>
      <FlatList
        data={MOCK_POSTS}
        renderItem={({ item }) => (
          <PostCard post={item} onCommentPress={() => openComments(item.post_id)} />
        )}
        keyExtractor={(item) => item.post_id}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: HEADER_HEIGHT + insets.top + 8,
          paddingBottom: 100,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
        }
        showsVerticalScrollIndicator={false}
      />
      <CommentsBottomSheet 
        visible={!!selectedPostId} 
        postId={selectedPostId}
        onClose={() => setSelectedPostId(null)} 
      />
    </View>
  );
}
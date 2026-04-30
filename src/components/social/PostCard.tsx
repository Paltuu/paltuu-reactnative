import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity,
  Dimensions, Pressable, ActivityIndicator,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi, SocialPost } from '../../api/social';
import { useAuthStore } from '../../stores/authStore';

const { width } = Dimensions.get('window');

// Shared layout constants
export const H_PAD = 16;
export const AVATAR_SIZE = 42;
export const COL_GAP = 14;
export const CONTENT_W = width - H_PAD - AVATAR_SIZE - COL_GAP - 16;

/* ── Helpers ── */
const stripHtml = (s: string) =>
  (s ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

const formatTime = (dateStr: string) => {
  try {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return new Date(dateStr).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
  } catch { return ''; }
};

/* ── Avatar column ── */
export const AvatarCol = ({
  name, uri, onPlusPress,
}: {
  name: string; uri?: string | null; onPlusPress?: () => void;
}) => {
  const initials = (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const palettes = [
    { bg: '#fdf0f2', fg: '#A03048' },
    { bg: '#f0fdf4', fg: '#059669' },
    { bg: '#f5f3ff', fg: '#7c3aed' },
    { bg: '#f0f9ff', fg: '#0ea5e9' },
  ];
  const p = palettes[(name || 'U').charCodeAt(0) % 4];

  return (
    <View style={{ width: AVATAR_SIZE, alignItems: 'center' }}>
      <View className="relative">
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }}
            contentFit="cover"
          />
        ) : (
          <View style={{
            width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
            backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: AVATAR_SIZE * 0.33, fontWeight: '700', color: p.fg }}>
              {initials}
            </Text>
          </View>
        )}

        {onPlusPress && (
          <TouchableOpacity
            onPress={onPlusPress}
            activeOpacity={0.8}
            className="absolute -bottom-1 -right-1 w-5 h-5 bg-black rounded-full items-center justify-center border-2 border-white"
          >
            <Ionicons name="add" size={14} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Vertical thread line */}
      <View style={{ flex: 1, width: 2, backgroundColor: '#F3F4F6', marginTop: 8, borderRadius: 1 }} />
    </View>
  );
};

/* ── Pet chip ── */
export const PetChip = ({ name }: { name: string }) => (
  <View className="flex-row items-center bg-primarySoft rounded-full px-[7px] py-0.5 gap-[3px]">
    <Ionicons name="paw" size={9} color="#A03048" />
    <Text className="text-[11px] text-primary font-semibold">{name}</Text>
  </View>
);

/* ── Media block (Threads-style peeking carousel) ── */
export const MediaBlock = ({
  media, onImagePress,
}: {
  media: any[];
  onImagePress?: (index: number) => void;
}) => {
  if (!media?.length) return null;

  // Dynamic aspect ratio based on count
  const peekWidth = 140;
  const cardWidth = CONTENT_W - peekWidth;
  const isSingle = media.length === 1;

  const imgH = isSingle
    ? Math.round(CONTENT_W)
    : Math.round(cardWidth * 1.125);
  const gap = 10;

  if (isSingle) {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onImagePress?.(0)}
        style={{ marginTop: 12 }}
      >
        <Image
          source={{ uri: media[0].url }}
          style={{ width: CONTENT_W, height: imgH, borderRadius: 12 }}
          contentFit="cover"
          transition={200}
        />
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ marginTop: 12 }}>
      <FlatList
        data={media}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + gap}
        decelerationRate="fast"
        pagingEnabled={false}
        contentContainerStyle={{ gap }}
        style={{ height: imgH }}   // ← this is what's missing
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onImagePress?.(index)}
          >
            <Image
              source={{ uri: item.url }}
              style={{ width: cardWidth, height: imgH, borderRadius: 12 }}
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

/* ── Action bar ── */
export const ActionBar = ({
  liked, likeCount, commentCount, onLike, onComment,
}: {
  liked: boolean; likeCount: number; commentCount: number;
  onLike: () => void; onComment: () => void;
}) => (
  <View className="flex-row items-center mt-3">
    <View className="flex-row items-center gap-0.5">
      <TouchableOpacity onPress={onLike} className="p-1.5" hitSlop={8}>
        <Ionicons
          name={liked ? 'paw' : 'paw-outline'}
          size={21}
          color={liked ? '#A03048' : '#6B7280'}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={onComment} className="p-1.5" hitSlop={8}>
        <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
      </TouchableOpacity>
      <TouchableOpacity className="p-1.5" hitSlop={8}>
        <Ionicons name="repeat-outline" size={21} color="#6B7280" />
      </TouchableOpacity>
      <TouchableOpacity className="p-1.5" hitSlop={8}>
        <Ionicons name="paper-plane-outline" size={20} color="#6B7280" />
      </TouchableOpacity>
    </View>

    <View className="ml-auto flex-row items-center gap-1">
      {commentCount > 0 && (
        <Text className="text-[13px] text-gray-400">
          {commentCount} {commentCount === 1 ? 'reply' : 'replies'}
        </Text>
      )}
      {commentCount > 0 && likeCount > 0 && (
        <Text className="text-[13px] text-gray-300"> · </Text>
      )}
      {likeCount > 0 && (
        <Text className="text-[13px] text-gray-400">
          {likeCount} {likeCount === 1 ? 'paw' : 'paws'}
        </Text>
      )}
    </View>
  </View>
);

/* ── Main Component ── */
export const PostCard = React.memo(({
  post, onPress, onPlusPress,
}: {
  post: SocialPost; onPress: () => void; onPlusPress?: (userId: number) => void;
}) => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const timeAgo = useMemo(() => formatTime(post.created_at), [post.created_at]);
  const caption = useMemo(() => stripHtml(post.content), [post.content]);

  const showPlus = Number(currentUser?.id) !== post.user_id && !post.is_following;

  const likeMutation = useMutation({
    mutationFn: () => socialApi.toggleLike(post.post_id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['social-feed'] });
      const prev = queryClient.getQueryData(['social-feed']);
      queryClient.setQueriesData({ queryKey: ['social-feed'] }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: SocialPost) =>
              p.post_id === post.post_id
                ? { ...p, is_liked: !p.is_liked, like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1 }
                : p
            ),
          })),
        };
      });
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['social-feed'], ctx.prev);
    },
  });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? '#FAFAFA' : '#fff',
        paddingHorizontal: H_PAD,
        paddingTop: 22,
        paddingBottom: 20,
      })}
    >
      <View style={{ flexDirection: 'row', gap: COL_GAP }}>
        <AvatarCol
          name={post.author_name || 'User'}
          uri={post.author_image}
          onPlusPress={showPlus ? () => onPlusPress?.(post.user_id) : undefined}
        />

        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text className="text-[14px] font-bold text-[#111] flex-1 tracking-tight">
              {post.author_name || post.social_username || 'Anonymous'}
            </Text>
            {post.pet_name && (
              <View className="mr-1.5">
                <PetChip name={post.pet_name} />
              </View>
            )}
            <Text className="text-[13px] text-gray-400">{timeAgo}</Text>
            <TouchableOpacity hitSlop={10} className="ml-2.5 p-0.5">
              <Ionicons name="ellipsis-horizontal" size={16} color="#C4C4C4" />
            </TouchableOpacity>
          </View>

          {!!caption && (
            <Text className="text-[15px] leading-[23px] text-[#111] tracking-tight">
              {caption}
            </Text>
          )}

          <MediaBlock media={post.media} />

          <ActionBar
            liked={!!post.is_liked}
            likeCount={post.like_count}
            commentCount={post.comment_count}
            onLike={() => likeMutation.mutate()}
            onComment={onPress}
          />
        </View>
      </View>
    </Pressable>
  );
});

export default PostCard;

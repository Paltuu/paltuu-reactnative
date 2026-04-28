import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, Dimensions, Pressable, ActivityIndicator,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { HEADER_HEIGHT } from '../../src/components/common/MainHeader';
import { useHeaderContext } from '../../src/context/HeaderContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { socialApi, SocialPost, SocialProfile } from '../../src/api/social';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../src/stores/authStore';

const { width } = Dimensions.get('window');

// Runtime layout constants (can't be expressed as static Tailwind classes)
const H_PAD = 28;
const AVATAR_SIZE = 42;
const COL_GAP = 14;
const CONTENT_W = width - H_PAD - AVATAR_SIZE - COL_GAP - H_PAD;

const formatTime = (dateStr: string) => {
  try {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return new Date(dateStr).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
  } catch { return ''; }
};

const stripHtml = (s: string) =>
  (s ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

/* ── Avatar column ── */
const AvatarCol = ({
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
    </View>
  );
};

/* ── Pet chip ── */
const PetChip = ({ name }: { name: string }) => (
  <View className="flex-row items-center bg-primarySoft rounded-full px-[7px] py-0.5 gap-[3px]">
    <Ionicons name="paw" size={9} color="#A03048" />
    <Text className="text-[11px] text-primary font-semibold">{name}</Text>
  </View>
);

/* ── Media ── */
const MediaBlock = ({ media }: { media: any[] }) => {
  if (!media?.length) return null;
  const imgH = Math.round(CONTENT_W * 0.72);

  if (media.length === 1) {
    return (
      <Image
        source={{ uri: media[0].url }}
        style={{ width: CONTENT_W, height: imgH, borderRadius: 12, marginTop: 10 }}
        contentFit="cover"
        transition={200}
      />
    );
  }

  const half = Math.floor((CONTENT_W - 3) / 2);
  return (
    <View className="flex-row gap-[3px] mt-2.5">
      {media.slice(0, 2).map((m, i) => (
        <View key={i} className="relative">
          <Image
            source={{ uri: m.url }}
            style={{ width: half, height: half, borderRadius: 10 }}
            contentFit="cover"
            transition={200}
          />
          {i === 1 && media.length > 2 && (
            <View className="absolute inset-0 rounded-[10px] bg-black/45 items-center justify-center">
              <Text className="text-white text-xl font-extrabold">
                +{media.length - 2}
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

/* ── Action bar ── */
const ActionBar = ({
  liked, likeCount, commentCount, onLike, onComment,
}: {
  liked: boolean; likeCount: number; commentCount: number;
  onLike: () => void; onComment: () => void;
}) => (
  <View className="flex-row items-center mt-3">
    {/* Actions left */}
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

    {/* Stats right */}
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

/* ── Quick Profile Modal ── */
const QuickProfileModal = ({
  userId, visible, onClose,
}: {
  userId: number | null; visible: boolean; onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  
  const { data, isLoading } = useQuery({
    queryKey: ['social-profile-quick', userId],
    queryFn: () => socialApi.getProfile(userId!),
    enabled: !!userId && visible,
  });

  const followMutation = useMutation({
    mutationFn: () => socialApi.toggleFollow(userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-profile-quick', userId] });
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
    },
  });

  const profile = data?.profile;
  const initials = (profile?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/50 justify-center items-center px-6" onPress={onClose}>
        <Pressable className="w-full bg-white rounded-3xl p-6" onPress={e => e.stopPropagation()}>
          {isLoading ? (
            <ActivityIndicator color="#A03048" size="large" className="py-10" />
          ) : profile ? (
            <View>
              <View className="flex-row items-center mb-4">
                {profile.profile_image_url ? (
                  <Image
                    source={{ uri: profile.profile_image_url }}
                    style={{ width: 64, height: 64, borderRadius: 32 }}
                  />
                ) : (
                  <View style={{ width: 64, height: 64, borderRadius: 32 }} className="bg-primarySoft items-center justify-center">
                    <Text className="text-primary text-xl font-bold">{initials}</Text>
                  </View>
                )}
                <View className="ml-4 flex-1">
                  <Text className="text-xl font-bold text-[#111]">{profile.name}</Text>
                  <Text className="text-gray-500">@{profile.social_username || profile.username}</Text>
                </View>
              </View>

              {profile.bio && <Text className="text-[15px] text-gray-700 mb-6 leading-5">{profile.bio}</Text>}

              <View className="flex-row justify-around mb-8 border-y border-gray-100 py-4">
                <View className="items-center">
                  <Text className="text-lg font-bold text-[#111]">{profile.follower_count}</Text>
                  <Text className="text-xs text-gray-500 uppercase tracking-widest">Followers</Text>
                </View>
                <View className="items-center">
                  <Text className="text-lg font-bold text-[#111]">{profile.following_count}</Text>
                  <Text className="text-xs text-gray-500 uppercase tracking-widest">Following</Text>
                </View>
                <View className="items-center">
                  <Text className="text-lg font-bold text-[#111]">{profile.post_count}</Text>
                  <Text className="text-xs text-gray-500 uppercase tracking-widest">Posts</Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 bg-[#111] py-3.5 rounded-xl items-center"
                  onPress={() => {
                    onClose();
                    router.push(`/profile/${profile.user_id}`);
                  }}
                >
                  <Text className="text-white font-bold">View Full Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 py-3.5 rounded-xl items-center ${
                    profile.is_following ? 'bg-gray-100' : 'bg-primary'
                  }`}
                  onPress={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                >
                  {followMutation.isPending ? (
                    <ActivityIndicator color={profile.is_following ? '#111' : 'white'} size="small" />
                  ) : (
                    <Text className={`font-bold ${profile.is_following ? 'text-[#111]' : 'text-white'}`}>
                      {profile.is_following ? 'Following' : 'Follow'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text className="text-center py-10 text-gray-500">User not found</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

/* ── Post card ── */
const PostCard = React.memo(({
  post, onPress, onPlusPress,
}: {
  post: SocialPost; onPress: () => void; onPlusPress?: (userId: number) => void;
}) => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const timeAgo = useMemo(() => formatTime(post.created_at), [post.created_at]);
  const caption = useMemo(() => stripHtml(post.content), [post.content]);

  // Only show plus if it's not the current user and not already followed
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
      {/* Two-column layout */}
      <View style={{ flexDirection: 'row', gap: COL_GAP }}>

        {/* Left — avatar */}
        <AvatarCol
          name={post.author_name || 'User'}
          uri={post.author_image}
          onPlusPress={showPlus ? () => onPlusPress?.(post.user_id) : undefined}
        />

        {/* Right — content */}
        <View className="flex-1">

          {/* Name + time + menu */}
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

          {/* Caption */}
          {!!caption && (
            <Text className="text-[15px] leading-[23px] text-[#111] tracking-tight">
              {caption}
            </Text>
          )}

          {/* Media */}
          <MediaBlock media={post.media} />

          {/* Actions */}
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

/* ── Separator ── */
const Separator = () => (
  <View style={{ height: 1, backgroundColor: '#F3F4F6' }} />
);

/* ── Screen ── */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onScroll } = useHeaderContext();
  
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const {
    data, fetchNextPage, hasNextPage,
    isFetchingNextPage, refetch, isLoading, isRefetching,
  } = useInfiniteQuery({
    queryKey: ['social-feed'],
    queryFn: ({ pageParam }) => socialApi.getFeed(pageParam as string | null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  });

  const posts = useMemo(() => data?.pages.flatMap(p => p.posts) ?? [], [data]);

  if (isLoading && !posts.length) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#A03048" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPress={() => router.push(`/post/${item.post_id}`)}
            onPlusPress={(uid) => setSelectedUserId(uid)}
          />
        )}
        keyExtractor={item => item.post_id}
        ItemSeparatorComponent={Separator}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: HEADER_HEIGHT + insets.top,
          paddingBottom: 100,
        }}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() =>
          isFetchingNextPage
            ? <View className="py-5"><ActivityIndicator color="#A03048" /></View>
            : <View className="h-5" />
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#A03048"
            progressViewOffset={HEADER_HEIGHT + insets.top}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <QuickProfileModal
        userId={selectedUserId}
        visible={selectedUserId !== null}
        onClose={() => setSelectedUserId(null)}
      />
    </View>
  );
}
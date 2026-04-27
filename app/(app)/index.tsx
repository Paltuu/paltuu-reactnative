// index.tsx — Feed with live API integration
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, Dimensions, Pressable, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { HEADER_HEIGHT } from '../../src/components/common/MainHeader';
import { useHeaderContext } from '../../src/context/HeaderContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommentsBottomSheet } from '../../src/components/social/CommentsBottomSheet';
import { socialApi, SocialPost } from '../../src/api/social';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const formatTime = (dateStr: string) => {
  try {
    const now = new Date();
    const past = new Date(dateStr);
    const diff = Math.floor((now.getTime() - past.getTime()) / 1000);
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return past.toLocaleDateString();
  } catch {
    return 'now';
  }
};

const { width } = Dimensions.get('window');
const PRIMARY = '#A03048';
const MUTED = '#C4C4C4';
const CARD_W = width - 32;
const CARD_RADIUS = 20;

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
        transition={200}
      />
    );
  }

  const bigW = Math.floor(CARD_W * 0.62);
  const smallW = CARD_W - bigW - 2;
  const smallH = Math.floor((imgH - 2) / 2);
  return (
    <View style={{ flexDirection: 'row', gap: 2, height: imgH, overflow: 'hidden', ...bottomRadius }}>
      <Image source={{ uri: media[0].url }} style={{ width: bigW, height: imgH }} contentFit="cover" transition={200} />
      <View style={{ gap: 2 }}>
        <Image source={{ uri: media[1].url }} style={{ width: smallW, height: smallH }} contentFit="cover" transition={200} />
        {media.length > 2 && (
          <View style={{ width: smallW, height: smallH, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#666' }}>+{media.length - 2}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

/* ── Post card ── */
const PostCard = React.memo(({ post, onCommentPress }: { post: SocialPost; onCommentPress: () => void }) => {
  const queryClient = useQueryClient();
  const isText = !post.media?.length;

  const likeMutation = useMutation({
    mutationFn: () => socialApi.toggleLike(post.post_id),
    onMutate: async () => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['social-feed'] });
      const previousData = queryClient.getQueryData(['social-feed']);
      
      queryClient.setQueriesData({ queryKey: ['social-feed'] }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: SocialPost) => {
              if (p.post_id === post.post_id) {
                const currentlyLiked = p.is_liked;
                return {
                  ...p,
                  is_liked: !currentlyLiked,
                  like_count: currentlyLiked ? p.like_count - 1 : p.like_count + 1,
                };
              }
              return p;
            })
          }))
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['social-feed'], context.previousData);
      }
    }
  });

  const timeAgo = useMemo(() => formatTime(post.created_at), [post.created_at]);

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
          <Avatar name={post.author_name || 'User'} uri={post.author_image} />
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#111', letterSpacing: -0.2 }}>
              {post.author_name || post.social_username || 'Anonymous'}
            </Text>
            {/* {post.pet_name && <PetChip name={post.pet_name} />} */}
          </View>
          <Text style={{ fontSize: 11, color: '#B8B8B8' }}>{timeAgo}</Text>
        </View>
        <TouchableOpacity hitSlop={10}>
          <Ionicons name="ellipsis-horizontal" size={18} color={MUTED} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 14, paddingBottom: isText ? 16 : 12 }}>
        <Text style={{
          fontSize: isText ? 15 : 14,
          lineHeight: isText ? 24 : 22,
          color: '#1a1a1a',
          letterSpacing: -0.1,
          fontFamily: 'DMSans_400Regular',
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
        <TouchableOpacity 
          onPress={() => likeMutation.mutate()} 
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} 
          hitSlop={10}
        >
          <Ionicons 
            name={post.is_liked ? 'paw' : 'paw-outline'} 
            size={21} 
            color={post.is_liked ? PRIMARY : MUTED} 
          />
          {post.like_count > 0 && (
            <Text style={{ fontSize: 13, fontWeight: '600', color: post.is_liked ? PRIMARY : '#9CA3AF' }}>
              {post.like_count}
            </Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} 
          hitSlop={10}
          onPress={onCommentPress}
        >
          <Ionicons name="chatbubble-outline" size={19} color={MUTED} />
          {post.comment_count > 0 && (
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#9CA3AF' }}>
              {post.comment_count}
            </Text>
          )}
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
});

/* ── Screen ── */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { onScroll } = useHeaderContext();
  const [selectedPostId, setSelectedPostId] = useState<string | number | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isLoading,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['social-feed'],
    queryFn: ({ pageParam }) => socialApi.getFeed(pageParam as string | null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  });

  const posts = useMemo(() => {
    return data?.pages.flatMap((page) => page.posts) || [];
  }, [data]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const openComments = (postId: string | number) => {
    setSelectedPostId(postId);
  };

  const renderFooter = () => {
    if (!isFetchingNextPage) return <View style={{ height: 20 }} />;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator color={PRIMARY} />
      </View>
    );
  };

  if (isLoading && !posts.length) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F2F2F2', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F2F2F2' }}>
      <FlatList
        data={posts}
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
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl 
            refreshing={isRefetching} 
            onRefresh={onRefresh} 
            tintColor={PRIMARY} 
            progressViewOffset={HEADER_HEIGHT + insets.top}
          />
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
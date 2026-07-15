import React, { useCallback } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { socialApi, SocialPost } from '../../../src/api/social';
import { PostCard } from '../../../src/components/social/PostCard';
import { withFocusUnmount } from '../../../src/components/common/withFocusUnmount';

function TopicFeedScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['topic-feed', slug],
    queryFn: ({ pageParam }) => socialApi.getTopicFeed(slug, pageParam as string | null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    enabled: !!slug,
  });

  const posts = data?.pages.flatMap((p) => p.posts) ?? [];
  const label = data?.pages[0]?.label ?? slug;

  const renderItem = useCallback(({ item }: { item: SocialPost }) => (
    <PostCard post={item} onPress={() => router.push(`/post/${item.post_id}`)} />
  ), [router]);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator color="#A03048" />
      </View>
    );
  }, [isFetchingNextPage]);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#FFF',
        paddingTop: insets.top + 8,
        paddingBottom: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#111' }}>{label}</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#A03048" />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Ionicons name="alert-circle-outline" size={48} color="#E0E0E0" />
          <Text style={{ color: '#999', marginTop: 12, textAlign: 'center' }}>
            Couldn't load this topic
          </Text>
        </View>
      ) : posts.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 40 }}>🐾</Text>
          <Text style={{ color: '#999', marginTop: 12, textAlign: 'center' }}>
            No posts in this topic yet
          </Text>
        </View>
      ) : (
        <FlashList
          data={posts}
          renderItem={renderItem}
          keyExtractor={(item) => (item as SocialPost).post_id}
          style={{ marginBottom: insets.bottom }}
          {...({ estimatedItemSize: 350 } as any)}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
        />
      )}
    </View>
  );
}

export default withFocusUnmount(TopicFeedScreen);

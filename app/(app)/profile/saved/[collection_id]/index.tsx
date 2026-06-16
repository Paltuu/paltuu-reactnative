import React, { useMemo, useState, useRef, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { socialApi, SocialPost } from '../../../../../src/api/social';
import PostCard from '../../../../../src/components/social/PostCard';
import { QuickProfileModal } from '../../../index';

export default function CollectionPostsScreen() {
  const router = useRouter();
  const { collection_id } = useLocalSearchParams();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [playingPostId, setPlayingPostId] = useState<string | null>(null);

  // 1. Read collection name from cache if available
  const { data: collectionsData } = useQuery<{ collections: any[] }>({
    queryKey: ['social-collections'],
    queryFn: () => socialApi.getCollections(),
    enabled: false, // Read from react-query cache, don't trigger refetch
  });

  const collectionName = useMemo(() => {
    const matched = collectionsData?.collections?.find(
      (c) => String(c.collection_id) === String(collection_id)
    );
    return matched?.name || 'Collection';
  }, [collectionsData, collection_id]);

  // 2. Fetch collection posts (Infinite scroll)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isLoading,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['collection-posts', collection_id],
    queryFn: ({ pageParam }) => 
      socialApi.getCollectionPosts(Number(collection_id), pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    enabled: !!collection_id,
  });

  const posts = useMemo(() => data?.pages.flatMap((p) => p.posts) ?? [], [data]);

  // Video Autoplay logic
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      const first = viewableItems[0];
      setPlayingPostId(first?.item?.post_id ?? null);
    },
    []
  );
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  return (
    <View className="flex-1 bg-bg">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-5 h-[56px] bg-surface border-b border-gray-100">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text className="font-heading text-xl text-dark" numberOfLines={1}>
            {collectionName}
          </Text>
        </View>
        <View className="w-8" />
      </View>

      {/* Posts List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#A03048" size="large" />
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPress={() => router.push(`/post/${item.post_id}`)}
              onPlusPress={(uid) => setSelectedUserId(uid)}
              isVideoPlaying={playingPostId === item.post_id}
            />
          )}
          keyExtractor={(item) => item.post_id.toString()}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#A03048"
            />
          }
          ListFooterComponent={() =>
            isFetchingNextPage ? (
              <View className="py-5">
                <ActivityIndicator color="#A03048" />
              </View>
            ) : (
              <View className="h-5" />
            )
          }
          ListEmptyComponent={
            <View className="py-24 items-center px-10">
              <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
                <Ionicons name="bookmark-outline" size={32} color="#6B7280" />
              </View>
              <Text className="font-heading text-base text-dark mb-1 text-center">No posts here yet</Text>
              <Text className="font-body text-gray-500 text-xs text-center leading-5">
                Bookmark posts from your feed and organize them into this collection!
              </Text>
            </View>
          }
        />
      )}

      <QuickProfileModal
        userId={selectedUserId}
        visible={selectedUserId !== null}
        onClose={() => setSelectedUserId(null)}
      />
    </View>
  );
}

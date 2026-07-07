import React, { useMemo, useState, useRef, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, StatusBar, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { socialApi, SocialPost } from '../../../../../src/api/social';
import PostCard from '../../../../../src/components/social/PostCard';
import { QuickProfileModal } from '../../../index';
import { withFocusUnmount } from '../../../../../src/components/common/withFocusUnmount';

function CollectionPostsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60, minimumViewTime: 250 }).current;

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFA', paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />
      {/* Top Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' }}>
        <TouchableOpacity onPress={() => router.navigate('/(app)/profile/saved')} hitSlop={12} style={{ padding: 4, marginRight: 4 }}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 19, fontWeight: '700', color: '#111', fontFamily: 'Montserrat_700Bold' }} numberOfLines={1}>
          {collectionName}
        </Text>
        <View style={{ width: 36 }} />
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
            <View style={{ paddingTop: 80, alignItems: 'center', paddingHorizontal: 40 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FDF0F2', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <Ionicons name="bookmark-outline" size={36} color="#A03048" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 8, fontFamily: 'Montserrat_700Bold' }}>Nothing here yet</Text>
              <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, fontFamily: 'DMSans_400Regular' }}>
                Bookmark posts from your feed and they'll appear in this collection.
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

export default withFocusUnmount(CollectionPostsScreen);

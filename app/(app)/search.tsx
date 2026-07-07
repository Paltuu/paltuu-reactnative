import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import Animated from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderContext } from '../../src/context/HeaderContext';
import { SearchHeader, SearchTab } from '../../src/components/common/SearchHeader';
import { useRouter } from 'expo-router';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { socialApi, SocialPost } from '../../src/api/social';
import { useDebounce } from '../../src/hooks/useDebounce';
import { useSocialActions } from '../../src/hooks/useSocialActions';
import ImageModal from '../../src/components/common/ImageModal';
import { mentionsToPlainText } from '../../src/components/social/MentionText';
import { NO_PROFILE_IMAGE } from '../../src/constants/images';
import PostCard, { getPostItemType } from '../../src/components/social/PostCard';
import { ExploreSections } from '../../src/components/explore/ExploreSections';
import { chunkArray, PostGridItem, GRID_MARGIN, GRID_GAP } from '../../src/components/explore/MediaGrid';
import { setPlayingPostId } from '../../src/utils/videoPlaySubscription';

const CustomFlashList = FlashList as any;

const PostCompactItem = ({ post, onPress }: { post: SocialPost; onPress: () => void }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      marginHorizontal: 16, marginVertical: 6, paddingHorizontal: 16, paddingVertical: 14,
      borderRadius: 16, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E5E5',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
      elevation: 2,
    }}
  >
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
      <Text style={{ fontSize: 12, color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Post</Text>
      <Ionicons name="ellipsis-horizontal" size={14} color="#bbb" />
    </View>
    <Text style={{ fontSize: 15, fontWeight: '600', color: '#222', marginBottom: 4 }} numberOfLines={1}>
      {mentionsToPlainText(post.content).split('\n')[0].trim() || 'Media Post'}
    </Text>
    <Text style={{ fontSize: 12, color: '#aaa' }}>
      {(post.like_count ?? 0) + (post.comment_count ?? 0)} interactions · {post.author_name}
    </Text>
  </TouchableOpacity>
);

export default function SearchScreen() {
  const { toggleFollow } = useSocialActions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { scrollHandler, handleScrollY, handleScrollEnd } = useHeaderContext();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 400);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [stickyHeaderHeight, setStickyHeaderHeight] = useState(112);
  const [isExploreRefreshing, setIsExploreRefreshing] = useState(false);

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerMedia, setViewerMedia] = useState<{ url: string }[]>([]);

  const handleGridImagePress = useCallback((post: SocialPost, index: number) => {
    const media = post.media?.length ? post.media : post.original_media;
    if (media?.length) {
      setViewerMedia(media.map((m) => ({ url: m.url })));
      setViewerIndex(index);
      setViewerVisible(true);
    }
  }, []);

  // ─── For You feed — the explore page's infinite tail ─────────────────────
  // Shares Home's ['social-feed', ...] key prefix so useSocialActions'
  // optimistic like/follow/save updates apply to this list too
  const {
    data: feedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingFeed,
  } = useInfiniteQuery({
    queryKey: ['social-feed', 'personalized'],
    queryFn: ({ pageParam }) => socialApi.getFeed(pageParam as string | null, 20, 'personalized'),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  });

  const forYouPosts = useMemo(() => feedData?.pages.flatMap((p) => p.posts) ?? [], [feedData]);

  // ─── Search results (typed state) ─────────────────────────────────────────
  const {
    data: searchData,
    isLoading: isLoadingSearch,
    refetch: refetchSearch,
    isRefetching: isRefetchingSearch,
  } = useQuery({
    queryKey: ['social-search', debouncedQuery, activeTab],
    queryFn: () => socialApi.search(debouncedQuery, activeTab),
    enabled: !!debouncedQuery,
  });

  const searchResults = useMemo(() => {
    if (!searchData) return { users: [], posts: [] };
    const results = searchData.results;
    if (activeTab === 'all') return { users: results.users || [], posts: results.posts || [] };
    if (activeTab === 'posts') return { users: [], posts: results || [] };
    return { users: results || [], posts: [] };
  }, [searchData, activeTab]);

  // ─── Search results list (typed state only — idle state is the explore list)
  const searchListData = useMemo(() => {
    if (!debouncedQuery) return [];

    const items: any[] = [];

    if ((activeTab === 'all' || activeTab === 'users') && searchResults.users.length > 0) {
      items.push({ type: 'section_header', title: 'People', _key: 'hdr-people' });
      searchResults.users.forEach((u: any) =>
        items.push({ ...u, type: 'user_item', _key: `su-${u.user_id}` })
      );
    }

    if ((activeTab === 'all' || activeTab === 'posts') && searchResults.posts.length > 0) {
      if (activeTab === 'all') items.push({ type: 'section_header', title: 'Posts', _key: 'hdr-posts' });
      const textPosts = searchResults.posts.filter((p: SocialPost) => !p.media?.length && !p.original_media?.length);
      const mediaPosts = searchResults.posts.filter((p: SocialPost) => p.media?.length || p.original_media?.length);
      textPosts.slice(0, 5).forEach((p: SocialPost) =>
        items.push({ ...p, type: 'post_compact', _key: `pc-${p.post_id}` })
      );
      chunkArray(mediaPosts, 3).forEach((chunk, i) =>
        items.push({ type: 'post_grid_row', posts: chunk, _key: `grid-${i}` })
      );
    }

    if (items.length === 0 && !isLoadingSearch) {
      items.push({ type: 'empty_state', _key: 'empty' });
    }

    return items;
  }, [debouncedQuery, searchResults, activeTab, isLoadingSearch]);

  const renderSearchItem = useCallback(({ item }: { item: any }) => {
    if (item.type === 'section_header') {
      return (
        <View style={{
          paddingHorizontal: 20, paddingTop: 24, paddingBottom: 10, backgroundColor: '#FFF',
          borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
        }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#111' }}>{item.title}</Text>
        </View>
      );
    }
    if (item.type === 'user_item') {
      return (
        <TouchableOpacity
          onPress={() => router.push(`/(app)/profile/${item.user_id}`)}
          style={{
            flexDirection: 'row', alignItems: 'center', padding: 16,
            borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0', backgroundColor: '#FFF',
          }}
        >
          <Image
            source={item.profile_image_url ? { uri: item.profile_image_url } : NO_PROFILE_IMAGE}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', marginRight: 12 }}
            contentFit="cover"
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: '#111' }}>{item.name}</Text>
            <Text style={{ color: '#666', fontSize: 14 }}>@{item.social_username}</Text>
          </View>
          <TouchableOpacity
            onPress={() => toggleFollow(item.user_id)}
            style={{
              paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
              backgroundColor: item.is_following ? '#F3F4F6' : '#A03048',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: item.is_following ? '#333' : '#FFF' }}>
              {item.is_following ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }
    if (item.type === 'post_compact') {
      return (
        <PostCompactItem
          post={item}
          onPress={() => router.push(`/post/${item.post_id}`)}
        />
      );
    }
    if (item.type === 'post_grid_row') {
      return (
        <View style={{ flexDirection: 'row', marginHorizontal: GRID_MARGIN, gap: GRID_GAP, marginBottom: GRID_GAP }}>
          {item.posts.map((post: SocialPost) => (
            <PostGridItem
              key={post.post_id}
              post={post}
              onPress={() => handleGridImagePress(post, 0)}
            />
          ))}
        </View>
      );
    }
    if (item.type === 'empty_state') {
      return (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Ionicons name="search" size={48} color="#EEE" />
          <Text style={{ color: '#999', marginTop: 10 }}>No results for "{debouncedQuery}"</Text>
        </View>
      );
    }
    return null;
  }, [router, handleGridImagePress, debouncedQuery, toggleFollow]);

  // ─── Explore (idle state) ──────────────────────────────────────────────────
  const renderFeedItem = useCallback(({ item }: { item: SocialPost }) => (
    <PostCard post={item} onPress={() => router.push(`/post/${item.post_id}`)} />
  ), [router]);

  // Only autoplay the video that's ≥60% visible (same mechanism as Home)
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      setPlayingPostId(viewableItems[0]?.item?.post_id ?? null);
    },
    []
  );
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60, minimumViewTime: 250 }).current;

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleExploreRefresh = useCallback(async () => {
    setIsExploreRefreshing(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['explore'] }),
        queryClient.refetchQueries({ queryKey: ['social-feed', 'personalized'] }),
      ]);
    } finally {
      setIsExploreRefreshing(false);
    }
  }, [queryClient]);

  const exploreHeader = useMemo(() => <ExploreSections />, []);

  const exploreFooter = useMemo(() => (
    (isLoadingFeed || isFetchingNextPage)
      ? <View style={{ paddingVertical: 20 }}><ActivityIndicator color="#A03048" /></View>
      : <View style={{ height: 20 }} />
  ), [isLoadingFeed, isFetchingNextPage]);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      {debouncedQuery ? (
        <Animated.FlatList
          data={searchListData}
          renderItem={renderSearchItem}
          keyExtractor={(item) => item._key || item.post_id || String(item.user_id) || Math.random().toString()}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingTop: insets.top + stickyHeaderHeight,
            paddingBottom: 100,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetchingSearch}
              onRefresh={() => refetchSearch()}
              tintColor="#A03048"
            />
          }
          ListFooterComponent={() =>
            isLoadingSearch ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator color="#A03048" />
              </View>
            ) : null
          }
        />
      ) : (
        <CustomFlashList
          data={forYouPosts}
          renderItem={renderFeedItem}
          keyExtractor={(item: SocialPost) => item.post_id}
          getItemType={getPostItemType}
          estimatedItemSize={350}
          onScroll={(e: any) => handleScrollY(e.nativeEvent.contentOffset.y)}
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          contentContainerStyle={{
            paddingTop: insets.top + stickyHeaderHeight,
            paddingBottom: 100,
          }}
          ListHeaderComponent={exploreHeader}
          ListFooterComponent={exploreFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isExploreRefreshing}
              onRefresh={handleExploreRefresh}
              tintColor="#A03048"
            />
          }
        />
      )}

      <SearchHeader
        placeholders={['Search users', 'Search vets', 'Search rescue shelters', 'Search posts']}
        onSearch={setSearchQuery}
        onClear={() => setSearchQuery('')}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onHeightChange={setStickyHeaderHeight}
        showTabs={!!debouncedQuery}
      />

      <ImageModal
        mediaItems={viewerMedia}
        visible={viewerVisible}
        index={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
    </View>
  );
}

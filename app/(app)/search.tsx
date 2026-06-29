import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderContext } from '../../src/context/HeaderContext';
import { SearchHeader, SearchTab } from '../../src/components/common/SearchHeader';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { socialApi, SocialPost } from '../../src/api/social';
import { PostCard } from '../../src/components/social/PostCard';
import { useDebounce } from '../../src/hooks/useDebounce';
import { useSocialActions } from '../../src/hooks/useSocialActions';
import ImageModal from '../../src/components/common/ImageModal';
import { mentionsToPlainText } from '../../src/components/social/MentionText';
import { MOCK_POSTS } from './index';

const { width: screenWidth } = Dimensions.get('window');

const GRID_MARGIN = 16;
const GRID_GAP = 8;
const GRID_ITEM_SIZE = Math.floor((screenWidth - GRID_MARGIN * 2 - GRID_GAP * 2) / 3);

const chunkArray = (array: any[], size: number) => {
  const chunked = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
};

const PostGridItem = ({ post, onPress }: { post: SocialPost, onPress: () => void }) => {
  const imageUri = post.media?.[0]?.url || post.original_media?.[0]?.url || 'https://via.placeholder.com/300';
  const isMultiMedia = (post.media?.length || 0) > 1 || (post.original_media?.length || 0) > 1;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE, borderRadius: 16, overflow: 'hidden' }}
    >
      <Image
        source={{ uri: imageUri }}
        style={{ width: '100%', height: '100%', backgroundColor: '#F3F4F6' }}
        contentFit="cover"
      />
      {isMultiMedia && (
        <View className="absolute top-2 right-2 shadow-sm">
          <Ionicons name="copy" size={16} color="white" />
        </View>
      )}
      {post.post_type === 'repost' && !post.original_media?.length && (
        <View className="absolute inset-0 bg-black/10 items-center justify-center p-2">
          <Ionicons name="repeat" size={24} color="white" />
          <Text className="text-white text-[10px] font-bold text-center" numberOfLines={2}>
            {mentionsToPlainText(post.original_content)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const PostCompactItem = ({ post, onPress }: { post: SocialPost, onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} className="mx-4 my-1.5 px-4 py-4 rounded-2xl bg-white border border-gray-100">
    <View className="flex-row items-center justify-between mb-1">
      <Text className="text-[12px] text-[#999] font-medium tracking-wide uppercase">Trending in Social</Text>
      <Ionicons name="ellipsis-horizontal" size={14} color="#bbb" />
    </View>
    <Text className="text-[15px] text-[#222] font-semibold mb-1" numberOfLines={1}>
      {mentionsToPlainText(post.content).split('\n')[0].trim() || 'Media Post'}
    </Text>
    <Text className="text-[12px] text-[#aaa]">
      {(post.like_count ?? 0) + (post.comment_count ?? 0) + (post.repost_count ?? 0)} posts · {post.author_name}
    </Text>
  </TouchableOpacity>
);

export default function SearchScreen() {
  const { toggleFollow } = useSocialActions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { scrollHandler } = useHeaderContext();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 400);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [stickyHeaderHeight, setStickyHeaderHeight] = useState(112);

  // Viewer State
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerMedia, setViewerMedia] = useState<{ url: string }[]>([]);

  const handleGridImagePress = useCallback((post: SocialPost, index: number) => {
    const media = post.media?.length ? post.media : post.original_media;
    if (media?.length) {
      setViewerMedia(media.map(m => ({ url: m.url })));
      setViewerIndex(index);
      setViewerVisible(true);
    }
  }, []);

  // ─── Trending Feed (Global) ────────────────────────────────────────────────
  const {
    data: trendingData,
    fetchNextPage: fetchNextTrending,
    hasNextPage: hasNextTrending,
    isFetchingNextPage: isFetchingMoreTrending,
    isLoading: isLoadingTrending,
    refetch: refetchTrending,
    isRefetching: isRefetchingTrending
  } = useInfiniteQuery({
    queryKey: ['social-trending'],
    queryFn: ({ pageParam }) => socialApi.getFeed(pageParam as string | null, 20, 'global'),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    enabled: !debouncedQuery,
  });

  // ─── Search Results ───────────────────────────────────────────────────────
  const {
    data: searchData,
    isLoading: isLoadingSearch,
    refetch: refetchSearch,
  } = useQuery({
    queryKey: ['social-search', debouncedQuery, activeTab],
    queryFn: () => socialApi.search(debouncedQuery, activeTab),
    enabled: !!debouncedQuery,
  });

  const trendingPosts = useMemo(() => 
    trendingData?.pages.flatMap(p => p.posts) ?? [], 
    [trendingData]
  );

  const matchingMockPosts = useMemo(() => {
    if (!debouncedQuery) return [];
    const query = debouncedQuery.toLowerCase().replace('#', '');
    return MOCK_POSTS.filter(p => 
      p.content.toLowerCase().includes(query) ||
      (p.author_name || '').toLowerCase().includes(query) ||
      (p.social_username || '').toLowerCase().includes(query)
    );
  }, [debouncedQuery]);

  const searchResults = useMemo(() => {
    if (!searchData) return { users: [], posts: matchingMockPosts };
    const results = searchData.results;
    if (activeTab === 'all') {
      return { 
        users: results.users || [], 
        posts: [...matchingMockPosts, ...(results.posts || [])] 
      };
    } else if (activeTab === 'posts') {
      return { users: [], posts: [...matchingMockPosts, ...(results || [])] };
    } else {
      return { users: results || [], posts: [] };
    }
  }, [searchData, activeTab, matchingMockPosts]);

  const renderUserItem = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity 
      onPress={() => router.push(`/(app)/profile/${item.user_id}`)}
      className="flex-row items-center p-4 border-b-[0.5px] border-[#F0F0F0]"
    >
      <Image 
        source={{ uri: item.profile_image_url || 'https://via.placeholder.com/150' }}
        className="w-11 h-11 rounded-full mr-3"
      />
      <View className="flex-1">
        <Text className="font-bold text-base">{item.name}</Text>
        <Text className="text-[#666] text-sm">@{item.social_username}</Text>
      </View>
      <TouchableOpacity 
        onPress={() => toggleFollow(item.user_id)}
        className={`px-4 py-2 rounded-full ${item.is_following ? 'bg-[#F0F0F0]' : 'bg-primary'}`}
      >
        <Text className={`text-[13px] font-semibold ${item.is_following ? 'text-[#111]' : 'text-white'}`}>
          {item.is_following ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  ), [router, toggleFollow]);

  const renderHeader = useMemo(() => (
    <View>
      {!debouncedQuery && (
        <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#222' }}>Trending Posts</Text>
        </View>
      )}
    </View>
  ), [debouncedQuery]);

  const combinedData = useMemo(() => {
    const processPosts = (posts: SocialPost[], isTrending: boolean) => {
      const textPosts = posts.filter(p => 
        (p.media?.length || 0) === 0 && (p.original_media?.length || 0) === 0
      );
      const mediaPosts = posts.filter(p => 
        (p.media?.length || 0) > 0 || (p.original_media?.length || 0) > 0
      );
      
      const items: any[] = [];
      
      // Top section: Compact Text list (limit to 5 if many)
      textPosts.slice(0, 5).forEach(p => items.push({ ...p, type: 'post_item_compact' }));
      
      // Remaining: Grid style (all media posts)
      if (mediaPosts.length > 0) {
        if (isTrending && textPosts.length > 0) items.push({ type: 'section_header', title: 'Media Highlights' });
        const postChunks = chunkArray(mediaPosts, 3);
        postChunks.forEach(chunk => items.push({ type: 'post_grid_row', posts: chunk }));
      }
      
      return items;
    };

    if (!debouncedQuery) {
      return processPosts(trendingPosts, true);
    }
    
    const data: any[] = [];
    if (activeTab === 'all' || activeTab === 'users') {
      if (searchResults.users.length > 0) {
        data.push({ type: 'section_header', title: 'People' });
        searchResults.users.forEach((u: any) => data.push({ ...u, type: 'user_item' }));
      }
    }
    
    if (activeTab === 'all' || activeTab === 'posts') {
      if (searchResults.posts.length > 0) {
        if (activeTab === 'all') data.push({ type: 'section_header', title: 'Posts' });
        const postItems = processPosts(searchResults.posts, false);
        data.push(...postItems);
      }
    }

    if (data.length === 0 && !isLoadingSearch) {
      data.push({ type: 'empty_state' });
    }

    return data;
  }, [debouncedQuery, trendingPosts, searchResults, activeTab, isLoadingSearch]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    if (item.type === 'section_header') {
      return (
        <View className="px-4 pt-6 pb-2 bg-white">
          <Text className="text-[15px] font-bold text-[#222]">{item.title}</Text>
        </View>
      );
    }
    if (item.type === 'user_item') {
      return renderUserItem({ item });
    }
    if (item.type === 'post_item_compact') {
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
          {item.posts.map((post: any) => (
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
        <View className="p-10 items-center">
          <Ionicons name="search" size={48} color="#EEE" />
          <Text className="text-[#999] mt-2.5">No results found for "{debouncedQuery}"</Text>
        </View>
      );
    }
    return null;
  }, [router, handleGridImagePress, debouncedQuery, renderUserItem]);

  return (
    <View className="flex-1 bg-white">
      <Animated.FlatList
        data={combinedData}
        renderItem={renderItem}
        keyExtractor={(item, index) => String(item.post_id || item.user_id || `idx-${index}`)}
        ListHeaderComponent={renderHeader}
        onScroll={scrollHandler}
        contentContainerStyle={{
          paddingTop: insets.top + stickyHeaderHeight,
          paddingBottom: 100
        }}
        onEndReached={() => {
          if (!debouncedQuery && hasNextTrending && !isFetchingMoreTrending) {
            fetchNextTrending();
          }
        }}
        refreshControl={
          <RefreshControl 
            refreshing={isRefetchingTrending} 
            onRefresh={() => debouncedQuery ? refetchSearch() : refetchTrending()} 
            tintColor="#A03048"
          />
        }
        ListFooterComponent={() => (
          (isLoadingTrending || isLoadingSearch || isFetchingMoreTrending) ? (
            <View className="py-5">
              <ActivityIndicator color="#A03048" />
            </View>
          ) : null
        )}
      />

      <SearchHeader
        placeholders={[
          'Search users',
          'Search vets',
          'Search rescue shelters',
          'Search posts',
        ]}
        onSearch={setSearchQuery}
        onClear={() => setSearchQuery('')}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onHeightChange={setStickyHeaderHeight}
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

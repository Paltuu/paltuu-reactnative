import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Dimensions, 
  ActivityIndicator, 
  TouchableOpacity,
  Image,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderContext } from '../../src/context/HeaderContext';
import { SearchBar } from '../../src/components/common/SearchBar';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { socialApi, SocialPost } from '../../src/api/social';
import { PostCard } from '../../src/components/social/PostCard';
import { useDebounce } from '../../src/hooks/useDebounce';
import { useSocialActions } from '../../src/hooks/useSocialActions';
import ImageModal from '../../src/components/common/ImageModal';
import { MOCK_POSTS } from './index';

const { width: screenWidth } = Dimensions.get('window');

type SearchTab = 'all' | 'posts' | 'users';
const chunkArray = (array: any[], size: number) => {
  const chunked = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
};

const PostGridItem = ({ post, onPress }: { post: SocialPost, onPress: () => void }) => {
  const imageUri = post.media?.[0]?.url || post.original_media?.[0]?.url || 'https://via.placeholder.com/300';
  const size = screenWidth / 3;
  const isMultiMedia = (post.media?.length || 0) > 1 || (post.original_media?.length || 0) > 1;

  return (
    <TouchableOpacity 
      onPress={onPress}
      className="border-[0.5px] border-white"
      style={{ width: size, height: size }}
    >
      <Image 
        source={{ uri: imageUri }}
        className="w-full h-full bg-gray-100"
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
            {post.original_content}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const PostCompactItem = ({ post, onPress }: { post: SocialPost, onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} className="px-4 py-4 border-b-[0.5px] border-[#F0F0F0]">
    <View className="flex-row items-center justify-between mb-1">
      <Text className="text-[13px] text-[#666] font-bold">Trending in Social</Text>
      <Ionicons name="ellipsis-horizontal" size={14} color="#666" />
    </View>
    <Text className="text-[16px] text-[#111] font-extrabold mb-1" numberOfLines={1}>
      {(post.content || '').split('\n')[0].replace(/<[^>]*>/g, '').trim() || 'Media Post'}
    </Text>
    <Text className="text-[13px] text-[#666]">
      {post.like_count + post.comment_count + (post.repost_count ?? 0)} posts · {post.author_name}
    </Text>
  </TouchableOpacity>
);

const TabItem = React.memo(({ title, active, onPress }: { title: string, active: boolean, onPress: () => void }) => (
  <TouchableOpacity 
    onPress={onPress}
    className={`py-[10px] px-5 border-b-2 ${active ? 'border-primary' : 'border-transparent'}`}
  >
    <Text className={`text-[14px] ${active ? 'text-[#111] font-bold' : 'text-[#666] font-medium'}`}>
      {title}
    </Text>
  </TouchableOpacity>
));

export default function SearchScreen() {
  const { toggleFollow } = useSocialActions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { onScroll } = useHeaderContext();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 400);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');

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
    <View className="pt-5">
      <Text className="text-[32px] font-extrabold mb-[15px] px-4">
        Explore
      </Text>
      
      <View className="px-4 mb-2.5">
        <SearchBar
          placeholder="Search people or posts..."
          onSearch={setSearchQuery}
          onClear={() => setSearchQuery('')}
          containerWidth={screenWidth - 32}
          tint="#A03048"
          centerWhenUnfocused={false}
        />
      </View>

      <View className="flex-row border-b-[0.5px] border-[#EEE] px-2">
        <TabItem title="All" active={activeTab === 'all'} onPress={() => setActiveTab('all')} />
        <TabItem title="Posts" active={activeTab === 'posts'} onPress={() => setActiveTab('posts')} />
        <TabItem title="People" active={activeTab === 'users'} onPress={() => setActiveTab('users')} />
      </View>

      {!debouncedQuery && (
        <View style={{ padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' }}>
          <Text style={{ fontSize: 18, fontWeight: '800' }}>Trending Posts</Text>
        </View>
      )}
    </View>
  ), [activeTab, debouncedQuery]);

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
        <View className="p-4 bg-[#F9F9F9]">
          <Text className="text-base font-extrabold">{item.title}</Text>
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
          onPress={() => router.push(`/(app)/post/${item.post_id}`)}
        />
      );
    }
    if (item.type === 'post_grid_row') {
      return (
        <View className="flex-row">
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
      <FlatList
        data={combinedData}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.post_id || item.user_id || `idx-${index}`}
        ListHeaderComponent={renderHeader}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ 
          paddingTop: insets.top,
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

      <ImageModal
        mediaItems={viewerMedia}
        visible={viewerVisible}
        index={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
    </View>
  );
}

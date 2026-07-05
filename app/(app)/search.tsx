import React, { useState, useCallback, useMemo } from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { socialApi, SocialPost } from '../../src/api/social';
import { useDebounce } from '../../src/hooks/useDebounce';
import { useSocialActions } from '../../src/hooks/useSocialActions';
import ImageModal from '../../src/components/common/ImageModal';
import { mentionsToPlainText } from '../../src/components/social/MentionText';

const { width: screenWidth } = Dimensions.get('window');

const GRID_MARGIN = 16;
const GRID_GAP = 8;
const GRID_ITEM_SIZE = Math.floor((screenWidth - GRID_MARGIN * 2 - GRID_GAP * 2) / 3);

const chunkArray = (array: any[], size: number) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
};

const PostGridItem = ({ post, onPress }: { post: SocialPost; onPress: () => void }) => {
  const imageUri = post.media?.[0]?.url || post.original_media?.[0]?.url || '';
  const isMulti = (post.media?.length || 0) > 1 || (post.original_media?.length || 0) > 1;
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
      {isMulti && (
        <View style={{ position: 'absolute', top: 8, right: 8 }}>
          <Ionicons name="copy" size={16} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );
};

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

const HashtagRow = ({ tag, postCount, onPress }: { tag: string; postCount: number; onPress: () => void }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 14,
      backgroundColor: '#FFF', borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0',
    }}
    activeOpacity={0.7}
  >
    <View style={{
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: '#FEF2F4', justifyContent: 'center', alignItems: 'center', marginRight: 14,
    }}>
      <Text style={{ fontSize: 18 }}>🔥</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: '#111' }}>#{tag}</Text>
      <Text style={{ fontSize: 13, color: '#999', marginTop: 1 }}>
        {postCount > 1000 ? `${(postCount / 1000).toFixed(1)}K` : postCount} posts
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color="#CCC" />
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

  // ─── Discovery API (idle state) ───────────────────────────────────────────
  const {
    data: discovery,
    isLoading: isLoadingDiscovery,
    refetch: refetchDiscovery,
    isRefetching: isRefetchingDiscovery,
  } = useQuery({
    queryKey: ['explore-discovery'],
    queryFn: () => socialApi.getExploreDiscovery(),
    enabled: !debouncedQuery,
    staleTime: 5 * 60 * 1000,
  });

  // ─── Search results ───────────────────────────────────────────────────────
  const {
    data: searchData,
    isLoading: isLoadingSearch,
    refetch: refetchSearch,
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

  // ─── Build flat list data ─────────────────────────────────────────────────
  const listData = useMemo(() => {
    if (!debouncedQuery) {
      const items: any[] = [];
      const hashtags = discovery?.trending_hashtags ?? [];
      const mediaPosts = discovery?.media_posts ?? [];

      if (hashtags.length > 0) {
        items.push({ type: 'section_header', title: 'Trending', _key: 'hdr-trending' });
        hashtags.slice(0, 10).forEach((h) =>
          items.push({ type: 'hashtag_row', ...h, _key: `hashtag-${h.tag}` })
        );
      }
      if (mediaPosts.length > 0) {
        items.push({ type: 'section_header', title: 'Explore', _key: 'hdr-explore' });
        chunkArray(mediaPosts, 3).forEach((chunk, i) =>
          items.push({ type: 'post_grid_row', posts: chunk, _key: `discovery-grid-${i}` })
        );
      }
      return items;
    }

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
  }, [debouncedQuery, discovery, searchResults, activeTab, isLoadingSearch]);

  const renderItem = useCallback(({ item }: { item: any }) => {
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
    if (item.type === 'hashtag_row') {
      return (
        <HashtagRow
          tag={item.tag}
          postCount={item.post_count}
          onPress={() => router.push(`/(app)/hashtag/${item.tag}`)}
        />
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
            source={{ uri: item.profile_image_url || undefined }}
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

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      <Animated.FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item) => item._key || item.post_id || String(item.user_id) || Math.random().toString()}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: insets.top + stickyHeaderHeight,
          paddingBottom: 100,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingDiscovery}
            onRefresh={() => (debouncedQuery ? refetchSearch() : refetchDiscovery())}
            tintColor="#A03048"
          />
        }
        ListFooterComponent={() =>
          isLoadingDiscovery || isLoadingSearch ? (
            <View style={{ paddingVertical: 20 }}>
              <ActivityIndicator color="#A03048" />
            </View>
          ) : null
        }
      />

      <SearchHeader
        placeholders={['Search users', 'Search vets', 'Search rescue shelters', 'Search posts']}
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

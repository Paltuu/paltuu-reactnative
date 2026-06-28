import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, Dimensions, Pressable, ActivityIndicator,
  Modal,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { HEADER_HEIGHT } from '../../src/components/common/MainHeader';
import { useHeaderContext } from '../../src/context/HeaderContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { socialApi, SocialPost, SocialProfile } from '../../src/api/social';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../src/stores/authStore';
import PostCard from '../../src/components/social/PostCard';
import { useSocialActions } from '../../src/hooks/useSocialActions';
import { QuickProfileModal } from '../../src/components/social/QuickProfileModal';

// (Layout constants are now managed inside the shared PostCard)

// Re-exported for existing importers that referenced it from this screen.
export { QuickProfileModal };

export const MOCK_POSTS: SocialPost[] = [
  {
    post_id: 'mock_1',
    user_id: 159,
    content: 'My Persian cat Simba loves the afternoon sun! ☀️🐱 Always finding the warm spots in the house. #PersianCat #CatLovers #Paltuu',
    like_count: 42,
    comment_count: 5,
    repost_count: 2,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
    post_type: 'image',
    author_name: 'Ayesha Khan',
    author_image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    social_username: 'ayesha_khan',
    is_liked: false,
    media: [
      {
        media_id: 'media_mock_1',
        post_id: 'mock_1',
        media_type: 'image',
        url: 'https://images.unsplash.com/photo-1618826411640-d6df44dd3f7a?w=800',
        ordering: 0,
      }
    ],
  },
  {
    post_id: 'mock_2',
    user_id: 122,
    content: "Early morning walk with Bruno! 🐾 He's fully energetic and ready for the week. Look at that smile! #GoldenRetriever #DogWalk #PaltuuPK",
    like_count: 89,
    comment_count: 12,
    repost_count: 4,
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    post_type: 'image',
    author_name: 'Zain Ahmed',
    author_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    social_username: 'zain_ahmed',
    is_liked: true,
    media: [
      {
        media_id: 'media_mock_2',
        post_id: 'mock_2',
        media_type: 'image',
        url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800',
        ordering: 0,
      }
    ],
  },
  {
    post_id: 'mock_3',
    user_id: 87,
    content: 'Brought home some premium cat food from the Paltuu Bazaar today! 🛍️ Simba highly approves of the new salmon flavor. Definitely recommend checking out the bazaar section. #CatFood #PaltuuBazaar #HappyPet',
    like_count: 56,
    comment_count: 7,
    repost_count: 1,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    post_type: 'image',
    author_name: 'Mariam Shah',
    author_image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    social_username: 'mariam_shah',
    is_liked: false,
    media: [
      {
        media_id: 'media_mock_3',
        post_id: 'mock_3',
        media_type: 'image',
        url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800',
        ordering: 0,
      }
    ],
  },
  {
    post_id: 'mock_4',
    user_id: 121,
    content: "Adopt, don't shop! ❤️ Just wanted to share a friendly reminder to check the adoption listings on Paltuu. So many lovely rescue pets are waiting for their forever homes. #AdoptDontShop #RescuePet #DogLovers",
    like_count: 110,
    comment_count: 18,
    repost_count: 9,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    post_type: 'image',
    author_name: 'Bilal Raza',
    author_image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    social_username: 'bilal_raza',
    is_liked: true,
    media: [
      {
        media_id: 'media_mock_4',
        post_id: 'mock_4',
        media_type: 'image',
        url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800',
        ordering: 0,
      }
    ],
  }
];

/* ── Separator ── */
const Separator = () => (
  <View style={{ height: 1, backgroundColor: '#F3F4F6' }} />
);

const TAB_HEIGHT = 42;

/* ── Screen ── */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onScroll } = useHeaderContext();

  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [playingPostId, setPlayingPostId] = useState<string | null>(null);

  // Check if user has interest picks (for cold-start banner)
  const { data: interestsData } = useQuery({
    queryKey: ['user-interests-check'],
    queryFn: () => socialApi.getInterests(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const hasPicks = interestsData?.has_picks ?? false;
  const forYouMode = hasPicks ? 'personalized' : 'global';

  // Only autoplay the video that's ≥60% visible in viewport
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      const first = viewableItems[0];
      setPlayingPostId(first?.item?.post_id ?? null);
    },
    []
  );
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const openComposeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-1_000_000, 10])
        .failOffsetY([-20, 20])
        .onEnd((event) => {
          if (event.translationX > 60 || event.velocityX > 500) {
            runOnJS(router.push)('/create-post');
          }
        }),
    [router]
  );

  const feedMode = activeTab === 'following' ? 'following' : forYouMode;

  const {
    data, fetchNextPage, hasNextPage,
    isFetchingNextPage, isLoading,
  } = useInfiniteQuery({
    queryKey: ['social-feed', feedMode],
    queryFn: ({ pageParam }) => socialApi.getFeed(pageParam as string | null, 20, feedMode),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  });

  const posts = useMemo(() => {
    return data?.pages.flatMap(p => p.posts) ?? [];
  }, [data]);

  const topOffset = HEADER_HEIGHT + insets.top;

  if (isLoading && !posts.length) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#a03048" size="large" />
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
            isVideoPlaying={playingPostId === item.post_id}
          />
        )}
        keyExtractor={item => item.post_id}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={{
          paddingTop: topOffset + TAB_HEIGHT,
          paddingBottom: 100,
        }}
        ListHeaderComponent={
          !hasPicks && activeTab === 'for-you' ? (
            <TouchableOpacity
              onPress={() => router.push('/interests')}
              activeOpacity={0.8}
              className="mx-4 my-3 bg-primary/10 border border-primary/20 rounded-xl p-4 flex-row items-center gap-3"
            >
              <View className="flex-1">
                <Text className="font-headingSemi text-sm text-primary mb-0.5">Personalise your feed</Text>
                <Text className="font-body text-xs text-gray-600">Tell us what pets you love and we'll show you more of it.</Text>
              </View>
              <Text className="font-headingSemi text-sm text-primary">Go →</Text>
            </TouchableOpacity>
          ) : null
        }
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() =>
          isFetchingNextPage
            ? <View className="py-5"><ActivityIndicator color="#a03048" /></View>
            : <View className="h-5" />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Tab bar — sits below the main header */}
      <View
        style={{
          position: 'absolute',
          top: topOffset,
          left: 0,
          right: 0,
          height: TAB_HEIGHT,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#F3F4F6',
          flexDirection: 'row',
        }}
      >
        {(['for-you', 'following'] as const).map(tab => {
          const label = tab === 'for-you' ? 'For You' : 'Following';
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text
                style={{
                  fontFamily: active ? 'Manrope-SemiBold' : 'Manrope-Regular',
                  fontSize: 14,
                  color: active ? '#a03048' : '#6B7280',
                }}
              >
                {label}
              </Text>
              {active && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    height: 2,
                    width: 48,
                    backgroundColor: '#a03048',
                    borderRadius: 1,
                  }}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Left-edge swipe to open composer */}
      <GestureDetector gesture={openComposeGesture}>
        <View
          pointerEvents="box-only"
          style={{
            position: 'absolute',
            left: 0,
            top: topOffset + TAB_HEIGHT,
            bottom: 0,
            width: 20,
          }}
        />
      </GestureDetector>

      <QuickProfileModal
        userId={selectedUserId}
        visible={selectedUserId !== null}
        onClose={() => setSelectedUserId(null)}
      />
    </View>
  );
}
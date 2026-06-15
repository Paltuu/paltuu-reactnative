import React, { useMemo, useState, useRef, useCallback } from 'react';
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
import PostCard from '../../src/components/social/PostCard';
import { useSocialActions } from '../../src/hooks/useSocialActions';

// (Layout constants are now managed inside the shared PostCard)

/* ── Quick Profile Modal ── */
export const QuickProfileModal = ({
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

  const { toggleFollow, isFollowing } = useSocialActions();

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
                    router.push(`/(app)/profile/${profile.user_id}`);
                  }}
                >
                  <Text className="text-white font-bold">View Full Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 py-3.5 rounded-xl items-center ${
                    profile.is_following ? 'bg-gray-100' : 'bg-primary'
                  }`}
                  onPress={() => toggleFollow(userId!)}
                  disabled={isFollowing}
                >
                  {isFollowing ? (
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

/* ── Screen ── */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onScroll } = useHeaderContext();
  
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [playingPostId, setPlayingPostId] = useState<string | null>(null);

  // Only autoplay the video that's ≥60% visible in viewport
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      const first = viewableItems[0];
      setPlayingPostId(first?.item?.post_id ?? null);
    },
    []
  );
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const {
    data, fetchNextPage, hasNextPage,
    isFetchingNextPage, refetch, isLoading, isRefetching,
  } = useInfiniteQuery({
    queryKey: ['social-feed'],
    queryFn: ({ pageParam }) => socialApi.getFeed(pageParam as string | null, 20, 'global'),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  });

  const posts = useMemo(() => {
    return data?.pages.flatMap(p => p.posts) ?? [];
  }, [data]);

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
            onPress={() => router.push(`/(app)/post/${item.post_id}`)}
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
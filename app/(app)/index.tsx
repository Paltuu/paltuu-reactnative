import React, { useMemo, useState } from 'react';
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

  const followMutation = useMutation({
    mutationFn: () => socialApi.toggleFollow(userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-profile-quick', userId] });
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
    },
  });

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
                    router.push(`/profile/${profile.user_id}`);
                  }}
                >
                  <Text className="text-white font-bold">View Full Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 py-3.5 rounded-xl items-center ${
                    profile.is_following ? 'bg-gray-100' : 'bg-primary'
                  }`}
                  onPress={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                >
                  {followMutation.isPending ? (
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

  const {
    data, fetchNextPage, hasNextPage,
    isFetchingNextPage, refetch, isLoading, isRefetching,
  } = useInfiniteQuery({
    queryKey: ['social-feed'],
    queryFn: ({ pageParam }) => socialApi.getFeed(pageParam as string | null, 20, 'global'),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  });

  const posts = useMemo(() => data?.pages.flatMap(p => p.posts) ?? [], [data]);

  if (isLoading && !posts.length) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#A03048" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F8F9FA]">
      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPress={() => router.push(`/post/${item.post_id}`)}
            onPlusPress={(uid) => setSelectedUserId(uid)}
          />
        )}
        keyExtractor={item => item.post_id}
        onScroll={onScroll}
        scrollEventThrottle={16}
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
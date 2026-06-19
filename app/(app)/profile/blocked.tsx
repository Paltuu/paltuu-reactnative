import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi } from '../../../src/api/social';
import Toast from 'react-native-toast-message';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching
  } = useInfiniteQuery({
    queryKey: ['blocked-users'],
    queryFn: ({ pageParam = null }) => socialApi.getBlockedUsers(pageParam ?? undefined),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  });

  const unblockMutation = useMutation({
    mutationFn: (userId: number) => socialApi.unblockUser(userId),
    onSuccess: (_, userId) => {
      Toast.show({ type: 'success', text1: 'User unblocked' });
      // Optimistically update the list
      queryClient.setQueryData(['blocked-users'], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            blocked_users: page.blocked_users.filter((u: any) => u.user_id !== userId)
          }))
        };
      });
      // Invalidate feed and profile since they might be unblocked now
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
      queryClient.invalidateQueries({ queryKey: ['social-profile', userId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['social-profile', userId] });
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Failed to unblock user' });
    }
  });

  const handleUnblock = (user: any) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${user.display_name}? They will be able to see your posts and profile again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unblock', style: 'default', onPress: () => unblockMutation.mutate(user.user_id) },
      ]
    );
  };

  const blockedUsers = data?.pages.flatMap((page) => page.blocked_users) || [];

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-1">
          <Feather name="arrow-left" size={24} color="#111" />
        </TouchableOpacity>
        <Text className="font-heading text-xl text-dark">Blocked Users</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#A03048" />
        </View>
      ) : blockedUsers.length > 0 ? (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.user_id.toString()}
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          onEndReached={() => {
            if (hasNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <Text className="font-body text-sm text-gray-500 mb-6">
              When you block someone, they cannot view your profile, posts, or interact with you.
            </Text>
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push(`/(app)/profile/${item.user_id}`)}
              className={`flex-row items-center justify-between p-4 bg-gray-50 border border-gray-100 ${index === 0 ? 'rounded-t-2xl' : ''
                } ${index === blockedUsers.length - 1 ? 'rounded-b-2xl' : ''} ${index !== blockedUsers.length - 1 ? 'border-b-0' : ''
                }`}
            >
              <View className="flex-row items-center flex-1">
                {item.avatar_url ? (
                  <Image
                    source={{ uri: item.avatar_url }}
                    className="w-12 h-12 rounded-full mr-3 bg-gray-200"
                  />
                ) : (
                  <View className="w-12 h-12 rounded-full mr-3 bg-primary/10 items-center justify-center">
                    <Text className="text-primary font-headingSemi text-lg">
                      {(item.display_name || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View className="flex-1 pr-2">
                  <Text className="font-headingSemi text-dark text-base" numberOfLines={1}>{item.display_name}</Text>
                  <Text className="font-body text-gray-500 text-sm" numberOfLines={1}>
                    @{item.username || 'user'}
                  </Text>
                  {item.blocked_at && (
                    <Text className="font-body text-gray-400 text-xs mt-0.5">
                      Blocked on {new Date(item.blocked_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); handleUnblock(item); }}
                className="bg-primary/10 px-4 py-2 rounded-xl"
              >
                <Text className="text-primary font-headingSemi text-xs">Unblock</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color="#A03048" style={{ marginTop: 20 }} />
            ) : null
          }
        />
      ) : (
        <View className="flex-1 justify-center items-center px-10">
          <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4">
            <Feather name="user-check" size={32} color="#9CA3AF" />
          </View>
          <Text className="font-heading text-lg text-dark text-center">No Blocked Users</Text>
          <Text className="font-body text-gray-400 text-center mt-2">
            You haven't blocked anyone yet. Blocked users will appear here.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

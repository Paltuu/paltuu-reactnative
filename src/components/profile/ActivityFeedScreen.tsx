import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ActivityItem } from '../../api/social';
import { mentionsToPlainText } from '../social/MentionText';
import { handleDeepLink } from '../../services/deepLinks';
import { formatDistanceToNowStrict } from 'date-fns';

type FetchPage = (cursor?: string) => Promise<{
  items: ActivityItem[];
  next_cursor: string | null;
  has_more: boolean;
}>;

function ActivityFeedScreen({
  title,
  queryKey,
  fetchPage,
  emptyTitle,
  emptyMessage,
  getSubtitle,
}: {
  title: string;
  queryKey: string;
  fetchPage: FetchPage;
  emptyTitle: string;
  emptyMessage: string;
  getSubtitle: (item: ActivityItem) => string;
}) {
  const router = useRouter();

  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: [queryKey],
    queryFn: ({ pageParam = null }) => fetchPage(pageParam ?? undefined),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage?.next_cursor ?? undefined,
  });

  const items = data?.pages.flatMap((page) => page.items ?? []) ?? [];

  const onPressItem = (item: ActivityItem) => {
    if (item.kind === 'deleted_post' || item.kind === 'deleted_comment') return;
    if (item.deep_link) {
      handleDeepLink(item.deep_link);
      return;
    }
    if (item.post_id) {
      router.push(`/post/${item.post_id}` as any);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 py-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-1">
          <Feather name="arrow-left" size={24} color="#111" />
        </TouchableOpacity>
        <Text className="font-heading text-xl text-dark">{title}</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#A03048" />
        </View>
      ) : isError ? (
        <View className="flex-1 justify-center items-center px-8">
          <Feather name="alert-circle" size={48} color="#D1D5DB" />
          <Text className="font-heading text-lg text-dark text-center mt-4">Couldn't load activity</Text>
          <Text className="font-body text-sm text-gray-500 text-center mt-2">
            Check your connection and try again.
          </Text>
          <TouchableOpacity onPress={() => refetch()} className="mt-4 px-5 py-2.5 rounded-full bg-[#A03048]">
            <Text className="font-body text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <Feather name="activity" size={48} color="#D1D5DB" />
          <Text className="font-heading text-lg text-dark text-center mt-4">{emptyTitle}</Text>
          <Text className="font-body text-sm text-gray-500 text-center mt-2">{emptyMessage}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          onEndReached={() => {
            if (hasNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-6">
                <ActivityIndicator color="#A03048" />
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const preview = mentionsToPlainText(item.preview_text) || 'No preview';
            return (
              <TouchableOpacity
                onPress={() => onPressItem(item)}
                activeOpacity={item.kind.startsWith('deleted') ? 1 : 0.7}
                disabled={item.kind === 'deleted_post' || item.kind === 'deleted_comment'}
                className="flex-row items-center px-5 py-4 border-b border-gray-50"
              >
                <View className="flex-1 pr-3">
                  <Text className="font-body text-sm text-dark" numberOfLines={2}>
                    {preview}
                  </Text>
                  <Text className="font-body text-xs text-gray-500 mt-1" numberOfLines={1}>
                    {getSubtitle(item)}
                  </Text>
                  <Text className="font-body text-[11px] text-gray-400 mt-1">
                    {formatDistanceToNowStrict(new Date(item.created_at), { addSuffix: true })}
                  </Text>
                </View>
                {item.thumbnail_url ? (
                  <Image
                    source={{ uri: item.thumbnail_url }}
                    className="w-12 h-12 rounded-lg bg-gray-100"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-12 h-12 rounded-lg bg-gray-100 items-center justify-center">
                    <Feather name="image" size={18} color="#9CA3AF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

export { ActivityFeedScreen };

import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi, FollowRequest } from '../src/api/social';
import { NO_PROFILE_IMAGE } from '../src/constants/images';
import { COLORS } from '../src/constants/colors';

export default function FollowRequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['follow-requests'],
    queryFn: ({ pageParam }) => socialApi.getFollowRequests({ limit: 20, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });

  const requests: FollowRequest[] = data?.pages.flatMap((page) => page.requests) ?? [];

  const removeFromLists = useCallback(
    (followId: string | number) => {
      queryClient.setQueriesData({ queryKey: ['follow-requests'] }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            requests: page.requests.filter((r: FollowRequest) => String(r.follow_id) !== String(followId)),
          })),
        };
      });
      queryClient.setQueryData(['follow-requests-preview'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          total: Math.max(0, old.total - 1),
          requests: old.requests.filter((r: FollowRequest) => String(r.follow_id) !== String(followId)),
        };
      });
    },
    [queryClient]
  );

  const acceptMutation = useMutation({
    mutationFn: (followId: string | number) => socialApi.acceptFollowRequest(followId),
    onMutate: (followId) => removeFromLists(followId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-requests'] });
      queryClient.invalidateQueries({ queryKey: ['follow-requests-preview'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (followId: string | number) => socialApi.rejectFollowRequest(followId),
    onMutate: (followId) => removeFromLists(followId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-requests'] });
      queryClient.invalidateQueries({ queryKey: ['follow-requests-preview'] });
    },
  });

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: FollowRequest }) => (
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => router.push(`/(app)/profile/${item.user_id}`)}
        >
          <Image
            source={item.profile_image_url ? { uri: item.profile_image_url } : NO_PROFILE_IMAGE}
            style={styles.avatar}
            contentFit="cover"
          />
          <View style={styles.userText}>
            <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
            {!!item.social_username && (
              <Text style={styles.userHandle} numberOfLines={1}>@{item.social_username}</Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => acceptMutation.mutate(item.follow_id)}
          >
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => rejectMutation.mutate(item.follow_id)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [router, acceptMutation, rejectMutation]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Follow requests</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.follow_id)}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: 24 }}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={60} color="#E5E7EB" />
              <Text style={styles.emptyText}>No pending follow requests</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 56,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  listContent: { paddingTop: 8, paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6' },
  userText: { marginLeft: 12, flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', color: '#111' },
  userHandle: { fontSize: 13, color: '#6B7280', marginTop: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  confirmButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  deleteButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  deleteButtonText: { color: '#111', fontSize: 13, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 12, color: '#9CA3AF', fontSize: 15 },
});

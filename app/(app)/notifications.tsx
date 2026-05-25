import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  RefreshControl, Pressable, FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, Notification } from '../../src/api/notifications';
import { handleDeepLink } from '../../src/services/deepLinks';
import { useAuthStore } from '../../src/stores/authStore';

const PRIMARY = '#A03048';
const MUTED = '#C4C4C4';

/* ── Notification type config ── */
const TYPE_CONFIG: Record<string, {
  icon: string;
  iconLib: 'ion' | 'mci';
  color: string;
  bg: string;
}> = {
  // Social
  social_post_like: { icon: 'paw', iconLib: 'ion', color: PRIMARY, bg: '#fdf0f2' },
  social_post_comment: { icon: 'chatbubble', iconLib: 'ion', color: '#7c3aed', bg: '#f5f3ff' },
  social_comment_reply: { icon: 'return-down-forward', iconLib: 'ion', color: '#7c3aed', bg: '#f5f3ff' },
  social_comment_like: { icon: 'paw-outline', iconLib: 'ion', color: PRIMARY, bg: '#fdf0f2' },
  social_new_follower: { icon: 'person-add', iconLib: 'ion', color: '#059669', bg: '#f0fdf4' },
  social_mention_post: { icon: 'at', iconLib: 'ion', color: '#0ea5e9', bg: '#f0f9ff' },
  social_mention_comment: { icon: 'at', iconLib: 'ion', color: '#0ea5e9', bg: '#f0f9ff' },
  social_repost: { icon: 'repeat', iconLib: 'ion', color: '#059669', bg: '#f0fdf4' },

  // Adoptions
  adoption_new_application: { icon: 'paw', iconLib: 'mci', color: '#d97706', bg: '#fffbeb' },
  adoption_application_approved: { icon: 'check-circle', iconLib: 'mci', color: '#059669', bg: '#f0fdf4' },
  adoption_application_rejected: { icon: 'close-circle', iconLib: 'mci', color: '#dc2626', bg: '#fef2f2' },
  adoption_new_listing_match: { icon: 'star', iconLib: 'ion', color: '#d97706', bg: '#fffbeb' },
  adoption_listing_approved: { icon: 'check-circle', iconLib: 'mci', color: '#059669', bg: '#f0fdf4' },

  // Bazaar (E-Commerce)
  bazaar_order_confirmed: { icon: 'package-variant', iconLib: 'mci', color: '#7c3aed', bg: '#f5f3ff' },
  bazaar_order_shipped: { icon: 'truck', iconLib: 'mci', color: '#7c3aed', bg: '#f5f3ff' },
  bazaar_order_delivered: { icon: 'check-circle', iconLib: 'mci', color: '#059669', bg: '#f0fdf4' },
  bazaar_payment_verified: { icon: 'cash', iconLib: 'mci', color: '#059669', bg: '#f0fdf4' },
  bazaar_new_vendor_order: { icon: 'storefront', iconLib: 'ion', color: '#7c3aed', bg: '#f5f3ff' },
  bazaar_abandoned_cart: { icon: 'cart-outline', iconLib: 'ion', color: '#dc2626', bg: '#fef2f2' },

  // Pet Care
  petcare_review_approved: { icon: 'star', iconLib: 'ion', color: '#059669', bg: '#f0fdf4' },
  petcare_vet_verified: { icon: 'shield-checkmark', iconLib: 'ion', color: '#0ea5e9', bg: '#f0f9ff' },

  // System
  system_broadcast: { icon: 'megaphone', iconLib: 'ion', color: PRIMARY, bg: '#fdf0f2' },
  system_platform_update: { icon: 'phone-portrait-outline', iconLib: 'ion', color: PRIMARY, bg: '#fdf0f2' },
  system_lost_found_match: { icon: 'map-marker', iconLib: 'mci', color: '#d97706', bg: '#fffbeb' },
};

/* ── Format Time ── */
const formatTime = (dateString: string) => {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();

    if (isNaN(date.getTime())) return '';

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (e) {
    return '';
  }
};

/* ── Actor avatar ── */
const ActorAvatar = ({ name, uri, size = 48 }: { name: string; uri?: string | null; size?: number }) => {
  const initials = (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    );
  }
  const colors = ['#fdf0f2', '#f0fdf4', '#f5f3ff', '#f0f9ff', '#fffbeb'];
  const textColors = [PRIMARY, '#059669', '#7c3aed', '#0ea5e9', '#d97706'];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors[idx],
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: size * 0.35, fontWeight: '700', color: textColors[idx] }}>
        {initials}
      </Text>
    </View>
  );
};

/* ── Type icon badge ── */
const TypeBadge = ({ type }: { type: string }) => {
  const config = TYPE_CONFIG[type];
  if (!config) return null;
  return (
    <View style={{
      position: 'absolute', bottom: -2, right: -2,
      width: 18, height: 18, borderRadius: 9,
      backgroundColor: config.bg,
      borderWidth: 2, borderColor: '#fff',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {config.iconLib === 'ion'
        ? <Ionicons name={config.icon as any} size={9} color={config.color} />
        : <MaterialCommunityIcons name={config.icon as any} size={9} color={config.color} />
      }
    </View>
  );
};

/* ── Single notification row ── */
const NotificationRow = ({
  item, onPress, onLongPress,
}: {
  item: Notification;
  onPress: (item: Notification) => void;
  onLongPress: (item: Notification) => void;
}) => {
  const actorName = item.sender?.name || item.title || 'System';
  const avatarUri = item.sender?.profile_image_url || item.image_url;

  return (
    <Pressable
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: pressed
          ? '#f9f9f9'
          : item.is_read ? '#fff' : '#fdf7f8',
      })}
    >
      {/* Avatar + badge */}
      <View style={{ position: 'relative' }}>
        <ActorAvatar name={actorName} uri={avatarUri} />
        <TypeBadge type={item.type} />
      </View>

      {/* Text Content */}
      <View style={{ flex: 1, marginLeft: 12, marginRight: 8, gap: 2 }}>
        <Text style={{
          fontSize: 14,
          color: '#111',
          lineHeight: 18,
          letterSpacing: -0.1,
        }}>
          <Text style={{ fontWeight: '700' }}>{actorName} </Text>
          {item.body}
          <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>  {formatTime(item.created_at)}</Text>
        </Text>
      </View>

      {/* Right Column: Unread Dot or image preview */}
      <View style={{ alignItems: 'flex-end', minWidth: 44 }}>
        {item.image_url && item.type !== 'system_broadcast' ? (
          <Image
            source={{ uri: item.image_url }}
            style={{ width: 44, height: 44, borderRadius: 6 }}
            contentFit="cover"
          />
        ) : (
          !item.is_read && (
            <View style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: PRIMARY,
              marginRight: 4,
            }} />
          )
        )}
      </View>
    </Pressable>
  );
};

/* ── Filter tabs ── */
const FILTERS = ['All', 'Social', 'Adoptions', 'Orders'];

const FilterTabs = ({
  active, onChange,
}: {
  active: string;
  onChange: (f: string) => void;
}) => (
  <View style={{
    flexDirection: 'row', paddingHorizontal: 16,
    paddingVertical: 10, gap: 8,
    borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  }}>
    {FILTERS.map(f => (
      <TouchableOpacity
        key={f}
        onPress={() => onChange(f)}
        style={{
          paddingHorizontal: 14, paddingVertical: 6,
          borderRadius: 20,
          backgroundColor: active === f ? PRIMARY : '#F3F4F6',
        }}
      >
        <Text style={{
          fontSize: 13, fontWeight: '600',
          color: active === f ? '#fff' : '#6B7280',
        }}>
          {f}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

/* ── Main screen ── */
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('All');

  // Infinite query for cursor paginated notifications
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['notifications', filter],
    queryFn: ({ pageParam }) => notificationsApi.getNotifications({
      limit: 20,
      cursor: pageParam,
      filter: filter === 'All' ? undefined : filter.toLowerCase(),
    }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });

  // Compile all notifications from multiple pages
  const notificationsList: Notification[] = data?.pages.flatMap((page) => page.notifications) ?? [];
  const unreadCount = data?.pages?.[0]?.unread_count ?? 0;

  // Mutation to mark single notification as read optimistically
  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead({ notification_id: id }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['unread-count'] });

      // Optimistic updates
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            notifications: page.notifications.map((n: Notification) =>
              n.notification_id === id ? { ...n, is_read: true } : n
            ),
          })),
        };
      });

      queryClient.setQueryData(['unread-count'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          unread_count: Math.max(0, old.unread_count - 1),
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  // Mutation to mark all notifications as read
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markRead({ mark_all_read: true }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['unread-count'] });

      queryClient.setQueriesData({ queryKey: ['notifications'] }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            notifications: page.notifications.map((n: Notification) => ({ ...n, is_read: true })),
          })),
        };
      });

      queryClient.setQueryData(['unread-count'], { unread_count: 0 });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mutation to delete a notification
  const deleteMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', filter] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const handlePress = useCallback((item: Notification) => {
    // Mark as read immediately on click
    if (!item.is_read) {
      markReadMutation.mutate(item.notification_id);
    }
    // Route using the deep link router safely
    if (item.deep_link) {
      handleDeepLink(item.deep_link);
    }
  }, [markReadMutation]);

  const handleLongPress = useCallback((item: Notification) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(item.notification_id),
        },
      ]
    );
  }, [deleteMutation]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <View style={{ flex: 1, backgroundColor: '#FDF7F8', paddingTop: insets.top }}>

      {/* Header */}
      <View style={{
        backgroundColor: '#fff',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6',
      }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111', letterSpacing: -0.5 }}>
          Notifications
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() => markAllReadMutation.mutate()} hitSlop={8}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: PRIMARY }}>
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <FilterTabs active={filter} onChange={setFilter} />

      {/* Loading Skeleton */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        /* Paginated FlatList */
        <FlatList
          data={notificationsList}
          keyExtractor={item => String(item.notification_id)}
          renderItem={({ item }) => (
            <NotificationRow
              item={item}
              onPress={handlePress}
              onLongPress={handleLongPress}
            />
          )}
          ItemSeparatorComponent={() => (
            <View style={{ height: 0.5, backgroundColor: '#F3F4F6', marginLeft: 78 }} />
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="small" color={PRIMARY} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80, gap: 10 }}>
              <Ionicons name="notifications-off-outline" size={48} color={MUTED} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#374151' }}>
                No notifications
              </Text>
              <Text style={{ fontSize: 14, color: '#9CA3AF' }}>
                {filter !== 'All' ? `No ${filter.toLowerCase()} notifications yet` : "You're all caught up"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

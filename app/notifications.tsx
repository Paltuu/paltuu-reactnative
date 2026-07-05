import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  Pressable,
  SectionList,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { notificationsApi, Notification } from '../src/api/notifications';
import { handleDeepLink } from '../src/services/deepLinks';
import { useAuthStore } from '../src/stores/authStore';
import { NO_PROFILE_IMAGE } from '../src/constants/images';

// Paltuu Primary Branding Color
const PRIMARY = '#A03048';

/* ── Notification Type UI Styling Config ── */
const TYPE_CONFIG: Record<
  string,
  {
    icon: string;
    iconLib: 'ion' | 'mci';
    color: string;
    bgClass: string;
  }
> = {
  // Social
  social_post_like: { icon: 'paw', iconLib: 'ion', color: PRIMARY, bgClass: 'bg-primarySoft' },
  social_post_comment: { icon: 'chatbubble', iconLib: 'ion', color: '#7C3AED', bgClass: 'bg-purple-50' },
  social_comment_reply: { icon: 'return-down-forward', iconLib: 'ion', color: '#7C3AED', bgClass: 'bg-purple-50' },
  social_comment_like: { icon: 'paw-outline', iconLib: 'ion', color: PRIMARY, bgClass: 'bg-primarySoft' },
  social_new_follower: { icon: 'person-add', iconLib: 'ion', color: '#16A34A', bgClass: 'bg-green-50' },
  social_mention_post: { icon: 'at', iconLib: 'ion', color: '#0EA5E9', bgClass: 'bg-sky-50' },
  social_mention_comment: { icon: 'at', iconLib: 'ion', color: '#0EA5E9', bgClass: 'bg-sky-50' },
  social_repost: { icon: 'repeat', iconLib: 'ion', color: '#16A34A', bgClass: 'bg-green-50' },

  // Adoptions
  adoption_new_application: { icon: 'paw', iconLib: 'mci', color: '#D97706', bgClass: 'bg-amber-50' },
  adoption_application_approved: { icon: 'check-circle', iconLib: 'mci', color: '#16A34A', bgClass: 'bg-green-50' },
  adoption_application_rejected: { icon: 'close-circle', iconLib: 'mci', color: '#EF4444', bgClass: 'bg-red-50' },
  adoption_new_listing_match: { icon: 'star', iconLib: 'ion', color: '#D97706', bgClass: 'bg-amber-50' },
  adoption_listing_approved: { icon: 'check-circle', iconLib: 'mci', color: '#16A34A', bgClass: 'bg-green-50' },

  // Bazaar (E-Commerce)
  bazaar_order_confirmed: { icon: 'package-variant', iconLib: 'mci', color: '#4F46E5', bgClass: 'bg-indigo-50' },
  bazaar_order_shipped: { icon: 'truck', iconLib: 'mci', color: '#4F46E5', bgClass: 'bg-indigo-50' },
  bazaar_order_delivered: { icon: 'check-circle', iconLib: 'mci', color: '#16A34A', bgClass: 'bg-green-50' },
  bazaar_payment_verified: { icon: 'cash', iconLib: 'mci', color: '#16A34A', bgClass: 'bg-green-50' },
  bazaar_new_vendor_order: { icon: 'storefront', iconLib: 'ion', color: '#4F46E5', bgClass: 'bg-indigo-50' },
  bazaar_abandoned_cart: { icon: 'cart-outline', iconLib: 'ion', color: '#EF4444', bgClass: 'bg-red-50' },

  // Pet Care
  petcare_review_approved: { icon: 'star', iconLib: 'ion', color: '#16A34A', bgClass: 'bg-green-50' },
  petcare_vet_verified: { icon: 'shield-checkmark', iconLib: 'ion', color: '#0EA5E9', bgClass: 'bg-sky-50' },

  // System
  system_broadcast: { icon: 'megaphone', iconLib: 'ion', color: PRIMARY, bgClass: 'bg-primarySoft' },
  system_platform_update: { icon: 'phone-portrait-outline', iconLib: 'ion', color: PRIMARY, bgClass: 'bg-primarySoft' },
  system_lost_found_match: { icon: 'map-marker', iconLib: 'mci', color: '#D97706', bgClass: 'bg-amber-50' },
};

/* ── Relative Time Formatter ── */
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

/* ── Bold quotes and pet/post titles in body text ── */
const formatBodyText = (text: string) => {
  if (!text) return null;
  // Bolds texts between double quotes (e.g. comment snippets or post titles)
  const parts = text.split(/("[^"]*")/g);
  return parts.map((part, index) => {
    if (part.startsWith('"') && part.endsWith('"')) {
      return (
        <Text key={index} className="font-headingSemi text-dark text-sm">
          {part}
        </Text>
      );
    }
    return <Text key={index}>{part}</Text>;
  });
};

/* ── Group Notifications by Date Helper ── */
interface NotificationSection {
  title: string;
  data: Notification[];
}

const groupNotificationsByDate = (notifications: Notification[]): NotificationSection[] => {
  const now = new Date();

  const bucketFor = (createdAt: Date): string => {
    const diffMs = now.getTime() - createdAt.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays < 1) return 'Today';
    if (diffDays < 2) return 'Yesterday';
    if (diffDays < 7) return 'This week';
    if (diffDays < 30) return 'Last 30 days';
    return 'Earlier';
  };

  const order = ['Today', 'Yesterday', 'This week', 'Last 30 days', 'Earlier'];
  const groups: Record<string, Notification[]> = {};

  notifications.forEach((item) => {
    const createdAt = new Date(item.created_at);
    const key = isNaN(createdAt.getTime()) ? 'Earlier' : bucketFor(createdAt);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  return order
    .filter((key) => groups[key]?.length > 0)
    .map((key) => ({ title: key, data: groups[key] }));
};

/* ── Actor Avatar with no-profile fallback ── */
const ActorAvatar = ({ name, uri, size = 48 }: { name: string; uri?: string | null; size?: number }) => (
  <Image
    source={uri ? { uri } : NO_PROFILE_IMAGE}
    style={{ width: size, height: size, borderRadius: size / 2 }}
    contentFit="cover"
    className="border border-gray-100"
  />
);

/* ── Type Badge overlay for Avatar ── */
const TypeBadge = ({ type }: { type: string }) => {
  const config = TYPE_CONFIG[type];
  if (!config) return null;

  return (
    <View
      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${config.bgClass} border-2 border-white items-center justify-center shadow-sm`}
    >
      {config.iconLib === 'ion' ? (
        <Ionicons name={config.icon as any} size={10} color={config.color} />
      ) : (
        <MaterialCommunityIcons name={config.icon as any} size={10} color={config.color} />
      )}
    </View>
  );
};

/* ── Single Notification Row Item ── */
const NotificationRow = ({
  item,
  onPress,
  onOptionsPress,
}: {
  item: Notification;
  onPress: (item: Notification) => void;
  onOptionsPress: (item: Notification) => void;
}) => {
  const actorName = item.sender?.name || item.title || 'System';
  const avatarUri = item.sender?.profile_image_url || item.image_url;

  return (
    <Pressable
      onPress={() => onPress(item)}
      className="flex-row items-center mx-4 my-2 px-4 py-4 rounded-2xl bg-white"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {/* Avatar column */}
      <View className="relative mr-3.5">
        <ActorAvatar name={actorName} uri={avatarUri} />
        <TypeBadge type={item.type} />
      </View>

      {/* Message Text column */}
      <View className="flex-1 mr-2 gap-1">
        <Text className="font-body text-sm text-dark leading-5" numberOfLines={3}>
          <Text className="font-headingSemi text-dark">{actorName} </Text>
          {formatBodyText(item.body)}
        </Text>
        <Text className="font-body text-xs text-gray-light">{formatTime(item.created_at)}</Text>
      </View>

      {/* Right Column: Photo preview OR unread dot + ellipsis */}
      <View className="flex-col items-end gap-2">
        {item.image_url && item.type !== 'system_broadcast' ? (
          <Image
            source={{ uri: item.image_url }}
            className="w-11 h-11 rounded-xl border border-gray-100"
            contentFit="cover"
          />
        ) : (
          !item.is_read && <View className="w-2 h-2 rounded-full bg-primary" />
        )}
        <TouchableOpacity
          onPress={() => onOptionsPress(item)}
          className="w-8 h-8 items-center justify-center rounded-full active:bg-gray-100"
          hitSlop={8}
        >
          <Ionicons name="ellipsis-horizontal" size={16} color="#ccc" />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
};

/* ── Pulsing Skeleton Loading State ── */
const NotificationSkeleton = () => {
  const fadeAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0.5, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [fadeAnim]);

  const SkeletonCard = ({ widths }: { widths: [string, string] }) => (
    <View
      className="flex-row items-center mx-4 my-2 px-4 py-4 rounded-2xl bg-white"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
    >
      {/* Avatar */}
      <View className="w-12 h-12 rounded-full bg-gray-200 mr-3.5" />
      {/* Lines */}
      <View className="flex-1 gap-2 mr-2">
        <View style={{ width: widths[0] }} className="h-3.5 bg-gray-200 rounded-full" />
        <View style={{ width: widths[1] }} className="h-3 bg-gray-200 rounded-full" />
      </View>
      {/* Right thumb */}
      <View className="w-11 h-11 rounded-xl bg-gray-200" />
    </View>
  );

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      {/* Section label skeleton */}
      <View className="flex-row items-center mx-6 my-4 gap-3">
        <View className="flex-1 h-[0.5px] bg-gray-200" />
        <View className="h-3 w-16 bg-gray-200 rounded-full" />
        <View className="flex-1 h-[0.5px] bg-gray-200" />
      </View>
      <SkeletonCard widths={['40%', '70%']} />
      <SkeletonCard widths={['55%', '80%']} />
      <SkeletonCard widths={['35%', '60%']} />
      <View className="flex-row items-center mx-6 my-4 gap-3">
        <View className="flex-1 h-[0.5px] bg-gray-200" />
        <View className="h-3 w-20 bg-gray-200 rounded-full" />
        <View className="flex-1 h-[0.5px] bg-gray-200" />
      </View>
      <SkeletonCard widths={['45%', '75%']} />
      <SkeletonCard widths={['50%', '65%']} />
    </Animated.View>
  );
};

/* ── Filter Tabs Component ── */
const FILTERS = ['All', 'Unread', 'Social', 'Adoptions', 'Orders'];

const FilterTabs = ({
  active,
  onChange,
}: {
  active: string;
  onChange: (f: string) => void;
}) => (
  <View className="flex-row py-3 px-4 gap-2 border-b border-gray-100 bg-white">
    {FILTERS.map((f) => (
      <TouchableOpacity
        key={f}
        onPress={() => onChange(f)}
        className={`px-4 py-2 rounded-full ${active === f ? 'bg-primary' : 'bg-gray-100 active:bg-gray-200'}`}
      >
        <Text className={`font-headingSemi text-xs ${active === f ? 'text-white' : 'text-gray'}`}>
          {f}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

/* ── Main Notifications Screen ── */
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [filter, setFilter] = useState('All');

  // Ref for bottom sheet
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const { isAuthenticated } = useAuthStore();

  // Infinite query for cursor paginated notifications
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['notifications', filter],
    queryFn: ({ pageParam }) =>
      notificationsApi.getNotifications({
        limit: 20,
        cursor: pageParam,
        filter: filter === 'All' || filter === 'Unread' ? undefined : filter.toLowerCase(),
        unread_only: filter === 'Unread' ? true : undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });

  // Query actual live unread count
  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated,
  });

  const notificationsList: Notification[] = data?.pages.flatMap((page) => page.notifications) ?? [];
  const unreadCount = unreadData?.unread_count ?? 0;

  // Group notifications dynamically by sections (Today, Yesterday, Earlier)
  const sections = useMemo(() => groupNotificationsByDate(notificationsList), [notificationsList]);

  // Mutation to mark single notification as read
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
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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

  // Mark all as read when screen opens
  useEffect(() => {
    if (unreadCount > 0) {
      markAllReadMutation.mutate();
    }
  }, []);

  // Mutation to delete a notification
  const deleteMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', filter] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const handlePress = useCallback(
    (item: Notification) => {
      if (!item.is_read) {
        markReadMutation.mutate(item.notification_id);
      }
      if (item.deep_link) {
        handleDeepLink(item.deep_link);
      }
    },
    [markReadMutation]
  );

  const openOptionsSheet = useCallback((item: Notification) => {
    setSelectedNotification(item);
    bottomSheetModalRef.current?.present();
  }, []);

  const handleMarkAsReadFromSheet = useCallback(() => {
    if (selectedNotification && !selectedNotification.is_read) {
      markReadMutation.mutate(selectedNotification.notification_id);
    }
    bottomSheetModalRef.current?.dismiss();
  }, [selectedNotification, markReadMutation]);

  const handleDeleteFromSheet = useCallback(() => {
    if (selectedNotification) {
      deleteMutation.mutate(selectedNotification.notification_id);
    }
    bottomSheetModalRef.current?.dismiss();
  }, [selectedNotification, deleteMutation]);

  const handleNavigateFromSheet = useCallback(() => {
    if (selectedNotification) {
      handlePress(selectedNotification);
    }
    bottomSheetModalRef.current?.dismiss();
  }, [selectedNotification, handlePress]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Bottom Sheet backdrop renderer
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} />
    ),
    []
  );

  const bottomSheetSnapPoints = useMemo(() => ['36%'], []);

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Pinned Top Navigation Header */}
      <View className="bg-white px-5 py-3 flex-row items-center justify-between border-b border-gray-100">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-gray-50 active:bg-gray-100"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color="#111" />
          </TouchableOpacity>
            <Text className="font-heading text-2xl text-dark">Notifications</Text>
        </View>
      </View>

      {/* Filter Tabs Row */}
      <FilterTabs active={filter} onChange={setFilter} />

      {/* Notification Lists and Skeletons */}
      {isLoading || (sections.length === 0 && isFetching) ? (
        <View className="flex-1 bg-white">
          <NotificationSkeleton />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.notification_id)}
          renderItem={({ item }) => (
            <NotificationRow item={item} onPress={handlePress} onOptionsPress={openOptionsSheet} />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View className="flex-row items-center mx-6 my-4 gap-3">
              <View className="flex-1 h-[0.5px] bg-gray-200" />
              <Text className="font-headingSemi text-[11px] text-gray-400 uppercase tracking-widest">
                {title}
              </Text>
              <View className="flex-1 h-[0.5px] bg-gray-200" />
            </View>
          )}
          ItemSeparatorComponent={null}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-6">
                <ActivityIndicator size="small" color={PRIMARY} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center justify-center pt-24 px-8 gap-3">
              <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center">
                <Ionicons name="notifications-off-outline" size={40} color="#999999" />
              </View>
              <Text className="font-heading text-lg text-dark text-center">
                All caught up!
              </Text>
              <Text className="font-body text-sm text-gray text-center max-w-[260px] leading-5">
                {filter !== 'All'
                  ? `No ${filter.toLowerCase()} notifications found here.`
                  : 'You have no new notifications right now. Enjoy your day!'}
              </Text>
            </View>
          }
        />
      )}

      {/* Actions Options Bottom Sheet */}
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={bottomSheetSnapPoints}
        onDismiss={() => setSelectedNotification(null)}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        backgroundStyle={{
          backgroundColor: 'white',
          borderRadius: 24,
        }}
        handleIndicatorStyle={{
          backgroundColor: '#E5E7EB',
          width: 40,
        }}
      >
        <BottomSheetView className="flex-1 px-5 pt-2 pb-6">
          {selectedNotification && (
            <View className="flex-1 justify-between">
              {/* Header inside Bottom Sheet */}
              <View className="flex-row items-center border-b border-gray-100 pb-3 mb-4 gap-3">
                <ActorAvatar
                  name={selectedNotification.sender?.name || selectedNotification.title || 'System'}
                  uri={selectedNotification.sender?.profile_image_url || selectedNotification.image_url}
                  size={36}
                />
                <View className="flex-1">
                  <Text className="font-headingSemi text-sm text-dark" numberOfLines={1}>
                    {selectedNotification.sender?.name || selectedNotification.title || 'System'}
                  </Text>
                  <Text className="font-body text-xs text-gray" numberOfLines={1}>
                    {selectedNotification.body}
                  </Text>
                </View>
              </View>

              {/* Action Buttons list */}
              <View className="gap-2">
                {/* View Details */}
                <TouchableOpacity
                  onPress={handleNavigateFromSheet}
                  className="flex-row items-center bg-gray-50 active:bg-gray-100 p-3.5 rounded-xl gap-3"
                >
                  <Ionicons name="open-outline" size={20} color="#111" />
                  <Text className="font-headingSemi text-sm text-dark">View details</Text>
                </TouchableOpacity>

                {/* Mark as read if unread */}
                {!selectedNotification.is_read && (
                  <TouchableOpacity
                    onPress={handleMarkAsReadFromSheet}
                    className="flex-row items-center bg-gray-50 active:bg-gray-100 p-3.5 rounded-xl gap-3"
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#111" />
                    <Text className="font-headingSemi text-sm text-dark">Mark as read</Text>
                  </TouchableOpacity>
                )}

                {/* Delete notification */}
                <TouchableOpacity
                  onPress={handleDeleteFromSheet}
                  className="flex-row items-center bg-red-50 active:bg-red-100 p-3.5 rounded-xl gap-3"
                >
                  <Ionicons name="trash-outline" size={20} color="#DC2626" />
                  <Text className="font-headingSemi text-sm text-red-600">Delete notification</Text>
                </TouchableOpacity>
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                onPress={() => bottomSheetModalRef.current?.dismiss()}
                className="w-full border border-gray-200 py-3.5 rounded-xl items-center justify-center mt-3"
              >
                <Text className="font-headingSemi text-sm text-gray">Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

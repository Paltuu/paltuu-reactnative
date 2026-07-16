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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { notificationsApi, Notification } from '../src/api/notifications';
import { handleDeepLink } from '../src/services/deepLinks';
import { useAuthStore } from '../src/stores/authStore';
import { NO_PROFILE_IMAGE, PALTUU_LOGO } from '../src/constants/images';
import { COLORS } from '../src/constants/colors';
import {
  isToday,
  isYesterday,
  differenceInSeconds,
  formatDistanceToNowStrict,
  format,
} from 'date-fns';

// Paltuu brand colors
const PRIMARY = COLORS.primary;

/* ── Smart Relative Time Formatter (date-fns) ── */
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  if (differenceInSeconds(new Date(), date) < 60) return 'Just now';
  if (isToday(date)) return formatDistanceToNowStrict(date, { addSuffix: true });
  if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`;
  return format(date, 'MMM d');
};

/* ── Category split: pets/adoptions vs social (no visible labels) ── */
const isSocialNotification = (type?: string) => (type ?? '').startsWith('social');

/* ── Messages authored by the Paltuu team itself (admin broadcasts, platform
   announcements) — shown with the Paltuu logo instead of a person's name/photo. ── */
const TEAM_BROADCAST_TYPES = new Set([
  'system_admin_broadcast',
  'system_broadcast',
  'system_platform_update',
]);
const isTeamBroadcast = (type?: string) => TEAM_BROADCAST_TYPES.has(type ?? '');

/* ── Notification types whose `image_url` is a person's avatar rather than
   actual post/story/product media. Follower notifications reuse image_url for
   the follower's profile photo — which already appears as the circular avatar
   on the left — so they must NOT render a media square on the right. ── */
const NON_MEDIA_IMAGE_TYPES = new Set(['social_new_follower']);

/* ── Whether a notification carries real media to show as the 1:1 square on
   the right (post photo, story, product/pet image, …). ── */
const hasMediaThumbnail = (n: Notification) =>
  !!n.image_url && !isTeamBroadcast(n.type) && !NON_MEDIA_IMAGE_TYPES.has(n.type);

/* ── Strip emoji/pictographs from body copy for a clean, uniform look ── */
const stripEmoji = (text: string) =>
  (text ?? '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

/* ── Bold quotes and pet/post titles in body text ── */
const formatBodyText = (text: string) => {
  text = stripEmoji(text);
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

/* ── Aggregate action phrases used when several notifications collapse ── */
const AGGREGATE_ACTION: Record<string, string> = {
  social_post_like: 'pawed your post',
  social_comment_like: 'pawed your comment',
  social_post_comment: 'commented on your post',
  social_comment_reply: 'replied to your comment',
  social_mention_post: 'mentioned you in a post',
  social_mention_comment: 'mentioned you in a comment',
  social_new_follower: 'started following you',
  social_repost: 'reposted your post',
};

/* ── A collapsed set of notifications about the same action on the same entity ── */
export interface NotificationGroup {
  key: string;
  items: Notification[]; // newest first
  latest: Notification; // representative
}

// Same action on the same post/entity collapses into one row (e.g. many likes
// on one post). Followers collapse together too. Anything else stays on its own.
const groupKeyOf = (n: Notification): string => {
  if (n.type === 'social_new_follower') return 'social_new_follower';
  if (n.type in AGGREGATE_ACTION && n.entity_id != null) {
    return `${n.type}:${n.entity_type}:${n.entity_id}`;
  }
  return `single:${n.notification_id}`;
};

const collapseGroups = (notifications: Notification[]): NotificationGroup[] => {
  const map = new Map<string, Notification[]>();
  notifications.forEach((n) => {
    const k = groupKeyOf(n);
    const bucket = map.get(k);
    if (bucket) bucket.push(n);
    else map.set(k, [n]);
  });

  const groups: NotificationGroup[] = [];
  map.forEach((items, key) => {
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    groups.push({ key, items, latest: items[0] });
  });
  groups.sort(
    (a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime()
  );
  return groups;
};

/** Distinct senders across a group, most-recent first, deduped by user. */
const uniqueSenders = (items: Notification[]) => {
  const seen = new Set<number>();
  const out: NonNullable<Notification['sender']>[] = [];
  items.forEach((it) => {
    const s = it.sender;
    const id = s?.user_id ?? -1;
    if (s && !seen.has(id)) {
      seen.add(id);
      out.push(s);
    }
  });
  return out;
};

/* ── Group Notifications by Date Helper ── */
interface NotificationSection {
  title: string;
  data: NotificationGroup[];
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
  const buckets: Record<string, NotificationGroup[]> = {};

  collapseGroups(notifications).forEach((group) => {
    const createdAt = new Date(group.latest.created_at);
    const key = isNaN(createdAt.getTime()) ? 'Earlier' : bucketFor(createdAt);
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(group);
  });

  return order
    .filter((key) => buckets[key]?.length > 0)
    .map((key) => ({ title: key, data: buckets[key] }));
};

/* ── Actor Avatar with no-profile fallback ──
   Circular for social; square with rounded corners for pets/adoptions —
   the shape is the (label-free) category differentiator. */
const ActorAvatar = ({
  name,
  uri,
  source,
  size = 48,
  square = false,
}: {
  name: string;
  uri?: string | null;
  source?: number;
  size?: number;
  square?: boolean;
}) => (
  <Image
    source={source ?? (uri ? { uri } : NO_PROFILE_IMAGE)}
    style={{ width: size, height: size, borderRadius: square ? size * 0.28 : size / 2 }}
    contentFit="cover"
    className="border border-gray-100"
  />
);

/* ── Stacked, overlapping avatars for a collapsed group ── */
const StackedAvatars = ({ items, square }: { items: Notification[]; square: boolean }) => {
  const senders = uniqueSenders(items).slice(0, 2);
  const size = 38;
  const radius = square ? size * 0.28 : size / 2;
  return (
    <View style={{ width: 48, height: 48 }}>
      {senders.map((s, i) => (
        <Image
          key={s.user_id ?? i}
          source={s.profile_image_url ? { uri: s.profile_image_url } : NO_PROFILE_IMAGE}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: radius,
            top: i === 0 ? 0 : 10,
            left: i === 0 ? 0 : 10,
            zIndex: senders.length - i,
            borderWidth: 2,
            borderColor: '#fff',
            backgroundColor: '#eee',
          }}
          contentFit="cover"
        />
      ))}
    </View>
  );
};

/* ── Pull the quoted post/comment preview the backend already embeds in a
   single notification's body (e.g. `commented: "hello world"`) so collapsed
   groups can show the same context instead of a bare "commented on your
   post" with nothing to point at. ── */
const extractPreview = (body: string): string | null => {
  const match = stripEmoji(body ?? '').match(/"([^"]*)"/);
  return match ? match[1] : null;
};

/* ── Build the "A, B and N others <action>" line for a collapsed group ── */
const GroupTitleLine = ({ items }: { items: Notification[] }) => {
  const senders = uniqueSenders(items);
  const action = AGGREGATE_ACTION[items[0].type] || stripEmoji(items[0].body);
  const first = senders[0]?.name || 'Someone';
  const second = senders[1]?.name;
  const extra = senders.length - 2;
  // Only worth showing when there's no media square to carry that context instead.
  const preview = !hasMediaThumbnail(items[0]) ? extractPreview(items[0].body) : null;

  return (
    <Text className="font-body text-sm text-dark leading-5" numberOfLines={3}>
      <Text className="font-headingSemi text-dark">{first}</Text>
      {second && (
        <>
          <Text>, </Text>
          <Text className="font-headingSemi text-dark">{second}</Text>
        </>
      )}
      {extra > 0 && <Text className="font-body text-dark"> and {extra} others</Text>}
      <Text> {action}</Text>
      {preview && (
        <Text className="font-headingSemi text-dark text-sm"> "{preview}"</Text>
      )}
    </Text>
  );
};

/* ── Notification Row (renders a single item or a collapsed group) ── */
const NotificationRow = ({
  group,
  onPress,
  onOptionsPress,
}: {
  group: NotificationGroup;
  onPress: (group: NotificationGroup) => void;
  onOptionsPress: (item: Notification) => void;
}) => {
  const { items, latest } = group;
  const isSocial = isSocialNotification(latest.type);
  const isBroadcast = isTeamBroadcast(latest.type);
  const isGrouped = items.length > 1;
  const anyUnread = items.some((n) => !n.is_read);

  const actorName = latest.sender?.name || latest.title || 'System';
  // Pets/adoptions show the pet's picture (image_url); social shows the sender pfp.
  const avatarUri = isSocial
    ? latest.sender?.profile_image_url || latest.image_url
    : latest.image_url || latest.sender?.profile_image_url;

  return (
    <Pressable
      onPress={() => onPress(group)}
      onLongPress={() => onOptionsPress(latest)}
      delayLongPress={300}
      className="flex-row items-center px-3 py-4 active:bg-gray-50"
    >
      {/* Avatar — Paltuu logo for team broadcasts; stacked for groups; square/rounded for pets & adoptions */}
      <View className="mr-3.5">
        {isBroadcast ? (
          <ActorAvatar name="Paltuu" source={PALTUU_LOGO} square />
        ) : isGrouped ? (
          <StackedAvatars items={items} square={!isSocial} />
        ) : (
          <ActorAvatar name={actorName} uri={avatarUri} square={!isSocial} />
        )}
      </View>

      {/* Message Text column */}
      <View className={`flex-1 mr-3 ${isBroadcast ? 'gap-0.5' : 'gap-1'}`}>
        {isBroadcast ? (
          <>
            <Text className="font-headingSemi text-sm text-dark leading-[18px]" numberOfLines={2}>
              {latest.title}
            </Text>
            {!!latest.body && (
              <Text className="font-body text-sm text-dark leading-[18px]" numberOfLines={2}>
                {formatBodyText(latest.body)}
              </Text>
            )}
          </>
        ) : isGrouped ? (
          <GroupTitleLine items={items} />
        ) : (
          <Text className="font-body text-sm text-dark leading-5" numberOfLines={3}>
            <Text className="font-headingSemi text-dark">{actorName} </Text>
            {formatBodyText(latest.body)}
          </Text>
        )}
        <Text className="font-body text-xs text-gray-light">{formatTime(latest.created_at)}</Text>
      </View>

      {/* Right Column: 1:1 media square OR unread dot (vertically centered) */}
      {hasMediaThumbnail(latest) ? (
        <Image
          source={{ uri: latest.image_url! }}
          style={{ width: 56, height: 56, borderRadius: 16 }}
          className="border border-gray-100 bg-gray-100"
          contentFit="cover"
        />
      ) : (
        anyUnread && <View className="w-2 h-2 rounded-full bg-primary" />
      )}
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
    <View className="flex-row items-center px-3 py-4">
      {/* Avatar */}
      <View className="w-12 h-12 rounded-full bg-gray-200 mr-3.5" />
      {/* Lines */}
      <View className="flex-1 gap-2 mr-2">
        <View style={{ width: widths[0] as any }} className="h-3.5 bg-gray-200 rounded-full" />
        <View style={{ width: widths[1] as any }} className="h-3 bg-gray-200 rounded-full" />
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

/* ── Main Notifications Screen ── */
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Ref for bottom sheet
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

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
    queryKey: ['notifications'],
    queryFn: ({ pageParam }) =>
      notificationsApi.getNotifications({
        limit: 20,
        cursor: pageParam,
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
      // Don't cancel the ['notifications'] list query here: this mutation fires
      // on screen mount (see the "mark all as read when screen opens" effect),
      // racing the initial list fetch. Cancelling it mid-flight reverts
      // isFetching/isLoading to false with no data, which briefly renders the
      // "no notifications" empty state before the real list loads in.
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
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const handlePress = useCallback(
    (group: NotificationGroup) => {
      // Mark every unread item in the collapsed group as read
      group.items.forEach((n) => {
        if (!n.is_read) markReadMutation.mutate(n.notification_id);
      });
      const link = group.latest.deep_link;
      if (link) handleDeepLink(link);
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
      handlePress({
        key: `single:${selectedNotification.notification_id}`,
        items: [selectedNotification],
        latest: selectedNotification,
      });
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
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      {/* Pinned Top Navigation Header */}
      <View className="bg-surface px-5 py-3 flex-row items-center gap-3">
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)'))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>
        <Text className="font-heading text-2xl text-dark">Notifications</Text>
      </View>

      {/* Notification Lists and Skeletons */}
      {isLoading || (sections.length === 0 && isFetching) ? (
        <View className="flex-1 bg-surface">
          <NotificationSkeleton />
        </View>
      ) : (
        <SectionList
          sections={sections}
          // Date headers (Today/Yesterday/…) scroll away with their section
          // instead of pinning to the top and overlapping rows underneath.
          stickySectionHeadersEnabled={false}
          keyExtractor={(group) => group.key}
          renderItem={({ item: group }) => (
            <NotificationRow group={group} onPress={handlePress} onOptionsPress={openOptionsSheet} />
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
          ItemSeparatorComponent={() => <View className="h-[0.5px] bg-gray-100 ml-[72px]" />}
          style={{ marginBottom: insets.bottom }}
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
                You have no new notifications right now. Enjoy your day!
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

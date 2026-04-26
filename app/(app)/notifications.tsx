import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  RefreshControl, Pressable, SectionList,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const PRIMARY = '#A03048';
const MUTED = '#C4C4C4';

/* ── Notification type config ── */
const TYPE_CONFIG: Record<string, {
  icon: string;
  iconLib: 'ion' | 'mci';
  color: string;
  bg: string;
  label: (n: any) => string;
}> = {
  // Social
  post_like: {
    icon: 'paw', iconLib: 'ion', color: PRIMARY, bg: '#fdf0f2',
    label: n => `${n.actor_name} pawed your post`,
  },
  post_comment: {
    icon: 'chatbubble', iconLib: 'ion', color: '#7c3aed', bg: '#f5f3ff',
    label: n => `${n.actor_name} commented on your post`,
  },
  comment_reply: {
    icon: 'return-down-forward', iconLib: 'ion', color: '#7c3aed', bg: '#f5f3ff',
    label: n => `${n.actor_name} replied to your comment`,
  },
  comment_like: {
    icon: 'paw-outline', iconLib: 'ion', color: PRIMARY, bg: '#fdf0f2',
    label: n => `${n.actor_name} pawed your comment`,
  },
  new_follower: {
    icon: 'person-add', iconLib: 'ion', color: '#059669', bg: '#f0fdf4',
    label: n => `${n.actor_name} started following you`,
  },
  post_mention: {
    icon: 'at', iconLib: 'ion', color: '#0ea5e9', bg: '#f0f9ff',
    label: n => `${n.actor_name} mentioned you in a post`,
  },
  comment_mention: {
    icon: 'at', iconLib: 'ion', color: '#0ea5e9', bg: '#f0f9ff',
    label: n => `${n.actor_name} mentioned you in a comment`,
  },
  repost: {
    icon: 'repeat', iconLib: 'ion', color: '#059669', bg: '#f0fdf4',
    label: n => `${n.actor_name} reposted your post`,
  },
  // Adoption
  adoption_request: {
    icon: 'paw', iconLib: 'mci', color: '#d97706', bg: '#fffbeb',
    label: n => `${n.actor_name} sent an adoption request for ${n.pet_name}`,
  },
  adoption_approved: {
    icon: 'check-circle', iconLib: 'mci', color: '#059669', bg: '#f0fdf4',
    label: n => `Your adoption request for ${n.pet_name} was approved! 🎉`,
  },
  adoption_rejected: {
    icon: 'close-circle', iconLib: 'mci', color: '#dc2626', bg: '#fef2f2',
    label: n => `Your adoption request for ${n.pet_name} was not approved`,
  },
  // Orders
  order_update: {
    icon: 'package-variant', iconLib: 'mci', color: '#7c3aed', bg: '#f5f3ff',
    label: n => `Order #${n.order_id}: ${n.order_status}`,
  },
  listing_inquiry: {
    icon: 'message-text', iconLib: 'mci', color: '#0ea5e9', bg: '#f0f9ff',
    label: n => `${n.actor_name} enquired about your listing`,
  },
  // Lost & Found
  lost_found_match: {
    icon: 'map-marker', iconLib: 'mci', color: '#d97706', bg: '#fffbeb',
    label: n => `Possible match found for ${n.pet_name} near ${n.area}`,
  },
};

/* ── Mock data ── */
const MOCK_NOTIFICATIONS = [
  {
    notification_id: 1,
    notification_type: 'new_follower',
    actor_name: 'Sara Ali',
    actor_image: null,
    is_read: false,
    date_sent: '2m ago',
    preview_image: null,
  },
  {
    notification_id: 2,
    notification_type: 'post_like',
    actor_name: 'Hamza Sheikh',
    actor_image: null,
    is_read: false,
    date_sent: '15m ago',
    preview_image: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=200',
  },
  {
    notification_id: 3,
    notification_type: 'post_comment',
    actor_name: 'Zara Noor',
    actor_image: null,
    is_read: false,
    date_sent: '1h ago',
    preview_image: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=200',
    preview_text: 'This is so adorable!! 🐾',
  },
  {
    notification_id: 4,
    notification_type: 'adoption_request',
    actor_name: 'Ahmed Raza',
    actor_image: null,
    pet_name: 'Luna',
    is_read: false,
    date_sent: '2h ago',
    preview_image: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=200',
  },
  {
    notification_id: 5,
    notification_type: 'comment_reply',
    actor_name: 'Ayesha Khan',
    actor_image: null,
    is_read: true,
    date_sent: '3h ago',
    preview_text: 'Right?! I was so proud 😭',
  },
  {
    notification_id: 6,
    notification_type: 'adoption_approved',
    actor_name: 'Paltuu Rescues',
    actor_image: null,
    pet_name: 'Simba',
    is_read: true,
    date_sent: '5h ago',
    preview_image: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=200',
  },
  {
    notification_id: 7,
    notification_type: 'lost_found_match',
    actor_name: 'System',
    actor_image: null,
    pet_name: 'Rocky',
    area: 'DHA Phase 5',
    is_read: true,
    date_sent: '6h ago',
  },
  {
    notification_id: 8,
    notification_type: 'order_update',
    actor_name: 'Bazaar',
    actor_image: null,
    order_id: '2847',
    order_status: 'Out for delivery',
    is_read: true,
    date_sent: 'Yesterday',
  },
  {
    notification_id: 9,
    notification_type: 'post_mention',
    actor_name: 'Umer Noor',
    actor_image: null,
    is_read: true,
    date_sent: 'Yesterday',
    preview_image: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=200',
  },
  {
    notification_id: 10,
    notification_type: 'repost',
    actor_name: 'Sara Ali',
    actor_image: null,
    is_read: true,
    date_sent: '2 days ago',
    preview_image: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=200',
  },
];

/* ── Group into Today / Earlier ── */
const groupNotifications = (notifications: any[]) => {
  const today: any[] = [];
  const earlier: any[] = [];
  notifications.forEach(n => {
    const isToday = ['2m ago', '15m ago', '1h ago', '2h ago', '3h ago', '5h ago', '6h ago'].includes(n.date_sent);
    if (isToday) today.push(n);
    else earlier.push(n);
  });
  const sections = [];
  if (today.length) sections.push({ title: 'Today', data: today });
  if (earlier.length) sections.push({ title: 'Earlier', data: earlier });
  return sections;
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
  item, onPress, onMarkRead,
}: {
  item: any;
  onPress: (item: any) => void;
  onMarkRead: (id: number) => void;
}) => {
  const config = TYPE_CONFIG[item.notification_type];
  const label = config?.label(item) ?? item.notification_content ?? 'New notification';

  return (
    <Pressable
      onPress={() => {
        onPress(item);
        if (!item.is_read) onMarkRead(item.notification_id);
      }}
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
        <ActorAvatar name={item.actor_name} uri={item.actor_image} />
        <TypeBadge type={item.notification_type} />
      </View>

      {/* Text Content */}
      <View style={{ flex: 1, marginLeft: 12, marginRight: 8, gap: 2 }}>
        <Text style={{
          fontSize: 14,
          color: '#111',
          lineHeight: 18,
          letterSpacing: -0.1,
        }}>
          <Text style={{ fontWeight: '700' }}>{item.actor_name} </Text>
          {label.replace(item.actor_name, '').trim()}
          <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>  {item.date_sent}</Text>
        </Text>

        {item.preview_text && (
          <Text style={{
            fontSize: 13,
            color: '#6B7280',
            marginTop: 2,
          }} numberOfLines={2}>
            {item.preview_text}
          </Text>
        )}
      </View>

      {/* Right Column: Unread Dot or Preview Image */}
      <View style={{ alignItems: 'flex-end', minWidth: 44 }}>
        {item.preview_image ? (
          <Image
            source={{ uri: item.preview_image }}
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

/* ── Section header ── */
const SectionHeader = ({ title }: { title: string }) => (
  <View style={{
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  }}>
    <Text style={{ fontSize: 12, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5 }}>
      {title.toUpperCase()}
    </Text>
  </View>
);

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

/* ── Filter logic ── */
const SOCIAL_TYPES = ['post_like', 'post_comment', 'comment_reply', 'comment_like', 'new_follower', 'post_mention', 'comment_mention', 'repost'];
const ADOPTION_TYPES = ['adoption_request', 'adoption_approved', 'adoption_rejected', 'listing_inquiry'];
const ORDER_TYPES = ['order_update'];

const applyFilter = (notifications: any[], filter: string) => {
  if (filter === 'All') return notifications;
  if (filter === 'Social') return notifications.filter(n => SOCIAL_TYPES.includes(n.notification_type));
  if (filter === 'Adoptions') return notifications.filter(n => ADOPTION_TYPES.includes(n.notification_type));
  if (filter === 'Orders') return notifications.filter(n => ORDER_TYPES.includes(n.notification_type));
  return notifications;
};

/* ── Main screen ── */
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markRead = useCallback((id: number) => {
    setNotifications(prev =>
      prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n)
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    // TODO: call PATCH /api/v1/notifications { mark_all_read: true }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // TODO: refetch notifications
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handlePress = (item: any) => {
    // Route based on type
    const social = SOCIAL_TYPES.includes(item.notification_type);
    const adoption = ADOPTION_TYPES.includes(item.notification_type);
    if (social) router.push('/(app)/');
    else if (adoption) router.push('/(app)/adoption-requests');
    else if (item.notification_type === 'order_update') router.push('/(app)/orders');
    else if (item.notification_type === 'lost_found_match') router.push('/(app)/lost-found');
  };

  const filtered = applyFilter(notifications, filter);
  const sections = groupNotifications(filtered);

  return (
    <View style={{ flex: 1, backgroundColor: '#F2F2F2', paddingTop: insets.top }}>

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
          <TouchableOpacity onPress={markAllRead} hitSlop={8}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: PRIMARY }}>
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <FilterTabs active={filter} onChange={setFilter} />

      {/* List */}
      <SectionList
        sections={sections}
        keyExtractor={item => String(item.notification_id)}
        renderItem={({ item }) => (
          <NotificationRow
            item={item}
            onPress={handlePress}
            onMarkRead={markRead}
          />
        )}
        renderSectionHeader={({ section }) => (
          <SectionHeader title={section.title} />
        )}
        ItemSeparatorComponent={() => (
          <View style={{ height: 0.5, backgroundColor: '#F3F4F6', marginLeft: 78 }} />
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
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
        stickySectionHeadersEnabled
      />

    </View>
  );
}

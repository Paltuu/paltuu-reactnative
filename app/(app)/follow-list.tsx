import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { socialApi } from '../../src/api/social';
import { useAuthStore } from '../../src/stores/authStore';
import { useSocialActions } from '../../src/hooks/useSocialActions';
import { NO_PROFILE_IMAGE } from '../../src/constants/images';
import { withFocusUnmount } from '../../src/components/common/withFocusUnmount';
import { COLORS } from '../../src/constants/colors';

const VERIFIED_ICON = require('../../assets/icons/verified-check-svgrepo-com.svg');

type ListType = 'followers' | 'following';

const TABS: ListType[] = ['followers', 'following'];

function FollowListScreen() {
  const { userId, type: initialType, name } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const isOwner = String(currentUser?.id) === String(userId);
  const queryClient = useQueryClient();
  const { toggleFollow } = useSocialActions();

  const { width } = useWindowDimensions();
  const initialIndex = (initialType as ListType) === 'following' ? 1 : 0;
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const pagerRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(initialIndex * width)).current;

  // Queries
  const { data: followersData, isLoading: isLoadingFollowers } = useQuery({
    queryKey: ['social-followers', userId],
    queryFn: () => socialApi.getFollowers(userId as string),
    enabled: !!userId,
  });

  const { data: followingData, isLoading: isLoadingFollowing } = useQuery({
    queryKey: ['social-following', userId],
    queryFn: () => socialApi.getFollowing(userId as string),
    enabled: !!userId,
  });

  // Remove-follower — optimistic: drop the row immediately, roll back on error.
  const removeFollowerMutation = useMutation({
    mutationFn: (followerId: number) => socialApi.removeFollower(userId as string, followerId),
    onMutate: async (followerId: number) => {
      await queryClient.cancelQueries({ queryKey: ['social-followers', userId] });
      const previous = queryClient.getQueryData(['social-followers', userId]);
      queryClient.setQueryData(['social-followers', userId], (old: any) => {
        if (!old?.followers) return old;
        return {
          ...old,
          followers: old.followers.filter((u: any) => String(u.user_id) !== String(followerId)),
        };
      });
      return { previous };
    },
    onError: (_err, _followerId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['social-followers', userId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['social-followers', userId] });
      queryClient.invalidateQueries({ queryKey: ['social-profile', userId] });
    },
  });

  const goToTab = useCallback((index: number) => {
    setActiveIndex(index);
    pagerRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / width);
      setActiveIndex(idx);
    },
    [width]
  );

  const renderUser = useCallback(
    (item: any, listType: ListType) => {
      const isMe = String(currentUser?.id) === String(item.user_id);

      return (
        <View style={styles.userRow}>
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
              <View style={styles.nameRow}>
                <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
                {!!item.verified && (
                  <Image source={VERIFIED_ICON} style={styles.verifiedIcon} tintColor={COLORS.primary} />
                )}
              </View>
              <Text style={styles.userHandle} numberOfLines={1}>@{item.social_username || 'user'}</Text>
            </View>
          </TouchableOpacity>

          {!isMe && (
            <View style={styles.actionButtonContainer}>
              <TouchableOpacity
                style={[styles.followButton, item.is_followed_by_me && styles.followingButton]}
                onPress={() => toggleFollow(item.user_id)}
              >
                <Text style={[styles.followButtonText, item.is_followed_by_me && styles.followingButtonText]}>
                  {item.is_followed_by_me
                    ? 'Following'
                    : listType === 'followers' && isOwner
                      ? 'Follow back'
                      : 'Follow'}
                </Text>
              </TouchableOpacity>
              {listType === 'followers' && isOwner && (
                <TouchableOpacity
                  style={styles.removeIconButton}
                  onPress={() => removeFollowerMutation.mutate(item.user_id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={18} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      );
    },
    [currentUser?.id, isOwner, router, toggleFollow, removeFollowerMutation]
  );

  const renderPage = useCallback(
    ({ item: listType }: { item: ListType }) => {
      const pageData = listType === 'followers' ? followersData?.followers : followingData?.following;
      const pageLoading = listType === 'followers' ? isLoadingFollowers : isLoadingFollowing;

      return (
        <View style={{ width }}>
          {pageLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color="#A03048" />
            </View>
          ) : (
            <FlatList
              data={pageData}
              renderItem={({ item }) => renderUser(item, listType)}
              keyExtractor={(item) => item.user_id.toString()}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={60} color="#E5E7EB" />
                  <Text style={styles.emptyText}>No users found</Text>
                </View>
              }
            />
          )}
        </View>
      );
    },
    [followersData, followingData, isLoadingFollowers, isLoadingFollowing, width, renderUser]
  );

  const indicatorTranslate = scrollX.interpolate({
    inputRange: [0, width],
    outputRange: [0, width / 2],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{name || 'Connections'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs with animated underline that tracks the swipe */}
      <View style={styles.tabContainer}>
        {TABS.map((tab, index) => (
          <TouchableOpacity key={tab} style={styles.tab} onPress={() => goToTab(index)}>
            <Text style={[styles.tabText, activeIndex === index && styles.activeTabText]}>
              {tab === 'followers' ? 'Followers' : 'Following'}
            </Text>
          </TouchableOpacity>
        ))}
        <Animated.View
          style={[
            styles.indicator,
            { width: width / 2, transform: [{ translateX: indicatorTranslate }] },
          ]}
        />
      </View>

      {/* Swipeable pages */}
      <Animated.FlatList
        ref={pagerRef as any}
        data={TABS}
        keyExtractor={(t) => t}
        renderItem={renderPage as any}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_: any, index: number) => ({ length: width, offset: width * index, index })}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        style={{ flex: 1, marginBottom: insets.bottom }}
      />
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
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  activeTabText: { color: '#111' },
  indicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    height: 2,
    backgroundColor: '#A03048',
  },
  listContent: { paddingTop: 8, paddingBottom: 100 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6' },
  userText: { marginLeft: 12, flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  userName: { fontSize: 15, fontWeight: '700', color: '#111', flexShrink: 1 },
  verifiedIcon: { width: 14, height: 14 },
  userHandle: { fontSize: 14, color: '#6B7280', marginTop: 1 },
  actionButtonContainer: { marginLeft: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  followButton: {
    backgroundColor: '#A03048',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
    alignItems: 'center',
  },
  followingButton: { backgroundColor: '#F3F4F6' },
  followButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  followingButtonText: { color: '#111' },
  removeIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 12, color: '#9CA3AF', fontSize: 15 },
});

export default withFocusUnmount(FollowListScreen);

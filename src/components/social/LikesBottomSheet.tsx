import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetFlatList,
  BottomSheetTextInput,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { socialApi, PostLiker } from '../../api/social';
import { useAuthStore } from '../../stores/authStore';
import { useSocialActions } from '../../hooks/useSocialActions';
import { NO_PROFILE_IMAGE } from '../../constants/images';
import { COLORS } from '../../constants/colors';

const VERIFIED_ICON = require('../../../assets/icons/verified-check-svgrepo-com.svg');
const DAY_ONE_ICON = require('../../../assets/icons/day1-badge.svg');

interface LikesBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  postId: string | number | null;
}

export const LikesBottomSheet = ({ visible, onClose, postId }: LikesBottomSheetProps) => {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const router = useRouter();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const { toggleFollow } = useSocialActions();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  useEffect(() => {
    if (visible && postId) {
      const timer = setTimeout(() => bottomSheetModalRef.current?.present(), 0);
      return () => clearTimeout(timer);
    }
    bottomSheetModalRef.current?.dismiss();
  }, [visible, postId]);

  useEffect(() => {
    if (!visible) {
      setSearch('');
      setDebouncedSearch('');
    }
  }, [visible]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['post-likes', String(postId), debouncedSearch],
    queryFn: ({ pageParam }) =>
      socialApi.getPostLikes(postId as string, pageParam ?? undefined, debouncedSearch || undefined),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    enabled: !!postId && visible,
  });

  const likes = useMemo(
    () => data?.pages.flatMap((page) => page.likes) ?? [],
    [data]
  );

  const sheetHeight = useMemo(() => {
    const HANDLE = 24;
    const HEADER = 36;
    const SEARCH = 56;
    const ROW = 72;
    const BOTTOM = Math.max(insets.bottom, 16);
    const visibleRows = isLoading || isError ? 2 : Math.max(likes.length, 1);
    const raw = HANDLE + HEADER + SEARCH + visibleRows * ROW + BOTTOM;
    return Math.min(raw, screenHeight * 0.8);
  }, [isLoading, isError, likes.length, insets.bottom, screenHeight]);

  const snapPoints = useMemo(() => [sheetHeight], [sheetHeight]);

  useEffect(() => {
    if (!visible) return;
    bottomSheetModalRef.current?.snapToIndex(0);
  }, [sheetHeight, visible]);

  const openProfile = useCallback(
    (userId: number) => {
      onClose();
      router.push(`/(app)/profile/${userId}`);
    },
    [onClose, router]
  );

  const renderItem = useCallback(
    ({ item }: { item: PostLiker }) => {
      const isMe = String(currentUserId) === String(item.user_id);
      const handle = item.social_username ? `@${item.social_username}` : item.name;

      return (
        <View style={styles.userRow}>
          <TouchableOpacity style={styles.userInfo} onPress={() => openProfile(item.user_id)}>
            <Image
              source={item.profile_image_url ? { uri: item.profile_image_url } : NO_PROFILE_IMAGE}
              style={styles.avatar}
              contentFit="cover"
            />
            <View style={styles.userText}>
              <View style={styles.nameRow}>
                <Text style={styles.userName} numberOfLines={1}>
                  {item.social_username || item.name}
                </Text>
                {!!item.verified && (
                  <Image source={VERIFIED_ICON} style={styles.verifiedIcon} tintColor={COLORS.primary} />
                )}
                {!!item.founding_club && (
                  <Image source={DAY_ONE_ICON} style={styles.verifiedIcon} tintColor={COLORS.primary} />
                )}
              </View>
              <Text style={styles.userHandle} numberOfLines={1}>
                {item.social_username ? item.name : handle}
              </Text>
            </View>
          </TouchableOpacity>

          {!isMe && (
            <TouchableOpacity
              style={[
                styles.followButton,
                (item.is_followed_by_me || item.has_pending_request) && styles.followingButton,
              ]}
              onPress={() => toggleFollow(item.user_id)}
            >
              <Text
                style={[
                  styles.followButtonText,
                  (item.is_followed_by_me || item.has_pending_request) && styles.followingButtonText,
                ]}
              >
                {item.is_followed_by_me
                  ? 'Following'
                  : item.has_pending_request
                    ? 'Requested'
                    : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [currentUserId, openProfile, toggleFollow]
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      keyboardBehavior="extend"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={{
        backgroundColor: 'white',
        borderRadius: 24,
      }}
      handleIndicatorStyle={{
        backgroundColor: '#D1D5DB',
        width: 40,
      }}
    >
      <BottomSheetView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Likes</Text>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="#9CA3AF" />
          <BottomSheetTextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#A03048" />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>Couldn't load likes</Text>
            <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <BottomSheetFlatList
            data={likes}
            renderItem={renderItem}
            keyExtractor={(item) => item.like_id}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onEndReached={() => {
              if (hasNextPage) fetchNextPage();
            }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={{ paddingVertical: 20 }}>
                  <ActivityIndicator color="#A03048" />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {debouncedSearch ? 'No matching likes' : 'No likes yet'}
                </Text>
              </View>
            }
          />
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111',
    paddingVertical: 0,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6' },
  userText: { marginLeft: 12, flex: 1, marginRight: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  userName: { fontSize: 15, fontWeight: '700', color: '#111', flexShrink: 1 },
  verifiedIcon: { width: 14, height: 14 },
  userHandle: { fontSize: 14, color: '#6B7280', marginTop: 1 },
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
  center: { minHeight: 120, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#A03048',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});

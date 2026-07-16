import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Pressable
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

type ListType = 'followers' | 'following';

function FollowListScreen() {
  const { userId, type: initialType, name } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<ListType>(initialType as ListType || 'followers');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const isOwner = String(currentUser?.id) === String(userId);
  const queryClient = useQueryClient();
  const { toggleFollow } = useSocialActions();

  // Queries
  const { data: followersData, isLoading: isLoadingFollowers, refetch: refetchFollowers } = useQuery({
    queryKey: ['social-followers', userId],
    queryFn: () => socialApi.getFollowers(userId as string),
    enabled: !!userId,
  });

  const { data: followingData, isLoading: isLoadingFollowing, refetch: refetchFollowing } = useQuery({
    queryKey: ['social-following', userId],
    queryFn: () => socialApi.getFollowing(userId as string),
    enabled: !!userId,
  });

  // Mutations
  const removeFollowerMutation = useMutation({
    mutationFn: (followerId: number) => socialApi.removeFollower(userId as string, followerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-followers', userId] });
      queryClient.invalidateQueries({ queryKey: ['social-profile', userId] });
    },
  });

  const data = activeTab === 'followers' ? followersData?.followers : followingData?.following;
  const isLoading = activeTab === 'followers' ? isLoadingFollowers : isLoadingFollowing;

  const renderItem = ({ item }: { item: any }) => {
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
            <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.userHandle} numberOfLines={1}>@{item.social_username || 'user'}</Text>
          </View>
        </TouchableOpacity>

        {!isMe && (
          <View style={styles.actionButtonContainer}>
            {activeTab === 'followers' && isOwner ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    item.is_followed_by_me && styles.followingButton
                  ]}
                  onPress={() => toggleFollow(item.user_id)}
                >
                  <Text style={[
                    styles.followButtonText,
                    item.is_followed_by_me && styles.followingButtonText
                  ]}>
                    {item.is_followed_by_me ? 'Following' : 'Follow back'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeIconButton}
                  onPress={() => removeFollowerMutation.mutate(item.user_id)}
                  disabled={removeFollowerMutation.isPending}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={18} color="#6B7280" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[
                  styles.followButton,
                  item.is_followed_by_me && styles.followingButton
                ]}
                onPress={() => toggleFollow(item.user_id)}
              >
                <Text style={[
                  styles.followButtonText,
                  item.is_followed_by_me && styles.followingButtonText
                ]}>
                  {item.is_followed_by_me ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

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

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
          onPress={() => setActiveTab('followers')}
        >
          <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>
            Followers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'following' && styles.activeTab]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
            Following
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#A03048" />
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item) => item.user_id.toString()}
          style={{ marginBottom: insets.bottom }}
          contentContainerStyle={styles.listContent}
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
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: '#A03048' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  activeTabText: { color: '#111' },
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
  userName: { fontSize: 15, fontWeight: '700', color: '#111' },
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 12, color: '#9CA3AF', fontSize: 15 },
});

export default withFocusUnmount(FollowListScreen);

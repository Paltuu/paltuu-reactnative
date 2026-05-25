import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetFlatList, BottomSheetTextInput, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi } from '../../api/social';
import { ReportBottomSheet } from './ReportBottomSheet';
import { useAuthStore } from '../../stores/authStore';

interface CommentsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  postId: string | number | null;
}

export const CommentsBottomSheet = ({ visible, onClose, postId }: CommentsBottomSheetProps) => {
  // Normalize postId to string so React Query cache key is always consistent
  const normalizedPostId = postId != null ? String(postId) : null;
  const [commentText, setCommentText] = useState('');
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<number | null>(null);
  const [reportTargetType, setReportTargetType] = useState<'user' | 'comment'>('user');

  // Snap points for the bottom sheet
  const snapPoints = useMemo(() => ['60%', '90%'], []);

  // Show/Hide logic based on the visible prop
  useEffect(() => {
    if (visible && postId) {
      // Use a small timeout to ensure the modal is ready to be presented
      const timer = setTimeout(() => {
        bottomSheetModalRef.current?.present();
      }, 0);
      return () => clearTimeout(timer);
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible, postId]);

  // 1. Fetch Comments (Real-time fetching)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['comments', normalizedPostId],
    queryFn: () => socialApi.getComments(normalizedPostId!),
    enabled: !!normalizedPostId && visible,
    retry: false,
    staleTime: 10000,
  });

  const comments = data?.comments || [];

  // 2. Post Comment Mutation
  const postMutation = useMutation({
    mutationFn: (text: string) => socialApi.postComment(normalizedPostId!, text),
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['comments', normalizedPostId] });
    },
  });

  const handlePost = () => {
    if (!commentText.trim() || postMutation.isPending) return;
    postMutation.mutate(commentText);
  };

  const blockMutation = useMutation({
    mutationFn: (userId: number) => socialApi.blockUser(userId),
    onSuccess: (_, userId) => {
      import('react-native-toast-message').then((mod) => {
        mod.default.show({ type: 'success', text1: 'User blocked' });
      });
      // Filter out comments from this user
      queryClient.setQueryData(['comments', normalizedPostId], (old: any) => {
        if (!old?.comments) return old;
        return {
          ...old,
          comments: old.comments.filter((c: any) => c.user_id !== userId)
        };
      });
      // Also invalidate feed and profile
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['social-search'] });
      queryClient.invalidateQueries({ queryKey: ['social-explore'] });
    },
    onError: () => {
      import('react-native-toast-message').then((mod) => {
        mod.default.show({ type: 'error', text1: 'Could not block user' });
      });
    }
  });

  const handleCommentMenu = (item: any) => {
    const isOwnComment = String(user?.id) === String(item.user_id);
    if (isOwnComment) return;

    import('react-native').then(({ ActionSheetIOS, Platform, Alert }) => {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Cancel', 'Report Comment', 'Report User', 'Block User'],
            destructiveButtonIndex: 3,
            cancelButtonIndex: 0,
          },
          (btnIdx) => {
            if (btnIdx === 1) {
              setReportTargetId(Number(item.comment_id));
              setReportTargetType('comment');
              setReportSheetVisible(true);
            } else if (btnIdx === 2) {
              setReportTargetId(item.user_id);
              setReportTargetType('user');
              setReportSheetVisible(true);
            } else if (btnIdx === 3) {
              Alert.alert('Block User', `Are you sure you want to block ${item.author_name}?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Block', style: 'destructive', onPress: () => blockMutation.mutate(item.user_id) },
              ]);
            }
          }
        );
      } else {
        Alert.alert('Options', undefined, [
          { text: 'Report Comment', onPress: () => {
              setReportTargetId(Number(item.comment_id));
              setReportTargetType('comment');
              setReportSheetVisible(true);
            } 
          },
          { text: 'Report User', onPress: () => {
              setReportTargetId(item.user_id);
              setReportTargetType('user');
              setReportSheetVisible(true);
            } 
          },
          { text: 'Block User', style: 'destructive', onPress: () => {
              Alert.alert('Block User', `Are you sure you want to block ${item.author_name}?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Block', style: 'destructive', onPress: () => blockMutation.mutate(item.user_id) },
              ]);
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]);
      }
    });
  };

  const renderComment = ({ item }: { item: any }) => {
    const initials = (item.author_name || 'U').split(' ').map((w: any) => w[0]).join('').slice(0, 2).toUpperCase();
    
    return (
      <View className="flex-row mb-6 px-5">
        <View className="w-9 h-9 rounded-full bg-primarySoft items-center justify-center mr-3">
          <Text className="text-xs font-headingBold text-primary">{initials}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-[13px] font-headingBold text-dark">{item.author_name || 'User'}</Text>
              <Text className="text-[11px] font-body text-gray-400">
                {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'now'}
              </Text>
            </View>
            {String(user?.id) !== String(item.user_id) && (
              <TouchableOpacity onPress={() => handleCommentMenu(item)} hitSlop={10} className="px-1">
                <Ionicons name="ellipsis-horizontal" size={14} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <Text className="text-sm font-body text-gray-700 leading-5">{item.content}</Text>
          <View className="flex-row gap-4 mt-2">
            <TouchableOpacity>
              <Text className="text-xs font-headingSemi text-gray-500">Like</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text className="text-xs font-headingSemi text-gray-500">Reply</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity className="items-center pt-1">
          <Ionicons name="heart-outline" size={14} color="#9CA3AF" />
          <Text className="text-[10px] font-body text-gray-400 mt-0.5">{item.like_count || 0}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
      />
    ),
    []
  );

  const userInitials = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={snapPoints}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      // Instagram-style rounded corners
      backgroundStyle={{ 
        backgroundColor: 'white',
        borderRadius: 24,
      }}
      handleIndicatorStyle={{
        backgroundColor: '#E5E7EB',
        width: 40,
      }}
    >
      <View className="flex-1">
        {/* Header */}
        <View className="items-center py-2 border-b border-gray-100">
          <Text className="text-base font-headingBold text-dark">Comments</Text>
        </View>

        {/* Comments List */}
        <View className="flex-1">
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#A03048" />
            </View>
          ) : (
            <BottomSheetFlatList
              data={comments}
              extraData={comments}
              keyExtractor={(item, index) => item.comment_id?.toString() || index.toString()}
              renderItem={renderComment}
              contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              refreshing={isLoading}
              onRefresh={refetch}
              ListEmptyComponent={
                <View className="py-20 items-center">
                  <Text className="font-body text-gray-400">No comments yet. Be the first!</Text>
                </View>
              }
            />
          )}
        </View>

        {/* Input Section - Floating at bottom */}
        <View className="px-5 py-3 border-t border-gray-100 bg-white flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-primarySoft items-center justify-center mr-3">
            <Text className="text-[11px] font-headingBold text-primary">{userInitials}</Text>
          </View>
          <BottomSheetTextInput
            placeholder="Add a comment..."
            className="flex-1 min-h-[40px] max-h-[100px] text-sm font-body text-dark"
            placeholderTextColor="#9CA3AF"
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity 
            className="ml-3" 
            onPress={handlePost}
            disabled={!commentText.trim() || postMutation.isPending}
          >
            {postMutation.isPending ? (
              <ActivityIndicator size="small" color="#A03048" />
            ) : (
              <Text className={`text-sm font-headingBold ${!commentText.trim() ? 'text-gray-300' : 'text-primary'}`}>
                Post
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ReportBottomSheet
        visible={reportSheetVisible}
        onClose={() => setReportSheetVisible(false)}
        targetType={reportTargetType}
        targetId={reportTargetId}
      />
    </BottomSheetModal>
  );
};

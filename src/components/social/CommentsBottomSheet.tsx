import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetFlatList, BottomSheetTextInput, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi } from '../../api/social';
import { useAuthStore } from '../../stores/authStore';

interface CommentsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  postId: string | number | null;
}

export const CommentsBottomSheet = ({ visible, onClose, postId }: CommentsBottomSheetProps) => {
  const [commentText, setCommentText] = useState('');
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

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
    queryKey: ['comments', postId],
    queryFn: () => socialApi.getComments(postId!),
    enabled: !!postId && visible,
    retry: false,
    staleTime: 10000,
  });

  const comments = data?.comments || [];

  // 2. Post Comment Mutation
  const postMutation = useMutation({
    mutationFn: (text: string) => socialApi.postComment(postId!, text),
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
  });

  const handlePost = () => {
    if (!commentText.trim() || postMutation.isPending) return;
    postMutation.mutate(commentText);
  };

  const renderComment = ({ item }: { item: any }) => {
    const initials = (item.author_name || 'U').split(' ').map((w: any) => w[0]).join('').slice(0, 2).toUpperCase();
    
    return (
      <View className="flex-row mb-6 px-5">
        <View className="w-9 h-9 rounded-full bg-primarySoft items-center justify-center mr-3">
          <Text className="text-xs font-headingBold text-primary">{initials}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-[13px] font-headingBold text-dark">{item.author_name || 'User'}</Text>
            <Text className="text-[11px] font-body text-gray-400">
              {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'now'}
            </Text>
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
    </BottomSheetModal>
  );
};

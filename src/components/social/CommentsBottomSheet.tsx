import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Modal, SafeAreaView, ActivityIndicator } from 'react-native';
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
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // 1. Fetch Comments
  const { data: comments, isLoading, refetch } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => socialApi.getComments(postId!),
    enabled: !!postId && visible,
  });

  // 2. Post Comment Mutation
  const postMutation = useMutation({
    mutationFn: (text: string) => socialApi.postComment(postId!, text),
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
  });

  // 3. Like Toggle Mutation
  const likeMutation = useMutation({
    mutationFn: (commentId: string | number) => {
      // Note: Backend might need a specific endpoint for comment likes, 
      // but for now we follow the structure.
      return Promise.resolve(); 
    },
  });

  const handlePost = () => {
    if (!commentText.trim() || postMutation.isPending) return;
    postMutation.mutate(commentText);
  };

  const renderComment = ({ item }: { item: any }) => {
    const initials = (item.author_name || 'U').split(' ').map((w: any) => w[0]).join('').slice(0, 2).toUpperCase();
    
    return (
      <View className="flex-row mb-6">
        <View className="w-9 h-9 rounded-full bg-primarySoft items-center justify-center mr-3">
          <Text className="text-xs font-headingBold text-primary">{initials}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-[13px] font-headingBold text-dark">{item.author_name || 'User'}</Text>
            <Text className="text-[11px] font-body text-gray-400">
              {new Date(item.created_at).toLocaleDateString()}
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

  const userInitials = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#111" />
            </TouchableOpacity>
            <Text className="text-base font-headingBold text-dark">Comments</Text>
            <TouchableOpacity onPress={() => refetch()} disabled={isLoading}>
              <Ionicons name="refresh" size={20} color={isLoading ? "#CCC" : "#111"} />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#A03048" />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.comment_id.toString()}
              renderItem={renderComment}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View className="py-20 items-center">
                  <Text className="font-body text-gray-400">No comments yet. Be the first!</Text>
                </View>
              }
            />
          )}

          {/* Input Section */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <View className="flex-row items-center px-5 py-3 border-t border-gray-100 bg-white">
              <View className="w-8 h-8 rounded-full bg-primarySoft items-center justify-center mr-3">
                <Text className="text-[11px] font-headingBold text-primary">{userInitials}</Text>
              </View>
              <TextInput
                placeholder="Add a comment..."
                className="flex-1 h-10 text-sm font-body text-dark"
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
          </KeyboardAvoidingView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

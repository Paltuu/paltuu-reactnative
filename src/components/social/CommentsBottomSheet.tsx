import React from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Modal, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Comment {
  id: string;
  user: {
    name: string;
    avatar: string | null;
  };
  text: string;
  time: string;
  likes: number;
}

interface CommentsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const CommentsBottomSheet = ({ visible, onClose }: CommentsBottomSheetProps) => {
  const MOCK_COMMENTS: Comment[] = [
    {
      id: '1',
      user: { name: 'Sara Ali', avatar: null },
      text: 'So cute! Milo is getting so big 🐾',
      time: '2h',
      likes: 5,
    },
    {
      id: '2',
      user: { name: 'Hamza Ahmed', avatar: null },
      text: 'Great progress with the training!',
      time: '1h',
      likes: 2,
    },
    {
      id: '3',
      user: { name: 'Zainab Noor', avatar: null },
      text: 'Love the photo! Which camera did you use?',
      time: '45m',
      likes: 0,
    },
  ];

  const renderComment = ({ item }: { item: Comment }) => {
    const initials = item.user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    
    return (
      <View className="flex-row mb-6">
        <View className="w-9 h-9 rounded-full bg-primarySoft items-center justify-center mr-3">
          <Text className="text-xs font-headingBold text-primary">{initials}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-[13px] font-headingBold text-dark">{item.user.name}</Text>
            <Text className="text-[11px] font-body text-gray-400">{item.time}</Text>
          </View>
          <Text className="text-sm font-body text-gray-700 leading-5">{item.text}</Text>
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
          <Text className="text-[10px] font-body text-gray-400 mt-0.5">{item.likes}</Text>
        </TouchableOpacity>
      </View>
    );
  };

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
            <View className="w-6" />
          </View>

          {/* Comments List */}
          <FlatList
            data={MOCK_COMMENTS}
            keyExtractor={(item) => item.id}
            renderItem={renderComment}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          />

          {/* Input Section */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <View className="flex-row items-center px-5 py-3 border-t border-gray-100 bg-white">
              <View className="w-8 h-8 rounded-full bg-primarySoft items-center justify-center mr-3">
                <Text className="text-[11px] font-headingBold text-primary">U</Text>
              </View>
              <TextInput
                placeholder="Add a comment..."
                className="flex-1 h-10 text-sm font-body text-dark"
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity className="ml-3">
                <Text className="text-sm font-headingBold text-primary">Post</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

import React from 'react';
import { View, Text, TouchableOpacity, Pressable, ActivityIndicator, Modal } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { socialApi } from '../../api/social';
import { useSocialActions } from '../../hooks/useSocialActions';
import { NO_PROFILE_IMAGE } from '../../constants/images';

/* ── Quick Profile Modal ── */
export const QuickProfileModal = ({
  userId,
  visible,
  onClose,
}: {
  userId: number | null;
  visible: boolean;
  onClose: () => void;
}) => {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['social-profile-quick', userId],
    queryFn: () => socialApi.getProfile(userId!),
    enabled: !!userId && visible,
  });

  const { toggleFollow, isFollowing } = useSocialActions();

  const profile = data?.profile;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable className="flex-1 bg-black/50 justify-center items-center px-6" onPress={onClose}>
        <Pressable className="w-full bg-white rounded-3xl p-6" onPress={(e) => e.stopPropagation()}>
          {isLoading ? (
            <ActivityIndicator color="#A03048" size="large" className="py-10" />
          ) : profile ? (
            <View>
              <View className="flex-row items-center mb-4">
                <Image
                  source={profile.profile_image_url ? { uri: profile.profile_image_url } : NO_PROFILE_IMAGE}
                  style={{ width: 64, height: 64, borderRadius: 32 }}
                  contentFit="cover"
                />
                <View className="ml-4 flex-1">
                  <Text className="text-xl font-bold text-[#111]">{profile.name}</Text>
                  <Text className="text-gray-500">@{profile.social_username || profile.username}</Text>
                </View>
              </View>

              {profile.bio && <Text className="text-[15px] text-gray-700 mb-6 leading-5">{profile.bio}</Text>}

              <View className="flex-row justify-around mb-8 border-y border-gray-100 py-4">
                <View className="items-center">
                  <Text className="text-lg font-bold text-[#111]">{profile.follower_count}</Text>
                  <Text className="text-xs text-gray-500 uppercase tracking-widest">Followers</Text>
                </View>
                <View className="items-center">
                  <Text className="text-lg font-bold text-[#111]">{profile.following_count}</Text>
                  <Text className="text-xs text-gray-500 uppercase tracking-widest">Following</Text>
                </View>
                <View className="items-center">
                  <Text className="text-lg font-bold text-[#111]">{profile.post_count}</Text>
                  <Text className="text-xs text-gray-500 uppercase tracking-widest">Posts</Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 bg-[#111] py-3.5 rounded-xl items-center"
                  onPress={() => {
                    onClose();
                    router.push(`/(app)/profile/${profile.user_id}`);
                  }}
                >
                  <Text className="text-white font-bold">View Full Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 py-3.5 rounded-xl items-center ${
                    profile.is_following ? 'bg-gray-100' : 'bg-primary'
                  }`}
                  onPress={() => toggleFollow(userId!)}
                  disabled={isFollowing}
                >
                  {isFollowing ? (
                    <ActivityIndicator color={profile.is_following ? '#111' : 'white'} size="small" />
                  ) : (
                    <Text className={`font-bold ${profile.is_following ? 'text-[#111]' : 'text-white'}`}>
                      {profile.is_following ? 'Following' : 'Follow'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text className="text-center py-10 text-gray-500">User not found</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default QuickProfileModal;

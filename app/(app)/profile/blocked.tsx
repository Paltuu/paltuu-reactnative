import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function BlockedUsersScreen() {
  const router = useRouter();

  // Mock data for blocked users shell
  const [blockedUsers, setBlockedUsers] = React.useState([
    { id: 1, name: 'John Doe', username: 'johndoe', avatar: 'https://placehold.co/100x100/A03048/FFFFFF.png?text=JD' },
    { id: 2, name: 'Jane Smith', username: 'janesmith', avatar: 'https://placehold.co/100x100/A03048/FFFFFF.png?text=JS' },
  ]);

  const handleUnblock = (id: number) => {
    setBlockedUsers((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.navigate('/(app)/profile')} className="mr-4 p-1">
          <Feather name="arrow-left" size={24} color="#111" />
        </TouchableOpacity>
        <Text className="font-heading text-xl text-dark">Blocked Users</Text>
      </View>

      {blockedUsers.length > 0 ? (
        <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
          <Text className="font-body text-sm text-gray-500 mb-6">
            When you block someone, they cannot view your profile, posts, or interact with you.
          </Text>

          <View className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
            {blockedUsers.map((user, index) => (
              <View 
                key={user.id} 
                className={`flex-row items-center justify-between p-4 ${index !== blockedUsers.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <View className="flex-row items-center flex-1">
                  <Image 
                    source={{ uri: user.avatar }} 
                    className="w-12 h-12 rounded-full mr-3 bg-gray-200" 
                  />
                  <View className="flex-1 pr-2">
                    <Text className="font-headingSemi text-dark text-base" numberOfLines={1}>{user.name}</Text>
                    <Text className="font-body text-gray-500 text-sm" numberOfLines={1}>@{user.username}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={() => handleUnblock(user.id)}
                  className="bg-primary/10 px-4 py-2 rounded-xl"
                >
                  <Text className="text-primary font-headingSemi text-xs">Unblock</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 justify-center items-center px-10">
          <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4">
            <Feather name="user-check" size={32} color="#9CA3AF" />
          </View>
          <Text className="font-heading text-lg text-dark text-center">No Blocked Users</Text>
          <Text className="font-body text-gray-400 text-center mt-2">
            You haven't blocked anyone yet. Blocked users will appear here.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

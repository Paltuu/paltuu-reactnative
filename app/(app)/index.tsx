import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/authStore';

export default function HomeScreen() {
  const { user, logout } = useAuthStore();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <SafeAreaView className="flex-1 bg-bg px-5 pt-4">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User Nameplate */}
        <View className="flex-row items-center justify-between mb-8">
          <View className="flex-row items-center">
            <View className="w-12 h-12 rounded-full bg-primarySoft justify-center items-center mr-3 border border-primaryMid overflow-hidden">
               {user?.profile_image_url ? (
                 <Image source={{ uri: user.profile_image_url }} className="w-full h-full" />
               ) : (
                 <Text className="text-primary font-heading text-lg">
                   {user?.name?.[0] || 'P'}
                 </Text>
               )}
            </View>
            <View>
              <Text className="font-body text-gray-500 text-xs">{getGreeting()}</Text>
              <Text className="font-heading text-xl text-dark">
                {user?.name?.split(' ')[0] || 'Paltuu User'} 👋
              </Text>
            </View>
          </View>
          
          <TouchableOpacity className="w-10 h-10 rounded-full bg-white justify-center items-center shadow-sm">
            <Text className="text-xl">🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Dashboard Content Placeholder */}
        <View className="bg-white p-6 rounded-card shadow-sm w-full">
          <Text className="font-heading text-lg text-dark mb-2">
            Welcome to Paltuu Mobile
          </Text>
          <Text className="font-body text-gray-500 mb-6">
            Everything you need for your pet is now in your pocket.
          </Text>

          <TouchableOpacity 
            className="bg-primary/10 py-3 rounded-button border border-primary/20"
            onPress={logout}
          >
            <Text className="text-primary font-headingSemi text-center">Logout from App</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

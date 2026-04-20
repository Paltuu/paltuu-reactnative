import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../stores/authStore';

export default function HomeScreen() {
  const { user, logout } = useAuthStore();

  return (
    <SafeAreaView className="flex-1 bg-bg items-center justify-center p-6">
      <View className="bg-white p-8 rounded-card shadow-sm w-full items-center">
        <Text className="font-heading text-2xl text-dark mb-2 text-center">
          Paltuu Dashboard
        </Text>
        <Text className="font-body text-gray-500 mb-8 text-center">
          Welcome back, {user?.name || 'User'}!
        </Text>

        <TouchableOpacity 
          className="bg-primary px-8 py-4 rounded-button w-full"
          onPress={logout}
        >
          <Text className="text-white font-heading text-center">Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { MainHeader } from '../../src/components/common/MainHeader';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  return (
    <SafeAreaView className="flex-1 bg-white pt-10">
      <MainHeader />
      <ScrollView className="flex-1 px-5 pt-6">
        {/* User Profile Info */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden mb-4 border-2 border-primary/20">
            {user?.profile_image_url ? (
              <Image source={{ uri: user.profile_image_url }} className="w-full h-full" />
            ) : (
              <View className="w-full h-full items-center justify-center">
                <Ionicons name="person" size={40} color="#ccc" />
              </View>
            )}
          </View>
          <Text className="font-heading text-xl text-dark">{user?.name || 'User'}</Text>
          <Text className="font-body text-gray-500 text-sm">{user?.email}</Text>
        </View>

        {/* Menu Items */}
        <View className="space-y-4 mb-10">
          <MenuButton icon="paw-outline" title="My Pets" />
          <MenuButton icon="heart-outline" title="Favorites" />
          <MenuButton icon="settings-outline" title="Settings" />
          <MenuButton icon="help-circle-outline" title="Help & Support" />
          
          <TouchableOpacity 
            onPress={logout}
            className="flex-row items-center p-4 bg-red-50 rounded-2xl mt-4"
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text className="ml-3 font-headingSemi text-red-500">Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const MenuButton = ({ icon, title }: { icon: any, title: string }) => (
  <TouchableOpacity className="flex-row items-center justify-between p-4 bg-gray-50 rounded-2xl">
    <View className="flex-row items-center">
        <Ionicons name={icon} size={20} color="#A03048" />
        <Text className="ml-3 font-headingSemi text-dark">{title}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#ccc" />
  </TouchableOpacity>
);

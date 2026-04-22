import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { HEADER_HEIGHT } from '../../src/components/common/MainHeader';
import { useHeaderContext } from '../../src/context/HeaderContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { onScroll } = useHeaderContext();

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <ScrollView 
        className="flex-1 px-5" 
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT + insets.top + 20 }}
      >
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
        <View className="mb-10">
          <MenuButton icon="paw-outline" title="My Pets" />
          <View className="h-4" />
          <MenuButton icon="heart-outline" title="Favorites" />
          <View className="h-4" />
          <MenuButton icon="settings-outline" title="Settings" />
          <View className="h-4" />
          <MenuButton icon="help-circle-outline" title="Help & Support" />
          
          <TouchableOpacity 
            onPress={logout}
            className="flex-row items-center p-4 bg-red-50 rounded-2xl mt-8"
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text className="ml-3 font-headingSemi text-red-500">Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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

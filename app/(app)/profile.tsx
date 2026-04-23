import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const initials = (user?.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── Gradient hero ── */}
        <LinearGradient
          colors={['#A03048', '#c9566d', '#e8d5db']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ paddingTop: insets.top }}
        >
          {/* Top bar */}
          <View className="flex-row justify-between items-center px-5 py-3">
            <Text className="font-heading text-xl text-white">
              {user?.name?.split(' ')[0] || 'Profile'}
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity className="h-10 px-4 rounded-full bg-white/20 items-center justify-center">
                <Text className="font-headingSemi text-sm text-white">Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
                <Ionicons name="menu" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Avatar + name */}
          <View className="items-center pt-4 pb-10">
            <View className="w-24 h-24 rounded-full border-4 border-white bg-white overflow-hidden mb-4">
              {user?.profile_image_url ? (
                <Image source={{ uri: user.profile_image_url }} className="w-full h-full" />
              ) : (
                <View className="w-full h-full items-center justify-center bg-primary/10">
                  <Text className="font-heading text-2xl text-primary">{initials}</Text>
                </View>
              )}
            </View>
            <Text className="font-heading text-2xl text-white">{user?.name || 'User'}</Text>
            <Text className="font-body text-sm text-white/60 mt-1">{user?.email}</Text>
          </View>
        </LinearGradient>

        {/* ── Stats row ── */}
        <View className="mx-5 -mt-6 bg-surface rounded-2xl flex-row shadow-sm border border-gray-100">
          <StatItem value="0" label="Posts" />
          <View className="w-[0.5px] bg-gray-100 my-4" />
          <StatItem value="0" label="Pets" />
          <View className="w-[0.5px] bg-gray-100 my-4" />
          <StatItem value="0" label="Listings" />
        </View>

        {/* ── Menu ── */}
        <View className="px-5 mt-6 gap-3">
          <MenuButton icon="list-outline" title="My Listings" onPress={() => router.push('/(app)/my-listings')} />
          <MenuButton icon="mail-unread-outline" title="Adoption Requests" onPress={() => router.push('/(app)/adoption-requests')} />
          <MenuButton icon="document-text-outline" title="My Applications" onPress={() => router.push('/(app)/my-applications')} />
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
    </View>
  );
}

/* ── Sub-components ── */

const StatItem = ({ value, label }: { value: string; label: string }) => (
  <View className="flex-1 items-center py-4">
    <Text className="font-heading text-xl text-dark">{value}</Text>
    <Text className="font-body text-xs text-gray-500 mt-1">{label}</Text>
  </View>
);

const MenuButton = ({ icon, title, onPress }: { icon: any; title: string; onPress?: () => void }) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex-row items-center justify-between p-4 bg-surface rounded-2xl border border-gray-100"
  >
    <View className="flex-row items-center gap-3">
      <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
        <Ionicons name={icon} size={20} color="#A03048" />
      </View>
      <Text className="font-headingSemi text-base text-dark">{title}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
  </TouchableOpacity>
);

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const router = useRouter();

  const [notifications, setNotifications] = React.useState(true);
  const [emailUpdates, setEmailUpdates] = React.useState(false);
  const [darkTheme, setDarkTheme] = React.useState(false);

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.navigate('/(app)/profile')} className="mr-4 p-1">
          <Feather name="arrow-left" size={24} color="#111" />
        </TouchableOpacity>
        <Text className="font-heading text-xl text-dark">Settings</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <Text className="font-headingSemi text-sm text-primary mb-4 uppercase tracking-wider">Account</Text>
        <View className="bg-gray-50 rounded-2xl mb-8 border border-gray-100 overflow-hidden">
          <TouchableOpacity 
            className="flex-row items-center justify-between p-4 border-b border-gray-100"
            onPress={() => router.push('/(app)/profile/personal-info')}
          >
            <View className="flex-row items-center">
              <Ionicons name="person-outline" size={20} color="#374151" />
              <Text className="font-body text-gray-700 ml-3">Personal Information</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="shield-checkmark-outline" size={20} color="#374151" />
              <Text className="font-body text-gray-700 ml-3">Security & Password</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center">
              <Ionicons name="card-outline" size={20} color="#374151" />
              <Text className="font-body text-gray-700 ml-3">Payment Methods</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Preferences Section */}
        <Text className="font-headingSemi text-sm text-primary mb-4 uppercase tracking-wider">Preferences</Text>
        <View className="bg-gray-50 rounded-2xl mb-8 border border-gray-100 overflow-hidden">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="notifications-outline" size={20} color="#374151" />
              <Text className="font-body text-gray-700 ml-3">Push Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ true: '#A03048', false: '#E5E7EB' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="mail-outline" size={20} color="#374151" />
              <Text className="font-body text-gray-700 ml-3">Email Updates</Text>
            </View>
            <Switch
              value={emailUpdates}
              onValueChange={setEmailUpdates}
              trackColor={{ true: '#A03048', false: '#E5E7EB' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center">
              <Ionicons name="moon-outline" size={20} color="#374151" />
              <Text className="font-body text-gray-700 ml-3">Dark Theme</Text>
            </View>
            <Switch
              value={darkTheme}
              onValueChange={setDarkTheme}
              trackColor={{ true: '#A03048', false: '#E5E7EB' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Danger Zone */}
        <Text className="font-headingSemi text-sm text-red-500 mb-4 uppercase tracking-wider">Danger Zone</Text>
        <View className="bg-red-50 rounded-2xl mb-12 border border-red-100 overflow-hidden">
          <TouchableOpacity className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center">
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
              <Text className="font-body text-red-600 ml-3">Delete Account</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

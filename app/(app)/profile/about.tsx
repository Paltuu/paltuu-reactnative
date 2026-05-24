import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

export default function AboutScreen() {
  const router = useRouter();
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.navigate('/(app)/profile')} className="mr-4 p-1">
          <Feather name="arrow-left" size={24} color="#111" />
        </TouchableOpacity>
        <Text className="font-heading text-xl text-dark">About Paltuu</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-10" showsVerticalScrollIndicator={false}>
        {/* Logo and Version */}
        <View className="items-center mb-10">
          <View className="w-24 h-24 bg-primary/10 rounded-3xl items-center justify-center mb-4">
            <Ionicons name="paw" size={48} color="#A03048" />
          </View>
          <Text className="font-heading text-2xl text-dark mb-1">Paltuu</Text>
          <Text className="font-body text-gray-400 text-sm">Version {appVersion}</Text>
        </View>

        {/* Links */}
        <View className="bg-gray-50 rounded-2xl mb-8 border border-gray-100 overflow-hidden">
          <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-gray-100">
            <Text className="font-body text-gray-700">Terms of Service</Text>
            <Feather name="external-link" size={18} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-gray-100">
            <Text className="font-body text-gray-700">Data Policy</Text>
            <Feather name="external-link" size={18} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center justify-between p-4">
            <Text className="font-body text-gray-700">Open Source Libraries</Text>
            <Feather name="chevron-right" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Social Links */}
        <Text className="font-headingSemi text-sm text-gray-400 mb-4 uppercase tracking-wider text-center">Follow Us</Text>
        <View className="flex-row justify-center space-x-6 mb-12">
          <TouchableOpacity className="bg-gray-100 p-3 rounded-full">
            <Ionicons name="logo-instagram" size={24} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity className="bg-gray-100 p-3 rounded-full">
            <Ionicons name="logo-twitter" size={24} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity className="bg-gray-100 p-3 rounded-full">
            <Ionicons name="logo-facebook" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <Text className="font-body text-gray-400 text-xs text-center pb-10">
          © {new Date().getFullYear()} Paltuu Inc. All rights reserved.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { withFocusUnmount } from '../../../src/components/common/withFocusUnmount';

const LIBRARIES = [
  'expo', 'react', 'react-native', 'react-navigation', 'expo-router',
  '@tanstack/react-query', 'zustand', 'nativewind', 'tailwindcss',
  'react-native-reanimated', 'react-native-gesture-handler', 'react-native-screens',
  'react-native-safe-area-context', 'react-native-svg', 'react-native-pager-view',
  '@gorhom/bottom-sheet', '@shopify/flash-list', 'axios', 'date-fns',
  'socket.io-client', 'react-native-toast-message', 'react-native-controlled-mentions',
].sort();

function LicensesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 py-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-1">
          <Feather name="arrow-left" size={24} color="#111" />
        </TouchableOpacity>
        <Text className="font-heading text-xl text-dark">Open Source Libraries</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="font-body text-gray-400 text-sm mb-6">
          Paltuu is built with the help of these open source projects.
        </Text>
        <View className="bg-gray-50 rounded-2xl mb-8 border border-gray-100 overflow-hidden">
          {LIBRARIES.map((lib, index) => (
            <View
              key={lib}
              className={`p-4 ${index < LIBRARIES.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <Text className="font-body text-gray-700">{lib}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default withFocusUnmount(LicensesScreen);

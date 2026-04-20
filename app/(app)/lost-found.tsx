import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LostFoundScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg px-5 pt-10">
      <Text className="font-heading text-xl text-dark">Lost & Found</Text>
      <Text className="font-body text-gray-500 mt-2">Coming Soon</Text>
    </SafeAreaView>
  );
}

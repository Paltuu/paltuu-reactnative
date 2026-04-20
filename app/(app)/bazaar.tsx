import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BazaarScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg items-center justify-center">
      <Text className="font-heading text-xl text-dark">Bazaar</Text>
      <Text className="font-body text-gray-500 mt-2">Coming Soon</Text>
    </SafeAreaView>
  );
}

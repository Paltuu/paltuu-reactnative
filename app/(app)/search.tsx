import React from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HEADER_HEIGHT } from '../../src/components/common/MainHeader';
import { useHeaderContext } from '../../src/context/HeaderContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SearchScreen() {
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
        <Text className="font-heading text-3xl text-dark mb-6">Search</Text>
        
        <View className="flex-row items-center bg-gray-50 rounded-2xl px-5 py-4 border border-gray-100 shadow-sm">
          <Ionicons name="search-outline" size={24} color="#999" />
          <TextInput
            placeholder="Search for pets, products, or vets..."
            className="flex-1 ml-4 font-body text-base"
          />
        </View>
        
        <View className="items-center justify-center py-20">
          <Ionicons name="search" size={64} color="#F0F0F0" />
          <Text className="font-body text-gray-400 mt-4 text-center">
            Find exactly what you're looking for in the Paltuu universe.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

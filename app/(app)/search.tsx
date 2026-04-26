import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderContext } from '../../src/context/HeaderContext';
import { SearchBar } from '../../src/components/common/SearchBar';
import { useFocusEffect } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { onScroll } = useHeaderContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchKey, setSearchKey] = useState(0);

  // Force re-mount or reset when screen is focused to ensure fresh animation state
  useFocusEffect(
    useCallback(() => {
      return () => {
        setSearchQuery('');
        setSearchKey(prev => prev + 1);
      };
    }, [])
  );

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <ScrollView 
        className="flex-1" 
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ 
          paddingTop: insets.top + 20,
          paddingHorizontal: 16
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-heading text-3xl text-dark mb-4">Search</Text>
        
        <SearchBar
          key={searchKey}
          placeholder="Pet, product, or vet..."
          onSearch={(text) => setSearchQuery(text)}
          onClear={() => setSearchQuery('')}
          containerWidth={screenWidth - 32}
          tint="#A03048"
          centerWhenUnfocused={true}
        />
        
        {searchQuery.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Ionicons name="search" size={64} color="#F0F0F0" />
            <Text className="font-body text-gray-400 mt-4 text-center px-10">
              Find exactly what you're looking for in the Paltuu universe.
            </Text>
          </View>
        ) : (
          <View className="py-10 items-center">
            <Text className="font-body text-gray-400">
              Searching for "{searchQuery}"...
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

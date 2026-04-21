import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MainHeader } from '../../src/components/common/MainHeader';
import { useCollapsibleHeader } from '../../src/hooks/useCollapsibleHeader';

export default function PetsHubScreen() {
  const router = useRouter();
  const { scrollY, translateY, totalHeaderHeight } = useCollapsibleHeader();

  const options = [
    {
      title: 'ADOPT',
      subtitle: 'Find your perfect companion',
      icon: 'paw',
      route: '/(app)/adopt',
      color: '#A03048'
    },
    {
      title: 'PET CARE',
      subtitle: 'Professional services for your pets',
      icon: 'heart',
      route: '/(app)/pet-care',
      color: '#4B9CD3'
    },
    {
      title: 'LOST & FOUND',
      subtitle: 'Help pets find their home',
      icon: 'megaphone',
      route: '/(app)/lost-found',
      color: '#F5A623'
    }
  ];

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <MainHeader translateY={translateY} />
      
      <Animated.ScrollView 
        className="flex-1 px-5" 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: totalHeaderHeight }}
      >
        <View className="py-8">
          <Text className="font-heading text-3xl text-dark mb-2">Pets Section</Text>
          <Text className="font-body text-gray-500">Choose a service to continue</Text>
        </View>

        <View className="space-y-4">
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => router.push(option.route as any)}
              className="bg-gray-50 p-6 rounded-[2rem] flex-row items-center border border-gray-100 shadow-sm mb-4"
            >
              <View 
                className="w-16 h-16 rounded-2xl items-center justify-center mr-5 shadow-sm"
                style={{ backgroundColor: option.color + '15' }}
              >
                <Ionicons name={option.icon as any} size={32} color={option.color} />
              </View>
              <View className="flex-1">
                <Text className="font-heading text-xl text-dark mb-1">{option.title}</Text>
                <Text className="font-body text-gray-400 text-xs">{option.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

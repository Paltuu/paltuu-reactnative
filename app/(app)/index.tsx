import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, ScrollView, FlatList } from 'react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { usePetStore } from '../../src/stores/petStore';
import { useBazaarStore } from '../../src/stores/bazaarStore';
import { PetCard } from '../../src/components/pets/PetCard';
import { ProductCard } from '../../src/components/bazaar/ProductCard';
import { useRouter } from 'expo-router';
import { HEADER_HEIGHT } from '../../src/components/common/MainHeader';
import { useHeaderContext } from '../../src/context/HeaderContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onScroll } = useHeaderContext();

  const { pets, fetchPets, isLoading: petsLoading } = usePetStore();
  const { products, fetchProducts, isLoading: productsLoading } = useBazaarStore();

  useEffect(() => {
    // Fetch initial board data through stores
    fetchPets({ limit: 6 });
    fetchProducts({ limit: 4 });
  }, []);

  const featuredPets = pets.slice(0, 6);
  const trendingProducts = products.slice(0, 4);
  const loading = petsLoading || productsLoading;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#A03048" />
        <Text className="mt-4 font-body text-gray-400">Loading your world...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT + insets.top + 8 }}
      >
        {/* Welcome Section */}
        <View className="px-5 pt-4 pb-6">
          <Text className="text-gray-400 font-body text-xs mb-1">{getGreeting()},</Text>
          <Text className="font-heading text-2xl text-dark capitalize">{user?.name || 'Friend'} 👋</Text>
        </View>

        {/* Featured Pets Section */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center px-5 mb-4">
            <Text className="font-heading text-lg text-dark">Recent Pets</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/pets')}>
              <Text className="text-primary font-headingSemi text-xs">View All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {featuredPets.map((pet) => (
              <View key={pet.pet_id} style={{ width: 280, marginRight: 16 }}>
                <PetCard
                  pet={pet}
                  onPress={() => router.push({ pathname: '/(app)/pet-details', params: { id: pet.pet_id } })}
                />
              </View>
            ))}
            {featuredPets.length === 0 && (
              <View className="bg-gray-50 p-10 rounded-card items-center justify-center w-[300px]">
                <Text className="font-body text-gray-400">No pets nearby</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Trending Products */}
        <View className="px-5 mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-heading text-lg text-dark">Paltuu Bazaar</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/bazaar')}>
              <Text className="text-primary font-headingSemi text-xs">Shop All</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap justify-between">
            {trendingProducts.map((product) => (
              <ProductCard
                key={product.product_id}
                product={product}
                style={{ width: '48%' }}
                onPress={() => router.push({ pathname: '/(app)/product-details', params: { id: product.product_id } })}
              />
            ))}
          </View>

          {trendingProducts.length === 0 && (
            <View className="bg-gray-50 p-10 rounded-card items-center justify-center w-full">
              <Text className="font-body text-gray-400">Marketplace loading...</Text>
            </View>
          )}
        </View>

        {/* Logout Placeholder */}
        <View className="px-5 pb-10">
          <TouchableOpacity
            className="bg-gray-100 py-4 rounded-button"
            onPress={logout}
          >
            <Text className="text-gray-500 font-headingSemi text-center">Logout from App</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

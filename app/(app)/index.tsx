import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { petsApi } from '../../src/api/pets';
import { bazaarApi } from '../../src/api/bazaar';
import { PetCard } from '../../src/components/pets/PetCard';
import { ProductCard } from '../../src/components/bazaar/ProductCard';
import { useRouter } from 'expo-router';
import { MainHeader } from '../../src/components/common/MainHeader';


export default function HomeScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [featuredPets, setFeaturedPets] = useState<any[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [petsRes, productsRes] = await Promise.all([
        petsApi.getPets({ limit: 6 }),
        bazaarApi.getProducts({ limit: 4 })
      ]);
      
      const petsList = petsRes?.data || petsRes || [];
      const productsList = productsRes?.data || productsRes || [];

      // Map products to ensure image_url exists for the component
      const mappedProducts = productsList.map((p: any) => ({
        ...p,
        image_url: p.images?.[0] || p.main_image || p.image || null,
        category_name: p.categories?.[0]?.name || 'Product'
      }));

      setFeaturedPets(Array.isArray(petsList) ? petsList : []);
      setTrendingProducts(Array.isArray(mappedProducts) ? mappedProducts : []);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#A03048" />
        <Text className="mt-4 font-body text-gray-400">Loading your world...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white pt-10">
      <MainHeader />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
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
    </SafeAreaView>
  );
}

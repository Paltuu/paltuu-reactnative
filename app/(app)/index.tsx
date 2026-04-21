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
        petsApi.getPets({ page: 1 }),
        bazaarApi.getProducts({ page: 1 })
      ]);
      
      const petsList = petsRes?.data || petsRes || [];
      const productsList = productsRes?.data || productsRes || [];

      setFeaturedPets(Array.isArray(petsList) ? petsList.slice(0, 3) : []);
      setTrendingProducts(Array.isArray(productsList) ? productsList.slice(0, 4) : []);
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

  return (
    <SafeAreaView className="flex-1 bg-white pt-10">
      <MainHeader />
      <ScrollView className="flex-1">
        {/* Simple Welcome Section */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-gray-400 font-body text-xs mb-1">{getGreeting()},</Text>
          <Text className="font-heading text-2xl text-dark capitalize">{user?.name || 'Friend'} 👋</Text>
        </View>

        {/* Dashboard Content Placeholder */}
        <View className="bg-white p-6 rounded-card shadow-sm w-full">
          <Text className="font-heading text-lg text-dark mb-2">
            Welcome to Paltuu Mobile
          </Text>
          <Text className="font-body text-gray-500 mb-6">
            Everything you need for your pet is now in your pocket.
          </Text>

          <TouchableOpacity
            className="bg-primary/10 py-3 rounded-button border border-primary/20"
            onPress={logout}
          >
            <Text className="text-primary font-headingSemi text-center">Logout from App</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

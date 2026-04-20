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

export default function HomeScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [featuredPets, setFeaturedPets] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [pets, products] = await Promise.all([
        petsApi.getPets({ page: 1 }),
        bazaarApi.getProducts({ page: 1 })
      ]);
      setFeaturedPets(pets.slice(0, 3));
      setTrendingProducts(products.slice(0, 4));
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <SafeAreaView className="flex-1 bg-bg px-5">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between mt-4 mb-8">
          <View>
            <Text className="font-body text-gray-500 text-xs">{getGreeting()}</Text>
            <Text className="font-heading text-xl text-dark">
              {user?.name?.split(' ')[0] || 'Paltuu User'} 👋
            </Text>
          </View>
          <TouchableOpacity className="w-10 h-10 rounded-full bg-surface items-center justify-center shadow-sm">
            <Feather name="bell" size={20} color="#A03048" />
          </TouchableOpacity>
        </View>

        {/* Quick Actions Grid */}
        <View className="flex-row justify-between mb-8">
          {[
            { id: 'pets', name: 'Adopt', icon: 'heart', color: '#8B1538', route: '/pets' },
            { id: 'bazaar', name: 'Shop', icon: 'shopping-bag', color: '#2563EB', route: '/bazaar' },
            { id: 'vets', name: 'Vets', icon: 'plus-square', color: '#10B981', route: '/pet-care' },
            { id: 'lost', name: 'Lost', icon: 'alert-triangle', color: '#EF4444', route: '/lost-found' }
          ].map((item) => (
            <TouchableOpacity 
              key={item.id} 
              onPress={() => router.push(item.route)}
              className="items-center"
            >
              <View className="bg-surface w-14 h-14 rounded-2xl items-center justify-center shadow-sm mb-2">
                <Feather name={item.icon as any} size={24} color={item.color} />
              </View>
              <Text className="font-heading text-[10px] text-gray-500 uppercase">{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Featured Pets Section */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-heading text-lg text-dark">New Arrivals</Text>
            <TouchableOpacity onPress={() => router.push('/pets')}>
              <Text className="text-primary font-heading text-xs">View All</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <ActivityIndicator color="#A03048" />
          ) : (
            featuredPets.map(pet => (
              <PetCard key={pet.pet_id} pet={pet} onPress={() => {}} />
            ))
          )}
        </View>

        {/* Trending Products Section */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-heading text-lg text-dark">Trending Bazaar</Text>
            <TouchableOpacity onPress={() => router.push('/bazaar')}>
              <Text className="text-primary font-heading text-xs">Shop Now</Text>
            </TouchableOpacity>
          </View>
          
          <View className="flex-row flex-wrap justify-between">
            {trendingProducts.map(product => (
              <ProductCard key={product.product_id} product={product} onPress={() => {}} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

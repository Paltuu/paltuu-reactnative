import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, FlatList, Image, TouchableOpacity,
  ActivityIndicator, ScrollView, TextInput
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { bazaarApi } from '../../src/api/bazaar';
import { Ionicons } from '@expo/vector-icons';
import { MainHeader } from '../../src/components/common/MainHeader';
import { ProductCard } from '../../src/components/bazaar/ProductCard';
import { useRouter } from 'expo-router';

const BAZAAR_CATEGORIES = [
  { title: "All", slug: undefined },
  { title: "Cat Food", slug: "food", keyword: "cat" },
  { title: "Dog Food", slug: "food", keyword: "dog" },
  { title: "Accessories", slug: "accessories" },
  { title: "Housing", slug: "housing" }
];

export default function BazaarScreen() {
  const router = useRouter();
  const [selectedCat, setSelectedCat] = useState(BAZAAR_CATEGORIES[0]);
  const [search, setSearch] = useState('');

  const { data: productData, isLoading, refetch } = useQuery({
    queryKey: ['bazaar', selectedCat, search],
    queryFn: () => bazaarApi.getProducts({
      categorySlug: selectedCat.slug,
      keyword: search || selectedCat.keyword,
      limit: 20
    }),
  });

  const products = productData?.data || [];

  const renderProductCard = ({ item }: { item: any }) => (
    <ProductCard 
      product={item} 
      onPress={() => router.push({ pathname: '/(app)/product-details', params: { id: item.product_id } })}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-bg pt-10">
      <MainHeader />
      <View className="px-5 pb-2 pt-4">
        <Text className="font-heading text-2xl text-dark mb-4">Paltuu Bazaar</Text>

        {/* Search */}
        <View className="flex-row items-center bg-white rounded-xl px-4 py-3 border border-gray-100 mb-4 shadow-sm">
          <Ionicons name="search-outline" size={20} color="#999" />
          <TextInput
            placeholder="Search products..."
            className="flex-1 ml-3 font-body text-sm"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Category Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {BAZAAR_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.title}
              onPress={() => setSelectedCat(cat)}
              className={`px-6 py-2 rounded-full mr-3 border ${selectedCat.title === cat.title ? 'bg-primary border-primary' : 'bg-white border-gray-200'
                }`}
            >
              <Text className={`font-headingSemi text-xs ${selectedCat.title === cat.title ? 'text-white' : 'text-gray-600'
                }`}>
                {cat.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#a03048" />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.product_id.toString()}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100 }}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <View className="py-20 items-center">
              <Text className="font-body text-gray-500">No products found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

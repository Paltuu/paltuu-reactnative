import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  ActivityIndicator, TextInput, FlatList, ScrollView
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { bazaarApi } from '../../src/api/bazaar';
import { Ionicons } from '@expo/vector-icons';
import { HEADER_HEIGHT } from '../../src/components/common/MainHeader';
import { ProductCard } from '../../src/components/bazaar/ProductCard';
import { useRouter } from 'expo-router';
import { useHeaderContext } from '../../src/context/HeaderContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BAZAAR_CATEGORIES = [
  { title: "All", slug: undefined },
  { title: "Cat Food", slug: "food", keyword: "cat" },
  { title: "Dog Food", slug: "food", keyword: "dog" },
  { title: "Accessories", slug: "accessories" },
  { title: "Housing", slug: "housing" }
];

export default function BazaarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onScroll } = useHeaderContext();
  const [selectedCat, setSelectedCat] = useState(BAZAAR_CATEGORIES[0]);
  const [search, setSearch] = useState('');

  const { data: productData, isLoading, refetch } = useQuery({
    queryKey: ['bazaar', selectedCat, search],
    queryFn: async () => {
      const filters: any = { limit: 20 };
      if (selectedCat.slug) filters.categorySlug = selectedCat.slug;
      if (search || selectedCat.keyword) filters.keyword = search || selectedCat.keyword;
      
      const res = await bazaarApi.getProducts(filters);
      return res;
    },
  });

  const findArray = (obj: any): any[] => {
    if (Array.isArray(obj)) return obj;
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (Array.isArray(obj[key])) return obj[key];
        const nested = findArray(obj[key]);
        if (nested.length > 0) return nested;
      }
    }
    return [];
  };

  const products = findArray(productData);

  const renderProductCard = ({ item }: { item: any }) => (
    <View style={{ flex: 0.5, padding: 4 }}>
      <ProductCard 
        product={item} 
        onPress={() => router.push({ pathname: '/(app)/product-details', params: { id: item.product_id } })}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#a03048" />
        </View>
      ) : (
        <FlatList
          key="bazaar-grid"
          data={products}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.product_id?.toString() || Math.random().toString()}
          numColumns={2}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ 
            paddingTop: HEADER_HEIGHT + insets.top + 8,
            paddingHorizontal: 12, 
            paddingBottom: 100 
          }}
          onRefresh={refetch}
          refreshing={isLoading}
          ListHeaderComponent={
            <View className="pb-2 pt-4">
              <Text className="font-heading text-2xl text-dark mb-4">Paltuu Bazaar</Text>

              {/* Search */}
              <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 mb-4 shadow-sm">
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
          }
          ListEmptyComponent={
            <View className="py-20 items-center">
              <Text className="font-body text-gray-500">No products found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

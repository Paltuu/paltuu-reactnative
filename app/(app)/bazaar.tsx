import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { bazaarApi } from '../../src/api/bazaar';
import { ProductCard } from '../../src/components/bazaar/ProductCard';

export default function BazaarScreen() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        bazaarApi.getProducts(),
        bazaarApi.getCategories()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Bazaar fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = async (categoryId) => {
    try {
      setSelectedCategory(categoryId);
      setLoading(true);
      const filtered = await bazaarApi.getProducts({ category: categoryId });
      setProducts(filtered);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg px-5">
      {/* Header */}
      <View className="flex-row items-center justify-between mt-4 mb-6">
        <View>
          <Text className="font-heading text-2xl text-dark">Paltuu Bazaar</Text>
          <Text className="font-body text-gray-500">Premium pet supplies</Text>
        </View>
        <TouchableOpacity className="bg-surface p-3 rounded-full shadow-sm">
          <Feather name="shopping-bag" size={20} color="#A03048" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View className="bg-surface h-12 px-4 rounded-xl flex-row items-center mb-6 shadow-sm">
        <Feather name="search" size={18} color="#9CA3AF" />
        <TextInput
          placeholder="Search products..."
          className="flex-1 ml-2 font-body text-dark"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Categories */}
      <View className="mb-6">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => handleCategorySelect(null)}
            className={`px-6 py-2 rounded-full mr-3 ${selectedCategory === null ? 'bg-primary' : 'bg-surface border border-gray-100'}`}
          >
            <Text className={`font-heading text-xs ${selectedCategory === null ? 'text-white' : 'text-gray-500'}`}>
              All
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.category_id}
              onPress={() => handleCategorySelect(cat.category_id)}
              className={`px-6 py-2 rounded-full mr-3 ${selectedCategory === cat.category_id ? 'bg-primary' : 'bg-surface border border-gray-100'}`}
            >
              <Text className={`font-heading text-xs ${selectedCategory === cat.category_id ? 'text-white' : 'text-gray-500'}`}>
                {cat.category_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Product Grid */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#A03048" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.product_id.toString()}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => console.log('Product pressed', item.product_id)}
            />
          )}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center mt-10">
              <Text className="font-body text-gray-400">No products found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

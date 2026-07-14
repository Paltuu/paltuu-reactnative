import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  ActivityIndicator, TextInput,
  Modal, ScrollView, SafeAreaView
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useBazaarStore } from '../../src/stores/bazaarStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { HEADER_HEIGHT } from '../../src/components/common/MainHeader';
import { ProductCard } from '../../src/components/bazaar/ProductCard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useHeaderContext } from '../../src/context/HeaderContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { withFocusUnmount } from '../../src/components/common/withFocusUnmount';

const PET_TYPES = [
  { label: 'All Pets', value: '' },
  { label: 'Cats', value: 'cat' },
  { label: 'Dogs', value: 'dog' },
  { label: 'Birds', value: 'bird' },
  { label: 'Fish', value: 'fish' },
];

const SORT_OPTIONS = [
  { label: 'Recommended', value: '' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Newest First', value: 'new' },
  { label: 'Best Deals', value: 'discount' },
];

function MarketplaceScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { scrollHandler } = useHeaderContext();

  const { 
    products, 
    categories, 
    isLoading, 
    isFetchingNextPage, 
    fetchProducts, 
    fetchNextPage, 
    fetchCategories,
    meta
  } = useBazaarStore();

  // Local sync for UI inputs
  const [keyword, setKeyword] = useState((searchParams.keyword as string) || '');
  const [category, setCategory] = useState((searchParams.categorySlug as string) || (searchParams.category as string) || '');
  const [petType, setPetType] = useState((searchParams.petType as string) || '');
  const [sortBy, setSortBy] = useState((searchParams.sortBy as any) || '');
  
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  useEffect(() => {
    fetchCategories();
    // Initial fetch based on URL params
    fetchProducts({ 
      keyword, 
      categorySlug: category, 
      petType, 
      sortBy 
    });
  }, []);

  // When filters change locally, we fetch
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchProducts({ 
        keyword, 
        categorySlug: category, 
        petType, 
        sortBy 
      });
    }, 300);
    return () => clearTimeout(handler);
  }, [keyword, category, petType, sortBy]);

  const handleReset = () => {
    setKeyword('');
    setCategory('');
    setPetType('');
    setSortBy('');
  };

  const renderProduct = useCallback(({ item }: { item: any }) => (
    <View style={{ flex: 0.5, padding: 8 }}>
      <ProductCard
        product={item}
        onPress={() => router.push({ pathname: '/(app)/product-details', params: { id: item.product_id } })}
      />
    </View>
  ), [router]);

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Header / Search Area */}
      <View 
        style={{ 
            paddingTop: insets.top + (HEADER_HEIGHT / 2), 
            paddingHorizontal: 20, 
            paddingBottom: 16,
            backgroundColor: 'white',
            borderBottomWidth: 1,
            borderBottomColor: '#f3f4f6',
            zIndex: 10
        }}
        className="shadow-sm"
      >
        <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => router.back()} className="p-2">
                <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
            </TouchableOpacity>
            <View className="flex-1 flex-row items-center bg-gray-100 rounded-2xl px-4 py-2">
                <Ionicons name="search-outline" size={20} color="#9ca3af" />
                <TextInput 
                    placeholder="Search Bazaar..."
                    className="flex-1 ml-2 font-body text-base py-1"
                    value={keyword}
                    onChangeText={setKeyword}
                    returnKeyType="search"
                />
                {keyword.length > 0 && (
                    <TouchableOpacity onPress={() => setKeyword('')}>
                        <Ionicons name="close-circle" size={18} color="#9ca3af" />
                    </TouchableOpacity>
                )}
            </View>
            <TouchableOpacity 
                onPress={() => setIsFilterVisible(true)}
                className={`p-3 rounded-2xl border ${ (category || petType || sortBy) ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}
            >
                <MaterialCommunityIcons 
                    name="tune-variant" 
                    size={20} 
                    color={(category || petType || sortBy) ? 'white' : '#1a1a1a'} 
                />
            </TouchableOpacity>
        </View>
        
        {/* Quick Pet Type Filter */}
        <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            className="mt-4"
            contentContainerStyle={{ gap: 8 }}
        >
            {PET_TYPES.map((type) => (
                <TouchableOpacity
                    key={type.value}
                    onPress={() => setPetType(type.value)}
                    className={`px-5 py-2 rounded-full border ${petType === type.value ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}
                >
                    <Text className={`font-headingSemi text-xs ${petType === type.value ? 'text-white' : 'text-gray-600'}`}>
                        {type.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
      </View>

      {/* Product List */}
      <Animated.FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.product_id?.toString() || Math.random().toString()}
        numColumns={2}
        contentContainerStyle={{ padding: 8, paddingBottom: 100 }}
        onEndReached={() => {
            if (meta.page < meta.totalPages && !isFetchingNextPage) {
                fetchNextPage();
            }
        }}
        onEndReachedThreshold={0.5}
        windowSize={5}
        maxToRenderPerBatch={6}
        initialNumToRender={8}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
        ListFooterComponent={() => (
            isFetchingNextPage ? (
                <View className="py-6">
                    <ActivityIndicator color="#a03048" />
                </View>
            ) : null
        )}
        ListEmptyComponent={() => (
            !isLoading ? (
                <View className="py-20 items-center">
                    <MaterialCommunityIcons name="store-search-outline" size={64} color="#e5e7eb" />
                    <Text className="font-headingBold text-gray-400 mt-4 text-lg">No products found</Text>
                    <TouchableOpacity onPress={handleReset} className="mt-4">
                        <Text className="text-primary font-headingSemi">Clear all filters</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View className="flex-1 justify-center items-center py-20">
                     <ActivityIndicator size="large" color="#a03048" />
                </View>
            )
        )}
        refreshing={isLoading && products.length > 0}
        onRefresh={() => fetchProducts({ keyword, categorySlug: category, petType, sortBy }, true)}
        onScroll={scrollHandler}
      />

      {/* Filter Modal */}
      <Modal
        visible={isFilterVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterVisible(false)}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View className="bg-white rounded-t-[3rem] p-8 max-h-[85%]">
                <View className="flex-row justify-between items-center mb-8">
                    <Text className="text-2xl font-headingBold text-gray-900">Filters</Text>
                    <TouchableOpacity onPress={() => setIsFilterVisible(false)} className="p-2">
                        <Ionicons name="close" size={28} color="#1a1a1a" />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} className="mb-6">
                    {/* Categories */}
                    <Text className="text-xs uppercase tracking-widest font-black text-gray-400 mb-4">Category</Text>
                    <View className="flex-row flex-wrap gap-2 mb-8">
                        <TouchableOpacity 
                            onPress={() => setCategory('')}
                            className={`px-4 py-2 rounded-xl border ${category === '' ? 'bg-primary/10 border-primary' : 'bg-gray-50 border-transparent'}`}
                        >
                            <Text className={`font-headingSemi text-xs ${category === '' ? 'text-primary' : 'text-gray-600'}`}>All Categories</Text>
                        </TouchableOpacity>
                        {categories.map((cat: any) => (
                            <TouchableOpacity
                                key={cat.category_id}
                                onPress={() => setCategory(cat.slug)}
                                className={`px-4 py-2 rounded-xl border ${category === cat.slug ? 'bg-primary/10 border-primary' : 'bg-gray-50 border-transparent'}`}
                            >
                                <Text className={`font-headingSemi text-xs ${category === cat.slug ? 'text-primary' : 'text-gray-600'}`}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Sort By */}
                    <Text className="text-xs uppercase tracking-widest font-black text-gray-400 mb-4">Sort By</Text>
                    <View className="flex-row flex-wrap gap-2 mb-8">
                        {SORT_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.value}
                                onPress={() => setSortBy(opt.value)}
                                className={`px-4 py-2 rounded-xl border ${sortBy === opt.value ? 'bg-primary/10 border-primary' : 'bg-gray-50 border-transparent'}`}
                            >
                                <Text className={`font-headingSemi text-xs ${sortBy === opt.value ? 'text-primary' : 'text-gray-600'}`}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>

                <View className="flex-row gap-4">
                    <TouchableOpacity 
                        onPress={handleReset}
                        className="flex-1 py-4 rounded-2xl bg-gray-100 items-center justify-center"
                    >
                        <Text className="font-headingBold text-gray-600">Reset</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setIsFilterVisible(false)}
                        className="flex-[2] py-4 rounded-2xl bg-primary items-center justify-center shadow-lg shadow-primary/30"
                    >
                        <Text className="font-headingBold text-white">Apply Filters</Text>
                    </TouchableOpacity>
                </View>
                <SafeAreaView />
            </View>
        </View>
      </Modal>
    </View>
  );
}

export default withFocusUnmount(MarketplaceScreen);

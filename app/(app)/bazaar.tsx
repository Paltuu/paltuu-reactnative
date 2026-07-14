import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  ActivityIndicator, TextInput, ScrollView,
  Dimensions, RefreshControl
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bazaarApi, BazaarFilters } from '../../src/api/bazaar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { HEADER_HEIGHT } from '../../src/components/common/MainHeader';
import { ProductCard } from '../../src/components/bazaar/ProductCard';
import { useRouter } from 'expo-router';
import { useHeaderContext } from '../../src/context/HeaderContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { withFocusUnmount } from '../../src/components/common/withFocusUnmount';
// We'll stick to React Native Views for animations

const { width } = Dimensions.get('window');

// Enhanced categories matching the web's premium sections
const PREMIUM_SECTIONS = [
  { title: "Trending", icon: "trending-up", sortBy: 'trending' as const },
  { title: "Most Discounted", icon: "tag-outline", sortBy: 'discount' as const },
  { title: "Cat Food", icon: "cat", slug: "food", keyword: "cat" },
  { title: "Dog Food", icon: "dog", slug: "food", keyword: "dog" },
  { title: "Accessories", icon: "scissors-cutting", slug: "accessories" },
  { title: "Housing", icon: "home-outline", slug: "housing" }
];

// Brand definitions from web
const BRANDS = [
  { name: "Felicia", slug: "felicia", image: require('../../assets/bazaar/felicia gemini.png') },
  { name: "Prochoice", slug: "prochoice", image: require('../../assets/bazaar/prochoice gemini.png') },
  { name: "Homie", slug: "homie", image: require('../../assets/bazaar/homie gemini.png') },
  { name: "Petline", slug: "petline", image: require('../../assets/bazaar/petline gemini.png') },
  { name: "Pedigree", slug: "pedigree", image: require('../../assets/bazaar/pedigree gemini.png') },
  { name: "Gourmet", slug: "gourmet", image: require('../../assets/bazaar/gourmet gemini.png') },
  { name: "Brit Care", slug: "brit-care", image: require('../../assets/bazaar/brit care gemini.png') },
  { name: "Royal Canin", slug: "royal-canin", image: require('../../assets/bazaar/royal canine gemini.png') },
  { name: "Whiskas", slug: "whiskas", image: require('../../assets/bazaar/whiskas gemini.png') },
  { name: "Fluff'n Bluff", slug: "fluff-n-bluff", image: require('../../assets/bazaar/fnb gemini.png') },
  { name: "Jungle", slug: "jungle", image: require('../../assets/bazaar/jungle gemini.png') },
];

const ProductSection = ({ title, icon, filters, onSeeAll }: { title: string, icon: any, filters: BazaarFilters, onSeeAll: () => void }) => {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['bazaar-section', title],
    queryFn: () => bazaarApi.getProducts({ ...filters, limit: 10 }),
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

  const products = findArray(data);

  if (!isLoading && products.length === 0) return null;

  return (
    <View className="mb-10">
      <View className="flex-row justify-between items-center px-6 mb-4">
        <View className="flex-row items-center gap-2">
          {icon.includes('-') ? (
             <MaterialCommunityIcons name={icon} size={22} color="#a03048" />
          ) : (
            <Ionicons name={icon} size={22} color="#a03048" />
          )}
          <Text className="text-xl font-headingBold text-dark">{title}</Text>
        </View>
        <TouchableOpacity onPress={onSeeAll}>
          <Text className="text-primary font-headingSemi text-sm">View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={{ paddingHorizontal: 20 }}
        snapToInterval={220}
        decelerationRate="fast"
      >
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <View key={i} style={{ width: 200, height: 280, marginRight: 16, backgroundColor: '#f3f4f6', borderRadius: 24 }} />
          ))
        ) : (
          products.map((item) => (
            <View key={item.product_id} style={{ width: 200, marginRight: 16 }}>
              <ProductCard 
                product={item} 
                onPress={() => router.push({ pathname: '/(app)/product-details', params: { id: item.product_id } })}
              />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

function BazaarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scrollHandler } = useHeaderContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDowntime] = useState(false); // Mobile active for testing
  const [refreshing, setRefreshing] = useState(false);

  const handleSearch = () => {
    if (search.trim()) {
      router.push({ pathname: '/(app)/marketplace', params: { keyword: search.trim() } });
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['bazaar-section'] });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  if (isDowntime) {
    return (
      <View className="flex-1 bg-white justify-center items-center px-8">
        <View className="w-24 h-24 rounded-[2rem] bg-primary/10 items-center justify-center mb-8">
          <MaterialCommunityIcons name="storefront-outline" size={48} color="#a03048" />
        </View>
        <Text className="text-3xl font-headingBold text-gray-900 mb-4 text-center">Bazaar is Refurbishing</Text>
        <Text className="text-gray-500 font-body text-center mb-10 leading-6">
          We're perfecting your shopping experience. We'll be back soon with something special for you and your furry friends!
        </Text>
        <TouchableOpacity 
          onPress={() => router.replace('/(app)/')}
          className="bg-primary px-10 py-5 rounded-3xl shadow-xl shadow-primary/20"
        >
          <Text className="text-white font-headingBold text-lg">Return to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        contentContainerStyle={{ 
          paddingTop: HEADER_HEIGHT + insets.top,
          paddingBottom: 100 
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#a03048" />
        }
      >
        {/* 🐾 Hero Section */}
        <View className="w-full aspect-[4/5] bg-white overflow-hidden">
          <Image 
            source={require('../../assets/bazaar/tall.png')}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={500}
          />
        </View>

        {/* 🔍 Search Bar Section */}
        <View className="px-6 py-8">
           <View className="relative">
              <View className="flex-row items-center bg-white rounded-3xl px-5 py-4 border-2 border-gray-100 shadow-sm">
                <Ionicons name="search-outline" size={22} color="#9ca3af" />
                <TextInput
                  placeholder="Look for your favorite products"
                  className="flex-1 ml-3 font-body text-base text-gray-900"
                  value={search}
                  onChangeText={setSearch}
                  onSubmitEditing={handleSearch}
                />
                <TouchableOpacity 
                    onPress={handleSearch}
                    className="bg-primary p-2 rounded-xl"
                >
                    <Ionicons name="arrow-forward" size={18} color="white" />
                </TouchableOpacity>
              </View>
              <Text className="text-center text-gray-400 font-body text-xs mt-4">
                Discover amazing pet products for your furry friend
              </Text>
           </View>
        </View>

        {/* 🛍️ Curated Sections */}
        {PREMIUM_SECTIONS.map((section) => (
          <ProductSection 
            key={section.title}
            title={section.title}
            icon={section.icon}
            filters={{
              sortBy: section.sortBy,
              categorySlug: section.slug,
              keyword: section.keyword
            }}
            onSeeAll={() => {
              router.push({ 
                pathname: '/(app)/marketplace', 
                params: { 
                    sortBy: section.sortBy || '',
                    categorySlug: section.slug || '',
                    keyword: section.keyword || ''
                } 
              });
            }}
          />
        ))}

        {/* 🏢 Shop by Brands Section */}
        <View className="mb-10 mt-4">
          <View className="flex-row justify-between items-center px-6 mb-6">
            <View className="flex-row items-center gap-2">
              <MaterialCommunityIcons name="store-outline" size={24} color="#a03048" />
              <Text className="text-2xl font-headingBold text-gray-900">Shop by Brands</Text>
            </View>
            <TouchableOpacity onPress={() => {}}>
              <Text className="text-primary font-headingSemi text-sm">View All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{ paddingHorizontal: 20 }}
            snapToInterval={180}
            decelerationRate="fast"
          >
            {BRANDS.map((brand) => (
              <TouchableOpacity 
                key={brand.slug}
                className="w-40 mr-6 bg-white rounded-[2.5rem] border-2 border-gray-50 shadow-sm items-center p-4 overflow-hidden"
              >
                <View className="w-full aspect-square rounded-2xl bg-white p-2">
                  <Image 
                    source={brand.image}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="contain"
                  />
                </View>
                <Text className="font-headingBold text-sm text-gray-900 mt-2">{brand.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

      </Animated.ScrollView>
    </View>
  );
}

export default withFocusUnmount(BazaarScreen);

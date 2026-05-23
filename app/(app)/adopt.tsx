import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity,
  ActivityIndicator, ScrollView, TextInput, Modal,
  Platform, StyleSheet, Animated, FlatList
} from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { petApi, PetFilters } from '../../src/api/pets';
import { Ionicons } from '@expo/vector-icons';
import { HEADER_HEIGHT } from '../../src/components/common/MainHeader';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useHeaderContext } from '../../src/context/HeaderContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Local helper to format age
const formatAge = (ageMonths: number | null | undefined): string => {
  if (ageMonths === null || ageMonths === undefined || ageMonths < 0) {
    return "Unknown age";
  }
  if (ageMonths === 0) return "Newborn";
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  const yearStr = years > 0 ? `${years} ${years === 1 ? "Year" : "Years"}` : "";
  const monthStr = months > 0 ? `${months} ${months === 1 ? "Month" : "Months"}` : "";
  if (yearStr && monthStr) return `${yearStr}, ${monthStr}`;
  return yearStr || monthStr;
};

export default function AdoptScreen() {
  const router = useRouter();
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isCityModalVisible, setIsCityModalVisible] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  
  const [filters, setFilters] = useState<PetFilters>({
    species: undefined,
    city: undefined,
    breed: '',
  });

  const insets = useSafeAreaInsets();
  const { onScroll } = useHeaderContext();

  // --- Infinite Query ---
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching
  } = useInfiniteQuery({
    queryKey: ['pets', filters],
    queryFn: ({ pageParam = 1 }) => petApi.getAdoptionPets({
      ...filters,
      page: pageParam,
      limit: 10
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.data?.length === 10) {
        return allPages.length + 1;
      }
      return undefined;
    },
  });

  const { data: cities } = useQuery({ queryKey: ['cities'], queryFn: petApi.getCities });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: petApi.getCategories });

  const pets = useMemo(() => {
    return data?.pages.flatMap(page => page.data || []) || [];
  }, [data]);

  const filteredCities = useMemo(() => {
    if (!cities) return [];
    return cities.filter((c: any) => 
      c.city_name.toLowerCase().includes(citySearch.toLowerCase())
    );
  }, [cities, citySearch]);

  const selectedCityName = useMemo(() => {
    if (!filters.city || !cities) return 'All Cities';
    return cities.find((c: any) => c.city_id === filters.city)?.city_name || 'All Cities';
  }, [filters.city, cities]);

  // --- Handlers ---
  const applyFilter = (newFilters: Partial<PetFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters({
      species: undefined,
      city: undefined,
      breed: '',
    });
  };

  const handleAddPetClick = () => {
    router.push('/(app)/create-pet');
  };

  // --- Render Components ---
  const renderPetCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push({ pathname: '/(app)/pet-details', params: { id: item.pet_id } })}
      className="bg-white pt-4 px-4 rounded-2xl mb-3 mx-1.5"
      style={{ 
        flex: 1, 
        maxWidth: '46%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
      }}
    >
      <View className="relative">
        <Image
          source={item.main_image || item.image_url || require('../../assets/dog-placeholder.png')}
          style={{ width: '100%', aspectRatio: 1, borderRadius: 16 }}
          contentFit="cover"
          transition={300}
        />
        {item.listing_type === "rescue" && (
          <View className="absolute top-2 right-2 bg-primary px-2 py-1 rounded-full flex-row items-center">
            <Text className="text-white text-[10px] font-bold">+ Rescue</Text>
          </View>
        )}
      </View>
      <View className="py-4">
        <Text className="font-heading text-base text-dark mb-1" numberOfLines={1}>
          {item.pet_name}
        </Text>
        <Text className="font-body text-gray-500 text-xs mb-1" numberOfLines={1}>
          {formatAge(item.age_months)}
        </Text>
        <View className="flex-row items-center">
          <Ionicons name="location-sharp" size={14} color="#a03048" />
          <Text className="font-body text-gray-500 text-xs ml-1" numberOfLines={1}>
            {item.city}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={pets}
        renderItem={renderPetCard}
        keyExtractor={(item) => item.pet_id.toString()}
        numColumns={2}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ 
          paddingHorizontal: 12, 
          paddingBottom: 100, 
          paddingTop: insets.top + 8
        }}
        onRefresh={refetch}
        refreshing={isRefetching}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-4">
              <ActivityIndicator color="#a03048" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View className="py-20 items-center">
            <Text className="font-body text-gray-500">No pets found matching these filters.</Text>
          </View>
        }
      />

      {/* Floating Buttons */}
      <View className="absolute bottom-6 left-5 right-5 flex-row justify-between items-center pointer-events-box-none">
        <TouchableOpacity
          onPress={handleAddPetClick}
          className="bg-white px-4 py-3 rounded-2xl flex-row items-center border-2 border-primary shadow-lg"
          style={{ elevation: 5 }}
        >
          <Ionicons name="add-circle-outline" size={20} color="#a03048" />
          <Text className="ml-2 font-headingSemi text-xs text-primary">Add Pet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsFilterVisible(true)}
          className="bg-white px-4 py-3 rounded-2xl flex-row items-center border-2 border-primary shadow-lg"
          style={{ elevation: 5 }}
        >
          <Ionicons name="options-outline" size={20} color="#a03048" />
          <Text className="ml-2 font-headingSemi text-xs text-primary">Filters</Text>
        </TouchableOpacity>
      </View>

      {/* --- Filters Modal --- */}
      <Modal
        visible={isFilterVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsFilterVisible(false)}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row justify-between items-center px-6 py-6 border-b border-gray-100">
            <Text className="font-heading text-xl">Filters</Text>
            <TouchableOpacity onPress={() => setIsFilterVisible(false)}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6 pt-4">
            {/* Species Section - Horizontal Wrapped Buttons */}
            <Text className="font-headingSemi text-dark mb-3">Species</Text>
            <View className="flex-row flex-wrap mb-6">
              <TouchableOpacity
                onPress={() => applyFilter({ species: undefined })}
                className={`px-4 py-2 rounded-xl mr-2 mb-2 border ${filters.species === undefined ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-100'}`}
              >
                <Text className={`font-body text-xs ${filters.species === undefined ? 'text-white' : 'text-gray-600'}`}>All</Text>
              </TouchableOpacity>
              {categories?.map((cat: any) => (
                <TouchableOpacity
                  key={cat.category_id}
                  onPress={() => applyFilter({ species: cat.category_id })}
                  className={`px-4 py-2 rounded-xl mr-2 mb-2 border ${filters.species === cat.category_id ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-100'}`}
                >
                  <Text className={`font-body text-xs ${filters.species === cat.category_id ? 'text-white' : 'text-gray-600'}`}>{cat.category_name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Breed Section */}
            <Text className="font-headingSemi text-dark mb-3">Breed</Text>
            <TextInput
              placeholder="Enter breed..."
              className="bg-gray-50 p-4 rounded-xl border border-gray-100 font-body text-sm mb-6"
              value={filters.breed}
              onChangeText={(text) => applyFilter({ breed: text })}
            />

            {/* City Section - Dropdown Style */}
            <Text className="font-headingSemi text-dark mb-3">City</Text>
            <TouchableOpacity 
              onPress={() => setIsCityModalVisible(true)}
              className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex-row justify-between items-center mb-10"
            >
              <Text className="font-body text-sm text-gray-600">{selectedCityName}</Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </ScrollView>

          {/* Footer Buttons */}
          <View className="p-6 border-t border-gray-100 flex-row space-x-4">
            <TouchableOpacity
              onPress={resetFilters}
              className="flex-1 py-4 border border-gray-200 rounded-button items-center"
            >
              <Text className="font-headingSemi text-dark">Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsFilterVisible(false)}
              className="flex-2 bg-primary py-4 rounded-button items-center"
            >
              <Text className="font-headingSemi text-white px-10">Search</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- City Selection Sub-Modal --- */}
        <Modal
          visible={isCityModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsCityModalVisible(false)}
        >
          <View className="flex-1 bg-black/50 justify-center items-center px-6">
            <View className="bg-white w-full max-h-[70%] rounded-[32px] overflow-hidden">
              <View className="p-6 border-b border-gray-100 flex-row justify-between items-center">
                <Text className="font-heading text-lg">Select City</Text>
                <TouchableOpacity onPress={() => setIsCityModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              
              <View className="px-6 py-4">
                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                  <Ionicons name="search-outline" size={18} color="#999" />
                  <TextInput
                    placeholder="Search city..."
                    className="flex-1 ml-3 font-body text-sm"
                    value={citySearch}
                    onChangeText={setCitySearch}
                  />
                </View>
              </View>

              <FlatList
                data={[{ city_id: 'all', city_name: 'All Cities' }, ...filteredCities]}
                keyExtractor={(item) => item.city_id.toString()}
                className="flex-grow-0"
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    onPress={() => {
                      applyFilter({ city: item.city_id === 'all' ? undefined : item.city_id });
                      setIsCityModalVisible(false);
                      setCitySearch('');
                    }}
                    className="px-6 py-4 border-b border-gray-50"
                  >
                    <Text className={`font-body text-sm ${(filters.city === item.city_id || (item.city_id === 'all' && filters.city === undefined)) ? 'text-primary font-headingSemi' : 'text-gray-600'}`}>
                      {item.city_name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </Modal>
    </View>
  );
}

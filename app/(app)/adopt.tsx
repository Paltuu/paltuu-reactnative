import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity,
  ActivityIndicator, ScrollView, TextInput, Modal,
  Platform, StyleSheet, FlatList, Animated as RNAnimated
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { petApi, PetFilters } from '../../src/api/pets';
import { Ionicons } from '@expo/vector-icons';
import { HEADER_HEIGHT } from '../../src/components/common/MainHeader';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useHeaderContext } from '../../src/context/HeaderContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PetCard } from '../../src/components/adoption/PetCard';
import { withFocusUnmount } from '../../src/components/common/withFocusUnmount';

const H_PAD = 16;

function AdoptScreen() {
  const router = useRouter();
  const { breed: breedParam } = useLocalSearchParams<{ breed?: string }>();
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isCityModalVisible, setIsCityModalVisible] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  const [filters, setFilters] = useState<PetFilters>({
    species: undefined,
    city: undefined,
    breed: breedParam || '',
  });

  // The screen stays mounted as a hidden tab, so re-navigation with a new
  // breed param (e.g. from Explore's Trending Breeds) must re-seed the filter
  useEffect(() => {
    if (breedParam) {
      setFilters((prev) => ({ ...prev, breed: breedParam }));
    }
  }, [breedParam]);

  const insets = useSafeAreaInsets();
  const { handleScrollY, handleScrollEnd } = useHeaderContext();

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

  const showSkeleton = isLoading && pets.length === 0;

  // --- Skeleton pulse ---
  const fadeAnim = useRef(new RNAnimated.Value(0.4)).current;
  useEffect(() => {
    if (!showSkeleton) return;
    const animation = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        RNAnimated.timing(fadeAnim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [showSkeleton, fadeAnim]);

  const renderSkeletonGrid = () => (
    <RNAnimated.View style={{ opacity: fadeAnim }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View
          key={i}
          className="bg-white rounded-2xl mb-4 border border-gray-200 overflow-hidden"
        >
          <View className="bg-gray-200" style={{ width: '100%', aspectRatio: 1.15 }} />
          <View className="p-3.5">
            <View className="bg-gray-200 rounded-full mb-2" style={{ height: 16, width: '70%' }} />
            <View className="bg-gray-200 rounded-full mb-3" style={{ height: 12, width: '45%' }} />
            <View className="bg-gray-200 rounded-full" style={{ height: 10, width: '55%' }} />
          </View>
        </View>
      ))}
    </RNAnimated.View>
  );

  // --- Render Components ---
  const renderPetCard = useCallback(({ item }: { item: any }) => (
    <PetCard
      pet={item}
      onPress={() => router.push({ pathname: '/(app)/pet-details', params: { id: item.pet_id } })}
    />
  ), []);

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFB' }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/pets'))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#111', letterSpacing: -0.5 }}>
            Adopt a Pet
          </Text>
          <Text style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
            Find your new best friend
          </Text>
        </View>
      </View>

      {showSkeleton ? (
        <ScrollView
          // See the matching comment on the FlashList below — the
          // list's own frame (not just its end-of-scroll padding) needs to
          // stop above the edge-to-edge system nav bar.
          style={{ marginBottom: insets.bottom }}
          contentContainerStyle={{
            paddingHorizontal: H_PAD,
            paddingBottom: 120,
            paddingTop: 16,
          }}
        >
          {renderSkeletonGrid()}
        </ScrollView>
      ) : (
        <FlashList
          data={pets}
          renderItem={renderPetCard}
          keyExtractor={(item: any) => item.pet_id.toString()}
          // FlashList isn't wrapped in reanimated's Animated component (see
          // search.tsx for the same pattern), so the collapsing header is
          // driven by plain scroll callbacks instead of the worklet-based
          // `scrollHandler` used by the reanimated Animated.FlatList lists.
          onScroll={(e: any) => handleScrollY(e.nativeEvent.contentOffset.y)}
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
          // `contentContainerStyle`'s paddingBottom only clears the nav bar
          // once scrolled all the way to the end — the list's own frame still
          // extends the full screen height, so mid-scroll rows rest right
          // behind the (edge-to-edge, translucent) system nav bar. Shrinking
          // the list's own style by insets.bottom keeps rows above it always.
          style={{ marginBottom: insets.bottom }}
          contentContainerStyle={{
            paddingHorizontal: H_PAD,
            paddingBottom: 120,
            paddingTop: 16
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
      )}

      {/* Floating Buttons */}
      <View
        style={{
          position: 'absolute',
          bottom: insets.bottom + 24,
          left: 20,
          right: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        pointerEvents="box-none"
      >
        {/* Filters Button (Left) */}
        <TouchableOpacity
          onPress={() => setIsFilterVisible(true)}
          style={{
            backgroundColor: '#FFFFFF',
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: '#a03048',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Ionicons name="options-outline" size={20} color="#a03048" />
          <Text style={{ marginLeft: 8, color: '#a03048', fontWeight: '700', fontSize: 13 }}>Filters</Text>
        </TouchableOpacity>

        {/* Add Pet Floating Action Button (Right) */}
        <TouchableOpacity
          onPress={handleAddPetClick}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#a03048',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* --- Filters Modal --- */}
      <Modal
        visible={isFilterVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsFilterVisible(false)}
        statusBarTranslucent
        navigationBarTranslucent
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

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: H_PAD,
    paddingBottom: 16,
    backgroundColor: '#FAFAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
});

export default withFocusUnmount(AdoptScreen);

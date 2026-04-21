import React, { useState, useEffect } from 'react';
import {
  View, Text, SafeAreaView, FlatList, Image, TouchableOpacity,
  ActivityIndicator, ScrollView, TextInput, Modal, Pressable,
  Switch, Platform
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { petApi, PetFilters } from '../../src/api/pets';
import { Ionicons } from '@expo/vector-icons';
import { MainHeader } from '../../src/components/common/MainHeader';
import { PetCard } from '../../src/components/pets/PetCard';
import { useRouter } from 'expo-router';

export default function AdoptScreen() {
  const router = useRouter();
  // --- State ---
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [filters, setFilters] = useState<PetFilters>({
    species: undefined,
    city: undefined,
    sex: undefined,
    minAge: '',
    maxAge: '',
    breed: '',
    vaccinated: false,
    neutered: false,
  });

  // --- Fetch Data ---
  const { data: petData, isLoading, refetch } = useQuery({
    queryKey: ['pets', filters],
    queryFn: () => petApi.getAdoptionPets({
      ...filters,
      limit: 20
    }),
  });

  const { data: cities } = useQuery({ queryKey: ['cities'], queryFn: petApi.getCities });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: petApi.getCategories });

  const pets = petData?.data || [];

  // --- Handlers ---
  const applyFilter = (newFilters: Partial<PetFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters({
      species: undefined,
      city: undefined,
      sex: undefined,
      minAge: '',
      maxAge: '',
      breed: '',
      vaccinated: false,
      neutered: false,
    });
  };

  // --- Render Components ---
  const renderPetCard = ({ item }: { item: any }) => (
    <View className="flex-1 m-2">
      <PetCard 
        pet={item} 
        onPress={() => router.push({ pathname: '/(app)/pet-details', params: { id: item.pet_id } })}
      />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white pt-10">
      <MainHeader />
      {/* Header & Search */}
      <View className="px-5 pb-2 pt-4">
        <View className="flex-row justify-between items-end mb-4">
          <View>
            <Text className="font-heading text-2xl text-dark">Find Your Pet</Text>
            <Text className="font-body text-gray-400 text-xs mt-1">Browse adoption listings</Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsFilterVisible(true)}
            className="flex-row items-center bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm"
          >
            <Ionicons name="options-outline" size={18} color="#a03048" />
            <Text className="ml-2 font-headingSemi text-xs text-dark">Filters</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Search */}
        <View className="flex-row items-center bg-white rounded-xl px-4 py-3 border border-gray-100 mb-4 shadow-sm">
          <Ionicons name="search-outline" size={20} color="#999" />
          <TextInput
            placeholder="Search breed (e.g. Persian)..."
            className="flex-1 ml-3 font-body text-sm"
            value={filters.breed}
            onChangeText={(text) => applyFilter({ breed: text })}
          />
        </View>
      </View>

      {/* Pet Grid */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#a03048" />
        </View>
      ) : (
        <FlatList
          data={pets}
          renderItem={renderPetCard}
          keyExtractor={(item) => item.pet_id.toString()}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100 }}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <View className="py-20 items-center">
              <Text className="font-body text-gray-500">No pets found matching these filters.</Text>
            </View>
          }
        />
      )}

      {/* --- Advanced Filter Modal --- */}
      <Modal
        visible={isFilterVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsFilterVisible(false)}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row justify-between items-center px-6 py-6 border-b border-gray-100">
            <Text className="font-heading text-xl">Advanced Filters</Text>
            <TouchableOpacity onPress={() => setIsFilterVisible(false)}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6 pt-4">
            {/* Species Section */}
            <Text className="font-headingSemi text-dark mb-3">Species</Text>
            <View className="flex-row flex-wrap mb-6">
              {['All', ...(categories?.map((c: any) => c.category_name) || [])].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => applyFilter({ species: cat === 'All' ? undefined : (categories.find((c: any) => c.category_name === cat)?.category_id || cat) })}
                  className={`px-4 py-2 rounded-xl mr-2 mb-2 border ${(filters.species === undefined && cat === 'All') || (filters.species == (categories?.find((c: any) => c.category_name === cat)?.category_id))
                      ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-100'
                    }`}
                >
                  <Text className={`font-body text-xs ${((filters.species === undefined && cat === 'All') || (filters.species == (categories?.find((c: any) => c.category_name === cat)?.category_id))) ? 'text-white' : 'text-gray-600'}`}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sex Section */}
            <Text className="font-headingSemi text-dark mb-3">Sex</Text>
            <View className="flex-row space-x-2 mb-6">
              {['any', 'male', 'female'].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => applyFilter({ sex: s === 'any' ? undefined : s })}
                  className={`flex-1 py-3 rounded-xl border items-center ${filters.sex === (s === 'any' ? undefined : s) ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-100'}`}
                >
                  <Text className={`font-body text-xs capitalize ${filters.sex === (s === 'any' ? undefined : s) ? 'text-white' : 'text-gray-600'}`}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Age Range */}
            <Text className="font-headingSemi text-dark mb-3">Age (Months)</Text>
            <View className="flex-row space-x-4 mb-6">
              <TextInput
                placeholder="Min Age"
                keyboardType="numeric"
                className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-100 font-body text-sm"
                value={filters.minAge}
                onChangeText={(text) => applyFilter({ minAge: text })}
              />
              <TextInput
                placeholder="Max Age"
                keyboardType="numeric"
                className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-100 font-body text-sm"
                value={filters.maxAge}
                onChangeText={(text) => applyFilter({ maxAge: text })}
              />
            </View>

            {/* Preferences */}
            <Text className="font-headingSemi text-dark mb-3">Preferences</Text>
            <View className="space-y-4 mb-10">
              <View className="flex-row justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                <Text className="font-body text-dark">Vaccinated Only</Text>
                <Switch
                  value={filters.vaccinated}
                  onValueChange={(val) => applyFilter({ vaccinated: val })}
                  trackColor={{ false: "#eee", true: "#a03048" }}
                />
              </View>
              <View className="flex-row justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                <Text className="font-body text-dark">Neutered Only</Text>
                <Switch
                  value={filters.neutered}
                  onValueChange={(val) => applyFilter({ neutered: val })}
                  trackColor={{ false: "#eee", true: "#a03048" }}
                />
              </View>
            </View>
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
              <Text className="font-headingSemi text-white px-10">Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

import React, { useState } from 'react';
import { View, Text, SafeAreaView, FlatList, Image, TouchableOpacity, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { petApi } from '../../src/api/pets';
import { Ionicons } from '@expo/vector-icons';

const SPECIES = ['All', 'Dog', 'Cat', 'Bird', 'Rabbit'];

export default function PetsScreen() {
  const [selectedSpecies, setSelectedSpecies] = useState('All');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pets', selectedSpecies, search],
    queryFn: () => petApi.getAdoptionPets({
      species: selectedSpecies === 'All' ? undefined : selectedSpecies.toLowerCase(),
      // Adding search as breed filter for now as a simple implementation
      breed: search || undefined,
      limit: 20
    }),
  });

  const pets = data?.pets || [];

  const renderPetCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="bg-white m-2 rounded-2xl overflow-hidden shadow-sm flex-1"
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.image_url || 'https://via.placeholder.com/150' }}
        className="w-full h-40"
        resizeMode="cover"
      />
      <View className="p-3">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="font-heading text-base text-dark flex-1" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-xs font-body text-primary">{item.sex}</Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="location-outline" size={12} color="#666" />
          <Text className="text-xs font-body text-gray-500 ml-1" numberOfLines={1}>
            {item.city || 'Pakistan'}
          </Text>
        </View>
        <Text className="text-[10px] font-body text-gray-400 mt-2" numberOfLines={1}>
          {item.breed}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg pt-10">
      <View className="px-5 pb-2">
        <Text className="font-heading text-2xl text-dark mb-4">Adopt a Friend</Text>

        {/* Search Bar */}
        <View className="flex-row items-center bg-white rounded-xl px-4 py-2 border border-gray-100 mb-6">
          <Ionicons name="search-outline" size={20} color="#999" />
          <TextInput
            placeholder="Search by breed..."
            className="flex-1 ml-3 font-body text-sm"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Species Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {SPECIES.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setSelectedSpecies(s)}
              className={`px-6 py-2 rounded-full mr-3 border ${selectedSpecies === s ? 'bg-primary border-primary' : 'bg-white border-gray-200'
                }`}
            >
              <Text className={`font-headingSemi text-xs ${selectedSpecies === s ? 'text-white' : 'text-gray-600'
                }`}>
                {s}
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
          data={pets}
          renderItem={renderPetCard}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100 }}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <View className="py-20 items-center">
              <Text className="font-body text-gray-500">No pets found matching your criteria.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

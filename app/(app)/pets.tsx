import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { petsApi } from '../../src/api/pets';
import { PetCard } from '../../src/components/pets/PetCard';

const SPECIES = [
  { id: 'Dog', icon: 'dog' },
  { id: 'Cat', icon: 'cat' },
  { id: 'Bird', icon: 'feather' },
  { id: 'Rabbit', icon: 'carrot' }
];

export default function PetsScreen() {
  const [pets, setPets] = useState([]);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPets();
  }, []);

  const fetchPets = async (type = null) => {
    try {
      setLoading(true);
      const data = await petsApi.getPets({ type });
      setPets(data);
    } catch (error) {
      console.error('Pets fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeciesSelect = (id) => {
    const newSpecies = selectedSpecies === id ? null : id;
    setSelectedSpecies(newSpecies);
    fetchPets(newSpecies);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg px-5">
      {/* Header */}
      <View className="mt-4 mb-6">
        <Text className="font-heading text-2xl text-dark">Find Your Companion</Text>
        <Text className="font-body text-gray-500">Discover pets waiting for a home</Text>
      </View>

      {/* Filters */}
      <View className="mb-6">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {SPECIES.map((s) => (
            <TouchableOpacity 
              key={s.id}
              onPress={() => handleSpeciesSelect(s.id)}
              className={`px-5 py-3 rounded-2xl mr-3 flex-row items-center ${selectedSpecies === s.id ? 'bg-primary' : 'bg-surface border border-gray-100'}`}
            >
              <Text className={`font-heading text-sm ${selectedSpecies === s.id ? 'text-white' : 'text-gray-500'}`}>
                {s.id}s
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Pet Feed */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#A03048" />
        </View>
      ) : (
        <FlatList 
          data={pets}
          keyExtractor={(item) => item.pet_id.toString()}
          renderItem={({ item }) => (
            <PetCard 
              pet={item} 
              onPress={() => console.log('Pet selected', item.pet_id)} 
            />
          )}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center mt-10">
              <Text className="font-body text-gray-400">No pets available right now</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

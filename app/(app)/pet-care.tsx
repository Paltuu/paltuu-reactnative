import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  ActivityIndicator, TextInput
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { getClinics } from '../../src/api/clinics';
import { Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { HEADER_HEIGHT } from '../../src/components/common/MainHeader';
import { ClinicCard } from '../../src/components/pet-care/ClinicCard';
import { useRouter } from 'expo-router';
import { useHeaderContext } from '../../src/context/HeaderContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PetCareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scrollHandler } = useHeaderContext();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: clinics, isLoading, refetch } = useQuery({
    queryKey: ['clinics'],
    queryFn: getClinics,
  });

  const filteredClinics = clinics?.filter(clinic =>
    clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    clinic.address.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const renderClinicCard = ({ item }: { item: any }) => (
    <View className="px-5">
      <ClinicCard
        clinic={item}
        onPress={() => router.push({ pathname: '/(app)/clinic/[id]', params: { id: item.clinic_id } })}
      />
    </View>
  );

  const stats = [
    { icon: 'hospital', value: `${clinics?.length || "10"}+`, label: "Clinics", color: '#A03048' },
    { icon: 'user-md', value: "50+", label: "Vets", color: '#4B9CD3' },
    { icon: 'star', value: "4.8", label: "Rating", color: '#F5A623' },
  ];

  return (
    <View className="flex-1 bg-white">
      <Animated.FlatList
        data={filteredClinics}
        renderItem={renderClinicCard}
        keyExtractor={(item) => item.clinic_id.toString()}
        onScroll={scrollHandler}
        onRefresh={refetch}
        refreshing={isLoading}
        ListHeaderComponent={
          <View className="px-5 pt-4 pb-2">
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 }}>
              <TouchableOpacity 
                onPress={() => router.replace('/(app)/pets')}
                style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 20, 
                  backgroundColor: '#FFF', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <Ionicons name="arrow-back" size={22} color="#111" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text className="font-heading text-3xl text-dark">Pet Care</Text>
                <Text className="font-body text-gray-400 text-xs mt-1">Find the best veterinary care for your pet</Text>
              </View>
            </View>

            {/* Search Bar */}
            <View className="flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100 mb-6">
              <Ionicons name="search-outline" size={20} color="#999" />
              <TextInput
                placeholder="Search clinics or locations..."
                className="flex-1 ml-3 font-body text-sm"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Stats Bar */}
            <View className="flex-row justify-between bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-8">
              {stats.map((stat, i) => (
                <View key={i} className="items-center flex-1">
                  <View className="flex-row items-center space-x-1">
                    <FontAwesome5 name={stat.icon as any} size={12} color={stat.color} />
                    <Text className="text-lg font-heading text-dark">{stat.value}</Text>
                  </View>
                  <Text className="text-[10px] font-body text-gray-500 uppercase tracking-tighter">{stat.label}</Text>
                </View>
              ))}
            </View>

            <Text className="font-headingSemi text-lg text-dark mb-4">Recommended Clinics</Text>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View className="py-20 items-center">
              <ActivityIndicator size="large" color="#a03048" />
            </View>
          ) : (
            <View className="py-20 items-center px-10">
              <Feather name="search" size={40} color="#E5E7EB" />
              <Text className="font-heading text-lg text-gray-400 mt-4">No clinics found</Text>
              <Text className="font-body text-gray-400 text-center mt-2">Try searching for a different name or location.</Text>
            </View>
          )
        }
        contentContainerStyle={{ 
          paddingTop: HEADER_HEIGHT + insets.top + 8,
          paddingBottom: 100 
        }}
      />
    </View>
  );
}

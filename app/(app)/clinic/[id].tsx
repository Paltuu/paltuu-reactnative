import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getClinicDetails } from '../../../src/api/clinics';
import { Feather, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { VetCard } from '../../../src/components/pet-care/VetCard';

export default function ClinicDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const { data: clinic, isLoading, error } = useQuery({
    queryKey: ['clinic', id],
    queryFn: () => getClinicDetails(id as string),
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#A03048" />
      </View>
    );
  }

  if (error || !clinic) {
    return (
      <View className="flex-1 bg-white justify-center items-center p-10">
        <Text className="font-heading text-lg text-gray-500 text-center">Failed to load clinic details. Please try again.</Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mt-4 bg-primary px-6 py-2 rounded-xl"
        >
          <Text className="text-white font-headingSemi">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCall = () => {
    if (clinic.contact_number) {
      Linking.openURL(`tel:${clinic.contact_number}`);
    }
  };

  const handleWhatsApp = () => {
    if (clinic.whatsapp_number || clinic.contact_number) {
      let phone = (clinic.whatsapp_number || clinic.contact_number).trim();
      if (phone.startsWith("0")) {
        phone = "92" + phone.slice(1);
      }
      Linking.openURL(`whatsapp://send?phone=${phone}`);
    }
  };

  const handleMap = () => {
    if (clinic.google_maps_link) {
      Linking.openURL(clinic.google_maps_link);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View className="relative">
          <Image
            source={{ uri: clinic.logo_url || 'https://placehold.co/600x400/A03048/FFFFFF.png?text=' + clinic.name }}
            className="w-full h-64"
            resizeMode="cover"
          />
          <TouchableOpacity 
            onPress={() => router.back()}
            className="absolute top-12 left-5 bg-white/80 p-2 rounded-full"
          >
            <Feather name="arrow-left" size={24} color="black" />
          </TouchableOpacity>
        </View>

        <View className="px-5 -mt-8">
          <View className="bg-white rounded-3xl p-6 shadow-lg">
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-1 mr-4">
                <Text className="font-heading text-2xl text-dark mb-1">{clinic.name}</Text>
                {clinic.is_paltuu_partner && (
                  <View className="flex-row items-center">
                    <MaterialIcons name="verified" size={16} color="#A03048" />
                    <Text className="text-primary font-headingSemi text-xs ml-1">Paltuu Partner</Text>
                  </View>
                )}
              </View>
              <View className="bg-yellow-400 p-2 rounded-xl flex-row items-center space-x-1">
                <FontAwesome5 name="star" size={12} color="white" />
                <Text className="text-white font-heading text-xs">4.8</Text>
              </View>
            </View>

            <View className="space-y-3 mb-6">
              <View className="flex-row items-start">
                <Feather name="map-pin" size={14} color="#A03048" style={{ marginTop: 2 }} />
                <Text className="text-gray-500 font-body text-sm ml-2 flex-1">{clinic.address}</Text>
              </View>
              {clinic.operating_hours && (
                <View className="flex-row items-start">
                  <Feather name="clock" size={14} color="#A03048" style={{ marginTop: 2 }} />
                  <Text className="text-gray-500 font-body text-sm ml-2">{clinic.operating_hours}</Text>
                </View>
              )}
            </View>

            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={handleCall}
                className="flex-1 bg-primary py-3.5 rounded-2xl flex-row items-center justify-center space-x-2 shadow-sm"
              >
                <Feather name="phone" size={16} color="white" />
                <Text className="text-white font-heading text-sm">Call Now</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleWhatsApp}
                className="w-14 bg-green-500 rounded-2xl items-center justify-center shadow-sm"
              >
                <FontAwesome5 name="whatsapp" size={24} color="white" />
              </TouchableOpacity>

              {clinic.google_maps_link && (
                <TouchableOpacity
                  onPress={handleMap}
                  className="w-14 bg-blue-500 rounded-2xl items-center justify-center shadow-sm"
                >
                  <MaterialIcons name="map" size={24} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Discount Section */}
        {clinic.discount_details && (
          <View className="px-5 mt-6">
            <View className="bg-primary/5 p-5 rounded-3xl border border-primary/10 flex-row items-center">
              <View className="bg-primary/20 p-3 rounded-2xl mr-4">
                <MaterialIcons name="local-offer" size={24} color="#A03048" />
              </View>
              <View className="flex-1">
                <Text className="text-primary font-headingSemi text-xs uppercase tracking-widest mb-1">Special Offer</Text>
                <Text className="font-heading text-lg text-dark">{clinic.discount_details}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Veterinarians Section */}
        <View className="px-5 mt-8 mb-10">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-heading text-xl text-dark">Our Veterinarians</Text>
            <View className="bg-primary/10 px-3 py-1 rounded-full">
              <Text className="text-primary font-heading text-xs">{clinic.vets?.length || 0}</Text>
            </View>
          </View>

          {clinic.vets && clinic.vets.length > 0 ? (
            clinic.vets.map((vet) => (
              <VetCard 
                key={vet.vet_id} 
                vet={vet} 
                onPress={() => router.push({ pathname: '/(app)/vet/[id]', params: { id: vet.vet_id } })}
              />
            ))
          ) : (
            <View className="py-10 items-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <Text className="font-body text-gray-400">No veterinarians listed yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

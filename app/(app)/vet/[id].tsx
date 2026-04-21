import React from 'react';
import { View, Text, SafeAreaView, ScrollView, Image, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getVetDetails } from '../../../src/api/clinics';
import { Feather, FontAwesome5, MaterialIcons } from '@expo/vector-icons';

export default function VetDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const { data: vet, isLoading, error } = useQuery({
    queryKey: ['vet', id],
    queryFn: () => getVetDetails(id as string),
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#A03048" />
      </View>
    );
  }

  if (error || !vet) {
    return (
      <View className="flex-1 bg-white justify-center items-center p-10">
        <Text className="font-heading text-lg text-gray-500 text-center">Failed to load vet details. Please try again.</Text>
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
    if (vet.contact_details) {
      Linking.openURL(`tel:${vet.contact_details}`);
    }
  };

  const handleWhatsApp = () => {
    if (vet.contact_details) {
      let phone = vet.contact_details.trim();
      if (phone.startsWith("0")) {
        phone = "92" + phone.slice(1);
      }
      Linking.openURL(`whatsapp://send?phone=${phone}`);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header Profile Area */}
        <View className="bg-primary/5 pb-12 pt-12 items-center relative">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="absolute top-12 left-5 bg-white/80 p-2 rounded-full z-10"
          >
            <Feather name="arrow-left" size={24} color="black" />
          </TouchableOpacity>

          <View className="relative">
            <Image
              source={{ uri: vet.profile_image_url || 'https://placehold.co/300x300/A03048/FFFFFF.png?text=' + vet.vet_name }}
              className="w-32 h-32 rounded-full border-4 border-white shadow-sm"
              resizeMode="cover"
            />
            <View className="absolute bottom-1 right-1 bg-primary p-2 rounded-full border-2 border-white">
              <MaterialIcons name="verified" size={16} color="white" />
            </View>
          </View>

          <Text className="font-heading text-2xl text-dark mt-4">{vet.vet_name}</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/(app)/clinic/[id]', params: { id: vet.clinic_id } })}>
            <Text className="text-primary font-headingSemi text-sm mt-1">{vet.clinic_name}</Text>
          </TouchableOpacity>
          
          <View className="flex-row items-center mt-3 bg-white px-4 py-1.5 rounded-full shadow-sm">
            <FontAwesome5 name="star" size={12} color="#F5A623" />
            <Text className="text-dark font-heading text-xs ml-2">4.8 (24 Reviews)</Text>
          </View>
        </View>

        <View className="px-5 -mt-6">
          <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50 flex-row justify-between mb-6">
            <View className="items-center flex-1">
              <Text className="text-primary font-heading text-lg">PKR {vet.minimum_fee}</Text>
              <Text className="text-[10px] font-body text-gray-500 uppercase">Consultation</Text>
            </View>
            <View className="w-[1] bg-gray-100 h-full mx-2" />
            <View className="items-center flex-1">
              <Text className="text-primary font-heading text-lg">10+</Text>
              <Text className="text-[10px] font-body text-gray-500 uppercase">Years Exp.</Text>
            </View>
          </View>

          {/* Contact Buttons */}
          <View className="flex-row space-x-4 mb-8">
            <TouchableOpacity 
              onPress={handleWhatsApp}
              className="flex-1 flex-row items-center justify-center bg-green-500 py-4 rounded-2xl space-x-2 shadow-sm"
            >
              <FontAwesome5 name="whatsapp" size={18} color="white" />
              <Text className="text-white font-heading text-sm">WhatsApp</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleCall}
              className="flex-1 flex-row items-center justify-center bg-primary py-4 rounded-2xl space-x-2 shadow-sm"
            >
              <Feather name="phone-call" size={18} color="white" />
              <Text className="text-white font-heading text-sm">Call Now</Text>
            </TouchableOpacity>
          </View>

          {/* About Section */}
          <View className="mb-8">
            <Text className="font-heading text-xl text-dark mb-4">About Veterinarian</Text>
            <Text className="font-body text-gray-500 leading-relaxed text-sm">
              {vet.bio || "No biography provided yet."}
            </Text>
          </View>

          {/* Qualifications */}
          {vet.qualifications && (
            <View className="mb-8">
              <Text className="font-heading text-xl text-dark mb-4">Qualifications</Text>
              <View className="bg-gray-50 p-5 rounded-3xl border border-gray-100">
                <Text className="font-body text-gray-600 text-sm leading-relaxed">
                  {vet.qualifications}
                </Text>
              </View>
            </View>
          )}

          {/* Availability */}
          <View className="mb-10">
            <Text className="font-heading text-xl text-dark mb-4">Availability</Text>
            <View className="flex-row items-start bg-blue-50 p-5 rounded-3xl border border-blue-100">
              <Feather name="calendar" size={20} color="#4B9CD3" style={{ marginTop: 2 }} />
              <View className="ml-4">
                <Text className="font-headingSemi text-blue-800 text-sm">Working Hours</Text>
                <Text className="font-body text-blue-600/80 text-xs mt-1 leading-normal">
                  {vet.schedule || "Contact clinic for detailed consultation timings."}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

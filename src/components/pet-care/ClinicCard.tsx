import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Feather, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { Clinic } from '../../types/models';

interface ClinicCardProps {
  clinic: Clinic;
  onPress: () => void;
}

export const ClinicCard = ({ clinic, onPress }: ClinicCardProps) => {
  const hasDiscount =
    clinic.discount_details &&
    !clinic.discount_details.toLowerCase().includes("no discount") &&
    !clinic.discount_details.toLowerCase().includes("pending negotiation");

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className="bg-surface rounded-card mb-5 shadow-sm overflow-hidden border border-gray-100"
    >
      <View className="relative p-3">
        {hasDiscount && (
          <View className="absolute top-5 left-5 z-20 bg-primary px-3 py-1.5 rounded-lg shadow-sm flex-row items-center">
            <MaterialIcons name="auto-awesome" size={12} color="white" />
            <Text className="text-white text-[10px] font-heading ml-1 uppercase">Paltuu Discounts</Text>
          </View>
        )}

        <Image
          source={clinic.logo_url || 'https://placehold.co/600x600/A03048/FFFFFF.png?text=' + clinic.name}
          className="w-full aspect-square rounded-2xl"
          contentFit="cover"
          transition={300}
        />
      </View>

      <View className="p-4 pt-1">
        <Text className="font-heading text-lg text-dark mb-2" numberOfLines={1}>
          {clinic.name}
        </Text>

        <View className="space-y-2 mb-4">
          <View className="flex-row items-start">
            <Feather name="map-pin" size={12} color="#A03048" style={{ marginTop: 2 }} />
            <Text className="text-gray-500 font-body text-xs ml-2 flex-1" numberOfLines={2}>
              {clinic.address}
            </Text>
          </View>

          {clinic.contact_number && (
            <View className="flex-row items-center">
              <Feather name="phone" size={12} color="#A03048" />
              <Text className="text-gray-500 font-body text-xs ml-2">
                {clinic.contact_number}
              </Text>
            </View>
          )}

          {clinic.operating_hours && (
            <View className="flex-row items-center">
              <Feather name="clock" size={12} color="#A03048" />
              <Text className="text-gray-500 font-body text-xs ml-2" numberOfLines={1}>
                {clinic.operating_hours}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={onPress}
          className="bg-primary py-3 rounded-xl flex-row items-center justify-center space-x-2"
        >
          <Text className="text-white font-heading text-sm">View Details</Text>
          <Feather name="arrow-right" size={14} color="white" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

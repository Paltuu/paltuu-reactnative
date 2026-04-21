import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';

interface PetCardProps {
  pet: {
    pet_id: number;
    pet_name: string;
    pet_type: string | number;
    pet_breed: string;
    age_months: number;
    sex: string;
    city: string;
    main_image?: string;
    image_url?: string;
    profile_image_url?: string;
    image?: string;
    owner_name: string;
  };
  onPress: () => void;
}

export const PetCard = ({ pet, onPress }: PetCardProps) => {
  const getAgeDisplay = (months: number) => {
    if (months < 12) return `${months}m`;
    return `${Math.floor(months / 12)}y`;
  };

  const displayImage = pet.main_image || pet.image_url || pet.profile_image_url || pet.image;
  const isMale = pet.sex?.toLowerCase() === 'male';

  return (
    <TouchableOpacity 
      activeOpacity={0.9}
      onPress={onPress}
      className="bg-surface rounded-card mb-5 shadow-sm overflow-hidden"
    >
      <View className="relative">
        <Image 
          source={{ uri: displayImage || 'https://placehold.co/600x400/A03048/FFFFFF.png?text=' + pet.pet_name }} 
          className="w-full h-48"
          resizeMode="cover"
        />
        <View className="absolute top-3 left-3 bg-black/40 px-3 py-1 rounded-full flex-row items-center">
          <Feather name="map-pin" size={10} color="white" />
          <Text className="text-white text-[10px] font-body ml-1">{pet.city}</Text>
        </View>

        <TouchableOpacity className="absolute top-3 right-3 bg-white/80 p-2 rounded-full">
          <Feather name="heart" size={16} color="#A03048" />
        </TouchableOpacity>
      </View>

      <View className="p-4">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="font-heading text-lg text-dark">{pet.pet_name}</Text>
          <View className={`px-2 py-1 rounded-md ${isMale ? 'bg-blue-50' : 'bg-pink-50'}`}>
            <Text className={`text-[10px] font-heading ${isMale ? 'text-blue-500' : 'text-pink-500'}`}>
              {(pet.sex || 'Unknown').toUpperCase()}
            </Text>
          </View>
        </View>

        <Text className="font-body text-gray-500 text-sm mb-3">
          {pet.pet_breed} • {getAgeDisplay(pet.age_months)}
        </Text>

        <View className="flex-row items-center justify-between border-t border-gray-50 pt-3">
          <View className="flex-row items-center">
            <View className="w-6 h-6 rounded-full bg-gray-200 mr-2 items-center justify-center">
              <Feather name="user" size={12} color="#6B7280" />
            </View>
            <Text className="font-body text-xs text-gray-400">By {pet.owner_name}</Text>
          </View>

          <View className="bg-primary/5 px-3 py-1 rounded-full">
            <Text className="text-primary font-heading text-[10px]">ADOPT</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

import React from 'react';
import { View, Text, Image, TouchableOpacity, Linking } from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Vet } from '../../types/models';

interface VetCardProps {
  vet: Vet;
  onPress?: () => void;
}

export const VetCard = ({ vet, onPress }: VetCardProps) => {
  const formattedName = (vet.name || "").match(/^dr\.?\s*/i)
    ? vet.name
    : `Dr. ${vet.name}`;

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
    <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4">
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={onPress}
        className="flex-row items-center mb-4"
      >
        <Image
          source={{ uri: vet.profile_image_url || 'https://placehold.co/200x200/A03048/FFFFFF.png?text=' + vet.name }}
          className="w-16 h-16 rounded-full mr-4"
        />
        <View className="flex-1">
          <Text className="font-heading text-lg text-primary">{formattedName}</Text>
          <Text className="font-body text-gray-500 text-sm">{vet.clinic_name}</Text>
        </View>
        <TouchableOpacity 
          onPress={handleCall}
          className="bg-primary/10 p-3 rounded-full"
        >
          <Feather name="phone" size={18} color="#A03048" />
        </TouchableOpacity>
      </TouchableOpacity>

      <View className="space-y-2 mb-4">
        {vet.location && (
          <View className="flex-row items-center">
            <Feather name="map-pin" size={12} color="#6B7280" />
            <Text className="text-gray-500 font-body text-xs ml-2">{vet.location}</Text>
          </View>
        )}
        
        {vet.qualifications && (
          <View className="flex-row items-center">
            <Feather name="award" size={12} color="#6B7280" />
            <Text className="text-gray-500 font-body text-xs ml-2" numberOfLines={1}>
              {Array.isArray(vet.qualifications) 
                ? vet.qualifications.map(q => typeof q === 'object' ? q.qualification_name : q).join(', ')
                : vet.qualifications}
            </Text>
          </View>
        )}
      </View>

      <View className="flex-row gap-3 mt-2">
        <TouchableOpacity 
          onPress={handleWhatsApp}
          className="flex-1 flex-row items-center justify-center bg-green-500 py-3.5 rounded-2xl space-x-2 shadow-sm"
        >
          <FontAwesome5 name="whatsapp" size={14} color="white" />
          <Text className="text-white font-heading text-xs">WhatsApp</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={handleCall}
          className="flex-1 flex-row items-center justify-center bg-gray-100 py-3.5 rounded-2xl space-x-2"
        >
          <Feather name="phone-call" size={14} color="#374151" />
          <Text className="text-gray-700 font-heading text-xs">Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

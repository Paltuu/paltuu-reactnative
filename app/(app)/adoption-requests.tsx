import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Linking 
} from 'react-native';
import { Image } from 'expo-image';
import { usePetStore } from '../../src/stores/petStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdoptionRequestsScreen() {
  const { adoptionRequests, fetchAdoptionRequests, isLoading } = usePetStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    fetchAdoptionRequests();
  }, []);

  const handleCall = (phoneNumber: string) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View className="bg-white rounded-3xl mb-5 p-5 shadow-sm border border-gray-50">
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center">
          <View className="w-11 h-11 rounded-full bg-primary justify-center items-center mr-3">
            <Text className="text-white text-lg font-bold">{item.adopter_name?.[0]?.toUpperCase() || 'U'}</Text>
          </View>
          <View>
            <Text className="text-base font-bold text-gray-900">{item.adopter_name}</Text>
            <Text className="text-xs text-gray-400">{item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</Text>
          </View>
        </View>
        <TouchableOpacity 
          className="w-10 h-10 rounded-full bg-green-500 justify-center items-center"
          onPress={() => handleCall(item.contact_info)}
        >
          <Ionicons name="call" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View className="bg-gray-50 p-3 rounded-2xl mb-4">
        <View className="flex-row items-center">
          <Image 
            source={{ 
              uri: item.image_url || 
                   item.primary_image || 
                   (item.images && item.images[0]?.image_url) ||
                   'https://via.placeholder.com/150' 
            }} 
            style={{ width: 48, height: 48, borderRadius: 8 }}
            contentFit="cover"
          />
          <View>
            <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Applied for:</Text>
            <Text className="text-sm font-bold text-primary">{item.pet_name}</Text>
          </View>
        </View>
      </View>

      <View className="mb-5">
        <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Message:</Text>
        <Text className="text-sm text-gray-600 leading-5">{item.pet_description || "No specific message provided."}</Text>
      </View>

      <View className="flex-row gap-3">
        <TouchableOpacity className="flex-1 border border-gray-100 py-3 rounded-xl items-center">
          <Text className="text-gray-500 font-bold">View Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 bg-primary py-3 rounded-xl items-center">
          <Text className="text-white font-bold">Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA', paddingTop: insets.top + 20 }}>
      <View className="flex-row items-center px-5 mb-5">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-900">Adoption Requests</Text>
      </View>

      {isLoading && adoptionRequests.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#a03048" />
        </View>
      ) : (
        <FlatList
          data={adoptionRequests}
          keyExtractor={(item) => item.adoption_id?.toString() || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-24">
              <Ionicons name="mail-outline" size={64} color="#E5E7EB" />
              <Text className="text-base text-gray-400 mt-4">No adoption requests yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

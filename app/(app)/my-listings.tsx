import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { usePetStore } from '../../src/stores/petStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MyListingsScreen() {
  const { myListings, fetchMyListings, updatePetStatus, deletePet, isLoading } = usePetStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    fetchMyListings();
  }, []);

  const handleStatusChange = (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'available' ? 'adopted' : 'available';
    Alert.alert(
      'Change Status',
      `Mark this pet as ${nextStatus === 'adopted' ? 'Adopted' : 'Available'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes', 
          onPress: () => updatePetStatus(id, nextStatus) 
        }
      ]
    );
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deletePet(id) 
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View className="bg-white rounded-2xl mb-4 flex-row p-3 shadow-sm border border-gray-100">
      <Image 
        source={{ 
          uri: item.image_url ||
               item.primary_image || 
               (item.images && item.images[0]?.image_url) || 
               (item.images && typeof item.images[0] === 'string' ? item.images[0] : null) ||
               'https://via.placeholder.com/150' 
        }} 
        style={{ width: 96, height: 96, borderRadius: 12 }}
        contentFit="cover"
      />
      <View className="flex-1 ml-4 justify-between">
        <View className="flex-row justify-between items-center">
          <Text className="text-lg font-bold text-gray-900 flex-1 mr-2" numberOfLines={1}>{item.pet_name}</Text>
          <View className={`px-2 py-1 rounded-md ${item.adoption_status === 'available' ? 'bg-green-50' : 'bg-red-50'}`}>
            <Text className={`text-[10px] font-bold ${item.adoption_status === 'available' ? 'text-green-600' : 'text-red-600'}`}>
              {item.adoption_status?.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <Text className="text-sm text-gray-500">{item.category} • {item.city_name}</Text>
        
        <View className="flex-row mt-2 pt-2 border-t border-gray-50">
          <TouchableOpacity 
            className="flex-row items-center mr-5"
            onPress={() => handleStatusChange(item.pet_id, item.adoption_status)}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#a03048" />
            <Text className="text-xs text-gray-600 ml-1">Status</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="flex-row items-center mr-5"
            onPress={() => router.push({ pathname: '/(app)/create-pet', params: { editId: item.pet_id } })}
          >
            <Ionicons name="create-outline" size={18} color="#666" />
            <Text className="text-xs text-gray-600 ml-1">Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="flex-row items-center"
            onPress={() => handleDelete(item.pet_id)}
          >
            <Ionicons name="trash-outline" size={18} color="#D93025" />
            <Text className="text-xs text-gray-600 ml-1">Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA', paddingTop: insets.top + 20 }}>
      <View className="flex-row items-center px-5 mb-5">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-900">My Listings</Text>
      </View>

      {isLoading && myListings.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#a03048" />
        </View>
      ) : (
        <FlatList
          data={myListings}
          keyExtractor={(item) => item.pet_id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-24">
              <Ionicons name="paw-outline" size={64} color="#E5E7EB" />
              <Text className="text-base text-gray-400 mt-4 mb-5">You haven't posted any pets yet.</Text>
              <TouchableOpacity 
                className="bg-primary px-8 py-3 rounded-xl"
                onPress={() => router.push('/(app)/create-pet')}
              >
                <Text className="text-white font-bold">Create Listing</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

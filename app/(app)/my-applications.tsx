import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { usePetStore } from '../../src/stores/petStore';
import { useShallow } from 'zustand/react/shallow';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { withFocusUnmount } from '../../src/components/common/withFocusUnmount';

function MyApplicationsScreen() {
  const { myApplications, fetchMyApplications, isLoading } = usePetStore(
    useShallow((state) => ({
      myApplications: state.myApplications,
      fetchMyApplications: state.fetchMyApplications,
      isLoading: state.isLoading,
    }))
  );
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    fetchMyApplications();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-amber-600 bg-amber-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View className="bg-white rounded-3xl mb-5 p-4 shadow-sm border border-gray-50">
      <View className="flex-row">
        <Image 
          source={{ 
            uri: item.image_url || 
                 item.pet_image || 
                 'https://via.placeholder.com/150' 
          }} 
          style={{ width: 100, height: 100, borderRadius: 20 }}
          contentFit="cover"
        />
        <View className="flex-1 ml-4 justify-between py-1">
          <View>
            <View className="flex-row justify-between items-start">
              <Text className="text-lg font-black text-gray-900 flex-1 mr-2" numberOfLines={1}>
                {item.pet_name}
              </Text>
              <View className={`px-2.5 py-1 rounded-lg ${getStatusColor(item.status).split(' ')[1]}`}>
                <Text className={`text-[10px] font-black uppercase tracking-wider ${getStatusColor(item.status).split(' ')[0]}`}>
                  {item.status}
                </Text>
              </View>
            </View>
            <Text className="text-xs text-gray-400 font-bold mt-0.5">{item.breed || 'Unknown Breed'}</Text>
          </View>

          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={14} color="#999" />
            <Text className="text-[11px] text-gray-400 font-bold ml-1">
              Applied on {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
      
      <View className="flex-row gap-3 mt-4 pt-4 border-t border-gray-50">
        <TouchableOpacity 
          className="flex-1 bg-gray-50 py-3 rounded-xl items-center"
          onPress={() => router.push({ pathname: '/(app)/pets', params: { id: item.pet_id } })}
        >
          <Text className="text-gray-500 font-bold text-xs">View Pet</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 bg-primary py-3 rounded-xl items-center">
          <Text className="text-white font-bold text-xs">Check Status</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA', paddingTop: insets.top + 20 }}>
      <View className="flex-row items-center px-5 mb-6">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View>
          <Text className="text-2xl font-black text-gray-900">My Applications</Text>
          <Text className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Pets you applied for</Text>
        </View>
      </View>

      {isLoading && myApplications.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#a03048" />
        </View>
      ) : (
        <FlatList
          data={myApplications}
          keyExtractor={(item) => item.application_id?.toString() || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-24 px-10">
              <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-5">
                <Ionicons name="document-text-outline" size={40} color="#CCC" />
              </View>
              <Text className="text-lg font-black text-gray-900 text-center">No Applications Yet</Text>
              <Text className="text-sm text-gray-400 text-center mt-2 mb-8 font-medium">
                You haven't submitted any adoption applications yet.
              </Text>
              <TouchableOpacity 
                className="bg-primary px-10 py-4 rounded-2xl shadow-lg shadow-primary/30"
                onPress={() => router.push('/(app)/pets')}
              >
                <Text className="text-white font-black uppercase tracking-wider">Browse Pets</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

export default withFocusUnmount(MyApplicationsScreen);

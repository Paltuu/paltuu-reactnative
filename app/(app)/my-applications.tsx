import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { usePetStore } from '../../src/stores/petStore';
import { useShallow } from 'zustand/react/shallow';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withFocusUnmount } from '../../src/components/common/withFocusUnmount';

const PRIMARY = '#a03048';

const STATUS_CONFIG: Record<string, { text: string; icon: keyof typeof Ionicons.glyphMap; color: string; badge: string }> = {
  approved: { text: 'text-success', icon: 'checkmark-circle', color: '#1A7A3C', badge: 'bg-successSoft' },
  rejected: { text: 'text-error', icon: 'close-circle', color: '#C0392B', badge: 'bg-errorSoft' },
  pending: { text: 'text-amber-600', icon: 'time', color: '#D97706', badge: 'bg-amber-50' },
};

const boolLabel = (value: any) => (value === true ? 'Yes' : value === false ? 'No' : undefined);

function DetailRow({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View className="mb-4">
      <Text className="font-body text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{label}</Text>
      <Text className="font-body text-sm text-gray-700 leading-5">{String(value)}</Text>
    </View>
  );
}

function MyApplicationsScreen() {
  const { myApplications, fetchMyApplications, isLoading } = usePetStore(
    useShallow((state) => ({
      myApplications: state.myApplications,
      fetchMyApplications: state.fetchMyApplications,
      isLoading: state.isLoading,
    }))
  );
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    fetchMyApplications();
  }, []);

  const getStatusConfig = (status: string) => STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.pending;

  const renderItem = ({ item }: { item: any }) => {
    const status = (item.status || 'pending').toLowerCase();
    const statusConfig = getStatusConfig(status);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        className="flex-row items-center bg-surface rounded-card mb-3.5 p-3.5 shadow-sm border border-gray-50"
        onPress={() => setSelectedItem(item)}
      >
        <Image
          source={{ uri: item.image_url || 'https://via.placeholder.com/150' }}
          style={{ width: 64, height: 64, borderRadius: 14 }}
          contentFit="cover"
        />
        <View className="flex-1 ml-3.5">
          <Text className="font-body text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            {item.application_type === 'foster' ? 'Foster' : 'Adoption'} application
          </Text>
          <Text className="font-heading text-[15px] text-dark mt-0.5" numberOfLines={1}>
            {item.pet_name}
          </Text>
          <Text className="font-body text-xs text-gray-400 mt-0.5" numberOfLines={1}>
            {item.breed || 'Unknown Breed'} · Applied {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View className="items-end ml-2" style={{ gap: 10 }}>
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <Ionicons name={statusConfig.icon} size={13} color={statusConfig.color} />
            <Text className={`text-[11px] font-headingSemi ${statusConfig.text}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#D5D5D5" />
        </View>
      </TouchableOpacity>
    );
  };

  const selectedStatus = (selectedItem?.status || 'pending').toLowerCase();
  const selectedStatusConfig = getStatusConfig(selectedStatus);
  const isFoster = selectedItem?.application_type === 'foster';

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <View className="px-5 py-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.navigate('/(app)/profile')} className="mr-4 p-1">
          <Feather name="arrow-left" size={24} color="#111" />
        </TouchableOpacity>
        <View>
          <Text className="font-heading text-xl text-dark">My Applications</Text>
          <Text className="font-bodyMedium text-[11px] text-gray-400 uppercase tracking-widest mt-0.5">Pets you applied for</Text>
        </View>
      </View>

      {isLoading && myApplications.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={myApplications}
          keyExtractor={(item) => item.application_id?.toString() || Math.random().toString()}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: '#FAFAFA' }}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-24 px-10">
              <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-5">
                <Ionicons name="document-text-outline" size={36} color="#CCC" />
              </View>
              <Text className="font-heading text-lg text-dark text-center">No Applications Yet</Text>
              <Text className="font-body text-sm text-gray-400 text-center mt-2 mb-8">
                You haven't submitted any adoption applications yet.
              </Text>
              <TouchableOpacity
                className="bg-primary px-8 py-4 rounded-2xl"
                onPress={() => router.push('/(app)/pets')}
              >
                <Text className="text-white font-headingSemi">Browse Pets</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal
        visible={!!selectedItem}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedItem(null)}
        statusBarTranslucent
        navigationBarTranslucent
      >
        {selectedItem && (
          <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
            <View className="flex-row justify-between items-center px-6 py-5 border-b border-gray-100">
              <Text className="font-heading text-xl text-dark">Application Details</Text>
              <TouchableOpacity onPress={() => setSelectedItem(null)}>
                <Ionicons name="close" size={26} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-6 pt-5" contentContainerStyle={{ paddingBottom: 24 }}>
              <View className="flex-row items-center bg-gray-50 p-3 rounded-2xl mb-6">
                <Image
                  source={{ uri: selectedItem.image_url || 'https://via.placeholder.com/150' }}
                  style={{ width: 56, height: 56, borderRadius: 12 }}
                  contentFit="cover"
                />
                <View className="ml-3 flex-1">
                  <Text className="font-body text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    {isFoster ? 'Foster application for' : 'Adoption application for'}
                  </Text>
                  <Text className="font-headingSemi text-base text-primary" numberOfLines={1}>{selectedItem.pet_name}</Text>
                </View>
                <View className={`px-3 py-1 rounded-full ${selectedStatusConfig.badge}`}>
                  <Text className={`text-[11px] font-headingSemi ${selectedStatusConfig.text}`}>
                    {selectedStatus.toUpperCase()}
                  </Text>
                </View>
              </View>

              <DetailRow label="Applied On" value={selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleDateString() : undefined} />
              <DetailRow label="Your Name" value={isFoster ? selectedItem.fosterer_name : selectedItem.adopter_name} />
              <DetailRow label="Address" value={isFoster ? selectedItem.fosterer_address : selectedItem.adopter_address} />
              <DetailRow label="Contact Number" value={selectedItem.contact_number} />

              {isFoster && (
                <>
                  <DetailRow
                    label="Fostering Window"
                    value={
                      selectedItem.foster_start_date && selectedItem.foster_end_date
                        ? `${new Date(selectedItem.foster_start_date).toLocaleDateString()} - ${new Date(selectedItem.foster_end_date).toLocaleDateString()}`
                        : undefined
                    }
                  />
                  <DetailRow label="Fostering Experience" value={selectedItem.fostering_experience} />
                  <DetailRow label="Time Spent at Home" value={selectedItem.time_at_home} />
                  <DetailRow label="Reason for Fostering" value={selectedItem.reason_for_fostering} />
                </>
              )}

              <DetailRow label="Age of Youngest Child at Home" value={selectedItem.age_of_youngest_child} />
              <DetailRow label="Other Pets at Home" value={selectedItem.other_pets_details} />
              <DetailRow label="Other Pets Neutered / Spayed" value={boolLabel(selectedItem.other_pets_neutered)} />
              <DetailRow label="Secure Outdoor Area" value={boolLabel(selectedItem.has_secure_outdoor_area)} />
              <DetailRow label="Where the Pet Will Sleep" value={selectedItem.pet_sleep_location} />
              <DetailRow label="Time Pet Will Be Left Alone" value={selectedItem.pet_left_alone} />
              <DetailRow label="Additional Notes" value={selectedItem.additional_details} />
            </ScrollView>

            <View className="p-6 border-t border-gray-100">
              <TouchableOpacity
                className="bg-primary py-4 rounded-2xl items-center"
                onPress={() => {
                  const petId = selectedItem.pet_id;
                  setSelectedItem(null);
                  router.push({ pathname: '/(app)/pet-details', params: { id: petId } });
                }}
              >
                <Text className="font-headingSemi text-white">View Pet</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

export default withFocusUnmount(MyApplicationsScreen);

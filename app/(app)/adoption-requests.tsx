import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { usePetStore } from '../../src/stores/petStore';
import { useShallow } from 'zustand/react/shallow';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { withFocusUnmount } from '../../src/components/common/withFocusUnmount';

const PRIMARY = '#a03048';

const STATUS_STYLES: Record<string, { badge: string; text: string }> = {
  approved: { badge: 'bg-successSoft', text: 'text-success' },
  rejected: { badge: 'bg-errorSoft', text: 'text-error' },
  pending: { badge: 'bg-amber-50', text: 'text-amber-600' },
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

function AdoptionRequestsScreen() {
  const { adoptionRequests, fetchAdoptionRequests, updateApplicationStatus, isLoading } = usePetStore(
    useShallow((state) => ({
      adoptionRequests: state.adoptionRequests,
      fetchAdoptionRequests: state.fetchAdoptionRequests,
      updateApplicationStatus: state.updateApplicationStatus,
      isLoading: state.isLoading,
    }))
  );
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const handleStatusChange = (item: any, status: 'approved' | 'rejected') => {
    const id = item.type === 'foster' ? item.foster_id : item.adoption_id;
    updateApplicationStatus(id, item.type, status);
  };

  useEffect(() => {
    fetchAdoptionRequests();
  }, []);

  const handleCall = (phoneNumber: string) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const renderItem = ({ item }: { item: any }) => {
    const status = (item.status || 'pending').toLowerCase();
    const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.pending;
    const isPending = status === 'pending';

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setSelectedItem(item)}
        className="bg-surface rounded-2xl mb-4 p-4 border border-gray-100 shadow-sm"
      >
        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-row items-center flex-1 mr-3">
            <View className="w-11 h-11 rounded-full bg-gray-100 justify-center items-center mr-3">
              <Text className="text-dark font-headingSemi text-base">{item.adopter_name?.[0]?.toUpperCase() || 'U'}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-headingSemi text-dark text-base" numberOfLines={1}>{item.adopter_name}</Text>
              <View className="flex-row items-center mt-1" style={{ gap: 8 }}>
                <View className={`px-2 py-0.5 rounded-full ${statusStyle.badge}`}>
                  <Text className={`text-[10px] font-headingSemi ${statusStyle.text}`}>
                    {status.toUpperCase()}
                  </Text>
                </View>
                <Text className="font-body text-xs text-gray-400">
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-white justify-center items-center border border-gray-200"
            onPress={() => handleCall(item.contact_info)}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={16} color={PRIMARY} />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center border border-gray-100 p-2.5 rounded-xl mb-4">
          <Image
            source={{
              uri: item.image_url ||
                item.primary_image ||
                (item.images && item.images[0]?.image_url) ||
                'https://via.placeholder.com/150'
            }}
            style={{ width: 44, height: 44, borderRadius: 10 }}
            contentFit="cover"
          />
          <View className="ml-3 flex-1">
            <Text className="font-body text-[10px] text-gray-400 font-bold uppercase tracking-wider">Applied for</Text>
            <Text className="font-headingSemi text-sm text-primary mt-0.5" numberOfLines={1}>{item.pet_name}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#D5D5D5" />
        </View>

        {item.pet_description ? (
          <View className="mb-4">
            <Text className="font-body text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Message</Text>
            <Text className="font-body text-sm text-gray-600 leading-5" numberOfLines={2}>{item.pet_description}</Text>
          </View>
        ) : null}

        <View className="flex-row" style={{ gap: 10 }}>
          {isPending ? (
            <>
              <TouchableOpacity
                className="flex-1 border border-gray-200 py-3 rounded-xl items-center"
                onPress={() => handleStatusChange(item, 'rejected')}
                activeOpacity={0.7}
              >
                <Text className="font-headingSemi text-error text-sm">Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-primary py-3 rounded-xl items-center"
                onPress={() => handleStatusChange(item, 'approved')}
                activeOpacity={0.8}
              >
                <Text className="font-headingSemi text-white text-sm">Approve</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View className="flex-1 items-center py-3 bg-gray-50 rounded-xl">
              <Text className="font-headingSemi text-gray-400 text-sm">
                Request {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const selectedStatus = (selectedItem?.status || 'pending').toLowerCase();
  const selectedStatusStyle = STATUS_STYLES[selectedStatus] || STATUS_STYLES.pending;
  const selectedIsPending = selectedStatus === 'pending';

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <View className="px-5 py-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.navigate('/(app)/profile')} className="mr-4 p-1">
          <Feather name="arrow-left" size={24} color="#111" />
        </TouchableOpacity>
        <Text className="font-heading text-xl text-dark">Adoption Requests</Text>
      </View>

      {isLoading && adoptionRequests.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={adoptionRequests}
          keyExtractor={(item) => item.adoption_id?.toString() || Math.random().toString()}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: '#FAFAFA', marginBottom: insets.bottom }}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-24 px-10">
              <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-5">
                <Ionicons name="mail-outline" size={36} color="#CCC" />
              </View>
              <Text className="font-heading text-lg text-dark text-center">No Requests Yet</Text>
              <Text className="font-body text-sm text-gray-400 text-center mt-2">
                Adoption requests for your listings will appear here.
              </Text>
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
              <View className="flex-row items-center mb-6">
                <View className="w-14 h-14 rounded-full bg-gray-100 justify-center items-center mr-3">
                  <Text className="text-dark font-heading text-lg">
                    {selectedItem.adopter_name?.[0]?.toUpperCase() || 'U'}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-heading text-lg text-dark">{selectedItem.adopter_name}</Text>
                  <Text className="font-body text-xs text-gray-400 mt-0.5">
                    Applied {selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleDateString() : ''}
                  </Text>
                </View>
                <View className={`px-3 py-1 rounded-full ${selectedStatusStyle.badge}`}>
                  <Text className={`text-[11px] font-headingSemi ${selectedStatusStyle.text}`}>
                    {selectedStatus.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center bg-gray-50 p-3 rounded-2xl mb-6">
                <Image
                  source={{
                    uri: selectedItem.image_url ||
                      selectedItem.primary_image ||
                      (selectedItem.images && selectedItem.images[0]?.image_url) ||
                      'https://via.placeholder.com/150'
                  }}
                  style={{ width: 48, height: 48, borderRadius: 10 }}
                  contentFit="cover"
                />
                <View className="ml-3">
                  <Text className="font-body text-[10px] text-gray-400 font-bold uppercase tracking-wider">Applied for</Text>
                  <Text className="font-headingSemi text-sm text-primary">{selectedItem.pet_name}</Text>
                </View>
              </View>

              <DetailRow label="Contact Number" value={selectedItem.contact_info} />
              <DetailRow label="City" value={selectedItem.city_name} />
              <DetailRow label="Address" value={selectedItem.adopter_address} />
              <DetailRow label="Age of Youngest Child at Home" value={selectedItem.age_of_youngest_child} />
              <DetailRow label="Other Pets at Home" value={selectedItem.other_pets_details} />
              <DetailRow label="Other Pets Neutered / Spayed" value={boolLabel(selectedItem.other_pets_neutered)} />
              <DetailRow label="Secure Outdoor Area" value={boolLabel(selectedItem.has_secure_outdoor_area)} />
              <DetailRow label="Where the Pet Will Sleep" value={selectedItem.pet_sleep_location} />
              <DetailRow label="Time Pet Will Be Left Alone" value={selectedItem.pet_left_alone} />
              <DetailRow label="Additional Notes" value={selectedItem.pet_description} />
            </ScrollView>

            <View className="p-6 border-t border-gray-100 flex-row" style={{ gap: 12 }}>
              {selectedIsPending ? (
                <>
                  <TouchableOpacity
                    className="flex-1 border border-gray-200 py-4 rounded-2xl items-center"
                    onPress={() => { handleStatusChange(selectedItem, 'rejected'); setSelectedItem(null); }}
                  >
                    <Text className="font-headingSemi text-error">Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-primary py-4 rounded-2xl items-center"
                    onPress={() => { handleStatusChange(selectedItem, 'approved'); setSelectedItem(null); }}
                  >
                    <Text className="font-headingSemi text-white">Approve</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View className="flex-1 items-center justify-center py-4 bg-gray-50 rounded-2xl">
                  <Text className="font-headingSemi text-gray-400">
                    Request {selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}
                  </Text>
                </View>
              )}
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

export default withFocusUnmount(AdoptionRequestsScreen);

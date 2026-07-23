import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { usePetStore } from '../../src/stores/petStore';
import { useShallow } from 'zustand/react/shallow';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { withFocusUnmount } from '../../src/components/common/withFocusUnmount';
import { FONTS } from '../../src/constants/typography';

const PRIMARY = '#A03048';
const DARK = '#1A1A2E';
const MUTED = '#6B7280';
const SUCCESS = '#1A7A3C';
const ERROR = '#C0392B';

const LOCATION_ICON = require('../../assets/icons/location-pin-alt-1-svgrepo-com.svg');
const PAW_ICON = require('../../assets/icons/paw-like-select.svg');
const PLACEHOLDER = require('../../assets/dog-placeholder.webp');

const H_PAD = 16;

const formatAge = (ageMonths: number | null | undefined): string => {
  if (ageMonths === null || ageMonths === undefined || ageMonths < 0) return '';
  if (ageMonths === 0) return 'Newborn';
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  if (years > 0 && months > 0) return `${years}y ${months}m`;
  if (years > 0) return `${years} ${years === 1 ? 'year' : 'years'}`;
  return `${months} ${months === 1 ? 'month' : 'months'}`;
};

const boolLabel = (value: any) => (value === true ? 'Yes' : value === false ? 'No' : undefined);

function DetailRow({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
        {label}
      </Text>
      <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: '#374151', lineHeight: 20 }}>
        {String(value)}
      </Text>
    </View>
  );
}

function MyListingsScreen() {
  const { myListings, fetchMyListings, updatePetStatus, deletePet, isLoading } = usePetStore(
    useShallow((state) => ({
      myListings: state.myListings,
      fetchMyListings: state.fetchMyListings,
      updatePetStatus: state.updatePetStatus,
      deletePet: state.deletePet,
      isLoading: state.isLoading,
    }))
  );
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    fetchMyListings();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMyListings();
    setRefreshing(false);
  };

  const handleStatusChange = (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'available' ? 'adopted' : 'available';
    Alert.alert(
      'Change Status',
      `Mark this pet as ${nextStatus === 'adopted' ? 'Adopted' : 'Available'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => {
            updatePetStatus(id, nextStatus).catch(() => {
              Alert.alert('Error', 'Failed to update status. Please try again.');
            });
          }
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
          onPress: () => {
            deletePet(id).catch(() => {
              Alert.alert('Error', 'Failed to delete listing. Please try again.');
            });
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const isAvailable = item.adoption_status === 'available';
    const image = item.image_url ||
      item.primary_image ||
      (item.images && item.images[0]?.image_url) ||
      (item.images && typeof item.images[0] === 'string' ? item.images[0] : null);
    const age = formatAge(item.age_months);
    const subtitleParts = [item.category, item.pet_breed, age].filter(Boolean);
    const location = [item.area, item.city_name].filter(Boolean).join(', ');

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setSelectedItem(item)}
        style={styles.card}
      >
        <View style={styles.cardInner}>
          <View style={styles.imageWrap}>
            <Image
              source={image ? { uri: image } : PLACEHOLDER}
              style={styles.image}
              contentFit="cover"
              transition={300}
            />
            <View style={[styles.badge, { backgroundColor: isAvailable ? SUCCESS : ERROR }]}>
              <Text style={styles.badgeText}>{item.adoption_status?.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.body}>
            <Text style={styles.name} numberOfLines={1}>{item.pet_name}</Text>

            {subtitleParts.length > 0 && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitleParts.join(' · ')}
              </Text>
            )}

            <View style={styles.metaRow}>
              {item.sex ? (
                <View style={styles.metaItem}>
                  <Image source={PAW_ICON} style={styles.metaIcon} contentFit="contain" />
                  <Text style={styles.metaText}>{item.sex === 'male' ? 'Male' : 'Female'}</Text>
                </View>
              ) : null}
              {location ? (
                <View style={[styles.metaItem, { flex: 1 }]}>
                  <Image source={LOCATION_ICON} style={styles.metaIcon} contentFit="contain" tintColor={PRIMARY} />
                  <Text style={styles.metaText} numberOfLines={1}>{location}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleStatusChange(item.pet_id, item.adoption_status)}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color={PRIMARY} />
              <Text style={[styles.actionText, { color: DARK }]}>Status</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push({ pathname: '/(app)/create-pet', params: { editId: item.pet_id } })}
            >
              <Ionicons name="create-outline" size={16} color={MUTED} />
              <Text style={[styles.actionText, { color: DARK }]}>Edit</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleDelete(item.pet_id)}
            >
              <Ionicons name="trash-outline" size={16} color={ERROR} />
              <Text style={[styles.actionText, { color: ERROR }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/profile'))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#111', letterSpacing: -0.5 }}>
            My Listings
          </Text>
          <Text style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
            Manage the pets you've listed
          </Text>
        </View>
      </View>

      {isLoading && myListings.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={myListings}
          keyExtractor={(item) => item.pet_id.toString()}
          renderItem={renderItem}
          style={{ marginBottom: insets.bottom }}
          contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 120 }}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 40, paddingHorizontal: 20 }}>
              <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-5">
                <Ionicons name="paw-outline" size={36} color="#CCC" />
              </View>
              <Text className="font-heading text-lg text-dark text-center">No Listings Yet</Text>
              <Text className="font-body text-sm text-gray-400 text-center mt-2 mb-8">
                You haven't posted any pets for adoption yet.
              </Text>
              <TouchableOpacity
                className="bg-primary px-8 py-4 rounded-2xl"
                onPress={() => router.push('/(app)/create-pet')}
              >
                <Text className="text-white font-headingSemi">Create Listing</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <TouchableOpacity
        onPress={() => router.push('/(app)/create-pet')}
        style={styles.fab}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal
        visible={!!selectedItem}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedItem(null)}
        statusBarTranslucent
        navigationBarTranslucent
      >
        {selectedItem && (
          <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'left', 'right']}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
              <Text style={{ fontFamily: FONTS.heading, fontSize: 20, color: DARK }}>Listing Details</Text>
              <TouchableOpacity onPress={() => setSelectedItem(null)}>
                <Ionicons name="close" size={26} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingTop: 20 }} contentContainerStyle={{ paddingBottom: 24 }}>
              <Image
                source={
                  (selectedItem.image_url || selectedItem.primary_image)
                    ? { uri: selectedItem.image_url || selectedItem.primary_image }
                    : PLACEHOLDER
                }
                style={{ width: '100%', aspectRatio: 1.4, borderRadius: 16, backgroundColor: '#F5F5F7' }}
                contentFit="cover"
              />

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 20 }}>
                <Text style={{ flex: 1, fontFamily: FONTS.heading, fontSize: 20, color: DARK }}>
                  {selectedItem.pet_name}
                </Text>
                <View style={[styles.badge, { position: 'relative', top: 0, left: 0, backgroundColor: selectedItem.adoption_status === 'available' ? SUCCESS : ERROR }]}>
                  <Text style={styles.badgeText}>{selectedItem.adoption_status?.toUpperCase()}</Text>
                </View>
              </View>

              <DetailRow label="Category" value={selectedItem.category} />
              <DetailRow label="Breed" value={selectedItem.pet_breed} />
              <DetailRow label="Sex" value={selectedItem.sex === 'male' ? 'Male' : selectedItem.sex === 'female' ? 'Female' : undefined} />
              <DetailRow label="Age" value={formatAge(selectedItem.age_months)} />
              <DetailRow label="Location" value={[selectedItem.area, selectedItem.city_name].filter(Boolean).join(', ')} />
              <DetailRow label="Contact Number" value={selectedItem.contact_number} />
              <DetailRow label="Description" value={selectedItem.description} />
              <DetailRow label="Health Issues" value={selectedItem.health_issues} />
              <DetailRow label="Vaccinated" value={boolLabel(selectedItem.vaccinated)} />
              <DetailRow label="Neutered / Spayed" value={boolLabel(selectedItem.neutered)} />
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 12, padding: 24, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
              <TouchableOpacity
                onPress={() => { handleDelete(selectedItem.pet_id); setSelectedItem(null); }}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F0DCE1' }}
              >
                <Text style={{ fontFamily: FONTS.headingSemi, color: ERROR }}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const id = selectedItem.pet_id;
                  setSelectedItem(null);
                  router.push({ pathname: '/(app)/create-pet', params: { editId: id } });
                }}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, backgroundColor: PRIMARY }}
              >
                <Text style={{ fontFamily: FONTS.headingSemi, color: '#FFFFFF' }}>Edit Listing</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: H_PAD,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardInner: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1.15,
    backgroundColor: '#F5F5F7',
  },
  image: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10.5,
    color: '#FFFFFF',
  },
  body: { padding: 14, paddingBottom: 10, backgroundColor: '#FFFFFF' },
  name: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    color: DARK,
    lineHeight: 21,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 12.5,
    color: MUTED,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaIcon: { width: 13, height: 13 },
  metaText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11.5,
    color: '#444',
  },
  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  actionText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
  },
  divider: { width: 1, backgroundColor: '#F3F4F6' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
});

export default withFocusUnmount(MyListingsScreen);

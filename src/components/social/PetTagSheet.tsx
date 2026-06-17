// A nicer pet-tagging UX shared by the post composer and the comment composers.
// - PetTagButton: a paw pill that opens the sheet and shows how many are tagged.
// - SelectedPetsRow: the tagged pets shown as removable avatar chips.
// - PetTagSheet: a bottom sheet listing the user's pets (avatar + name + species)
//   with multi-select checkmarks, a search box, and an "add a new pet" row.
import React, { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, Pressable, Modal, FlatList, TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY = '#a03048';

const PET_EMOJI: Record<string, string> = {
  cat: '🐱',
  dog: '🐶',
  bird: '🐦',
  default: '🐾',
};

const emojiFor = (pet: any) => PET_EMOJI[String(pet?.species || 'default').toLowerCase()] ?? PET_EMOJI.default;

const PetAvatar = ({ pet, size = 44 }: { pet: any; size?: number }) => {
  if (pet?.avatar_url) {
    return <Image source={{ uri: pet.avatar_url }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#fdf0f2', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.5 }}>{emojiFor(pet)}</Text>
    </View>
  );
};

/* ── Trigger pill ── */
export const PetTagButton = ({ count, onPress }: { count: number; onPress: () => void }) => (
  <TouchableOpacity
    onPress={onPress}
    hitSlop={8}
    style={{
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
      borderWidth: 1,
      borderColor: count > 0 ? PRIMARY : '#E5E7EB',
      backgroundColor: count > 0 ? '#fdf0f2' : '#fff',
    }}
  >
    <Ionicons name="paw" size={15} color={PRIMARY} />
    <Text style={{ fontSize: 13, fontWeight: '600', color: count > 0 ? PRIMARY : '#374151' }}>
      {count > 0 ? `${count} pet${count > 1 ? 's' : ''} tagged` : 'Tag a pet'}
    </Text>
  </TouchableOpacity>
);

/* ── Selected pets as removable avatar chips ── */
export const SelectedPetsRow = ({
  petProfiles,
  selectedPets,
  onToggle,
}: {
  petProfiles: any[];
  selectedPets: number[];
  onToggle: (id: number) => void;
}) => {
  const selected = petProfiles.filter((p) => selectedPets.includes(p.pet_profile_id));
  if (!selected.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
      {selected.map((pet) => (
        <View
          key={pet.pet_profile_id}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingLeft: 4, paddingRight: 8, paddingVertical: 4,
            borderRadius: 999, backgroundColor: '#fdf0f2',
            borderWidth: 1, borderColor: PRIMARY,
          }}
        >
          <PetAvatar pet={pet} size={22} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: PRIMARY }}>{pet.name}</Text>
          <TouchableOpacity onPress={() => onToggle(pet.pet_profile_id)} hitSlop={6}>
            <Ionicons name="close-circle" size={16} color={PRIMARY} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

/* ── The bottom-sheet picker ── */
export const PetTagSheet = ({
  visible,
  onClose,
  petProfiles,
  selectedPets,
  onToggle,
  onAddPet,
}: {
  visible: boolean;
  onClose: () => void;
  petProfiles: any[];
  selectedPets: number[];
  onToggle: (id: number) => void;
  onAddPet?: () => void;
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return petProfiles;
    return petProfiles.filter((p) => String(p.name).toLowerCase().includes(q));
  }, [petProfiles, query]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 22, borderTopRightRadius: 22,
            paddingBottom: 24, maxHeight: '75%',
          }}
        >
          {/* Grabber */}
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' }} />
          </View>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#111' }}>Tag your pets</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: PRIMARY }}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          {petProfiles.length > 4 && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              marginHorizontal: 20, marginBottom: 6, paddingHorizontal: 12,
              backgroundColor: '#F3F4F6', borderRadius: 12, height: 40,
            }}>
              <Ionicons name="search" size={16} color="#9CA3AF" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search your pets"
                placeholderTextColor="#9CA3AF"
                style={{ flex: 1, fontSize: 14, color: '#111' }}
              />
            </View>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.pet_profile_id)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 4 }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 28, gap: 8 }}>
                <Ionicons name="paw-outline" size={32} color="#D1D5DB" />
                <Text style={{ color: '#9CA3AF', fontSize: 14 }}>No pets yet</Text>
              </View>
            }
            renderItem={({ item }) => {
              const selected = selectedPets.includes(item.pet_profile_id);
              return (
                <TouchableOpacity
                  onPress={() => onToggle(item.pet_profile_id)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    paddingVertical: 8, paddingHorizontal: 8, borderRadius: 14,
                    backgroundColor: selected ? '#fdf0f2' : 'transparent',
                  }}
                >
                  <PetAvatar pet={item} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#111' }}>{item.name}</Text>
                    {!!item.species && (
                      <Text style={{ fontSize: 12, color: '#9CA3AF', textTransform: 'capitalize', marginTop: 1 }}>
                        {item.breed ? `${item.species} · ${item.breed}` : item.species}
                      </Text>
                    )}
                  </View>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={selected ? PRIMARY : '#D1D5DB'}
                  />
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={
              onAddPet ? (
                <TouchableOpacity
                  onPress={onAddPet}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 8, marginTop: 4 }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="add" size={20} color="#9CA3AF" />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#6B7280' }}>Add a new pet</Text>
                </TouchableOpacity>
              ) : null
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default PetTagSheet;

// A nicer pet-tagging UX shared by the post composer and the comment composers.
// - PetTagButton: a paw pill that opens the sheet and shows how many are tagged.
// - PetTagHint: first-run "Tag your pet" callout pointing down at the paw button.
// - SelectedPetsRow: the tagged pets shown as removable avatar chips.
// - PetTagSheet: a bottom sheet listing the user's pets (avatar + name + species)
//   with multi-select checkmarks, a search box, and an "add a new pet" row.
//   Uses the same custom BottomSheet as RepostBottomSheet / PostOptionsBottomSheet
//   for a consistent slide-up feel (rounded sheet, drag handle, gesture dismiss).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList, TextInput,
} from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '../ui/bottom-sheet';
import type { BottomSheetMethods } from '../ui/bottom-sheet/types';
import { Skeleton, SkeletonCircle } from '../common/Skeleton';
import { storage } from '../../utils/storage';

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

/* ── First-run "Tag your pet" nudge ──
   A small callout that floats directly above the paw button with a tail
   pointing down at it. Shown once per install until the user actually opens
   the tag sheet — after that they've found the feature and it stays hidden.

   Usage: wrap the paw button in a relatively-positioned View and drop the
   hint in as a sibling, so the callout anchors to the button without any
   measurement:

     const petHint = usePetTagHint();
     ...
     <View style={{ position: 'relative' }}>
       <TouchableOpacity onPress={() => { petHint.dismiss(); openSheet(); }}>
         <Ionicons name="paw-outline" ... />
       </TouchableOpacity>
       <PetTagHint visible={petHint.visible} />
     </View>
*/
const HINT_WIDTH = 116;
const PAW_ICON_WIDTH = 24;

export function usePetTagHint() {
  const [visible, setVisible] = useState(false);
  const persisted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (await storage.isPetTagHintSeen()) return;
      if (!cancelled) setVisible(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // Called when the user opens the tag sheet — they've discovered it, so the
  // nudge retires for good.
  const dismiss = useCallback(() => {
    setVisible(false);
    if (persisted.current) return;
    persisted.current = true;
    storage.markPetTagHintSeen();
  }, []);

  return { visible, dismiss };
}

export const PetTagHint = ({ visible }: { visible: boolean }) => {
  const bob = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    // Gentle two-beat bob to catch the eye, then rest — a continuous loop
    // would pull focus away from the caption the whole time it's composing.
    bob.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(-3, { duration: 420 }),
          withTiming(0, { duration: 420 }),
        ),
        4,
        false,
      ),
    );
  }, [visible, bob]);

  const bobStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          // Sit above the paw button, tail nearly touching it.
          bottom: '100%',
          marginBottom: 9,
          width: HINT_WIDTH,
          // Centre the callout over the icon it points at.
          left: -(HINT_WIDTH - PAW_ICON_WIDTH) / 2,
          alignItems: 'center',
        },
        bobStyle,
      ]}
    >
      <View
        style={{
          backgroundColor: PRIMARY,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: 10,
        }}
      >
        {/* lineHeight + includeFontPadding pin the text box to the glyphs.
            Without them the font's default leading (and Android's extra
            bottom font padding) make the symmetric paddingVertical above
            read as bottom-heavy. */}
        <Text
          style={{
            color: '#fff',
            fontSize: 12,
            fontWeight: '700',
            lineHeight: 14,
            includeFontPadding: false,
          }}
        >
          Tag your pet
        </Text>
      </View>
      {/* Downward tail — a rotated square tucked under the bubble reads as a
          triangle without needing an SVG or borderWidth triangle hack. */}
      <View
        style={{
          width: 10,
          height: 10,
          backgroundColor: PRIMARY,
          transform: [{ rotate: '45deg' }],
          marginTop: -5,
          borderRadius: 2,
        }}
      />
    </Animated.View>
  );
};

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
const PetRowSkeleton = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 8 }}>
    <SkeletonCircle size={44} />
    <View style={{ flex: 1, gap: 6 }}>
      <Skeleton width={100} height={14} />
      <Skeleton width={70} height={11} />
    </View>
  </View>
);

export const PetTagSheet = ({
  visible,
  onClose,
  petProfiles,
  selectedPets,
  onToggle,
  onAddPet,
  isLoading,
}: {
  visible: boolean;
  onClose: () => void;
  petProfiles: any[];
  selectedPets: number[];
  onToggle: (id: number) => void;
  onAddPet?: () => void;
  isLoading?: boolean;
}) => {
  const [query, setQuery] = useState('');
  const sheetRef = useRef<BottomSheetMethods>(null);
  const snapPoints = useMemo(() => ['55%', '85%'] as const, []);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => sheetRef.current?.expand(), 0);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return petProfiles;
    return petProfiles.filter((p) => String(p.name).toLowerCase().includes(q));
  }, [petProfiles, query]);

  if (!visible) return null;

  const handleDone = () => sheetRef.current?.close();

  // Header (title + Done + search) rides along as a sticky list header so the
  // FlatList can be the BottomSheet's single scrollable child — nesting a
  // FlatList beside other children forces the sheet into a plain ScrollView,
  // which throws "VirtualizedLists should never be nested inside ScrollViews".
  const ListHeader = (
    <View style={{ backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#111' }}>Tag your pets</Text>
        <TouchableOpacity onPress={handleDone} hitSlop={8}>
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
    </View>
  );

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleDone} statusBarTranslucent navigationBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheet ref={sheetRef} snapPoints={snapPoints} onClose={onClose}>
          <FlatList
            data={isLoading ? [] : filtered}
            keyExtractor={(item) => String(item.pet_profile_id)}
            keyboardShouldPersistTaps="handled"
            stickyHeaderIndices={[0]}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 32 }}
            ListEmptyComponent={
              isLoading ? (
                <View style={{ paddingTop: 4 }}>
                  <PetRowSkeleton />
                  <PetRowSkeleton />
                  <PetRowSkeleton />
                </View>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 28, gap: 8 }}>
                  <Ionicons name="paw-outline" size={32} color="#D1D5DB" />
                  <Text style={{ color: '#9CA3AF', fontSize: 14 }}>No pets yet</Text>
                </View>
              )
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
        </BottomSheet>
      </GestureHandlerRootView>
    </Modal>
  );
};

export default PetTagSheet;

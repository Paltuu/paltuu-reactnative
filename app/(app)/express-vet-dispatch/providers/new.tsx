import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetDispatchApi } from '../../../../src/api/expressVetDispatch';
import { EXPRESS_VET_CATEGORY_ICONS } from '../../../../src/constants/expressVet';
import { uploadImageToS3 } from '../../../../src/utils/uploadImage';
import PaltuuButton from '../../../../src/components/ui/PaltuuButton';
import { FONTS } from '../../../../src/constants/typography';

const DARK = '#1A1A2E';
const PRIMARY = '#A03048';
const H_PAD = 20;
const ALL_CATEGORIES = ['express_vet', 'normal_vet', 'neutering', 'spaying', 'vaccination', 'grooming'];

export default function ExpressVetNewProviderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [years, setYears] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [phone, setPhone] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [newPhoto, setNewPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const toggleCategory = (category: string) => {
    setCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) {
      const a = result.assets[0];
      // Library photos are frequently HEIC on iOS (the default camera format) — the upload
      // server's sharp build has no HEIC decoder, so it 500s unless we force real JPEG bytes
      // here rather than just relabeling the mime type. Same fix as profile/edit.tsx's avatar upload.
      const jpeg = await manipulateAsync(a.uri, [], { compress: 0.8, format: SaveFormat.JPEG });
      setNewPhoto({ uri: jpeg.uri, name: `provider_${Date.now()}.jpg`, type: 'image/jpeg' });
    }
  };

  const createMutation = useMutation({
    mutationFn: expressVetDispatchApi.createProvider,
    onSuccess: ({ provider }) => {
      queryClient.invalidateQueries({ queryKey: ['express-vet-providers-roster'] });
      router.replace({ pathname: '/(app)/express-vet-dispatch/providers/[id]', params: { id: provider.provider_id } } as any);
    },
    onError: () => Alert.alert('Something went wrong', 'Could not create this provider. Please try again.'),
  });

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', "Please enter the provider's name.");
      return;
    }
    if (categories.length === 0) {
      Alert.alert('Required', 'Please select at least one category.');
      return;
    }

    let photoUrl: string | null = null;
    if (newPhoto) {
      setIsUploadingPhoto(true);
      try {
        photoUrl = await uploadImageToS3(newPhoto);
      } catch {
        setIsUploadingPhoto(false);
        Alert.alert('Photo upload failed', 'Could not upload the photo. Please try again.');
        return;
      }
      setIsUploadingPhoto(false);
    }

    createMutation.mutate({
      name: name.trim(),
      photo_url: photoUrl,
      years_experience: years ? Number(years) : null,
      qualifications: qualifications.trim() || null,
      phone_number: phone.trim() || null,
      categories,
    });
  };

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingHorizontal: H_PAD, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Add Provider</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 24, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto}>
          {newPhoto ? (
            <Image source={{ uri: newPhoto.uri }} style={styles.photoPreview} contentFit="cover" />
          ) : (
            <>
              <Ionicons name="camera-outline" size={22} color="#B0B7C3" />
              <Text style={styles.photoPickerText}>Add a photo (optional)</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ gap: 8 }}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor="#B0B7C3" />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={styles.fieldLabel}>Categories</Text>
          <View style={styles.categoryGrid}>
            {ALL_CATEGORIES.map((c) => {
              const active = categories.includes(c);
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={() => toggleCategory(c)}
                >
                  <Ionicons name={EXPRESS_VET_CATEGORY_ICONS[c] ?? 'paw'} size={14} color={active ? PRIMARY : '#8A8A94'} />
                  <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{c.replace('_', ' ')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={styles.fieldLabel}>Years of experience</Text>
          <TextInput
            style={styles.input}
            value={years}
            onChangeText={setYears}
            placeholder="Optional"
            keyboardType="number-pad"
            placeholderTextColor="#B0B7C3"
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={styles.fieldLabel}>Qualifications</Text>
          <TextInput
            style={styles.input}
            value={qualifications}
            onChangeText={setQualifications}
            placeholder="Optional"
            placeholderTextColor="#B0B7C3"
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={styles.fieldLabel}>Phone (your own reference)</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Optional"
            keyboardType="phone-pad"
            placeholderTextColor="#B0B7C3"
          />
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <PaltuuButton
          label="Add Provider"
          onPress={handleCreate}
          loading={createMutation.isPending || isUploadingPhoto}
          radius={26}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFB' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    backgroundColor: '#FAFAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: { fontFamily: FONTS.heading, fontSize: 22, color: DARK },

  fieldLabel: { fontFamily: FONTS.bodyBold, fontSize: 14, color: DARK },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: DARK,
    backgroundColor: '#FFFFFF',
  },

  photoPicker: {
    height: 100,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%' },
  photoPickerText: { fontFamily: FONTS.body, fontSize: 12, color: '#B0B7C3' },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  categoryChipActive: { borderColor: PRIMARY, backgroundColor: '#FAF0F2' },
  categoryChipText: { fontFamily: FONTS.bodyBold, fontSize: 11, color: '#8A8A94', textTransform: 'capitalize' },
  categoryChipTextActive: { color: PRIMARY },

  bottom: { paddingHorizontal: H_PAD, paddingTop: 8 },
});

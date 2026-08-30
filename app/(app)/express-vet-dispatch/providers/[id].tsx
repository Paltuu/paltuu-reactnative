import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Switch, Alert, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetDispatchApi } from '../../../../src/api/expressVetDispatch';
import { EXPRESS_VET_CATEGORY_ICONS } from '../../../../src/constants/expressVet';
import PaltuuButton from '../../../../src/components/ui/PaltuuButton';
import { QueryErrorState } from '../../../../src/components/ui/QueryErrorState';
import PhoneInput, { isValidPkPhone, normalizeIncomingPhone } from '../../../../src/components/ui/PhoneInput';
import { uploadImageToS3 } from '../../../../src/utils/uploadImage';
import { showApiErrorAlert } from '../../../../src/utils/apiError';
import { COLORS } from '../../../../src/constants/colors';
import { FONTS } from '../../../../src/constants/typography';

const H_PAD = 20;
const ALL_CATEGORIES = ['express_vet', 'normal_vet', 'neutering', 'spaying', 'vaccination', 'grooming'];

export default function ExpressVetProviderDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['express-vet-provider', id],
    queryFn: () => expressVetDispatchApi.getProvider(id),
  });
  const provider = data?.provider;
  const reviews = data?.reviews ?? [];

  const [name, setName] = useState('');
  const [years, setYears] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [phone, setPhone] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [newPhoto, setNewPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!provider) return;
    setName(provider.name);
    setYears(provider.years_experience != null ? String(provider.years_experience) : '');
    setQualifications(provider.qualifications ?? '');
    setPhone(normalizeIncomingPhone(provider.phone_number));
    setCategories(provider.categories);
    setIsActive(provider.is_active);
  }, [provider]);

  const updateMutation = useMutation({
    mutationFn: (patch: Record<string, any>) => expressVetDispatchApi.updateProvider(id, patch),
    onSuccess: (result) => {
      setNewPhoto(null);
      // Write the saved row straight back into the cache so `isDirty` (and the
      // Save button's disabled state) flip off immediately — without waiting for
      // the invalidated query below to refetch. Closes the window where the
      // just-re-enabled button could be tapped again on unchanged data.
      if (result?.provider) {
        queryClient.setQueryData(['express-vet-provider', id], (old: any) => ({
          ...(old ?? {}),
          provider: result.provider,
        }));
      }
      queryClient.invalidateQueries({ queryKey: ['express-vet-provider', id] });
      queryClient.invalidateQueries({ queryKey: ['express-vet-providers-roster'] });
      queryClient.invalidateQueries({ queryKey: ['express-vet-my-provider-profile'] });
    },
    onError: (err) => showApiErrorAlert(err, 'Could not save changes. Please try again.'),
  });

  const toggleCategory = (category: string) => {
    setCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  };

  const handleToggleActive = (value: boolean) => {
    setIsActive(value);
    updateMutation.mutate({ is_active: value });
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

  // Only allow a save when something actually changed. Stops a pointless write,
  // and stops the Save button being spammed after a successful save (it
  // re-enables the moment the request finishes). `is_active` has its own toggle
  // + mutation and isn't part of this form.
  const isDirty = !!provider && (
    name.trim() !== provider.name ||
    years !== (provider.years_experience != null ? String(provider.years_experience) : '') ||
    qualifications.trim() !== (provider.qualifications ?? '') ||
    phone !== normalizeIncomingPhone(provider.phone_number) ||
    categories.length !== provider.categories.length ||
    categories.some((c) => !provider.categories.includes(c)) ||
    newPhoto !== null
  );

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', "Please enter the provider's name.");
      return;
    }
    if (categories.length === 0) {
      Alert.alert('Required', 'Please select at least one category.');
      return;
    }
    if (phone && !isValidPkPhone(phone)) {
      Alert.alert('Incomplete phone number', 'Please enter all 10 digits, or clear the field to leave it blank.');
      return;
    }

    let photoUrl: string | undefined;
    if (newPhoto) {
      setIsUploadingPhoto(true);
      try {
        photoUrl = await uploadImageToS3(newPhoto) ?? undefined;
      } catch {
        setIsUploadingPhoto(false);
        Alert.alert('Photo upload failed', 'Could not upload the photo. Please try again.');
        return;
      }
      setIsUploadingPhoto(false);
    }

    updateMutation.mutate({
      name: name.trim(),
      years_experience: years ? Number(years) : null,
      qualifications: qualifications.trim() || null,
      phone_number: isValidPkPhone(phone) ? phone : null,
      categories,
      ...(photoUrl ? { photo_url: photoUrl } : {}),
    });
  };

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingHorizontal: H_PAD, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Provider</Text>
        </View>
      </View>

      {isError ? (
        <QueryErrorState
          error={error}
          fallbackMessage="Could not load this provider. Please try again."
          onRetry={() => refetch()}
        />
      ) : isPending || !provider ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 24, gap: 16 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.photoRow}>
              <TouchableOpacity onPress={pickPhoto}>
                {newPhoto || provider.photo_url ? (
                  <Image source={{ uri: newPhoto?.uri ?? provider.photo_url ?? undefined }} style={styles.photo} contentFit="cover" />
                ) : (
                  <View style={[styles.photo, styles.photoFallback]}>
                    <Ionicons name="person" size={28} color={COLORS.textPlaceholder} />
                  </View>
                )}
                <View style={styles.photoEditBadge}>
                  <Ionicons name="camera" size={13} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              {provider.rating != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="star" size={14} color="#F5A623" />
                  <Text style={styles.ratingText}>
                    {provider.rating} ({provider.total_reviews} reviews)
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.activeRow}>
              <Text style={styles.fieldLabel}>Active — assignable to new jobs</Text>
              <Switch value={isActive} onValueChange={handleToggleActive} trackColor={{ true: COLORS.primary }} />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={COLORS.textPlaceholder} />
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
                      <Ionicons name={EXPRESS_VET_CATEGORY_ICONS[c] ?? 'paw'} size={14} color={active ? COLORS.primary : COLORS.textMuted} />
                      <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                        {c.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={styles.fieldLabel}>Years of experience</Text>
              <TextInput style={styles.input} value={years} onChangeText={setYears} keyboardType="number-pad" placeholderTextColor={COLORS.textPlaceholder} />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={styles.fieldLabel}>Qualifications</Text>
              <TextInput style={styles.input} value={qualifications} onChangeText={setQualifications} placeholderTextColor={COLORS.textPlaceholder} />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={styles.fieldLabel}>Phone (your own reference)</Text>
              <PhoneInput value={phone} onChangeValue={setPhone} />
            </View>

            {reviews.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={styles.fieldLabel}>Recent reviews</Text>
                {reviews.map((r: any, i: number) => (
                  <View key={i} style={styles.reviewCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="star" size={13} color="#F5A623" />
                      <Text style={styles.reviewRating}>{r.rating}</Text>
                      <Text style={styles.reviewClient}>— {r.client_name}</Text>
                    </View>
                    {!!r.review_content && <Text style={styles.reviewContent}>{r.review_content}</Text>}
                    {r.addon_total_pkr != null && (
                      <Text style={styles.reviewAddon}>
                        + PKR {Number(r.addon_total_pkr).toLocaleString()} extra
                        {r.addon_reason_tags?.length ? ` (${r.addon_reason_tags.join(', ')})` : ''}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
            <PaltuuButton label="Save Changes" onPress={handleSave} loading={updateMutation.isPending || isUploadingPhoto} disabled={!isDirty} radius={26} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFB' },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    backgroundColor: '#FAFAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: { fontFamily: FONTS.heading, fontSize: 22, color: COLORS.textDark },

  photoRow: { alignItems: 'center', gap: 8 },
  photo: { width: 76, height: 76, borderRadius: 38 },
  photoFallback: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  photoEditBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: '#FAFAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted },

  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 14,
  },

  fieldLabel: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.textDark },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textDark,
    backgroundColor: '#FFFFFF',
  },

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
  categoryChipActive: { borderColor: COLORS.primary, backgroundColor: '#FAF0F2' },
  categoryChipText: { fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.textMuted, textTransform: 'capitalize' },
  categoryChipTextActive: { color: COLORS.primary },

  reviewCard: {
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 12,
    gap: 4,
  },
  reviewRating: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.textDark },
  reviewClient: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted },
  reviewContent: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textDark },
  reviewAddon: { fontFamily: FONTS.body, fontSize: 11, color: '#B26B00', marginTop: 2 },

  bottom: { paddingHorizontal: H_PAD, paddingTop: 8 },
});

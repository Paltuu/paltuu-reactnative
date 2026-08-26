import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetDispatchApi, ExpressVetProvider, AssignPayload } from '../../../../../src/api/expressVetDispatch';
import PaltuuButton from '../../../../../src/components/ui/PaltuuButton';
import { QueryErrorState } from '../../../../../src/components/ui/QueryErrorState';
import PhoneInput, { isValidPkPhone } from '../../../../../src/components/ui/PhoneInput';
import { useKeyboardVisible } from '../../../../../src/hooks/useKeyboardVisible';
import { uploadImageToS3 } from '../../../../../src/utils/uploadImage';
import { showApiErrorAlert } from '../../../../../src/utils/apiError';
import { COLORS } from '../../../../../src/constants/colors';
import { FONTS } from '../../../../../src/constants/typography';

const H_PAD = 20;

type Mode = 'search' | 'new' | 'myself';

export default function ExpressVetAssignScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: requestData, isError: isRequestError, error: requestError, refetch: refetchRequest } = useQuery({
    queryKey: ['express-vet-dispatch-request', id],
    queryFn: () => expressVetDispatchApi.getRequestDetail(id),
  });
  const request = requestData?.request;

  const [finalPrice, setFinalPrice] = useState(request?.starting_price_pkr ? String(request.starting_price_pkr) : '');
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [mode, setMode] = useState<Mode>('search');

  // A native picker can't produce an unparseable value, so unlike the old two-text-field
  // version there's nothing left to validate here beyond "something was picked" (see
  // handleConfirm) — `minimumDate` below also rules out scheduling a visit in the past,
  // which the old regex-only validation never caught.
  const mergeDateAndTime = (prev: Date | null, picked: Date, targetMode: 'date' | 'time'): Date => {
    const base = prev ?? new Date();
    return targetMode === 'date'
      ? new Date(picked.getFullYear(), picked.getMonth(), picked.getDate(), base.getHours(), base.getMinutes())
      : new Date(base.getFullYear(), base.getMonth(), base.getDate(), picked.getHours(), picked.getMinutes());
  };

  const onPickerChange = (event: DateTimePickerEvent, picked?: Date) => {
    // Android's dialog is a one-shot modal that dismisses itself; iOS's inline spinner stays
    // open until the "Done" button below is tapped.
    if (Platform.OS === 'android') setPickerMode(null);
    if (event.type === 'dismissed' || !picked || !pickerMode) return;
    setScheduledAt((prev) => mergeDateAndTime(prev, picked, pickerMode));
  };

  // ── Search mode ──
  const [search, setSearch] = useState('');
  const { data: providersData, isFetching: isSearching } = useQuery({
    queryKey: ['express-vet-providers-search', search, request?.category],
    queryFn: () => expressVetDispatchApi.searchProviders({ search, category: request?.category }),
    enabled: mode === 'search' && !!request,
  });
  const [selectedProvider, setSelectedProvider] = useState<ExpressVetProvider | null>(null);

  // ── New provider mode ──
  const [newName, setNewName] = useState('');
  const [newYears, setNewYears] = useState('');
  const [newQualifications, setNewQualifications] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPhoto, setNewPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

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

  const uploadPhotoIfNeeded = async (): Promise<string | null> => {
    if (!newPhoto) return null;
    setIsUploadingPhoto(true);
    try {
      return await uploadImageToS3(newPhoto);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Ref (not state) so the "Assign Anyway" retry always reads the exact payload that was just
  // sent, regardless of which render the async onSuccess callback ends up firing in.
  const lastPayloadRef = useRef<AssignPayload | null>(null);

  const assignMutation = useMutation({
    mutationFn: (payload: AssignPayload) => expressVetDispatchApi.assign(id, payload),
    onSuccess: (result) => {
      if (result.needs_confirmation) {
        Alert.alert('Heads up', result.warning ?? 'This provider already has a job today.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Assign Anyway',
            style: 'destructive',
            onPress: () => assignMutation.mutate({ ...lastPayloadRef.current!, force: true }),
          },
        ]);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['express-vet-dispatch-request', id] });
      queryClient.invalidateQueries({ queryKey: ['express-vet-dispatch-jobs'] });
      router.replace('/(app)/express-vet-dispatch/jobs' as any);
    },
    onError: (err) => showApiErrorAlert(err, 'Could not assign this request. Please try again.'),
  });

  const handleConfirm = async () => {
    const price = Number(finalPrice);
    if (!Number.isFinite(price) || price <= 0) {
      Alert.alert('Required', 'Please enter a valid final price.');
      return;
    }
    if (!scheduledAt) {
      Alert.alert('Required', 'Please select a visit date and time.');
      return;
    }

    let payload: AssignPayload;
    if (mode === 'myself') {
      payload = { final_price_pkr: price, scheduled_at: scheduledAt.toISOString(), self_assign: true };
    } else if (mode === 'search') {
      if (!selectedProvider) {
        Alert.alert('Required', 'Please select a provider.');
        return;
      }
      payload = { final_price_pkr: price, scheduled_at: scheduledAt.toISOString(), provider_id: selectedProvider.provider_id };
    } else {
      if (!newName.trim()) {
        Alert.alert('Required', "Please enter the provider's name.");
        return;
      }
      if (newPhone && !isValidPkPhone(newPhone)) {
        Alert.alert('Incomplete phone number', 'Please enter all 10 digits, or clear the field to leave it blank.');
        return;
      }
      let photoUrl: string | null;
      try {
        photoUrl = await uploadPhotoIfNeeded();
      } catch {
        Alert.alert('Photo upload failed', 'Could not upload the photo. Please try again or continue without one.');
        return;
      }
      payload = {
        final_price_pkr: price,
        scheduled_at: scheduledAt.toISOString(),
        new_provider: {
          name: newName.trim(),
          photo_url: photoUrl,
          years_experience: newYears ? Number(newYears) : null,
          qualifications: newQualifications.trim() || null,
          phone_number: isValidPkPhone(newPhone) ? newPhone : null,
          categories: request ? [request.category] : [],
        },
      };
    }

    lastPayloadRef.current = payload;
    assignMutation.mutate(payload);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingHorizontal: H_PAD, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Assign Provider</Text>
        </View>
      </View>

      {isRequestError ? (
        <QueryErrorState
          error={requestError}
          fallbackMessage="Could not load this request. Please try again."
          onRetry={() => refetchRequest()}
        />
      ) : (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 24, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: 8 }}>
            <Text style={styles.fieldLabel}>Final price (PKR)</Text>
            <TextInput
              style={styles.input}
              value={finalPrice}
              onChangeText={setFinalPrice}
              keyboardType="number-pad"
              placeholder="e.g. 3500"
              placeholderTextColor={COLORS.textPlaceholder}
            />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.fieldLabel}>Visit date & time</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.input, { flex: 1 }]} onPress={() => setPickerMode('date')}>
                <Text style={scheduledAt ? styles.pickerValueText : styles.pickerPlaceholderText}>
                  {scheduledAt ? format(scheduledAt, 'EEE, MMM d') : 'Select date'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.input, { flex: 1 }]} onPress={() => setPickerMode('time')}>
                <Text style={scheduledAt ? styles.pickerValueText : styles.pickerPlaceholderText}>
                  {scheduledAt ? format(scheduledAt, 'h:mm a') : 'Select time'}
                </Text>
              </TouchableOpacity>
            </View>
            {pickerMode && (
              <DateTimePicker
                value={scheduledAt ?? new Date()}
                mode={pickerMode}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={onPickerChange}
              />
            )}
            {Platform.OS === 'ios' && pickerMode && (
              <TouchableOpacity onPress={() => setPickerMode(null)} style={styles.pickerDoneButton}>
                <Text style={styles.pickerDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.modeRow}>
            {(['search', 'new', 'myself'] as Mode[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.modeTab, mode === m && styles.modeTabActive]}
                onPress={() => setMode(m)}
              >
                <Text style={[styles.modeTabText, mode === m && styles.modeTabTextActive]}>
                  {m === 'search' ? 'Search' : m === 'new' ? 'New Provider' : 'Assign to Myself'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === 'search' && (
            <View style={{ gap: 10 }}>
              <TextInput
                style={styles.input}
                value={search}
                onChangeText={setSearch}
                placeholder="Search providers by name…"
                placeholderTextColor={COLORS.textPlaceholder}
              />
              {isSearching ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                (providersData?.data ?? []).map((p) => {
                  const active = selectedProvider?.provider_id === p.provider_id;
                  return (
                    <TouchableOpacity
                      key={p.provider_id}
                      style={[styles.providerRow, active && styles.providerRowActive]}
                      onPress={() => setSelectedProvider(p)}
                    >
                      {p.photo_url ? (
                        <Image source={{ uri: p.photo_url }} style={styles.providerPhoto} contentFit="cover" />
                      ) : (
                        <View style={[styles.providerPhoto, styles.providerPhotoFallback]}>
                          <Ionicons name="person" size={18} color={COLORS.textPlaceholder} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.providerName}>{p.name}</Text>
                        {p.rating != null && (
                          <Text style={styles.providerMeta}>
                            {p.rating} ★ ({p.total_reviews})
                          </Text>
                        )}
                      </View>
                      {active && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}

          {mode === 'new' && (
            <View style={{ gap: 12 }}>
              <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto}>
                {newPhoto ? (
                  <Image source={{ uri: newPhoto.uri }} style={styles.photoPreview} contentFit="cover" />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={22} color={COLORS.textPlaceholder} />
                    <Text style={styles.photoPickerText}>Add a photo (optional)</Text>
                  </>
                )}
              </TouchableOpacity>
              <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Full name" placeholderTextColor={COLORS.textPlaceholder} />
              <TextInput
                style={styles.input}
                value={newYears}
                onChangeText={setNewYears}
                placeholder="Years of experience (optional)"
                placeholderTextColor={COLORS.textPlaceholder}
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.input}
                value={newQualifications}
                onChangeText={setNewQualifications}
                placeholder="Qualifications (optional)"
                placeholderTextColor={COLORS.textPlaceholder}
              />
              <View style={{ gap: 6 }}>
                <Text style={styles.phoneFieldHint}>Phone number (optional, for your own reference)</Text>
                <PhoneInput value={newPhone} onChangeValue={setNewPhone} />
              </View>
            </View>
          )}

          {mode === 'myself' && (
            <View style={styles.card}>
              <Text style={styles.cardText}>You'll be assigned as the provider for this job.</Text>
            </View>
          )}
        </ScrollView>

        {/* Drops the home-indicator inset while the keyboard is up — see address.tsx. */}
        <View style={[styles.bottom, { paddingBottom: keyboardVisible ? 12 : insets.bottom + 16 }]}>
          <PaltuuButton
            label="Confirm & Assign"
            onPress={handleConfirm}
            loading={assignMutation.isPending || isUploadingPhoto}
            radius={26}
          />
        </View>
      </KeyboardAvoidingView>
      )}
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
  title: { fontFamily: FONTS.heading, fontSize: 22, color: COLORS.textDark },

  fieldLabel: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.textDark },
  phoneFieldHint: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted },
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
  pickerValueText: { fontSize: 14, fontFamily: FONTS.bodyBold, color: COLORS.textDark },
  pickerPlaceholderText: { fontSize: 14, fontFamily: FONTS.body, color: COLORS.textPlaceholder },
  pickerDoneButton: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 4 },
  pickerDoneText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.primary },

  modeRow: { flexDirection: 'row', gap: 8 },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  modeTabActive: { borderColor: COLORS.primary, backgroundColor: '#FAF0F2' },
  modeTabText: { fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.textDark, textAlign: 'center' },
  modeTabTextActive: { color: COLORS.primary },

  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  providerRowActive: { borderColor: COLORS.primary, backgroundColor: '#FAF0F2' },
  providerPhoto: { width: 40, height: 40, borderRadius: 20 },
  providerPhotoFallback: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  providerName: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.textDark },
  providerMeta: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

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
  photoPickerText: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textPlaceholder },

  card: {
    borderRadius: 14,
    backgroundColor: '#FAF0F2',
    padding: 16,
  },
  cardText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.primary, textAlign: 'center' },

  bottom: { paddingHorizontal: H_PAD, paddingTop: 8 },
});

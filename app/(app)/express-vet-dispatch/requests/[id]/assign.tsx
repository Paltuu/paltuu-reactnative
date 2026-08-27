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
import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetDispatchApi, ExpressVetProvider, AssignPayload } from '../../../../../src/api/expressVetDispatch';
import PaltuuButton from '../../../../../src/components/ui/PaltuuButton';
import { useKeyboardVisible } from '../../../../../src/hooks/useKeyboardVisible';
import { uploadImageToS3 } from '../../../../../src/utils/uploadImage';
import { FONTS } from '../../../../../src/constants/typography';

// require(), not a static import: binaries built before @react-native-community/datetimepicker
// was added (prod 1.0.10 / 1.0.11 — still live on iOS) throw at module-eval inside this package
// (TurboModuleRegistry.getEnforcing('RNCDatePicker')). Catching it here lets those builds fall
// back to the plain text inputs below instead of black-screening the whole screen. Once every
// shipped platform is on a binary that bundles the module (>= 1.0.12), this can go back to a
// normal import and the text-input fallback can be deleted.
let NativeDateTimePicker: React.ComponentType<any> | null = null;
try {
  NativeDateTimePicker = require('@react-native-community/datetimepicker').default;
} catch {
  NativeDateTimePicker = null;
}

const DARK = '#1A1A2E';
const PRIMARY = '#A03048';
const H_PAD = 20;

type Mode = 'search' | 'new' | 'myself';

export default function ExpressVetAssignScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: requestData } = useQuery({
    queryKey: ['express-vet-dispatch-request', id],
    queryFn: () => expressVetDispatchApi.getRequestDetail(id),
  });
  const request = requestData?.request;

  const [finalPrice, setFinalPrice] = useState(request?.starting_price_pkr ? String(request.starting_price_pkr) : '');
  const [mode, setMode] = useState<Mode>('search');

  // Native picker is the primary path; `scheduledAt` is the single source of truth for it.
  const canUseNativePicker = NativeDateTimePicker != null;
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  // Text fallback — only rendered on binaries that don't bundle the native picker module.
  const [scheduledDate, setScheduledDate] = useState(''); // YYYY-MM-DD
  const [scheduledTime, setScheduledTime] = useState(''); // HH:MM, 24h

  const mergeDateAndTime = (prev: Date | null, picked: Date, targetMode: 'date' | 'time'): Date => {
    const base = prev ?? new Date();
    return targetMode === 'date'
      ? new Date(picked.getFullYear(), picked.getMonth(), picked.getDate(), base.getHours(), base.getMinutes())
      : new Date(base.getFullYear(), base.getMonth(), base.getDate(), picked.getHours(), picked.getMinutes());
  };

  const onPickerChange = (event: { type?: string }, picked?: Date) => {
    // Android's dialog is a one-shot modal that dismisses itself; iOS's inline spinner stays
    // open until the "Done" button below is tapped.
    if (Platform.OS === 'android') setPickerMode(null);
    if (event?.type === 'dismissed' || !picked || !pickerMode) return;
    setScheduledAt((prev) => mergeDateAndTime(prev, picked, pickerMode));
  };

  // Resolves whichever input path is active into a real Date (or null if incomplete/unparseable).
  const resolveScheduledAt = (): Date | null => {
    if (canUseNativePicker) return scheduledAt;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate) || !/^\d{1,2}:\d{2}$/.test(scheduledTime)) return null;
    const d = new Date(`${scheduledDate}T${scheduledTime.padStart(5, '0')}:00`);
    return Number.isNaN(d.getTime()) ? null : d;
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
    onError: () => Alert.alert('Something went wrong', 'Could not assign this request. Please try again.'),
  });

  const handleConfirm = async () => {
    const price = Number(finalPrice);
    if (!Number.isFinite(price) || price <= 0) {
      Alert.alert('Required', 'Please enter a valid final price.');
      return;
    }
    const scheduledAt = resolveScheduledAt();
    if (!scheduledAt) {
      Alert.alert(
        'Required',
        canUseNativePicker
          ? 'Please select a visit date and time.'
          : 'Please enter a valid visit date (YYYY-MM-DD) and time (HH:MM).'
      );
      return;
    }
    if (scheduledAt.getTime() <= Date.now()) {
      Alert.alert('Invalid time', 'The visit must be scheduled for a future date and time.');
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
          phone_number: newPhone.trim() || null,
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
              placeholderTextColor="#B0B7C3"
            />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.fieldLabel}>Visit date & time</Text>
            {canUseNativePicker ? (
              <>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.input, styles.pickerField, { flex: 1 }]}
                    onPress={() => setPickerMode('date')}
                  >
                    <Text style={scheduledAt ? styles.pickerValueText : styles.pickerPlaceholderText}>
                      {scheduledAt ? format(scheduledAt, 'EEE, MMM d') : 'Select date'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.input, styles.pickerField, { flex: 1 }]}
                    onPress={() => setPickerMode('time')}
                  >
                    <Text style={scheduledAt ? styles.pickerValueText : styles.pickerPlaceholderText}>
                      {scheduledAt ? format(scheduledAt, 'h:mm a') : 'Select time'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {pickerMode && NativeDateTimePicker && (
                  <NativeDateTimePicker
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
              </>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={scheduledDate}
                  onChangeText={setScheduledDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#B0B7C3"
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={scheduledTime}
                  onChangeText={setScheduledTime}
                  placeholder="HH:MM (24h)"
                  placeholderTextColor="#B0B7C3"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
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
                placeholderTextColor="#B0B7C3"
              />
              {isSearching ? (
                <ActivityIndicator color={PRIMARY} />
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
                          <Ionicons name="person" size={18} color="#B0B7C3" />
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
                      {active && <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />}
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
                    <Ionicons name="camera-outline" size={22} color="#B0B7C3" />
                    <Text style={styles.photoPickerText}>Add a photo (optional)</Text>
                  </>
                )}
              </TouchableOpacity>
              <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Full name" placeholderTextColor="#B0B7C3" />
              <TextInput
                style={styles.input}
                value={newYears}
                onChangeText={setNewYears}
                placeholder="Years of experience (optional)"
                placeholderTextColor="#B0B7C3"
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.input}
                value={newQualifications}
                onChangeText={setNewQualifications}
                placeholder="Qualifications (optional)"
                placeholderTextColor="#B0B7C3"
              />
              <TextInput
                style={styles.input}
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="Phone number (optional, for your own reference)"
                placeholderTextColor="#B0B7C3"
                keyboardType="phone-pad"
              />
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

  fieldLabel: { fontFamily: FONTS.bodyBold, fontSize: 15, color: DARK },
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
  pickerField: { justifyContent: 'center', minHeight: 46 },
  pickerValueText: { fontSize: 14, fontFamily: FONTS.bodyBold, color: DARK },
  pickerPlaceholderText: { fontSize: 14, fontFamily: FONTS.body, color: '#B0B7C3' },
  pickerDoneButton: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 4 },
  pickerDoneText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: PRIMARY },

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
  modeTabActive: { borderColor: PRIMARY, backgroundColor: '#FAF0F2' },
  modeTabText: { fontFamily: FONTS.bodyBold, fontSize: 11, color: DARK, textAlign: 'center' },
  modeTabTextActive: { color: PRIMARY },

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
  providerRowActive: { borderColor: PRIMARY, backgroundColor: '#FAF0F2' },
  providerPhoto: { width: 40, height: 40, borderRadius: 20 },
  providerPhotoFallback: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  providerName: { fontFamily: FONTS.bodyBold, fontSize: 14, color: DARK },
  providerMeta: { fontFamily: FONTS.body, fontSize: 12, color: '#8A8A94', marginTop: 2 },

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

  card: {
    borderRadius: 14,
    backgroundColor: '#FAF0F2',
    padding: 16,
  },
  cardText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: PRIMARY, textAlign: 'center' },

  bottom: { paddingHorizontal: H_PAD, paddingTop: 8 },
});

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import PaltuuButton from '../../src/components/ui/PaltuuButton';
import { OnboardingHeader } from '../../src/components/auth/OnboardingHeader';
import { PickerField } from '../../src/components/pets/PickerField';
import { DateField } from '../../src/components/pets/DateField';
import { usePetStore } from '../../src/stores/petStore';
import { useAuthStore } from '../../src/stores/authStore';

/* ───────────────────────────────────────────────
   Step configuration — one question per step, mirroring
   the signup flow's heading + subtext + single field layout.
   ─────────────────────────────────────────────── */
const STEPS = [
  { key: 'type', heading: 'Lost or found?', subtext: 'Tell us what you\'re reporting so we can point people the right way.' },
  { key: 'category', heading: 'What kind of pet?', subtext: 'Pick the category that fits best.' },
  { key: 'city', heading: 'Which city?', subtext: 'Where was the pet lost or found?' },
  { key: 'location', heading: 'Any specific spot?', subtext: 'A landmark or area helps people recognise it. Optional.' },
  { key: 'contact', heading: 'How can finders reach you?', subtext: 'We\'ll show this so people can contact you.' },
  { key: 'date', heading: 'When did it happen?', subtext: 'The date the pet went missing or was found.' },
  { key: 'description', heading: 'Describe the pet', subtext: 'Colour, breed, collar, distinguishing marks…' },
  { key: 'photos', heading: 'Add photos', subtext: 'A clear photo makes all the difference.' },
] as const;

const TOTAL_STEPS = STEPS.length;

export default function CreateLostFoundScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { cities, categories, fetchMetadata, createLostFoundPost, isLoading } = usePetStore();

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    postType: '' as '' | 'lost' | 'found',
    categoryId: '',
    cityId: '',
    location: '',
    contactInfo: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [images, setImages] = useState<any[]>([]);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    fetchMetadata().catch(() => {});
  }, []);

  const set = (patch: Partial<typeof formData>) => setFormData((prev) => ({ ...prev, ...patch }));

  const categoryOptions = (categories ?? []).map((c: any) => ({
    label: c.category_name || c.name || 'Unknown',
    value: (c.category_id || c.id)?.toString(),
  }));
  const cityOptions = (cities ?? []).map((c: any) => ({
    label: c.city_name || c.name || 'Unknown',
    value: (c.city_id || c.id)?.toString(),
  }));

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 3,
        quality: 0.7,
      });
      if (!result.canceled && result.assets) {
        const selected = result.assets.map((a) => ({
          uri: a.uri,
          type: 'image/jpeg',
          name: a.fileName || `lf_${Date.now()}.jpg`,
        }));
        setImages((prev) => [...prev, ...selected].slice(0, 3));
      }
    } catch (error) {
      console.error('Pick Image Error:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const validateStep = (): boolean => {
    const key = STEPS[step].key;
    switch (key) {
      case 'type':
        if (!formData.postType) {
          Alert.alert('Required', 'Please choose whether the pet was lost or found.');
          return false;
        }
        return true;
      case 'category':
        if (!formData.categoryId) {
          Alert.alert('Required', 'Please select a pet category.');
          return false;
        }
        return true;
      case 'city':
        if (!formData.cityId) {
          Alert.alert('Required', 'Please select a city.');
          return false;
        }
        return true;
      case 'contact':
        if (!formData.contactInfo.trim()) {
          Alert.alert('Required', 'Please add a contact number.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < TOTAL_STEPS - 1) {
      setStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((prev) => prev - 1);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/pets');
    }
  };

  const handleSubmit = async () => {
    if (images.length === 0) {
      Alert.alert('Required', 'Please add at least one photo.');
      return;
    }
    try {
      const payload = {
        category_id: Number(formData.categoryId),
        city_id: Number(formData.cityId),
        location: formData.location,
        pet_description: formData.description,
        date: formData.date,
        contact_info: `+92${formData.contactInfo.replace(/^0/, '')}`,
        post_type: formData.postType,
        user_id: user?.id || 47,
      };
      await createLostFoundPost(payload, images);
      setSubmitted(true);
    } catch {
      Alert.alert('Error', 'Submission failed.');
    }
  };

  const { heading, subtext, key } = STEPS[step];
  const isLast = step === TOTAL_STEPS - 1;

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.successBody}>
          <View style={styles.successIcon}>
            <Ionicons name="heart" size={38} color="#a03048" />
          </View>
          <Text style={styles.successTitle}>Report sent for review</Text>
          <Text style={styles.successText}>
            Thanks for helping a pet find its way home. Our team is reviewing your report now — once it's
            approved, it'll appear in the Lost & Found feed for the community to see.
          </Text>
        </View>
        <View style={styles.bottom}>
          <PaltuuButton label="Back to Pets" onPress={() => router.replace('/(app)/pets')} radius={26} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <OnboardingHeader onBack={handleBack} progress={(step + 1) / TOTAL_STEPS} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>{heading}</Text>
          <Text style={styles.subtext}>{subtext}</Text>

          {/* ── Type ── */}
          {key === 'type' && (
            <View style={{ gap: 12 }}>
              {([
                { value: 'lost', title: 'I lost a pet', sub: 'Report a missing pet', icon: 'sad-outline' },
                { value: 'found', title: 'I found a pet', sub: 'Report a pet you found', icon: 'heart-outline' },
              ] as const).map((opt) => {
                const active = formData.postType === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    activeOpacity={0.8}
                    onPress={() => set({ postType: opt.value })}
                    style={[styles.optionCard, active && styles.optionCardActive]}
                  >
                    <View style={styles.optionIcon}>
                      <Ionicons name={opt.icon} size={22} color="#a03048" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>{opt.title}</Text>
                      <Text style={styles.optionSub}>{opt.sub}</Text>
                    </View>
                    <Ionicons
                      name={active ? 'radio-button-on' : 'radio-button-off'}
                      size={22}
                      color={active ? '#a03048' : '#D1D5DB'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Category ── */}
          {key === 'category' && (
            <PickerField
              placeholder="Select a category"
              value={formData.categoryId}
              options={categoryOptions}
              onSelect={(v) => set({ categoryId: v })}
              icon="paw-outline"
            />
          )}

          {/* ── City ── */}
          {key === 'city' && (
            <PickerField
              placeholder="Select a city"
              value={formData.cityId}
              options={cityOptions}
              onSelect={(v) => set({ cityId: v })}
              icon="location-outline"
            />
          )}

          {/* ── Location ── */}
          {key === 'location' && (
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={formData.location}
              onChangeText={(t) => set({ location: t })}
              placeholder="e.g. Near Hill Park, DHA"
              placeholderTextColor="#B0B7C3"
              autoFocus
              returnKeyType="next"
              onSubmitEditing={handleNext}
            />
          )}

          {/* ── Contact ── */}
          {key === 'contact' && (
            <View style={styles.prefixRow}>
              <Text style={styles.prefix}>+92</Text>
              <TextInput
                ref={inputRef}
                style={styles.prefixInput}
                value={formData.contactInfo}
                onChangeText={(t) => set({ contactInfo: t })}
                placeholder="300 1234567"
                placeholderTextColor="#B0B7C3"
                keyboardType="number-pad"
                maxLength={11}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={handleNext}
              />
            </View>
          )}

          {/* ── Date ── */}
          {key === 'date' && (
            <DateField value={formData.date} onChange={(ymd) => set({ date: ymd })} />
          )}

          {/* ── Description ── */}
          {key === 'description' && (
            <TextInput
              ref={inputRef}
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(t) => set({ description: t })}
              placeholder="Distinguishing marks, colour, collar…"
              placeholderTextColor="#B0B7C3"
              multiline
              textAlignVertical="top"
              autoFocus
            />
          )}

          {/* ── Photos ── */}
          {key === 'photos' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {images.map((img, i) => (
                <View key={i} style={styles.imgWrap}>
                  <Image source={{ uri: img.uri }} style={styles.img} contentFit="cover" />
                  <TouchableOpacity
                    style={styles.imgRemove}
                    onPress={() => setImages(images.filter((_, idx) => idx !== i))}
                  >
                    <Ionicons name="close-circle" size={22} color="#FF4B4B" />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 3 && (
                <TouchableOpacity style={styles.imgAdd} onPress={pickImage}>
                  <Ionicons name="camera" size={26} color="#a03048" />
                  <Text style={styles.imgAddText}>Add</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottom}>
          <PaltuuButton
            label={isLast ? 'Submit Report' : 'Next'}
            successLabel={isLast ? 'Report submitted!' : undefined}
            onPress={handleNext}
            loading={isLoading}
            radius={26}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  body: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 24,
  },
  heading: {
    fontSize: 26,
    fontFamily: 'Montserrat_700Bold',
    color: '#111827',
    marginTop: 10,
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#6B7280',
    marginBottom: 28,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#111827',
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 130,
    paddingTop: 14,
  },

  // Prefixed contact input
  prefixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
  },
  prefix: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: '#6B7280',
    marginRight: 8,
  },
  prefixInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#111827',
  },

  // Option cards (lost / found)
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  optionCardActive: {
    borderColor: '#a03048',
    backgroundColor: '#FFFFFF',
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FAF0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: '#111827',
  },
  optionTitleActive: {
    color: '#a03048',
  },
  optionSub: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#6B7280',
    marginTop: 2,
  },

  // Photos
  imgWrap: { position: 'relative' },
  img: { width: 96, height: 96, borderRadius: 16 },
  imgRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 11,
  },
  imgAdd: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: '#FAF0F2',
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#a03048',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  imgAddText: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: '#a03048',
  },

  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 8,
  },

  // Success screen
  successBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FAF0F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'Montserrat_700Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  successText: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});

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
import { usePetStore } from '../../src/stores/petStore';
import { useShallow } from 'zustand/react/shallow';
import { withFocusUnmount } from '../../src/components/common/withFocusUnmount';

const PET_TAGS = [
  { tag_id: 1, tag_name: 'Playful', tag_category: 'personality' },
  { tag_id: 2, tag_name: 'Calm', tag_category: 'personality' },
  { tag_id: 3, tag_name: 'Affectionate', tag_category: 'personality' },
  { tag_id: 4, tag_name: 'Independent', tag_category: 'personality' },
  { tag_id: 5, tag_name: 'Vocal', tag_category: 'personality' },
  { tag_id: 6, tag_name: 'Gentle', tag_category: 'personality' },
  { tag_id: 7, tag_name: 'Energetic', tag_category: 'personality' },
  { tag_id: 8, tag_name: 'Shy', tag_category: 'personality' },
  { tag_id: 9, tag_name: 'Confident', tag_category: 'personality' },
  { tag_id: 10, tag_name: 'Curious', tag_category: 'personality' },
  { tag_id: 11, tag_name: 'Good with kids', tag_category: 'lifestyle' },
  { tag_id: 12, tag_name: 'Apartment friendly', tag_category: 'lifestyle' },
  { tag_id: 13, tag_name: 'Needs outdoor space', tag_category: 'lifestyle' },
  { tag_id: 14, tag_name: 'Low maintenance', tag_category: 'lifestyle' },
  { tag_id: 15, tag_name: 'Lap cat/dog', tag_category: 'lifestyle' },
  { tag_id: 16, tag_name: 'Active lifestyle', tag_category: 'lifestyle' },
  { tag_id: 17, tag_name: 'Vaccinated', tag_category: 'health' },
  { tag_id: 18, tag_name: 'Neutered/Spayed', tag_category: 'health' },
  { tag_id: 19, tag_name: 'Special needs', tag_category: 'health' },
  { tag_id: 20, tag_name: 'Senior pet', tag_category: 'health' },
  { tag_id: 21, tag_name: 'Good with dogs', tag_category: 'compatibility' },
  { tag_id: 22, tag_name: 'Good with cats', tag_category: 'compatibility' },
  { tag_id: 23, tag_name: 'Good with other pets', tag_category: 'compatibility' },
  { tag_id: 24, tag_name: 'Prefers to be only pet', tag_category: 'compatibility' },
  { tag_id: 25, tag_name: 'Requires Company', tag_category: 'compatibility' },
];

/* One question per step, mirroring the signup flow layout. */
const STEPS = [
  { key: 'title', heading: 'Name your listing', subtext: 'A short title helps adopters spot your pet.' },
  { key: 'type', heading: 'What type of pet?', subtext: 'Pick the category that fits best.' },
  { key: 'sex', heading: 'Male or female?', subtext: 'Let adopters know your pet\'s sex.' },
  { key: 'location', heading: 'Where are they?', subtext: 'Your city and area help nearby adopters find them.' },
  { key: 'contact', heading: 'How can adopters reach you?', subtext: 'We\'ll show this so people can contact you.' },
  { key: 'age', heading: 'How old are they?', subtext: 'An approximate age is fine.' },
  { key: 'details', heading: 'Breed & health', subtext: 'Share the breed and any health notes. Optional.' },
  { key: 'tags', heading: 'What are they like?', subtext: 'Select the traits that describe your pet.' },
  { key: 'description', heading: 'Tell their story', subtext: 'Habits, favourite toys, anything special.' },
  { key: 'photos', heading: 'Add photos', subtext: 'A clear photo makes all the difference. Up to 5.' },
] as const;

const TOTAL_STEPS = STEPS.length;

function CreatePetScreen() {
  const router = useRouter();
  const { cities, categories, fetchMetadata, createPet, isLoading } = usePetStore(
    useShallow((state) => ({
      cities: state.cities,
      categories: state.categories,
      fetchMetadata: state.fetchMetadata,
      createPet: state.createPet,
      isLoading: state.isLoading,
    }))
  );

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    petType: '',
    sex: 'male',
    cityId: '',
    area: '',
    contactNumber: '',
    years: '',
    months: '',
    breed: '',
    healthIssues: '',
    description: '',
    selectedTags: [] as number[],
  });
  const [images, setImages] = useState<any[]>([]);

  useEffect(() => {
    fetchMetadata().catch(() => {});
  }, []);

  const set = (patch: Partial<typeof formData>) => setFormData((prev) => ({ ...prev, ...patch }));

  const toggleTag = (id: number) =>
    setFormData((prev) => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(id)
        ? prev.selectedTags.filter((t) => t !== id)
        : [...prev.selectedTags, id],
    }));

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 5,
        quality: 0.7,
      });
      if (!result.canceled && result.assets) {
        const selected = result.assets.map((a) => ({
          uri: a.uri,
          type: 'image/jpeg',
          name: a.fileName || `pet_${Date.now()}.jpg`,
        }));
        setImages((prev) => [...prev, ...selected].slice(0, 5));
      }
    } catch (error) {
      console.error('Pick Image Error:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const validateStep = (): boolean => {
    const key = STEPS[step].key;
    switch (key) {
      case 'title':
        if (!formData.title.trim()) {
          Alert.alert('Required', 'Please add a listing title.');
          return false;
        }
        return true;
      case 'type':
        if (!formData.petType) {
          Alert.alert('Required', 'Please select a pet type.');
          return false;
        }
        return true;
      case 'location':
        if (!formData.cityId) {
          Alert.alert('Required', 'Please select a city.');
          return false;
        }
        return true;
      case 'contact':
        if (!formData.contactNumber.trim()) {
          Alert.alert('Required', 'Please add a contact number.');
          return false;
        }
        return true;
      case 'age':
        if (!formData.years && !formData.months) {
          Alert.alert('Required', 'Please provide an approximate age.');
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
    } else {
      router.replace('/(app)/pets');
    }
  };

  const handleSubmit = async () => {
    if (images.length === 0) {
      Alert.alert('Required', 'Please add at least one photo of the pet.');
      return;
    }
    try {
      const payload = {
        pet_name: formData.title,
        pet_type: Number(formData.petType),
        pet_breed: formData.breed || null,
        city_id: Number(formData.cityId),
        area: formData.area,
        age_months: Number(formData.years || 0) * 12 + Number(formData.months || 0),
        contact_number: `+92${formData.contactNumber.replace(/^0/, '')}`,
        description: formData.description,
        sex: formData.sex,
        tags: formData.selectedTags,
        health_issues: formData.healthIssues || null,
        vaccinated: formData.selectedTags.includes(17),
        neutered: formData.selectedTags.includes(18),
        adoption_status: 'available',
        listing_type: 'adoption',
      };
      await createPet(payload, images);
      setSubmitted(true);
    } catch {
      Alert.alert('Error', 'Launch failed. Check your data.');
    }
  };

  const categoryOptions = (categories || []).map((c: any) => ({
    label: c.category_name || c.name,
    value: (c.category_id || c.id).toString(),
  }));
  const cityOptions = (cities || []).map((c: any) => ({
    label: c.city_name || c.name,
    value: (c.city_id || c.id).toString(),
  }));

  const { heading, subtext, key } = STEPS[step];
  const isLast = step === TOTAL_STEPS - 1;

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.successBody}>
          <View style={styles.successIcon}>
            <Ionicons name="paw" size={40} color="#a03048" />
          </View>
          <Text style={styles.successTitle}>Listing sent for review</Text>
          <Text style={styles.successText}>
            Thanks for opening your heart! Your pet is now with our team for a quick review. Once it's
            approved, the listing goes live in the adoption feed for adopters to discover.
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

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>{heading}</Text>
          <Text style={styles.subtext}>{subtext}</Text>

          {/* ── Title ── */}
          {key === 'title' && (
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(t) => set({ title: t })}
              placeholder="e.g. Energetic Husky Mix"
              placeholderTextColor="#B0B7C3"
              autoFocus
              returnKeyType="next"
              onSubmitEditing={handleNext}
            />
          )}

          {/* ── Pet type ── */}
          {key === 'type' && (
            <PickerField
              placeholder="Select pet type"
              value={formData.petType}
              options={categoryOptions}
              onSelect={(v) => set({ petType: v })}
              icon="paw-outline"
            />
          )}

          {/* ── Sex ── */}
          {key === 'sex' && (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {(['male', 'female'] as const).map((sVal) => {
                const active = formData.sex === sVal;
                return (
                  <TouchableOpacity
                    key={sVal}
                    activeOpacity={0.8}
                    onPress={() => set({ sex: sVal })}
                    style={[styles.sexCard, active && styles.sexCardActive]}
                  >
                    <Ionicons
                      name={sVal === 'male' ? 'male' : 'female'}
                      size={26}
                      color={active ? '#a03048' : '#C98A97'}
                    />
                    <Text style={[styles.sexText, active && styles.sexTextActive]}>{sVal}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Location (city + area) ── */}
          {key === 'location' && (
            <View style={{ gap: 16 }}>
              <View>
                <Text style={styles.label}>City *</Text>
                <PickerField
                  placeholder="Select a city"
                  value={formData.cityId}
                  options={cityOptions}
                  onSelect={(v) => set({ cityId: v })}
                  icon="location-outline"
                />
              </View>
              <View>
                <Text style={styles.label}>Area</Text>
                <TextInput
                  style={styles.input}
                  value={formData.area}
                  onChangeText={(t) => set({ area: t })}
                  placeholder="e.g. DHA Phase 5"
                  placeholderTextColor="#B0B7C3"
                />
              </View>
            </View>
          )}

          {/* ── Contact ── */}
          {key === 'contact' && (
            <View style={styles.prefixRow}>
              <Text style={styles.prefix}>+92</Text>
              <TextInput
                style={styles.prefixInput}
                value={formData.contactNumber}
                onChangeText={(t) => set({ contactNumber: t })}
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

          {/* ── Age ── */}
          {key === 'age' && (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Years</Text>
                <TextInput
                  style={styles.input}
                  value={formData.years}
                  onChangeText={(t) => set({ years: t })}
                  placeholder="0"
                  placeholderTextColor="#B0B7C3"
                  keyboardType="number-pad"
                  autoFocus
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Months</Text>
                <TextInput
                  style={styles.input}
                  value={formData.months}
                  onChangeText={(t) => set({ months: t })}
                  placeholder="0"
                  placeholderTextColor="#B0B7C3"
                  keyboardType="number-pad"
                />
              </View>
            </View>
          )}

          {/* ── Breed & health ── */}
          {key === 'details' && (
            <View style={{ gap: 16 }}>
              <View>
                <Text style={styles.label}>Breed</Text>
                <TextInput
                  style={styles.input}
                  value={formData.breed}
                  onChangeText={(t) => set({ breed: t })}
                  placeholder="e.g. Persian"
                  placeholderTextColor="#B0B7C3"
                />
              </View>
              <View>
                <Text style={styles.label}>Health issues</Text>
                <TextInput
                  style={styles.input}
                  value={formData.healthIssues}
                  onChangeText={(t) => set({ healthIssues: t })}
                  placeholder="None / Minor"
                  placeholderTextColor="#B0B7C3"
                />
              </View>
            </View>
          )}

          {/* ── Tags ── */}
          {key === 'tags' && (
            <View style={{ gap: 20 }}>
              {['personality', 'lifestyle', 'compatibility', 'health'].map((cat) => (
                <View key={cat}>
                  <Text style={styles.tagCategoryTitle}>{cat}</Text>
                  <View style={styles.tagsWrapper}>
                    {PET_TAGS.filter((t) => t.tag_category === cat).map((tag) => {
                      const active = formData.selectedTags.includes(tag.tag_id);
                      return (
                        <TouchableOpacity
                          key={tag.tag_id}
                          onPress={() => toggleTag(tag.tag_id)}
                          style={[styles.tagBtn, active && styles.tagBtnActive]}
                        >
                          <Text style={[styles.tagBtnText, active && styles.tagBtnTextActive]}>
                            {tag.tag_name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Description ── */}
          {key === 'description' && (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(t) => set({ description: t })}
              placeholder="Tell us about their habits, favourite toys…"
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
              {images.length < 5 && (
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
            label={isLast ? 'Post Pet for Adoption' : 'Next'}
            successLabel={isLast ? 'Pet posted!' : undefined}
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
  label: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#6B7280',
    marginBottom: 8,
    letterSpacing: 0.3,
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

  // Sex selector
  sexCard: {
    flex: 1,
    height: 96,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sexCardActive: {
    borderColor: '#a03048',
    backgroundColor: '#FFFFFF',
  },
  sexText: {
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
    color: '#C98A97',
    textTransform: 'capitalize',
  },
  sexTextActive: {
    color: '#a03048',
  },

  // Tags
  tagCategoryTitle: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  tagBtnActive: {
    backgroundColor: '#a03048',
    borderColor: '#a03048',
  },
  tagBtnText: {
    fontSize: 13,
    fontFamily: 'DMSans_700Bold',
    color: '#C98A97',
  },
  tagBtnTextActive: {
    color: '#FFFFFF',
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

export default withFocusUnmount(CreatePetScreen);

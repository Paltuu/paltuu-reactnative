import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { usePetStore } from '../../src/stores/petStore';
import CustomInput from '../../src/components/common/CustomInput';
import PaltuuButton from '../../src/components/ui/PaltuuButton';

const { width } = Dimensions.get('window');

const PET_TAGS = [
  { tag_id: 1, tag_name: "Playful", tag_category: "personality" },
  { tag_id: 2, tag_name: "Calm", tag_category: "personality" },
  { tag_id: 3, tag_name: "Affectionate", tag_category: "personality" },
  { tag_id: 4, tag_name: "Independent", tag_category: "personality" },
  { tag_id: 5, tag_name: "Vocal", tag_category: "personality" },
  { tag_id: 6, tag_name: "Gentle", tag_category: "personality" },
  { tag_id: 7, tag_name: "Energetic", tag_category: "personality" },
  { tag_id: 8, tag_name: "Shy", tag_category: "personality" },
  { tag_id: 9, tag_name: "Confident", tag_category: "personality" },
  { tag_id: 10, tag_name: "Curious", tag_category: "personality" },
  { tag_id: 11, tag_name: "Good with kids", tag_category: "lifestyle" },
  { tag_id: 12, tag_name: "Apartment friendly", tag_category: "lifestyle" },
  { tag_id: 13, tag_name: "Needs outdoor space", tag_category: "lifestyle" },
  { tag_id: 14, tag_name: "Low maintenance", tag_category: "lifestyle" },
  { tag_id: 15, tag_name: "Lap cat/dog", tag_category: "lifestyle" },
  { tag_id: 16, tag_name: "Active lifestyle", tag_category: "lifestyle" },
  { tag_id: 17, tag_name: "Vaccinated", tag_category: "health" },
  { tag_id: 18, tag_name: "Neutered/Spayed", tag_category: "health" },
  { tag_id: 19, tag_name: "Special needs", tag_category: "health" },
  { tag_id: 20, tag_name: "Senior pet", tag_category: "health" },
  { tag_id: 21, tag_name: "Good with dogs", tag_category: "compatibility" },
  { tag_id: 22, tag_name: "Good with cats", tag_category: "compatibility" },
  { tag_id: 23, tag_name: "Good with other pets", tag_category: "compatibility" },
  { tag_id: 24, tag_name: "Prefers to be only pet", tag_category: "compatibility" },
  { tag_id: 25, tag_name: "Requires Company", tag_category: "compatibility" },
];

function PremiumDropdown({ label, value, options, onSelect, icon }: any) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o: any) => o.value === value);

  return (
    <>
      <View style={s.fieldContainer}>
        <Text style={[s.fieldLabel, open && { color: '#a03048' }]}>{label}</Text>
        <TouchableOpacity
          style={[s.dropdownTrigger, open && s.dropdownTriggerActive]}
          onPress={() => setOpen(true)}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            {icon && (
              <Ionicons name={icon} size={18} color={selected ? '#a03048' : '#9CA3AF'} />
            )}
            <Text style={[s.dropdownText, selected && s.dropdownTextSelected]}>
              {selected ? selected.label : `Select ${label}`}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="slide">
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    s.modalOption,
                    item.value === value && s.modalOptionSelected,
                  ]}
                  onPress={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      s.modalOptionText,
                      item.value === value && s.modalOptionTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && <Ionicons name="checkmark-circle" size={20} color="#a03048" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function CreatePetScreen() {
  const router = useRouter();
  const { cities, categories, fetchMetadata, createPet, isLoading } = usePetStore();

  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    title: '',
    petType: '',
    cityId: '',
    area: '',
    sex: 'male',
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

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.title || !formData.petType || !formData.cityId || !formData.contactNumber) {
        return Alert.alert('Required', 'Please fill all essential fields');
      }
    } else if (currentStep === 2) {
      if (!formData.years && !formData.months) {
        return Alert.alert('Required', 'Please provide an approximate age');
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const toggleTag = (id: number) => {
    setFormData(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(id)
        ? prev.selectedTags.filter(t => t !== id)
        : [...prev.selectedTags, id]
    }));
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
        setImages([...images, ...selected]);
      }
    } catch (error) {
      console.error('Pick Image Error:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const handleSubmit = async () => {
    if (images.length === 0) {
      return Alert.alert('Required', 'Please add at least one picture of the pet.');
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
      Alert.alert('Success', 'Listing launched!', [{ text: 'OK', onPress: () => router.replace('/(app)/pets') }]);
    } catch {
      Alert.alert('Error', 'Launch failed. Check your data.');
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 1, label: 'Essentials' },
      { id: 2, label: 'Attributes' },
      { id: 3, label: 'Gallery' },
    ];
    return (
      <View style={s.stepContainer}>
        <View style={s.stepRow}>
          {steps.map((sItem, i) => (
            <View key={sItem.id} style={s.stepItem}>
              <View style={[s.stepCircle, currentStep >= sItem.id ? s.stepCircleActive : s.stepCircleInactive]}>
                <Text style={[s.stepNumber, currentStep >= sItem.id ? s.stepNumberActive : s.stepNumberInactive]}>
                  {sItem.id}
                </Text>
              </View>
              <Text style={[s.stepText, currentStep >= sItem.id ? s.stepTextActive : s.stepTextInactive]}>
                {sItem.label}
              </Text>
            </View>
          ))}
          {/* Connector Line */}
          <View style={s.stepLineBase} />
          <View
            style={[
              s.stepLineActive,
              currentStep === 1 && { width: 0 },
              currentStep === 2 && { right: '50%' },
              currentStep === 3 && { right: 22 }
            ]}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => currentStep > 1 ? prevStep() : router.back()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>
            {currentStep === 3 ? 'Finalize' : 'Post a Pet'}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {renderStepIndicator()}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {currentStep === 1 && (
            <View style={{ gap: 20 }}>
              <View style={s.stepHeaderSection}>
                <Text style={s.stepMainTitle}>The Essentials</Text>
                <Text style={s.stepSubTitle}>Start with the fundamental details</Text>
              </View>

              <CustomInput
                label="Listing Title *"
                placeholder="e.g. Energetic Husky Mix"
                value={formData.title}
                onChangeText={t => setFormData({ ...formData, title: t })}
                leftIcon="bookmark-outline"
              />

              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <PremiumDropdown
                    label="Pet Type"
                    value={formData.petType}
                    options={(categories || []).map((c: any) => ({ label: c.category_name || c.name, value: (c.category_id || c.id).toString() }))}
                    onSelect={(v: any) => setFormData({ ...formData, petType: v })}
                    icon="paw-outline"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Sex *</Text>
                  <View style={s.row}>
                    {['male', 'female'].map(sVal => (
                      <TouchableOpacity
                        key={sVal}
                        onPress={() => setFormData({ ...formData, sex: sVal })}
                        style={[
                          s.genderBtn,
                          formData.sex === sVal && s.genderBtnActive
                        ]}
                      >
                        <Text style={[s.genderBtnText, formData.sex === sVal && s.genderBtnTextActive]}>
                          {sVal}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <PremiumDropdown
                    label="City"
                    value={formData.cityId}
                    options={(cities || []).map((c: any) => ({ label: c.city_name || c.name, value: (c.city_id || c.id).toString() }))}
                    onSelect={(v: any) => setFormData({ ...formData, cityId: v })}
                    icon="location-outline"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <CustomInput
                    label="Area *"
                    placeholder="e.g. DHA"
                    value={formData.area}
                    onChangeText={t => setFormData({ ...formData, area: t })}
                    leftIcon="map-outline"
                  />
                </View>
              </View>

              <CustomInput
                label="Contact Phone *"
                placeholder="300 1234567"
                keyboardType="number-pad"
                maxLength={11}
                value={formData.contactNumber}
                onChangeText={t => setFormData({ ...formData, contactNumber: t })}
                leftIcon="call-outline"
                prefix="+92"
              />
            </View>
          )}

          {currentStep === 2 && (
            <View style={{ gap: 20 }}>
              <View style={s.stepHeaderSection}>
                <Text style={s.stepMainTitle}>Traits & Behavior</Text>
                <Text style={s.stepSubTitle}>Describe their unique personality</Text>
              </View>

              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <CustomInput
                    label="Age (Years)"
                    placeholder="0"
                    keyboardType="number-pad"
                    value={formData.years}
                    onChangeText={t => setFormData({ ...formData, years: t })}
                    leftIcon="calendar-outline"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <CustomInput
                    label="Age (Months)"
                    placeholder="0"
                    keyboardType="number-pad"
                    value={formData.months}
                    onChangeText={t => setFormData({ ...formData, months: t })}
                    leftIcon="time-outline"
                  />
                </View>
              </View>

              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <CustomInput
                    label="Breed"
                    placeholder="e.g. Persian"
                    value={formData.breed}
                    onChangeText={t => setFormData({ ...formData, breed: t })}
                    leftIcon="git-branch-outline"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <CustomInput
                    label="Health Issues"
                    placeholder="None / Minor"
                    value={formData.healthIssues}
                    onChangeText={t => setFormData({ ...formData, healthIssues: t })}
                    leftIcon="medkit-outline"
                  />
                </View>
              </View>

              <View style={{ marginTop: 16 }}>
                <Text style={s.tagsHeader}>Select tags that apply</Text>
                {['personality', 'lifestyle', 'compatibility', 'health'].map(cat => (
                  <View key={cat} style={{ marginTop: 16 }}>
                    <Text style={s.tagCategoryTitle}>{cat}</Text>
                    <View style={s.tagsWrapper}>
                      {PET_TAGS.filter(t => t.tag_category === cat).map(tag => {
                        const isSelected = formData.selectedTags.includes(tag.tag_id);
                        return (
                          <TouchableOpacity
                            key={tag.tag_id}
                            onPress={() => toggleTag(tag.tag_id)}
                            style={[s.tagBtn, isSelected && s.tagBtnActive]}
                          >
                            <Text style={[s.tagBtnText, isSelected && s.tagBtnTextActive]}>
                              {tag.tag_name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {currentStep === 3 && (
            <View style={{ gap: 20 }}>
              <View style={s.stepHeaderSection}>
                <Text style={s.stepMainTitle}>Final Details</Text>
                <Text style={s.stepSubTitle}>Add photos and a short description</Text>
              </View>

              <CustomInput
                label="The Story / Description"
                placeholder="Tell us about their habits, favorite toys..."
                multiline
                numberOfLines={4}
                value={formData.description}
                onChangeText={t => setFormData({ ...formData, description: t })}
                leftIcon="pencil-outline"
              />

              <View style={s.galleryContainer}>
                <Text style={s.galleryTitle}>Photos Gallery (Max 5)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                  {images.map((img, i) => (
                    <View key={i} style={s.galleryImageWrapper}>
                      <Image source={{ uri: img.uri }} style={{ width: 80, height: 80, borderRadius: 14 }} contentFit="cover" />
                      <TouchableOpacity
                        style={s.galleryRemoveBtn}
                        onPress={() => setImages(images.filter((_, idx) => idx !== i))}
                      >
                        <Ionicons name="close-circle" size={22} color="#FF4B4B" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {images.length < 5 && (
                    <TouchableOpacity style={s.galleryAddBtn} onPress={pickImage}>
                      <Ionicons name="add" size={28} color="#a03048" />
                      <Text style={s.galleryAddText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            </View>
          )}

          {/* Navigation */}
          <View style={s.navRow}>
            <View style={{ flex: 1 }}>
              <PaltuuButton
                label={currentStep === 3 ? 'Launch Listing' : 'Continue'}
                successLabel={currentStep === 3 ? 'Listed!' : undefined}
                onPress={currentStep === 3 ? handleSubmit : nextStep}
                loading={isLoading}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'DMSans_700Bold',
    color: '#111827',
  },
  scrollContent: { padding: 20, paddingTop: 20, paddingBottom: 80 },

  // Steps indicator
  stepContainer: {
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
    backgroundColor: '#FFFFFF',
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  },
  stepItem: {
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
  },
  stepCircle: {
    width: 28, height: 28,
    borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: '#a03048',
  },
  stepCircleInactive: {
    backgroundColor: '#F3F4F6',
  },
  stepNumber: {
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepNumberInactive: {
    color: '#9CA3AF',
  },
  stepText: {
    fontSize: 10,
    fontFamily: 'Montserrat_600SemiBold',
  },
  stepTextActive: {
    color: '#a03048',
  },
  stepTextInactive: {
    color: '#9CA3AF',
  },
  stepLineBase: {
    position: 'absolute',
    left: 22, right: 22,
    height: 2,
    backgroundColor: '#F3F4F6',
    top: 14,
    zIndex: 0,
  },
  stepLineActive: {
    position: 'absolute',
    left: 22,
    height: 2,
    backgroundColor: '#a03048',
    top: 14,
    zIndex: 1,
  },

  // Step Header
  stepHeaderSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  stepMainTitle: {
    fontSize: 22,
    fontFamily: 'DMSans_700Bold',
    color: '#111827',
    marginBottom: 4,
  },
  stepSubTitle: {
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    color: '#9CA3AF',
  },

  row: { flexDirection: 'row', gap: 12 },

  // Sex selector
  fieldLabel: {
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#6B7280',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  genderBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    alignItems: 'center', justifyContent: 'center',
  },
  genderBtnActive: {
    borderColor: '#a03048',
    backgroundColor: '#FAF0F2',
  },
  genderBtnText: {
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    color: '#9CA3AF',
    textTransform: 'capitalize',
  },
  genderBtnTextActive: {
    color: '#a03048',
  },

  // Dropdown Field
  fieldContainer: {
    marginBottom: 0,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  dropdownTriggerActive: {
    borderColor: '#a03048',
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#B0B7C3',
  },
  dropdownTextSelected: {
    color: '#111827',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: '#111827',
  },
  modalCloseBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  modalOptionSelected: {
    backgroundColor: '#FAF0F2',
  },
  modalOptionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#374151',
  },
  modalOptionTextActive: {
    fontFamily: 'DMSans_700Bold',
    color: '#a03048',
  },

  // Tags Section
  tagsHeader: {
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagCategoryTitle: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tagBtnActive: {
    backgroundColor: '#a03048',
    borderColor: '#a03048',
  },
  tagBtnText: {
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
    color: '#6B7280',
  },
  tagBtnTextActive: {
    color: '#FFFFFF',
  },

  // Gallery
  galleryContainer: {
    marginTop: 8,
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  galleryTitle: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  galleryImageWrapper: {
    position: 'relative',
    marginRight: 4,
  },
  galleryImage: {
    width: 80, height: 80,
    borderRadius: 14,
  },
  galleryRemoveBtn: {
    position: 'absolute',
    top: -6, right: -6,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
  },
  galleryAddBtn: {
    width: 80, height: 80,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#a03048',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FAF0F2',
  },
  galleryAddText: {
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    color: '#a03048',
    textTransform: 'uppercase',
    marginTop: 2,
  },

  // Navigation
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    alignItems: 'center',
  },
  backNavBtn: {
    paddingHorizontal: 24,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  backNavText: {
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    color: '#4B5563',
  },
});

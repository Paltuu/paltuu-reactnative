import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { usePetStore } from '../../src/stores/petStore';

const { width } = Dimensions.get('window');

/* ───────────────────────────────────────────────
   Constants from Web App
   ─────────────────────────────────────────────── */
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

/* ───────────────────────────────────────────────
   Custom Components
   ─────────────────────────────────────────────── */
function Dropdown({ label, value, options, onSelect }: any) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o: any) => o.value === value);

  return (
    <>
      <TouchableOpacity style={dStyles.trigger} onPress={() => setOpen(true)}>
        <Text style={selected ? dStyles.triggerText : dStyles.placeholder}>
          {selected ? selected.label : label}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#999" />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide">
        <TouchableOpacity style={dStyles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={dStyles.sheet}>
            <Text style={dStyles.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[dStyles.option, item.value === value && dStyles.optionSelected]}
                  onPress={() => { onSelect(item.value); setOpen(false); }}
                >
                  <Text style={[dStyles.optionText, item.value === value && dStyles.optionTextSelected]}>{item.label}</Text>
                  {item.value === value && <Ionicons name="checkmark" size={20} color="#a03048" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

/* ───────────────────────────────────────────────
   Main Screen
   ─────────────────────────────────────────────── */
export default function CreatePetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cities, categories, fetchMetadata, createPet, isLoading } = usePetStore();

  const [currentStep, setCurrentStep] = useState(1);
  const scrollX = useRef(new Animated.Value(0)).current;

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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.7,
    });
    if (!result.canceled) {
      const selected = result.assets.map((a) => ({
        uri: a.uri,
        type: 'image/jpeg',
        name: a.fileName || `pet_${Date.now()}.jpg`,
      }));
      setImages([...images, ...selected]);
    }
  };

  const handleSubmit = async () => {
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
      <View style={styles.indicatorWrap}>
        <View style={styles.indicatorRow}>
          {steps.map((s, i) => (
            <View key={s.id} style={styles.stepItem}>
              <View style={[styles.stepCircle, currentStep >= s.id && styles.stepCircleActive]}>
                <Text style={[styles.stepNumber, currentStep >= s.id && styles.stepNumberActive]}>{s.id}</Text>
              </View>
              <Text style={[styles.stepLabel, currentStep >= s.id && styles.stepLabelActive]}>{s.label}</Text>
              {i < 2 && <View style={[styles.stepLine, currentStep > s.id && styles.stepLineActive]} />}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 60 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => currentStep > 1 ? prevStep() : router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{currentStep === 3 ? 'Finalize' : 'Post a Pet'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {renderStepIndicator()}

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {currentStep === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionHeading}>The Essentials</Text>
            <Text style={styles.sectionSub}>Start with the fundamental details</Text>

            <Text style={styles.label}>Listing Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Energetic Husky Mix"
              value={formData.title}
              onChangeText={t => setFormData({ ...formData, title: t })}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Pet Type *</Text>
                <Dropdown
                  label="Select Type"
                  value={formData.petType}
                  options={(categories || []).map((c: any) => ({ label: c.category_name || c.name, value: (c.category_id || c.id).toString() }))}
                  onSelect={(v: any) => setFormData({ ...formData, petType: v })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Sex *</Text>
                <View style={styles.sexRow}>
                  {['male', 'female'].map(s => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setFormData({ ...formData, sex: s })}
                      style={[styles.sexBtn, formData.sex === s && styles.sexBtnActive]}
                    >
                      <Text style={[styles.sexBtnText, formData.sex === s && styles.sexBtnTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>City *</Text>
                <Dropdown
                  label="Select City"
                  value={formData.cityId}
                  options={(cities || []).map((c: any) => ({ label: c.city_name || c.name, value: (c.city_id || c.id).toString() }))}
                  onSelect={(v: any) => setFormData({ ...formData, cityId: v })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Area *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. DHA"
                  value={formData.area}
                  onChangeText={t => setFormData({ ...formData, area: t })}
                />
              </View>
            </View>

            <Text style={styles.label}>Contact Phone *</Text>
            <View style={styles.phoneInputWrap}>
              <Text style={styles.phonePrefix}>+92</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="300 1234567"
                keyboardType="number-pad"
                maxLength={11}
                value={formData.contactNumber}
                onChangeText={t => setFormData({ ...formData, contactNumber: t })}
              />
            </View>
          </View>
        )}

        {currentStep === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionHeading}>Traits & Behavior</Text>
            <Text style={styles.sectionSub}>Describe their unique personality</Text>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Years</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="number-pad"
                  value={formData.years}
                  onChangeText={t => setFormData({ ...formData, years: t })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Months</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="number-pad"
                  value={formData.months}
                  onChangeText={t => setFormData({ ...formData, months: t })}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Breed</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Persian"
                  value={formData.breed}
                  onChangeText={t => setFormData({ ...formData, breed: t })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Health Issues</Text>
                <TextInput
                  style={styles.input}
                  placeholder="None / Minor"
                  value={formData.healthIssues}
                  onChangeText={t => setFormData({ ...formData, healthIssues: t })}
                />
              </View>
            </View>

            <Text style={styles.tagSectionTitle}>SELECT ALL THAT APPLY</Text>
            {['personality', 'lifestyle', 'compatibility', 'health'].map(cat => (
              <View key={cat} style={styles.tagCat}>
                <Text style={styles.tagCatLabel}>{cat.toUpperCase()}</Text>
                <View style={styles.tagGrid}>
                  {PET_TAGS.filter(t => t.tag_category === cat).map(tag => (
                    <TouchableOpacity
                      key={tag.tag_id}
                      onPress={() => toggleTag(tag.tag_id)}
                      style={[styles.tagBtn, formData.selectedTags.includes(tag.tag_id) && styles.tagBtnActive]}
                    >
                      <Text style={[styles.tagText, formData.selectedTags.includes(tag.tag_id) && styles.tagTextActive]}>
                        {tag.tag_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {currentStep === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionHeading}>Final Details</Text>
            <Text style={styles.sectionSub}>Add photos and a short description</Text>

            <Text style={styles.label}>The Story</Text>
            <TextInput
              style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
              placeholder="Tell us about their habits, favorite toys..."
              multiline
              value={formData.description}
              onChangeText={t => setFormData({ ...formData, description: t })}
            />

            <View style={styles.galleryCard}>
              <Text style={styles.galleryTitle}>PHOTOS GALLERY (MAX 5)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 20 }}>
                {images.map((img, i) => (
                  <View key={i} style={styles.imgWrap}>
                    <Image source={{ uri: img.uri }} style={styles.img} />
                    <TouchableOpacity style={styles.imgRemove} onPress={() => setImages(images.filter((_, idx) => idx !== i))}>
                      <Ionicons name="close-circle" size={22} color="#FF4B4B" />
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length < 5 && (
                  <TouchableOpacity style={styles.imgAdd} onPress={pickImage}>
                    <Ionicons name="add" size={32} color="#a03048" />
                    <Text style={{ fontSize: 10, fontWeight: '900', color: '#a03048' }}>ADD</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Navigation Buttons */}
        <View style={styles.btnRow}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backBtn} onPress={prevStep}>
              <Text style={styles.backBtnText}>Return</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.nextBtn, currentStep === 1 && { flex: 1 }, isLoading && { opacity: 0.7 }]} 
            onPress={currentStep === 3 ? handleSubmit : nextStep}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextBtnText}>{currentStep === 3 ? 'Launch Listing' : currentStep === 2 ? 'Almost Done' : 'Next Component'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const dStyles = StyleSheet.create({
  trigger: { backgroundColor: '#F9F9F9', borderRadius: 15, padding: 16, borderWidth: 1, borderColor: '#EEE', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  triggerText: { fontSize: 16, color: '#000', fontWeight: '600' },
  placeholder: { fontSize: 16, color: '#AAA' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '60%', paddingBottom: 40 },
  sheetTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F8F8F8' },
  optionSelected: { backgroundColor: '#FFF0F3' },
  optionText: { fontSize: 16, color: '#333' },
  optionTextSelected: { color: '#a03048', fontWeight: '700' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  scroll: { paddingHorizontal: 25 },
  indicatorWrap: { marginBottom: 30, paddingHorizontal: 40 },
  indicatorRow: { flexDirection: 'row', justifyContent: 'space-between', position: 'relative' },
  stepItem: { alignItems: 'center', zIndex: 2 },
  stepCircle: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  stepCircleActive: { backgroundColor: '#a03048' },
  stepNumber: { fontSize: 14, fontWeight: '900', color: '#999' },
  stepNumberActive: { color: '#fff' },
  stepLabel: { fontSize: 10, fontWeight: '700', color: '#ccc', textTransform: 'uppercase' },
  stepLabelActive: { color: '#a03048' },
  stepLine: { position: 'absolute', height: 2, width: width / 3, backgroundColor: '#f0f0f0', top: 16, left: 24, zIndex: -1 },
  stepLineActive: { backgroundColor: '#a03048' },
  stepContainer: { flex: 1 },
  sectionHeading: { fontSize: 32, fontWeight: '900', color: '#1a1a1a', textAlign: 'center' },
  sectionSub: { fontSize: 16, fontWeight: '500', color: '#888', textAlign: 'center', marginBottom: 40 },
  label: { fontSize: 11, fontWeight: '900', color: '#AAA', marginTop: 24, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: '#F9F9F9', borderRadius: 20, padding: 18, fontSize: 16, borderWidth: 1, borderColor: '#EEE', color: '#000', fontWeight: '500' },
  row: { flexDirection: 'row' },
  sexRow: { flexDirection: 'row', gap: 10 },
  sexBtn: { flex: 1, paddingVertical: 16, borderRadius: 15, backgroundColor: '#F9F9F9', alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  sexBtnActive: { backgroundColor: '#FFF0F3', borderColor: '#a03048' },
  sexBtnText: { fontSize: 14, fontWeight: '700', color: '#999', textTransform: 'capitalize' },
  sexBtnTextActive: { color: '#a03048' },
  phoneInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', borderRadius: 20, paddingHorizontal: 18, borderWidth: 1, borderColor: '#EEE' },
  phonePrefix: { fontSize: 16, fontWeight: '800', color: '#AAA', marginRight: 10 },
  phoneInput: { flex: 1, paddingVertical: 18, fontSize: 16, color: '#000', fontWeight: '700' },
  tagSectionTitle: { fontSize: 10, fontWeight: '900', color: '#DDD', textAlign: 'center', marginTop: 40, letterSpacing: 2 },
  tagCat: { marginTop: 30 },
  tagCatLabel: { fontSize: 10, fontWeight: '900', color: '#a03048', opacity: 0.5, marginBottom: 15, letterSpacing: 2 },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 2, borderColor: '#f0f0f0' },
  tagBtnActive: { backgroundColor: '#a03048', borderColor: '#a03048', shadowColor: '#a03048', shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
  tagText: { fontSize: 12, fontWeight: '700', color: '#999' },
  tagTextActive: { color: '#fff' },
  galleryCard: { marginTop: 40, backgroundColor: '#FAFAFA', borderRadius: 30, padding: 30, borderStyle: 'dashed', borderWidth: 2, borderColor: '#EEE' },
  galleryTitle: { fontSize: 10, fontWeight: '900', color: '#AAA', textAlign: 'center', letterSpacing: 2 },
  imgWrap: { marginRight: 15, position: 'relative' },
  img: { width: 90, height: 90, borderRadius: 20 },
  imgRemove: { position: 'absolute', top: -5, right: -5, backgroundColor: '#fff', borderRadius: 10 },
  imgAdd: { width: 90, height: 90, borderRadius: 20, backgroundColor: '#fff', borderStyle: 'dashed', borderWidth: 2, borderColor: '#a03048', alignItems: 'center', justifyContent: 'center' },
  btnRow: { flexDirection: 'row', gap: 15, marginTop: 50, marginBottom: 100 },
  backBtn: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, padding: 20, alignItems: 'center' },
  backBtnText: { color: '#999', fontSize: 16, fontWeight: '800' },
  nextBtn: { flex: 2, backgroundColor: '#1a1a1a', borderRadius: 20, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
      <TouchableOpacity 
        className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex-row justify-between items-center" 
        onPress={() => setOpen(true)}
      >
        <Text className={`text-base ${selected ? 'text-black font-semibold' : 'text-gray-400'}`}>
          {selected ? selected.label : label}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#999" />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide">
        <TouchableOpacity 
          className="flex-1 bg-black/40 justify-end" 
          activeOpacity={1} 
          onPress={() => setOpen(false)}
        >
          <View className="bg-white rounded-t-[30px] max-h-[60%] pb-10">
            <Text className="text-lg font-black text-center py-5 border-b border-gray-50">{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className={`flex-row justify-between items-center px-6 py-4 border-b border-gray-50 ${item.value === value ? 'bg-primary/5' : ''}`}
                  onPress={() => { onSelect(item.value); setOpen(false); }}
                >
                  <Text className={`text-base ${item.value === value ? 'text-primary font-bold' : 'text-gray-700'}`}>{item.label}</Text>
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
        setImages([...images, ...selected]);
      }
    } catch (error) {
      console.error('Pick Image Error:', error);
      Alert.alert('Error', 'Failed to pick images');
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
      <View className="mb-8 px-10">
        <View className="flex-row justify-between relative">
          {steps.map((s, i) => (
            <View key={s.id} className="items-center z-10">
              <View className={`w-8 h-8 rounded-xl items-center justify-center mb-1.5 ${currentStep >= s.id ? 'bg-primary' : 'bg-gray-100'}`}>
                <Text className={`text-sm font-black ${currentStep >= s.id ? 'text-white' : 'text-gray-400'}`}>{s.id}</Text>
              </View>
              <Text className={`text-[10px] font-bold uppercase ${currentStep >= s.id ? 'text-primary' : 'text-gray-300'}`}>{s.label}</Text>
              {i < 2 && (
                <View className={`absolute h-[2px] bg-gray-100 top-4 left-6 z-[-1]`} style={{ width: width / 3 }} />
              )}
              {i < 2 && currentStep > s.id && (
                <View className={`absolute h-[2px] bg-primary top-4 left-6 z-[-1]`} style={{ width: width / 3 }} />
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top + 20 }}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 mb-5">
        <TouchableOpacity onPress={() => currentStep > 1 ? prevStep() : router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-gray-900">{currentStep === 3 ? 'Finalize' : 'Post a Pet'}</Text>
        <View className="w-6" />
      </View>

      {renderStepIndicator()}

      <ScrollView 
        className="flex-1 px-6" 
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {currentStep === 1 && (
          <View>
            <Text className="text-3xl font-black text-gray-900 text-center">The Essentials</Text>
            <Text className="text-base font-medium text-gray-400 text-center mb-10">Start with the fundamental details</Text>

            <Text className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-6 mb-2">Listing Title *</Text>
            <TextInput
              className="bg-gray-50 rounded-2xl p-4 text-base border border-gray-100 font-semibold"
              placeholder="e.g. Energetic Husky Mix"
              value={formData.title}
              onChangeText={t => setFormData({ ...formData, title: t })}
            />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-6 mb-2">Pet Type *</Text>
                <Dropdown
                  label="Select Type"
                  value={formData.petType}
                  options={(categories || []).map((c: any) => ({ label: c.category_name || c.name, value: (c.category_id || c.id).toString() }))}
                  onSelect={(v: any) => setFormData({ ...formData, petType: v })}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-6 mb-2">Sex *</Text>
                <View className="flex-row gap-2">
                  {['male', 'female'].map(s => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setFormData({ ...formData, sex: s })}
                      className={`flex-1 py-4 rounded-2xl items-center border ${formData.sex === s ? 'bg-primary/5 border-primary' : 'bg-gray-50 border-gray-100'}`}
                    >
                      <Text className={`text-sm font-bold capitalize ${formData.sex === s ? 'text-primary' : 'text-gray-400'}`}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-6 mb-2">City *</Text>
                <Dropdown
                  label="Select City"
                  value={formData.cityId}
                  options={(cities || []).map((c: any) => ({ label: c.city_name || c.name, value: (c.city_id || c.id).toString() }))}
                  onSelect={(v: any) => setFormData({ ...formData, cityId: v })}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-6 mb-2">Area *</Text>
                <TextInput
                  className="bg-gray-50 rounded-2xl p-4 text-base border border-gray-100 font-semibold"
                  placeholder="e.g. DHA"
                  value={formData.area}
                  onChangeText={t => setFormData({ ...formData, area: t })}
                />
              </View>
            </View>

            <Text className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-6 mb-2">Contact Phone *</Text>
            <View className="flex-row items-center bg-gray-50 rounded-2xl px-4 border border-gray-100">
              <Text className="text-base font-black text-gray-400 mr-2">+92</Text>
              <TextInput
                className="flex-1 py-4 text-base font-bold text-black"
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
          <View>
            <Text className="text-3xl font-black text-gray-900 text-center">Traits & Behavior</Text>
            <Text className="text-base font-medium text-gray-400 text-center mb-10">Describe their unique personality</Text>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Years</Text>
                <TextInput
                  className="bg-gray-50 rounded-2xl p-4 text-base border border-gray-100 font-bold text-center"
                  placeholder="0"
                  keyboardType="number-pad"
                  value={formData.years}
                  onChangeText={t => setFormData({ ...formData, years: t })}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Months</Text>
                <TextInput
                  className="bg-gray-50 rounded-2xl p-4 text-base border border-gray-100 font-bold text-center"
                  placeholder="0"
                  keyboardType="number-pad"
                  value={formData.months}
                  onChangeText={t => setFormData({ ...formData, months: t })}
                />
              </View>
            </View>

            <View className="flex-row gap-3 mt-4">
              <View className="flex-1">
                <Text className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Breed</Text>
                <TextInput
                  className="bg-gray-50 rounded-2xl p-4 text-base border border-gray-100 font-semibold"
                  placeholder="e.g. Persian"
                  value={formData.breed}
                  onChangeText={t => setFormData({ ...formData, breed: t })}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Health Issues</Text>
                <TextInput
                  className="bg-gray-50 rounded-2xl p-4 text-base border border-gray-100 font-semibold"
                  placeholder="None / Minor"
                  value={formData.healthIssues}
                  onChangeText={t => setFormData({ ...formData, healthIssues: t })}
                />
              </View>
            </View>

            <Text className="text-[10px] font-black text-gray-300 text-center mt-10 mb-4 uppercase tracking-[2px]">SELECT ALL THAT APPLY</Text>
            {['personality', 'lifestyle', 'compatibility', 'health'].map(cat => (
              <View key={cat} className="mt-6">
                <Text className="text-[10px] font-black text-primary/50 mb-3 uppercase tracking-widest">{cat}</Text>
                <View className="flex-row flex-wrap gap-2">
                  {PET_TAGS.filter(t => t.tag_category === cat).map(tag => (
                    <TouchableOpacity
                      key={tag.tag_id}
                      onPress={() => toggleTag(tag.tag_id)}
                      className={`px-4 py-2 rounded-xl border-2 ${formData.selectedTags.includes(tag.tag_id) ? 'bg-primary border-primary' : 'bg-white border-gray-100'}`}
                    >
                      <Text className={`text-xs font-bold ${formData.selectedTags.includes(tag.tag_id) ? 'text-white' : 'text-gray-400'}`}>
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
          <View>
            <Text className="text-3xl font-black text-gray-900 text-center">Final Details</Text>
            <Text className="text-base font-medium text-gray-400 text-center mb-10">Add photos and a short description</Text>

            <Text className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">The Story</Text>
            <TextInput
              className="bg-gray-50 rounded-3xl p-5 text-base border border-gray-100 min-h-[120px]"
              placeholder="Tell us about their habits, favorite toys..."
              multiline
              textAlignVertical="top"
              value={formData.description}
              onChangeText={t => setFormData({ ...formData, description: t })}
            />

            <View className="mt-10 bg-gray-50 rounded-[30px] p-8 border-2 border-dashed border-gray-100 items-center">
              <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-5">PHOTOS GALLERY (MAX 5)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {images.map((img, i) => (
                  <View key={i} className="mr-4 relative">
                    <Image source={{ uri: img.uri }} className="w-24 h-24 rounded-2xl" contentFit="cover" />
                    <TouchableOpacity 
                      className="absolute -top-2 -right-2 bg-white rounded-full" 
                      onPress={() => setImages(images.filter((_, idx) => idx !== i))}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF4B4B" />
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length < 5 && (
                  <TouchableOpacity 
                    className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-primary items-center justify-center" 
                    onPress={pickImage}
                  >
                    <Ionicons name="add" size={32} color="#a03048" />
                    <Text className="text-[10px] font-black uppercase text-primary">ADD</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Navigation Buttons */}
        <View className="flex-row gap-4 mt-12">
          {currentStep > 1 && (
            <TouchableOpacity className="flex-1 bg-gray-50 py-5 rounded-3xl items-center" onPress={prevStep}>
              <Text className="text-gray-400 text-base font-black">Return</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            className={`bg-[#1a1a1a] py-5 rounded-3xl items-center shadow-lg ${currentStep === 1 ? 'flex-1' : 'flex-[2]'} ${isLoading ? 'opacity-70' : ''}`} 
            onPress={currentStep === 3 ? handleSubmit : nextStep}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-black">
                {currentStep === 3 ? 'Launch Listing' : currentStep === 2 ? 'Almost Done' : 'Next Component'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

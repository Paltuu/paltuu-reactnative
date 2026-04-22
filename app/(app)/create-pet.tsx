import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Switch,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { usePetStore } from '../../src/stores/petStore';
import { Picker } from '@react-native-picker/picker'; // We might need to install this or use a custom one

export default function CreatePetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cities, categories, fetchMetadata, createPet, isLoading } = usePetStore();

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    petType: '',
    cityId: '',
    area: '',
    sex: 'male',
    contactNumber: '',
    years: '',
    months: '',
    description: '',
    vaccinated: false,
    neutered: false,
  });

  const [images, setImages] = useState<any[]>([]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
    });

    if (!result.canceled) {
      const selectedImages = result.assets.map(asset => ({
        uri: asset.uri,
        type: 'image/jpeg',
        name: asset.fileName || `image_${Date.now()}.jpg`
      }));
      setImages([...images, ...selectedImages]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.title || !formData.petType || !formData.cityId || !formData.contactNumber) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!formData.years && !formData.months) {
      Alert.alert('Error', 'Please enter the pet\'s age');
      return;
    }

    if (images.length === 0) {
      Alert.alert('Error', 'Please upload at least one image');
      return;
    }

    try {
      const petPayload = {
        pet_name: formData.title,
        pet_type: Number(formData.petType),
        city_id: Number(formData.cityId),
        area: formData.area,
        age_months: (Number(formData.years || 0) * 12) + Number(formData.months || 0),
        contact_number: formData.contactNumber,
        description: formData.description,
        sex: formData.sex,
        vaccinated: formData.vaccinated,
        neutered: formData.neutered,
        adoption_status: 'available',
        listing_type: 'individual', // Default for user listings
      };

      await createPet(petPayload, images);
      Alert.alert('Success', 'Pet listing created successfully!', [
        { text: 'OK', onPress: () => router.replace('/(app)/pets') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create listing. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 60 }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Post a Pet</Text>
        </View>

        {/* Images Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {images.map((img, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: img.uri }} style={styles.petImage} />
                <TouchableOpacity 
                  style={styles.removeImageBtn}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={20} color="#FF4B4B" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                <Ionicons name="camera-outline" size={32} color="#a03048" />
                <Text style={styles.addImageText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Friendly Golden Retriever for Adoption"
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.label}>Type *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.petType}
                  onValueChange={(val) => setFormData({ ...formData, petType: val })}
                >
                  <Picker.Item label="Select Type" value="" />
                  {categories.map(cat => (
                    <Picker.Item key={cat.category_id} label={cat.category_name} value={cat.category_id.toString()} />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Sex *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.sex}
                  onValueChange={(val) => setFormData({ ...formData, sex: val })}
                >
                  <Picker.Item label="Male" value="male" />
                  <Picker.Item label="Female" value="female" />
                  <Picker.Item label="Unknown" value="unknown" />
                </Picker>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.label}>City *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.cityId}
                  onValueChange={(val) => setFormData({ ...formData, cityId: val })}
                >
                  <Picker.Item label="Select City" value="" />
                  {cities.map(city => (
                    <Picker.Item key={city.city_id} label={city.city_name} value={city.city_id.toString()} />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Area</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. DHA Phase 5"
                value={formData.area}
                onChangeText={(text) => setFormData({ ...formData, area: text })}
              />
            </View>
          </View>
        </View>

        {/* Age & Contact */}
        <View style={styles.section}>
          <Text style={styles.label}>Age *</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 12 }]}
              placeholder="Years"
              keyboardType="numeric"
              value={formData.years}
              onChangeText={(text) => setFormData({ ...formData, years: text })}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Months"
              keyboardType="numeric"
              value={formData.months}
              onChangeText={(text) => setFormData({ ...formData, months: text })}
            />
          </View>

          <Text style={styles.label}>Contact Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="+92 3XX XXXXXXX"
            keyboardType="phone-pad"
            value={formData.contactNumber}
            onChangeText={(text) => setFormData({ ...formData, contactNumber: text })}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell us about the pet's personality, habits, and why they need a home..."
            multiline
            numberOfLines={4}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
          />
        </View>

        {/* Health */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Vaccinated</Text>
              <Text style={styles.switchSublabel}>Has the pet received all shots?</Text>
            </View>
            <Switch
              value={formData.vaccinated}
              onValueChange={(val) => setFormData({ ...formData, vaccinated: val })}
              trackColor={{ false: '#767577', true: '#a03048' }}
            />
          </View>
          
          <View style={[styles.switchRow, { marginTop: 16 }]}>
            <View>
              <Text style={styles.switchLabel}>Neutered / Spayed</Text>
              <Text style={styles.switchSublabel}>Is the pet medically fixed?</Text>
            </View>
            <Switch
              value={formData.neutered}
              onValueChange={(val) => setFormData({ ...formData, neutered: val })}
              trackColor={{ false: '#767577', true: '#a03048' }}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Listing</Text>
          )}
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  pickerContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
  },
  imageScroll: {
    flexDirection: 'row',
  },
  imageWrapper: {
    marginRight: 12,
    position: 'relative',
  },
  petImage: {
    width: 100,
    height: 100,
    borderRadius: 16,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  addImageBtn: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: '#fceef0',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#a03048',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: 12,
    color: '#a03048',
    marginTop: 4,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  switchSublabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: '#a03048',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#a03048',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

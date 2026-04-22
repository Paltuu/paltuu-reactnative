import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { usePetStore } from '../../src/stores/petStore';
import { Picker } from '@react-native-picker/picker';

export default function CreateLostFoundScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cities, categories, fetchMetadata, createLostFoundPost, isLoading } = usePetStore();

  const [activeTab, setActiveTab] = useState<'lost' | 'found'>('lost');
  
  const [formData, setFormData] = useState({
    categoryId: '',
    cityId: '',
    location: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    contactInfo: '',
  });

  const [images, setImages] = useState<any[]>([]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 3,
      quality: 0.8,
    });

    if (!result.canceled) {
      const selectedImages = result.assets.map(asset => ({
        uri: asset.uri,
        type: 'image/jpeg',
        name: asset.fileName || `lostfound_${Date.now()}.jpg`
      }));
      setImages([...images, ...selectedImages]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.categoryId || !formData.cityId || !formData.contactInfo) {
      Alert.alert('Error', 'Please fill in required fields (Category, City, Contact)');
      return;
    }

    try {
      const postPayload = {
        category_id: Number(formData.categoryId),
        city_id: Number(formData.cityId),
        location: formData.location,
        pet_description: formData.description,
        date: formData.date,
        contact_info: formData.contactInfo,
        post_type: activeTab,
        user_id: 47, // This should be dynamic based on auth
      };

      await createLostFoundPost(postPayload, images);
      Alert.alert('Success', `${activeTab === 'lost' ? 'Lost' : 'Found'} report submitted!`, [
        { text: 'OK', onPress: () => router.replace('/') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 60 }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Lost & Found</Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'lost' && styles.activeTab]} 
            onPress={() => setActiveTab('lost')}
          >
            <Text style={[styles.tabText, activeTab === 'lost' && styles.activeTabText]}>LOST</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'found' && styles.activeTab]} 
            onPress={() => setActiveTab('found')}
          >
            <Text style={[styles.tabText, activeTab === 'found' && styles.activeTabText]}>FOUND</Text>
          </TouchableOpacity>
        </View>

        {/* Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
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
            {images.length < 3 && (
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                <Ionicons name="camera-outline" size={32} color="#e76f51" />
                <Text style={[styles.addImageText, { color: '#e76f51' }]}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Form Fields */}
        <View style={styles.section}>
          <Text style={styles.label}>Pet Category *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.categoryId}
              onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
            >
              <Picker.Item label="Select Category" value="" />
              {categories.map(cat => (
                <Picker.Item key={cat.category_id} label={cat.category_name} value={cat.category_id.toString()} />
              ))}
            </Picker>
          </View>

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

          <Text style={styles.label}>Specific Location</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Near Hill Park, Block 6"
            value={formData.location}
            onChangeText={(text) => setFormData({ ...formData, location: text })}
          />

          <Text style={styles.label}>Contact Information *</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone number or WhatsApp"
            keyboardType="phone-pad"
            value={formData.contactInfo}
            onChangeText={(text) => setFormData({ ...formData, contactInfo: text })}
          />

          <Text style={styles.label}>{activeTab === 'lost' ? 'Date Lost' : 'Date Found'}</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={formData.date}
            onChangeText={(text) => setFormData({ ...formData, date: text })}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Pet Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Color, collar, size, or any distinguishing marks..."
            multiline
            numberOfLines={4}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
          />
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  activeTabText: {
    color: '#e76f51',
  },
  section: {
    marginBottom: 20,
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
    marginTop: 10,
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
    height: 100,
    textAlignVertical: 'top',
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
    backgroundColor: '#fef1ee',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e76f51',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#e76f51',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#e76f51',
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

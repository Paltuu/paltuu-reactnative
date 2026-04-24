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
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { usePetStore } from '../../src/stores/petStore';
import { useAuthStore } from '../../src/stores/authStore';

/* ───────────────────────────────────────────────
   Custom Dropdown — avoids @react-native-picker
   ─────────────────────────────────────────────── */
interface DropdownProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
}

function Dropdown({ label, value, options, onSelect }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <TouchableOpacity style={dStyles.trigger} onPress={() => setOpen(true)}>
        <Text style={selected ? dStyles.triggerText : dStyles.placeholder}>
          {selected ? selected.label : label}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#999" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide">
        <TouchableOpacity
          style={dStyles.backdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={dStyles.sheet}>
            <Text style={dStyles.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    dStyles.option,
                    item.value === value && dStyles.optionSelected,
                  ]}
                  onPress={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      dStyles.optionText,
                      item.value === value && dStyles.optionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Ionicons name="checkmark" size={20} color="#e76f51" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const dStyles = StyleSheet.create({
  trigger: {
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEE',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  triggerText: { fontSize: 16, color: '#000' },
  placeholder: { fontSize: 16, color: '#AAA' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 30,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  optionSelected: { backgroundColor: '#FEF5F3' },
  optionText: { fontSize: 16, color: '#333' },
  optionTextSelected: { color: '#e76f51', fontWeight: '600' },
});

/* ───────────────────────────────────────────────
   Main Screen
   ─────────────────────────────────────────────── */
export default function CreateLostFoundScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { cities, categories, fetchMetadata, createLostFoundPost, isLoading } =
    usePetStore();

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
    fetchMetadata().catch(() => {});
  }, []);

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
        setImages([...images, ...selected]);
      }
    } catch (error) {
      console.error('Pick Image Error:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const handleSubmit = async () => {
    if (!formData.categoryId || !formData.cityId || !formData.contactInfo) {
      return Alert.alert('Required', 'Please fill required fields');
    }

    try {
      const payload = {
        category_id: Number(formData.categoryId),
        city_id: Number(formData.cityId),
        location: formData.location,
        pet_description: formData.description,
        date: formData.date,
        contact_info: `+92${formData.contactInfo.replace(/^0/, '')}`,
        post_type: activeTab,
        user_id: user?.id || 47,
      };
      await createLostFoundPost(payload, images);
      Alert.alert('Success', 'Report submitted!', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    } catch {
      Alert.alert('Error', 'Submission failed.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 60 }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: 150 }]}
        keyboardShouldPersistTaps="always"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
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
            <Text
              style={[
                styles.tabText,
                activeTab === 'lost' && styles.activeTabText,
              ]}
            >
              LOST
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'found' && styles.activeTab]}
            onPress={() => setActiveTab('found')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'found' && styles.activeTabText,
              ]}
            >
              FOUND
            </Text>
          </TouchableOpacity>
        </View>

        {/* Photos */}
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {images.map((img, i) => (
              <View key={i} style={styles.imgWrap}>
                <Image source={{ uri: img.uri }} style={styles.img} />
                <TouchableOpacity
                  style={styles.imgRemove}
                  onPress={() =>
                    setImages(images.filter((_, idx) => idx !== i))
                  }
                >
                  <Ionicons name="close-circle" size={22} color="#FF4B4B" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 3 && (
              <TouchableOpacity style={styles.imgAdd} onPress={pickImage}>
                <Ionicons name="camera" size={28} color="#e76f51" />
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Form */}
        <Text style={styles.label}>Pet Category *</Text>
        <Dropdown
          label="Select Category"
          value={formData.categoryId}
          options={categoryOptions}
          onSelect={(v) => setFormData({ ...formData, categoryId: v })}
        />

        <Text style={styles.label}>City *</Text>
        <Dropdown
          label="Select City"
          value={formData.cityId}
          options={cityOptions}
          onSelect={(v) => setFormData({ ...formData, cityId: v })}
        />

        <Text style={styles.label}>Specific Location</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Near Hill Park"
          value={formData.location}
          onChangeText={(t) => setFormData({ ...formData, location: t })}
        />

        <Text style={styles.label}>Contact Info *</Text>
        <TextInput
          style={styles.input}
          placeholder="Phone or WhatsApp"
          keyboardType="number-pad"
          value={formData.contactInfo}
          onChangeText={(t) => setFormData({ ...formData, contactInfo: t })}
        />

        <Text style={styles.label}>
          Date {activeTab === 'lost' ? 'Lost' : 'Found'}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={formData.date}
          onChangeText={(t) => setFormData({ ...formData, date: t })}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Distinguishing marks..."
          multiline
          value={formData.description}
          onChangeText={(t) => setFormData({ ...formData, description: t })}
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, isLoading && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: { backgroundColor: '#fff' },
  tabText: { fontSize: 14, fontWeight: 'bold', color: '#666' },
  activeTabText: { color: '#e76f51' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    marginTop: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#EEE',
    color: '#000',
  },
  imgWrap: { marginRight: 10, position: 'relative' },
  img: { width: 80, height: 80, borderRadius: 12 },
  imgRemove: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  imgAdd: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#fef5f3',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#e76f51',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    backgroundColor: '#e76f51',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 30,
  },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

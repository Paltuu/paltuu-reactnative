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
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { usePetStore } from '../../src/stores/petStore';

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
                    <Ionicons name="checkmark" size={20} color="#a03048" />
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
  optionSelected: { backgroundColor: '#FFF0F3' },
  optionText: { fontSize: 16, color: '#333' },
  optionTextSelected: { color: '#a03048', fontWeight: '600' },
});

/* ───────────────────────────────────────────────
   Main Screen
   ─────────────────────────────────────────────── */
export default function CreatePetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cities, categories, fetchMetadata, createPet, isLoading } =
    usePetStore();

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
    fetchMetadata().catch(() => {});
  }, []);

  /* build dropdown options from store data */
  const categoryOptions = (categories ?? []).map((c: any) => ({
    label: c.category_name || c.name || 'Unknown',
    value: (c.category_id || c.id)?.toString(),
  }));

  const cityOptions = (cities ?? []).map((c: any) => ({
    label: c.city_name || c.name || 'Unknown',
    value: (c.city_id || c.id)?.toString(),
  }));

  const sexOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
  ];

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
        name: a.fileName || `img_${Date.now()}.jpg`,
      }));
      setImages([...images, ...selected]);
    }
  };

  const handleSubmit = async () => {
    if (
      !formData.title ||
      !formData.petType ||
      !formData.cityId ||
      !formData.contactNumber
    ) {
      return Alert.alert('Required', 'Please fill all fields marked with *');
    }

    try {
      const payload = {
        pet_name: formData.title,
        pet_type: Number(formData.petType),
        city_id: Number(formData.cityId),
        area: formData.area,
        age_months:
          Number(formData.years || 0) * 12 + Number(formData.months || 0),
        contact_number: formData.contactNumber,
        description: formData.description,
        sex: formData.sex,
        vaccinated: formData.vaccinated,
        neutered: formData.neutered,
        adoption_status: 'available',
        listing_type: 'individual',
      };
      await createPet(payload, images);
      Alert.alert('Success', 'Listing created!', [
        { text: 'OK', onPress: () => router.replace('/(app)/pets') },
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
          <Text style={styles.title}>Post a Pet</Text>
        </View>

        {/* Photos */}
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.sectionTitle}>Photos *</Text>
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
            {images.length < 5 && (
              <TouchableOpacity style={styles.imgAdd} onPress={pickImage}>
                <Ionicons name="camera" size={28} color="#a03048" />
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Title */}
        <Text style={styles.label}>Listing Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Playful Kitten"
          value={formData.title}
          onChangeText={(t) => setFormData({ ...formData, title: t })}
        />

        {/* Pet Type & Sex */}
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Pet Type *</Text>
            <Dropdown
              label="Select Type"
              value={formData.petType}
              options={categoryOptions}
              onSelect={(v) => setFormData({ ...formData, petType: v })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Sex *</Text>
            <Dropdown
              label="Select"
              value={formData.sex}
              options={sexOptions}
              onSelect={(v) => setFormData({ ...formData, sex: v })}
            />
          </View>
        </View>

        {/* City & Area */}
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>City *</Text>
            <Dropdown
              label="Select City"
              value={formData.cityId}
              options={cityOptions}
              onSelect={(v) => setFormData({ ...formData, cityId: v })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Area</Text>
            <TextInput
              style={styles.input}
              placeholder="Area Name"
              value={formData.area}
              onChangeText={(t) => setFormData({ ...formData, area: t })}
            />
          </View>
        </View>

        {/* Age */}
        <Text style={styles.label}>Age *</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 10 }]}
            placeholder="Years"
            keyboardType="number-pad"
            maxLength={2}
            value={formData.years}
            onChangeText={(t) => setFormData({ ...formData, years: t })}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Months"
            keyboardType="number-pad"
            maxLength={2}
            value={formData.months}
            onChangeText={(t) => setFormData({ ...formData, months: t })}
          />
        </View>

        {/* Contact */}
        <Text style={styles.label}>Contact Number *</Text>
        <TextInput
          style={styles.input}
          placeholder="03XX XXXXXXX"
          keyboardType="number-pad"
          maxLength={15}
          value={formData.contactNumber}
          onChangeText={(t) => setFormData({ ...formData, contactNumber: t })}
        />

        {/* Description */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Tell us more..."
          multiline
          value={formData.description}
          onChangeText={(t) => setFormData({ ...formData, description: t })}
        />

        {/* Switches */}
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Vaccinated</Text>
          <Switch
            value={formData.vaccinated}
            onValueChange={(v) => setFormData({ ...formData, vaccinated: v })}
            trackColor={{ true: '#a03048', false: '#E0E0E0' }}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Neutered / Spayed</Text>
          <Switch
            value={formData.neutered}
            onValueChange={(v) => setFormData({ ...formData, neutered: v })}
            trackColor={{ true: '#a03048', false: '#E0E0E0' }}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, isLoading && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Create Listing</Text>
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
  row: { flexDirection: 'row' },
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
    backgroundColor: '#fdf2f4',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#a03048',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
  },
  switchText: { fontSize: 16, color: '#333' },
  submitBtn: {
    backgroundColor: '#a03048',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 30,
  },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

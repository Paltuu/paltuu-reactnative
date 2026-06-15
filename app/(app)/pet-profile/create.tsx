import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { petProfilesApi } from '../../../src/api/petProfiles';
import { socialApi } from '../../../src/api/social';
import CustomInput from '../../../src/components/common/CustomInput';
import PrimaryButton from '../../../src/components/common/PrimaryButton';

const ALLOWED_SPECIES = [
  { label: 'Dog 🐶', value: 'Dog' },
  { label: 'Cat 🐱', value: 'Cat' },
  { label: 'Bird 🐦', value: 'Bird' },
  { label: 'Rabbit 🐰', value: 'Rabbit' },
  { label: 'Fish 🐟', value: 'Fish' },
  { label: 'Reptile 🦎', value: 'Reptile' },
  { label: 'Other 🐾', value: 'Other' },
];

const ALLOWED_GENDERS = [
  { label: 'Male ♂️', value: 'male' },
  { label: 'Female ♀️', value: 'female' },
  { label: 'Unknown ❓', value: 'unknown' },
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

export default function CreatePetProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const petProfileId = params.editId as string;
  const isEditMode = !!petProfileId;

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [gender, setGender] = useState('unknown');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isEditMode) {
      setIsLoading(true);
      petProfilesApi
        .getPetProfile(petProfileId)
        .then((profile) => {
          setName(profile.name);
          setSpecies(profile.species);
          setBreed(profile.breed || '');
          setGender(profile.gender);
          if (profile.date_of_birth) {
            setDateOfBirth(profile.date_of_birth.split('T')[0]);
          }
          setBio(profile.bio || '');
          setAvatarUrl(profile.avatar_url);
        })
        .catch((err) => {
          Alert.alert('Error', 'Failed to load pet profile');
          console.error(err);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isEditMode, petProfileId]);

  const pickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your photos to pick an avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploading(true);
        const fileUri = result.assets[0].uri;
        const processed = await manipulateAsync(
          fileUri,
          [{ resize: { width: 500, height: 500 } }],
          { compress: 0.8, format: SaveFormat.JPEG }
        );
        const uploadRes = await socialApi.uploadMedia([processed.uri]);
        if (uploadRes.media && uploadRes.media.length > 0) {
          setAvatarUrl(uploadRes.media[0].url);
        } else {
          Alert.alert('Error', 'Failed to upload image');
        }
      }
    } catch (error) {
      console.error('Pick Avatar Error:', error);
      Alert.alert('Error', 'Failed to select avatar image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      return Alert.alert('Required', 'Please enter a name for the pet profile.');
    }
    if (!species) {
      return Alert.alert('Required', 'Please select a species.');
    }

    if (dateOfBirth) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateOfBirth)) {
        return Alert.alert('Invalid Date', 'Date of birth must be in YYYY-MM-DD format.');
      }
      const [y, m, d] = dateOfBirth.split('-').map(Number);
      if (m < 1 || m > 12) {
        return Alert.alert('Invalid Date', 'Month must be between 01 and 12.');
      }
      const daysInMonth = new Date(y, m, 0).getDate();
      if (d < 1 || d > daysInMonth) {
        return Alert.alert('Invalid Date', `Day must be between 01 and ${daysInMonth} for this month.`);
      }
      const parsedDate = new Date(y, m - 1, d);
      if (parsedDate > new Date()) {
        return Alert.alert('Invalid Date', 'Date of birth cannot be in the future.');
      }
    }

    setIsLoading(true);
    const payload = {
      name: name.trim(),
      species,
      breed: breed.trim() || null,
      gender,
      date_of_birth: dateOfBirth || null,
      bio: bio.trim() || null,
      avatar_url: avatarUrl,
    };

    try {
      if (isEditMode) {
        await petProfilesApi.updatePetProfile(petProfileId, payload);
        Alert.alert('Success', 'Pet profile updated successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        const newProfile = await petProfilesApi.createPetProfile(payload);
        Alert.alert('Success', 'Pet profile created successfully!', [
          { text: 'OK', onPress: () => router.replace({ pathname: `/(app)/pet-profile/[id]`, params: { id: newProfile.pet_profile_id, from: 'profile' } }) },
        ]);
      }
    } catch (error: any) {
      console.error('Save Pet Profile Error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save pet profile.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && isEditMode) {
    return (
      <View style={s.loaderContainer}>
        <ActivityIndicator size="large" color="#a03048" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="chevron-back" size={22} color="#374151" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>
            {isEditMode ? 'Edit Pet Profile' : 'New Pet Profile'}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Section */}
          <View style={s.avatarSection}>
            <TouchableOpacity onPress={pickAvatar} disabled={isUploading || isLoading} style={s.avatarWrapper}>
              <View style={s.avatarFrame}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <Ionicons name="paw" size={44} color="#a03048" />
                )}
              </View>
              {isUploading ? (
                <View style={s.avatarUploadOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              ) : (
                <View style={s.avatarBadge}>
                  <Ionicons name="camera" size={14} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={s.avatarHint}>Pet Profile Picture</Text>
          </View>

          {/* Form */}
          <View style={{ gap: 20, marginBottom: 32 }}>
            <CustomInput
              label="Pet Name *"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Leo"
              leftIcon="heart-outline"
            />

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <PremiumDropdown
                  label="Species"
                  value={species}
                  options={ALLOWED_SPECIES}
                  onSelect={setSpecies}
                  icon="paw-outline"
                />
              </View>
              <View style={{ flex: 1 }}>
                <PremiumDropdown
                  label="Gender"
                  value={gender}
                  options={ALLOWED_GENDERS}
                  onSelect={setGender}
                  icon="transgender-outline"
                />
              </View>
            </View>

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <CustomInput
                  label="Breed"
                  value={breed}
                  onChangeText={setBreed}
                  placeholder="e.g. Husky"
                  leftIcon="git-branch-outline"
                />
              </View>
              <View style={{ flex: 1 }}>
                <CustomInput
                  label="Date of Birth"
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="YYYY-MM-DD"
                  maxLength={10}
                  leftIcon="calendar-outline"
                />
              </View>
            </View>

            <CustomInput
              label="About / Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Tell other pet lovers about their personality, hobbies, or traits..."
              multiline
              numberOfLines={4}
              maxLength={500}
              leftIcon="chatbox-ellipses-outline"
            />
          </View>

          {/* Save Button */}
          <PrimaryButton
            title={isEditMode ? 'Save Changes' : 'Create Profile'}
            onPress={handleSave}
            loading={isLoading || isUploading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
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
  scrollContent: { padding: 20, paddingTop: 24, paddingBottom: 60 },
  
  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarWrapper: { position: 'relative' },
  avatarFrame: {
    width: 96, height: 96,
    borderRadius: 48,
    backgroundColor: '#FAF0F2',
    borderWidth: 1.5,
    borderColor: '#f3e0e4',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#a03048',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarBadge: {
    position: 'absolute',
    bottom: 0, right: 0,
    backgroundColor: '#a03048',
    width: 30, height: 30,
    borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarUploadOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarHint: {
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#9CA3AF',
    marginTop: 8,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // Dropdown Field
  fieldContainer: { marginBottom: 0 },
  fieldLabel: {
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#6B7280',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
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

  row: { flexDirection: 'row', gap: 12 },

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
});

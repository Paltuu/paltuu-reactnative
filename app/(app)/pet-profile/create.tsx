import React, { useState, useEffect } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { petProfilesApi } from '../../../src/api/petProfiles';
import { socialApi } from '../../../src/api/social';

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

function CustomDropdown({ label, value, options, onSelect }: any) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o: any) => o.value === value);

  return (
    <>
      <TouchableOpacity
        className="bg-white rounded-2xl p-4 border border-gray-100 flex-row justify-between items-center"
        onPress={() => setOpen(true)}
      >
        <Text className={`text-base font-body ${selected ? 'text-dark font-headingSemi' : 'text-gray-400'}`}>
          {selected ? selected.label : label}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide">
        <TouchableOpacity
          className="flex-1 bg-black/40 justify-end"
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View className="bg-white rounded-t-[30px] max-h-[60%] pb-10">
            <Text className="text-base font-heading text-center py-5 border-b border-gray-100">{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className={`flex-row justify-between items-center px-6 py-4 border-b border-gray-100 ${
                    item.value === value ? 'bg-primary/5' : ''
                  }`}
                  onPress={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                >
                  <Text className={`text-base font-body ${item.value === value ? 'text-primary font-headingSemi' : 'text-dark'}`}>
                    {item.label}
                  </Text>
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

export default function CreatePetProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
          { text: 'OK', onPress: () => router.replace({ pathname: `/(app)/pet-profile/[id]`, params: { id: newProfile.pet_profile_id } }) },
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
      <View className="flex-1 justify-center items-center bg-bg">
        <ActivityIndicator size="large" color="#a03048" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-bg"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-100 bg-surface">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="chevron-back" size={24} color="#111111" />
        </TouchableOpacity>
        <Text className="text-xl font-heading text-dark">
          {isEditMode ? 'Edit Pet Profile' : 'New Pet Profile'}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={isLoading || isUploading} className="p-1">
          {isLoading ? (
            <ActivityIndicator size="small" color="#a03048" />
          ) : (
            <Text className="text-primary font-headingSemi text-base">Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 24, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar Section */}
        <View className="items-center mb-6">
          <TouchableOpacity onPress={pickAvatar} disabled={isUploading} className="relative">
            <View className="w-24 h-24 rounded-full bg-primary/10 items-center justify-center border border-gray-100 overflow-hidden">
              {isUploading ? (
                <ActivityIndicator size="small" color="#a03048" />
              ) : avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <Ionicons name="paw" size={48} color="#a03048" />
              )}
            </View>
            <View className="absolute bottom-0 right-0 bg-primary rounded-full p-2 border border-white">
              <Ionicons name="camera" size={14} color="#ffffff" />
            </View>
          </TouchableOpacity>
          <Text className="text-xs text-gray-500 mt-2 font-body">Pet Profile Picture</Text>
        </View>

        {/* Inputs */}
        <View className="gap-4">
          <View>
            <Text className="text-xs font-headingSemi text-gray-500 uppercase tracking-wider mb-2">Pet Name *</Text>
            <TextInput
              className="bg-white rounded-xl p-4 border border-gray-100 font-body text-sm text-dark"
              placeholder="e.g. Leo"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-xs font-headingSemi text-gray-500 uppercase tracking-wider mb-2">Species *</Text>
              <CustomDropdown
                label="Select Species"
                value={species}
                options={ALLOWED_SPECIES}
                onSelect={setSpecies}
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-headingSemi text-gray-500 uppercase tracking-wider mb-2">Gender</Text>
              <CustomDropdown
                label="Select Gender"
                value={gender}
                options={ALLOWED_GENDERS}
                onSelect={setGender}
              />
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-xs font-headingSemi text-gray-500 uppercase tracking-wider mb-2">Breed</Text>
              <TextInput
                className="bg-white rounded-xl p-4 border border-gray-100 font-body text-sm text-dark"
                placeholder="e.g. Golden Retriever"
                placeholderTextColor="#9CA3AF"
                value={breed}
                onChangeText={setBreed}
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-headingSemi text-gray-500 uppercase tracking-wider mb-2">Date of Birth</Text>
              <TextInput
                className="bg-white rounded-xl p-4 border border-gray-100 font-body text-sm text-dark"
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
                maxLength={10}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
              />
            </View>
          </View>

          <View>
            <Text className="text-xs font-headingSemi text-gray-500 uppercase tracking-wider mb-2">About / Bio</Text>
            <TextInput
              className="bg-white rounded-xl p-4 border border-gray-100 font-body text-sm text-dark min-h-[100px]"
              placeholder="Tell other pet lovers about their personality, hobbies, or traits..."
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              maxLength={500}
              value={bio}
              onChangeText={setBio}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { petProfilesApi, PetProfilePhoto } from '../../../src/api/petProfiles';
import { socialApi } from '../../../src/api/social';
import { withFocusUnmount } from '../../../src/components/common/withFocusUnmount';
import { PolaroidCard } from '../../../src/components/pets/PolaroidCard';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 3; // 3 columns with padding

function PetGalleryManagerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const petId = params.petId as string;

  const [photos, setPhotos] = useState<PetProfilePhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PetProfilePhoto | null>(null);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [pendingCaption, setPendingCaption] = useState('');

  useEffect(() => {
    fetchPhotos();
  }, [petId]);

  const fetchPhotos = async () => {
    try {
      setIsLoading(true);
      const res = await petProfilesApi.getPetPhotos(petId);
      setPhotos(res.photos);
    } catch (error) {
      console.error('Fetch Photos Error:', error);
      Alert.alert('Error', 'Failed to fetch photos.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: pick the image and hand it to the polaroid confirm modal, where
  // the owner can add a caption before it's actually uploaded.
  const pickPhoto = async () => {
    if (photos.length >= 20) {
      return Alert.alert('Limit Reached', 'You can upload up to 20 gallery photos per pet profile.');
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your photos to upload.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const processed = await manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.8, format: SaveFormat.JPEG }
        );
        setPendingCaption('');
        setPendingPhotoUri(processed.uri);
      }
    } catch (error) {
      console.error('Pick Photo Error:', error);
      Alert.alert('Error', 'Failed to load the selected photo.');
    }
  };

  // Step 2: upload the picked image together with whatever caption was
  // typed onto the polaroid.
  const confirmUploadPhoto = async () => {
    if (!pendingPhotoUri) return;
    try {
      setIsUploading(true);
      const uploadRes = await socialApi.uploadMedia([pendingPhotoUri]);
      if (uploadRes.media && uploadRes.media.length > 0) {
        const photoUrl = uploadRes.media[0].url;
        await petProfilesApi.uploadPetPhoto(petId, photoUrl, pendingCaption.trim() || undefined);
        setPendingPhotoUri(null);
        setPendingCaption('');
        await fetchPhotos();
      } else {
        Alert.alert('Error', 'Failed to upload image to server.');
      }
    } catch (error) {
      console.error('Upload Photo Error:', error);
      Alert.alert('Error', 'Failed to upload photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const deletePhoto = async (photoId: number) => {
    Alert.alert('Delete Photo', 'Are you sure you want to delete this photo from the gallery?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoading(true);
            await petProfilesApi.deletePetPhoto(petId, photoId);
            setSelectedPhoto(null);
            await fetchPhotos();
          } catch (error) {
            console.error('Delete Photo Error:', error);
            Alert.alert('Error', 'Failed to delete photo.');
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const setAsAvatar = async (photoUrl: string) => {
    try {
      setIsLoading(true);
      await petProfilesApi.setPetAvatar(petId, photoUrl);
      setSelectedPhoto(null);
      Alert.alert('Success', 'Profile avatar updated!');
    } catch (error) {
      console.error('Set Avatar Error:', error);
      Alert.alert('Error', 'Failed to update avatar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-100 bg-surface">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="chevron-back" size={24} color="#111111" />
        </TouchableOpacity>
        <Text className="text-xl font-heading text-dark">Photo Gallery</Text>
        <TouchableOpacity onPress={pickPhoto} disabled={isUploading || isLoading} className="p-1">
          {isUploading ? (
            <ActivityIndicator size="small" color="#a03048" />
          ) : (
            <Ionicons name="add" size={24} color="#a03048" />
          )}
        </TouchableOpacity>
      </View>

      {isLoading && photos.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#a03048" />
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.photo_id.toString()}
          numColumns={3}
          style={{ marginBottom: insets.bottom }}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          columnWrapperStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedPhoto(item)}
              className="mb-2 relative rounded-2xl overflow-hidden border border-gray-100 bg-surface"
              style={{ width: COLUMN_WIDTH, height: COLUMN_WIDTH }}
            >
              <Image
                source={{ uri: item.photo_url }}
                style={{ width: COLUMN_WIDTH, height: COLUMN_WIDTH }}
                contentFit="cover"
                onError={(e) => console.log('[Gallery] Image error:', item.photo_url, e.error)}
                onLoad={() => console.log('[Gallery] Image loaded:', item.photo_url)}
              />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons name="images-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 font-body mt-4 text-center px-6">
                No photos in this gallery yet. Tap the '+' button in the top right to upload one!
              </Text>
            </View>
          }
        />
      )}

      {/* Detail / Action Sheet Modal — photo shown as a polaroid print */}
      {selectedPhoto && (
        <Modal visible={!!selectedPhoto} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent>
          <TouchableOpacity
            className="flex-1 bg-black/80 justify-center items-center p-5"
            activeOpacity={1}
            onPress={() => setSelectedPhoto(null)}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}} className="w-full max-w-xs" style={{ position: 'relative' }}>
              <TouchableOpacity
                onPress={() => setSelectedPhoto(null)}
                className="absolute -top-11 right-0 bg-white/15 rounded-full p-1.5 z-10"
              >
                <Ionicons name="close" size={18} color="#ffffff" />
              </TouchableOpacity>

              <PolaroidCard uri={selectedPhoto.photo_url} caption={selectedPhoto.caption} />

              <View className="gap-3 mt-4">
                <TouchableOpacity
                  onPress={() => setAsAvatar(selectedPhoto.photo_url)}
                  className="bg-primary flex-row items-center justify-center gap-2 py-3.5 rounded-xl"
                >
                  <Ionicons name="person-circle-outline" size={20} color="#ffffff" />
                  <Text className="text-white font-headingSemi text-base">Make Profile Picture</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => deletePhoto(selectedPhoto.photo_id)}
                  className="bg-red-50 flex-row items-center justify-center gap-2 py-3.5 rounded-xl border border-red-100"
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  <Text className="text-red-500 font-headingSemi text-base">Delete Photo</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Add-photo confirm Modal — picked image previewed as a polaroid with
          an editable caption before it's actually uploaded. */}
      {pendingPhotoUri && (
        <Modal visible={!!pendingPhotoUri} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent>
          <TouchableOpacity
            className="flex-1 bg-black/80 justify-center items-center p-5"
            activeOpacity={1}
            onPress={() => !isUploading && setPendingPhotoUri(null)}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}} className="w-full max-w-xs" style={{ position: 'relative' }}>
              <TouchableOpacity
                onPress={() => setPendingPhotoUri(null)}
                disabled={isUploading}
                className="absolute -top-11 right-0 bg-white/15 rounded-full p-1.5 z-10"
              >
                <Ionicons name="close" size={18} color="#ffffff" />
              </TouchableOpacity>

              <PolaroidCard
                uri={pendingPhotoUri}
                caption={pendingCaption}
                editable
                onCaptionChange={setPendingCaption}
                placeholder="Write a caption..."
              />

              <TouchableOpacity
                onPress={confirmUploadPhoto}
                disabled={isUploading}
                className="bg-primary flex-row items-center justify-center gap-2 py-3.5 rounded-xl mt-4"
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={20} color="#ffffff" />
                    <Text className="text-white font-headingSemi text-base">Add to Gallery</Text>
                  </>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

export default withFocusUnmount(PetGalleryManagerScreen);

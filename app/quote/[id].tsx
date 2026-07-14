// app/quote/[id].tsx
// Full-screen quote-post composer that slides up from the bottom. Lets the user
// write a caption, attach images/videos (gallery or camera), and tag their own
// pets — then creates a quote repost. Mirrors the create-post upload pipeline
// (app/create-post.tsx) and the comment composer's full-screen layout rather
// than living in a bottom sheet.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Keyboard,
  ActivityIndicator, StatusBar, Alert, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { OriginalPostPreview } from '../../src/components/social/PostCard';
import { PetTagSheet, SelectedPetsRow } from '../../src/components/social/PetTagSheet';
import { useSocialActionsContext } from '../../src/context/SocialActionsContext';
import { socialApi } from '../../src/api/social';
import { petProfilesApi } from '../../src/api/petProfiles';
import { useAuthStore } from '../../src/stores/authStore';
import { NO_PROFILE_IMAGE } from '../../src/constants/images';

const PRIMARY = '#a03048';
const { width } = Dimensions.get('window');

type MediaItem = {
  uri: string;
  type: 'image' | 'video';
  mime?: string;
  thumbnailUri?: string;
};

// Display fields for the post being quoted. PostCard stashes this in the query
// cache before navigating (resolving a plain-repost card to its original), so
// the preview here matches what the server will actually quote.
interface QuoteTarget {
  author_name?: string;
  author_image?: string;
  content?: string;
  media?: any[];
  created_at?: string;
}

export default function QuoteComposerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const user = useAuthStore((state) => state.user);
  const actions = useSocialActionsContext();
  const queryClient = useQueryClient();

  const [content, setContent] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedPets, setSelectedPets] = useState<number[]>([]);
  const [petProfiles, setPetProfiles] = useState<any[]>([]);
  const [petSheetVisible, setPetSheetVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preview of the quoted post, read once on mount — set synchronously by
  // PostCard before this screen is pushed.
  const [target] = useState<QuoteTarget | undefined>(
    () => queryClient.getQueryData<QuoteTarget>(['quote-target', String(id)])
  );

  useEffect(() => {
    if (!user?.id) return;
    petProfilesApi
      .getUserPetProfiles(user.id)
      .then((res) => setPetProfiles(res.pet_profiles ?? []))
      .catch((err) => console.error('Error fetching pet profiles:', err));
  }, [user?.id]);

  // Track keyboard height so the bottom toolbar floats above it (see the same
  // pattern/justification in app/create-post.tsx and app/comment/[id].tsx).
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardVisible = keyboardHeight > 0;
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => {
      const h = e.endCoordinates?.height ?? 0;
      setKeyboardHeight(Platform.OS === 'android' ? h + insets.bottom : h);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, [insets.bottom]);

  // ── Media pickers (mirror create-post) ──────────────────────────────────────
  const pickMedia = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your photos and videos to upload media.');
        return;
      }
      if (mediaItems.length >= 10) {
        Alert.alert('Limit Reached', 'You can add up to 10 media items.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10 - mediaItems.length,
        videoMaxDuration: 120,
      });
      if (!result.canceled && result.assets) {
        const newItems: MediaItem[] = await Promise.all(
          result.assets.map(async (a) => {
            if (a.type === 'video') {
              const ext = (a.uri.split('.').pop() || 'mp4').toLowerCase();
              const mime = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
              let thumbnailUri: string | undefined;
              try {
                const VideoThumbnails = require('expo-video-thumbnails');
                const { uri } = await VideoThumbnails.getThumbnailAsync(a.uri, { time: 1000 });
                thumbnailUri = uri;
              } catch (e) {
                console.warn('[Quote] Failed to pre-generate video thumbnail:', e);
              }
              return { uri: a.uri, type: 'video' as const, mime, thumbnailUri };
            }
            return { uri: a.uri, type: 'image' as const };
          })
        );
        setMediaItems((prev) => [...prev, ...newItems].slice(0, 10));
      }
    } catch (error) {
      console.error('Pick Media Error:', error);
      Alert.alert('Error', 'An error occurred while picking media.');
    }
  };

  const pickCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your camera to take photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length) {
        setMediaItems((prev) =>
          [...prev, { uri: result.assets[0].uri, type: 'image' as const }].slice(0, 10)
        );
      }
    } catch (error: any) {
      if (error.message?.includes('Camera not available')) {
        Alert.alert('Camera Unavailable', 'The camera is not available on this device.');
      } else {
        Alert.alert('Error', 'An error occurred while opening the camera.');
      }
    }
  };

  const removeMedia = (index: number) => setMediaItems((prev) => prev.filter((_, i) => i !== index));
  const togglePet = (petId: number) =>
    setSelectedPets((prev) => (prev.includes(petId) ? prev.filter((p) => p !== petId) : [...prev, petId]));

  const canSubmit = (content.trim().length > 0 || mediaItems.length > 0) && !isSubmitting;

  // ── Submit: upload media (image + video), then create the quote ─────────────
  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const uploaded: any[] = await Promise.all(
        mediaItems.map(async (item, index) => {
          if (item.type === 'video') {
            const mime = item.mime || 'video/mp4';
            const ext = mime === 'video/quicktime' ? 'mov' : 'mp4';
            const { upload_url, video_key, raw_url } = await socialApi.getVideoUploadUrl(ext);

            let thumbnailRemoteUrl: string | null = null;
            try {
              if (item.thumbnailUri) {
                const thumbRes = await socialApi.uploadMedia([item.thumbnailUri]);
                thumbnailRemoteUrl = thumbRes.media[0]?.url || null;
              }
            } catch (e) {
              console.warn('[Quote] Failed to upload video thumbnail:', e);
            }

            await socialApi.uploadVideoToS3(upload_url, item.uri, mime);
            return {
              media_type: 'video',
              url: raw_url || item.uri,
              thumbnail_url: thumbnailRemoteUrl,
              video_status: 'pending',
              _video_key: video_key,
              ordering: index,
            };
          }
          const processed = await manipulateAsync(item.uri, [{ resize: { width: 1200 } }], {
            compress: 0.8,
            format: SaveFormat.JPEG,
          });
          const res = await socialApi.uploadMedia([processed.uri]);
          return { ...res.media[0], ordering: index };
        })
      );

      uploaded.sort((a, b) => (a.ordering ?? 0) - (b.ordering ?? 0));
      // Strip the client-only _video_key before sending to the API.
      const mediaPayload = uploaded.map(({ _video_key, ordering, ...m }) => m);

      // content is always a (possibly empty) string here — that non-null value
      // is what marks this as a quote rather than a hollow plain repost.
      const res = await actions?.repost(String(id), false, content.trim(), {
        media: mediaPayload,
        petProfileTags: selectedPets,
      });

      // Trigger MediaConvert for each uploaded video, index-matched with the
      // media rows the server just created.
      const createdMedia: any[] = res?.post?.media ?? [];
      const createdVideos = createdMedia.filter((m: any) => m.media_type === 'video');
      const uploadedVideos = uploaded.filter((m) => m._video_key);
      for (let i = 0; i < createdVideos.length; i++) {
        const vKey = uploadedVideos[i]?._video_key;
        const mId = createdVideos[i]?.media_id;
        if (vKey && mId) {
          try {
            await socialApi.confirmVideoUpload(vKey, String(mId));
          } catch (e) {
            console.error(`[Quote] confirmVideoUpload failed for video ${i}:`, e);
          }
        }
      }

      router.back();
    } catch (error: any) {
      console.error('Quote Post Error:', error);
      Alert.alert('Error', error?.message || 'Failed to post your quote.');
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header: Cancel / Post ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontSize: 16, color: '#111' }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={{
            paddingHorizontal: 18, paddingVertical: 7, borderRadius: 999,
            backgroundColor: canSubmit ? PRIMARY : '#E5E7EB',
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: canSubmit ? '#fff' : '#9CA3AF', fontWeight: '700', fontSize: 14 }}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingTop: 8, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Draft row: avatar + editable input ── */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, alignItems: 'flex-start' }}>
            <Image
              source={user?.profile_image_url ? { uri: user.profile_image_url } : NO_PROFILE_IMAGE}
              style={{ width: 40, height: 40, borderRadius: 20 }}
              contentFit="cover"
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <TextInput
                ref={inputRef}
                autoFocus
                multiline
                value={content}
                onChangeText={setContent}
                placeholder="Add a comment"
                placeholderTextColor="#9CA3AF"
                style={{ fontSize: 17, color: '#111', minHeight: 44, textAlignVertical: 'top', paddingTop: 10, paddingBottom: 0 }}
              />

              {/* ── Attached media grid ── */}
              {mediaItems.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {mediaItems.map((item, i) => (
                    <View key={`${item.uri}-${i}`} style={{ width: (width - 16 - 40 - 12 - 16 - 16) / 3, aspectRatio: 1, borderRadius: 12, overflow: 'hidden' }}>
                      <Image
                        source={{ uri: item.type === 'video' ? (item.thumbnailUri || item.uri) : item.uri }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                      {item.type === 'video' && (
                        <View style={{
                          position: 'absolute', bottom: 4, left: 4,
                          backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4,
                          paddingHorizontal: 4, paddingVertical: 2,
                        }}>
                          <Ionicons name="videocam" size={10} color="#fff" />
                        </View>
                      )}
                      <TouchableOpacity
                        onPress={() => removeMedia(i)}
                        style={{
                          position: 'absolute', top: 4, right: 4,
                          backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10,
                          width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="close" size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* ── Tagged pets ── */}
              {selectedPets.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <SelectedPetsRow
                    petProfiles={petProfiles}
                    selectedPets={selectedPets}
                    onToggle={togglePet}
                  />
                </View>
              )}

              {/* ── Embedded quoted post ── */}
              {target && (
                <View style={{ marginTop: 12 }}>
                  <OriginalPostPreview
                    authorName={target.author_name}
                    authorImage={target.author_image}
                    content={target.content}
                    media={target.media}
                    createdAt={target.created_at}
                  />
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Bottom toolbar — floats above the real keyboard height ── */}
      <View
        style={{
          position: 'absolute', left: 0, right: 0, bottom: keyboardHeight,
          borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff',
          paddingHorizontal: 16, paddingTop: 12,
          paddingBottom: keyboardVisible
            ? 12
            : Platform.OS === 'android'
            ? insets.bottom + 12
            : (insets.bottom > 0 ? insets.bottom : 12),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22 }}>
          <TouchableOpacity onPress={pickMedia} hitSlop={8}>
            <Ionicons name="image-outline" size={24} color={PRIMARY} />
          </TouchableOpacity>
          <TouchableOpacity onPress={pickCamera} hitSlop={8}>
            <Ionicons name="camera-outline" size={24} color={PRIMARY} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { Keyboard.dismiss(); setPetSheetVisible(true); }} hitSlop={8}>
            <Ionicons name="paw-outline" size={24} color={PRIMARY} />
          </TouchableOpacity>
          {mediaItems.length > 0 && (
            <View style={{ marginLeft: 'auto', backgroundColor: '#F3F4F6', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '600' }}>{mediaItems.length}/10</Text>
            </View>
          )}
        </View>
      </View>

      <PetTagSheet
        visible={petSheetVisible}
        onClose={() => setPetSheetVisible(false)}
        petProfiles={petProfiles}
        selectedPets={selectedPets}
        onToggle={togglePet}
        onAddPet={() => { setPetSheetVisible(false); router.push('/(app)/pet-profile/create'); }}
      />
    </View>
  );
}

// app/quote/[id].tsx
// Full-screen quote-post composer that slides up from the bottom. Lets the user
// write a caption, attach images/videos (gallery or camera), and tag their own
// pets — then creates a quote repost. Follows the same media rule as every other
// composer: tiles preview instantly from the local URI, the upload runs in the
// background from the moment media is picked, and Post hands off to the shared
// background queue rather than blocking on a spinner.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Keyboard,
  StatusBar, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { OriginalPostPreview } from '../../src/components/social/PostCard';
import { PetTagSheet, SelectedPetsRow } from '../../src/components/social/PetTagSheet';
import { GifPickerSheet } from '../../src/components/social/GifPickerSheet';
import { useMentionInput, MentionInputField, MentionSuggestionDropdown } from '../../src/components/social/MentionInput';
import { ComposerMediaGrid } from '../../src/components/social/ComposerMediaGrid';
import { useMediaDraft } from '../../src/hooks/useMediaDraft';
import { useUploadStore } from '../../src/stores/uploadStore';
import { petProfilesApi } from '../../src/api/petProfiles';
import { useAuthStore } from '../../src/stores/authStore';
import { NO_PROFILE_IMAGE } from '../../src/constants/images';

const PRIMARY = '#a03048';
const { width } = Dimensions.get('window');

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
  const queryClient = useQueryClient();
  const enqueueUpload = useUploadStore((s) => s.enqueue);

  const [content, setContent] = useState('');
  const { triggers: mentionTriggers, textInputProps: mentionInputProps, mentionState, mentionActive } = useMentionInput({
    value: content,
    onChange: setContent,
  });
  const mediaDraft = useMediaDraft({ maxItems: 10, allowVideo: true });
  const [selectedPets, setSelectedPets] = useState<number[]>([]);
  const [petProfiles, setPetProfiles] = useState<any[]>([]);
  const [petSheetVisible, setPetSheetVisible] = useState(false);
  const [gifSheetVisible, setGifSheetVisible] = useState(false);

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

  const togglePet = (petId: number) =>
    setSelectedPets((prev) => (prev.includes(petId) ? prev.filter((p) => p !== petId) : [...prev, petId]));

  // Never gated on upload state — media has been uploading since it was picked,
  // and anything still in flight is finished by the background job.
  const canSubmit = content.trim().length > 0 || mediaDraft.count > 0;

  // ── Submit: hand off to the shared background queue and leave ───────────────
  const handleSubmit = () => {
    if (!canSubmit) return;
    enqueueUpload({
      kind: 'quote',
      targetPostId: String(id),
      // content is always a (possibly empty) string here — that non-null value
      // is what marks this as a quote rather than a hollow plain repost.
      caption: content,
      selectedPets,
      settle: mediaDraft.settle,
      thumbnailUri: mediaDraft.items[0]?.thumbnailUri || mediaDraft.items[0]?.uri || null,
    });
    router.back();
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
          <Text style={{ color: canSubmit ? '#fff' : '#9CA3AF', fontWeight: '700', fontSize: 14 }}>Post</Text>
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
              <MentionInputField
                ref={inputRef}
                autoFocus
                multiline
                textInputProps={mentionInputProps}
                mentionState={mentionState}
                placeholder="Add a comment"
                placeholderTextColor="#9CA3AF"
                style={{ fontSize: 17, color: '#111', minHeight: 44, textAlignVertical: 'top', paddingTop: 10, paddingBottom: 0 }}
              />

              {!mentionActive && (
                <>
                  {/* ── Attached media grid ── */}
                  <ComposerMediaGrid
                    media={mediaDraft.items}
                    onRemove={mediaDraft.remove}
                    onRetry={mediaDraft.retry}
                    tileWidth={(width - 16 - 40 - 12 - 16 - 16) / 3}
                  />

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
                </>
              )}
            </View>
          </View>

          {/* ── Mention suggestions — replaces media/pets/quoted-preview
                while an "@" search is active, matching comment/[id].tsx ── */}
          {mentionActive && (
            <View style={{ flex: 1, marginTop: 6, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
              <MentionSuggestionDropdown {...mentionTriggers.mention} />
            </View>
          )}
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
          <TouchableOpacity onPress={mediaDraft.pickFromLibrary} hitSlop={8}>
            <Ionicons name="image-outline" size={24} color={PRIMARY} />
          </TouchableOpacity>
          <TouchableOpacity onPress={mediaDraft.pickFromCamera} hitSlop={8}>
            <Ionicons name="camera-outline" size={24} color={PRIMARY} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { Keyboard.dismiss(); setGifSheetVisible(true); }} hitSlop={8}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: PRIMARY, letterSpacing: 0.2 }}>GIF</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { Keyboard.dismiss(); setPetSheetVisible(true); }} hitSlop={8}>
            <Ionicons name="paw-outline" size={24} color={PRIMARY} />
          </TouchableOpacity>
          {mediaDraft.count > 0 && (
            <View style={{ marginLeft: 'auto', backgroundColor: '#F3F4F6', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '600' }}>{mediaDraft.count}/10</Text>
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

      <GifPickerSheet
        visible={gifSheetVisible}
        onClose={() => setGifSheetVisible(false)}
        onSelect={(gif) => mediaDraft.addGif(gif)}
      />
    </View>
  );
}

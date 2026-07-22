import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Dimensions,
  InteractionManager,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { petProfilesApi } from '../src/api/petProfiles';
import { PetTagSheet, SelectedPetsRow } from '../src/components/social/PetTagSheet';
import { useMentionInput, MentionSuggestionDropdown, MentionInputField } from '../src/components/social/MentionInput';
import { ComposerMediaGrid } from '../src/components/social/ComposerMediaGrid';
import { useMediaDraft } from '../src/hooks/useMediaDraft';
import { HEADER_HEIGHT } from '../src/components/common/MainHeader';
import PaltuuButton from '../src/components/ui/PaltuuButton';
import { NO_PROFILE_IMAGE } from '../src/constants/images';
import { useUploadStore } from '../src/stores/uploadStore';

// ── Constants ─────────────────────────────────────────────────────────────────

const { width } = Dimensions.get('window');

const POST_TYPES = [
  { key: 'post', label: 'Post', icon: 'grid-outline' },
  { key: 'text', label: 'Text', icon: 'text-outline' },
  { key: 'milestone', label: 'Milestone', icon: 'ribbon-outline' },
  { key: 'diary', label: 'Diary', icon: 'journal-outline' },
] as const;

type PostType = typeof POST_TYPES[number]['key'];

const PET_EMOJI: Record<string, string> = {
  cat: '🐱',
  dog: '🐶',
  bird: '🐦',
  default: '🐾',
};

// ── Subcomponents ─────────────────────────────────────────────────────────────

const TypeTab = ({
  item,
  active,
  onPress,
}: {
  item: typeof POST_TYPES[number];
  active: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full mr-2"
    style={{ backgroundColor: active ? '#a03048' : '#F3F4F6' }}
  >
    <Ionicons name={item.icon as any} size={13} color={active ? '#fff' : '#6B7280'} />
    <Text
      style={{
        fontSize: 12,
        fontFamily: 'Montserrat_600SemiBold',
        color: active ? '#fff' : '#6B7280',
      }}
    >
      {item.label}
    </Text>
  </TouchableOpacity>
);

const PetChip = ({
  pet,
  selected,
  onPress,
}: {
  pet: any;
  selected: boolean;
  onPress: () => void;
}) => {
  const type = String(pet?.species || 'default').toLowerCase();
  const emoji = PET_EMOJI[type] ?? PET_EMOJI.default;
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center gap-2 px-3 py-2 rounded-full mr-2 border"
      style={{
        backgroundColor: selected ? '#fdf0f2' : '#fff',
        borderColor: selected ? '#a03048' : '#E5E7EB',
      }}
    >
      <Text style={{ fontSize: 14 }}>{emoji}</Text>
      <Text
        style={{
          fontSize: 13,
          fontFamily: 'Montserrat_600SemiBold',
          color: selected ? '#a03048' : '#374151',
        }}
      >
        {pet.name}
      </Text>
      {selected && <Ionicons name="checkmark-circle" size={14} color="#a03048" />}
    </TouchableOpacity>
  );
};

const MilestoneSelector = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => {
  const options = [
    'First vet visit',
    'Adoption day',
    'First birthday',
    'New home',
    'Health recovery',
    'First trick learned',
  ];
  return (
    <View className="mt-3">
      <Text className="font-headingSemi text-xs text-gray-500 px-4 mb-2 uppercase tracking-wide">
        Milestone type
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            className="px-3 py-1.5 rounded-full border"
            style={{
              backgroundColor: value === opt ? '#fdf0f2' : '#F9FAFB',
              borderColor: value === opt ? '#a03048' : '#E5E7EB',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: 'Montserrat_600SemiBold',
                color: value === opt ? '#a03048' : '#6B7280',
              }}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CreatePostScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  // ── Keep the keyboard out of the transition ────────────────────────────────
  // Opening the keyboard via `autoFocus` while the screen is still sliding in
  // makes both animations fight for the main thread and drops frames. Instead we
  // focus the caption only once the slide-in has fully settled, and dismiss the
  // keyboard the instant a swipe-back begins so it isn't animating during exit.
  useEffect(() => {
    // `transitionStart`/`transitionEnd` are native-stack events not present on
    // expo-router's generic navigation type, hence the `any` cast.
    const nav = navigation as any;
    const onEnd = nav.addListener('transitionEnd', (e: any) => {
      if (!e?.data?.closing) inputRef.current?.focus();
    });
    const onStart = nav.addListener('transitionStart', (e: any) => {
      if (e?.data?.closing) Keyboard.dismiss();
    });
    return () => { onEnd(); onStart(); };
  }, [navigation]);

  const user = useAuthStore((state) => state.user);

  const params = useLocalSearchParams();
  const editId = params.editId as string;
  const isEditMode = !!editId;

  const [postType, setPostType] = useState<PostType>((params.initialPostType as PostType) || 'post');
  // `caption` is the same string that gets sent to the API as `content` — it
  // already carries any {@}[name](type:id) mention tokens inline. The
  // mention library renders those as styled "@Name" in the TextInput while
  // keeping `caption` itself as the encoded value, so edit-mode pre-fill
  // (initialCaption, which IS the stored encoded content) needs no decoding.
  const [caption, setCaption] = useState((params.initialCaption as string) || '');
  const { triggers: mentionTriggers, textInputProps: mentionInputProps, mentionState, mentionActive } = useMentionInput({
    value: caption,
    onChange: setCaption,
  });
  const [petProfiles, setPetProfiles] = useState<any[]>([]);
  const [isLoadingPetProfiles, setIsLoadingPetProfiles] = useState(true);

  /**
   * Owns the attached media and its upload lifecycle. Tiles render from the
   * local URI immediately; the cloud upload starts on pick and runs in the
   * background while the caption is being written, so Post rarely has to wait
   * for anything.
   */
  const mediaDraft = useMediaDraft({ maxItems: 10, allowVideo: true });

  const [selectedPets, setSelectedPets] = useState<number[]>(
    params.initialPetProfileIds
      ? String(params.initialPetProfileIds).split(',').filter(Boolean).map(Number)
      : []
  );
  const [milestone, setMilestone] = useState('');
  const [petSheetVisible, setPetSheetVisible] = useState(false);

  const enqueueUpload = useUploadStore((s) => s.enqueue);

  // Track the real keyboard height so the bottom toolbar can float directly
  // above it. `softwareKeyboardLayoutMode` is 'pan' on Android, which only
  // shifts the window enough to reveal the focused input's caret — it does
  // NOT resize the layout, so anything anchored in-flow at the bottom (like
  // this toolbar, which sits far below the caption input) stays pinned under
  // the keyboard unless we measure and follow the real height ourselves, on
  // both platforms.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardVisible = keyboardHeight > 0;
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => {
      const height = e.endCoordinates?.height ?? 0;
      // RN's Android `keyboardDidShow` height is computed as
      // `imeInset - systemBarInset` (ReactRootView#checkForKeyboardEvents), i.e.
      // it deliberately excludes the nav-bar height because it assumes the app's
      // content already stops above the nav bar. This screen is edge-to-edge, so
      // content actually extends behind the nav bar — add that inset back in so
      // `bottom: keyboardHeight` reaches the real top of the keyboard.
      setKeyboardHeight(Platform.OS === 'android' ? height + insets.bottom : height);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, [insets.bottom]);

  useEffect(() => {
    if (!user?.id) return;
    // Defer until the slide-in has settled so the fetch's state update doesn't
    // trigger a re-render in the middle of the navigation animation.
    const task = InteractionManager.runAfterInteractions(() => {
      petProfilesApi.getUserPetProfiles(user.id)
        .then((res) => setPetProfiles(res.pet_profiles))
        .catch((err) => console.error('Error fetching pet profiles:', err))
        .finally(() => setIsLoadingPetProfiles(false));
    });
    return () => task.cancel();
  }, [user]);

  // In edit mode there's no media picker to fall back on (see below), so an
  // image-only post with no caption must still be re-savable after just
  // toggling a pet tag — the post itself already has content.
  const canPost = isEditMode || caption.trim().length > 0 || mediaDraft.count > 0;

  // ── Other helpers ────────────────────────────────────────────────────────────

  const togglePet = (id: number) => {
    setSelectedPets((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  // ── Post handler ─────────────────────────────────────────────────────────────

  // Never waits on the network. Media has been uploading since it was picked;
  // whatever is left finishes inside the background job while this screen is
  // already gone.
  const handlePost = () => {
    if (!canPost) return;

    if (isEditMode) {
      enqueueUpload({
        kind: 'edit',
        editId,
        caption,
        selectedPets,
        postType,
      });
      // Editing is a quick metadata update, not a media upload — return the
      // user to wherever they came from rather than jumping to Feed.
      router.back();
      return;
    }

    enqueueUpload({
      kind: 'post',
      caption,
      selectedPets,
      postType,
      user,
      settle: mediaDraft.settle,
      thumbnailUri: mediaDraft.items[0]?.thumbnailUri || mediaDraft.items[0]?.uri || null,
    });

    // Always land on the Feed tab (not just "back") so the upload progress
    // banner in MainHeader — which only lives on Feed/Bazaar — is guaranteed
    // to be visible right away, regardless of where create-post was opened from.
    router.dismissTo('/(app)/(tabs)');
  };

  // ── Helpers for render ────────────────────────────────────────────────────────

  // When typing/selecting a mention, the area below the caption input swaps
  // from the normal compose content (media grid, milestone selector, toolbar)
  // to a full-width suggestion list filling all the way down to the keyboard
  // — matching the in-app @mention UX. The caption TextInput itself never
  // moves/unmounts across this toggle, so focus and cursor position survive.

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        // KeyboardAvoidingView always subscribes to keyboard events and, on
        // every show/hide, calls LayoutAnimation.configureNext(...) — even
        // when `behavior` is undefined. That global animation collides with
        // our own manual keyboardHeight-driven repositioning below, and on
        // Android visibly glitches the content (it can render as if the
        // header/caption vanished). `enabled={false}` fully suppresses that
        // internal side effect on the platform we don't need it for.
        enabled={Platform.OS === 'ios'}
        keyboardVerticalOffset={0}
      >
        {/* ── Top bar ── */}
        <View
          className="flex-row items-center border-b border-gray-100"
          style={{ height: HEADER_HEIGHT, paddingHorizontal: 14, position: 'relative' }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Image
              source={require('../assets/icons/plus-solid.svg')}
              style={{ width: 24, height: 24, transform: [{ rotate: '45deg' }] }}
              tintColor="#111111"
            />
          </TouchableOpacity>

          {/* Post / Save — compact PaltuuButton, right-aligned in header */}
          <View style={{ marginLeft: 'auto' }}>
            {/* No `loading` state: pressing this hands the work to the
                background queue and leaves the screen on the same tick, so
                there is never a spinner here to see. */}
            <PaltuuButton
              compact
              label={isEditMode ? 'Save' : 'Post'}
              disabled={!canPost}
              onPress={handlePost}
              style={{ paddingHorizontal: 8 }}
            />
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Post type tabs — hidden for now, coming back later ── */}
          <View style={{ height: 16 }} />

          {/* ── Author row — always mounted at a stable position so the
                caption TextInput never loses focus/cursor when the mention
                suggestion list opens/closes below it ── */}
          <View className="flex-row items-start px-4 gap-3">
            <Image
              source={user?.profile_image_url ? { uri: user.profile_image_url } : NO_PROFILE_IMAGE}
              style={{ width: 40, height: 40, borderRadius: 20, marginTop: 2 }}
              contentFit="cover"
            />

            <View className="flex-1">
              <Text className="font-headingSemi text-dark mb-1" style={{ fontSize: 14 }}>
                {user?.name || 'User'}
              </Text>

              {/* Caption input */}
              <MentionInputField
                ref={inputRef}
                textInputProps={mentionInputProps}
                mentionState={mentionState}
                placeholder={
                  postType === 'diary'
                    ? 'Write a diary entry for your pet...'
                    : postType === 'milestone'
                    ? 'Describe this milestone...'
                    : postType === 'text'
                    ? "What's on your mind?"
                    : 'Write a caption...'
                }
                placeholderTextColor="#9CA3AF"
                multiline
                style={{
                  fontSize: 15,
                  lineHeight: 22,
                  color: '#111',
                  // No minHeight while a mention is active — the suggestion
                  // list below must start right at the end of the typed
                  // text, not after a tall empty box reserved for captions.
                  // Once media is attached, shrink the reserved caption box so
                  // the tiles sit right under the text instead of after a tall
                  // empty gap.
                  minHeight: mentionActive ? undefined : mediaDraft.count > 0 ? 40 : 100,
                  textAlignVertical: 'top',
                  fontFamily: 'DMSans_400Regular',
                }}
              />
            </View>
          </View>

          {/* ── Below the input: either the normal compose content, or a
                full-width mention suggestion list filling all remaining
                space down to the keyboard (toolbar hides to make room) ── */}
          {mentionActive ? (
            <View style={{ flex: 1, marginTop: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
              <MentionSuggestionDropdown {...mentionTriggers.mention} />
            </View>
          ) : (
            <>
              {/* Milestone selector — edit mode only allows changing the
                    caption and pet tags, not the post type/milestone. */}
              {!isEditMode && postType === 'milestone' && (
                <MilestoneSelector value={milestone} onChange={setMilestone} />
              )}

              {/* ── Media grid — hidden in edit mode; media can't be changed
                    once a post exists, only the caption and pet tags can. ── */}
              {!isEditMode && (
                <ComposerMediaGrid
                  media={mediaDraft.items}
                  onRemove={mediaDraft.remove}
                  onRetry={mediaDraft.retry}
                  tileWidth={(width - 90) / 2}
                  heightRatio={1.25}
                  // Left-align tiles with where the caption text starts:
                  // px-4 (16) + avatar width (40) + gap-3 (12) = 68.
                  style={{ paddingLeft: 68, paddingRight: 16, gap: 6, marginTop: 12 }}
                />
              )}

              {/* ── Tagged pets (tagging is triggered from the toolbar paw button) ── */}
              {selectedPets.length > 0 && (
                <View className="mt-4 px-4">
                  <SelectedPetsRow
                    petProfiles={petProfiles}
                    selectedPets={selectedPets}
                    onToggle={togglePet}
                  />
                </View>
              )}

              <View style={{ height: 120 }} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Bottom toolbar — floats directly above the real keyboard height
            (tracked manually; Android's 'pan' softwareKeyboardLayoutMode only
            shifts the window enough to reveal the focused input's caret, not
            sibling content further down, so an in-flow/KeyboardAvoidingView
            position would stay pinned under the keyboard). Hidden while
            mention suggestions are showing, so the list extends all the way
            down to the keyboard. ── */}
      {!mentionActive && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: keyboardHeight,
            paddingTop: 10,
            // Android's gesture-nav inset (~16-24dp) is inherently smaller than
            // iOS's home-indicator inset (~34pt), so the same raw insets.bottom
            // that reads fine on iOS sits the icons visually flush against the
            // nav bar on Android — pad it out a bit more there.
            paddingBottom: keyboardVisible
              ? 10
              : Platform.OS === 'android'
              ? insets.bottom + 12
              : (insets.bottom > 0 ? insets.bottom : 10),
            paddingHorizontal: 16,
            borderTopWidth: 1,
            borderTopColor: '#F3F4F6',
            backgroundColor: '#fff',
          }}
        >
          {/* Media tools row — edit mode only allows changing the caption
                and pet tags, so the image/camera pickers are hidden there. */}
          <View className="flex-row items-center gap-5">
            {!isEditMode && (
              <>
                <TouchableOpacity onPress={mediaDraft.pickFromLibrary} hitSlop={8}>
                  <Ionicons name="image-outline" size={24} color="#a03048" />
                </TouchableOpacity>

                <TouchableOpacity onPress={mediaDraft.pickFromCamera} hitSlop={8}>
                  <Ionicons name="camera-outline" size={24} color="#a03048" />
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={() => setPetSheetVisible(true)} hitSlop={8}>
              <Ionicons name="paw-outline" size={24} color="#a03048" />
            </TouchableOpacity>

            {!isEditMode && mediaDraft.count > 0 && (
              <View className="ml-auto bg-gray-100 rounded-full px-2 py-1">
                <Text className="font-body text-xs text-gray-500">{mediaDraft.count}/10</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <PetTagSheet
        visible={petSheetVisible}
        onClose={() => setPetSheetVisible(false)}
        petProfiles={petProfiles}
        selectedPets={selectedPets}
        onToggle={togglePet}
        onAddPet={() => { setPetSheetVisible(false); router.push('/(app)/pet-profile/create'); }}
        isLoading={isLoadingPetProfiles}
      />

    </View>
  );
}


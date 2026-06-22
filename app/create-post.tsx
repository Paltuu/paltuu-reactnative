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
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../src/stores/authStore';
import { socialApi } from '../src/api/social';
import { petProfilesApi } from '../src/api/petProfiles';
import { useSocialActions } from '../src/hooks/useSocialActions';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { PetTagSheet, SelectedPetsRow } from '../src/components/social/PetTagSheet';
import { useMentionInput, MentionSuggestionDropdown } from '../src/components/social/MentionInput';
import { HEADER_HEIGHT } from '../src/components/common/MainHeader';
import PaltuuButton from '../src/components/ui/PaltuuButton';

// ── Types ──────────────────────────────────────────────────────────────────────

type UploadStage = 'idle' | 'compressing' | 'uploading' | 'finalizing';

/**
 * Unified media item — replaces the old parallel-array approach
 * (mediaTypes: Record<number, 'image'|'video'> and videoMimeTypes: Record<number, string>)
 * which could develop stale indices after item removal.
 */
type MediaItem = {
  uri: string;
  type: 'image' | 'video';
  /** MIME type, only relevant for videos (e.g. 'video/mp4', 'video/quicktime') */
  mime?: string;
};

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

/** Videos smaller than this are not worth compressing (saves time). */
const COMPRESSION_SKIP_MB = 10;

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
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const { user } = useAuthStore();

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
  const { triggers: mentionTriggers, textInputProps: mentionInputProps } = useMentionInput({
    value: caption,
    onChange: setCaption,
  });
  const [petProfiles, setPetProfiles] = useState<any[]>([]);

  /**
   * Single unified array replacing the old `media: string[]` + `mediaTypes: Record<number, ...>`
   * + `videoMimeTypes: Record<number, ...>` triple, which was prone to stale-index bugs
   * when items were removed from the middle of the list.
   */
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

  const [selectedPets, setSelectedPets] = useState<number[]>(
    params.initialPetProfileId ? [Number(params.initialPetProfileId)] : []
  );
  const [milestone, setMilestone] = useState('');
  const [petSheetVisible, setPetSheetVisible] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Track the keyboard so the bottom toolbar drops its safe-area inset and sits
  // flush above the keyboard when it's open.
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    if (user?.id) {
      petProfilesApi.getUserPetProfiles(user.id)
        .then((res) => setPetProfiles(res.pet_profiles))
        .catch((err) => console.error('Error fetching pet profiles:', err));
    }
  }, [user]);

  const canPost = caption.trim().length > 0 || mediaItems.length > 0;

  // ── Media pickers ────────────────────────────────────────────────────────────

  const pickMedia = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your photos to upload media.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const newItems: MediaItem[] = result.assets.map((a) => ({ uri: a.uri, type: 'image' }));
        setMediaItems((prev) => [...prev, ...newItems].slice(0, 10));
      }
    } catch (error: any) {
      console.error('Pick Media Error:', error);
      Alert.alert('Error', 'An error occurred while picking photos. Please try again.');
    }
  };

  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your photos to pick a video.');
        return;
      }

      if (mediaItems.length >= 10) {
        Alert.alert('Limit Reached', 'You can add up to 10 media items per post.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: false,
        videoMaxDuration: 120, // 2 min max
        quality: 1, // keep original — we compress on-device below
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const ext = (asset.uri.split('.').pop() || 'mp4').toLowerCase();
        const mime = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
        setMediaItems((prev) => [...prev, { uri: asset.uri, type: 'video', mime }]);
      }
    } catch (error: any) {
      console.error('Pick Video Error:', error);
      Alert.alert('Error', 'An error occurred while picking a video.');
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

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setMediaItems((prev) =>
          [...prev, { uri: result.assets[0].uri, type: 'image' as const }].slice(0, 10)
        );
      }
    } catch (error: any) {
      console.error('Pick Camera Error:', error);
      if (error.message?.includes('Camera not available')) {
        Alert.alert('Camera Unavailable', 'The camera is not available on this device (e.g. Simulator).');
      } else {
        Alert.alert('Error', 'An error occurred while opening the camera.');
      }
    }
  };

  const removeMedia = (index: number) => {
    // Safe removal — filtering by index never leaves stale keys in a separate Record<>
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Other helpers ────────────────────────────────────────────────────────────

  const togglePet = (id: number) => {
    setSelectedPets((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const resetUploadState = () => {
    setIsPosting(false);
    setUploadStage('idle');
    setCompressionProgress(0);
    setUploadProgress(0);
  };

  const { updatePost } = useSocialActions();

  // ── Post handler ─────────────────────────────────────────────────────────────

  const handlePost = async () => {
    if (!canPost) return;
    setIsPosting(true);
    setUploadStage('idle');
    setCompressionProgress(0);
    setUploadProgress(0);

    try {
      // ── Edit mode — only text/meta fields can change ──────────────────────
      if (isEditMode) {
        setUploadStage('finalizing');
        await updatePost(editId, {
          content: caption,
          pet_profile_tags: selectedPets,
          post_type: postType,
        });
        router.back();
        return;
      }

      let uploadedMedia: any[] = [];

      for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];

        if (item.type === 'video') {
          // ── Stage 1: Compress video on-device ──────────────────────────────
          setUploadStage('compressing');
          setCompressionProgress(0);

          let compressedUri = item.uri;

          try {
            const { Video: VideoCompressor } = require('react-native-compressor');
            compressedUri = await VideoCompressor.compress(
              item.uri,
              {
                maxSize: 1280,           // cap longest side at 1280px (720p)
                bitrate: 2_000_000,      // 2 Mbps — solid quality, half the storage of 4 Mbps
                minimumFileSizeForCompress: COMPRESSION_SKIP_MB, // skip if already < 10 MB
              },
              (progress: number) => {
                setCompressionProgress(progress); // 0.0 → 1.0
              }
            );
            console.log(`[CreatePost] Video ${i} compressed: ${item.uri} → ${compressedUri}`);
          } catch (compressErr) {
            // Non-fatal: fall back to original if compression fails
            // (e.g., unsupported codec, insufficient permissions, Expo Go environment)
            console.warn('[CreatePost] Video compression failed, uploading original:', compressErr);
            compressedUri = item.uri;
          }

          // ── Stage 2: Upload compressed video to S3 ─────────────────────────
          setUploadStage('uploading');
          setUploadProgress(0);

          const mime = item.mime || 'video/mp4';
          const ext  = mime === 'video/quicktime' ? 'mov' : 'mp4';

          // Get presigned PUT URL from the backend
          const { upload_url, video_key } = await socialApi.getVideoUploadUrl(ext);

          // Upload directly to S3 with live progress reporting
          await socialApi.uploadVideoToS3(upload_url, compressedUri, mime, (p) => {
            setUploadProgress(p);
          });

          uploadedMedia.push({
            media_type:    'video',
            url:           item.uri,   // local URI placeholder — passes server validation
            thumbnail_url: null,
            video_status:  'pending',
            _video_key:    video_key,  // internal — used for MediaConvert confirmation below
          });

        } else {
          // ── Image upload path ───────────────────────────────────────────────
          setUploadStage('uploading');
          const processed = await manipulateAsync(
            item.uri,
            [{ resize: { width: 1200 } }],
            { compress: 0.8, format: SaveFormat.JPEG }
          );
          const uploadRes = await socialApi.uploadMedia([processed.uri]);
          uploadedMedia.push(...uploadRes.media);
        }
      }

      // ── Stage 3: Create post + trigger MediaConvert ───────────────────────
      setUploadStage('finalizing');

      const postTypeValue =
        uploadedMedia.some((m) => m.media_type === 'video')
          ? 'video'
          : caption.trim().length > 0 && uploadedMedia.length === 0
          ? 'text'
          : 'image';

      const payload = {
        content:   caption,
        media:     uploadedMedia.map(({ _video_key, ...m }) => m),
        pet_profile_tags: selectedPets,
        post_type: postTypeValue,
      };

      console.log('[CreatePost] Sending payload to server:', JSON.stringify(payload, null, 2));

      const post = await socialApi.createPost(payload);

      // Kick off MediaConvert transcoding for each uploaded video
      const videoItems = post.media?.filter((m: any) => m.media_type === 'video') ?? [];
      for (let i = 0; i < videoItems.length; i++) {
        const vKey = uploadedMedia.find((m) => m._video_key)?._video_key;
        if (vKey && videoItems[i]?.media_id) {
          await socialApi.confirmVideoUpload(vKey, videoItems[i].media_id);
        }
      }

      router.back();
    } catch (error: any) {
      console.error('Create Post Error:', error);
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      resetUploadState();
    }
  };

  // ── Helpers for render ────────────────────────────────────────────────────────

  const initials = (user?.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // When typing/selecting a mention, the area below the caption input swaps
  // from the normal compose content (media grid, milestone selector, toolbar)
  // to a full-width suggestion list filling all the way down to the keyboard
  // — matching the in-app @mention UX. The caption TextInput itself never
  // moves/unmounts across this toggle, so focus and cursor position survive.
  const mentionActive = mentionTriggers.mention.keyword !== undefined;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

          {/* Centered title */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text className="font-headingSemi text-dark" style={{ fontSize: 15 }}>
              {isEditMode ? 'Edit post' : 'New post'}
            </Text>
          </View>

          {/* Post / Save — compact PaltuuButton, right-aligned in header */}
          <View style={{ marginLeft: 'auto' }}>
            <PaltuuButton
              compact
              label={isEditMode ? 'Save' : 'Post'}
              successLabel={isEditMode ? 'Saved!' : 'Posted!'}
              loading={isPosting}
              disabled={!canPost}
              onPress={handlePost}
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
            {user?.profile_image_url ? (
              <Image
                source={{ uri: user.profile_image_url }}
                style={{ width: 40, height: 40, borderRadius: 20, marginTop: 2 }}
                contentFit="cover"
              />
            ) : (
              <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mt-0.5">
                <Text className="text-primary font-headingSemi text-sm">{initials}</Text>
              </View>
            )}

            <View className="flex-1">
              <Text className="font-headingSemi text-dark mb-1" style={{ fontSize: 14 }}>
                {user?.name || 'User'}
              </Text>

              {/* Caption input */}
              <TextInput
                ref={inputRef}
                {...mentionInputProps}
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
                autoFocus
                style={{
                  fontSize: 15,
                  lineHeight: 22,
                  color: '#111',
                  // No minHeight while a mention is active — the suggestion
                  // list below must start right at the end of the typed
                  // text, not after a tall empty box reserved for captions.
                  minHeight: mentionActive ? undefined : 100,
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
              {/* Milestone selector */}
              {postType === 'milestone' && (
                <MilestoneSelector value={milestone} onChange={setMilestone} />
              )}

              {/* ── Media grid ── */}
              {mediaItems.length > 0 && (
                <View className="flex-row flex-wrap mt-3 mx-4 rounded-2xl overflow-hidden">
                  {mediaItems.map((item, i) => (
                    <View key={`${item.uri}-${i}`} style={{ width: width / 3 - 2, height: width / 3 - 2, margin: 1 }}>
                      <Image source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />

                      {/* Video badge */}
                      {item.type === 'video' && (
                        <View style={{
                          position: 'absolute', bottom: 4, left: 4,
                          backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4,
                          paddingHorizontal: 4, paddingVertical: 2,
                          flexDirection: 'row', alignItems: 'center', gap: 2,
                        }}>
                          <Ionicons name="videocam" size={10} color="#fff" />
                        </View>
                      )}

                      <TouchableOpacity
                        onPress={() => removeMedia(i)}
                        className="absolute top-1.5 right-1.5 bg-black/60 rounded-full w-5 h-5 items-center justify-center"
                      >
                        <Ionicons name="close" size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
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

        {/* ── Bottom toolbar — hidden while mention suggestions are showing,
              so the list extends all the way down to the keyboard ── */}
        {!mentionActive && (
          <View
            style={{
              paddingTop: 10,
              paddingBottom: keyboardVisible ? 10 : (insets.bottom > 0 ? insets.bottom : 10),
              paddingHorizontal: 16,
              borderTopWidth: 1,
              borderTopColor: '#F3F4F6',
              backgroundColor: '#fff',
            }}
          >
            {/* Media tools row */}
            <View className="flex-row items-center gap-5">
              <TouchableOpacity onPress={pickMedia} hitSlop={8}>
                <Ionicons name="image-outline" size={24} color="#a03048" />
              </TouchableOpacity>

              <TouchableOpacity onPress={pickCamera} hitSlop={8}>
                <Ionicons name="camera-outline" size={24} color="#a03048" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setPetSheetVisible(true)} hitSlop={8}>
                <Ionicons name="paw-outline" size={24} color="#a03048" />
              </TouchableOpacity>

              {mediaItems.length > 0 && (
                <View className="ml-auto bg-gray-100 rounded-full px-2 py-1">
                  <Text className="font-body text-xs text-gray-500">{mediaItems.length}/10</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

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

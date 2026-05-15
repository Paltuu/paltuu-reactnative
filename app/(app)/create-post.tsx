import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { usePetStore } from '../../src/stores/petStore';
import { useAuthStore } from '../../src/stores/authStore';
import { socialApi } from '../../src/api/social';
import { useSocialActions } from '../../src/hooks/useSocialActions';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
// import { Video as VideoCompressor } from 'react-native-compressor';

type UploadStage = 'idle' | 'compressing' | 'uploading' | 'finalizing';

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

/* ── Subcomponents ── */

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
  const type = String(pet?.pet_type || 'default').toLowerCase();
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
        {pet.pet_name}
      </Text>
      {selected && <Ionicons name="checkmark-circle" size={14} color="#a03048" />}
    </TouchableOpacity>
  );
};

const MediaThumb = ({
  uri,
  index,
  onRemove,
}: {
  uri: string;
  index: number;
  onRemove: (i: number) => void;
}) => {
  const thumbSize = width / 3 - 2;
  return (
    <View style={{ width: thumbSize, height: thumbSize, margin: 1 }}>
      <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      <TouchableOpacity
        onPress={() => onRemove(index)}
        className="absolute top-1.5 right-1.5 bg-black/60 rounded-full w-5 h-5 items-center justify-center"
      >
        <Ionicons name="close" size={12} color="#fff" />
      </TouchableOpacity>
    </View>
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

/* ── Main screen ── */

export default function CreatePostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const { user } = useAuthStore();
  const { myListings, fetchMyListings } = usePetStore();

  const params = useLocalSearchParams();
  const editId = params.editId as string;
  const isEditMode = !!editId;

  const [postType, setPostType] = useState<PostType>((params.initialPostType as PostType) || 'post');
  const [caption, setCaption] = useState((params.initialCaption as string) || '');
  const [media, setMedia] = useState<string[]>([]);
  // Track which media items are videos (for separate upload path)
  const [mediaTypes, setMediaTypes] = useState<Record<number, 'image' | 'video'>>({});
  const [videoMimeTypes, setVideoMimeTypes] = useState<Record<number, string>>({});
  const [selectedPets, setSelectedPets] = useState<number[]>(params.initialPetId ? [Number(params.initialPetId)] : []);
  const [milestone, setMilestone] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchMyListings();
  }, []);

  const canPost = caption.trim().length > 0 || media.length > 0;

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
        const uris = result.assets.map((a) => a.uri);
        setMedia((prev) => [...prev, ...uris].slice(0, 10));
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

      if (media.length >= 10) {
        Alert.alert('Limit Reached', 'You can add up to 10 media items per post.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: false,
        videoMaxDuration: 120, // 2 min max
        quality: 1,   // keep original — we compress ourselves below
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const idx = media.length;
        const ext = (asset.uri.split('.').pop() || 'mp4').toLowerCase();
        const mime = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
        setMedia((prev) => [...prev, asset.uri]);
        setMediaTypes((prev) => ({ ...prev, [idx]: 'video' }));
        setVideoMimeTypes((prev) => ({ ...prev, [idx]: mime }));
      }
    } catch (error: any) {
      console.error('Pick Video Error:', error);
      Alert.alert('Error', 'An error occurred while picking a video.');
    }
  };

  const pickCamera = async () => {
    try {
      // Check if camera is available (simulators don't have cameras)
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
        setMedia((prev) => [...prev, result.assets[0].uri].slice(0, 10));
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
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

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

  const handlePost = async () => {
    if (!canPost) return;
    setIsPosting(true);
    setUploadStage('idle');
    setCompressionProgress(0);
    setUploadProgress(0);

    try {
      if (isEditMode) {
        setUploadStage('finalizing');
        await updatePost(editId, {
          content: caption,
          pet_id: selectedPets[0],
          post_type: postType,
        });
        router.back();
        return;
      }

      let uploadedMedia: any[] = [];

      for (let i = 0; i < media.length; i++) {
        const uri = media[i];
        const isVideo = mediaTypes[i] === 'video';

        if (isVideo) {
          // ── Stage 1: Compress video on-device ────────────────────────────
          setUploadStage('compressing');
          setCompressionProgress(0);

          let compressedUri = uri;
          // Skip compression in Expo Go (requires development build)
          /*
          try {
            compressedUri = await VideoCompressor.compress(
              uri,
              {
                maxSize: 1920,           // cap longest side at 1920px (1080p)
                bitrate: 4_000_000,      // 4 Mbps — Instagram-quality 1080p
                minimumFileSizeForCompress: 20, // skip compression if < 20 MB
              },
              (progress) => {
                setCompressionProgress(progress); // 0.0 → 1.0
              }
            );
          } catch (compressErr) {
            console.warn('Video compression failed, using original:', compressErr);
            compressedUri = uri;
          }
          */
          compressedUri = uri;

          // ── Stage 2: Upload compressed video to S3 ───────────────────────
          setUploadStage('uploading');
          setUploadProgress(0);

          const mime = videoMimeTypes[i] || 'video/mp4';
          const ext  = mime === 'video/quicktime' ? 'mov' : 'mp4';

          // Get presigned URL
          const { upload_url, video_key } = await socialApi.getVideoUploadUrl(ext);

          // Upload compressed file directly to S3 with progress
          await socialApi.uploadVideoToS3(upload_url, compressedUri, mime, (p) => {
            setUploadProgress(p);
          });

          uploadedMedia.push({
            media_type:    'video',
            url:           uri,         // Placeholder local URI to pass server validation
            thumbnail_url: null,
            video_status:  'pending',
            _video_key:    video_key,  // internal — used to confirm below
          });
        } else {
          // ── Image upload path (existing flow) ───────────────────────────
          setUploadStage('uploading');
          const processed = await manipulateAsync(
            uri,
            [{ resize: { width: 1200 } }],
            { compress: 0.8, format: SaveFormat.JPEG }
          );
          const uploadRes = await socialApi.uploadMedia([processed.uri]);
          uploadedMedia.push(...uploadRes.media);
        }
      }

      // ── Stage 3: Create post + trigger MediaConvert ──────────────────────
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
        pet_id:    selectedPets[0],
        post_type: postTypeValue,
      };

      console.log('[CreatePost] Sending payload to server:', JSON.stringify(payload, null, 2));

      const post = await socialApi.createPost(payload);

      // Kick off MediaConvert for each video
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

  const initials = (user?.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ── Top bar ── */}
        <View
          className="flex-row items-center justify-between px-4 border-b border-gray-100"
          style={{ height: 52 }}
        >
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={24} color="#111" />
          </TouchableOpacity>

          <Text className="font-headingSemi text-dark" style={{ fontSize: 15 }}>
            {isEditMode ? 'Edit post' : 'New post'}
          </Text>

          <TouchableOpacity
            onPress={handlePost}
            disabled={!canPost || isPosting}
            className="px-4 py-1.5 rounded-full"
            style={{ backgroundColor: canPost ? '#a03048' : '#E5E7EB' }}
          >
            <Text
              style={{
                fontSize: 13,
                fontFamily: 'Montserrat_700Bold',
                color: canPost ? '#fff' : '#9CA3AF',
              }}
            >
          {isPosting ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingVertical: 6 }}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={{ fontSize: 11, color: '#fff', fontFamily: 'Montserrat_600SemiBold' }}>
                {uploadStage === 'compressing'
                  ? `Compressing ${Math.round(compressionProgress * 100)}%`
                  : uploadStage === 'uploading'
                  ? 'Finalizing...'
                  : 'Finalizing...'}
              </Text>
            </View>
          ) : (isEditMode ? 'Save' : 'Post')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Post type tabs ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
          >
            {POST_TYPES.map((item) => (
              <TypeTab
                key={item.key}
                item={item}
                active={postType === item.key}
                onPress={() => setPostType(item.key as PostType)}
              />
            ))}
          </ScrollView>

          {/* ── Author row ── */}
          <View className="flex-row items-start px-4 gap-3">
            <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mt-0.5">
              <Text className="text-primary font-headingSemi text-sm">{initials}</Text>
            </View>

            <View className="flex-1">
              <Text className="font-headingSemi text-dark mb-1" style={{ fontSize: 14 }}>
                {user?.name || 'User'}
              </Text>

              {/* Caption input */}
              <TextInput
                ref={inputRef}
                value={caption}
                onChangeText={setCaption}
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
                  minHeight: 100,
                  textAlignVertical: 'top',
                  fontFamily: 'DMSans_400Regular',
                }}
              />

              {/* Milestone selector */}
              {postType === 'milestone' && (
                <MilestoneSelector value={milestone} onChange={setMilestone} />
              )}
            </View>
          </View>

          {/* ── Media grid ── */}
          {media.length > 0 && (
            <View className="flex-row flex-wrap mt-3 mx-4 rounded-2xl overflow-hidden">
              {media.map((uri, i) => (
                <View key={uri} style={{ width: width / 3 - 2, height: width / 3 - 2, margin: 1 }}>
                  <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  {/* Video badge */}
                  {mediaTypes[i] === 'video' && (
                    <View style={{
                      position: 'absolute', bottom: 4, left: 4,
                      backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4,
                      paddingHorizontal: 4, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 2
                    }}>
                      <Ionicons name="videocam" size={10} color="#fff" />
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => {
                      setMedia((prev) => prev.filter((_, idx) => idx !== i));
                      setMediaTypes((prev) => {
                        const n = { ...prev };
                        delete n[i];
                        return n;
                      });
                    }}
                    className="absolute top-1.5 right-1.5 bg-black/60 rounded-full w-5 h-5 items-center justify-center"
                  >
                    <Ionicons name="close" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* ── Pet selector ── */}
          <View className="mt-5 px-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Ionicons name="paw-outline" size={15} color="#a03048" />
              <Text className="font-headingSemi text-dark" style={{ fontSize: 13 }}>
                Tag a pet
              </Text>
              {selectedPets.length > 0 && (
                <View className="bg-primary/10 rounded-full px-2 py-0.5">
                  <Text className="text-primary font-headingSemi" style={{ fontSize: 11 }}>
                    {selectedPets.length} selected
                  </Text>
                </View>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {myListings.map((pet) => (
                <PetChip
                  key={pet.pet_id}
                  pet={pet}
                  selected={selectedPets.includes(pet.pet_id)}
                  onPress={() => togglePet(pet.pet_id)}
                />
              ))}
              <TouchableOpacity
                onPress={() => router.push('/(app)/(app)/create-pet')}
                className="flex-row items-center gap-2 px-3 py-2 rounded-full border border-dashed border-gray-300 mr-2"
              >
                <Ionicons name="add" size={14} color="#9CA3AF" />
                <Text
                  style={{
                    fontSize: 13,
                    color: '#9CA3AF',
                    fontFamily: 'Montserrat_600SemiBold',
                  }}
                >
                  Add pet
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ── Bottom toolbar ── */}
        <View
          className="border-t border-gray-100 bg-surface flex-row items-center px-4 gap-5"
          style={{ height: 56, paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0 }}
        >
          <TouchableOpacity onPress={pickMedia} hitSlop={8}>
            <Ionicons name="image-outline" size={24} color="#a03048" />
          </TouchableOpacity>

          <TouchableOpacity onPress={pickCamera} hitSlop={8}>
            <Ionicons name="camera-outline" size={24} color="#a03048" />
          </TouchableOpacity>

          <TouchableOpacity onPress={pickVideo} hitSlop={8}>
            <Ionicons name="videocam-outline" size={24} color="#a03048" />
          </TouchableOpacity>

          <TouchableOpacity hitSlop={8}>
            <Ionicons name="location-outline" size={24} color="#a03048" />
          </TouchableOpacity>

          <TouchableOpacity hitSlop={8}>
            <MaterialCommunityIcons name="pound" size={22} color="#a03048" />
          </TouchableOpacity>

          {media.length > 0 && (
            <View className="ml-auto bg-gray-100 rounded-full px-2 py-1">
              <Text className="font-body text-xs text-gray-500">{media.length}/10</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

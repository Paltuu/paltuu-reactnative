// Shared comment-composer pieces used by both the full-screen comment screen
// (app/comment/[id].tsx) and the inline phase-2 composer on the post detail
// screen (app/post/[id].tsx). Keeps media-picking, pet tagging and the submit
// + cache-update logic in one place so the two surfaces stay in sync.
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi } from '../../api/social';
import { petProfilesApi } from '../../api/petProfiles';
import { useAuthStore } from '../../stores/authStore';
import { useMentionInput, MentionSuggestionDropdown, appendMention } from './MentionInput';

const PRIMARY = '#a03048';

export type DraftMedia = { uri: string; type: 'image' };

/* ── Draft hook: state + media picking + pet tagging + submit ── */
export const useCommentDraft = ({
  postId,
  parentId,
  onPosted,
}: {
  postId: string;
  parentId?: string;
  onPosted?: () => void;
}) => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [text, setText] = useState('');
  const [media, setMedia] = useState<DraftMedia[]>([]);
  const [selectedPets, setSelectedPets] = useState<number[]>([]);
  const [petProfiles, setPetProfiles] = useState<any[]>([]);

  const { triggers: mentionTriggers, textInputProps: mentionInputProps, mentionState } = useMentionInput({
    value: text,
    onChange: setText,
  });

  // Programmatic insert (e.g. the "replying to @username" prefill) — splices
  // a real, encoded mention token rather than plain unlinked text.
  const insertMention = (mention: { type: 'user' | 'pet'; id: number; name: string }) =>
    setText((prev) => appendMention(prev, mention));

  useEffect(() => {
    if (user?.id) {
      petProfilesApi
        .getUserPetProfiles(user.id)
        .then((res) => setPetProfiles(res.pet_profiles ?? []))
        .catch((err) => console.error('Error fetching pet profiles:', err));
    }
  }, [user?.id]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your photos to attach media.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 4,
      });
      if (!result.canceled && result.assets) {
        const items: DraftMedia[] = result.assets.map((a) => ({ uri: a.uri, type: 'image' }));
        setMedia((prev) => [...prev, ...items].slice(0, 4));
      }
    } catch (e) {
      Alert.alert('Error', 'Could not pick an image.');
    }
  };

  const pickCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your camera.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (!result.canceled && result.assets?.length) {
        setMedia((prev) => [...prev, { uri: result.assets[0].uri, type: 'image' as const }].slice(0, 4));
      }
    } catch (e: any) {
      if (e.message?.includes('Camera not available')) {
        Alert.alert('Camera Unavailable', 'The camera is not available on this device.');
      } else {
        Alert.alert('Error', 'Could not open the camera.');
      }
    }
  };

  const removeMedia = (index: number) => setMedia((prev) => prev.filter((_, i) => i !== index));
  const togglePet = (id: number) =>
    setSelectedPets((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const mutation = useMutation({
    // parentIdArg lets the post-detail screen reply to a specific comment while
    // reusing this same upload/submit pipeline; falls back to the hook's parentId.
    mutationFn: async (parentIdArg?: string) => {
      // Upload any attached images first.
      let uploadedMedia: any[] = [];
      if (media.length) {
        for (const item of media) {
          const processed = await manipulateAsync(item.uri, [{ resize: { width: 1200 } }], {
            compress: 0.8,
            format: SaveFormat.JPEG,
          });
          const res = await socialApi.uploadMedia([processed.uri]);
          uploadedMedia.push(...res.media);
        }
      }
      return socialApi.postComment(postId, text.trim(), parentIdArg ?? parentId, {
        media: uploadedMedia,
        petProfileTags: selectedPets,
      });
    },
    onSuccess: () => {
      setText('');
      setMedia([]);
      setSelectedPets([]);

      // Reflect the new comment immediately across caches.
      queryClient.setQueryData(['post', postId], (old: any) =>
        old ? { ...old, is_commented: true, comment_count: (old.comment_count || 0) + 1 } : old
      );
      queryClient.setQueriesData({ queryKey: ['social-feed'] }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: any) =>
              String(p.post_id) === String(postId)
                ? { ...p, is_commented: true, comment_count: (p.comment_count || 0) + 1 }
                : p
            ),
          })),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      onPosted?.();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Could not post your comment.');
    },
  });

  return {
    text,
    setText,
    insertMention,
    mentionTriggers,
    mentionInputProps,
    mentionState,
    media,
    pickImage,
    pickCamera,
    removeMedia,
    selectedPets,
    togglePet,
    petProfiles,
    submit: (parentIdOverride?: string) => mutation.mutate(parentIdOverride),
    isSubmitting: mutation.isPending,
    canSubmit: (text.trim().length > 0 || media.length > 0) && !mutation.isPending,
  };
};

/* ── Attached-image preview grid ── */
export const ComposerMediaGrid = ({
  media,
  onRemove,
}: {
  media: DraftMedia[];
  onRemove: (index: number) => void;
}) => {
  if (!media.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
      {media.map((item, i) => (
        <View key={`${item.uri}-${i}`} style={{ width: 76, height: 76, borderRadius: 12, overflow: 'hidden' }}>
          <Image source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          <TouchableOpacity
            onPress={() => onRemove(i)}
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
  );
};

/* ── Icon toolbar — gallery + camera + pet tagging only ── */
export const ComposerToolbar = ({
  onImage,
  onCamera,
  onPet,
  count,
  maxCount = 4,
}: {
  onImage: () => void;
  onCamera: () => void;
  onPet?: () => void;
  count: number;
  maxCount?: number;
}) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22 }}>
    <TouchableOpacity onPress={onImage} hitSlop={8}>
      <Ionicons name="image-outline" size={23} color={PRIMARY} />
    </TouchableOpacity>
    <TouchableOpacity onPress={onCamera} hitSlop={8}>
      <Ionicons name="camera-outline" size={23} color={PRIMARY} />
    </TouchableOpacity>
    {onPet && (
      <TouchableOpacity onPress={onPet} hitSlop={8}>
        <Ionicons name="paw-outline" size={22} color={PRIMARY} />
      </TouchableOpacity>
    )}
    {count > 0 && (
      <View style={{ marginLeft: 'auto', backgroundColor: '#F3F4F6', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
        <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '600' }}>{count}/{maxCount}</Text>
      </View>
    )}
  </View>
);

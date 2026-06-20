// app/comment/[id].tsx
// Full-screen comment composer that slides up from the bottom. Shows ONLY the
// post being replied to plus the draft the user is writing — no other comments.
// (The post detail screen at app/post/[id].tsx shows all replies instead.)
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, StatusBar, Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { socialApi } from '../../src/api/social';
import { useAuthStore } from '../../src/stores/authStore';
import {
  useCommentDraft,
  ComposerToolbar,
  ComposerMediaGrid,
} from '../../src/components/social/CommentComposer';
import { PetTagSheet, SelectedPetsRow } from '../../src/components/social/PetTagSheet';
import { MentionSuggestionDropdown } from '../../src/components/social/MentionInput';
import { MentionText } from '../../src/components/social/MentionText';

const PRIMARY = '#a03048';
const Avatar = ({ name, uri, size = 40 }: { name?: string; uri?: string | null; size?: number }) => {
  const initials = (name || 'U').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#fdf0f2', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.34, fontWeight: '700', color: PRIMARY }}>{initials}</Text>
    </View>
  );
};

export default function CommentComposerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const { user } = useAuthStore();

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => socialApi.getPostById(id as string),
    enabled: !!id,
  });

  const draft = useCommentDraft({
    postId: id as string,
    onPosted: () => router.back(),
  });

  const [petSheetVisible, setPetSheetVisible] = useState(false);

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
          onPress={() => draft.submit()}
          disabled={!draft.canSubmit}
          style={{
            paddingHorizontal: 18, paddingVertical: 7, borderRadius: 999,
            backgroundColor: draft.canSubmit ? PRIMARY : '#E5E7EB',
          }}
        >
          {draft.isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: draft.canSubmit ? '#fff' : '#9CA3AF', fontWeight: '700', fontSize: 14 }}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isLoading || !post ? (
            <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* ── Post being replied to ── */}
              <View style={{ flexDirection: 'row' }}>
                <View style={{ alignItems: 'center', width: 40 }}>
                  <Avatar name={post.author_name} uri={post.author_image} size={40} />
                  {/* Thread line connecting to the reply avatar below */}
                  <View style={{ flex: 1, width: 2, backgroundColor: '#E5E7EB', marginTop: 4, minHeight: 16 }} />
                </View>
                <View style={{ flex: 1, marginLeft: 12, paddingBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#111' }}>{post.author_name || 'User'}</Text>
                    {!!post.social_username && (
                      <Text style={{ fontSize: 14, color: '#9CA3AF', marginLeft: 6 }}>@{post.social_username}</Text>
                    )}
                  </View>
                  <MentionText
                    content={post.content}
                    textStyle={{ fontSize: 15, color: '#111', lineHeight: 21, marginTop: 2 }}
                  />
                  {post.media?.length > 0 && (
                    <Image
                      source={{ uri: post.media[0].thumbnail_url || post.media[0].url }}
                      style={{ width: '100%', height: 180, borderRadius: 14, marginTop: 10 }}
                      contentFit="cover"
                    />
                  )}
                  <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 10 }}>
                    Replying to{' '}
                    <Text style={{ color: PRIMARY }}>@{post.social_username || post.author_name}</Text>
                  </Text>
                </View>
              </View>

              {/* ── Reply draft row ── */}
              <View style={{ flexDirection: 'row', marginTop: 4 }}>
                <Avatar name={user?.name} uri={user?.profile_image_url} size={40} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <TextInput
                    ref={inputRef}
                    autoFocus
                    multiline
                    {...draft.mentionInputProps}
                    placeholder="Post your reply"
                    placeholderTextColor="#9CA3AF"
                    style={{ fontSize: 17, color: '#111', minHeight: 90, textAlignVertical: 'top', paddingTop: 8 }}
                  />
                  <MentionSuggestionDropdown {...draft.mentionTriggers.mention} />
                  <ComposerMediaGrid media={draft.media} onRemove={draft.removeMedia} />
                  <SelectedPetsRow
                    petProfiles={draft.petProfiles}
                    selectedPets={draft.selectedPets}
                    onToggle={draft.togglePet}
                  />
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* ── Bottom toolbar — sticky directly above the keyboard ── */}
        <View style={{
          borderTopWidth: 0.5, borderTopColor: '#F0F0F0',
          paddingHorizontal: 16, paddingTop: 12,
          paddingBottom: keyboardVisible ? 10 : (insets.bottom > 0 ? insets.bottom : 12),
          backgroundColor: '#fff',
        }}>
          <ComposerToolbar
            onImage={draft.pickImage}
            onCamera={draft.pickCamera}
            onPet={() => { Keyboard.dismiss(); setPetSheetVisible(true); }}
            count={draft.media.length}
          />
        </View>
      </KeyboardAvoidingView>

      <PetTagSheet
        visible={petSheetVisible}
        onClose={() => setPetSheetVisible(false)}
        petProfiles={draft.petProfiles}
        selectedPets={draft.selectedPets}
        onToggle={draft.togglePet}
        onAddPet={() => { setPetSheetVisible(false); router.push('/(app)/pet-profile/create'); }}
      />
    </View>
  );
}

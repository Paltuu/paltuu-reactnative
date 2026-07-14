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
import { NO_PROFILE_IMAGE } from '../../src/constants/images';

const PRIMARY = '#a03048';
const Avatar = ({ name, uri, size = 40 }: { name?: string; uri?: string | null; size?: number }) => (
  <Image
    source={uri ? { uri } : NO_PROFILE_IMAGE}
    style={{ width: size, height: size, borderRadius: size / 2 }}
    contentFit="cover"
  />
);

export default function CommentComposerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const user = useAuthStore((state) => state.user);

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

  // While the user is typing/selecting a mention, the post-being-replied-to
  // context and bottom toolbar hide so the full-width suggestion list can
  // fill all remaining space down to the keyboard. The reply TextInput stays
  // mounted at a stable tree position throughout (see render below), so
  // toggling this never costs focus or cursor position.
  const mentionActive = draft.mentionTriggers.mention.keyword !== undefined;

  // Track the real keyboard height so the bottom toolbar can float directly
  // above it. `softwareKeyboardLayoutMode` is 'pan' on Android, which only
  // shifts the window enough to reveal the focused input's caret — it does
  // NOT resize the layout, so an in-flow toolbar can stay pinned under the
  // keyboard unless we measure and follow the real height ourselves, on both
  // platforms.
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        // KeyboardAvoidingView always subscribes to keyboard events and, on
        // every show/hide, calls LayoutAnimation.configureNext(...) — even
        // when `behavior` is undefined. That global animation collides with
        // our own manual keyboardHeight-driven repositioning below, and on
        // Android visibly glitches the content. `enabled={false}` fully
        // suppresses that internal side effect on the platform we don't need
        // it for.
        enabled={Platform.OS === 'ios'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={{ flex: 1 }}
          // Extra bottom padding — the toolbar below is now an absolutely
          // positioned overlay (so it can float above the real keyboard
          // height), so content needs room to scroll clear of it.
          contentContainerStyle={{ flexGrow: 1, paddingTop: 8, paddingBottom: mentionActive ? 24 : 90 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isLoading || !post ? (
            <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* ── Post being replied to — hidden (not unmounted) while a
                    mention is active, so the suggestion list can take its
                    place without disturbing the reply input below ── */}
              <View style={{ flexDirection: 'row', paddingHorizontal: 16, display: mentionActive ? 'none' : 'flex' }}>
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

              {/* ── Reply draft row — the TextInput always stays mounted
                    here, at a stable position, regardless of mention state ── */}
              <View style={{ flexDirection: 'row', marginTop: 4, paddingHorizontal: 16 }}>
                <Avatar name={user?.name} uri={user?.profile_image_url} size={40} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <TextInput
                    ref={inputRef}
                    autoFocus
                    multiline
                    {...draft.mentionInputProps}
                    placeholder="Post your reply"
                    placeholderTextColor="#9CA3AF"
                    style={{ fontSize: 17, color: '#111', minHeight: mentionActive ? undefined : 90, textAlignVertical: 'top', paddingTop: 8 }}
                  />
                </View>
              </View>

              {/* ── Below the input: full-width mention suggestions filling
                    remaining space, or the normal media/pet attachments ── */}
              {mentionActive ? (
                <View style={{ flex: 1, marginTop: 6, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                  <MentionSuggestionDropdown {...draft.mentionTriggers.mention} />
                </View>
              ) : (
                <View style={{ paddingHorizontal: 16, marginLeft: 52 }}>
                  <ComposerMediaGrid media={draft.media} onRemove={draft.removeMedia} />
                  <SelectedPetsRow
                    petProfiles={draft.petProfiles}
                    selectedPets={draft.selectedPets}
                    onToggle={draft.togglePet}
                  />
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Bottom toolbar — floats directly above the real keyboard height
            (tracked manually; Android's 'pan' softwareKeyboardLayoutMode
            doesn't resize the layout, so an in-flow position can stay pinned
            under the keyboard). Hidden while mention suggestions are showing
            so the list reaches all the way down to the keyboard. ── */}
      {!mentionActive && (
        <View style={{
          position: 'absolute', left: 0, right: 0, bottom: keyboardHeight,
          borderTopWidth: 0.5, borderTopColor: '#F0F0F0',
          paddingHorizontal: 16, paddingTop: 12,
          // Android's gesture-nav inset (~16-24dp) is inherently smaller than
          // iOS's home-indicator inset (~34pt), so the same raw insets.bottom
          // that reads fine on iOS sits the icons visually flush against the
          // nav bar on Android — pad it out a bit more there.
          paddingBottom: keyboardVisible
            ? 10
            : Platform.OS === 'android'
            ? insets.bottom + 12
            : (insets.bottom > 0 ? insets.bottom : 12),
          backgroundColor: '#fff',
        }}>
          <ComposerToolbar
            onImage={draft.pickImage}
            onCamera={draft.pickCamera}
            onPet={() => { Keyboard.dismiss(); setPetSheetVisible(true); }}
            count={draft.media.length}
          />
        </View>
      )}

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

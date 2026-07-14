// app/post/[id].tsx
// Root-stack post detail. Lives outside the (app) tab group so it slides in
// from the right and covers the bottom tab bar. Shows the post + ALL replies,
// with a phase-1 (collapsed) → phase-2 (expanded, full composer) reply box.
// Thread rendering (rows, lines, tree helpers) is shared with the re-rooted
// comment page via src/components/social/commentTree.
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Pressable,
  TextInput, Platform, Keyboard,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi } from '../../src/api/social';
import { useCommentsQuery, commentsQueryKey, updateCommentInPages } from '../../src/hooks/useComments';
import { triggerLikeHaptic } from '../../src/utils/haptics';
import { useAuthStore } from '../../src/stores/authStore';
import PostCard from '../../src/components/social/PostCard';
import { PostCardSkeleton } from '../../src/components/social/PostCardSkeleton';
import { CommentRowSkeleton } from '../../src/components/social/CommentRowSkeleton';
import { QuickProfileModal } from '../../src/components/social/QuickProfileModal';
import { PostCardModalsProvider } from '../../src/context/PostCardModalsContext';
import { setPlayingPostId } from '../../src/utils/videoPlaySubscription';

import {
  useCommentDraft,
  ComposerToolbar,
  ComposerMediaGrid,
} from '../../src/components/social/CommentComposer';
import { PetTagSheet, SelectedPetsRow } from '../../src/components/social/PetTagSheet';
import { MentionSuggestionDropdown } from '../../src/components/social/MentionInput';
import {
  BG, PRIMARY,
  type SortBy, type FlatComment,
  buildTree, buildOrderRank, sortTreeByRank, flatten,
  Avatar, CommentRow, EmptyComments,
} from '../../src/components/social/commentTree';

/* ─────────────────── Main screen ─────────────────── */
export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const inputRef = useRef<TextInput>(null);
  const user = useAuthStore((state) => state.user);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<FlatComment | null>(null);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const sortBy: SortBy = 'top'; // comments always sort by Top
  const keyboardVisible = keyboardHeight > 0;
  const [petSheetVisible, setPetSheetVisible] = useState(false);

  // Auto-play the video in the detail screen when opened, and pause on close
  useEffect(() => {
    if (id) {
      setPlayingPostId(id as string);
    }
    return () => {
      setPlayingPostId(null);
    };
  }, [id]);

  // Track keyboard height so the floating composer can stick directly above it.
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

  /* ── Queries ── */
  const { data: postData, isLoading: postLoading, isError: postError } = useQuery({
    queryKey: ['post', id],
    queryFn: () => socialApi.getPostById(id as string),
    enabled: !!id,
    retry: 1,
    refetchInterval: (query) => {
      const media = query.state.data?.media;
      const isProcessing = media?.some(
        (m: any) => m.media_type === 'video' && (m.video_status === 'pending' || m.video_status === 'processing')
      );
      return isProcessing ? 5000 : false; // Poll every 5 seconds if transcoding
    },
  });


  const {
    comments,
    isLoading: commentsLoading,
    isFetchingNextPage,
    loadMore,
  } = useCommentsQuery(id);

  /* ── Comment/reply like — optimistic, with rollback on failure ── */
  const commentsKey = commentsQueryKey(id);
  const toggleCommentLike = useMutation({
    mutationFn: (commentId: string) => socialApi.toggleCommentLike(commentId),
    onMutate: async (commentId: string) => {
      await queryClient.cancelQueries({ queryKey: commentsKey });
      const previous = queryClient.getQueryData(commentsKey);
      queryClient.setQueryData(commentsKey, (old: any) =>
        updateCommentInPages(old, commentId, (c) => ({
          ...c,
          is_liked: !c.is_liked,
          like_count: Math.max(0, (c.like_count || 0) + (c.is_liked ? -1 : 1)),
        }))
      );
      return { previous };
    },
    onError: (_err, _commentId, context) => {
      if (context?.previous) queryClient.setQueryData(commentsKey, context.previous);
    },
  });

  const handleToggleCommentLike = useCallback((commentId: string) => {
    triggerLikeHaptic();
    toggleCommentLike.mutate(commentId);
  }, [toggleCommentLike]);

  // Past the inline-depth cap, tapping "Continue this thread" opens a focused
  // page rooted at that comment (fresh indentation budget).
  const handleContinueThread = useCallback((commentId: string) => {
    router.push({ pathname: '/thread/[id]', params: { id: commentId, postId: String(id) } });
  }, [router, id]);

  /* ── Reply draft (shared composer logic) ── */
  const draft = useCommentDraft({
    postId: id as string,
    onPosted: () => {
      setReplyingTo(null);
      setComposerExpanded(false);
      inputRef.current?.blur();
    },
  });

  // While typing/selecting a mention, the floating composer expands upward
  // to cover the post+comments behind it, so its full-width suggestion list
  // can fill all the way down to the keyboard — the reply banner and toolbar
  // hide to make room. The TextInput stays mounted at a stable position
  // throughout, so this never costs focus.
  const mentionActive = draft.mentionTriggers.mention.keyword !== undefined;

  /* ── Handlers ── */
  const openComposer = useCallback(() => {
    setReplyingTo(null);
    setComposerExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  const collapseComposer = useCallback(() => {
    Keyboard.dismiss();
    setComposerExpanded(false);
  }, []);

  const handleReply = useCallback((comment: FlatComment) => {
    setReplyingTo(comment);
    // Prefill with a real, encoded mention so it renders as a tappable link
    // and actually notifies the person being replied to — not just cosmetic
    // text. Falls back to plain (unlinked) text if they have no username set
    // (a real mention requires one — see lib/mentions.ts validateMentions).
    if (comment.social_username) {
      draft.insertMention({ type: 'user', id: comment.user_id, name: comment.social_username });
    } else {
      draft.setText(`@${comment.author_name} `);
    }
    setComposerExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 60);
  }, [draft]);

  const handleExpand = useCallback((cid: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(cid) ? next.delete(cid) : next.add(cid);
      return next;
    });
  }, []);

  const handleSend = useCallback(() => {
    if (!draft.canSubmit) return;
    draft.submit(replyingTo?.comment_id);
  }, [draft, replyingTo]);

  /* ── Data ── */
  // A signature of just the comment *set* (ids) — changes on add/remove but not
  // when a like mutates a count, so the frozen sort order survives likes.
  const commentIdsKey = useMemo(
    () => comments.map((c: any) => c.comment_id).join(','),
    [comments]
  );
  const orderRank = useMemo(
    () => buildOrderRank(comments, sortBy),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the id set, not live like counts
    [commentIdsKey, sortBy]
  );

  const flatComments = useMemo(() => {
    const tree = sortTreeByRank(buildTree(comments), orderRank);
    return flatten(tree, expanded);
  }, [comments, expanded, orderRank]);

  const listData = useMemo(() => {
    if (!postData) return [];
    let commentItems: any[];
    if (commentsLoading) {
      commentItems = [0, 1, 2].map((i) => ({ type: 'comment-skeleton', key: `skeleton-${i}` }));
    } else if (flatComments.length === 0) {
      commentItems = [{ type: 'empty', key: 'empty' }];
    } else {
      commentItems = flatComments.map(c => ({ type: 'comment', key: c.comment_id, data: c }));
    }
    return [
      { type: 'post', key: 'post' },
      ...commentItems,
    ];
  }, [postData, flatComments, commentsLoading]);

  /* ── Render item ── */
  const renderItem = useCallback(({ item }: { item: any }) => {
    switch (item.type) {
      case 'post': {
        const hasUserCommented = comments.some(
          (c: any) => String(c.user_id) === String(user?.id)
        );
        const postWithCommentState = postData
          ? { ...postData, is_commented: postData.is_commented || hasUserCommented }
          : null;

        return (
          <View style={{ paddingTop: 8 }}>
            <PostCard
              post={postWithCommentState!}
              onPress={() => {}}
              onComment={openComposer}
              onPlusPress={(uid) => setSelectedUserId(uid)}
            />
          </View>
        );
      }
      case 'empty':
        return <EmptyComments />;
      case 'comment-skeleton':
        return <CommentRowSkeleton />;
      case 'comment':
        return (
          <CommentRow
            item={item.data}
            onReply={handleReply}
            onToggleLike={handleToggleCommentLike}
            onExpand={handleExpand}
            onContinueThread={handleContinueThread}
            onOpenThread={handleContinueThread}
            onOpenProfile={setSelectedUserId}
          />
        );
      default:
        return null;
    }
  }, [postData, comments, handleReply, handleExpand, handleToggleCommentLike, handleContinueThread, openComposer, user?.id, sortBy]);

  /* ── Loading / Error ── */
  if (postLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <View style={{
          backgroundColor: BG, paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12,
          flexDirection: 'row', alignItems: 'center', gap: 12,
          borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6',
        }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', flex: 1 }}>Post</Text>
        </View>
        <PostCardSkeleton />
        <CommentRowSkeleton />
        <CommentRowSkeleton />
      </View>
    );
  }

  if (postError || (!postLoading && !postData)) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top + 8 }}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6' }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color="#111" />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Ionicons name="alert-circle-outline" size={48} color="#E0E0E0" />
          <Text style={{ color: '#999', marginTop: 12, textAlign: 'center', fontSize: 15 }}>
            This post is unavailable.
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: '#A03048' }}>
            <Text style={{ color: '#FFF', fontWeight: '700' }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <PostCardModalsProvider>
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" />

      {/* ── Navbar ── */}
      <View style={{
        backgroundColor: BG,
        paddingTop: insets.top + 8,
        paddingHorizontal: 16,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#F3F4F6',
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', flex: 1 }}>Post</Text>
      </View>

      {/* ── Content ── */}
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={item => item.key}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 72 + insets.bottom, backgroundColor: BG }}
        style={{ flex: 1, backgroundColor: BG }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator size="small" color={PRIMARY} />
            </View>
          ) : null
        }
      />

      {/* ── Phase 1: collapsed reply bar (in-flow, anchored to the bottom) ── */}
      {!composerExpanded && (
        <View style={{
          backgroundColor: BG,
          borderTopWidth: 0.5,
          borderTopColor: '#F3F4F6',
          // Android's gesture-nav inset is inherently smaller than iOS's
          // home-indicator inset, so pad it out a bit more there to avoid
          // sitting flush against the nav bar.
          paddingBottom: Platform.OS === 'android' ? insets.bottom + 12 : (insets.bottom > 0 ? insets.bottom : 10),
        }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={openComposer}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4,
            }}
          >
            <Avatar name={user?.name || 'U'} uri={user?.profile_image_url} size={32} />
            <View style={{
              flex: 1,
              backgroundColor: '#F9FAFB',
              borderRadius: 24,
              borderWidth: 1, borderColor: '#F3F4F6',
              paddingHorizontal: 16, paddingVertical: 11,
            }}>
              <Text style={{ fontSize: 14, color: '#C4C4C4' }}>Post your reply</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Phase 2: floating composer — sticks to the keyboard, floats above all ── */}
      {composerExpanded && (
        <>
          {/* Transparent tap-catcher to dismiss */}
          <Pressable
            onPress={collapseComposer}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
          />

          <View style={{
            position: 'absolute', left: 0, right: 0,
            // While a mention is active, the box expands upward (stopping
            // just below the navbar) so the suggestion list has room to
            // fill all the way down to the keyboard, full width.
            top: mentionActive ? insets.top + 48 : undefined,
            // `softwareKeyboardLayoutMode` is 'pan' on Android, which only
            // shifts the window enough to reveal the focused input's caret —
            // it does NOT resize the layout, so anything anchored at the
            // physical bottom (like this composer) stays pinned under the
            // keyboard unless we measure and follow the real keyboard height
            // ourselves, on both platforms.
            bottom: keyboardHeight,
            zIndex: 50, elevation: 24,
            backgroundColor: BG,
            borderTopWidth: 0.5, borderTopColor: '#F3F4F6',
            shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.1, shadowRadius: 10,
            // Android's gesture-nav inset is inherently smaller than iOS's
            // home-indicator inset, so pad it out a bit more there to avoid
            // the media icons sitting flush against the nav bar — but only
            // when resting (no keyboard): once the keyboard is up, `bottom:
            // keyboardHeight` already includes that inset (see the listener
            // above), so adding it again here would double-count it and leave
            // a gap between the composer and the keyboard.
            paddingBottom: keyboardVisible
              ? (Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : 10)
              : (Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : insets.bottom + 12),
          }}>
            <View style={{ flex: mentionActive ? 1 : undefined }}>
              {/* Reply banner (replying to a specific comment) — hidden while
                  a mention is active to make room for the suggestion list */}
              {replyingTo && !mentionActive && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 16, paddingVertical: 8,
                  backgroundColor: '#fdf0f2',
                  borderBottomWidth: 0.5, borderBottomColor: '#f5d0d8',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="return-down-forward-outline" size={14} color={PRIMARY} />
                    <Text style={{ fontSize: 12, color: PRIMARY, fontWeight: '600' }}>
                      Replying to {replyingTo.author_name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => { setReplyingTo(null); draft.setText(''); }}
                    hitSlop={10}
                  >
                    <Ionicons name="close" size={16} color={PRIMARY} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Text field — always mounted at a stable position, regardless
                  of mention state, so it never loses focus */}
              <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
                <View style={{ flexDirection: 'row' }}>
                  <Avatar name={user?.name || 'U'} uri={user?.profile_image_url} size={32} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <TextInput
                      ref={inputRef}
                      {...draft.mentionInputProps}
                      placeholder={replyingTo ? `Reply to ${replyingTo.author_name}...` : 'Post your reply'}
                      placeholderTextColor="#C4C4C4"
                      style={{ fontSize: 15, color: '#111', minHeight: mentionActive ? undefined : 40, maxHeight: 120, textAlignVertical: 'top', paddingTop: 8 }}
                      multiline
                      autoFocus
                    />
                  </View>
                </View>
              </View>

              {/* Below the input: full-width mention suggestions filling
                  remaining space, or the normal media/pet attachments */}
              {mentionActive ? (
                <View style={{ flex: 1, marginTop: 6, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                  <MentionSuggestionDropdown {...draft.mentionTriggers.mention} />
                </View>
              ) : (
                <View style={{ paddingHorizontal: 12, marginLeft: 42 }}>
                  <ComposerMediaGrid media={draft.media} onRemove={draft.removeMedia} />
                  <SelectedPetsRow
                    petProfiles={draft.petProfiles}
                    selectedPets={draft.selectedPets}
                    onToggle={draft.togglePet}
                  />
                </View>
              )}

              {/* Toolbar / quick-access bar + Reply — stuck to the keyboard;
                  hidden while mention suggestions are showing */}
              {!mentionActive && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6,
                }}>
                  <ComposerToolbar
                    onImage={draft.pickImage}
                    onCamera={draft.pickCamera}
                    onPet={() => setPetSheetVisible(true)}
                    count={draft.media.length}
                  />
                  <TouchableOpacity
                    onPress={handleSend}
                    disabled={!draft.canSubmit}
                    style={{
                      marginLeft: 'auto',
                      backgroundColor: draft.canSubmit ? PRIMARY : '#E5E7EB',
                      borderRadius: 999, paddingHorizontal: 18, paddingVertical: 8,
                    }}
                  >
                    {draft.isSubmitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ color: draft.canSubmit ? '#fff' : '#9CA3AF', fontWeight: '700', fontSize: 14 }}>Reply</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </>
      )}

      <QuickProfileModal
        userId={selectedUserId}
        visible={selectedUserId !== null}
        onClose={() => setSelectedUserId(null)}
      />

      <PetTagSheet
        visible={petSheetVisible}
        onClose={() => setPetSheetVisible(false)}
        petProfiles={draft.petProfiles}
        selectedPets={draft.selectedPets}
        onToggle={draft.togglePet}
        onAddPet={() => { setPetSheetVisible(false); router.push('/(app)/pet-profile/create'); }}
      />
    </View>
    </PostCardModalsProvider>
  );
}

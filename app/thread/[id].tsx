// app/thread/[id].tsx
// Re-rooted comment detail page. When a thread nests past MAX_INLINE_DEPTH on
// the post page, "Continue this thread" opens this screen with that comment as
// the focused root at the top (like the post on the post page) and its whole
// subtree below — giving the thread a fresh indentation budget. Reuses the
// shared thread rendering + the same ['comments', postId] query (so navigation
// is instant off the cache).
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
import { useAuthStore } from '../../src/stores/authStore';
import { CommentRowSkeleton } from '../../src/components/social/CommentRowSkeleton';
import { QuickProfileModal } from '../../src/components/social/QuickProfileModal';
import { PostCardModalsProvider } from '../../src/context/PostCardModalsContext';
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
  buildTree, buildOrderRank, sortTreeByRank, flatten, findComment, rebaseTree,
  Avatar, CommentRow, SortSelector, EmptyComments, FocusedCommentHeader,
} from '../../src/components/social/commentTree';

/* ─────────────────── Comment thread screen ─────────────────── */
export default function CommentThreadScreen() {
  const { id, postId } = useLocalSearchParams<{ id: string; postId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const inputRef = useRef<TextInput>(null);
  const { user } = useAuthStore();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<FlatComment | null>(null);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [sortBy, setSortBy] = useState<SortBy>('top');
  const [petSheetVisible, setPetSheetVisible] = useState(false);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates?.height ?? 0));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  /* ── Query (shared with the post page's comment list) ── */
  const commentsQueryKey = ['comments', postId] as const;
  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: () => socialApi.getComments(postId as string),
    enabled: !!postId,
  });

  // Frozen sort order (see commentTree.buildOrderRank): only re-snapshots when
  // the comment set or sort tab changes — likes never reorder the list.
  const commentIdsKey = useMemo(
    () => (commentsData?.comments ?? []).map((c: any) => c.comment_id).join(','),
    [commentsData]
  );
  const orderRank = useMemo(
    () => buildOrderRank(commentsData?.comments ?? [], sortBy),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the id set, not live like counts
    [commentIdsKey, sortBy]
  );

  /* ── Locate the focused comment + its (re-based) subtree ── */
  const { focused, flatComments } = useMemo(() => {
    const fullTree = buildTree(commentsData?.comments ?? []);
    const node = findComment(fullTree, id as string);
    if (!node) return { focused: null, flatComments: [] as FlatComment[] };
    // Re-base so the focused comment's direct replies start at display depth 0.
    const rebased = rebaseTree(node.replies, node.depth + 1);
    return { focused: node, flatComments: flatten(sortTreeByRank(rebased, orderRank), expanded) };
  }, [commentsData, id, expanded, orderRank]);

  /* ── Comment/reply like — optimistic (same cache the post page uses) ── */
  const toggleCommentLike = useMutation({
    mutationFn: (commentId: string) => socialApi.toggleCommentLike(commentId),
    onMutate: async (commentId: string) => {
      await queryClient.cancelQueries({ queryKey: commentsQueryKey });
      const previous = queryClient.getQueryData<{ comments: any[] }>(commentsQueryKey);
      queryClient.setQueryData(commentsQueryKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          comments: old.comments.map((c: any) =>
            String(c.comment_id) === commentId
              ? {
                  ...c,
                  is_liked: !c.is_liked,
                  like_count: Math.max(0, (c.like_count || 0) + (c.is_liked ? -1 : 1)),
                }
              : c
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _commentId, context) => {
      if (context?.previous) queryClient.setQueryData(commentsQueryKey, context.previous);
    },
  });

  const handleToggleCommentLike = useCallback((commentId: string) => {
    toggleCommentLike.mutate(commentId);
  }, [toggleCommentLike]);

  const handleContinueThread = useCallback((commentId: string) => {
    router.push({ pathname: '/thread/[id]', params: { id: commentId, postId: String(postId) } });
  }, [router, postId]);

  /* ── Reply draft — defaults to replying to the focused comment ── */
  const draft = useCommentDraft({
    postId: postId as string,
    onPosted: () => {
      setReplyingTo(null);
      setComposerExpanded(false);
      inputRef.current?.blur();
    },
  });

  const mentionActive = draft.mentionTriggers.mention.keyword !== undefined;

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

  // Replies always attach to at least the focused comment (the thread root).
  const handleSend = useCallback(() => {
    if (!draft.canSubmit) return;
    draft.submit(replyingTo?.comment_id ?? (id as string));
  }, [draft, replyingTo, id]);

  /* ── List assembly ── */
  const listData = useMemo(() => {
    if (!focused) return [];
    let commentItems: any[];
    if (commentsLoading) {
      commentItems = [0, 1].map((i) => ({ type: 'comment-skeleton', key: `skeleton-${i}` }));
    } else if (flatComments.length === 0) {
      commentItems = [{ type: 'empty', key: 'empty' }];
    } else {
      commentItems = flatComments.map(c => ({ type: 'comment', key: c.comment_id, data: c }));
    }
    return [
      { type: 'focused', key: 'focused' },
      { type: 'sort', key: 'sort' },
      ...commentItems,
    ];
  }, [focused, flatComments, commentsLoading]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    switch (item.type) {
      case 'focused':
        return (
          <FocusedCommentHeader
            comment={focused!}
            onReply={openComposer}
            onToggleLike={() => handleToggleCommentLike(focused!.comment_id)}
            onOpenProfile={setSelectedUserId}
          />
        );
      case 'sort':
        return <SortSelector value={sortBy} onChange={setSortBy} />;
      case 'empty':
        return <EmptyComments label="No replies yet" hint="Be the first to reply" />;
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
  }, [focused, handleReply, handleExpand, handleToggleCommentLike, handleContinueThread, openComposer, sortBy]);

  /* ── Header (shared by all states) ── */
  const Navbar = (
    <View style={{
      backgroundColor: BG, paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: 12,
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6',
    }}>
      <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={24} color="#111" />
      </TouchableOpacity>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', flex: 1 }}>Thread</Text>
    </View>
  );

  /* ── Loading / Not found ── */
  if (commentsLoading && !focused) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        {Navbar}
        <CommentRowSkeleton />
        <CommentRowSkeleton />
      </View>
    );
  }

  if (!focused) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        {Navbar}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Ionicons name="chatbubbles-outline" size={48} color="#E0E0E0" />
          <Text style={{ color: '#999', marginTop: 12, textAlign: 'center', fontSize: 15 }}>
            This thread is unavailable.
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: PRIMARY }}>
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
      {Navbar}

      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={item => item.key}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 72 + insets.bottom, backgroundColor: BG }}
        style={{ flex: 1, backgroundColor: BG }}
      />

      {/* ── Phase 1: collapsed reply bar ── */}
      {!composerExpanded && (
        <View style={{
          backgroundColor: BG,
          borderTopWidth: 0.5,
          borderTopColor: '#F3F4F6',
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
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
              <Text style={{ fontSize: 14, color: '#C4C4C4' }}>Reply to {focused.author_name}</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Phase 2: floating composer ── */}
      {composerExpanded && (
        <>
          <Pressable
            onPress={collapseComposer}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
          />

          <View style={{
            position: 'absolute', left: 0, right: 0,
            top: mentionActive ? insets.top + 48 : undefined,
            bottom: Platform.OS === 'ios' ? keyboardHeight : 0,
            zIndex: 50, elevation: 24,
            backgroundColor: BG,
            borderTopWidth: 0.5, borderTopColor: '#F3F4F6',
            shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.1, shadowRadius: 10,
            paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : (insets.bottom > 0 ? insets.bottom : 8),
          }}>
            <View style={{ flex: mentionActive ? 1 : undefined }}>
              {/* On a thread page you're always replying to at least the focused
                  root, so the banner shows by default; the ✕ only appears when a
                  more specific reply target was picked, to reset back to root. */}
              {!mentionActive && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 16, paddingVertical: 8,
                  backgroundColor: '#fdf0f2',
                  borderBottomWidth: 0.5, borderBottomColor: '#f5d0d8',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="return-down-forward-outline" size={14} color={PRIMARY} />
                    <Text style={{ fontSize: 12, color: PRIMARY, fontWeight: '600' }}>
                      Replying to {(replyingTo?.author_name) ?? focused.author_name}
                    </Text>
                  </View>
                  {replyingTo && (
                    <TouchableOpacity
                      onPress={() => { setReplyingTo(null); draft.setText(''); }}
                      hitSlop={10}
                    >
                      <Ionicons name="close" size={16} color={PRIMARY} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
                <View style={{ flexDirection: 'row' }}>
                  <Avatar name={user?.name || 'U'} uri={user?.profile_image_url} size={32} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <TextInput
                      ref={inputRef}
                      {...draft.mentionInputProps}
                      placeholder={`Reply to ${(replyingTo?.author_name) ?? focused.author_name}...`}
                      placeholderTextColor="#C4C4C4"
                      style={{ fontSize: 15, color: '#111', minHeight: mentionActive ? undefined : 40, maxHeight: 120, textAlignVertical: 'top', paddingTop: 8 }}
                      multiline
                      autoFocus
                    />
                  </View>
                </View>
              </View>

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

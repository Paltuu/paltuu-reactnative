// app/post/[id].tsx
// Root-stack post detail. Lives outside the (app) tab group so it slides in
// from the right and covers the bottom tab bar. Shows the post + ALL replies,
// with a phase-1 (collapsed) → phase-2 (expanded, full composer) reply box.
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Pressable,
  TextInput, Platform, Keyboard,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi } from '../../src/api/social';
import { useAuthStore } from '../../src/stores/authStore';
import PostCard from '../../src/components/social/PostCard';
import { QuickProfileModal } from '../../src/components/social/QuickProfileModal';
import {
  useCommentDraft,
  ComposerToolbar,
  ComposerMediaGrid,
  ComposerPetSelector,
} from '../../src/components/social/CommentComposer';

const PRIMARY = '#A03048';
const MUTED = '#C4C4C4';
const BG = '#fff';

const PostIcons = {
  pawSelect: require('../../assets/icons/paw-like-select.svg'),
  pawUnselect: require('../../assets/icons/paw-like-unselect.svg'),
};

/* ── Helpers ── */
const formatTime = (dateStr: string) => {
  try {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateStr).toLocaleDateString();
  } catch { return 'now'; }
};

/* ── Types ── */
interface Comment {
  comment_id: string;
  author_name: string;
  author_image: string | null;
  social_username: string | null;
  content: string;
  created_at: string;
  like_count: number;
  liked?: boolean;
  depth: number;
  parent_comment_id: string | null;
  replies: Comment[];
}

interface FlatComment extends Comment {
  parentId?: string;
  isCollapsed?: boolean;
  collapsedCount?: number;
}

/* ── Build comment tree ── */
const buildTree = (flat: any[]): Comment[] => {
  const map: Record<string, Comment> = {};
  const roots: Comment[] = [];
  flat.forEach(c => { map[c.comment_id] = { ...c, replies: [] }; });
  flat.forEach(c => {
    if (c.parent_comment_id && map[c.parent_comment_id]) {
      map[c.parent_comment_id].replies.push(map[c.comment_id]);
    } else {
      roots.push(map[c.comment_id]);
    }
  });
  return roots;
};

/* ── Flatten with collapse state ── */
const flatten = (comments: Comment[], expanded: Set<string>, parentId?: string): FlatComment[] => {
  const result: FlatComment[] = [];
  for (const c of comments) {
    result.push({ ...c, parentId });
    if (c.replies.length > 0) {
      if (expanded.has(c.comment_id)) {
        result.push(...flatten(c.replies, expanded, c.comment_id));
      } else {
        result.push({
          ...c,
          comment_id: `${c.comment_id}-stub`,
          content: '',
          isCollapsed: true,
          collapsedCount: c.replies.length,
          depth: c.depth + 1,
          replies: [],
          parentId: c.comment_id,
        });
      }
    }
  }
  return result;
};

/* ── Avatar ── */
const Avatar = ({ name, uri, size = 36 }: { name: string; uri?: string | null; size?: number }) => {
  const initials = (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const palettes = [
    { bg: '#fdf0f2', text: PRIMARY },
    { bg: '#f0fdf4', text: '#059669' },
    { bg: '#f5f3ff', text: '#7c3aed' },
    { bg: '#f0f9ff', text: '#0ea5e9' },
  ];
  const p = palettes[(name || 'U').charCodeAt(0) % 4];
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.34, fontWeight: '700', color: p.text }}>{initials}</Text>
    </View>
  );
};

/* ── Comments section header ── */
const CommentsHeader = ({ count }: { count: number }) => (
  <View style={{
    paddingHorizontal: 16, paddingVertical: 11,
    backgroundColor: BG,
    borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6',
  }}>
    <Text style={{ fontSize: 12, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8 }}>
      COMMENTS · {count}
    </Text>
  </View>
);

/* ── Depth line colors ── */
const DEPTH_COLORS = [MUTED, PRIMARY, '#7c3aed', '#059669', '#0ea5e9'];

/* ── Single comment ── */
const CommentRow = ({
  item, onReply, onToggleLike, onExpand,
}: {
  item: FlatComment;
  onReply: (c: FlatComment) => void;
  onToggleLike: (id: string) => void;
  onExpand: (id: string) => void;
}) => {
  const depth = Math.min(item.depth, 4);
  const lineColor = DEPTH_COLORS[depth % DEPTH_COLORS.length];

  /* Collapsed stub */
  if (item.isCollapsed) {
    return (
      <TouchableOpacity
        onPress={() => onExpand(item.parentId!)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 8,
          paddingLeft: 16 + (depth - 1) * 32 + 34 + 10,
          backgroundColor: BG,
          gap: 12,
        }}
      >
        <View style={{ width: 32, height: 1, backgroundColor: '#DBDBDB' }} />
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#8E8E8E' }}>
          View {item.collapsedCount} {item.collapsedCount === 1 ? 'reply' : 'replies'}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ backgroundColor: BG, paddingVertical: 10, paddingHorizontal: 16, paddingLeft: 16 + depth * 32 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>

        {/* Left Side: Avatar + Thread Guideline Line */}
        <View style={{ alignItems: 'center', marginRight: 10, width: 34 }}>
          <Avatar name={item.author_name} uri={item.author_image} size={32} />
          {depth > 0 && (
            <View style={{
              position: 'absolute',
              top: 36,
              bottom: -20,
              width: 1.5,
              backgroundColor: lineColor,
              opacity: 0.7,
            }} />
          )}
        </View>

        {/* Middle/Content Side */}
        <View style={{ flex: 1, marginRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#111' }}>
              {item.author_name}
            </Text>
            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>• {formatTime(item.created_at)}</Text>
          </View>

          <Text style={{ fontSize: 14, color: '#262626', lineHeight: 18 }}>
            {item.content}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <TouchableOpacity onPress={() => onReply(item)} hitSlop={8}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#8E8E8E' }}>Reply</Text>
            </TouchableOpacity>

            {item.replies?.length > 0 && (
              <TouchableOpacity onPress={() => onExpand(item.comment_id)} hitSlop={8}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#8E8E8E' }}>Hide</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Right Side: Like button */}
        <TouchableOpacity
          onPress={() => onToggleLike(item.comment_id)}
          style={{ alignItems: 'center', justifyContent: 'center', padding: 6, minWidth: 28 }}
          hitSlop={8}
        >
          <Image
            source={item.liked ? PostIcons.pawSelect : PostIcons.pawUnselect}
            style={{ width: 14, height: 14 }}
            contentFit="contain"
          />
          {item.like_count > 0 && (
            <Text style={{ fontSize: 10, fontWeight: '600', color: item.liked ? PRIMARY : '#8E8E8E', marginTop: 2 }}>
              {item.like_count}
            </Text>
          )}
        </TouchableOpacity>

      </View>
    </View>
  );
};

/* ── Empty comments ── */
const EmptyComments = () => (
  <View style={{ alignItems: 'center', paddingTop: 48, paddingBottom: 24, gap: 8 }}>
    <Ionicons name="chatbubble-outline" size={36} color={MUTED} />
    <Text style={{ fontSize: 14, fontWeight: '600', color: '#9CA3AF' }}>No comments yet</Text>
    <Text style={{ fontSize: 13, color: MUTED }}>Be the first to comment</Text>
  </View>
);

/* ─────────────────── Main screen ─────────────────── */
export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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

  // Track keyboard height so the floating composer can stick directly above it.
  // (Android defaults to adjustResize, so the window already excludes the keyboard
  // and we anchor to bottom: 0 there; iOS needs the explicit offset.)
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates?.height ?? 0));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  /* ── Queries ── */
  const { data: postData, isLoading: postLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => socialApi.getPostById(id as string),
    enabled: !!id,
  });

  const { data: commentsData } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => socialApi.getComments(id as string),
    enabled: !!id,
  });

  /* ── Reply draft (shared composer logic) ── */
  const draft = useCommentDraft({
    postId: id as string,
    onPosted: () => {
      setReplyingTo(null);
      setComposerExpanded(false);
      inputRef.current?.blur();
    },
  });

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
    draft.setText(`@${comment.social_username ?? comment.author_name} `);
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
  const flatComments = useMemo(() => {
    const tree = buildTree(commentsData?.comments ?? []);
    return flatten(tree, expanded);
  }, [commentsData, expanded]);

  const listData = useMemo(() => {
    if (!postData) return [];
    return [
      { type: 'post', key: 'post' },
      { type: 'comments_header', key: 'ch' },
      ...(flatComments.length === 0
        ? [{ type: 'empty', key: 'empty' }]
        : flatComments.map(c => ({ type: 'comment', key: c.comment_id, data: c }))),
    ];
  }, [postData, flatComments]);

  /* ── Render item ── */
  const renderItem = useCallback(({ item }: { item: any }) => {
    switch (item.type) {
      case 'post': {
        const hasUserCommented = !!commentsData?.comments?.some(
          (c: any) => String(c.user_id) === String(user?.id)
        );
        const postWithCommentState = postData
          ? { ...postData, is_commented: postData.is_commented || hasUserCommented }
          : null;

        return (
          <>
            <PostCard
              post={postWithCommentState!}
              onPress={() => {}}
              onComment={openComposer}
              onPlusPress={(uid) => setSelectedUserId(uid)}
            />
            <View style={{ height: 1.5, backgroundColor: '#E5E7EB' }} />
          </>
        );
      }
      case 'comments_header':
        return <CommentsHeader count={flatComments.length} />;
      case 'empty':
        return <EmptyComments />;
      case 'comment':
        return (
          <CommentRow
            item={item.data}
            onReply={handleReply}
            onToggleLike={() => {/* wire up comment like */}}
            onExpand={handleExpand}
          />
        );
      default:
        return null;
    }
  }, [postData, commentsData, flatComments, handleReply, handleExpand, openComposer, user?.id]);

  /* ── Loading ── */
  if (postLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" />

      {/* ── Navbar ── */}
      <View style={{
        backgroundColor: BG,
        paddingTop: insets.top,
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
      />

      {/* ── Phase 1: collapsed reply bar (in-flow, anchored to the bottom) ── */}
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
            bottom: Platform.OS === 'ios' ? keyboardHeight : 0,
            zIndex: 50, elevation: 24,
            backgroundColor: BG,
            borderTopWidth: 0.5, borderTopColor: '#F3F4F6',
            shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.1, shadowRadius: 10,
            paddingBottom: Platform.OS === 'ios' ? 8 : (insets.bottom > 0 ? insets.bottom : 8),
          }}>
            {/* Reply banner (replying to a specific comment) */}
            {replyingTo && (
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

            {/* Text field + pet tagger (above the toolbar) */}
            <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
              <View style={{ flexDirection: 'row' }}>
                <Avatar name={user?.name || 'U'} uri={user?.profile_image_url} size={32} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <TextInput
                    ref={inputRef}
                    value={draft.text}
                    onChangeText={draft.setText}
                    placeholder={replyingTo ? `Reply to ${replyingTo.author_name}...` : 'Post your reply'}
                    placeholderTextColor="#C4C4C4"
                    style={{ fontSize: 15, color: '#111', minHeight: 40, maxHeight: 120, textAlignVertical: 'top', paddingTop: 8 }}
                    multiline
                    autoFocus
                  />
                  <ComposerMediaGrid media={draft.media} onRemove={draft.removeMedia} />
                  <ComposerPetSelector
                    petProfiles={draft.petProfiles}
                    selectedPets={draft.selectedPets}
                    onToggle={draft.togglePet}
                  />
                </View>
              </View>
            </View>

            {/* Toolbar / quick-access bar + Reply — stuck to the keyboard */}
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6,
            }}>
              <ComposerToolbar
                onImage={draft.pickImage}
                onCamera={draft.pickCamera}
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
          </View>
        </>
      )}

      <QuickProfileModal
        userId={selectedUserId}
        visible={selectedUserId !== null}
        onClose={() => setSelectedUserId(null)}
      />
    </View>
  );
}

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
import { timeAgo as formatTime } from '../../src/utils/timeAgo';
import { useAuthStore } from '../../src/stores/authStore';
import PostCard from '../../src/components/social/PostCard';
import { PostCardSkeleton } from '../../src/components/social/PostCardSkeleton';
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
import { MentionText } from '../../src/components/social/MentionText';
import { NO_PROFILE_IMAGE } from '../../src/constants/images';

type SortBy = 'top' | 'newest' | 'oldest';
const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'top', label: 'Top' },
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
];

const PRIMARY = '#A03048';
const MUTED = '#C4C4C4';
const BG = '#fff';

const PostIcons = {
  pawSelect: require('../../assets/icons/paw-like-select.svg'),
  pawUnselect: require('../../assets/icons/paw-like-unselect.svg'),
};

/* ── Helpers ── */

/* ── Types ── */
interface CommentMedia {
  media_type: 'image' | 'video';
  url: string;
  thumbnail_url: string | null;
  ordering: number;
}

interface Comment {
  comment_id: string;
  user_id: number;
  author_name: string;
  author_image: string | null;
  social_username: string | null;
  content: string;
  created_at: string;
  like_count: number;
  liked?: boolean;
  depth: number;
  parent_comment_id: string | null;
  media?: CommentMedia[];
  replies: Comment[];
}

interface ReplyAvatar {
  id: number;
  uri: string | null;
  name: string;
}

interface FlatComment extends Comment {
  parentId?: string;
  isCollapsed?: boolean;
  collapsedCount?: number;
  isLastSibling?: boolean;
  ancestorContinues?: boolean[];
  hasChildrenBelow?: boolean;
  replyAvatars?: ReplyAvatar[];
  hiddenCount?: number;
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

/* ── Gather every descendant of a comment (whole subtree, depth-first) ── */
const collectDescendants = (replies: Comment[]): Comment[] => {
  const out: Comment[] = [];
  for (const r of replies) {
    out.push(r);
    if (r.replies?.length) out.push(...collectDescendants(r.replies));
  }
  return out;
};

/* Unique participants in a subtree (self-repliers dedup'd), most-recent first
 * so the freshest faces surface on the collapsed stub. */
const subtreeAvatars = (descendants: Comment[], max = 3): ReplyAvatar[] => {
  const seen = new Set<number>();
  const avatars: ReplyAvatar[] = [];
  const ordered = [...descendants].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  for (const d of ordered) {
    if (seen.has(d.user_id)) continue;
    seen.add(d.user_id);
    avatars.push({ id: d.user_id, uri: d.author_image, name: d.author_name });
    if (avatars.length >= max) break;
  }
  return avatars;
};

/* ── Flatten with collapse state ──
 * Tracks, per row, which ancestor levels still have a sibling coming up
 * after this row's subtree (so their trunk line must keep running through
 * it) and whether this row is the last child of its own parent (so its
 * own connector ends in a curve instead of continuing further down). */
const flatten = (
  comments: Comment[],
  expanded: Set<string>,
  parentId?: string,
  ancestorContinues: boolean[] = [],
): FlatComment[] => {
  const result: FlatComment[] = [];
  comments.forEach((c, i) => {
    const isLastSibling = i === comments.length - 1;
    const hasChildrenBelow = c.replies.length > 0; // expanded children OR a collapsed stub follows
    result.push({ ...c, parentId, ancestorContinues, isLastSibling, hasChildrenBelow });
    if (c.replies.length > 0) {
      if (expanded.has(c.comment_id)) {
        result.push(...flatten(c.replies, expanded, c.comment_id, [...ancestorContinues, !isLastSibling]));
      } else {
        // Everyone hidden under this comment — count the whole subtree and
        // surface a few faces so the stub reads as "lots going on in here".
        const descendants = collectDescendants(c.replies);
        result.push({
          ...c,
          comment_id: `${c.comment_id}-stub`,
          content: '',
          isCollapsed: true,
          collapsedCount: c.replies.length,
          hiddenCount: descendants.length,
          replyAvatars: subtreeAvatars(descendants),
          depth: c.depth + 1,
          replies: [],
          parentId: c.comment_id,
          // The stub sits where an expanded child would, so it needs the same
          // extended spine context to draw its own elbow off the parent.
          ancestorContinues: [...ancestorContinues, !isLastSibling],
          isLastSibling: true,
          hasChildrenBelow: false,
        });
      }
    }
  });
  return result;
};

/* ── Avatar ── */
const Avatar = ({ name, uri, size = 36 }: { name: string; uri?: string | null; size?: number }) => (
  <Image
    source={uri ? { uri } : NO_PROFILE_IMAGE}
    style={{ width: size, height: size, borderRadius: size / 2 }}
    contentFit="cover"
  />
);

/* ── Sort selector (sits between the post and the comments) ── */
const SortSelector = ({ value, onChange }: { value: SortBy; onChange: (v: SortBy) => void }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: BG }}>
    {SORT_OPTIONS.map((opt) => {
      const active = opt.key === value;
      return (
        <TouchableOpacity
          key={opt.key}
          onPress={() => onChange(opt.key)}
          activeOpacity={0.7}
          style={{
            paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
            backgroundColor: active ? '#fdf0f2' : '#F3F4F6',
          }}
        >
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: active ? PRIMARY : '#6B7280' }}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

/* ── Thread lines ──
 * Each nesting level L owns a vertical "spine" at x = avatarCenterX(L).
 * A parent at depth L connects to its children (depth L+1) by running that
 * spine down from its own avatar and curving an elbow into each child.
 * A given row therefore draws three kinds of segment:
 *   1. pass-through spines — ancestor columns that still have a sibling
 *      queued after this whole subtree, so their line keeps running down;
 *   2. its own elbow — curves in from the parent's spine to this avatar,
 *      and (unless this is the last sibling) continues the parent spine
 *      straight down past it to reach the next sibling;
 *   3. a downward spine from its own avatar when it has visible children.
 */
const LINE_COLOR = '#D9DADC';
const LINE_W = 2;
const AVATAR = 32;
const ROW_PAD_V = 10;
const AVATAR_CENTER_Y = ROW_PAD_V + AVATAR / 2; // 26
const COL_STEP = 24;
const CURVE_R = 12;
// Matches the row's paddingLeft (16 + depth*COL_STEP) + avatar half-width.
const avatarCenterX = (level: number) => 16 + level * COL_STEP + AVATAR / 2;

const vLine = (key: string, x: number, top: number, bottom: number) => (
  <View
    key={key}
    style={{ position: 'absolute', left: x - LINE_W / 2, top, bottom, width: LINE_W, backgroundColor: LINE_COLOR }}
  />
);

const ThreadLines = ({
  depth, ancestorContinues, isLastSibling, hasChildrenBelow,
}: {
  depth: number;
  ancestorContinues: boolean[];
  isLastSibling: boolean;
  hasChildrenBelow: boolean;
}) => {
  const parts: React.ReactNode[] = [];

  // 1. Pass-through ancestor spines. Column L keeps running through this row
  //    when the ancestor-subtree we're inside (at level L+1) has a later sibling.
  for (let level = 0; level <= depth - 2; level++) {
    if (ancestorContinues[level + 1]) {
      parts.push(vLine(`pass-${level}`, avatarCenterX(level), 0, 0));
    }
  }

  // 2. This row's elbow curving off the parent spine, + parent-spine continuation.
  if (depth >= 1) {
    const fromX = avatarCenterX(depth - 1);
    const toX = avatarCenterX(depth);
    parts.push(
      <View
        key="elbow"
        style={{
          position: 'absolute',
          left: fromX - LINE_W / 2,
          top: 0,
          width: toX - fromX + LINE_W / 2,
          height: AVATAR_CENTER_Y,
          borderLeftWidth: LINE_W,
          borderBottomWidth: LINE_W,
          borderColor: LINE_COLOR,
          borderBottomLeftRadius: CURVE_R,
        }}
      />
    );
    // Not the last sibling → the parent spine flows straight past, down to the next one.
    if (!isLastSibling) {
      parts.push(vLine('parent-continue', fromX, 0, 0));
    }
  }

  // 3. Downward spine from this row's own avatar to its first child.
  if (hasChildrenBelow) {
    parts.push(vLine('down', avatarCenterX(depth), AVATAR_CENTER_Y, 0));
  }

  if (parts.length === 0) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
      {parts}
    </View>
  );
};

/* ── Read-only media grid for a posted comment/reply ── */
const CommentMediaGrid = ({ media }: { media?: CommentMedia[] }) => {
  if (!media || media.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
      {media.map((m, i) => (
        <View key={`${m.url}-${i}`} style={{ width: 96, height: 96, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F3F4F6' }}>
          <Image
            source={{ uri: m.thumbnail_url || m.url }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        </View>
      ))}
    </View>
  );
};

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
  const indent = 16 + depth * 24;
  const ancestorContinues = item.ancestorContinues ?? [];
  const threadProps = {
    depth,
    ancestorContinues,
    isLastSibling: item.isLastSibling ?? true,
    hasChildrenBelow: item.hasChildrenBelow ?? false,
  };

  /* Collapsed stub — sits directly on the parent's own spine (not indented a
     level deeper), so it's unmistakably that comment's hidden thread. The
     parent's grey line drops straight down into a little cluster of the faces
     hidden underneath, followed by the count. */
  if (item.isCollapsed) {
    const avatars = item.replyAvatars ?? [];
    const AV = 22;
    const parentDepth = Math.max(depth - 1, 0);
    const spineX = avatarCenterX(parentDepth);

    // Ancestor spines that must keep running past this row, plus the short
    // connector segment that drops from the parent avatar into the cluster.
    const lines: React.ReactNode[] = [];
    for (let level = 0; level <= depth - 2; level++) {
      if (ancestorContinues[level + 1]) lines.push(vLine(`pass-${level}`, avatarCenterX(level), 0, 0));
    }

    return (
      // Background lives on the outer container (not the touchable) so the spine
      // lines paint on top of it and stay visible through the transparent row —
      // otherwise an opaque row background would cover the continuing left line.
      <View style={{ position: 'relative', backgroundColor: BG }}>
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
          {lines}
          {/* connector from parent spine into the avatar cluster (terminates behind it) */}
          <View style={{ position: 'absolute', left: spineX - LINE_W / 2, top: 0, height: AVATAR_CENTER_Y, width: LINE_W, backgroundColor: LINE_COLOR }} />
        </View>
        <TouchableOpacity
          onPress={() => onExpand(item.parentId!)}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingTop: 13,
            paddingBottom: 12,
            paddingLeft: spineX - 1.5 - AV / 2, // first avatar centers on the parent spine
          }}
        >
          {avatars.length > 0 && (
            <View style={{ flexDirection: 'row' }}>
              {avatars.map((a, i) => (
                <View
                  key={a.id}
                  style={{
                    marginLeft: i === 0 ? 0 : -9,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: BG,
                    zIndex: avatars.length - i,
                  }}
                >
                  <Avatar name={a.name} uri={a.uri} size={AV} />
                </View>
              ))}
            </View>
          )}
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#4B5563' }}>
            View {item.collapsedCount} {item.collapsedCount === 1 ? 'reply' : 'replies'}
          </Text>
          <Ionicons name="chevron-down" size={13} color="#9CA3AF" style={{ marginLeft: -2 }} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ position: 'relative', backgroundColor: BG, paddingVertical: 10, paddingHorizontal: 16, paddingLeft: indent }}>
      <ThreadLines {...threadProps} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>

        {/* Left Side: Avatar */}
        <View style={{ marginRight: 10 }}>
          <Avatar name={item.author_name} uri={item.author_image} size={32} />
        </View>

        {/* Middle/Content Side */}
        <View style={{ flex: 1, marginRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#111' }}>
              {item.author_name}
            </Text>
            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>• {formatTime(item.created_at)}</Text>
          </View>

          <MentionText content={item.content} textStyle={{ fontSize: 14, color: '#262626', lineHeight: 18 }} />

          <CommentMediaGrid media={item.media} />

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
  const [sortBy, setSortBy] = useState<SortBy>('top');
  const [petSheetVisible, setPetSheetVisible] = useState(false);

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
  const { data: postData, isLoading: postLoading, isError: postError } = useQuery({
    queryKey: ['post', id],
    queryFn: () => socialApi.getPostById(id as string),
    enabled: !!id,
    retry: 1,
  });

  const { data: commentsData, isLoading: commentsLoading } = useQuery({
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
  const flatComments = useMemo(() => {
    const tree = buildTree(commentsData?.comments ?? []);
    const cmp = (a: Comment, b: Comment) => {
      if (sortBy === 'top') {
        return (b.like_count || 0) - (a.like_count || 0) ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // newest
    };
    const sortRec = (list: Comment[]): Comment[] => {
      list.sort(cmp);
      list.forEach((c) => sortRec(c.replies));
      return list;
    };
    return flatten(sortRec(tree), expanded);
  }, [commentsData, expanded, sortBy]);

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
      { type: 'sort', key: 'sort' },
      ...commentItems,
    ];
  }, [postData, flatComments, commentsLoading]);

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
      case 'sort':
        return <SortSelector value={sortBy} onChange={setSortBy} />;
      case 'empty':
        return <EmptyComments />;
      case 'comment-skeleton':
        return <CommentRowSkeleton />;
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
  }, [postData, commentsData, handleReply, handleExpand, openComposer, user?.id, sortBy]);

  /* ── Loading / Error ── */
  if (postLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <View style={{
          backgroundColor: BG, paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: 12,
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
      <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
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
            // While a mention is active, the box expands upward (stopping
            // just below the navbar) so the suggestion list has room to
            // fill all the way down to the keyboard, full width.
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

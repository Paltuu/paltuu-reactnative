// src/components/social/commentTree.tsx
// Shared comment-thread rendering used by BOTH the post detail page
// (app/post/[id].tsx) and the re-rooted comment detail page (app/thread/[id].tsx).
//
// Nesting is capped at MAX_INLINE_DEPTH. A comment at that depth that still has
// replies doesn't expand inline — instead it renders a "Continue this thread"
// row that navigates to a focused comment page where that comment becomes the
// new root (depth 0), giving the thread a fresh indentation budget.
import React from 'react';
import { View, Text, TouchableOpacity, Pressable, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { timeAgo as formatTime } from '../../utils/timeAgo';
import { MentionText } from './MentionText';
import { NO_PROFILE_IMAGE } from '../../constants/images';
import { usePostCardModals } from '../../context/PostCardModalsContext';

export const PRIMARY = '#A03048';
export const MUTED = '#C4C4C4';
export const BG = '#fff';

// Deepest display depth rendered with full inline nesting. Beyond this, a
// comment's replies are reached via a focused thread page instead.
export const MAX_INLINE_DEPTH = 3;

const PostIcons = {
  pawSelect: require('../../../assets/icons/paw-like-select.svg'),
  pawUnselect: require('../../../assets/icons/paw-like-unselect.svg'),
  verified: require('../../../assets/icons/verified-check-svgrepo-com.svg'),
};

/* ── Types ── */
export interface CommentMedia {
  media_type: 'image' | 'video';
  url: string;
  thumbnail_url: string | null;
  ordering: number;
}

export interface Comment {
  comment_id: string;
  user_id: number;
  author_name: string;
  author_image: string | null;
  social_username: string | null;
  author_verified?: boolean;
  content: string;
  created_at: string;
  like_count: number;
  is_liked?: boolean;
  depth: number;
  parent_comment_id: string | null;
  media?: CommentMedia[];
  replies: Comment[];
  /** Optimistically inserted by the composer and not yet confirmed by the
   *  server. Its media URLs are still local file:// paths and its comment_id is
   *  a temp string, so its actions are inert until it solidifies. */
  _pending?: boolean;
}

export interface ReplyAvatar {
  id: number;
  uri: string | null;
  name: string;
}

export interface FlatComment extends Comment {
  parentId?: string;
  isCollapsed?: boolean;
  isContinueThread?: boolean;
  targetCommentId?: string;
  collapsedCount?: number;
  isLastSibling?: boolean;
  ancestorContinues?: boolean[];
  hasChildrenBelow?: boolean;
  replyAvatars?: ReplyAvatar[];
  hiddenCount?: number;
}

// Comments are always ordered by "Top" (most-liked first). Kept as a
// single-member union so shared components can still take a `sortBy` prop.
export type SortBy = 'top';

/* ── Build comment tree from a flat list ── */
export const buildTree = (flat: any[]): Comment[] => {
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

/* ── Find a node anywhere in a tree by comment_id ── */
export const findComment = (nodes: Comment[], id: string): Comment | null => {
  for (const n of nodes) {
    if (String(n.comment_id) === String(id)) return n;
    const found = findComment(n.replies, id);
    if (found) return found;
  }
  return null;
};

/* ── Re-base a subtree's depths so its roots start at 0 (for the thread page) ── */
export const rebaseTree = (nodes: Comment[], offset: number): Comment[] =>
  nodes.map(n => ({ ...n, depth: n.depth - offset, replies: rebaseTree(n.replies, offset) }));

/* ── Gather every descendant of a comment (whole subtree, depth-first) ── */
export const collectDescendants = (replies: Comment[]): Comment[] => {
  const out: Comment[] = [];
  for (const r of replies) {
    out.push(r);
    if (r.replies?.length) out.push(...collectDescendants(r.replies));
  }
  return out;
};

/* Unique participants in a subtree (self-repliers dedup'd), most-recent first
 * so the freshest faces surface on the collapsed / continue-thread stub. */
export const subtreeAvatars = (descendants: Comment[], max = 3): ReplyAvatar[] => {
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

/* ── Stable ordering ──
 * Sorting is snapshotted into a rank map (comment_id → position) so it only
 * changes when the comment *set* changes or the sort tab changes — NOT when a
 * like optimistically bumps a count. That keeps a comment from jumping to the
 * top of the "Top" tab the instant you like it; the new order is applied the
 * next time the page is opened / the comment set changes.
 */
export const buildOrderRank = (comments: any[], _sortBy: SortBy): Map<string, number> => {
  // "Top": most-interactions first (likes + replies), oldest breaking ties.
  // Oldest-first on a tie is what puts a brand-new comment (0 interactions,
  // the newest timestamp in the zero-interaction group, which is itself the
  // lowest-scoring group) at the very bottom of the list.
  const replyCount = new Map<string, number>();
  comments.forEach((c) => {
    if (c.parent_comment_id == null) return;
    const key = String(c.parent_comment_id);
    replyCount.set(key, (replyCount.get(key) || 0) + 1);
  });
  const score = (c: any) => (c.like_count || 0) + (replyCount.get(String(c.comment_id)) || 0);
  const cmp = (a: any, b: any) =>
    score(b) - score(a) ||
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  const rank = new Map<string, number>();
  [...comments].sort(cmp).forEach((c, i) => rank.set(String(c.comment_id), i));
  return rank;
};

/* Sort each sibling group in a tree by a frozen rank map (see buildOrderRank).
 * A total order restricted to any sibling subset preserves relative order, so
 * this reproduces the intended per-level ordering. New comments not yet in the
 * map sink to the end until the next rank snapshot. */
export const sortTreeByRank = (roots: Comment[], rank: Map<string, number>): Comment[] => {
  const cmp = (a: Comment, b: Comment) =>
    (rank.get(String(a.comment_id)) ?? Infinity) - (rank.get(String(b.comment_id)) ?? Infinity);
  const rec = (list: Comment[]): Comment[] => {
    list.sort(cmp);
    list.forEach((c) => rec(c.replies));
    return list;
  };
  return rec(roots);
};

/* ── Flatten with collapse state + depth cap ──
 * Tracks, per row, which ancestor levels still have a sibling coming up after
 * this row's subtree (so their trunk line keeps running through it) and whether
 * this row is its parent's last child (so its connector ends in a curve). */
export const flatten = (
  comments: Comment[],
  expanded: Set<string>,
  maxInlineDepth: number = MAX_INLINE_DEPTH,
  parentId?: string,
  ancestorContinues: boolean[] = [],
): FlatComment[] => {
  const result: FlatComment[] = [];
  comments.forEach((c, i) => {
    const isLastSibling = i === comments.length - 1;
    const hasChildrenBelow = c.replies.length > 0; // inline children, a stub, or a continue row follows
    result.push({ ...c, parentId, ancestorContinues, isLastSibling, hasChildrenBelow });

    if (c.replies.length === 0) return;

    // A "sub-stub" row (collapsed OR continue-thread) sits where an expanded
    // child would, so it needs the same extended spine context + subtree faces.
    const descendants = collectDescendants(c.replies);
    const stubBase = {
      ...c,
      content: '',
      collapsedCount: c.replies.length,
      hiddenCount: descendants.length,
      replyAvatars: subtreeAvatars(descendants),
      depth: c.depth + 1,
      replies: [],
      parentId: c.comment_id,
      ancestorContinues: [...ancestorContinues, !isLastSibling],
      isLastSibling: true,
      hasChildrenBelow: false,
    };

    if (c.depth >= maxInlineDepth) {
      // Too deep to keep nesting — offer to continue in a focused thread.
      result.push({ ...stubBase, comment_id: `${c.comment_id}-continue`, isContinueThread: true, targetCommentId: c.comment_id });
    } else if (expanded.has(c.comment_id)) {
      result.push(...flatten(c.replies, expanded, maxInlineDepth, c.comment_id, [...ancestorContinues, !isLastSibling]));
    } else {
      result.push({ ...stubBase, comment_id: `${c.comment_id}-stub`, isCollapsed: true });
    }
  });
  return result;
};

/* ── Avatar ── */
export const Avatar = ({ name, uri, size = 36 }: { name: string; uri?: string | null; size?: number }) => (
  <Image
    source={uri ? { uri } : NO_PROFILE_IMAGE}
    style={{ width: size, height: size, borderRadius: size / 2 }}
    contentFit="cover"
  />
);

/* ── Thread lines ──
 * Each nesting level L owns a vertical "spine" at x = avatarCenterX(L). A parent
 * at depth L connects to its children (L+1) by running that spine down from its
 * avatar and curving an elbow into each child. */
const LINE_COLOR = '#D9DADC';
const LINE_W = 2;
const AVATAR = 32;
const ROW_PAD_V = 10;
const AVATAR_CENTER_Y = ROW_PAD_V + AVATAR / 2; // 26
const COL_STEP = 24;
const CURVE_R = 12;
// Matches the row's paddingLeft (16 + depth*COL_STEP) + avatar half-width.
export const avatarCenterX = (level: number) => 16 + level * COL_STEP + AVATAR / 2;

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

  for (let level = 0; level <= depth - 2; level++) {
    if (ancestorContinues[level + 1]) {
      parts.push(vLine(`pass-${level}`, avatarCenterX(level), 0, 0));
    }
  }

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
    if (!isLastSibling) {
      parts.push(vLine('parent-continue', fromX, 0, 0));
    }
  }

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

/* ── Media grid for a posted comment/reply ──
 * Tapping any item opens the shared full-screen media viewer (same one the post
 * card uses), starting on the tapped item. */
export const CommentMediaGrid = ({ media }: { media?: CommentMedia[] }) => {
  const modals = usePostCardModals();
  if (!media || media.length === 0) return null;
  const viewerItems = media.map((m) => ({
    url: m.url,
    type: m.media_type,
    thumbnail_url: m.thumbnail_url ?? undefined,
  }));
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
      {media.map((m, i) => (
        <TouchableOpacity
          key={`${m.url}-${i}`}
          activeOpacity={0.9}
          onPress={() => modals?.showImageViewer(viewerItems, i)}
          style={{ width: 96, height: 96, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F3F4F6' }}
        >
          <Image
            source={{ uri: m.thumbnail_url || m.url }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
          {m.media_type === 'video' && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="play-circle" size={30} color="rgba(255,255,255,0.9)" />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

/* ── Sub-stub row (collapsed "View N replies" OR "Continue this thread") ──
 * Sits directly on the parent's own spine so it clearly belongs to it. */
const SubStubRow = ({
  item, depth, ancestorContinues, onPress,
}: {
  item: FlatComment;
  depth: number;
  ancestorContinues: boolean[];
  onPress: () => void;
}) => {
  const avatars = item.replyAvatars ?? [];
  const AV = 22;
  const parentDepth = Math.max(depth - 1, 0);
  const spineX = avatarCenterX(parentDepth);
  const isContinue = !!item.isContinueThread;

  const lines: React.ReactNode[] = [];
  for (let level = 0; level <= depth - 2; level++) {
    if (ancestorContinues[level + 1]) lines.push(vLine(`pass-${level}`, avatarCenterX(level), 0, 0));
  }

  return (
    // Background lives on the outer container (not the touchable) so the spine
    // lines paint on top of it and stay visible through the transparent row.
    <View style={{ position: 'relative', backgroundColor: BG }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
        {lines}
        <View style={{ position: 'absolute', left: spineX - LINE_W / 2, top: 0, height: AVATAR_CENTER_Y, width: LINE_W, backgroundColor: LINE_COLOR }} />
      </View>
      <TouchableOpacity
        onPress={onPress}
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
        <Text style={{ fontSize: 13, fontWeight: '700', color: isContinue ? PRIMARY : '#4B5563' }}>
          {isContinue
            ? 'Continue this thread'
            : `View ${item.collapsedCount} ${item.collapsedCount === 1 ? 'reply' : 'replies'}`}
        </Text>
        <Ionicons
          name={isContinue ? 'arrow-forward' : 'chevron-down'}
          size={13}
          color={isContinue ? PRIMARY : '#9CA3AF'}
          style={{ marginLeft: -2 }}
        />
      </TouchableOpacity>
    </View>
  );
};

/* ── Single comment row ── */
export const CommentRow = ({
  item, onReply, onToggleLike, onExpand, onContinueThread, onOpenThread, onOpenProfile,
  onAvatarPress, onDelete, currentUserId,
}: {
  item: FlatComment;
  onReply: (c: FlatComment) => void;
  onToggleLike: (id: string) => void;
  onExpand: (id: string) => void;
  onContinueThread: (commentId: string) => void;
  onOpenThread: (commentId: string) => void;
  onOpenProfile: (userId: number) => void;
  onAvatarPress: (userId: number) => void;
  onDelete?: (id: string) => void;
  currentUserId?: number | string | null;
}) => {
  const depth = Math.min(item.depth, MAX_INLINE_DEPTH + 1);
  // A pending row has no server id yet, so liking / replying / deleting / opening
  // its thread would all address a comment that doesn't exist. Show it, don't
  // let it be acted on — it resolves within a moment.
  const pending = !!item._pending;
  const isOwnComment = !pending && currentUserId != null && String(item.user_id) === String(currentUserId);

  const handleLongPress = () => {
    if (!isOwnComment || !onDelete) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment? Replies to it will be deleted too.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.comment_id) },
      ]
    );
  };
  const indent = 16 + depth * 24;
  const ancestorContinues = item.ancestorContinues ?? [];
  const threadProps = {
    depth,
    ancestorContinues,
    isLastSibling: item.isLastSibling ?? true,
    hasChildrenBelow: item.hasChildrenBelow ?? false,
  };

  // Single tap opens the thread; double tap likes the comment. Distinguishing
  // them (single fires only after the double-tap window lapses) also fixes the
  // fast double-open that used to push the thread route — and mount it — twice.
  //
  // That alone isn't enough: if the second tap lands just *after* the window
  // (too slow to count as a double tap), it looks like a fresh single tap and
  // schedules its own navigation on top of the first tap's already-fired one —
  // pushing (and mounting) the thread route twice. `navCooldownRef` suppresses
  // any tap that follows too closely behind a navigation that already fired.
  const DOUBLE_TAP_MS = 260;
  const NAV_COOLDOWN_MS = 600;
  const lastTapRef = React.useRef(0);
  const singleTapTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const navCooldownTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressNavRef = React.useRef(false);
  React.useEffect(
    () => () => {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
      if (navCooldownTimer.current) clearTimeout(navCooldownTimer.current);
    },
    []
  );
  const handleRowPress = () => {
    if (pending) return;
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      // Double tap → like only (never unlike, never navigate).
      if (singleTapTimer.current) { clearTimeout(singleTapTimer.current); singleTapTimer.current = null; }
      lastTapRef.current = 0;
      if (!item.is_liked) onToggleLike(item.comment_id);
      return;
    }
    if (suppressNavRef.current) return; // trailing slow second tap right after a navigation — ignore it
    lastTapRef.current = now;
    if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    singleTapTimer.current = setTimeout(() => {
      singleTapTimer.current = null;
      onOpenThread(item.comment_id);
      suppressNavRef.current = true;
      if (navCooldownTimer.current) clearTimeout(navCooldownTimer.current);
      navCooldownTimer.current = setTimeout(() => { suppressNavRef.current = false; }, NAV_COOLDOWN_MS);
    }, DOUBLE_TAP_MS);
  };

  if (item.isContinueThread) {
    return (
      <SubStubRow
        item={item}
        depth={depth}
        ancestorContinues={ancestorContinues}
        onPress={() => onContinueThread(item.targetCommentId!)}
      />
    );
  }

  if (item.isCollapsed) {
    return (
      <SubStubRow
        item={item}
        depth={depth}
        ancestorContinues={ancestorContinues}
        onPress={() => onExpand(item.parentId!)}
      />
    );
  }

  return (
    // Single tap opens this comment's thread, double tap likes it; name + avatar
    // open the author's profile; the sub-buttons keep their own actions (nested
    // touchables win over the row press).
    <Pressable
      onPress={handleRowPress}
      onLongPress={isOwnComment ? handleLongPress : undefined}
      delayLongPress={400}
      style={{
        position: 'relative', backgroundColor: BG,
        paddingVertical: 10, paddingHorizontal: 16, paddingLeft: indent,
        opacity: pending ? 0.55 : 1,
      }}
    >
      <ThreadLines {...threadProps} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>

        <TouchableOpacity onPress={() => onAvatarPress(item.user_id)} style={{ marginRight: 10 }} activeOpacity={0.7}>
          <Avatar name={item.author_name} uri={item.author_image} size={32} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <TouchableOpacity onPress={() => onOpenProfile(item.user_id)} hitSlop={4} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#111' }} numberOfLines={1}>
                {item.author_name}
              </Text>
              {!!item.author_verified && (
                <Image source={PostIcons.verified} style={{ width: 12, height: 12 }} tintColor={PRIMARY} />
              )}
              {!!item.social_username && (
                <Text style={{ fontSize: 12, color: '#9CA3AF' }} numberOfLines={1}>@{item.social_username}</Text>
              )}
            </TouchableOpacity>
            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
              {pending ? 'Posting…' : `• ${formatTime(item.created_at)}`}
            </Text>
          </View>

          <MentionText content={item.content} textStyle={{ fontSize: 14, color: '#262626', lineHeight: 18 }} />

          <CommentMediaGrid media={item.media} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <TouchableOpacity onPress={() => onReply(item)} hitSlop={8} disabled={pending}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#8E8E8E' }}>Reply</Text>
            </TouchableOpacity>

            {!pending && item.replies?.length > 0 && item.depth < MAX_INLINE_DEPTH && (
              <TouchableOpacity onPress={() => onExpand(item.comment_id)} hitSlop={8}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#8E8E8E' }}>Hide</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={() => onToggleLike(item.comment_id)}
          disabled={pending}
          style={{ alignItems: 'center', justifyContent: 'center', padding: 6, minWidth: 28 }}
          hitSlop={8}
        >
          <Image
            source={item.is_liked ? PostIcons.pawSelect : PostIcons.pawUnselect}
            style={{ width: 14, height: 14 }}
            contentFit="contain"
          />
          {item.like_count > 0 && (
            <Text style={{ fontSize: 10, fontWeight: '600', color: item.is_liked ? PRIMARY : '#8E8E8E', marginTop: 2 }}>
              {item.like_count}
            </Text>
          )}
        </TouchableOpacity>

      </View>
    </Pressable>
  );
};

/* ── Focused comment header (thread detail page top) ──
 * Renders the re-rooted comment prominently, like the post at the top of the
 * post page: full-width, larger, with a like/reply action row + separator. */
export const FocusedCommentHeader = ({
  comment, onReply, onToggleLike, onOpenProfile, onAvatarPress,
}: {
  comment: Comment;
  onReply: () => void;
  onToggleLike: () => void;
  onOpenProfile: (userId: number) => void;
  onAvatarPress: (userId: number) => void;
}) => (
  <View style={{ backgroundColor: BG }}>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 12 }}>
      <TouchableOpacity onPress={() => onAvatarPress(comment.user_id)} style={{ marginRight: 10 }} activeOpacity={0.7}>
        <Avatar name={comment.author_name} uri={comment.author_image} size={40} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onOpenProfile(comment.user_id)} style={{ flex: 1 }} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#111' }}>{comment.author_name}</Text>
          {!!comment.author_verified && (
            <Image source={PostIcons.verified} style={{ width: 14, height: 14 }} tintColor={PRIMARY} />
          )}
        </View>
        {!!comment.social_username && (
          <Text style={{ fontSize: 12.5, color: '#9CA3AF' }}>@{comment.social_username}</Text>
        )}
      </TouchableOpacity>
      <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{formatTime(comment.created_at)}</Text>
    </View>

    <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
      <MentionText content={comment.content} textStyle={{ fontSize: 16, color: '#111', lineHeight: 22 }} />
      <CommentMediaGrid media={comment.media} />
    </View>

    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 }}>
      <TouchableOpacity onPress={onReply} hitSlop={8}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#8E8E8E' }}>Reply</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onToggleLike} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Image
          source={comment.is_liked ? PostIcons.pawSelect : PostIcons.pawUnselect}
          style={{ width: 18, height: 18 }}
          contentFit="contain"
        />
        {comment.like_count > 0 && (
          <Text style={{ fontSize: 12, fontWeight: '600', color: comment.is_liked ? PRIMARY : '#8E8E8E' }}>
            {comment.like_count}
          </Text>
        )}
      </TouchableOpacity>
    </View>

    <View style={{ height: 1, backgroundColor: '#F3F4F6' }} />
  </View>
);

/* ── Empty state ── */
export const EmptyComments = ({ label = 'No comments yet', hint = 'Be the first to comment' }: { label?: string; hint?: string }) => (
  <View style={{ alignItems: 'center', paddingTop: 48, paddingBottom: 24, gap: 8 }}>
    <Ionicons name="chatbubble-outline" size={36} color={MUTED} />
    <Text style={{ fontSize: 14, fontWeight: '600', color: '#9CA3AF' }}>{label}</Text>
    <Text style={{ fontSize: 13, color: MUTED }}>{hint}</Text>
  </View>
);

// Comments are always ordered by "Top", so there is no sort selector UI.

// app/post/[id].tsx
import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi, SocialPost } from '../../../src/api/social';
import { useAuthStore } from '../../../src/stores/authStore';
import { Dimensions } from 'react-native';
import PostCard from '../../../src/components/social/PostCard';
import { QuickProfileModal } from '../index'; // We'll keep the modal logic shared as well or just reuse the component

const { width } = Dimensions.get('window');
const PRIMARY = '#A03048';
const MUTED = '#C4C4C4';
const BG = '#fff';

const PostIcons = {
  pawSelect: require('../../../assets/icons/paw-like-select.svg'),
  pawUnselect: require('../../../assets/icons/paw-like-unselect.svg'),
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

const stripHtml = (str: string) => str?.replace(/<[^>]*>/g, '').trim() ?? '';

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

// (PostBlock is now replaced by the shared PostCard component)

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
          paddingLeft: 16 + (depth - 1) * 32 + 34 + 10, // Indent to align directly with the content column
          backgroundColor: BG,
          gap: 12,
        }}
      >
        {/* Horizontal thread line */}
        <View style={{
          width: 32,
          height: 1,
          backgroundColor: '#DBDBDB',
        }} />
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
          <Avatar
            name={item.author_name}
            uri={item.author_image}
            size={32}
          />
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

        {/* Middle/Content Side: Author name, comment text, replies button, actions */}
        <View style={{ flex: 1, marginRight: 8 }}>
          {/* Author Name + Time elapsed */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#111' }}>
              {item.author_name}
            </Text>
            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>• {formatTime(item.created_at)}</Text>
          </View>

          {/* Comment Text */}
          <Text style={{ fontSize: 14, color: '#262626', lineHeight: 18 }}>
            {item.content}
          </Text>

          {/* Actions: Reply, Hide Replies */}
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

        {/* Right Side: Like button aligned to the right edge */}
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
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const inputRef = useRef<TextInput>(null);
  const { user } = useAuthStore();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState<FlatComment | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  /* ── Queries ── */
  const { data: postData, isLoading: postLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => socialApi.getPostById(id as string),
    enabled: !!id,
  });

  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => socialApi.getComments(id as string),
    enabled: !!id,
  });

  /* ── Mutations ── */
  const likeMutation = useMutation({
    mutationFn: () => socialApi.toggleLike(id as string),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['post', id] });
      const prev = queryClient.getQueryData(['post', id]);
      queryClient.setQueryData(['post', id], (old: any) => ({
        ...old,
        is_liked: !old.is_liked,
        like_count: old.is_liked ? old.like_count - 1 : old.like_count + 1,
      }));
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['post', id], ctx.prev);
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: string }) =>
      socialApi.postComment(id as string, content, parentId),
    onSuccess: () => {
      setText('');
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
      
      // Update the local post query details to change comment state/count immediately
      queryClient.setQueryData(['post', id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          is_commented: true,
          comment_count: (old.comment_count || 0) + 1
        };
      });

      // Also update the paginated social feed cache
      const updatePostInFeed = (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: any) =>
              String(p.post_id) === String(id)
                ? { ...p, is_commented: true, comment_count: (p.comment_count || 0) + 1 }
                : p
            ),
          })),
        };
      };
      queryClient.setQueriesData({ queryKey: ['social-feed'] }, updatePostInFeed);
      
      queryClient.invalidateQueries({ queryKey: ['post', id] });
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
    },
  });

  /* ── Handlers ── */
  const handleReply = useCallback((comment: FlatComment) => {
    setReplyingTo(comment);
    setText(`@${comment.social_username ?? comment.author_name} `);
    inputRef.current?.focus();
  }, []);

  const handleExpand = useCallback((cid: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(cid) ? next.delete(cid) : next.add(cid);
      return next;
    });
  }, []);

  const handleSend = useCallback(() => {
    if (!text.trim() || commentMutation.isPending) return;
    commentMutation.mutate({
      content: text.trim(),
      parentId: replyingTo?.comment_id,
    });
  }, [text, replyingTo, commentMutation]);

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
      case 'post':
        // Determine if the current user has commented by scanning the comments list
        const hasUserCommented = !!commentsData?.comments?.some(
          (c: any) => String(c.user_id) === String(user?.id)
        );
        const postWithCommentState = postData
          ? {
              ...postData,
              is_commented: postData.is_commented || hasUserCommented,
            }
          : null;

        return (
          <>
            <PostCard
              post={postWithCommentState!}
              onPress={() => {}} // Static in detail view
              onPlusPress={(uid) => setSelectedUserId(uid)}
            />
            <View style={{ height: 1.5, backgroundColor: '#E5E7EB' }} />
          </>
        );
      case 'comments_header':
        return <CommentsHeader count={flatComments.length} />;
      case 'empty':
        return <EmptyComments />;
      case 'comment':
        return (
          <CommentRow
            item={item.data}
            onReply={handleReply}
            onToggleLike={() => {/* wire up comment like */ }}
            onExpand={handleExpand}
          />
        );
      default:
        return null;
    }
  }, [postData, flatComments, handleReply, handleExpand, likeMutation]);

  /* ── Loading ── */
  if (postLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  const userInitials = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={item => item.key}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60, backgroundColor: BG }}
          style={{ backgroundColor: BG }}
        />

        {/* ── Input bar ── */}
        <View style={{
          backgroundColor: BG,
          borderTopWidth: 0.5,
          borderTopColor: '#F3F4F6',
          paddingBottom: 10, // Use a small fixed spacing since tab navigation handles safe area insets
        }}>

          {/* Reply banner */}
          {replyingTo && (
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              justifyContent: 'space-between',
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
                onPress={() => { setReplyingTo(null); setText(''); }}
                hitSlop={10}
              >
                <Ionicons name="close" size={16} color={PRIMARY} />
              </TouchableOpacity>
            </View>
          )}

          {/* Input row */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4,
            gap: 10,
          }}>
            {/* Current user avatar */}
            <View style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: '#fdf0f2',
              alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: PRIMARY }}>{userInitials}</Text>
            </View>

            {/* Text input */}
            <View style={{
              flex: 1,
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: '#F9FAFB',
              borderRadius: 24,
              borderWidth: 1, borderColor: '#F3F4F6',
              paddingHorizontal: 14, paddingVertical: 8,
              minHeight: 42,
            }}>
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={setText}
                placeholder={replyingTo ? `Reply to ${replyingTo.author_name}...` : 'Add a comment...'}
                placeholderTextColor="#C4C4C4"
                style={{ flex: 1, fontSize: 14, color: '#111', maxHeight: 100 }}
                multiline
                returnKeyType="default"
              />
            </View>

            {/* Send button */}
            <TouchableOpacity
              onPress={handleSend}
              disabled={!text.trim() || commentMutation.isPending}
              hitSlop={8}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: text.trim() ? PRIMARY : '#F3F4F6',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {commentMutation.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="arrow-up" size={18} color={text.trim() ? '#fff' : MUTED} />
                }
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <QuickProfileModal
        userId={selectedUserId}
        visible={selectedUserId !== null}
        onClose={() => setSelectedUserId(null)}
      />
    </View>
  );
}
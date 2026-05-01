import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Pressable,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ImageViewing from 'react-native-image-viewing';
import { socialApi, SocialPost } from '../../api/social';
import { useAuthStore } from '../../stores/authStore';
import { useRouter } from 'expo-router';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Layout constants ─────────────────────────────────────────────────────────
// The card has horizontal padding on the outside (card margin from screen edge)
// but media bleeds to the card's right edge with no inner right padding.

export const CARD_H_MARGIN = 12;        // card left/right margin from screen
export const CARD_V_MARGIN = 6;         // card top/bottom margin
export const CARD_INNER_PAD = 14;       // inner horizontal padding (left side only for text)
export const AVATAR_SIZE = 38;
export const COL_GAP = 12;             // gap between avatar column and content column

// Total card width
const CARD_W = SCREEN_W - CARD_H_MARGIN * 2;

// Width available for the content column (text)
export const CONTENT_W = CARD_W - CARD_INNER_PAD * 2 - AVATAR_SIZE - COL_GAP;

// Media width: from avatar left edge → card right edge (no right inner padding)
// = card width - left inner padding - avatar - col gap
// The media starts at the avatar's x position
const MEDIA_LEFT_OFFSET = CARD_INNER_PAD + AVATAR_SIZE + COL_GAP;
const MEDIA_FULL_W = CARD_W - MEDIA_LEFT_OFFSET;

// Carousel: primary card width, second card peeks
const CAROUSEL_PEEK = 28;
const CAROUSEL_GAP = 8;
const CAROUSEL_CARD_W = MEDIA_FULL_W - CAROUSEL_PEEK - CAROUSEL_GAP;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const stripHtml = (s: string) =>
  (s ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

const formatTime = (dateStr: string) => {
  try {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return new Date(dateStr).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
  } catch { return ''; }
};

const formatCount = (n: number) => {
  if (!n) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
};

// ─── Avatar + name/username column ───────────────────────────────────────────
const AuthorBlock = ({
  name,
  username,
  uri,
  timeAgo,
  onPlusPress,
}: {
  name: string;
  username?: string;
  uri?: string | null;
  timeAgo: string;
  onPlusPress?: () => void;
}) => {
  const initials = (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const palettes = [
    { bg: '#fdf0f2', fg: '#A03048' },
    { bg: '#f0fdf4', fg: '#059669' },
    { bg: '#f5f3ff', fg: '#7c3aed' },
    { bg: '#f0f9ff', fg: '#0ea5e9' },
  ];
  const p = palettes[(name || 'U').charCodeAt(0) % 4];

  return (
    <View style={s.authorRow}>
      {/* Avatar */}
      <View style={{ position: 'relative' }}>
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }}
            contentFit="cover"
          />
        ) : (
          <View style={[s.avatarFallback, { backgroundColor: p.bg }]}>
            <Text style={[s.avatarInitials, { color: p.fg }]}>{initials}</Text>
          </View>
        )}
        {onPlusPress && (
          <TouchableOpacity
            onPress={onPlusPress}
            activeOpacity={0.8}
            style={s.plusBadge}
          >
            <Ionicons name="add" size={13} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Name + username stacked */}
      <View style={s.authorTextCol}>
        <View style={s.authorNameRow}>
          <Text style={s.authorName} numberOfLines={1}>
            {name || 'Anonymous'}
          </Text>
          <Text style={s.authorTime}>{timeAgo}</Text>
          <TouchableOpacity hitSlop={10} style={{ marginLeft: 8 }}>
            <Ionicons name="ellipsis-horizontal" size={16} color="#C4C4C4" />
          </TouchableOpacity>
        </View>
        {!!username && (
          <Text style={s.authorUsername} numberOfLines={1}>
            @{username}
          </Text>
        )}
      </View>
    </View>
  );
};

// ─── Pet chip ────────────────────────────────────────────────────────────────
export const PetChip = ({ name }: { name: string }) => (
  <View style={s.petChip}>
    <Ionicons name="paw" size={9} color="#A03048" />
    <Text style={s.petChipText}>{name}</Text>
  </View>
);

// ─── Media block ─────────────────────────────────────────────────────────────
// Images start at the avatar's left edge and stretch to the card's right edge.
// The negative right margin removes the card's inner right padding so images bleed.
const MediaBlock = ({
  media,
  onImagePress,
}: {
  media: any[];
  onImagePress?: (index: number) => void;
}) => {
  if (!media?.length) return null;

  const isSingle = media.length === 1;

  // Single image: full width, 4:3 aspect
  if (isSingle) {
    const imgH = Math.round(MEDIA_FULL_W * 0.75);
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onImagePress?.(0)}
        style={s.mediaWrapper}
      >
        <Image
          source={{ uri: media[0].url }}
          style={{ width: MEDIA_FULL_W, height: imgH, borderRadius: 14 }}
          contentFit="cover"
          transition={200}
        />
      </TouchableOpacity>
    );
  }

  // Carousel: square-ish cards, peek on the right
  const imgH = Math.round(CAROUSEL_CARD_W * 1.05);

  return (
    <View style={[s.mediaWrapper, { overflow: 'visible' }]}>
      <FlatList
        data={media}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CAROUSEL_CARD_W + CAROUSEL_GAP}
        decelerationRate="fast"
        pagingEnabled={false}
        bounces={false}
        contentContainerStyle={{ gap: CAROUSEL_GAP }}
        style={{ height: imgH, overflow: 'visible' }}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onImagePress?.(index)}
          >
            <Image
              source={{ uri: item.url }}
              style={{ width: CAROUSEL_CARD_W, height: imgH, borderRadius: 14 }}
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

// ─── Action bar ──────────────────────────────────────────────────────────────
const ActionBar = ({
  liked,
  likeCount,
  commentCount,
  repostCount,
  onLike,
  onComment,
}: {
  liked: boolean;
  likeCount: number;
  commentCount: number;
  repostCount?: number;
  onLike: () => void;
  onComment: () => void;
}) => (
  <View style={s.actionBar}>
    {/* Left group: paw, comment, repost */}
    <View style={s.actionGroup}>
      <TouchableOpacity onPress={onLike} style={s.actionBtn} hitSlop={8}>
        <Ionicons
          name={liked ? 'paw' : 'paw-outline'}
          size={20}
          color={liked ? '#A03048' : '#9CA3AF'}
        />
        {likeCount > 0 && (
          <Text style={[s.actionCount, liked && { color: '#A03048' }]}>
            {formatCount(likeCount)}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={onComment} style={s.actionBtn} hitSlop={8}>
        <Ionicons name="chatbubble-outline" size={19} color="#9CA3AF" />
        {commentCount > 0 && (
          <Text style={s.actionCount}>{formatCount(commentCount)}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={s.actionBtn} hitSlop={8}>
        <Ionicons name="repeat-outline" size={21} color="#9CA3AF" />
        {(repostCount ?? 0) > 0 && (
          <Text style={s.actionCount}>{formatCount(repostCount ?? 0)}</Text>
        )}
      </TouchableOpacity>
    </View>

    {/* Right: share */}
    <TouchableOpacity style={s.actionBtn} hitSlop={8}>
      <Ionicons name="paper-plane-outline" size={19} color="#9CA3AF" />
    </TouchableOpacity>
  </View>
);

// ─── Main PostCard ────────────────────────────────────────────────────────────
export const PostCard = React.memo(({
  post,
  onPress,
  onPlusPress,
}: {
  post: SocialPost;
  onPress: () => void;
  onPlusPress?: (userId: number) => void;
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const timeAgo = useMemo(() => formatTime(post.created_at), [post.created_at]);
  const caption = useMemo(() => stripHtml(post.content), [post.content]);

  const renderContent = (text: string) => {
    const parts = text.split(/(#\w+)/g);
    return (
      <Text className="text-[15px] leading-[23px] text-[#111] tracking-tight">
        {parts.map((part, i) => {
          if (part.startsWith('#')) {
            return (
              <Text
                key={i}
                className="text-primary font-bold"
                onPress={() => router.push(`/(app)/search?q=${encodeURIComponent(part)}`)}
              >
                {part}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  };

  const images = useMemo(
    () => post.media?.map((m: any) => ({ uri: m.url })) ?? [],
    [post.media]
  );

  const handleImagePress = (index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };
  const showPlus = Number(currentUser?.id) !== post.user_id && !post.is_following;

  const likeMutation = useMutation({
    mutationFn: () => socialApi.toggleLike(post.post_id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['social-feed'] });
      const prev = queryClient.getQueryData(['social-feed']);
      queryClient.setQueriesData({ queryKey: ['social-feed'] }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: SocialPost) =>
              p.post_id === post.post_id
                ? {
                  ...p,
                  is_liked: !p.is_liked,
                  like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1,
                }
                : p,
            ),
          })),
        };
      });
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['social-feed'], ctx.prev);
    },
  });

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [s.card, pressed && s.cardPressed]}
      >
        {/* ── Row 1: Avatar + name/username + time + menu ── */}
        <AuthorBlock
          name={post.author_name || 'User'}
          username={post.social_username}
          uri={post.author_image}
          timeAgo={timeAgo}
          onPlusPress={showPlus ? () => onPlusPress?.(post.user_id) : undefined}
        />

        {/* ── Pet chip (optional) ── */}
        {post.pet_name && (
          <View style={s.petChipRow}>
            <PetChip name={post.pet_name} />
          </View>
        )}

        {/* ── Caption — full width ── */}
        {!!caption && (
          <Text style={s.caption}>{caption}</Text>
        )}

        {/* ── Media — starts at avatar left edge, bleeds to card right ── */}
        {post.media?.length > 0 && (
          <MediaBlock media={post.media} onImagePress={handleImagePress} />
        )}

        {/* ── Action bar ── */}
        <ActionBar
          liked={!!post.is_liked}
          likeCount={post.like_count}
          commentCount={post.comment_count}
          repostCount={(post as any).repost_count ?? 0}
          onLike={() => likeMutation.mutate()}
          onComment={onPress}
        />
      </Pressable>


      <ImageViewing
        images={images}
        imageIndex={viewerIndex}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
        presentationStyle="overFullScreen"
        FooterComponent={({ imageIndex }) => (
          <View style={{ alignItems: 'center', paddingBottom: 40 }}>
            <Text style={{ color: '#fff', fontSize: 13, opacity: 0.7 }}>
              {imageIndex + 1} / {images.length}
            </Text>
          </View>
        )}
      />
    </>
  );
});

export default PostCard;

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginHorizontal: CARD_H_MARGIN,
    marginVertical: CARD_V_MARGIN,
    borderRadius: 20,
    paddingTop: 14,
    paddingBottom: 10,
    paddingLeft: CARD_INNER_PAD,
    paddingRight: CARD_INNER_PAD,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.055,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  cardPressed: {
    backgroundColor: '#FAFAFA',
  },

  // ── Author block ──
  authorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: COL_GAP,
    marginBottom: 6,
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: AVATAR_SIZE * 0.33,
    fontWeight: '700',
  },
  plusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    backgroundColor: '#111',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  authorTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },
  authorTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 6,
  },
  authorUsername: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 1,
    fontWeight: '400',
  },

  // ── Pet chip ──
  petChipRow: {
    marginBottom: 4,
    // Indent to align with content column
    marginLeft: AVATAR_SIZE + COL_GAP,
  },
  petChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fdf0f2',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 3,
  },
  petChipText: {
    fontSize: 11,
    color: '#A03048',
    fontWeight: '600',
  },

  // ── Caption ──
  // Full width — spans from card left padding to card right padding
  caption: {
    fontSize: 15,
    lineHeight: 22,
    color: '#111827',
    letterSpacing: -0.1,
    marginBottom: 10,
    marginLeft: AVATAR_SIZE + COL_GAP,
  },

  // ── Media ──
  // Starts under the name (AVATAR_SIZE + COL_GAP offset)
  // but bleeds to the absolute card right edge.
  mediaWrapper: {
    marginLeft: AVATAR_SIZE + COL_GAP,
    marginRight: -(CARD_INNER_PAD),
    marginBottom: 10,
    overflow: 'hidden',
  },

  // ── Actions ──
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginLeft: AVATAR_SIZE + COL_GAP,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 4,
  },
  actionCount: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
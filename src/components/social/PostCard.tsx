import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Pressable,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Share, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToPlayingPost, setPlayingPostId } from '../../utils/videoPlaySubscription';
import { timeAgo as formatTime } from '../../utils/timeAgo';

const PostIcons = {
  pawSelect: require('../../../assets/icons/paw-like-select.svg'),
  pawUnselect: require('../../../assets/icons/paw-like-unselect.svg'),
  commentSelect: require('../../../assets/icons/comment-select.svg'),
  commentUnselect: require('../../../assets/icons/comment-unselect.svg'),
  shareSelect: require('../../../assets/icons/share-select.svg'),
  shareUnselect: require('../../../assets/icons/share-unselect.svg'),
  repostSelect: require('../../../assets/icons/repost-select.svg'),
  repostUnselect: require('../../../assets/icons/repost-unselect.svg'),
  bookmarkSelect: require('../../../assets/icons/bookmark-select.svg'),
  bookmarkUnselect: require('../../../assets/icons/bookmark-unselect.svg'),
  verified: require('../../../assets/icons/verified-check-svgrepo-com.svg'),
  pawTag: require('../../../assets/icons/paw-like-unselect.svg'),
};
import { useQueryClient } from '@tanstack/react-query';
import { socialApi, SocialPost, SocialPostMedia } from '../../api/social';
import { useAuthStore } from '../../stores/authStore';
import { useRouter } from 'expo-router';
import VideoPlayer, { VideoThumbnail } from './VideoPlayer';
import { subscribeToVideoStatus } from '../../utils/videoStatusPoller';
import { MentionText, mentionsToPlainText } from './MentionText';
import { usePostCardModals } from '../../context/PostCardModalsContext';
import { COLORS } from '../../constants/colors';
import { useSocialActionsContext } from '../../context/SocialActionsContext';
import { NO_PROFILE_IMAGE } from '../../constants/images';
import { getShareUrl } from '../../utils/share';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Layout constants ─────────────────────────────────────────────────────────
// The card has horizontal padding on the outside (card margin from screen edge)
// but media bleeds to the card's right edge with no inner right padding.

export const CARD_H_MARGIN = 0;         // card left/right margin from screen
export const CARD_V_MARGIN = 0;         // card top/bottom margin
export const CARD_INNER_PAD = 14;       // inner horizontal padding (left side only for text)
export const AVATAR_SIZE = 36;
export const COL_GAP = 9;              // gap between avatar column and content column

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
const CAROUSEL_PEEK = 120;
const CAROUSEL_GAP = 8;
const CAROUSEL_CARD_W = MEDIA_FULL_W - CAROUSEL_PEEK - CAROUSEL_GAP;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const stripHtml = (s: string) =>
  (s ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

// FlashList recycles cells by "item type" — feeding it a real bucket per post
// shape (instead of the default single bucket) keeps a video cell from being
// recycled into a text-only one mid-fling, which is what forces the extra
// layout/remeasure work that tanks the JS thread during fast scrolling.
// Keep this in sync with the isRepost/isQuoteRepost/bodyMedia logic in PostCard below.
export const getPostItemType = (post: SocialPost): string => {
  const isRepost = post.post_type === 'repost' && !!post.original_post_id;
  const hasCaption = !!stripHtml(post.content);
  const hasOwnMedia = (post.media?.length ?? 0) > 0;
  // A quote carries its own body (caption and/or attached media); a plain
  // repost has neither and just re-surfaces the original.
  const isQuoteRepost = isRepost && (hasCaption || hasOwnMedia);
  const isPlainRepost = isRepost && !hasCaption && !hasOwnMedia;
  const bodyMedia = isPlainRepost ? (post.original_media ?? []) : (post.media ?? []);

  if (isQuoteRepost) return 'quote';
  if (!bodyMedia.length) return 'text';
  if (bodyMedia.length > 1) return 'carousel';
  return bodyMedia[0]?.media_type === 'video' ? 'video' : 'image';
};

const formatCount = (n: number) => {
  if (!n) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  cardWrapper: {},
  card: {
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  postSeparator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginTop: 8,
    marginBottom: 8,
  },
  processingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  processingBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  cardPressed: {
    backgroundColor: '#F9F9F9',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: CARD_INNER_PAD,
    gap: COL_GAP,
    marginBottom: 0,
  },
  plusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    backgroundColor: '#a03048',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  authorTextCol: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  authorUsername: {
    fontSize: 13,
    color: '#666',
  },
  authorNameWrap: {
    flex: 1,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedIcon: {
    width: 13,
    height: 13,
  },
  timeAgo: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  mediaWrapper: {
    marginLeft: MEDIA_LEFT_OFFSET,
    marginRight: -14, // Bleed to edge
    marginBottom: 10,
    overflow: 'hidden',
  },
  menuBtn: {
    padding: 4,
    marginLeft: 8,
  },
  petChipRow: {
    marginLeft: MEDIA_LEFT_OFFSET,
    flexDirection: 'row',
    marginBottom: 8,
  },
  petChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF0F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  petChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A03048',
  },
  // Subtle "{paw} Lino" tag under the media — signals the pet in the picture.
  petTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: MEDIA_LEFT_OFFSET,
    // media above already has marginBottom:10; keep the tag hugging the image
    // rather than drifting toward the action bar below it.
    marginTop: 0,
    marginBottom: 6,
    gap: 6,
  },
  petTagText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: -0.2,
  },
  caption: {
    marginLeft: MEDIA_LEFT_OFFSET,
    marginRight: 14,
    // Pull up so the caption starts right after the single name/username line,
    // ignoring the taller avatar's overhang below it (avatar 36 vs ~20 line).
    marginTop: -18,
    marginBottom: 6,
  },
  mediaScroll: {
    paddingLeft: MEDIA_LEFT_OFFSET,
  },
  singleMediaWrapper: {
    marginRight: 14, // Matches caption right margin
  },
  mediaItem: {
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#F0F0F0',
  },
  carouselItem: {
    width: CAROUSEL_CARD_W,
    height: MEDIA_FULL_W * 0.8,
    marginRight: CAROUSEL_GAP,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#F0F0F0',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: MEDIA_LEFT_OFFSET,
    paddingRight: 14,
    marginTop: 6,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCount: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  // Reserved space for a count so the row layout never shifts when a
  // like/comment/repost flips between 0 and 1+.
  countSlot: {
    minWidth: 22,
    marginLeft: 4,
  },
  originalPostContainer: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
});

// ─── Avatar + name/username column ───────────────────────────────────────────
const AuthorBlock = React.memo(({
  name,
  username,
  verified,
  uri,
  timeAgo,
  edited,
  onPlusPress,
  onMenuPress,
  onAvatarPress,
}: {
  name: string;
  username?: string;
  verified?: boolean;
  uri?: string | null;
  timeAgo: string;
  edited?: boolean;
  onPlusPress?: () => void;
  onMenuPress?: () => void;
  onAvatarPress?: () => void;
}) => {
  return (
    <View style={s.authorRow}>
      {/* Avatar */}
      <View style={{ position: 'relative' }}>
        <TouchableOpacity activeOpacity={0.8} onPress={onAvatarPress}>
          <Image
            source={uri ? { uri } : NO_PROFILE_IMAGE}
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }}
            contentFit="cover"
          />
        </TouchableOpacity>
        {/* Follow button — temporarily disabled
        {onPlusPress && (
          <TouchableOpacity
            onPress={onPlusPress}
            activeOpacity={0.8}
            style={s.plusBadge}
          >
            <Ionicons name="add" size={13} color="white" />
          </TouchableOpacity>
        )}
        */}
      </View>

      {/* Name + username on a single line */}
      <View style={s.authorTextCol}>
        <View style={s.authorNameRow}>
          <TouchableOpacity activeOpacity={0.7} onPress={onAvatarPress} style={s.authorNameWrap}>
            <Text style={s.authorName} numberOfLines={1}>{name || 'Anonymous'}</Text>
            {!!verified && (
              <Image source={PostIcons.verified} style={s.verifiedIcon} tintColor={COLORS.primary} />
            )}
            {!!username && <Text style={s.authorUsername} numberOfLines={1}>@{username}</Text>}
          </TouchableOpacity>
          {!!edited && <Text style={s.timeAgo}>Edited · </Text>}
          <Text style={s.timeAgo}>{timeAgo}</Text>
          <TouchableOpacity hitSlop={10} style={{ marginLeft: 8 }} onPress={onMenuPress}>
            <Ionicons name="ellipsis-horizontal" size={16} color="#C4C4C4" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

// ─── Pet chip ────────────────────────────────────────────────────────────────
export const PetChip = ({ name }: { name: string }) => (
  <View style={s.petChip}>
    <Ionicons name="paw" size={9} color="#A03048" />
    <Text style={s.petChipText}>{name}</Text>
  </View>
);

// ─── Original Post Preview (for Reposts/Quotes) ─────────────────────────────
interface OriginalPostPreviewProps {
  authorName?: string;
  authorImage?: string;
  content?: string;
  media?: SocialPostMedia[];
  createdAt?: string;
  onPress?: () => void;
  onMediaPress?: (index: number) => void;
}

export const OriginalPostPreview = ({
  authorName,
  authorImage,
  content,
  media,
  createdAt,
  onPress,
  onMediaPress
}: OriginalPostPreviewProps) => {
  if (!authorName && !content) return null;

  return (
    <Pressable style={s.originalPostContainer} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        <Image
          source={authorImage ? { uri: authorImage } : NO_PROFILE_IMAGE}
          style={{ width: 16, height: 16, borderRadius: 8, marginRight: 6 }}
        />
        <Text style={{ fontWeight: '700', fontSize: 13, color: '#111' }}>{authorName}</Text>
        {createdAt && (
          <Text style={{ fontSize: 12, color: '#666', marginLeft: 4 }}>
            · {formatTime(createdAt || '')}
          </Text>
        )}
      </View>

      <MentionText content={content} textStyle={{ fontSize: 14, color: '#111', lineHeight: 19, marginBottom: 8 }} />

      {media && media.length > 0 && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onMediaPress?.(0);
          }}
          style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 0.5, borderColor: '#EEE', position: 'relative' }}
        >
          <Image
            source={{ uri: media[0].thumbnail_url || media[0].url }}
            style={{ width: '100%', height: 160 }}
            contentFit="cover"
          />
          {media[0].media_type === 'video' && (
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.1)' }]}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="play" size={20} color="white" style={{ marginLeft: 2 }} />
              </View>
            </View>
          )}
        </Pressable>
      )}
    </Pressable>
  );
};
// Images start at the avatar's left edge and stretch to the card's right edge.
// The negative right margin removes the card's inner right padding so images bleed.
const MediaBlock = React.memo(({
  media,
  onImagePress,
  isPlaying,
}: {
  media: SocialPostMedia[];
  onImagePress?: (index: number) => void;
  isPlaying?: boolean;
}) => {
  const carouselImgH = Math.round(CAROUSEL_CARD_W * 1.05);

  const renderCarouselItem = useCallback(({ item, index }: { item: SocialPostMedia; index: number }) => {
    const isItemVideo = item.media_type === 'video';

    if (isItemVideo) {
      const videoUri = item.hls_url || item.url;
      const thumbUri = item.thumbnail_url;

      if (!isPlaying) {
        return (
          <VideoThumbnail
            thumbnailUri={thumbUri}
            width={CAROUSEL_CARD_W}
            height={carouselImgH}
            borderRadius={14}
            onPress={() => onImagePress?.(index)}
          />
        );
      }
      return (
        <VideoPlayer
          key={videoUri}
          uri={videoUri}
          thumbnailUri={thumbUri}
          width={CAROUSEL_CARD_W}
          height={carouselImgH}
          borderRadius={14}
          onPress={() => onImagePress?.(index)}
        />
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onImagePress?.(index)}
      >
        <Image
          source={{ uri: item.url }}
          style={{ width: CAROUSEL_CARD_W, height: carouselImgH, borderRadius: 14 }}
          contentFit="cover"
          transition={200}
        />
      </TouchableOpacity>
    );
  }, [onImagePress, isPlaying, carouselImgH]);

  if (!media?.length) return null;

  const isSingle = media.length === 1;
  const firstItem = media[0];
  const isVideo = firstItem?.media_type === 'video';

  // Single item
  if (isSingle) {
    if (isVideo) {
      const SINGLE_VIDEO_W = MEDIA_FULL_W - 24;
      const videoH = Math.round(SINGLE_VIDEO_W * 0.5625); // 16:9
      const videoUri = firstItem.hls_url || firstItem.url;
      const thumbUri = firstItem.thumbnail_url;

      if (!isPlaying) {
        return (
          <View style={s.mediaWrapper}>
            <VideoThumbnail
              thumbnailUri={thumbUri}
              width={SINGLE_VIDEO_W}
              height={videoH}
              borderRadius={14}
              isProcessing={false}
              onPress={() => onImagePress?.(0)}
            />
          </View>
        );
      }
      return (
        <View style={s.mediaWrapper}>
          <VideoPlayer
            key={videoUri}
            uri={videoUri}
            thumbnailUri={thumbUri}
            width={SINGLE_VIDEO_W}
            height={videoH}
            borderRadius={14}
            paused={!isPlaying}
            isProcessing={false}
            onPress={() => onImagePress?.(0)}
          />
        </View>
      );
    }

    const SINGLE_IMG_W = MEDIA_FULL_W - 24;
    const singleImgH = Math.round(SINGLE_IMG_W / 1.125);
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onImagePress?.(0)}
        style={s.mediaWrapper}
      >
        <Image
          source={{ uri: firstItem.url }}
          style={{ width: SINGLE_IMG_W, height: singleImgH, borderRadius: 14 }}
          contentFit="cover"
          transition={200}
        />
      </TouchableOpacity>
    );
  }

  // Carousel: square-ish cards, peek on the right
  return (
    <View style={[s.mediaWrapper, { overflow: 'visible' }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CAROUSEL_CARD_W + CAROUSEL_GAP}
        decelerationRate="fast"
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={{ gap: CAROUSEL_GAP, paddingRight: CAROUSEL_GAP + 15 }}
        style={{ height: carouselImgH, overflow: 'visible' }}
      >
        {media.map((item, index) => (
          <React.Fragment key={index}>
            {renderCarouselItem({ item, index })}
          </React.Fragment>
        ))}
      </ScrollView>
    </View>
  );
});


const ActionBar = React.memo(({
  liked,
  likeCount,
  commented,
  commentCount,
  reposted,
  repostCount,
  saved,
  shared,
  onLike,
  onComment,
  onRepost,
  onSave,
  onSaveLongPress,
  onShare,
}: {
  liked: boolean;
  likeCount: number;
  commented: boolean;
  commentCount: number;
  reposted: boolean;
  repostCount?: number;
  saved: boolean;
  shared: boolean;
  onLike: () => void;
  onComment: () => void;
  onRepost: () => void;
  onSave: () => void;
  onSaveLongPress: () => void;
  onShare: () => void;
}) => (
  <View style={s.actionBar}>
    {/* Left group: paw-like, comment, repost */}
    <View style={s.actionGroup}>
      {/* Like / paw */}
      <TouchableOpacity onPress={onLike} style={s.actionBtn} hitSlop={8}>
        <Image
          source={liked ? PostIcons.pawSelect : PostIcons.pawUnselect}
          style={{ width: 20, height: 20 }}
          contentFit="contain"
        />
        <Text style={[s.actionCount, s.countSlot, liked && { color: '#A03048' }]}>
          {likeCount > 0 ? formatCount(likeCount) : ''}
        </Text>
      </TouchableOpacity>

      {/* Comment — icon stays unselected; only like & repost highlight */}
      <TouchableOpacity onPress={onComment} style={s.actionBtn} hitSlop={8}>
        <Image
          source={PostIcons.commentUnselect}
          style={{ width: 20, height: 20 }}
          contentFit="contain"
        />
        <Text style={[s.actionCount, s.countSlot]}>
          {commentCount > 0 ? formatCount(commentCount) : ''}
        </Text>
      </TouchableOpacity>

      {/* Repost */}
      <TouchableOpacity onPress={onRepost} style={s.actionBtn} hitSlop={8}>
        <Image
          source={reposted ? PostIcons.repostSelect : PostIcons.repostUnselect}
          style={{ width: 20, height: 20 }}
          contentFit="contain"
        />
        <Text style={[s.actionCount, s.countSlot, reposted && { color: '#A03048' }]}>
          {(repostCount ?? 0) > 0 ? formatCount(repostCount ?? 0) : ''}
        </Text>
      </TouchableOpacity>
    </View>

    {/* Right group: share + bookmark, pinned to the far right */}
    <View style={s.rightGroup}>
      <TouchableOpacity onPress={onShare} style={s.actionBtn} hitSlop={8}>
        <Image
          source={shared ? PostIcons.shareSelect : PostIcons.shareUnselect}
          style={{ width: 20, height: 20 }}
          contentFit="contain"
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onSave}
        onLongPress={onSaveLongPress}
        delayLongPress={400}
        style={s.actionBtn}
        hitSlop={8}
      >
        <Image
          source={saved ? PostIcons.bookmarkSelect : PostIcons.bookmarkUnselect}
          style={{ width: 20, height: 20 }}
          contentFit="contain"
        />
      </TouchableOpacity>
    </View>
  </View>
));

// ─── Main PostCard ────────────────────────────────────────────────────────────
export const PostCard = React.memo(({
  post,
  onPress,
  onComment,
  onPlusPress,
}: {
  post: SocialPost;
  onPress: () => void;
  onComment?: () => void;
  onPlusPress?: (userId: number) => void;
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore(state => state.user?.id);
  const modals = usePostCardModals();
  const actions = useSocialActionsContext();

  const timeAgo = useMemo(() => formatTime(post.created_at), [post.created_at]);
  const caption = useMemo(() => stripHtml(post.content), [post.content]);

  // Tagged pets come from the API as a `tagged_pets` array ({ name, ... }),
  // not a flat pet_name field. Label = first pet, "+N" when more than one.
  const petTagLabel = useMemo(
    () => (post.tagged_pets ?? []).map((p) => p.name).join(', '),
    [post.tagged_pets],
  );

  // ── Repost display model ──────────────────────────────────────────────
  // Quote repost = repost WITH a caption → reads like a normal post with the
  //   original embedded (no "reposted" header).
  // Plain repost = repost WITHOUT a caption → only the "{user} reposted" header,
  //   and the original is rendered AS the post (original author + content + media),
  //   with no reposter author block / embedded card.
  // A post is only treated as a repost when it actually carries the original it
  // points to — guards against posts mislabeled post_type:'repost' without any
  // original_* data, which otherwise drew a stray "reposted" header.
  const isRepost = post.post_type === 'repost' && !!post.original_post_id;
  // A quote carries its own body (caption and/or attached media); a plain
  // repost has neither and just re-surfaces the original. Keep in sync with
  // getPostItemType above.
  const hasOwnMedia = (post.media?.length ?? 0) > 0;
  const isQuoteRepost = isRepost && (!!caption || hasOwnMedia);
  const isPlainRepost = isRepost && !caption && !hasOwnMedia;
  // A plain repost entry is a hollow row with no genuine likes/comments/saves
  // of its own — every interaction (and the stats shown) belong to the root
  // post it re-surfaces. The server also dereferences this independently, but
  // targeting the resolved id directly here keeps optimistic UI + cache keys
  // (e.g. comment thread, save-status) pointed at the same post everywhere.
  const interactionPostId = isPlainRepost ? (post.original_post_id ?? post.post_id) : post.post_id;

  const displayName = isPlainRepost ? (post.original_author_name || 'User') : (post.author_name || 'User');
  const displayUsername = isPlainRepost
    ? (post.original_social_username ?? post.original_post?.social_username)
    : post.social_username;
  const displayVerified = isPlainRepost
    ? (post.original_author_verified ?? post.original_post?.author_verified)
    : post.author_verified;
  const displayImage = isPlainRepost ? post.original_author_image : post.author_image;
  const displayUserId = isPlainRepost
    ? (post.original_user_id ?? post.original_post?.user_id ?? post.user_id)
    : post.user_id;
  const displayTime = isPlainRepost ? formatTime(post.original_post?.created_at || post.created_at) : timeAgo;
  // Mirrors displayTime's own created_at fallback so a plain repost's "Edited"
  // status tracks whichever row's timestamp is actually being shown.
  const displayUpdatedAt = isPlainRepost ? post.original_post?.updated_at : post.updated_at;
  const displayCreatedAt = isPlainRepost ? (post.original_post?.created_at || post.created_at) : post.created_at;
  const isEdited = !!displayUpdatedAt && displayUpdatedAt !== displayCreatedAt;
  // Raw (un-stripped) content for MentionText to render — `caption` above
  // stays the stripped-text version since it's also used as a truthiness
  // signal for the quote-vs-plain repost layout decision.
  const bodyContent = isPlainRepost ? (post.original_content || '') : (post.content || '');
  const bodyMedia = isPlainRepost ? (post.original_media ?? []) : (post.media ?? []);

  // Video autoplay — subscribe to the module-level emitter so the FlatList
  // never re-renders when the playing post changes (only this card does).
  const isPlayingRef = useRef(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  useEffect(() => {
    return subscribeToPlayingPost(id => {
      const playing = id === post.post_id;
      if (isPlayingRef.current !== playing) {
        isPlayingRef.current = playing;
        setIsVideoPlaying(playing);
      }
    });
  }, [post.post_id]);

  // Local video state to handle dynamic HLS/Thumbnail updates during backend transcoding polling
  const firstItem = bodyMedia[0];
  const isVideo = firstItem?.media_type === 'video';

  const [localVideoStatus, setLocalVideoStatus] = useState(firstItem?.video_status);
  const [localHlsUrl, setLocalHlsUrl] = useState(firstItem?.hls_url);
  const [localThumbnailUrl, setLocalThumbnailUrl] = useState(firstItem?.thumbnail_url);

  // Keep in sync with incoming prop changes (like query invalidations/re-fetches)
  useEffect(() => {
    if (firstItem) {
      setLocalVideoStatus(firstItem.video_status);
      setLocalHlsUrl(firstItem.hls_url);
      setLocalThumbnailUrl(firstItem.thumbnail_url);
    }
  }, [firstItem]);

  // Poll video status globally and deduplicate same-media-id requests
  useEffect(() => {
    if (isVideo && firstItem?.media_id && (localVideoStatus === 'pending' || localVideoStatus === 'processing')) {
      const unsubscribe = subscribeToVideoStatus(firstItem.media_id, (data) => {
        setLocalVideoStatus(data.video_status);
        if (data.hls_url) setLocalHlsUrl(data.hls_url);
        if (data.thumbnail_url) setLocalThumbnailUrl(data.thumbnail_url);
      });
      return unsubscribe;
    }
  }, [isVideo, firstItem?.media_id, localVideoStatus]);


  // Compute local media overrides to feed downstream components
  const computedMedia = useMemo(() => {
    if (!bodyMedia || bodyMedia.length === 0) return [];
    return bodyMedia.map((m, idx) => {
      if (idx === 0 && m.media_type === 'video') {
        return {
          ...m,
          video_status: localVideoStatus,
          hls_url: localHlsUrl || undefined,
          thumbnail_url: localThumbnailUrl || undefined,
        } as SocialPostMedia;
      }
      return m;
    });
  }, [bodyMedia, localVideoStatus, localHlsUrl, localThumbnailUrl]);


  const handleImagePress = useCallback((index: number) => {
    // Pause background video player before opening the media detail screen
    setPlayingPostId(null);
    // Seed the media screen's ['post', id] query with what's already on
    // screen (including the local video-processing-status overrides above),
    // so it renders instantly instead of waiting on a redundant refetch.
    queryClient.setQueryData(['post', post.post_id], { ...post, media: bodyMedia });
    router.push({ pathname: '/media/[id]', params: { id: post.post_id, index: String(index) } });
  }, [router, queryClient, post, bodyMedia]);


  const showPlus = String(currentUserId) !== String(post.user_id) && !post.is_following;
  const [isHidden, setIsHidden] = useState(false);
  const isOwnPost = String(currentUserId) === String(post.user_id);

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => actions?.deletePost(post.post_id) },
      ]
    );
  };

  const handleEdit = () => {
    router.push({
      pathname: '/create-post',
      params: {
        editId: post.post_id,
        initialCaption: post.content,
        initialPetProfileIds: (post.tagged_pets ?? []).map((p) => p.pet_profile_id).join(','),
        initialPostType: post.post_type
      }
    });
  };

  const handleHide = () => {
    setIsHidden(true);
  };

  const handleQuickRepost = useCallback(() => {
    actions?.repost(post.post_id, !!post.is_reposted);
  }, [actions, post.post_id, post.is_reposted]);

  const handleQuotePost = useCallback(() => {
    // Preview the post that will actually be quoted. For a plain repost card the
    // server dereferences to the original, so preview the original's author/
    // content (not the hollow repost entry). Stash it for the composer screen.
    const target = isPlainRepost
      ? {
          author_name: post.original_author_name,
          author_image: post.original_author_image,
          content: post.original_content,
          media: post.original_media,
          created_at: post.original_post?.created_at ?? post.created_at,
        }
      : {
          author_name: post.author_name,
          author_image: post.author_image,
          content: post.content,
          media: post.media,
          created_at: post.created_at,
        };
    queryClient.setQueryData(['quote-target', String(post.post_id)], target);
    router.push(`/quote/${post.post_id}`);
  }, [isPlainRepost, post, queryClient, router]);

  const handleRepostPress = useCallback(() => {
    modals?.showRepostSheet({
      isReposted: !!post.is_reposted,
      onRepost: handleQuickRepost,
      onQuote: handleQuotePost,
    });
  }, [modals, post.is_reposted, handleQuickRepost, handleQuotePost]);

  // ── Local optimistic like/save state ──────────────────────────────────
  // PostCard is rendered from several different query caches (home feed,
  // profile, search, saved collections, single-post view). Rather than
  // teaching every cache to optimistically patch itself, the tap reaction
  // lives here: it flips instantly on press and resyncs from the post prop
  // whenever the underlying data changes (server refetch, cache rollback on
  // API failure, etc). The actual API call fires in the background via
  // SocialActionsContext and its own timing doesn't matter to the UI.
  const [likeState, setLikeState] = useState(() => ({ liked: !!post.is_liked, count: post.like_count }));
  useEffect(() => {
    setLikeState({ liked: !!post.is_liked, count: post.like_count });
  }, [post.is_liked, post.like_count]);

  const [saved, setSaved] = useState(!!post.is_saved);
  useEffect(() => {
    setSaved(!!post.is_saved);
  }, [post.is_saved]);

  const handleLike = useCallback(() => {
    setLikeState(prev => ({
      liked: !prev.liked,
      count: prev.liked ? Math.max(0, prev.count - 1) : prev.count + 1,
    }));
    actions?.toggleLike(interactionPostId);
  }, [actions, interactionPostId]);

  const saveInProgress = useRef(false);
  const handleSave = useCallback(async () => {
    if (saveInProgress.current) return;
    saveInProgress.current = true;

    try {
      if (saved) {
        // Unsaving needs no collection choice — just toggle straight off.
        setSaved(false);
        await actions?.toggleSave(interactionPostId, true);
      } else {
        // Saving: fill the icon and fire the save to the default collection in
        // the background — don't make opening the picker wait on the network.
        // Seed the picker's own save-status cache so it shows "already saved"
        // the instant it opens rather than flashing "not saved" until its fetch
        // resolves; the real fetch (triggered by showSaveSheet below) will still
        // reconcile the exact collection membership shortly after.
        setSaved(true);
        if (actions?.hasCustomCollections) {
          queryClient.setQueryData(['save-status', interactionPostId], (old: any) => ({
            ...(old || { collections: [] }),
            is_saved: true,
          }));
          modals?.showSaveSheet(interactionPostId);
          // Fired synchronously (not deferred) — the sheet lets the user toggle
          // collections immediately, and the backend requires the post to
          // already be in saved_posts before it'll add it to another
          // collection, so this needs to be in flight right away rather than
          // waiting for interactions to settle.
          await actions.toggleSave(interactionPostId, false);
        } else {
          await actions?.toggleSave(interactionPostId, false);
        }
      }
    } catch (e) {
      console.warn('Failed to toggle save:', e);
      // Revert state if save failed
      setSaved(!!post.is_saved);
    } finally {
      saveInProgress.current = false;
    }
  }, [actions, interactionPostId, saved, modals, queryClient, post.is_saved]);
  const handleSaveLongPress = useCallback(() => modals?.showSaveSheet(interactionPostId), [modals, interactionPostId]);
  const handleCommentPress = useCallback(() => {
    if (onComment) {
      onComment();
      return;
    }
    // Seed the comment screen's query cache so it can render immediately
    // instead of waiting on a redundant network fetch for data the feed just
    // loaded. For a plain repost, comments belong to the root post, so the
    // cache entry (and the screen we navigate to) must describe the root
    // post's own fields — not the hollow repost entry's.
    const commentTarget = isPlainRepost
      ? {
          ...post,
          post_id: interactionPostId,
          content: post.original_content,
          media: post.original_media,
          author_name: post.original_author_name,
          author_image: post.original_author_image,
          social_username: post.original_social_username,
          user_id: post.original_user_id,
          like_count: likeState.count,
          comment_count: post.comment_count,
        }
      : post;
    queryClient.setQueryData(['post', String(interactionPostId)], commentTarget);
    router.push(`/comment/${interactionPostId}`);
  }, [onComment, router, queryClient, post, isPlainRepost, interactionPostId, likeState.count]);
  const handleMenuPress = useCallback(() => modals?.showOptionsSheet({
    isOwnPost,
    isFollowing: !!post.is_following,
    isSaved: saved,
    onSave: handleSave,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onReport: () => modals?.showReportSheet(interactionPostId),
    onBlock: () => actions?.confirmBlock(post.user_id, post.author_name || ''),
    onUnfollow: () => actions?.toggleFollow(post.user_id),
    onHide: handleHide,
  }), [modals, isOwnPost, post, actions, handleEdit, handleDelete, handleHide, saved, handleSave, interactionPostId]);
  const handleAvatarPress = useCallback(() => {
    if (String(currentUserId) === String(displayUserId)) {
      router.push('/(app)/profile');
    } else {
      router.push(`/(app)/profile/${displayUserId}`);
    }
  }, [router, displayUserId, currentUserId]);
  const handleShare = useCallback(async () => {
    try {
      const result = await Share.share({
        title: 'Paltuu Social Post',
        message: getShareUrl(`post/${interactionPostId}`),
      });
      if (result.action === Share.sharedAction) {
        queryClient.setQueriesData({ queryKey: ['social-feed'] }, (old: any) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              posts: page.posts.map((p: any) =>
                p.post_id === post.post_id ? { ...p, is_shared: true } : p
              ),
            })),
          };
        });
        queryClient.invalidateQueries({ queryKey: ['social-profile', post.user_id] });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }, [post.content, post.author_name, post.post_id, post.user_id, interactionPostId, queryClient]);

  if (isHidden) {
    return (
      <View
        style={[
          s.card,
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: CARD_INNER_PAD,
          },
        ]}
      >
        <Text style={{ color: '#666', fontSize: 14, fontWeight: '500' }}>Post hidden</Text>
        <TouchableOpacity onPress={() => setIsHidden(false)} hitSlop={8}>
          <Text style={{ color: '#A03048', fontSize: 14, fontWeight: '700' }}>Undo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.cardWrapper}>
    <Pressable
          onPress={onPress}
          style={({ pressed }) => [s.card, pressed && { opacity: 0.92 }]}
        >
          {/* ── Reposted indicator (plain reposts only; quote reposts read like a normal post) ── */}
          {isPlainRepost && (
            // Icon sits in the avatar gutter; the text lines up with the author name (MEDIA_LEFT_OFFSET).
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: MEDIA_LEFT_OFFSET - 18, marginBottom: 4 }}>
              <Image
                source={PostIcons.repostUnselect}
                style={{ width: 14, height: 14 }}
                contentFit="contain"
                tintColor="#666666"
              />
              <Text style={{ fontSize: 12, color: '#666666', fontWeight: '600', marginLeft: 4 }}>
                {String(currentUserId) === String(post.user_id) ? 'You reposted' : `${post.author_name} reposted`}
              </Text>
            </View>
          )}

          {/* ── Row 1: Avatar + name/username + time + menu ──
               For plain reposts this shows the ORIGINAL author so the card reads
               like a normal post under the "reposted" heading. */}
          <AuthorBlock
            name={displayName}
            username={displayUsername}
            verified={displayVerified}
            uri={displayImage}
            timeAgo={displayTime}
            edited={isEdited}
            onPlusPress={showPlus ? () => onPlusPress?.(displayUserId) : undefined}
            onMenuPress={handleMenuPress}
            onAvatarPress={handleAvatarPress}
          />

          {/* ── Pet chip (optional) ── */}
          {/* Pet chip above the body only when there's no media — when there is
              media the pet is labelled with a subtle tag right under it instead. */}
          {!!petTagLabel && !isPlainRepost && !bodyMedia?.length && (
            <View style={s.petChipRow}>
              <PetChip name={petTagLabel} />
            </View>
          )}

          {/* ── Body text: quote text for normal/quote posts, original text for plain reposts ── */}
          {!!bodyContent && (
            <View style={s.caption}>
              <MentionText
                content={bodyContent}
                textStyle={{ fontSize: 15, lineHeight: 22, color: '#111', letterSpacing: -0.4 }}
              />
            </View>
          )}

          {/* ── Quote's own attached media (images/videos), above the embedded
               original — the quoter's media reads first, then the quoted post ── */}
          {isQuoteRepost && bodyMedia?.length > 0 && (
            <View style={!bodyContent ? { marginTop: -12 } : undefined}>
              <MediaBlock
                media={computedMedia}
                onImagePress={handleImagePress}
                isPlaying={isVideoPlaying}
              />
            </View>
          )}

          {/* ── Embedded original (quote reposts only) ── */}
          {isQuoteRepost && (
            <View style={{ marginLeft: 64, marginRight: 14, marginTop: 2 }}>
              <OriginalPostPreview
                authorName={post.original_author_name}
                authorImage={post.original_author_image}
                content={post.original_content}
                media={post.original_media}
                createdAt={post.created_at}
                onPress={() => {
                  if (post.original_post_id) {
                    router.push(`/post/${post.original_post_id}`);
                  }
                }}
                onMediaPress={(index) => {
                  if (!post.original_post_id) return;
                  router.push({
                    pathname: '/media/[id]',
                    params: { id: post.original_post_id, index: String(index) },
                  });
                }}
              />
            </View>
          )}

          {/* ── Media: post media for normal posts, original media for plain reposts.
               (Quote reposts show media inside the embedded original above.) ── */}
          {!isQuoteRepost && bodyMedia?.length > 0 && (
            // When there's no caption, pull the media up under the single
            // name/username line the same way the caption does — otherwise the
            // media starts below the taller avatar's overhang, leaving a gap.
            <View style={!bodyContent && { marginTop: -12 }}>
              <MediaBlock
                media={computedMedia}
                onImagePress={handleImagePress}
                isPlaying={isVideoPlaying}
              />
            </View>
          )}

          {/* ── Pet tag: sits right under the media to signal the pet in the picture ── */}
          {!!petTagLabel && !isPlainRepost && bodyMedia?.length > 0 && (
            <View style={s.petTag}>
              <Image
                source={PostIcons.pawTag}
                style={{ width: 14, height: 14 }}
                contentFit="contain"
                tintColor="#9CA3AF"
              />
              <Text style={s.petTagText}>{petTagLabel}</Text>
            </View>
          )}

          {/* ── Action bar ── */}
          <ActionBar
            liked={likeState.liked}
            likeCount={likeState.count}
            commented={!!post.is_commented}
            commentCount={post.comment_count}
            reposted={!!post.is_reposted}
            repostCount={post.repost_count ?? 0}
            saved={saved}
            shared={!!post.is_shared}
            onLike={handleLike}
            onComment={handleCommentPress}
            onRepost={handleRepostPress}
            onSave={handleSave}
            onSaveLongPress={handleSaveLongPress}
            onShare={handleShare}
          />
        </Pressable>
    <View style={s.postSeparator} />
    </View>
  );
},
(prev, next) => prev.post === next.post
);

export default PostCard;
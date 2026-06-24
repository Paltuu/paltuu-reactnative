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
  Share,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';

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
};
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocialActions } from '../../hooks/useSocialActions';
import { SaveBottomSheet } from './SaveBottomSheet';
import { ReportBottomSheet } from './ReportBottomSheet';
import { RepostBottomSheet } from './RepostBottomSheet';
import { PostOptionsBottomSheet } from './PostOptionsBottomSheet';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate
} from 'react-native-reanimated';
import ImageModal from '../common/ImageModal';
import { socialApi, SocialPost, SocialPostMedia } from '../../api/social';
import { useAuthStore } from '../../stores/authStore';
import { useRouter } from 'expo-router';
import VideoPlayer from './VideoPlayer';
import { MentionText, mentionsToPlainText } from './MentionText';

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

const formatTime = (dateStr: string) => {
  try {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: {
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
    overflow: 'hidden',
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
const AuthorBlock = ({
  name,
  username,
  uri,
  timeAgo,
  onPlusPress,
  onMenuPress,
  onAvatarPress,
}: {
  name: string;
  username?: string;
  uri?: string | null;
  timeAgo: string;
  onPlusPress?: () => void;
  onMenuPress?: () => void;
  onAvatarPress?: () => void;
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
        <TouchableOpacity activeOpacity={0.8} onPress={onAvatarPress}>
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
          <TouchableOpacity activeOpacity={0.7} onPress={onAvatarPress} style={{ flex: 1, marginRight: 8 }}>
            <Text numberOfLines={1}>
              <Text style={s.authorName}>{name || 'Anonymous'}</Text>
              {!!username && <Text style={s.authorUsername}>  @{username}</Text>}
            </Text>
          </TouchableOpacity>
          <Text style={s.timeAgo}>{timeAgo}</Text>
          <TouchableOpacity hitSlop={10} style={{ marginLeft: 8 }} onPress={onMenuPress}>
            <Ionicons name="ellipsis-horizontal" size={16} color="#C4C4C4" />
          </TouchableOpacity>
        </View>
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

const OriginalPostPreview = ({
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
        {authorImage && (
          <Image
            source={{ uri: authorImage }}
            style={{ width: 16, height: 16, borderRadius: 8, marginRight: 6 }}
          />
        )}
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
const MediaBlock = ({
  media,
  onImagePress,
  isPlaying,
}: {
  media: SocialPostMedia[];
  onImagePress?: (index: number) => void;
  isPlaying?: boolean;
}) => {
  if (!media?.length) return null;

  const isSingle = media.length === 1;
  const firstItem = media[0];
  const isVideo = firstItem?.media_type === 'video';

  // Single item
  if (isSingle) {
    if (isVideo) {
      const SINGLE_VIDEO_W = MEDIA_FULL_W - 24;
      const videoH = Math.round(SINGLE_VIDEO_W * 0.5625); // 16:9
      const isProcessing =
        firstItem.video_status === 'processing' ||
        firstItem.video_status === 'pending';
      const videoUri = firstItem.hls_url || firstItem.url;
      console.log('[VideoDebug] Rendering video player with URI:', videoUri);
      return (
        <View style={s.mediaWrapper}>
          <VideoPlayer
            key={videoUri}
            uri={videoUri}
            thumbnailUri={firstItem.thumbnail_url}
            width={SINGLE_VIDEO_W}
            height={videoH}
            borderRadius={14}
            paused={!isPlaying}
            isProcessing={isProcessing}
          />
        </View>
      );
    }

    const SINGLE_IMG_W = MEDIA_FULL_W - 24;
    const imgH = Math.round(SINGLE_IMG_W / 1.125);
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onImagePress?.(0)}
        style={s.mediaWrapper}
      >
        <Image
          source={{ uri: firstItem.url }}
          style={{ width: SINGLE_IMG_W, height: imgH, borderRadius: 14 }}
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
        contentContainerStyle={{ gap: CAROUSEL_GAP, paddingRight: CAROUSEL_GAP + 15 }}
        style={{ height: imgH, overflow: 'visible' }}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item, index }) => {
          const isItemVideo = item.media_type === 'video';

          if (isItemVideo) {
            const videoUri = item.hls_url || item.url;
            return (
              <VideoPlayer
                key={videoUri}
                uri={videoUri}
                thumbnailUri={item.thumbnail_url}
                width={CAROUSEL_CARD_W}
                height={imgH}
                borderRadius={14}
                paused={!isPlaying}
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
                style={{ width: CAROUSEL_CARD_W, height: imgH, borderRadius: 14 }}
                contentFit="cover"
                transition={200}
              />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const ActionBar = ({
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
);

// ─── Main PostCard ────────────────────────────────────────────────────────────
export const PostCard = React.memo(({
  post,
  onPress,
  onComment,
  onPlusPress,
  isVideoPlaying,
}: {
  post: SocialPost;
  onPress: () => void;
  /** Override for the comment action. Defaults to opening the bottom-sheet comment composer. */
  onComment?: () => void;
  onPlusPress?: (userId: number) => void;
  /** Pass true when this card's video should autoplay (controlled by FlatList viewability) */
  isVideoPlaying?: boolean;
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerMedia, setViewerMedia] = useState<{ url: string; type?: 'image' | 'video'; thumbnail_url?: string }[]>([]);
  const [isRepostModalVisible, setIsRepostModalVisible] = useState(false);
  const [isQuoteModalVisible, setIsQuoteModalVisible] = useState(false);
  const [quoteContent, setQuoteContent] = useState('');
  const [reportSheetVisible, setReportSheetVisible] = useState(false);

  // ── Quote Post composer — slides up as a bottom sheet, matching CommentsBottomSheet ──
  const quoteSheetRef = useRef<BottomSheetModal>(null);
  const quoteSnapPoints = useMemo(() => ['60%', '90%'], []);

  useEffect(() => {
    if (isQuoteModalVisible) {
      const timer = setTimeout(() => quoteSheetRef.current?.present(), 0);
      return () => clearTimeout(timer);
    } else {
      quoteSheetRef.current?.dismiss();
    }
  }, [isQuoteModalVisible]);

  const renderQuoteBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
    ),
    []
  );

  const timeAgo = useMemo(() => formatTime(post.created_at), [post.created_at]);
  const caption = useMemo(() => stripHtml(post.content), [post.content]);

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
  const isQuoteRepost = isRepost && !!caption;
  const isPlainRepost = isRepost && !caption;

  const displayName = isPlainRepost ? (post.original_author_name || 'User') : (post.author_name || 'User');
  const displayUsername = isPlainRepost
    ? (post.original_social_username ?? post.original_post?.social_username)
    : post.social_username;
  const displayImage = isPlainRepost ? post.original_author_image : post.author_image;
  const displayUserId = isPlainRepost
    ? (post.original_user_id ?? post.original_post?.user_id ?? post.user_id)
    : post.user_id;
  const displayTime = isPlainRepost ? formatTime(post.original_post?.created_at || post.created_at) : timeAgo;
  // Raw (un-stripped) content for MentionText to render — `caption` above
  // stays the stripped-text version since it's also used as a truthiness
  // signal for the quote-vs-plain repost layout decision.
  const bodyContent = isPlainRepost ? (post.original_content || '') : (post.content || '');
  const bodyMedia = isPlainRepost ? (post.original_media ?? []) : (post.media ?? []);

  // Scale animation for the card
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 15, stiffness: 150 }) }],
  }));

  const onPressIn = () => { scale.value = 0.98; };
  const onPressOut = () => { scale.value = 1; };


  const imageUrls = useMemo(
    () => post.media?.map((m: any) => ({ url: m.url })) ?? [],
    [post.media]
  );

  const handleImagePress = (index: number) => {
    setViewerIndex(index);
    setViewerMedia(bodyMedia?.map((m: any) => ({
      url: m.url,
      type: m.media_type,
      thumbnail_url: m.thumbnail_url
    })) ?? []);
    setViewerVisible(true);
  };

  const showPlus = String(currentUser?.id) !== String(post.user_id) && !post.is_following;
  const [saveSheetVisible, setSaveSheetVisible] = useState(false);
  const [optionsSheetVisible, setOptionsSheetVisible] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const isOwnPost = String(currentUser?.id) === String(post.user_id);

  const { toggleLike, deletePost, toggleSave, toggleFollow } = useSocialActions();

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deletePost(post.post_id) },
      ]
    );
  };

  const handleEdit = () => {
    router.push({
      pathname: '/create-post',
      params: {
        editId: post.post_id,
        initialCaption: post.content,
        initialPetId: post.pet_id,
        initialPostType: post.post_type
      }
    });
  };

  const blockMutation = useMutation({
    mutationFn: () => socialApi.blockUser(post.user_id),
    onSuccess: () => {
      import('react-native-toast-message').then((mod) => {
        mod.default.show({ type: 'success', text1: 'User blocked' });
      });
      queryClient.setQueryData(['social-feed'], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.filter((p: any) => p.user_id !== post.user_id)
          }))
        };
      });
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['social-profile', post.user_id] });
      queryClient.invalidateQueries({ queryKey: ['social-search'] });
      queryClient.invalidateQueries({ queryKey: ['social-explore'] });
    },
    onError: () => {
      import('react-native-toast-message').then((mod) => {
        mod.default.show({ type: 'error', text1: 'Could not block user' });
      });
    }
  });

  const handleBlock = () => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${post.author_name || 'this user'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: () => blockMutation.mutate() },
      ]
    );
  };

  const handleUnfollow = () => {
    toggleFollow(post.user_id);
  };

  const handleHide = () => {
    setIsHidden(true);
  };

  const repostMutation = useMutation({
    mutationFn: (quote?: string) =>
      post.is_reposted && !quote
        ? socialApi.undoRepost(post.post_id)
        : socialApi.toggleRepost(post.post_id, quote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
      setIsRepostModalVisible(false);
      setIsQuoteModalVisible(false);
      setQuoteContent('');
    },
  });

  const handleRepostPress = () => {
    setIsRepostModalVisible(true);
  };

  const handleQuickRepost = () => {
    repostMutation.mutate(undefined);
  };

  const handleQuotePost = () => {
    setIsRepostModalVisible(false);
    setIsQuoteModalVisible(true);
  };

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
    <>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={s.card}
        >
          {/* ── Reposted indicator (plain reposts only; quote reposts read like a normal post) ── */}
          {isPlainRepost && (
            // Icon sits in the avatar gutter; the text lines up with the author name (MEDIA_LEFT_OFFSET).
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: MEDIA_LEFT_OFFSET - 18, marginBottom: 4 }}>
              <Image
                source={PostIcons.repostUnselect}
                style={{ width: 14, height: 14 }}
                contentFit="contain"
              />
              <Text style={{ fontSize: 12, color: '#666', fontWeight: '600', marginLeft: 4 }}>
                {currentUser?.id === String(post.user_id) ? 'You reposted' : `${post.author_name} reposted`}
              </Text>
            </View>
          )}

          {/* ── Row 1: Avatar + name/username + time + menu ──
               For plain reposts this shows the ORIGINAL author so the card reads
               like a normal post under the "reposted" heading. */}
          <AuthorBlock
            name={displayName}
            username={displayUsername}
            uri={displayImage}
            timeAgo={displayTime}
            onPlusPress={showPlus ? () => onPlusPress?.(displayUserId) : undefined}
            onMenuPress={() => setOptionsSheetVisible(true)}
            onAvatarPress={() => router.push(`/(app)/profile/${displayUserId}`)}
          />

          {/* ── Pet chip (optional) ── */}
          {post.pet_name && !isPlainRepost && (
            <View style={s.petChipRow}>
              <PetChip name={post.pet_name} />
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
                  setViewerIndex(index);
                  setViewerMedia(post.original_media?.map((m: SocialPostMedia) => ({
                    url: m.url,
                    type: m.media_type,
                    thumbnail_url: m.thumbnail_url
                  })) ?? []);
                  setViewerVisible(true);
                }}
              />
            </View>
          )}

          {/* ── Media: post media for normal posts, original media for plain reposts.
               (Quote reposts show media inside the embedded original above.) ── */}
          {!isQuoteRepost && bodyMedia?.length > 0 && (
            <MediaBlock
              media={bodyMedia}
              onImagePress={handleImagePress}
              isPlaying={isVideoPlaying}
            />
          )}

          {/* ── Action bar ── */}
          <ActionBar
            liked={!!post.is_liked}
            likeCount={post.like_count}
            commented={!!post.is_commented}
            commentCount={post.comment_count}
            reposted={!!post.is_reposted}
            repostCount={post.repost_count ?? 0}
            saved={!!post.is_saved}
            shared={!!post.is_shared}
            onLike={() => toggleLike(post.post_id)}
            onComment={onComment ?? (() => router.push(`/comment/${post.post_id}`))}
            onRepost={handleRepostPress}
            onSave={() => toggleSave(post.post_id, !!post.is_saved)}
            onSaveLongPress={() => setSaveSheetVisible(true)}
            onShare={async () => {
              try {
                const plainText = mentionsToPlainText(post.content);
                const shareText = `Check out ${post.author_name || 'a user'}'s post on Paltuu: "${plainText}" \n\npaltuu://post/${post.post_id}`;
                
                const result = await Share.share({
                  title: 'Paltuu Social Post',
                  message: shareText,
                });

                if (result.action === Share.sharedAction) {
                  // Mark as shared locally in cache / feed queries
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
            }}
          />
        </Pressable>
      </Animated.View>


      <ImageModal
        mediaItems={viewerMedia}
        visible={viewerVisible}
        index={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />

      <SaveBottomSheet
        visible={saveSheetVisible}
        onClose={() => setSaveSheetVisible(false)}
        postId={post.post_id}
      />

      {/* ── Repost Options Sheet ── */}
      <RepostBottomSheet
        visible={isRepostModalVisible}
        onClose={() => setIsRepostModalVisible(false)}
        isReposted={!!post.is_reposted}
        onRepost={handleQuickRepost}
        onQuote={handleQuotePost}
      />

      {/* ── Quote Post Composer — slides up just like the Comments sheet ── */}
      <BottomSheetModal
        ref={quoteSheetRef}
        index={0}
        snapPoints={quoteSnapPoints}
        onDismiss={() => setIsQuoteModalVisible(false)}
        backdropComponent={renderQuoteBackdrop}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: 'white', borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: '#E5E7EB', width: 40 }}
      >
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View className="items-center py-2 border-b border-gray-100">
            <Text className="text-base font-headingBold text-dark">Quote Post</Text>
          </View>

          {/* Scrollable content */}
          <BottomSheetScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Composer Action Toolbar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 16 }}>
              <TouchableOpacity><Ionicons name="image-outline" size={22} color="#A03048" /></TouchableOpacity>
              <TouchableOpacity><Ionicons name="happy-outline" size={22} color="#A03048" /></TouchableOpacity>
              <TouchableOpacity><Ionicons name="list-outline" size={22} color="#A03048" /></TouchableOpacity>
              <TouchableOpacity><Ionicons name="stats-chart-outline" size={22} color="#A03048" /></TouchableOpacity>
              <TouchableOpacity><Ionicons name="location-outline" size={22} color="#A03048" /></TouchableOpacity>
            </View>

            {/* Preview of the original post */}
            <OriginalPostPreview
              authorName={post.author_name}
              authorImage={post.author_image}
              content={post.content}
              media={post.media}
              createdAt={post.created_at}
            />
          </BottomSheetScrollView>

          {/* Input row — floating at bottom, mirrors CommentsBottomSheet */}
          <View className="px-5 py-3 border-t border-gray-100 bg-white flex-row items-center">
            <Image
              source={{ uri: currentUser?.profile_image_url || 'https://via.placeholder.com/150' }}
              style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12 }}
            />
            <BottomSheetTextInput
              placeholder="Add a comment..."
              className="flex-1 min-h-[40px] max-h-[100px] text-sm font-body text-dark"
              placeholderTextColor="#9CA3AF"
              value={quoteContent}
              onChangeText={setQuoteContent}
              multiline
            />
            <TouchableOpacity
              className="ml-3"
              onPress={() => repostMutation.mutate(quoteContent)}
              disabled={repostMutation.isPending}
            >
              {repostMutation.isPending ? (
                <ActivityIndicator size="small" color="#A03048" />
              ) : (
                <Text className="text-sm font-headingBold text-primary">Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetModal>
      <ReportBottomSheet
        visible={reportSheetVisible}
        onClose={() => setReportSheetVisible(false)}
        targetType="post"
        targetId={post.post_id}
      />

      {/* ── Three-dots Post Options Sheet ── */}
      <PostOptionsBottomSheet
        visible={optionsSheetVisible}
        onClose={() => setOptionsSheetVisible(false)}
        isOwnPost={isOwnPost}
        isFollowing={!!post.is_following}
        isSaved={!!post.is_saved}
        onSave={() => toggleSave(post.post_id, !!post.is_saved)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReport={() => setReportSheetVisible(true)}
        onBlock={handleBlock}
        onUnfollow={handleUnfollow}
        onHide={handleHide}
      />
    </>
  );
});

export default PostCard;

// ─── End of PostCard ───
// ─── End of PostCard ───
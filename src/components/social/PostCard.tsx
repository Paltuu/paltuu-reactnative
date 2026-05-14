import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Pressable,
  FlatList,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocialActions } from '../../hooks/useSocialActions';
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

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Layout constants ─────────────────────────────────────────────────────────
// The card has horizontal padding on the outside (card margin from screen edge)
// but media bleeds to the card's right edge with no inner right padding.

export const CARD_H_MARGIN = 0;         // card left/right margin from screen
export const CARD_V_MARGIN = 0;         // card top/bottom margin
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
    marginBottom: 2,
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
    color: '#111',
  },
  authorUsername: {
    fontSize: 13,
    color: '#666',
    marginTop: -2,
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
    marginBottom: 4,
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
    marginTop: 12,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCount: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 4,
    fontWeight: '500',
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
}: {
  name: string;
  username?: string;
  uri?: string | null;
  timeAgo: string;
  onPlusPress?: () => void;
  onMenuPress?: () => void;
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
          <Text style={s.timeAgo}>{timeAgo}</Text>
          <TouchableOpacity hitSlop={10} style={{ marginLeft: 8 }} onPress={onMenuPress}>
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

      {!!content && (
        <Text style={{ fontSize: 14, color: '#111', lineHeight: 19, marginBottom: 8 }}>
          {stripHtml(content || '')}
        </Text>
      )}

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

// ─── Action bar ──────────────────────────────────────────────────────────────
const ActionBar = ({
  liked,
  likeCount,
  commentCount,
  reposted,
  repostCount,
  onLike,
  onComment,
  onRepost,
}: {
  liked: boolean;
  likeCount: number;
  commentCount: number;
  reposted: boolean;
  repostCount?: number;
  onLike: () => void;
  onComment: () => void;
  onRepost: () => void;
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

      <TouchableOpacity onPress={onRepost} style={s.actionBtn} hitSlop={8}>
        <Ionicons
          name="repeat-outline"
          size={21}
          color={reposted ? '#10B981' : '#9CA3AF'}
        />
        {(repostCount ?? 0) > 0 && (
          <Text style={[s.actionCount, reposted && { color: '#10B981' }]}>
            {formatCount(repostCount ?? 0)}
          </Text>
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
  isVideoPlaying,
}: {
  post: SocialPost;
  onPress: () => void;
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

  const timeAgo = useMemo(() => formatTime(post.created_at), [post.created_at]);
  const caption = useMemo(() => stripHtml(post.content), [post.content]);

  // Scale animation for the card
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 15, stiffness: 150 }) }],
  }));

  const onPressIn = () => { scale.value = 0.98; };
  const onPressOut = () => { scale.value = 1; };

  const renderContent = (text: string) => {
    const parts = text.split(/(#\w+)/g);
    return (
      <Text className="text-[15px] leading-[22px] text-[#111] tracking-tight">
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

  const imageUrls = useMemo(
    () => post.media?.map((m: any) => ({ url: m.url })) ?? [],
    [post.media]
  );

  const handleImagePress = (index: number) => {
    setViewerIndex(index);
    setViewerMedia(post.media?.map((m: any) => ({ 
      url: m.url, 
      type: m.media_type, 
      thumbnail_url: m.thumbnail_url 
    })) ?? []);
    setViewerVisible(true);
  };

  const showPlus = String(currentUser?.id) !== String(post.user_id) && !post.is_following;

  const { toggleLike, deletePost } = useSocialActions();

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

  const handleMenu = () => {
    const isOwnPost = String(currentUser?.id) === String(post.user_id);
    
    if (Platform.OS === 'ios') {
      const options = isOwnPost 
        ? ['Cancel', 'Delete Post'] 
        : ['Cancel', 'Report Post'];
      
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: isOwnPost ? 1 : undefined,
          cancelButtonIndex: 0,
          title: 'Post Options',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            if (isOwnPost) {
              handleDelete();
            } else {
              Alert.alert('Reported', 'Thank you for reporting this post.');
            }
          }
        }
      );
    } else {
      // Android: Continue using Alert as a simple menu
      if (isOwnPost) {
        Alert.alert(
          'Post Options',
          undefined,
          [
            { text: 'Delete Post', style: 'destructive', onPress: handleDelete },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert(
          'Post Options',
          undefined,
          [
            { text: 'Report Post', onPress: () => Alert.alert('Reported', 'Thank you for reporting this post.') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    }
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

  return (
    <>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={s.card}
        >
          {/* ── Reposted indicator ── */}
          {post.post_type === 'repost' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 64, marginBottom: 4 }}>
              <Ionicons name="repeat" size={14} color="#666" />
              <Text style={{ fontSize: 12, color: '#666', fontWeight: '600', marginLeft: 4 }}>
                {currentUser?.id === String(post.user_id) ? 'You reposted' : `${post.author_name} reposted`}
              </Text>
            </View>
          )}

          {/* ── Row 1: Avatar + name/username + time + menu ── */}
          <AuthorBlock
            name={post.author_name || 'User'}
            username={post.social_username}
            uri={post.author_image}
            timeAgo={timeAgo}
            onPlusPress={showPlus ? () => onPlusPress?.(post.user_id) : undefined}
            onMenuPress={handleMenu}
          />

          {/* ── Pet chip (optional) ── */}
          {post.pet_name && (
            <View style={s.petChipRow}>
              <PetChip name={post.pet_name} />
            </View>
          )}

          {/* ── Caption (Quote or Original) ── */}
          {!!caption && (
            <View style={s.caption}>
              {renderContent(caption)}
            </View>
          )}

          {/* ── Original Post (if this is a repost/quote) ── */}
          {post.post_type === 'repost' && (
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

          {/* ── Media (only if not a repost, or if original has no media) ── */}
          {post.post_type !== 'repost' && post.media?.length > 0 && (
            <MediaBlock
              media={post.media}
              onImagePress={handleImagePress}
              isPlaying={isVideoPlaying}
            />
          )}

          {/* ── Action bar ── */}
          <ActionBar
            liked={!!post.is_liked}
            likeCount={post.like_count}
            commentCount={post.comment_count}
            reposted={!!post.is_reposted}
            repostCount={post.repost_count ?? 0}
            onLike={() => toggleLike(post.post_id)}
            onComment={onPress}
            onRepost={handleRepostPress}
          />
        </Pressable>
      </Animated.View>


      <ImageModal
        mediaItems={viewerMedia}
        visible={viewerVisible}
        index={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />

      {/* ── Repost Options Modal ── */}
      <Modal
        visible={isRepostModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsRepostModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setIsRepostModalVisible(false)}
        >
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 20, textAlign: 'center' }}>Repost</Text>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' }}
              onPress={handleQuickRepost}
            >
              <Ionicons name="repeat" size={24} color="#111" />
              <Text style={{ marginLeft: 15, fontSize: 16, fontWeight: '500' }}>
                {post.is_reposted ? 'Undo Repost' : 'Repost'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15 }}
              onPress={handleQuotePost}
            >
              <Ionicons name="create-outline" size={24} color="#111" />
              <Text style={{ marginLeft: 15, fontSize: 16, fontWeight: '500' }}>Quote Post</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ── Quote Post Composer ── */}
      <Modal
        visible={isQuoteModalVisible}
        animationType="slide"
        onRequestClose={() => setIsQuoteModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 60 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center', marginBottom: 20 }}>
            <TouchableOpacity onPress={() => setIsQuoteModalVisible(false)}>
              <Text style={{ fontSize: 16, color: '#666' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => repostMutation.mutate(quoteContent)}
              disabled={repostMutation.isPending}
              style={{ backgroundColor: '#A03048', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Post</Text>
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            {/* User header inside composer */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
              <Image
                source={{ uri: currentUser?.profile_image_url || 'https://via.placeholder.com/150' }}
                style={{ width: 34, height: 34, borderRadius: 17, marginRight: 10 }}
              />
              <View>
                <Text style={{ fontWeight: '700', fontSize: 15 }}>{currentUser?.name || 'User'}</Text>
              </View>
            </View>

            <TextInput
              autoFocus
              multiline
              placeholder="Add a comment..."
              value={quoteContent}
              onChangeText={setQuoteContent}
              style={{ fontSize: 18, minHeight: 80, textAlignVertical: 'top', color: '#111' }}
            />

            {/* Composer Action Toolbar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginVertical: 15, paddingBottom: 5 }}>
              <TouchableOpacity><Ionicons name="image-outline" size={22} color="#A03048" /></TouchableOpacity>
              <TouchableOpacity><Ionicons name="happy-outline" size={22} color="#A03048" /></TouchableOpacity>
              <TouchableOpacity><Ionicons name="list-outline" size={22} color="#A03048" /></TouchableOpacity>
              <TouchableOpacity><Ionicons name="stats-chart-outline" size={22} color="#A03048" /></TouchableOpacity>
              <TouchableOpacity><Ionicons name="location-outline" size={22} color="#A03048" /></TouchableOpacity>
            </View>

            {/* Preview of the original post */}
            <View style={{ marginTop: 0 }}>
              <OriginalPostPreview
                authorName={post.author_name}
                authorImage={post.author_image}
                content={post.content}
                media={post.media}
                createdAt={post.created_at}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
});

export default PostCard;

// ─── End of PostCard ───
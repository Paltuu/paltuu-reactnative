// app/media/[id].tsx
// X/Twitter-style "tapped the media" screen — distinct from app/post/[id].tsx
// (tapping the post body opens the full comments page). This one puts the
// image/video front and center (zoomable, swipeable, swipe-down-to-dismiss)
// with the post's tagged pets, engagement pills, and a reply bar underneath,
// on a dark background — everywhere else in the app stays light-themed.
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { socialApi } from '../../src/api/social';
import { useSocialActionsContext } from '../../src/context/SocialActionsContext';
import { PostCardModalsProvider, usePostCardModals } from '../../src/context/PostCardModalsContext';
import { useAuthStore } from '../../src/stores/authStore';
import { ZoomableImage } from '../../src/components/common/ImageModal';
import VideoPlayer from '../../src/components/social/VideoPlayer';
import { getShareUrl } from '../../src/utils/share';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import Toast from 'react-native-toast-message';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const DISMISS_THRESHOLD = 120;
const DISMISS_VELOCITY = 800;
const PRIMARY = '#A03048';

const Icons = {
  pawSelect: require('../../assets/icons/paw-like-select.svg'),
  pawUnselect: require('../../assets/icons/paw-like-unselect.svg'),
  commentUnselect: require('../../assets/icons/comment-unselect.svg'),
  shareUnselect: require('../../assets/icons/share-unselect.svg'),
  repostSelect: require('../../assets/icons/repost-select.svg'),
  repostUnselect: require('../../assets/icons/repost-unselect.svg'),
  bookmarkSelect: require('../../assets/icons/bookmark-select.svg'),
  bookmarkUnselect: require('../../assets/icons/bookmark-unselect.svg'),
};

const formatCount = (n: number) => {
  if (!n) return '';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
};

function MediaDetailScreen() {
  const { id, index } = useLocalSearchParams<{ id: string; index?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const actions = useSocialActionsContext();
  const modals = usePostCardModals();
  const currentUser = useAuthStore((s) => s.user);
  const initialIndex = index ? parseInt(index, 10) || 0 : 0;

  const { data: post } = useQuery({
    queryKey: ['post', id],
    queryFn: () => socialApi.getPostById(id as string),
    enabled: !!id,
  });

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  // Tracks which page(s) are pinch/double-tap zoomed in, keyed by page index
  // (neighboring pages stay mounted, so this can't be a single boolean).
  const [zoomedPages, setZoomedPages] = useState<Set<number>>(new Set());
  const isCurrentPageZoomed = zoomedPages.has(currentIndex);
  const translateY = useSharedValue(0);

  const mediaSource = (post?.media?.length ? post.media : post?.original_media) ?? [];
  const mediaItems = useMemo(
    () =>
      mediaSource.map((m: any) => ({
        url: m.media_type === 'video' ? (m.hls_url || m.url) : m.url,
        type: m.media_type as 'image' | 'video',
        thumbnail_url: m.thumbnail_url,
      })),
    [mediaSource]
  );

  const handleZoomChange = useCallback((pageIndex: number, zoomed: boolean) => {
    setZoomedPages((prev) => {
      const has = prev.has(pageIndex);
      if (zoomed === has) return prev;
      const next = new Set(prev);
      zoomed ? next.add(pageIndex) : next.delete(pageIndex);
      return next;
    });
  }, []);

  const goBack = useCallback(() => router.back(), [router]);

  // Swipe-down (or up) to dismiss, same as the media lightbox — disabled
  // while the visible page is zoomed so dragging pans the image instead.
  const dismissPan = Gesture.Pan()
    .enabled(!isCurrentPageZoomed)
    .activeOffsetY([-10, 10])
    .failOffsetX([-15, 15])
    .onUpdate((e) => {
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const shouldDismiss =
        Math.abs(e.translationY) > DISMISS_THRESHOLD || Math.abs(e.velocityY) > DISMISS_VELOCITY;
      if (shouldDismiss) {
        translateY.value = withTiming(
          e.translationY > 0 ? SCREEN_H : -SCREEN_H,
          { duration: 200 },
          (finished) => {
            if (finished) runOnJS(goBack)();
          }
        );
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const mediaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: interpolate(Math.abs(translateY.value), [0, 300], [1, 0.4], Extrapolation.CLAMP),
  }));

  // ── Local optimistic like/save state — same pattern PostCard uses, so the
  // tap reaction feels instant regardless of when the background mutation
  // actually settles. ──
  const [likeState, setLikeState] = useState({ liked: false, count: 0 });
  useEffect(() => {
    if (post) setLikeState({ liked: !!post.is_liked, count: post.like_count });
  }, [post?.is_liked, post?.like_count]);

  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (post) setSaved(!!post.is_saved);
  }, [post?.is_saved]);

  const handleLike = useCallback(() => {
    if (!post) return;
    setLikeState((prev) => ({
      liked: !prev.liked,
      count: prev.liked ? Math.max(0, prev.count - 1) : prev.count + 1,
    }));
    actions?.toggleLike(post.post_id);
  }, [actions, post]);

  const handleSave = useCallback(() => {
    if (!post) return;
    const wasSaved = saved;
    setSaved(!wasSaved);
    if (!wasSaved && actions?.hasCustomCollections) {
      modals?.showSaveSheet(post.post_id);
    }
    actions?.toggleSave(post.post_id, wasSaved);
  }, [actions, post, saved, modals]);

  const handleSaveLongPress = useCallback(() => {
    if (post) modals?.showSaveSheet(post.post_id);
  }, [modals, post]);

  const handleShare = useCallback(async () => {
    if (!post) return;
    try {
      await Share.share({ title: 'Paltuu Social Post', message: getShareUrl(`post/${post.post_id}`) });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }, [post]);

  const handleDownload = useCallback(async () => {
    const currentMedia = mediaItems[currentIndex];
    if (!currentMedia || currentMedia.type !== 'image') return;

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Paltuu needs storage permissions to download images.');
        return;
      }

      Toast.show({
        type: 'info',
        text1: 'Downloading image...',
        position: 'bottom',
      });

      const filename = currentMedia.url.split('/').pop()?.split('?')[0] || 'download.jpg';
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      const { uri } = await FileSystem.downloadAsync(currentMedia.url, fileUri);

      await MediaLibrary.saveToLibraryAsync(uri);

      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch (e) {
        console.warn('Failed to delete temp file:', e);
      }

      Toast.show({
        type: 'success',
        text1: 'Image saved to gallery!',
        position: 'bottom',
      });
    } catch (error: any) {
      console.error('Download Error:', error);
      Alert.alert('Download Failed', error.message || 'An error occurred while saving the image.');
    }
  }, [mediaItems, currentIndex]);

  const handleQuickRepost = useCallback(() => {
    if (!post) return;
    actions?.repost(post.post_id, !!post.is_reposted);
  }, [actions, post]);

  const handleQuotePost = useCallback(() => {
    if (!post) return;
    queryClient.setQueryData(['quote-target', String(post.post_id)], post);
    router.push(`/quote/${post.post_id}`);
  }, [post, queryClient, router]);

  const handleRepostPress = useCallback(() => {
    if (!post) return;
    modals?.showRepostSheet({
      isReposted: !!post.is_reposted,
      onRepost: handleQuickRepost,
      onQuote: handleQuotePost,
    });
  }, [modals, post, handleQuickRepost, handleQuotePost]);

  const handleReplyPress = useCallback(() => {
    if (!post) return;
    queryClient.setQueryData(['post', post.post_id], post);
    router.push(`/comment/${post.post_id}`);
  }, [post, queryClient, router]);

  const isOwnPost = post ? String(currentUser?.id) === String(post.user_id) : false;

  const handleMenuPress = useCallback(() => {
    if (!post) return;
    modals?.showOptionsSheet({
      isOwnPost,
      isSaved: saved,
      onSave: handleSave,
      onEdit: () =>
        router.push({
          pathname: '/create-post',
          params: {
            editId: post.post_id,
            initialCaption: post.content,
            initialPetProfileIds: (post.tagged_pets ?? []).map((p) => p.pet_profile_id).join(','),
          },
        }),
      onDelete: () => {
        Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              actions?.deletePost(post.post_id);
              router.back();
            },
          },
        ]);
      },
      onReport: () => modals?.showReportSheet(post.post_id),
      onBlock: () => actions?.confirmBlock(post.user_id, post.author_name || ''),
      onHide: () => router.back(),
    });
  }, [modals, post, isOwnPost, saved, handleSave, actions, router]);

  const petTagLabel = useMemo(
    () => (post?.tagged_pets ?? []).map((p) => p.name).join(', '),
    [post?.tagged_pets]
  );

  if (!post || mediaItems.length === 0) {
    return <View style={styles.root} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={goBack} style={styles.headerBtn} hitSlop={10}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMenuPress} style={styles.headerBtn} hitSlop={10}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <GestureDetector gesture={dismissPan}>
          <Animated.View style={[styles.mediaArea, mediaAnimatedStyle]}>
            <PagerView
              style={styles.pager}
              initialPage={initialIndex}
              onPageSelected={(e) => setCurrentIndex(e.nativeEvent.position)}
            >
              {mediaItems.map((item, i) => (
                <View key={i} style={styles.page}>
                  {item.type === 'video' ? (
                    <VideoPlayer
                      uri={item.url}
                      thumbnailUri={item.thumbnail_url}
                      width={SCREEN_W}
                      height={SCREEN_H * 0.6}
                      paused={currentIndex !== i}
                      fullscreen
                    />
                  ) : (
                    <ZoomableImage url={item.url} onZoomChange={(zoomed) => handleZoomChange(i, zoomed)} />
                  )}
                </View>
              ))}
            </PagerView>

            {mediaItems.length > 1 && (
              <View style={styles.counterContainer}>
                <Text style={styles.counterText}>
                  {currentIndex + 1} / {mediaItems.length}
                </Text>
              </View>
            )}
          </Animated.View>
        </GestureDetector>

        <View style={[styles.infoPanel, { paddingBottom: insets.bottom + 12 }]}>
          {!!petTagLabel && (
            <View style={styles.taggedRow}>
              <Ionicons name="paw-outline" size={14} color="#8a8a8e" />
              <Text style={styles.taggedText} numberOfLines={1}>
                {petTagLabel}
              </Text>
            </View>
          )}

          <View style={styles.pillRow}>
            <TouchableOpacity style={styles.pill} onPress={handleReplyPress} hitSlop={6}>
              <Image source={Icons.commentUnselect} style={styles.pillIcon} contentFit="contain" tintColor="#fff" />
              {!!post.comment_count && <Text style={styles.pillText}>{formatCount(post.comment_count)}</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.pill} onPress={handleRepostPress} hitSlop={6}>
              <Image
                source={post.is_reposted ? Icons.repostSelect : Icons.repostUnselect}
                style={styles.pillIcon}
                contentFit="contain"
                tintColor={post.is_reposted ? PRIMARY : '#fff'}
              />
              {!!post.repost_count && (
                <Text style={[styles.pillText, post.is_reposted && { color: PRIMARY }]}>
                  {formatCount(post.repost_count ?? 0)}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.pill} onPress={handleLike} hitSlop={6}>
              <Image
                source={likeState.liked ? Icons.pawSelect : Icons.pawUnselect}
                style={styles.pillIcon}
                contentFit="contain"
                tintColor={likeState.liked ? PRIMARY : '#fff'}
              />
              {likeState.count > 0 && (
                <Text style={[styles.pillText, likeState.liked && { color: PRIMARY }]}>
                  {formatCount(likeState.count)}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pill}
              onPress={handleSave}
              onLongPress={handleSaveLongPress}
              delayLongPress={400}
              hitSlop={6}
            >
              <Image
                source={saved ? Icons.bookmarkSelect : Icons.bookmarkUnselect}
                style={styles.pillIcon}
                contentFit="contain"
                tintColor="#fff"
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.pill} onPress={handleShare} hitSlop={6}>
              <Image source={Icons.shareUnselect} style={styles.pillIcon} contentFit="contain" tintColor="#fff" />
            </TouchableOpacity>

            {mediaItems[currentIndex]?.type === 'image' && (
              <TouchableOpacity style={styles.pill} onPress={handleDownload} hitSlop={6}>
                <Ionicons name="download-outline" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.replyBar} onPress={handleReplyPress} activeOpacity={0.8}>
            <Text style={styles.replyPlaceholder}>Post your reply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 10,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaArea: { flex: 1 },
  pager: { flex: 1 },
  page: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  counterContainer: { position: 'absolute', left: 0, right: 0, bottom: 10, alignItems: 'center' },
  counterText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoPanel: { paddingHorizontal: 16, paddingTop: 10, gap: 10 },
  taggedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  taggedText: { color: '#8a8a8e', fontSize: 13, flexShrink: 1 },
  pillRow: { flexDirection: 'row', gap: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  pillIcon: { width: 18, height: 18 },
  pillText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  replyBar: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  replyPlaceholder: { color: '#8a8a8e', fontSize: 14 },
});

export default function MediaDetailRoute() {
  return (
    <PostCardModalsProvider>
      <MediaDetailScreen />
    </PostCardModalsProvider>
  );
}

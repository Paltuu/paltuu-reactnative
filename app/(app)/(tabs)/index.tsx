import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { FlashList } from '@shopify/flash-list';
const CustomFlashList = FlashList as any;
import {
  View, Text, TouchableOpacity,
  Dimensions, Pressable, ActivityIndicator,
  Modal,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { MainHeader, HEADER_HEIGHT, UPLOAD_BANNER_HEIGHT } from '../../../src/components/common/MainHeader';
import { useUploadStore } from '../../../src/stores/uploadStore';
import { useHeaderScroll, useHeaderContext } from '../../../src/context/HeaderContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { socialApi, SocialPost } from '../../../src/api/social';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import PostCard, { getPostItemType } from '../../../src/components/social/PostCard';
import { PostCardSkeleton } from '../../../src/components/social/PostCardSkeleton';
import { QuickProfileModal } from '../../../src/components/social/QuickProfileModal';
import { setPlayingPostId } from '../../../src/utils/videoPlaySubscription';
import { subscribeToTabPress } from '../../../src/utils/tabPressSubscription';
import { storage } from '../../../src/utils/storage';
import { useAuthReady } from '../../../src/hooks/useAuthReady';

// (Layout constants are now managed inside the shared PostCard)

// Re-exported for existing importers that referenced it from this screen.
export { QuickProfileModal };

export const MOCK_POSTS: SocialPost[] = [
  {
    post_id: 'mock_2',
    user_id: 121,
    content: "Mishti supervising the mohalla from the chatt again 😹🏠 Sunset shift, on duty. #DesiCat #CatsOfPaltuu #PaltuuPK",
    like_count: 110,
    comment_count: 18,
    repost_count: 9,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    post_type: 'image',
    author_name: 'Mariam Shah',
    author_image: 'https://images.unsplash.com/photo-1616428362406-4ffd9fcbf023?w=150',
    social_username: 'mariam_shah',
    is_liked: true,
    media: [
      {
        media_id: 'media_mock_2',
        post_id: 'mock_2',
        media_type: 'image',
        url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800',
        ordering: 0,
      }
    ],
  },
  {
    post_id: 'mock_1',
    user_id: 159,
    content: "Someone insisted on getting all dressed up before her evening walk! 🐕💛 #PomeranianOfPaltuu #DogsOfPaltuu #PaltuuPK",
    like_count: 89,
    comment_count: 12,
    repost_count: 4,
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    post_type: 'image',
    author_name: 'Zain Ahmed',
    author_image: 'https://images.unsplash.com/photo-1551847812-f815b31ae67c?w=150',
    social_username: 'zain_ahmed',
    is_liked: true,
    media: [
      {
        media_id: 'media_mock_1',
        post_id: 'mock_1',
        media_type: 'image',
        url: 'https://images.unsplash.com/photo-1582456891925-a53965520520?w=800',
        ordering: 0,
      }
    ],
  }
];

// Custom pull-to-refresh tuning. FlashList's native RefreshControl doesn't
// receive touch-move events reliably when the list is wrapped in a
// GestureDetector (see composedGesture below), so the drag affordance is
// hand-rolled here instead of relying on native RefreshControl.
const PULL_DAMPING = 0.5; // physical drag px -> displayed indicator px
const PULL_TRIGGER_DISTANCE = 55; // displayed px needed to trigger a refresh
const PULL_MAX_DISTANCE = 90; // displayed px cap while dragging
const REFRESH_INDICATOR_HEIGHT = 56; // held height while a refresh is in flight

/* ── Screen ── */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { headerTranslateY, handleScrollY, handleScrollEnd } = useHeaderScroll();
  const { setOnLogoPress } = useHeaderContext();
  const authReady = useAuthReady();

  // App Store / Play Store screenshots: swap real feed for mock posts.
  // Flip this back to false to restore the real feed.
  const USE_MOCK_POSTS_FOR_SCREENSHOTS = false;

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(true); // start hidden to avoid flash

  const listRef = useRef<any>(null);
  const scrollYRef = useRef(0);

  // Drives the custom pull-to-refresh indicator (see composedGesture below).
  const scrollY = useSharedValue(0);
  const pullDistance = useSharedValue(0);
  const isRefreshingSV = useSharedValue(false);

  // Load persisted dismiss state on mount
  useEffect(() => {
    storage.isFeedBannerDismissed().then(dismissed => {
      if (!dismissed) setBannerDismissed(false);
    });
  }, []);

  // Check if user has interest picks (for cold-start banner)
  const { data: interestsData, isLoading: isLoadingInterests } = useQuery({
    queryKey: ['user-interests-check'],
    queryFn: () => socialApi.getInterests(),
    staleTime: 5 * 60 * 1000,
    retry: false,
    enabled: authReady,
  });
  const hasPicks = interestsData?.has_picks ?? false;
  const forYouMode = hasPicks ? 'personalized' : 'global';

  const handleDismissBanner = useCallback(() => {
    setBannerDismissed(true);
    storage.dismissFeedBanner();
  }, []);

  // Only autoplay the video that's ≥60% visible in viewport.
  // Uses module-level emitter so HomeScreen never re-renders on viewability change.
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      setPlayingPostId(viewableItems[0]?.item?.post_id ?? null);
    },
    []
  );
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60, minimumViewTime: 250 }).current;

  // Swipe left-to-right to open the composer, right-to-left to move to the
  // Pets tab — part of the create-post <-> home <-> pets <-> search <-> profile chain.
  // Home is the pager's first page; the pager owns the leftward swipe to Pets.
  // We only add a rightward swipe that *triggers* opening the compose
  // (create-post) screen — it lives outside the pager and plays its own native
  // `slide_from_left` animation, so this gesture must NOT translate the feed
  // itself (that caused a double-slide). Trigger only.
  const openComposeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-1_000_000, 24]) // rightward only; leftward stays with the pager
        .failOffsetY([-14, 14])
        .onEnd((event) => {
          'worklet';
          if (event.translationX > 70 || event.velocityX > 600) {
            runOnJS(router.push)('/create-post');
          }
        }),
    [router],
  );

  const {
    data, fetchNextPage, hasNextPage,
    isFetchingNextPage, isLoading: isLoadingFeed, refetch,
  } = useInfiniteQuery({
    queryKey: ['social-feed', forYouMode],
    queryFn: ({ pageParam }) => socialApi.getFeed(pageParam as string | null, 20, forYouMode),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    // Fires in parallel with the interests check (no longer gated on
    // isLoadingInterests) so cold start doesn't pay two sequential round
    // trips. hasPicks defaults to false while interests are loading, so the
    // common case (new/beta users with no picks yet) fetches 'global' mode
    // immediately and correctly; existing users with established picks pay a
    // rare second fetch once interests resolve to hasPicks: true and the
    // queryKey flips to 'personalized'.
    enabled: authReady && !USE_MOCK_POSTS_FOR_SCREENSHOTS,
  });

  // Drives the indicator height directly (see composedGesture below) rather
  // than a native RefreshControl — FlashList doesn't forward touch-move
  // events to a wrapped RefreshControl reliably when the list also sits
  // inside a GestureDetector (see openComposeGesture's comment above and
  // https://github.com/Shopify/flash-list/issues/1744).
  const triggerRefresh = useCallback(() => {
    if (isRefreshingSV.value) return;
    isRefreshingSV.value = true;
    pullDistance.value = withTiming(REFRESH_INDICATOR_HEIGHT, { duration: 200 });
    refetch().finally(() => {
      isRefreshingSV.value = false;
      pullDistance.value = withTiming(0, { duration: 200 });
    });
  }, [refetch, isRefreshingSV, pullDistance]);

  // Tracks a downward drag while the feed is scrolled to the top and grows
  // pullDistance accordingly; composed simultaneously with the compose-swipe
  // gesture and Gesture.Native() so none of the three block each other.
  const pullGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((event) => {
          'worklet';
          if (isRefreshingSV.value) return;
          if (scrollY.value <= 0 && event.translationY > 0) {
            pullDistance.value = Math.min(event.translationY * PULL_DAMPING, PULL_MAX_DISTANCE);
          } else {
            pullDistance.value = 0;
          }
        })
        .onEnd(() => {
          'worklet';
          if (isRefreshingSV.value) return;
          if (pullDistance.value >= PULL_TRIGGER_DISTANCE) {
            runOnJS(triggerRefresh)();
          } else {
            pullDistance.value = withTiming(0, { duration: 150 });
          }
        }),
    [triggerRefresh, scrollY, pullDistance, isRefreshingSV],
  );

  // On Android, wrapping the list in a bare GestureDetector makes RNGH's pan
  // recognizer own the touch stream while it decides activate/fail, which
  // would starve a native RefreshControl of the touch-move events its
  // pull-down drag animation needs. Composing with Gesture.Native() tells
  // RNGH to run the underlying scroll view's native gesture simultaneously
  // instead of gating it on the other gestures' outcome; pullGesture (above)
  // is our own drag tracking and isn't subject to that starvation since it
  // only reads/writes shared values, it doesn't depend on native touch
  // forwarding.
  const composedGesture = useMemo(
    () => Gesture.Simultaneous(openComposeGesture, pullGesture, Gesture.Native()),
    [openComposeGesture, pullGesture],
  );

  // Instagram-style re-tap: if the feed is scrolled down, scroll to top;
  // if it's already at the top, trigger a refresh instead.
  useEffect(() => {
    return subscribeToTabPress('home', () => {
      if (scrollYRef.current > 40) {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      } else {
        triggerRefresh();
      }
    });
  }, [triggerRefresh]);

  // Tapping the header logo always scrolls back to the top of the feed.
  useEffect(() => {
    setOnLogoPress(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  }, [setOnLogoPress]);

  const posts = useMemo(() => {
    if (USE_MOCK_POSTS_FOR_SCREENSHOTS) return MOCK_POSTS;
    return data?.pages.flatMap(p => p.posts) ?? [];
  }, [data]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const listFooter = useMemo(() =>
    isFetchingNextPage
      ? <View className="py-5"><ActivityIndicator color="#a03048" /></View>
      : <View className="h-5" />,
  [isFetchingNextPage]);

  const listHeader = useMemo(() => {
    if (hasPicks || bannerDismissed) return null;
    return (
      <View className="mx-4 mb-3 bg-primary/10 border border-primary/20 rounded-xl p-4 flex-row items-center gap-3">
        <TouchableOpacity
          onPress={() => router.push('/interests')}
          activeOpacity={0.8}
          className="flex-1"
        >
          <Text className="font-headingSemi text-sm text-primary mb-0.5">Personalise your feed</Text>
          <Text className="font-body text-xs text-gray-600">Tell us what pets you love and we'll show you more of it.</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/interests')}
          activeOpacity={0.8}
        >
          <Text className="font-headingSemi text-sm text-primary">Go →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDismissBanner}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.6}
        >
          <Text className="text-gray-400 text-base leading-none">✕</Text>
        </TouchableOpacity>
      </View>
    );
  }, [hasPicks, bannerDismissed, handleDismissBanner, router]);

  // While a post is uploading, the header shows a docked progress banner.
  // Add its height so the feed's first item starts below the banner instead
  // of being overlapped by it.
  const isUploading = useUploadStore((s) => s.isUploading);
  const topOffset = HEADER_HEIGHT + insets.top + (isUploading ? UPLOAD_BANNER_HEIGHT : 0);

  // Stable renderItem — no playingPostId dep; video state is managed inside PostCard
  // via the videoPlaySubscription emitter, so the FlatList never re-renders on scroll.
  const renderFeedItem = useCallback(({ item }: { item: any }) => (
    <PostCard
      post={item}
      onPress={() => router.push(`/post/${item.post_id}`)}
      onPlusPress={(uid) => setSelectedUserId(uid)}
    />
  ), [router]);

  // Grows with pullDistance as part of the scrollable content (not an
  // overlay), so it naturally pushes the rest of the list down while
  // dragging — no transforms on the FlashList itself.
  const pullIndicatorStyle = useAnimatedStyle(() => ({
    height: pullDistance.value,
  }));
  const pullToRefreshIndicator = useMemo(() => (
    <Animated.View style={[{ alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, pullIndicatorStyle]}>
      <ActivityIndicator color="#a03048" />
    </Animated.View>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), []);
  const combinedListHeader = useMemo(() => (
    <>
      {pullToRefreshIndicator}
      {listHeader}
    </>
  ), [pullToRefreshIndicator, listHeader]);

  // Header must stay mounted while the feed loads, so the skeleton swaps in for
  // the list only — an early return here would unmount MainHeader and make the
  // header pop in late on a cold start.
  const showSkeleton = (isLoadingInterests || isLoadingFeed) && !posts.length;

  return (
    <View className="flex-1 bg-white">
      {showSkeleton ? (
      <View className="flex-1" style={{ paddingTop: topOffset }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </View>
      ) : (
      <GestureDetector gesture={composedGesture}>
      <CustomFlashList
        ref={listRef}
        style={{ flex: 1 }}
        data={posts}
        renderItem={renderFeedItem}
        keyExtractor={(item: SocialPost) => item.post_id}
        getItemType={getPostItemType}
        estimatedItemSize={350}
        onScroll={(e: any) => {
          scrollYRef.current = e.nativeEvent.contentOffset.y;
          scrollY.value = e.nativeEvent.contentOffset.y;
          handleScrollY(e.nativeEvent.contentOffset.y);
        }}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={{
          paddingTop: topOffset + 12,
          paddingBottom: 100,
        }}
        ListHeaderComponent={combinedListHeader}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={listFooter}
        showsVerticalScrollIndicator={false}
      />
      </GestureDetector>
      )}
      {/* Rendered inside the home page (not the parent layout) so the pager
          carries the header along with the feed during a tab swipe. */}
      <MainHeader headerTranslateY={headerTranslateY} />

      <QuickProfileModal
        userId={selectedUserId}
        visible={selectedUserId !== null}
        onClose={() => setSelectedUserId(null)}
      />
    </View>
  );
}
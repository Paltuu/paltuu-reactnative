import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { FlashList } from '@shopify/flash-list';
const CustomFlashList = FlashList as any;
import {
  View, Text, TouchableOpacity,
  Dimensions, Pressable, ActivityIndicator,
  Modal,
} from 'react-native';
import { usePullToRefresh, PullToRefreshView } from '../../../src/components/common/PullToRefresh';
import { MainHeader, HEADER_HEIGHT, UPLOAD_BANNER_HEIGHT } from '../../../src/components/common/MainHeader';
import { useUploadStore } from '../../../src/stores/uploadStore';
import { useHeaderScroll, useHeaderContext } from '../../../src/context/HeaderContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { socialApi, SocialPost, FeedItem } from '../../../src/api/social';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import PostCard from '../../../src/components/social/PostCard';
import { SurfacedCommentCard } from '../../../src/components/social/SurfacedCommentCard';
import AdoptionFeedCard from '../../../src/components/social/AdoptionFeedCard';
import LostFoundFeedCard from '../../../src/components/social/LostFoundFeedCard';
import { getFeedItemType, feedItemKey } from '../../../src/components/social/feedItemType';
import { PostCardSkeleton } from '../../../src/components/social/PostCardSkeleton';
import { QuickProfileModal } from '../../../src/components/social/QuickProfileModal';
import { DayOneClaimModal } from '../../../src/components/social/DayOneClaimModal';
import { setPlayingPostId } from '../../../src/utils/videoPlaySubscription';
import { subscribeToTabPress } from '../../../src/utils/tabPressSubscription';
import { storage } from '../../../src/utils/storage';
import { useAuthReady } from '../../../src/hooks/useAuthReady';
import { useAuthStore } from '../../../src/stores/authStore';
import { useLocationStore } from '../../../src/stores/locationStore';
import { PawrvezDialog } from '../../../src/components/common/mascot';

// Shown once, the first time a new user lands on their feed (right after
// finishing the interests/customize-feed step) — a short thank-you/welcome
// to the beta program. Independent of the pre-login welcome.tsx mascot intro.
const BETA_INTRO_DIALOGS = [
  "You're in! Thanks so much for being one of our first beta testers — welcome to Paltuu.",
  "We're still polishing things up, so you might run into a rough edge here and there. Your feedback genuinely helps us build a better home for Pakistan's pets.",
  "Alright, enough talk — go check out your feed!",
];

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

/* ── Screen ── */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { headerTranslateY, handleScrollY, handleScrollEnd } = useHeaderScroll();
  const { setOnLogoPress } = useHeaderContext();
  const authReady = useAuthReady();
  const authUser = useAuthStore((state) => state.user);

  // App Store / Play Store screenshots: swap real feed for mock posts.
  // Flip this back to false to restore the real feed.
  const USE_MOCK_POSTS_FOR_SCREENSHOTS = false;

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(true); // start hidden to avoid flash
  const [betaDialogIndex, setBetaDialogIndex] = useState(-1);

  const listRef = useRef<any>(null);
  const scrollYRef = useRef(0);

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

  // Shares its cache key with the profile tab's own-profile query, so this
  // is often already warm by the time the user gets here.
  const { data: ownProfileData } = useQuery({
    queryKey: ['social-profile', authUser?.id],
    queryFn: () => socialApi.getProfile(authUser!.id),
    enabled: authReady && !!authUser?.id,
    staleTime: 5 * 60 * 1000,
  });
  const [showDayOneClaim, setShowDayOneClaim] = useState(false);
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

  // Home is the pager's first page in the home <-> pets <-> search <-> profile
  // chain, so the pager owns the horizontal swipes: right-to-left moves to
  // Pets, and there is nothing to the left of Home. A rightward swipe used to
  // open the composer here, but it collided with post media carousels (swiping
  // back to a carousel's first slide pushed create-post over the feed), so the
  // composer is now reached solely through the header's + button.
  const latitude = useLocationStore((s) => s.latitude);
  const longitude = useLocationStore((s) => s.longitude);
  const coords = latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null;

  const {
    data, fetchNextPage, hasNextPage,
    isFetchingNextPage, isLoading: isLoadingFeed, refetch,
  } = useInfiniteQuery({
    // coords in the key so the feed refetches once location resolves after
    // mount, picking up "near you" adoption/lost-found cards from then on.
    queryKey: ['social-feed', forYouMode, coords?.lat ?? null, coords?.lng ?? null],
    queryFn: ({ pageParam }) => socialApi.getFeed(pageParam as string | null, 20, forYouMode, coords),
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

  // Shared app-wide pull-to-refresh (drag weight, trigger distance and
  // indicator size all live in PullToRefresh.tsx).
  const pull = usePullToRefresh(refetch);

  // Instagram-style re-tap: if the feed is scrolled down, scroll to top;
  // if it's already at the top, trigger a refresh instead.
  useEffect(() => {
    return subscribeToTabPress('home', () => {
      if (scrollYRef.current > 40) {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      } else {
        pull.triggerRefresh();
      }
    });
  }, [pull.triggerRefresh]);

  // Tapping the header logo always scrolls back to the top of the feed.
  useEffect(() => {
    setOnLogoPress(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  }, [setOnLogoPress]);

  const posts = useMemo((): FeedItem[] => {
    if (USE_MOCK_POSTS_FOR_SCREENSHOTS) return MOCK_POSTS;
    return data?.pages.flatMap(p => p.posts) ?? [];
  }, [data]);

  // First time a new user's feed has actually finished loading, greet them
  // with the beta welcome sequence — shown once, ever.
  useEffect(() => {
    if (isLoadingFeed || isLoadingInterests) return;
    (async () => {
      if (await storage.isBetaIntroSeen()) return;
      await storage.markBetaIntroSeen();
      setBetaDialogIndex(0);
    })();
  }, [isLoadingFeed, isLoadingInterests]);

  const advanceBetaDialog = useCallback(() => {
    setBetaDialogIndex((i) => (i + 1 < BETA_INTRO_DIALOGS.length ? i + 1 : -1));
  }, []);

  // First app open after the Day One / Founders Club badge went live: thank
  // the member and let them "claim" it. Shown once, ever, and only once the
  // beta intro sequence (if any) has finished so the two never overlap.
  useEffect(() => {
    if (betaDialogIndex >= 0) return;
    if (!ownProfileData?.profile?.founding_club) return;
    (async () => {
      if (await storage.isDayOneClaimSeen()) return;
      setShowDayOneClaim(true);
    })();
  }, [betaDialogIndex, ownProfileData]);

  const handleClaimDayOneBadge = useCallback(() => {
    storage.markDayOneClaimSeen();
    setShowDayOneClaim(false);
  }, []);

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
  // Adoption/lost-found cards injected into the feed (see lib/feedInjection.ts on
  // the backend) are a pure "discover and tap through" surface — no likes/comments/
  // saves, just navigation to the existing detail screens.
  const renderFeedItem = useCallback(({ item }: { item: FeedItem }) => {
    if ((item as any).item_type === 'surfaced_comment') {
      return <SurfacedCommentCard item={item as any} />;
    }
    if ((item as any).feed_item_type === 'adoption_listing') {
      return (
        <AdoptionFeedCard
          item={item as any}
          onPress={() => router.push({ pathname: '/(app)/pet-details', params: { id: (item as any).id } })}
        />
      );
    }
    if ((item as any).feed_item_type === 'lost_found') {
      return (
        <LostFoundFeedCard
          item={item as any}
          onPress={() => router.push({ pathname: '/(app)/lost-found/[id]', params: { id: (item as any).id } })}
        />
      );
    }
    return (
      <PostCard
        post={item as any}
        onPress={() => router.push(`/post/${(item as any).post_id}`)}
        onPlusPress={(uid) => setSelectedUserId(uid)}
      />
    );
  }, [router]);

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
      <PullToRefreshView pull={pull} indicatorTop={topOffset}>
      <CustomFlashList
        ref={listRef}
        style={{ flex: 1 }}
        data={posts}
        renderItem={renderFeedItem}
        keyExtractor={feedItemKey}
        getItemType={getFeedItemType}
        estimatedItemSize={350}
        onScroll={(e: any) => {
          scrollYRef.current = e.nativeEvent.contentOffset.y;
          handleScrollY(e.nativeEvent.contentOffset.y);
        }}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={{
          paddingTop: topOffset + 12,
          paddingBottom: 100,
        }}
        ListHeaderComponent={listHeader}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={listFooter}
        showsVerticalScrollIndicator={false}
      />
      </PullToRefreshView>
      )}
      {/* Rendered inside the home page (not the parent layout) so the pager
          carries the header along with the feed during a tab swipe. */}
      <MainHeader headerTranslateY={headerTranslateY} />

      <QuickProfileModal
        userId={selectedUserId}
        visible={selectedUserId !== null}
        onClose={() => setSelectedUserId(null)}
      />

      <PawrvezDialog
        visible={betaDialogIndex >= 0}
        text={BETA_INTRO_DIALOGS[betaDialogIndex] ?? ''}
        onDismiss={() => setBetaDialogIndex(-1)}
        actionLabel={betaDialogIndex >= BETA_INTRO_DIALOGS.length - 1 ? "Let's go" : 'Next'}
        onAction={advanceBetaDialog}
      />

      <DayOneClaimModal
        visible={showDayOneClaim}
        onClaim={handleClaimDayOneBadge}
      />
    </View>
  );
}
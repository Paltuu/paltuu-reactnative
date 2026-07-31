import React, { ReactNode, useCallback, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  SharedValue,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/**
 * The app's single pull-to-refresh implementation. Every screen that refreshes
 * on pull uses this, so the drag weight, trigger distance and indicator size
 * are identical everywhere — see the constants below, which are the only place
 * any of that is defined.
 *
 * Why this exists instead of a native RefreshControl:
 *  - RefreshControl doesn't receive touch-move events reliably when the list is
 *    wrapped in a GestureDetector, which the tab-pager screens all are
 *    (https://github.com/Shopify/flash-list/issues/1744), so its drag
 *    affordance either never animates or fights the pager.
 *  - Its spinner is pinned to the scroll view's own top edge, which on screens
 *    with an overlay header sits *behind* the header.
 *
 * The pull is read from a different source on each platform, because the two
 * platforms disagree about who owns a downward drag on a scroll view:
 *
 *  - Android: an RNGH pan (see the gesture below). Android has no rubber-band
 *    overscroll to read, so the drag has to be tracked by hand.
 *  - iOS: the scroll view's own rubber-band. An RNGH pan cannot win here —
 *    UIKit lets only one recogniser claim a touch sequence, and RNGH grants
 *    simultaneity with a UIScrollView's pan only for a native-view handler
 *    bound to the scroll view itself (`areScrollViewRecognizersCompatible` in
 *    RNGestureHandler.mm). A GestureDetector binds to "the first native view in
 *    its subtree", which for FlashList v2 is a plain wrapper View, so that
 *    exemption never applies and `stateManager.activate()` is silently refused
 *    once the scroll view's pan has begun — every callback still fires, the
 *    gesture just never activates and nothing moves. Reading `contentOffset.y`
 *    while it is negative sidesteps the whole contest: no gesture, no
 *    recogniser conflict, and the pull feels exactly like a native one.
 *
 * The scroll props each platform needs are merged into the wrapped list by
 * <PullToRefreshView> (bounces on iOS, overscroll off on Android, the scroll
 * tracking both need), so a screen can't half-wire it.
 *
 * How the band opens: the list is moved down by a transform (never a layout
 * change — a Reanimated height animation runs on the UI thread and never fires
 * onLayout, so a list would keep its rows at the pre-pull offsets and the
 * spinner would draw on top of the first row), and the spinner is an overlay
 * pinned in the band that opens up between the header and the first row. On
 * iOS the drag itself is already moving the content (that's the rubber-band),
 * so the transform there only holds the band open while refreshing.
 */

const IS_IOS = Platform.OS === 'ios';

/** Drag px before the pull takes over from a plain vertical drag. */
export const PULL_ACTIVATION_SLOP = 12;
/** Physical drag px -> displayed indicator px. Lower = heavier pull.
 *  Android only; on iOS UIScrollView's rubber-band already damps the drag. */
export const PULL_DAMPING = 0.5;
/** Displayed px needed to trigger a refresh. */
export const PULL_TRIGGER_DISTANCE = 55;
/** Displayed px cap while dragging. */
export const PULL_MAX_DISTANCE = 90;
/** Height of the band held open (and the spinner centred in) while refreshing. */
export const REFRESH_INDICATOR_HEIGHT = 56;

const INDICATOR_COLOR = '#a03048';

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

/** Merged into the wrapped scrollable by <PullToRefreshView>. */
interface PullScrollProps {
  bounces?: boolean;
  alwaysBounceVertical?: boolean;
  overScrollMode?: 'never';
  scrollEventThrottle: number;
  onScroll: (event: ScrollEvent) => void;
  onScrollBeginDrag?: () => void;
  onScrollEndDrag?: () => void;
}

export interface PullToRefresh {
  /** Android only — composed onto the scrollable by <PullToRefreshView>. */
  gesture: ReturnType<typeof Gesture.Pan>;
  /** Merged into the scrollable by <PullToRefreshView>; not for screens. */
  scrollProps: PullScrollProps;
  /** Refresh programmatically (e.g. a tab re-tap while already at the top). */
  triggerRefresh: () => void;
  /** Indicator progress in px. */
  pullDistance: SharedValue<number>;
  /** How far the list itself is pushed down, in px. */
  listOffset: SharedValue<number>;
  isRefreshing: SharedValue<boolean>;
}

/**
 * @param onRefresh Runs when the pull passes PULL_TRIGGER_DISTANCE. The
 *  indicator stays up until the returned promise settles, so return the
 *  refetch (or a Promise.all of several) rather than firing and forgetting.
 */
export function usePullToRefresh(onRefresh: () => unknown): PullToRefresh {
  const scrollY = useSharedValue(0);
  const pullDistance = useSharedValue(0);
  const listOffset = useSharedValue(0);
  const isRefreshing = useSharedValue(false);
  /** Finger position at touch-down — used to classify drag intent. */
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  /** How far the finger had already travelled when the pull took over, so the
   *  indicator grows from zero rather than jumping to the drag's full length. */
  const anchorTranslationY = useSharedValue(0);
  const engaged = useSharedValue(false);
  /** iOS: overscroll only counts while a finger is down — the scroll view also
   *  bounces past the top on its own when momentum runs out there. */
  const dragging = useRef(false);

  const triggerRefresh = useCallback(() => {
    if (isRefreshing.value) return;
    isRefreshing.value = true;
    pullDistance.value = withTiming(REFRESH_INDICATOR_HEIGHT, { duration: 200 });
    listOffset.value = withTiming(REFRESH_INDICATOR_HEIGHT, { duration: 200 });
    const settle = () => {
      isRefreshing.value = false;
      pullDistance.value = withTiming(0, { duration: 200 });
      listOffset.value = withTiming(0, { duration: 200 });
    };
    // Two callbacks rather than .finally(): .finally() re-throws a rejection,
    // and a failed refetch shouldn't surface as an unhandled rejection.
    Promise.resolve(onRefresh()).then(settle, settle);
  }, [onRefresh, isRefreshing, pullDistance, listOffset]);

  // Feeds the Android gesture's "am I at the top" test, and on iOS *is* the
  // pull: a negative offset is the rubber-band, i.e. exactly how far the
  // content has been dragged below the top.
  const handleScroll = useCallback(
    (event: ScrollEvent) => {
      const y = event.nativeEvent.contentOffset.y;
      scrollY.value = y;
      if (!IS_IOS || isRefreshing.value || !dragging.current) return;
      pullDistance.value = y < 0 ? Math.min(-y, PULL_MAX_DISTANCE) : 0;
    },
    [scrollY, pullDistance, isRefreshing],
  );

  const handleScrollBeginDrag = useCallback(() => {
    dragging.current = true;
  }, []);

  // iOS release point — the equivalent of the gesture's onEnd below.
  const handleScrollEndDrag = useCallback(() => {
    dragging.current = false;
    if (!IS_IOS || isRefreshing.value) return;
    if (pullDistance.value >= PULL_TRIGGER_DISTANCE) {
      triggerRefresh();
    } else {
      pullDistance.value = withTiming(0, { duration: 150 });
    }
  }, [triggerRefresh, pullDistance, isRefreshing]);

  const scrollProps = useMemo<PullScrollProps>(
    () => ({
      // iOS pulls *are* the rubber-band, so it has to be on — including for
      // lists too short to scroll. On Android the overscroll glow would move
      // the content on top of our own transform, doubling the travel.
      ...(IS_IOS
        ? { bounces: true, alwaysBounceVertical: true }
        : { overScrollMode: 'never' as const }),
      scrollEventThrottle: 16,
      onScroll: handleScroll,
      onScrollBeginDrag: handleScrollBeginDrag,
      onScrollEndDrag: handleScrollEndDrag,
    }),
    [handleScroll, handleScrollBeginDrag, handleScrollEndDrag],
  );

  // Android only. Tracks a downward drag while the list is at the top and grows
  // pullDistance accordingly.
  //
  // The gesture is `manualActivation`, so it sits in BEGAN watching raw touches
  // and only activates once the drag is unambiguously a pull: at the top of the
  // list, heading down, past the slop. Everything else — scrolling, and the tab
  // pager's horizontal swipe — leaves it unactivated, which is the whole point:
  //
  //   The moment an RNGH gesture activates on Android it cancels the root view
  //   gesture handler, tearing down whatever native scroll was in flight. The
  //   usual antidote is composing with `Gesture.Native()` so RNGH keeps feeding
  //   the scroll view directly — but a GestureDetector binds to "the first
  //   native view in its subtree", and FlashList v2 wraps its ScrollView in a
  //   plain (collapsable: false) View. So on every FlashList screen that native
  //   handler landed on the wrapper, where Android's ReactViewGroupHook can
  //   never activate it (it activates on `view.isPressed`), and the list simply
  //   stopped scrolling while the pull kept working. FlatList/SectionList were
  //   unaffected because their root native view *is* the scroll view.
  //
  // Activating only for a genuine pull sidesteps that: by then the list is at
  // offset 0 with overscroll disabled, so there is no native scroll to cancel.
  // The drag itself still runs through onUpdate/onEnd — the touch callbacks fire
  // on RNGH's own dispatch and shared-value writes from there don't reliably
  // drive the animated styles, which is what left the spinner and the list
  // transform frozen while the refresh itself still fired.
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .manualActivation(true)
        .onTouchesDown((event) => {
          'worklet';
          const touch = event.allTouches[0];
          startX.value = touch?.absoluteX ?? 0;
          startY.value = touch?.absoluteY ?? 0;
          engaged.value = false;
        })
        .onTouchesMove((event, stateManager) => {
          'worklet';
          if (engaged.value || isRefreshing.value) return;
          const touch = event.allTouches[0];
          if (!touch) return;

          const dx = touch.absoluteX - startX.value;
          const dy = touch.absoluteY - startY.value;
          // Horizontal intent belongs to the tab pager.
          if (Math.abs(dx) > Math.abs(dy)) return;
          if (dy < PULL_ACTIVATION_SLOP) return;
          // Only at the very top — mid-list drags are the list's to scroll.
          if (scrollY.value > 0) return;

          engaged.value = true;
          // The drag so far belongs to the list, not the pull, so onUpdate
          // measures from here instead of from touch-down.
          anchorTranslationY.value = dy;
          stateManager.activate();
        })
        .onUpdate((event) => {
          'worklet';
          if (isRefreshing.value) return;
          const pulled = event.translationY - anchorTranslationY.value;
          const distance =
            pulled > 0 && scrollY.value <= 0
              ? Math.min(pulled * PULL_DAMPING, PULL_MAX_DISTANCE)
              : 0;
          pullDistance.value = distance;
          listOffset.value = distance;
        })
        .onEnd(() => {
          'worklet';
          engaged.value = false;
          if (isRefreshing.value) return;
          if (pullDistance.value >= PULL_TRIGGER_DISTANCE) {
            runOnJS(triggerRefresh)();
          } else {
            pullDistance.value = withTiming(0, { duration: 150 });
            listOffset.value = withTiming(0, { duration: 150 });
          }
        }),
    [
      triggerRefresh,
      scrollY,
      pullDistance,
      listOffset,
      isRefreshing,
      startX,
      startY,
      anchorTranslationY,
      engaged,
    ],
  );

  return { gesture, scrollProps, triggerRefresh, pullDistance, listOffset, isRefreshing };
}

interface PullToRefreshViewProps {
  pull: PullToRefresh;
  /**
   * Distance from this wrapper's top edge to where the spinner band starts —
   * i.e. the bottom edge of whatever header overlays the list. Leave at 0 when
   * the wrapper already starts below the header.
   */
  indicatorTop?: number;
  children: ReactNode;
}

/** Ours first, then the screen's own handler for the same event. */
function chain<T>(ours?: (event: T) => void, theirs?: (event: T) => void) {
  if (!ours) return theirs;
  if (!theirs) return ours;
  return (event: T) => {
    ours(event);
    theirs(event);
  };
}

/**
 * Wraps a scrollable in the pull gesture and renders the indicator above it.
 * Fills its parent, so give it a `flex: 1` slot.
 *
 * Takes exactly one scrollable as its child — FlatList, SectionList,
 * ScrollView or FlashList — and merges the scroll props the pull needs into it
 * (see PullScrollProps), chaining rather than clobbering any handler the screen
 * already passes. Screens therefore set no overscroll/bounce props of their own;
 * anything they do set for those is overridden here.
 */
export function PullToRefreshView({ pull, indicatorTop = 0, children }: PullToRefreshViewProps) {
  const { pullDistance, listOffset, scrollProps } = pull;

  const listStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: listOffset.value }],
  }));

  // Fades and scales in with pull progress rather than being revealed by a
  // growing clipped container, which is what made the spinner look squished
  // mid-drag.
  const indicatorStyle = useAnimatedStyle(() => {
    const progress = Math.min(pullDistance.value / PULL_TRIGGER_DISTANCE, 1);
    return {
      opacity: progress,
      transform: [{ scale: 0.7 + progress * 0.3 }],
    };
  });

  const child = React.Children.only(children);
  const list = React.isValidElement<Record<string, any>>(child)
    ? React.cloneElement(child, {
        ...scrollProps,
        scrollEventThrottle: child.props.scrollEventThrottle ?? scrollProps.scrollEventThrottle,
        onScroll: chain(scrollProps.onScroll, child.props.onScroll),
        onScrollBeginDrag: chain(scrollProps.onScrollBeginDrag, child.props.onScrollBeginDrag),
        onScrollEndDrag: chain(scrollProps.onScrollEndDrag, child.props.onScrollEndDrag),
      })
    : children;

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.root, listStyle]}>
        {IS_IOS ? list : <GestureDetector gesture={pull.gesture}>{list}</GestureDetector>}
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[styles.indicator, { top: indicatorTop }, indicatorStyle]}
      >
        <ActivityIndicator color={INDICATOR_COLOR} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  indicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: REFRESH_INDICATOR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

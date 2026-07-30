import React, { ReactNode, useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
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
 * How it works: the list is moved down by a transform (never a layout change —
 * a Reanimated height animation runs on the UI thread and never fires
 * onLayout, so a list would keep its rows at the pre-pull offsets and the
 * spinner would draw on top of the first row), and the spinner is an overlay
 * pinned in the band that opens up between the header and the first row.
 */

/** Drag px before the pull gesture commits to vertical. */
export const PULL_ACTIVATION_SLOP = 12;
/** Physical drag px -> displayed indicator px. Lower = heavier pull. */
export const PULL_DAMPING = 0.5;
/** Displayed px needed to trigger a refresh. */
export const PULL_TRIGGER_DISTANCE = 55;
/** Displayed px cap while dragging. */
export const PULL_MAX_DISTANCE = 90;
/** Height of the band held open (and the spinner centred in) while refreshing. */
export const REFRESH_INDICATOR_HEIGHT = 56;

const INDICATOR_COLOR = '#a03048';

export interface PullToRefresh {
  /** Compose onto the scrollable via <PullToRefreshView>. */
  gesture: ReturnType<typeof Gesture.Simultaneous>;
  /** Feed the list's contentOffset.y from its onScroll — the pull only engages
   *  while the list is at the top. Lists that never report scroll can skip it,
   *  at the cost of the pull engaging mid-list. */
  onScroll: (y: number) => void;
  /** Refresh programmatically (e.g. a tab re-tap while already at the top). */
  triggerRefresh: () => void;
  pullDistance: SharedValue<number>;
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
  const isRefreshing = useSharedValue(false);

  const onScroll = useCallback((y: number) => {
    scrollY.value = y;
  }, [scrollY]);

  const triggerRefresh = useCallback(() => {
    if (isRefreshing.value) return;
    isRefreshing.value = true;
    pullDistance.value = withTiming(REFRESH_INDICATOR_HEIGHT, { duration: 200 });
    const settle = () => {
      isRefreshing.value = false;
      pullDistance.value = withTiming(0, { duration: 200 });
    };
    // Two callbacks rather than .finally(): .finally() re-throws a rejection,
    // and a failed refetch shouldn't surface as an unhandled rejection.
    Promise.resolve(onRefresh()).then(settle, settle);
  }, [onRefresh, isRefreshing, pullDistance]);

  // Tracks a downward drag while the list is at the top and grows pullDistance
  // accordingly; composed simultaneously with Gesture.Native() below so the two
  // don't block each other.
  const pullGesture = useMemo(
    () =>
      Gesture.Pan()
        // Vertical intent only. Gesture.Simultaneous covers the gestures inside
        // this detector, but says nothing about the tab pager *above* it — and
        // RNGH lets a child gesture win over an ancestor's. Unconstrained, this
        // pan activates on horizontal drags too and swallows the pager swipe.
        // failOffsetX yields the touch as soon as it looks horizontal;
        // activeOffsetY holds activation until it looks vertical, which is what
        // gives failOffsetX a window to fire in.
        .activeOffsetY([-PULL_ACTIVATION_SLOP, PULL_ACTIVATION_SLOP])
        .failOffsetX([-PULL_ACTIVATION_SLOP, PULL_ACTIVATION_SLOP])
        .onUpdate((event) => {
          'worklet';
          if (isRefreshing.value) return;
          // translationY already includes the slop the finger travelled to
          // activate, so subtract it — otherwise the indicator pops open
          // instead of growing from nothing.
          const pulled = event.translationY - PULL_ACTIVATION_SLOP;
          if (scrollY.value <= 0 && pulled > 0) {
            pullDistance.value = Math.min(pulled * PULL_DAMPING, PULL_MAX_DISTANCE);
          } else {
            pullDistance.value = 0;
          }
        })
        .onEnd(() => {
          'worklet';
          if (isRefreshing.value) return;
          if (pullDistance.value >= PULL_TRIGGER_DISTANCE) {
            runOnJS(triggerRefresh)();
          } else {
            pullDistance.value = withTiming(0, { duration: 150 });
          }
        }),
    [triggerRefresh, scrollY, pullDistance, isRefreshing],
  );

  // On Android, wrapping a list in a bare GestureDetector makes RNGH's pan
  // recognizer own the touch stream while it decides activate/fail, which
  // would starve the list's own scrolling of touch-move events. Composing with
  // Gesture.Native() tells RNGH to run the underlying scroll view's native
  // gesture simultaneously instead of gating it on the pan's outcome.
  const gesture = useMemo(
    () => Gesture.Simultaneous(pullGesture, Gesture.Native()),
    [pullGesture],
  );

  return { gesture, onScroll, triggerRefresh, pullDistance, isRefreshing };
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

/**
 * Wraps a scrollable in the pull gesture and renders the indicator above it.
 * Fills its parent, so give it a `flex: 1` slot.
 *
 * The wrapped list must disable native overscroll (`bounces={false}` on iOS,
 * `overScrollMode="never"` on Android) or the native bounce will move the
 * content on top of this transform, doubling the travel.
 */
export function PullToRefreshView({ pull, indicatorTop = 0, children }: PullToRefreshViewProps) {
  const { pullDistance } = pull;

  const listStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pullDistance.value }],
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

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.root, listStyle]}>
        <GestureDetector gesture={pull.gesture}>
          {children}
        </GestureDetector>
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

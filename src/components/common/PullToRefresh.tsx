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

/** Drag px before the pull takes over from a plain vertical drag. */
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
  gesture: ReturnType<typeof Gesture.Pan>;
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
  /** Finger position at touch-down — used to classify drag intent. */
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  /** How far the finger had already travelled when the pull took over, so the
   *  indicator grows from zero rather than jumping to the drag's full length. */
  const anchorTranslationY = useSharedValue(0);
  const engaged = useSharedValue(false);

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
  // accordingly.
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
          pullDistance.value =
            pulled > 0 && scrollY.value <= 0
              ? Math.min(pulled * PULL_DAMPING, PULL_MAX_DISTANCE)
              : 0;
        })
        .onEnd(() => {
          'worklet';
          engaged.value = false;
          if (isRefreshing.value) return;
          if (pullDistance.value >= PULL_TRIGGER_DISTANCE) {
            runOnJS(triggerRefresh)();
          } else {
            pullDistance.value = withTiming(0, { duration: 150 });
          }
        }),
    [triggerRefresh, scrollY, pullDistance, isRefreshing, startX, startY, anchorTranslationY, engaged],
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
 *
 * Any scrollable works — FlatList, SectionList, ScrollView or FlashList. The
 * gesture never activates (see usePullToRefresh), so it doesn't matter which
 * native view RNGH binds this detector to.
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

import React, { ComponentType } from 'react';
import { useIsFocused, useNavigationState, useRoute } from '@react-navigation/native';

/**
 * These screens live on a real Stack (see app/(app)/_layout.tsx), so without
 * this, every screen ever visited stays mounted for the lifetime of the app,
 * accumulating state/timers/query subscriptions. This wrapper unmounts a
 * screen's tree once it's no longer reachable by an in-progress navigation,
 * so leaving it actually frees its resources, and remounts fresh next visit.
 *
 * The screen directly below the focused one is kept mounted rather than
 * unmounted on blur: iOS's interactive swipe-back gesture renders that
 * screen live as the user drags, before the pop is committed and focus
 * actually changes, so unmounting it immediately on blur left the reveal
 * blank mid-swipe. Anything two or more levels back still unmounts as before.
 */
export function withFocusUnmount<P extends object>(Screen: ComponentType<P>) {
  function FocusUnmountedScreen(props: P) {
    const isFocused = useIsFocused();
    const route = useRoute();
    const isPreviousScreen = useNavigationState((state) => {
      const index = state.routes.findIndex((r) => r.key === route.key);
      return index !== -1 && index === state.routes.length - 2;
    });
    if (!isFocused && !isPreviousScreen) return null;
    return <Screen {...props} />;
  }
  FocusUnmountedScreen.displayName = `withFocusUnmount(${Screen.displayName || Screen.name || 'Screen'})`;
  return FocusUnmountedScreen;
}

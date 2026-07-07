import React, { ComponentType } from 'react';
import { useIsFocused } from '@react-navigation/native';

/**
 * Expo Router registers every secondary screen as a sibling route on the same
 * bottom-tabs navigator (see app/(app)/_layout.tsx), and React Navigation's
 * bottom-tabs has no `unmountOnBlur` option (that only exists on stack
 * navigators) — so without this, every screen ever visited stays mounted for
 * the lifetime of the app, accumulating state/timers/query subscriptions.
 * This wrapper unmounts the screen's tree once it loses focus so leaving it
 * actually frees its resources, and remounts fresh next time it's visited.
 */
export function withFocusUnmount<P extends object>(Screen: ComponentType<P>) {
  function FocusUnmountedScreen(props: P) {
    const isFocused = useIsFocused();
    if (!isFocused) return null;
    return <Screen {...props} />;
  }
  FocusUnmountedScreen.displayName = `withFocusUnmount(${Screen.displayName || Screen.name || 'Screen'})`;
  return FocusUnmountedScreen;
}

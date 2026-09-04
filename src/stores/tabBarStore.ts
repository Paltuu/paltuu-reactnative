// src/stores/tabBarStore.ts
// Visibility flag for the bottom tab bar.
//
// The tab bar is rendered by (tabs)/_layout.tsx and normally always on screen.
// A few full-screen overlays that live *inside* a tab screen's tree (rather than
// as their own route above the tabs) need it gone while they're open — e.g. the
// profile screen's in-tree photo viewer/uploader, which otherwise leaves the tab
// row showing along the bottom edge of an otherwise full-bleed photo.
//
// Screens call hideTabBar() on open and showTabBar() on close (and on unmount).
// Nested counter so overlapping hiders don't fight — the bar only returns once
// every hider has released it.
import { create } from 'zustand';

interface TabBarState {
  hiddenCount: number;
  hideTabBar: () => void;
  showTabBar: () => void;
}

export const useTabBarStore = create<TabBarState>((set) => ({
  hiddenCount: 0,
  hideTabBar: () => set((s) => ({ hiddenCount: s.hiddenCount + 1 })),
  showTabBar: () => set((s) => ({ hiddenCount: Math.max(0, s.hiddenCount - 1) })),
}));

/** True when at least one overlay has asked for the tab bar to be hidden. */
export const useTabBarHidden = () => useTabBarStore((s) => s.hiddenCount > 0);

/**
 * Same signal, named for its other consumer: (app)/_layout.tsx suppresses the
 * global notch stopper while an in-tree full-screen overlay is up, so the
 * safe-area strip goes dark with the rest of the screen instead of staying a
 * white band above the photo.
 */
export const useInTreeOverlayActive = () => useTabBarStore((s) => s.hiddenCount > 0);

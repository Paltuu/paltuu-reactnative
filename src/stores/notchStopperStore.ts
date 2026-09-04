// src/stores/notchStopperStore.ts
// Suppresses the "Global Notch Stopper" — the solid safe-area bar (app)/_layout.tsx
// paints across the notch/status-bar strip at zIndex 9999.
//
// The profile photo viewer (own profile in (tabs)/profile/index.tsx, other users
// in profile/[id].tsx) is a full-screen dark overlay that lives *inside* the
// screen's tree (zIndex 100), so it renders far below the notch stopper: without
// this, the viewer's dark backdrop covers the whole screen EXCEPT a white band
// across the top. While the viewer is open it calls hideNotchStopper() so its
// backdrop reaches the very top edge, then showNotchStopper() on close/unmount.
//
// Nested counter so overlapping hiders don't fight — the bar only returns once
// every hider has released it. Nothing but the profile photo viewer touches this.
import { create } from 'zustand';

interface NotchStopperState {
  hiddenCount: number;
  hideNotchStopper: () => void;
  showNotchStopper: () => void;
}

export const useNotchStopperStore = create<NotchStopperState>((set) => ({
  hiddenCount: 0,
  hideNotchStopper: () => set((s) => ({ hiddenCount: s.hiddenCount + 1 })),
  showNotchStopper: () => set((s) => ({ hiddenCount: Math.max(0, s.hiddenCount - 1) })),
}));

/** True while the profile photo viewer wants the notch stopper suppressed. */
export const useNotchStopperHidden = () => useNotchStopperStore((s) => s.hiddenCount > 0);

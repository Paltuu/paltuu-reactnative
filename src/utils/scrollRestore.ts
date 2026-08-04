// A screen wrapped by withFocusUnmount (see src/components/common/withFocusUnmount)
// fully unmounts on blur and remounts fresh next time it's focused, so its
// scroll position can't survive a round trip to a screen pushed on top of it
// (e.g. the fullscreen media viewer, or a tagged post's detail screen) the
// way component state normally would — it just starts back at the top. This
// tiny cross-mount cache lets a screen save/restore its own scroll offset
// around that remount, keyed by whatever identifies its data (a user id, a
// pet id, ...).
const positions = new Map<string, number>();

export function saveScrollPosition(key: string, y: number) {
  positions.set(key, y);
}

export function getScrollPosition(key: string): number | undefined {
  return positions.get(key);
}

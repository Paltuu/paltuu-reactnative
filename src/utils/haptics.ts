// src/utils/haptics.ts
// Small, subtle haptic used when a user likes something (comment, post, …).
// Fire-and-forget: never awaited, never throws into the UI.
import * as Haptics from 'expo-haptics';

/** A very short, very subtle tick — for like/unlike interactions. */
export function triggerLikeHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

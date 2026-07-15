import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

const SWIPE_DISTANCE = 70;
const SWIPE_VELOCITY = 600;

// Shared left<->right swipe-to-navigate gesture for the tab chain:
// create-post <-> home <-> pets <-> search <-> profile
// `rightTo` fires on a left-to-right swipe (finger moves right), `leftTo`
// fires on a right-to-left swipe. Either can be omitted at the ends of the chain.
export function useTabSwipeGesture(rightTo?: string, leftTo?: string) {
  const router = useRouter();

  return useMemo(() => {
    const minX = leftTo ? -1_000_000 : -20;
    const maxX = rightTo ? 1_000_000 : 20;
    return Gesture.Pan()
      .activeOffsetX([minX, maxX])
      .failOffsetY([-14, 14])
      .onEnd((event) => {
        if (rightTo && (event.translationX > SWIPE_DISTANCE || event.velocityX > SWIPE_VELOCITY)) {
          runOnJS(router.push)(rightTo as any);
        } else if (leftTo && (event.translationX < -SWIPE_DISTANCE || event.velocityX < -SWIPE_VELOCITY)) {
          runOnJS(router.push)(leftTo as any);
        }
      });
  }, [router, rightTo, leftTo]);
}

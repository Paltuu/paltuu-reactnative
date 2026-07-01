/**
 * LoadingDots — three bouncing dots, recreated with Reanimated.
 * Mirrors the motion of assets/Loading Spinner (Dots).svg, whose SMIL
 * <animateTransform> keyframes react-native-svg can't play natively.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

const BOUNCE = Easing.bezier(0.4, 0, 0.2, 1);

function Dot({ size, color, delay }: { size: number; color: string; delay: number }) {
  const ty = useSharedValue(0);

  useEffect(() => {
    ty.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-size * 0.6, { duration: 300, easing: BOUNCE }),
          withTiming(0, { duration: 300, easing: BOUNCE }),
          withTiming(0, { duration: 400, easing: BOUNCE }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(ty);
  }, [delay, size]); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));

  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

export function LoadingDots({
  size = 8,
  gap = 6,
  color = '#ffffff',
}: {
  size?: number;
  gap?: number;
  color?: string;
}) {
  return (
    <View style={[s.row, { gap }]}>
      <Dot size={size} color={color} delay={0} />
      <Dot size={size} color={color} delay={130} />
      <Dot size={size} color={color} delay={260} />
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

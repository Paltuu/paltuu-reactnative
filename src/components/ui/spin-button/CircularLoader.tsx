import React, { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface CircularLoaderProps {
  readonly size: number;
  readonly strokeWidth: number;
  readonly activeColor: string;
  readonly duration?: number;
}

// Lightweight border-ring spinner — this project has no react-native-svg
// dependency, so the original SVG-based loader is swapped for a rotating
// circle whose top edge is colored, which reads the same at small sizes.
export const CircularLoader: React.FC<CircularLoaderProps> = ({
  size,
  strokeWidth,
  activeColor,
  duration = 800,
}) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration, easing: Easing.linear }),
      -1,
      false,
    );
  }, [duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: "rgba(255,255,255,0.3)",
          borderTopColor: activeColor,
        },
        animatedStyle,
      ]}
    />
  );
};

export default CircularLoader;

/**
 * GoogleButton — white pill button with the real Google G logo.
 * Matches PaltuuButton's collapse-to-circle loading animation.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Path, ClipPath, Rect, G, Defs } from 'react-native-svg';

const BTN_H = 58;
const SPEED = 420;
const EASING = Easing.bezier(0.65, 0, 0.35, 1);

interface GoogleButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

/** Real multicolour Google "G" logo at any size */
function GoogleG({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <ClipPath id="g">
          <Rect width={24} height={24} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#g)">
        {/* Blue */}
        <Path
          d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
          fill="#4285F4"
        />
        {/* Green */}
        <Path
          d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z"
          fill="#34A853"
        />
        {/* Yellow */}
        <Path
          d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
          fill="#FBBC05"
        />
        {/* Red */}
        <Path
          d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
          fill="#EA4335"
        />
      </G>
    </Svg>
  );
}

/** SVG arc spinner — matches PaltuuButton but in grey for white button */
function Spinner() {
  return (
    <Svg width={44} height={44} viewBox="0 0 50 50">
      <Circle cx="25" cy="25" r="20" fill="none" strokeWidth={5.5} stroke="rgba(0,0,0,0.1)" />
      <Circle
        cx="25" cy="25" r="20"
        fill="none" strokeWidth={5.5}
        stroke="#555"
        strokeLinecap="round"
        strokeDasharray="42 126"
      />
    </Svg>
  );
}

export default function GoogleButton({
  onPress,
  loading = false,
  disabled = false,
  style,
}: GoogleButtonProps) {
  const naturalWidth = useRef(300);
  const prevLoading = useRef(false);

  const btnWidth = useSharedValue(300);
  const contentOp = useSharedValue(1);
  const spinnerOp = useSharedValue(0);
  const spinDeg = useSharedValue(0);
  const pressScale = useSharedValue(1);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > BTN_H) {
      naturalWidth.current = w;
      if (!loading) btnWidth.value = w;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const was = prevLoading.current;
    prevLoading.current = loading;

    if (loading) {
      contentOp.value = withTiming(0, { duration: 180 });
      btnWidth.value = withTiming(BTN_H, { duration: SPEED, easing: EASING });
      spinnerOp.value = withDelay(180, withTiming(1, { duration: 180 }));
      cancelAnimation(spinDeg);
      spinDeg.value = withRepeat(
        withTiming(360, { duration: 750, easing: Easing.linear }),
        -1, false,
      );
    } else if (was) {
      spinnerOp.value = withTiming(0, { duration: 150 });
      cancelAnimation(spinDeg);
      spinDeg.value = 0;
      btnWidth.value = withDelay(80, withTiming(naturalWidth.current, { duration: SPEED, easing: EASING }));
      contentOp.value = withDelay(280, withTiming(1, { duration: 200 }));
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const containerStyle = useAnimatedStyle(() => ({
    width: btnWidth.value,
    transform: [{ scale: pressScale.value }],
  }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOp.value }));
  const spinnerStyle = useAnimatedStyle(() => ({
    opacity: spinnerOp.value,
    transform: [{ rotate: `${spinDeg.value}deg` }],
  }));

  const canPress = !loading && !disabled;

  return (
    <Pressable
      onLayout={handleLayout}
      onPress={canPress ? onPress : undefined}
      onPressIn={canPress ? () => { pressScale.value = withTiming(0.965, { duration: 80 }); } : undefined}
      onPressOut={() => { pressScale.value = withTiming(1, { duration: 120 }); }}
      disabled={!canPress}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
    >
      <Animated.View style={[s.pill, containerStyle, style]}>
        {/* Logo + label */}
        <Animated.View style={[s.row, contentStyle]} pointerEvents="none">
          <GoogleG size={22} />
          <Text style={s.label}>Continue with Google</Text>
        </Animated.View>

        {/* Spinner */}
        <Animated.View style={[s.layer, spinnerStyle]} pointerEvents="none">
          <Spinner />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  pill: {
    height: BTN_H,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  row: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontSize: 16,
    color: '#1F1F1F',
    fontFamily: 'Montserrat_600SemiBold',
    letterSpacing: 0.1,
  },
  layer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/**
 * AppleButton — white pill button with the Apple logo.
 * Matches GoogleButton's theme and collapse-to-circle loading animation.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import {
  Pressable,
  View,
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
import Svg, { Path } from 'react-native-svg';

const BTN_H  = 46;
const SPEED  = 420;
const EASING = Easing.bezier(0.65, 0, 0.35, 1);

interface AppleButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  /** Corner radius. Defaults to a full pill (999); pass a smaller value (e.g. 12) to match a squared-off design. */
  radius?: number;
}

/** Apple logo from assets/icons/apple-logo-svgrepo-com.svg */
function AppleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#000000"
        d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"
      />
    </Svg>
  );
}

export default function AppleButton({
  onPress,
  loading = false,
  disabled = false,
  style,
  radius = 999,
}: AppleButtonProps) {
  const naturalWidth = useRef(300);
  const prevLoading  = useRef(false);

  // Updated during render so the onLayout callback sees current loading state
  // instead of the stale closure value (useCallback has empty deps).
  const isLoadingRef = useRef(false);
  isLoadingRef.current = loading;

  const btnWidth   = useSharedValue(300);
  const contentOp  = useSharedValue(1);
  const spinnerOp  = useSharedValue(0);
  const spinDeg    = useSharedValue(0);
  const pressScale = useSharedValue(1);

  // onLayout on the Pressable (stable) — not the animated pill —
  // so it won't fire mid-animation and cancel the collapse.
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > BTN_H) {
      naturalWidth.current = w;
      if (!isLoadingRef.current) btnWidth.value = w;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const was = prevLoading.current;
    prevLoading.current = loading;

    if (loading) {
      contentOp.value = withTiming(0, { duration: 180 });
      btnWidth.value  = withTiming(BTN_H, { duration: SPEED, easing: EASING });
      spinnerOp.value = withDelay(180, withTiming(1, { duration: 180 }));
      cancelAnimation(spinDeg);
      spinDeg.value = withRepeat(
        withTiming(360, { duration: 750, easing: Easing.linear }),
        -1, false,
      );
    } else if (was) {
      spinnerOp.value = withTiming(0, { duration: 150 });
      cancelAnimation(spinDeg);
      spinDeg.value   = 0;
      btnWidth.value  = withDelay(80, withTiming(naturalWidth.current, { duration: SPEED, easing: EASING }));
      contentOp.value = withDelay(280, withTiming(1, { duration: 200 }));
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const containerStyle = useAnimatedStyle(() => ({
    width:     btnWidth.value,
    transform: [{ scale: pressScale.value }],
  }));
  const contentStyle  = useAnimatedStyle(() => ({ opacity: contentOp.value }));
  const spinnerStyle  = useAnimatedStyle(() => ({
    opacity:   spinnerOp.value,
    transform: [{ rotate: `${spinDeg.value}deg` }],
  }));

  const canPress = !loading && !disabled;

  return (
    <Pressable
      onLayout={handleLayout}
      onPress={canPress ? onPress : undefined}
      onPressIn={canPress ? () => { pressScale.value = withTiming(0.985, { duration: 80 }); } : undefined}
      onPressOut={() => { pressScale.value = withTiming(1, { duration: 120 }); }}
      disabled={!canPress}
      accessibilityRole="button"
      accessibilityLabel="Continue with Apple"
      style={s.pressable}
    >
      <View style={s.centerWrap}>
        <Animated.View
          style={[s.pill, { borderRadius: radius }, containerStyle, style]}
        >
          {/* Logo + label */}
          <Animated.View style={[s.row, contentStyle]} pointerEvents="none">
            <AppleLogo size={28} />
            <Text style={s.label}>Apple</Text>
          </Animated.View>

          {/* Spinner — dark arc on white button */}
          <Animated.View style={[s.layer, spinnerStyle]} pointerEvents="none">
            <View style={s.spinnerRing} />
          </Animated.View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  centerWrap: {
    alignItems: 'center',
  },
  pill: {
    height:          BTN_H,
    backgroundColor: '#FFFFFF',
    borderRadius:    999,
    overflow:        'hidden',
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1.5,
    borderColor:     '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor:   '#000',
        shadowOffset:  { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius:  8,
      },
      android: { elevation: 2 },
    }),
  },
  row: {
    position:      'absolute',
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },
  label: {
    fontSize:      16,
    color:         'rgba(31,31,31,0.6)',
    fontFamily:    'Montserrat_500Medium',
    letterSpacing: 0.1,
  },
  layer: {
    position:       'absolute',
    top:            0,
    left:           0,
    right:          0,
    bottom:         0,
    alignItems:     'center',
    justifyContent: 'center',
  },
  // Arc spinner: muted ring + one dark segment at top
  spinnerRing: {
    width:          38,
    height:         38,
    borderRadius:   19,
    borderWidth:    3.5,
    borderColor:    'rgba(0,0,0,0.1)',
    borderTopColor: '#555555',
  },
});

/**
 * AppleButton — white pill button with the Apple logo.
 * Loading state matches GoogleButton/PaltuuButton: fixed shape, bouncing dots.
 */
import React, { useEffect, useRef } from 'react';
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { LoadingDots } from './LoadingDots';

const BTN_H  = 46;

interface AppleButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  /** Corner radius. Defaults to a full pill (999); pass a smaller value (e.g. 12) to match a squared-off design. */
  radius?: number;
}

/** Apple logo from assets/icons/apple-logo-svgrepo-com.svg */
export function AppleLogo({ size = 20, color = '#000000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
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
  const prevLoading = useRef(false);

  const contentOp  = useSharedValue(1);
  const spinnerOp  = useSharedValue(0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    const was = prevLoading.current;
    prevLoading.current = loading;

    if (loading) {
      contentOp.value = withTiming(0, { duration: 180 });
      spinnerOp.value = withDelay(180, withTiming(1, { duration: 180 }));
    } else if (was) {
      spinnerOp.value = withTiming(0, { duration: 150 });
      contentOp.value = withDelay(80, withTiming(1, { duration: 200 }));
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOp.value }));
  const spinnerStyle = useAnimatedStyle(() => ({ opacity: spinnerOp.value }));

  const canPress = !loading && !disabled;

  return (
    <Pressable
      onPress={canPress ? onPress : undefined}
      onPressIn={canPress ? () => { pressScale.value = withTiming(0.985, { duration: 80 }); } : undefined}
      onPressOut={() => { pressScale.value = withTiming(1, { duration: 120 }); }}
      disabled={!canPress}
      accessibilityRole="button"
      accessibilityLabel="Continue with Apple"
      accessibilityState={{ busy: loading, disabled }}
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

          {/* Loading dots */}
          <Animated.View style={[s.layer, spinnerStyle]} pointerEvents="none">
            <LoadingDots size={8} gap={7} color="#555555" />
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
    // Row/dots content below is all position:absolute (for the cross-fade),
    // so it carries no intrinsic width — the pill needs an explicit one.
    width:           '100%',
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
});

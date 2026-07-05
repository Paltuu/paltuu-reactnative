/**
 * PaltuuButton — pill CTA button
 *
 * Idle → press → [label fades out, three dots bounce in place] → [label/success fades back in] → idle
 * The button never changes size or shape while loading — only its content swaps.
 *
 * compact prop: shrinks to a small inline pill suitable for headers/toolbars.
 *   - height 34 instead of 46
 *   - sizes to content width (not full-width)
 *   - same animation
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
  Easing,
} from 'react-native-reanimated';
import { LoadingDots } from './LoadingDots';

const PRIMARY      = '#a03048';
const SPEED        = 420;
const SUCCESS_HOLD = 1000;

const FULL_H    = 46;
const COMPACT_H = 34;

interface PaltuuButtonProps {
  label: string;
  successLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  style?: ViewStyle;
  /** Shrinks to a small inline pill — use in headers / toolbars */
  compact?: boolean;
  /** Corner radius. Defaults to a full pill (999); pass a smaller value (e.g. 12) to match a squared-off design. */
  radius?: number;
}

export default function PaltuuButton({
  label,
  successLabel = '✓  Done',
  loading = false,
  disabled = false,
  onPress,
  style,
  compact = false,
  radius = 999,
}: PaltuuButtonProps) {
  const BTN_H = compact ? COMPACT_H : FULL_H;

  const prevLoading  = useRef<boolean>(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const labelOp    = useSharedValue(1);
  const spinnerOp  = useSharedValue(0);
  const successOp  = useSharedValue(0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    const wasLoading = prevLoading.current;
    prevLoading.current = loading;

    if (loading) {
      if (successTimer.current) clearTimeout(successTimer.current);
      labelOp.value   = withTiming(0, { duration: 180 });
      successOp.value = withTiming(0, { duration: 120 });
      spinnerOp.value = withDelay(200, withTiming(1, { duration: 180 }));
    } else if (wasLoading) {
      spinnerOp.value = withTiming(0, { duration: 150 });
      if (successLabel) {
        successOp.value = withDelay(200, withTiming(1, { duration: 200 }));
        successTimer.current = setTimeout(() => {
          successOp.value = withTiming(0, { duration: 200 });
          labelOp.value   = withDelay(150, withTiming(1, { duration: 200 }));
        }, SUCCESS_HOLD);
      } else {
        labelOp.value = withDelay(150, withTiming(1, { duration: 200 }));
      }
    }

    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const labelAnimStyle   = useAnimatedStyle(() => ({ opacity: labelOp.value }));
  const spinnerAnimStyle = useAnimatedStyle(() => ({ opacity: spinnerOp.value }));
  const successAnimStyle = useAnimatedStyle(() => ({ opacity: successOp.value }));

  const handlePressIn  = () => { pressScale.value = withTiming(0.985, { duration: 80 }); };
  const handlePressOut = () => { pressScale.value = withTiming(1,     { duration: 120 }); };

  const canPress = !loading && !disabled;

  const fontSize = compact ? 13 : 17;
  const hPadding = compact ? 16 : 0;

  const pillStyle: ViewStyle = {
    height:          BTN_H,
    // Not compact: fill the row. Compact: the hidden sizer text below (in
    // normal flow) drives the width instead, since the visible label/dots/
    // success layers are all position:absolute and carry no intrinsic size.
    width:           compact ? undefined : '100%',
    backgroundColor: disabled && !loading ? '#D1D5DB' : PRIMARY,
    borderRadius:    radius,
    overflow:        'hidden',
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: compact ? hPadding : 0,
    ...Platform.select({
      ios: {
        shadowColor:   '#000',
        shadowOffset:  { width: 0, height: compact ? 4 : 8 },
        shadowOpacity: compact ? 0.12 : 0.18,
        shadowRadius:  compact ? 8 : 14,
      },
      android: { elevation: compact ? 3 : 6 },
    }),
  };

  const containerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <Pressable
      onPress={canPress ? onPress : undefined}
      onPressIn={canPress ? handlePressIn : undefined}
      onPressOut={handlePressOut}
      disabled={!canPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading, disabled }}
      style={compact ? s.pressableCompact : s.pressableFull}
    >
      <View style={s.centerWrap}>
        <Animated.View style={[pillStyle, containerAnimStyle, style]}>

          {/* Compact only: invisible in-flow text sizes the pill to its
              widest content, since the real label/dots/success below are
              all position:absolute and carry no intrinsic width. */}
          {compact && (
            <Text style={[s.text, s.sizerText, { fontSize }]} numberOfLines={1} allowFontScaling={false} pointerEvents="none">
              {(successLabel?.length ?? 0) > label.length ? successLabel : label}
            </Text>
          )}

          {/* Idle label */}
          <Animated.Text
            style={[s.text, { fontSize }, labelAnimStyle]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {label}
          </Animated.Text>

          {/* Loading dots */}
          <Animated.View style={[s.layer, spinnerAnimStyle]} pointerEvents="none">
            <LoadingDots size={compact ? 5 : 6} gap={compact ? 4 : 6} color="#ffffff" />
          </Animated.View>

          {/* Success label */}
          {successLabel ? (
            <Animated.Text
              style={[s.text, { fontSize }, successAnimStyle]}
              numberOfLines={1}
              allowFontScaling={false}
              pointerEvents="none"
            >
              {successLabel}
            </Animated.Text>
          ) : null}

        </Animated.View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  pressableFull: {
    width: '100%',
  },
  pressableCompact: {
    alignSelf: 'flex-start',
  },
  centerWrap: {
    alignItems: 'center',
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
  text: {
    position:      'absolute',
    color:         '#ffffff',
    fontFamily:    'Montserrat_600SemiBold',
    letterSpacing: 0.2,
  },
  sizerText: {
    position: 'relative',
    opacity:  0,
  },
});

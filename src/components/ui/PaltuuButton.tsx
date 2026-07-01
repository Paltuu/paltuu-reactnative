/**
 * PaltuuButton — animated pill CTA button
 *
 * Idle  → press → [collapse to circle + spinner] → [expand + success flash] → idle
 *
 * compact prop: shrinks to a small inline pill suitable for headers/toolbars.
 *   - height 34 instead of 58
 *   - sizes to content width (not full-width)
 *   - same animation
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  Pressable,
  View,
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
import { LoadingDots } from './LoadingDots';

const PRIMARY      = '#a03048';
const SPEED        = 420;
const SUCCESS_HOLD = 1000;
const EASING_CURVE = Easing.bezier(0.65, 0, 0.35, 1);

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
  /** Loading indicator style: spinning ring (default) or bouncing dots */
  loaderType?: 'ring' | 'dots';
  /** Collapses the pill to a circle while loading (default). Set false to keep the button's size/shape and only swap its content. */
  collapseOnLoad?: boolean;
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
  loaderType = 'ring',
  collapseOnLoad = true,
  radius = 999,
}: PaltuuButtonProps) {
  const BTN_H = compact ? COMPACT_H : FULL_H;

  const naturalWidth = useRef<number>(compact ? 80 : 300);
  const prevLoading  = useRef<boolean>(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Updated during render so the onLayout callback always sees current loading
  // state even though handleLayout has empty useCallback deps (no stale closure).
  const isLoadingRef = useRef(false);
  isLoadingRef.current = loading;

  const btnWidth   = useSharedValue(naturalWidth.current);
  const labelOp    = useSharedValue(1);
  const spinnerOp  = useSharedValue(0);
  const successOp  = useSharedValue(0);
  const spinDeg    = useSharedValue(0);
  const pressScale = useSharedValue(1);

  // onLayout on the Pressable (stable — doesn't animate) captures the
  // container width on first render and after orientation change.
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > BTN_H) {
      naturalWidth.current = w;
      if (!isLoadingRef.current) {
        btnWidth.value = w;
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const wasLoading = prevLoading.current;
    prevLoading.current = loading;

    if (loading) {
      if (successTimer.current) clearTimeout(successTimer.current);
      labelOp.value   = withTiming(0, { duration: 180 });
      successOp.value = withTiming(0, { duration: 120 });
      if (collapseOnLoad) {
        btnWidth.value = withTiming(BTN_H, { duration: SPEED, easing: EASING_CURVE });
      }
      spinnerOp.value = withDelay(200, withTiming(1, { duration: 180 }));
      cancelAnimation(spinDeg);
      spinDeg.value = withRepeat(
        withTiming(360, { duration: 750, easing: Easing.linear }),
        -1,
        false,
      );
    } else if (wasLoading) {
      spinnerOp.value = withTiming(0, { duration: 150 });
      cancelAnimation(spinDeg);
      spinDeg.value  = 0;
      if (collapseOnLoad) {
        btnWidth.value = withDelay(
          80,
          withTiming(naturalWidth.current, { duration: SPEED, easing: EASING_CURVE }),
        );
      }
      if (successLabel) {
        successOp.value = withDelay(200, withTiming(1, { duration: 200 }));
        successTimer.current = setTimeout(() => {
          successOp.value = withTiming(0, { duration: 200 });
          labelOp.value   = withDelay(150, withTiming(1, { duration: 200 }));
        }, SPEED + SUCCESS_HOLD);
      } else {
        labelOp.value = withDelay(280, withTiming(1, { duration: 200 }));
      }
    }

    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const containerAnimStyle = useAnimatedStyle(() => ({
    width:     btnWidth.value,
    transform: [{ scale: pressScale.value }],
  }));
  const labelAnimStyle   = useAnimatedStyle(() => ({ opacity: labelOp.value }));
  const spinnerAnimStyle = useAnimatedStyle(() => ({ opacity: spinnerOp.value }));
  const ringAnimStyle    = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinDeg.value}deg` }],
  }));
  const successAnimStyle = useAnimatedStyle(() => ({ opacity: successOp.value }));

  const handlePressIn  = () => { pressScale.value = withTiming(0.985, { duration: 80 }); };
  const handlePressOut = () => { pressScale.value = withTiming(1,     { duration: 120 }); };

  const canPress = !loading && !disabled;

  // Spinner and text sizing differ between full and compact
  const spinnerSize  = compact ? 22 : 38;
  const spinnerBorder = compact ? 2.5 : 3.5;
  const fontSize     = compact ? 13 : 17;
  const hPadding     = compact ? 16 : 0;

  const pillStyle: ViewStyle = {
    height:          BTN_H,
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

  return (
    <Pressable
      onLayout={handleLayout}
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

          {/* Idle label */}
          <Animated.Text
            style={[s.text, { fontSize }, labelAnimStyle]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {label}
          </Animated.Text>

          {/* Spinner */}
          <Animated.View style={[s.layer, spinnerAnimStyle]} pointerEvents="none">
            {loaderType === 'dots' ? (
              <LoadingDots size={compact ? 6 : 8} gap={compact ? 5 : 7} color="#ffffff" />
            ) : (
              <Animated.View
                style={[
                  {
                    width:          spinnerSize,
                    height:         spinnerSize,
                    borderRadius:   spinnerSize / 2,
                    borderWidth:    spinnerBorder,
                    borderColor:    'rgba(255,255,255,0.22)',
                    borderTopColor: '#ffffff',
                  },
                  ringAnimStyle,
                ]}
              />
            )}
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
});

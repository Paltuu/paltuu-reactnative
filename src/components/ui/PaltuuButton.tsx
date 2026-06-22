/**
 * PaltuuButton — animated pill CTA button
 *
 * Idle  → press → [collapse to circle + spinner] → [expand + success flash] → idle
 *
 * Usage:
 *   <PaltuuButton label="Log in"   successLabel="Logged in"  loading={isPending} onPress={handleLogin} />
 *   <PaltuuButton label="Post"     successLabel="Posted!"    loading={isPending} onPress={handlePost} />
 *   <PaltuuButton compact label="Post" successLabel="Posted!" loading={isPending} onPress={handlePost} />
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

// ─── Design tokens ───────────────────────────────────────────────────────────

const PRIMARY       = '#a03048';
const BTN_H_FULL    = 58;
const BTN_H_COMPACT = 34;
const SPEED         = 420;
const SUCCESS_HOLD  = 1000;
const EASING        = Easing.bezier(0.65, 0, 0.35, 1);

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaltuuButtonProps {
  label: string;
  successLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  style?: ViewStyle;
  /** Compact variant — smaller pill that sizes to its content; use in headers */
  compact?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaltuuButton({
  label,
  successLabel = '✓  Done',
  loading = false,
  disabled = false,
  onPress,
  style,
  compact = false,
}: PaltuuButtonProps) {
  const BTN_H = compact ? BTN_H_COMPACT : BTN_H_FULL;

  const naturalWidth = useRef<number>(compact ? 80 : 300);
  const prevLoading  = useRef<boolean>(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Updated every render so handleLayout (empty useCallback deps) always sees
  // the current loading state and doesn't cancel an in-flight animation.
  const isLoadingRef = useRef(false);
  isLoadingRef.current = loading;

  const btnWidth   = useSharedValue(naturalWidth.current);
  const labelOp    = useSharedValue(1);
  const spinnerOp  = useSharedValue(0);
  const successOp  = useSharedValue(0);
  const spinDeg    = useSharedValue(0);
  const pressScale = useSharedValue(1);

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
      btnWidth.value  = withTiming(BTN_H, { duration: SPEED, easing: EASING });
      spinnerOp.value = withDelay(180, withTiming(1, { duration: 180 }));
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
      btnWidth.value = withDelay(
        80,
        withTiming(naturalWidth.current, { duration: SPEED, easing: EASING }),
      );
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
  const spinnerAnimStyle = useAnimatedStyle(() => ({
    opacity:   spinnerOp.value,
    transform: [{ rotate: `${spinDeg.value}deg` }],
  }));
  const successAnimStyle = useAnimatedStyle(() => ({ opacity: successOp.value }));

  const handlePressIn  = () => { pressScale.value = withTiming(0.985, { duration: 80 }); };
  const handlePressOut = () => { pressScale.value = withTiming(1,     { duration: 120 }); };

  const canPress = !loading && !disabled;

  // SVG spinner size scales with button height
  const svgSize  = compact ? 26 : 44;
  const strokeW  = compact ? 4   : 5.5;
  const fontSize = compact ? 13  : 17;

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
      {/* Center the pill so it collapses symmetrically rather than to one edge */}
      <View style={s.centerWrap}>
        <Animated.View style={[compact ? s.pillCompact : s.pill, containerAnimStyle, style]}>

          {/* Idle label */}
          <Animated.Text
            style={[s.text, { fontSize }, labelAnimStyle]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {label}
          </Animated.Text>

          {/* Spinner — border-arc View, no SVG needed */}
          <Animated.View style={[s.layer, spinnerAnimStyle]} pointerEvents="none">
            <View
              style={{
                width:          svgSize,
                height:         svgSize,
                borderRadius:   svgSize / 2,
                borderWidth:    strokeW,
                borderColor:    'rgba(255,255,255,0.22)',
                borderTopColor: '#ffffff',
              }}
            />
          </Animated.View>

          {/* Success label */}
          {successLabel ? (
            <Animated.Text
              style={[s.text, { fontSize: compact ? 12 : 16 }, successAnimStyle]}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  pill: {
    height:          BTN_H_FULL,
    backgroundColor: PRIMARY,
    borderRadius:    999,
    overflow:        'hidden',
    alignItems:      'center',
    justifyContent:  'center',
    ...Platform.select({
      ios: {
        shadowColor:   '#000',
        shadowOffset:  { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius:  14,
      },
      android: { elevation: 6 },
    }),
  },
  pillCompact: {
    height:           BTN_H_COMPACT,
    backgroundColor:  PRIMARY,
    borderRadius:     999,
    overflow:         'hidden',
    alignItems:       'center',
    justifyContent:   'center',
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor:   '#000',
        shadowOffset:  { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius:  8,
      },
      android: { elevation: 3 },
    }),
  },
  layer: {
    position:       'absolute',
    alignItems:     'center',
    justifyContent: 'center',
  },
  text: {
    position:      'absolute',
    color:         '#ffffff',
    fontWeight:    '700',
    fontFamily:    'Montserrat_700Bold',
    letterSpacing: 0.2,
  },
});

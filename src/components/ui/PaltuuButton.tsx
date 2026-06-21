/**
 * PaltuuButton — animated pill CTA button
 *
 * Idle  → press → [collapse to circle + spinner] → [expand + success flash] → idle
 *
 * Usage:
 *   <PaltuuButton label="Log in"   successLabel="Logged in"  loading={isPending} onPress={handleLogin} />
 *   <PaltuuButton label="Post"     successLabel="Posted!"    loading={isPending} onPress={handlePost} />
 *   <PaltuuButton label="Save"     successLabel="Saved"      loading={isPending} onPress={handleSave} />
 *   <PaltuuButton label="Submit"   successLabel="Submitted!" loading={isPending} onPress={handleSubmit} />
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  Pressable,
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
  withSequence,
  cancelAnimation,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

// ─── Design tokens ───────────────────────────────────────────────────────────

const PRIMARY  = '#a03048';
const BTN_H    = 58;          // height = diameter of circle in loading state
const SPEED    = 420;         // pill ↔ circle morph duration (ms)
const SUCCESS_HOLD = 1000;    // how long to show success text before reset (ms)
const EASING   = Easing.bezier(0.65, 0, 0.35, 1);

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaltuuButtonProps {
  /** Text shown in idle state — e.g. "Log in", "Post", "Save" */
  label: string;
  /** Text shown briefly after success — e.g. "Posted!", "Saved" */
  successLabel?: string;
  /** Whether the async action is in-flight */
  loading?: boolean;
  /** Prevents interaction (greyed is intentionally NOT applied — keep brand colour) */
  disabled?: boolean;
  onPress: () => void;
  /** Optional extra styles applied to the pill container */
  style?: ViewStyle;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaltuuButton({
  label,
  successLabel = '✓  Done',
  loading = false,
  disabled = false,
  onPress,
  style,
}: PaltuuButtonProps) {
  // Capture natural (expanded) width after layout so we know what to animate back to
  const naturalWidth = useRef<number>(300);
  const prevLoading  = useRef<boolean>(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Shared animated values ──
  const btnWidth    = useSharedValue(300);   // pill width
  const labelOp     = useSharedValue(1);     // idle label opacity
  const spinnerOp   = useSharedValue(0);     // spinner opacity
  const successOp   = useSharedValue(0);     // success label opacity
  const spinDeg     = useSharedValue(0);     // spinner rotation
  const pressScale  = useSharedValue(1);     // tap feedback

  // ── Store natural width on first layout ──
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > BTN_H) {
      naturalWidth.current = w;
      // Only set if we're currently in idle (avoid stomping an active animation)
      if (!loading) {
        btnWidth.value = w;
      }
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── React to loading prop changes ──
  useEffect(() => {
    const wasLoading = prevLoading.current;
    prevLoading.current = loading;

    if (loading) {
      // Clear any pending success reset
      if (successTimer.current) clearTimeout(successTimer.current);

      // 1. Fade label out
      labelOp.value   = withTiming(0, { duration: 180 });
      successOp.value = withTiming(0, { duration: 120 });

      // 2. Collapse pill → circle
      btnWidth.value = withTiming(BTN_H, { duration: SPEED, easing: EASING });

      // 3. Fade spinner in (after collapse is halfway done)
      spinnerOp.value = withDelay(180, withTiming(1, { duration: 180 }));

      // 4. Spin forever until stopped
      cancelAnimation(spinDeg);
      spinDeg.value = withRepeat(
        withTiming(360, { duration: 750, easing: Easing.linear }),
        -1,
        false,
      );

    } else if (wasLoading) {
      // loading just turned false — play success then reset

      // 1. Fade spinner out, stop spinning
      spinnerOp.value = withTiming(0, { duration: 150 });
      cancelAnimation(spinDeg);
      spinDeg.value = 0;

      // 2. Expand circle → pill
      btnWidth.value = withDelay(
        80,
        withTiming(naturalWidth.current, { duration: SPEED, easing: EASING }),
      );

      if (successLabel) {
        // 3. Show success label
        successOp.value = withDelay(200, withTiming(1, { duration: 200 }));

        // 4. After a moment, fade success out and fade idle label back in
        successTimer.current = setTimeout(() => {
          successOp.value = withTiming(0, { duration: 200 });
          labelOp.value   = withDelay(150, withTiming(1, { duration: 200 }));
        }, SPEED + SUCCESS_HOLD);
      } else {
        // No success label — just fade the idle label back in
        labelOp.value = withDelay(280, withTiming(1, { duration: 200 }));
      }
    }

    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Animated styles ──
  const containerAnimStyle = useAnimatedStyle(() => ({
    width:     btnWidth.value,
    transform: [{ scale: pressScale.value }],
  }));

  const labelAnimStyle = useAnimatedStyle(() => ({
    opacity: labelOp.value,
  }));

  const spinnerAnimStyle = useAnimatedStyle(() => ({
    opacity:   spinnerOp.value,
    transform: [{ rotate: `${spinDeg.value}deg` }],
  }));

  const successAnimStyle = useAnimatedStyle(() => ({
    opacity: successOp.value,
  }));

  // ── Press feedback (scale on tap in / out) ──
  const handlePressIn  = () => { pressScale.value = withTiming(0.965, { duration: 80 }); };
  const handlePressOut = () => { pressScale.value = withTiming(1,     { duration: 120 }); };

  const canPress = !loading && !disabled;

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
    >
      <Animated.View style={[s.pill, containerAnimStyle, style]}>

        {/* Idle label */}
        <Animated.Text
          style={[s.text, labelAnimStyle]}
          numberOfLines={1}
          allowFontScaling={false}
        >
          {label}
        </Animated.Text>

        {/* Spinner (SVG arc — matches web version exactly) */}
        <Animated.View style={[s.layer, spinnerAnimStyle]} pointerEvents="none">
          <Svg width={44} height={44} viewBox="0 0 50 50">
            {/* Track circle */}
            <Circle
              cx="25" cy="25" r="20"
              fill="none"
              strokeWidth={5.5}
              stroke="rgba(255,255,255,0.22)"
            />
            {/* Animated arc */}
            <Circle
              cx="25" cy="25" r="20"
              fill="none"
              strokeWidth={5.5}
              stroke="#ffffff"
              strokeLinecap="round"
              strokeDasharray="42 126"
            />
          </Svg>
        </Animated.View>

        {/* Success label */}
        {successLabel ? (
          <Animated.Text
            style={[s.text, s.successText, successAnimStyle]}
            numberOfLines={1}
            allowFontScaling={false}
            pointerEvents="none"
          >
            {successLabel}
          </Animated.Text>
        ) : null}

      </Animated.View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  pill: {
    height:          BTN_H,
    backgroundColor: PRIMARY,
    borderRadius:    999,
    overflow:        'hidden',
    alignItems:      'center',
    justifyContent:  'center',
    // Shadow
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
  layer: {
    position:        'absolute',
    alignItems:      'center',
    justifyContent:  'center',
  },
  text: {
    position:        'absolute',
    color:           '#ffffff',
    fontSize:        17,
    fontWeight:      '700',
    fontFamily:      'Montserrat_700Bold',
    letterSpacing:   0.2,
  },
  successText: {
    fontSize: 16,
  },
});

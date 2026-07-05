/**
 * GoogleButton — white pill button with the real Google G logo.
 * Loading state matches PaltuuButton/AppleButton: fixed shape, bouncing dots.
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

interface GoogleButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  /** Corner radius. Defaults to a full pill (999); pass a smaller value (e.g. 12) to match a squared-off design. */
  radius?: number;
}

/** Real multicolour Google "G" logo from assets/icons/google-color-svgrepo-com.svg */
export function GoogleG({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="-0.5 0 48 48">
      <Path
        fill="#FBBC05"
        d="M9.82727273,24 C9.82727273,22.4757333 10.0804318,21.0144 10.5322727,19.6437333 L2.62345455,13.6042667 C1.08206818,16.7338667 0.213636364,20.2602667 0.213636364,24 C0.213636364,27.7365333 1.081,31.2608 2.62025,34.3882667 L10.5247955,28.3370667 C10.0772273,26.9728 9.82727273,25.5168 9.82727273,24"
      />
      <Path
        fill="#EB4335"
        d="M23.7136364,10.1333333 C27.025,10.1333333 30.0159091,11.3066667 32.3659091,13.2266667 L39.2022727,6.4 C35.0363636,2.77333333 29.6954545,0.533333333 23.7136364,0.533333333 C14.4268636,0.533333333 6.44540909,5.84426667 2.62345455,13.6042667 L10.5322727,19.6437333 C12.3545909,14.112 17.5491591,10.1333333 23.7136364,10.1333333"
      />
      <Path
        fill="#34A853"
        d="M23.7136364,37.8666667 C17.5491591,37.8666667 12.3545909,33.888 10.5322727,28.3562667 L2.62345455,34.3946667 C6.44540909,42.1557333 14.4268636,47.4666667 23.7136364,47.4666667 C29.4455,47.4666667 34.9177955,45.4314667 39.0249545,41.6181333 L31.5177727,35.8144 C29.3995682,37.1488 26.7323182,37.8666667 23.7136364,37.8666667"
      />
      <Path
        fill="#4285F4"
        d="M46.1454545,24 C46.1454545,22.6133333 45.9318182,21.12 45.6113636,19.7333333 L23.7136364,19.7333333 L23.7136364,28.8 L36.3181818,28.8 C35.6879545,31.8912 33.9724545,34.2677333 31.5177727,35.8144 L39.0249545,41.6181333 C43.3393409,37.6138667 46.1454545,31.6490667 46.1454545,24"
      />
    </Svg>
  );
}

export default function GoogleButton({
  onPress,
  loading = false,
  disabled = false,
  style,
  radius = 999,
}: GoogleButtonProps) {
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
      accessibilityLabel="Continue with Google"
      accessibilityState={{ busy: loading, disabled }}
      style={s.pressable}
    >
      <View style={s.centerWrap}>
        <Animated.View
          style={[s.pill, { borderRadius: radius }, containerStyle, style]}
        >
          {/* Logo + label */}
          <Animated.View style={[s.row, contentStyle]} pointerEvents="none">
            <GoogleG size={22} />
            <Text style={s.label}>Google</Text>
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

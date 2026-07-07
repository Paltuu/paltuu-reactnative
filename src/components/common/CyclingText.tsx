import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, TextStyle, StyleProp, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  runOnJS,
  LinearTransition,
  Easing,
} from 'react-native-reanimated';

// Same staggered character-reveal used by the cycling placeholder in SearchBar.tsx,
// extracted here so other screens (e.g. Pets Hub greeting) can reuse it.

const ENTER_DURATION = 300;
const EXIT_DURATION = 200;
const DELAY_INCREMENT = 30;
// Cap the stagger so long sentences don't keep dozens of springs running
// concurrently — the leading characters still stagger visibly, the tail
// just catches up instead of queuing further out.
const MAX_STAGGER_INDEX = 12;
const SPRING_CONFIG = { damping: 15, stiffness: 150, mass: 0.9 };

// A fixed pool of character slots that never remounts. Recreating ~30-40
// native Text views every cycle (old ones exiting + new ones entering) is
// far more expensive than the animation itself — that mount/unmount churn is
// what was tanking FPS on real devices. Instead each slot stays mounted for
// the component's lifetime and just replays the same fade/translateY/scale
// sequence whenever the character it's showing changes.
const PooledCharacter = React.memo(function PooledCharacter({
  char,
  index,
  style,
}: {
  char: string;
  index: number;
  style?: StyleProp<TextStyle>;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(0.5);
  const [displayChar, setDisplayChar] = useState(char);
  const charRef = useRef(char);
  const delay = Math.min(index, MAX_STAGGER_INDEX) * DELAY_INCREMENT;

  useEffect(() => {
    // Mount (including a slot appearing for the first time as the pool
    // grows to fit a longer string) — play the entrance once.
    opacity.value = withDelay(delay, withTiming(1, { duration: ENTER_DURATION }));
    translateY.value = withDelay(delay, withSpring(0, SPRING_CONFIG));
    scale.value = withDelay(delay, withSpring(1, SPRING_CONFIG));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (charRef.current === char) return;
    charRef.current = char;

    opacity.value = withDelay(
      delay,
      withTiming(0, { duration: EXIT_DURATION }, (finished) => {
        'worklet';
        if (!finished) return;
        runOnJS(setDisplayChar)(char);
        opacity.value = withTiming(1, { duration: ENTER_DURATION });
        translateY.value = 20;
        scale.value = 0.5;
        translateY.value = withSpring(0, SPRING_CONFIG);
        scale.value = withSpring(1, SPRING_CONFIG);
      }),
    );
    translateY.value = withDelay(delay, withTiming(-5, { duration: EXIT_DURATION }));
    scale.value = withDelay(delay, withTiming(0.5, { duration: EXIT_DURATION }));
  }, [char]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return <Animated.Text style={[style, animatedStyle]}>{displayChar}</Animated.Text>;
});

export const StaggeredPlaceholder = ({
  text,
  style,
  wrap = false,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  /** Allow characters to wrap onto multiple lines (e.g. a multi-word greeting subtitle). */
  wrap?: boolean;
}) => {
  // The pool only ever grows, converging on the longest string once every
  // cycled value has been seen — after that, zero mounts/unmounts per cycle.
  const maxLenRef = useRef(0);
  maxLenRef.current = Math.max(maxLenRef.current, text.length);
  const poolSize = maxLenRef.current;

  const chars = useMemo(() => Array.from(text), [text]);

  // TEMP: animation disabled to isolate whether it's the source of the FPS
  // drop. Restore by dropping this early return.
  return <Text style={style}>{text}</Text>;

  return (
    <Animated.View
      style={[styles.wrapper, { flexWrap: wrap ? 'wrap' : 'nowrap' }]}
      layout={LinearTransition.duration(300).easing(Easing.bezier(0.25, 0.1, 0.25, 1))}
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
    >
      {Array.from({ length: poolSize }).map((_, index) => (
        <PooledCharacter key={index} char={chars[index] ?? ''} index={index} style={style} />
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
  },
});

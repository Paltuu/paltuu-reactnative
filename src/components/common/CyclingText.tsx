import React from 'react';
import { Text, TextStyle, StyleProp, StyleSheet } from 'react-native';
import Animated, {
  withTiming,
  withDelay,
  withSpring,
  LinearTransition,
  Easing,
} from 'react-native-reanimated';

// Same staggered character-reveal used by the cycling placeholder in SearchBar.tsx,
// extracted here so other screens (e.g. Pets Hub greeting) can reuse it.

const ENTER_DURATION = 300;
const EXIT_DURATION = 200;
const DELAY_INCREMENT = 30;

const Character = ({
  char,
  index,
  style,
}: {
  char: string;
  index: number;
  style?: StyleProp<TextStyle>;
}) => {
  const animationDelay = index * DELAY_INCREMENT;

  const enteringAnimation = () => {
    'worklet';
    return {
      initialValues: {
        opacity: 0,
        transform: [{ translateY: 20 }, { scale: 0.5 }],
      },
      animations: {
        opacity: withDelay(animationDelay, withTiming(1, { duration: ENTER_DURATION })),
        transform: [
          { translateY: withDelay(animationDelay, withSpring(0, { damping: 15, stiffness: 150, mass: 0.9 })) },
          { scale: withDelay(animationDelay, withSpring(1, { damping: 15, stiffness: 150, mass: 0.9 })) },
        ],
      },
    };
  };

  const exitingAnimation = () => {
    'worklet';
    return {
      initialValues: {
        opacity: 1,
        transform: [{ translateY: 0 }, { scale: 1 }],
      },
      animations: {
        opacity: withDelay(animationDelay, withTiming(0, { duration: EXIT_DURATION })),
        transform: [
          { translateY: withDelay(animationDelay, withTiming(-5, { duration: EXIT_DURATION })) },
          { scale: withDelay(animationDelay, withTiming(0.5, { duration: EXIT_DURATION })) },
        ],
      },
    };
  };

  return (
    <Animated.Text
      entering={enteringAnimation}
      exiting={exitingAnimation}
      layout={LinearTransition.duration(180).easing(Easing.bezier(0.25, 0.1, 0.25, 1))}
      style={style}
    >
      {char}
    </Animated.Text>
  );
};

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
  const characters = Array.from(text);
  return (
    <Animated.View
      style={[styles.wrapper, { flexWrap: wrap ? 'wrap' : 'nowrap' }]}
      layout={LinearTransition.duration(300).easing(Easing.bezier(0.25, 0.1, 0.25, 1))}
    >
      {characters.map((char, index) => (
        <Character key={`${char}-${index}-${text}`} char={char} index={index} style={style} />
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
  },
});

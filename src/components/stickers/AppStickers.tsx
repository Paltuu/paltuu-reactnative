import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSegments } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { FONTS } from '../../constants/typography';

/**
 * The web app's peeking pixel stickers (paltuu-nextjs
 * components/stickers/AppStickers.tsx, PALTU-155), in the app (PALTU-179).
 * Rendered once in the root layout, over every screen except those in HIDE_ON.
 *
 * Same as the web app on a phone: one left sticker and one right one, each on
 * its web side and tilt, at random heights (one higher than the other), picked
 * again whenever the screen changes. Mostly tucked behind the edge (a few px
 * show). Now and then one peeks out for a moment: first 8 to 20 s after a
 * screen opens, then every 30 to 60 s. Tapping a sticker while it's out pops
 * it the rest of the way with a wiggle and its speech bubble.
 *
 * One difference from the web: there, a resting sticker has a 16 px tap strip
 * in the page gutter. App screens run content (photos, carousels) to the edge,
 * and the left edge is the iOS swipe-back, so here a sticker only takes taps
 * while it's peeking or popped. Otherwise touches pass straight through.
 *
 * Decorative only: hidden from screen readers. Under Reduce Motion they don't
 * peek on their own or wiggle.
 */

const STICKERS = [
  { src: require('../../../assets/stickers/pigeon-toast.svg'), w: 240, h: 240, side: 'right', rot: -12, say: 'Coo!' },
  { src: require('../../../assets/stickers/screaming-cat.svg'), w: 200, h: 240, side: 'left', rot: 8, say: 'AAAA!' },
  { src: require('../../../assets/stickers/frog-dog.svg'), w: 200, h: 250, side: 'right', rot: -8, say: 'Ribbit?' },
  { src: require('../../../assets/stickers/duck.svg'), w: 240, h: 240, side: 'left', rot: 6, say: 'Quack!' },
  { src: require('../../../assets/stickers/strawberry.svg'), w: 240, h: 240, side: 'right', rot: 10, say: 'Hi!' },
] as const;

type Sticker = (typeof STICKERS)[number];
const LEFT = STICKERS.filter((s) => s.side === 'left');
const RIGHT = STICKERS.filter((s) => s.side === 'right');

// Sizes from the web app's phone rules (.app-stickers in globals.css).
const WIDTH = 56;
const HIDE = 0.85; // share of the sticker behind the edge at rest
const PEEK = 0.58; // ... at the peak of a peek
const POP = 0.3; // ... when popped (it also grows by POP_SCALE)
const POP_SCALE = 1.15;

const POP_MS = 2200;
// The web's 2.4 s, plus a little: it's also the window for tapping it.
const PEEK_MS = 3000;
const SLIDE_MS = 600;
const OUT_MS = 450;
// The web's two transition curves (overshoot, then settle).
const SLIDE_EASING = Easing.bezier(0.34, 1.4, 0.64, 1);
const POP_EASING = Easing.bezier(0.34, 1.56, 0.64, 1);

/**
 * Screens without stickers, as the route path without its (groups), matched as
 * a whole path or the start of one ("express-vet" covers the booking steps).
 * Same idea as the web's list: signing in, composers, forms, paying, and the
 * dispatcher console. Plus the full-screen photo/video viewer.
 */
const HIDE_ON = [
  // Signing in and up (the whole (auth) group is checked separately)
  'onboarding', 'interests', 'oauth-username', 'oauth2redirect',
  // Composers
  'create-post', 'comment', 'quote', 'create',
  // Forms
  'apply-adopt', 'create-pet', 'create-lost-found', 'pet-profile/create', 'pet-profile/gallery-manager',
  'profile/edit', 'profile/personal-info', 'profile/security',
  // Vets at Home booking and payment, and the dispatcher console
  'express-vet', 'express-vet-dispatch',
  // Full-screen media, legal
  'media', 'profile/licenses',
];

const random = (n: number) => Math.floor(Math.random() * n);
const between = (min: number, max: number) => (min + Math.random() * (max - min)) * 1000;

/** A random left sticker and a random right one, one higher than the other. */
function pick() {
  const left = LEFT[random(LEFT.length)];
  const right = RIGHT[random(RIGHT.length)];
  const leftHigher = random(2) === 0;
  // Between 30% and 72% of the screen: clear of the header at the top, and of
  // the tab bar, toasts and bottom buttons at the bottom.
  const high = 30 + random(18);
  const low = 54 + random(18);
  return [
    { sticker: left as Sticker, top: leftHigher ? high : low },
    { sticker: right as Sticker, top: leftHigher ? low : high },
  ];
}

function isHidden(segments: string[]) {
  if (segments.length === 0 || segments[0] === '(auth)') return true;
  const path = segments.filter((s) => !(s.startsWith('(') && s.endsWith(')'))).join('/');
  return HIDE_ON.some((p) => path === p || path.startsWith(`${p}/`));
}

export function AppStickers() {
  const segments = useSegments() as string[];
  const hidden = isHidden(segments);
  // A new pair whenever the screen changes, like a page load on the web.
  const routeKey = segments.join('/');
  const pair = useMemo(() => (hidden ? null : pick()), [routeKey, hidden]);
  const reduceMotion = useReducedMotion();
  const peekRefs = useRef<(PeekHandle | null)[]>([]);

  // Now and then one of the two peeks out: first 8 to 20 s after the screen
  // opens, then every 30 to 60 s.
  useEffect(() => {
    if (!pair || reduceMotion) return;
    let timer: ReturnType<typeof setTimeout>;
    const peek = () => {
      peekRefs.current[random(2)]?.peek();
      timer = setTimeout(peek, PEEK_MS + between(30, 60));
    };
    timer = setTimeout(peek, between(8, 20));
    return () => clearTimeout(timer);
  }, [pair, reduceMotion]);

  if (!pair) return null;

  return (
    <View
      pointerEvents="box-none"
      style={styles.layer}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {pair.map(({ sticker, top }, i) => (
        <PeekingSticker
          key={`${routeKey}-${i}`}
          ref={(h) => {
            peekRefs.current[i] = h;
          }}
          sticker={sticker}
          top={top}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  );
}

interface PeekHandle {
  peek: () => void;
}

const PeekingSticker = React.forwardRef<
  PeekHandle,
  { sticker: Sticker; top: number; reduceMotion: boolean }
>(function PeekingSticker({ sticker, top, reduceMotion }, ref) {
  const { height: screenHeight } = useWindowDimensions();
  const left = sticker.side === 'left';
  const height = Math.round((WIDTH * sticker.h) / sticker.w);
  // How far it sits out from the screen edge, as a share of its width shown.
  const offset = (tucked: number) => (left ? -1 : 1) * tucked * WIDTH;

  const x = useSharedValue(offset(HIDE));
  const scale = useSharedValue(1);
  const rot = useSharedValue<number>(sticker.rot);
  const wiggle = useSharedValue(0);
  const bubble = useSharedValue(0);

  // Only takes taps while it's out (see the note at the top).
  const [out, setOut] = useState(false);
  const state = useRef<'rest' | 'peek' | 'pop'>('rest');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const tuck = useCallback(() => {
    state.current = 'rest';
    setOut(false);
    const d = reduceMotion ? 0 : OUT_MS;
    x.value = withTiming(offset(HIDE), { duration: d, easing: POP_EASING });
    scale.value = withTiming(1, { duration: d });
    rot.value = withTiming(sticker.rot, { duration: d });
    bubble.value = withTiming(0, { duration: 200 });
  }, [reduceMotion]);

  const peek = useCallback(() => {
    if (state.current !== 'rest') return;
    state.current = 'peek';
    setOut(true);
    x.value = withTiming(offset(PEEK), { duration: SLIDE_MS, easing: SLIDE_EASING });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (state.current !== 'peek') return;
      state.current = 'rest';
      setOut(false);
      x.value = withTiming(offset(HIDE), { duration: SLIDE_MS, easing: SLIDE_EASING });
    }, PEEK_MS);
  }, []);

  React.useImperativeHandle(ref, () => ({ peek }), [peek]);

  const pop = useCallback(() => {
    state.current = 'pop';
    setOut(true);
    const d = reduceMotion ? 0 : OUT_MS;
    x.value = withTiming(offset(POP), { duration: d, easing: POP_EASING });
    scale.value = withTiming(POP_SCALE, { duration: d, easing: POP_EASING });
    rot.value = withTiming(0, { duration: d });
    bubble.value = withDelay(reduceMotion ? 0 : 150, withTiming(1, { duration: reduceMotion ? 0 : 250 }));
    if (!reduceMotion) {
      // Two wiggles, as on the web (0.5 s each, after 0.2 s).
      wiggle.value = withDelay(
        200,
        withRepeat(
          withSequence(
            withTiming(-9, { duration: 125 }),
            withTiming(9, { duration: 250 }),
            withTiming(0, { duration: 125 })
          ),
          2
        )
      );
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(tuck, POP_MS);
  }, [reduceMotion, tuck]);

  const stickerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { rotate: `${rot.value + wiggle.value}deg` },
      { scale: scale.value },
    ],
  }));
  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: bubble.value,
    transform: [{ translateY: (1 - bubble.value) * 6 }, { scale: 0.8 + bubble.value * 0.2 }],
  }));

  return (
    <Animated.View
      pointerEvents={out ? 'auto' : 'none'}
      style={[
        styles.sticker,
        { top: (screenHeight * top) / 100, width: WIDTH, height },
        left ? { left: 0 } : { right: 0 },
        stickerStyle,
      ]}
    >
      <Pressable onPress={pop} style={StyleSheet.absoluteFill}>
        <Image source={sticker.src} style={{ width: WIDTH, height }} contentFit="contain" />
      </Pressable>
      <Animated.View
        pointerEvents="none"
        style={[styles.bubble, left ? { left: WIDTH * 0.55 } : { right: WIDTH * 0.55 }, bubbleStyle]}
      >
        <View style={styles.bubbleShadow} />
        <View style={styles.bubbleBox}>
          <Text style={styles.bubbleText} numberOfLines={1}>
            {sticker.say}
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
});

const INK = '#111827'; // the web bubble's ink (gray-900)

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden', // clips the tucked-away part at the screen edge
  },
  sticker: {
    position: 'absolute',
  },
  bubble: {
    position: 'absolute',
    top: -26,
  },
  // The web's hard 3 px offset shadow, drawn as a solid box behind the bubble
  // (Android shadows can't be offset or hard-edged).
  bubbleShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: -3,
    bottom: -3,
    backgroundColor: INK,
  },
  bubbleBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: INK,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  bubbleText: {
    fontFamily: FONTS.pixel,
    fontSize: 9,
    lineHeight: 14,
    color: INK,
  },
});

export default AppStickers;

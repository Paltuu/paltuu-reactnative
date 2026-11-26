import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSegments } from 'expo-router';
import Animated, {
  cancelAnimation,
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
 * components/stickers/AppStickers.tsx and the .app-stickers / .peek-sticker
 * rules in app/globals.css), in the app. Rendered once in the root layout,
 * over every screen except those in HIDE_ON. Built to look and behave exactly
 * like the web app on a phone (PALTU-184):
 *
 * - One left sticker and one right one, each on its web side and tilt, at
 *   random heights (one higher than the other), picked again whenever the
 *   screen changes. 85% tucked behind the edge, so a sliver shows.
 * - Now and then one peeks out (to 58% tucked) for 2.4 s: first 8 to 20 s
 *   after a screen opens, then every 30 to 60 s.
 * - Tapping the sticker, or a 16 x 76 pt strip along the screen edge beside
 *   it, pops it out by another 55% of its width from wherever it is, upright
 *   and 15% bigger, with two wiggles of the picture and its speech bubble.
 *   It tucks back 2.2 s after the last tap.
 *
 * Like the web, two layers: the outer one peeks, the inner one pops.
 *
 * One thing differs, on iOS only: the left edge is the swipe-back gesture, and
 * a view over it would swallow the swipe (this layer sits above every screen).
 * So there the left sticker's tap strip isn't a view: the root view reports
 * taps along the left edge (stickerEdgeTouches) and they pop it, while the
 * touch still reaches the screen underneath. The resting left sticker itself
 * takes no touches on iOS for the same reason.
 *
 * Decorative only: hidden from screen readers. Under Reduce Motion they don't
 * peek on their own or wiggle (popping still slides, as on the web).
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

// The web app's phone sizes, as shares of the sticker's own width.
const WIDTH = 56;
const HIDE = 0.85; // tucked behind the edge at rest (--hide)
const PEEK = 0.58; // ... at the peak of a peek (--peek)
const POP = 0.55; // how far popping brings it out, from wherever it is (--pop)
const POP_SCALE = 1.15;
// The tap strip beside each sticker (.app-stickers .peek-sticker-hit).
const STRIP_WIDTH = 16;
const STRIP_HEIGHT = 76;
// Room for the speech bubble to size to its text: on the web it's nowrap and
// runs past the sticker, but here a positioned child is held to its parent's
// width unless it's given its own.
const BUBBLE_ROOM = 200;

const POP_MS = 2200;
const PEEK_MS = 2400;
// The web's transitions and keyframes.
const PEEK_SLIDE = { duration: 600, easing: Easing.bezier(0.34, 1.4, 0.64, 1) };
const POP_SLIDE = { duration: 450, easing: Easing.bezier(0.34, 1.56, 0.64, 1) };
const EASE = Easing.bezier(0.25, 0.1, 0.25, 1);
const EASE_IN_OUT = Easing.bezier(0.42, 0, 0.58, 1);

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

// ---------------------------------------------------------------------------
// iOS left-edge taps (see the note at the top). Spread onto the root view in
// app/_layout.tsx; touch events bubble up to it from every screen without
// taking the touch away from anything.

const TAP_SLOP = 10;
const TAP_MS = 500;
const leftEdgeStickers = new Set<{ top: number; pop: () => void }>();
let edgeTouch: { x: number; y: number; t: number } | null = null;

export const stickerEdgeTouches =
  Platform.OS === 'ios'
    ? {
        onTouchStart: (e: GestureResponderEvent) => {
          const { pageX, pageY, touches } = e.nativeEvent;
          edgeTouch = touches.length <= 1 && pageX <= STRIP_WIDTH ? { x: pageX, y: pageY, t: Date.now() } : null;
        },
        onTouchEnd: (e: GestureResponderEvent) => {
          const start = edgeTouch;
          edgeTouch = null;
          if (!start) return;
          const { pageX, pageY } = e.nativeEvent;
          const tap =
            Math.abs(pageX - start.x) <= TAP_SLOP &&
            Math.abs(pageY - start.y) <= TAP_SLOP &&
            Date.now() - start.t <= TAP_MS;
          if (!tap) return;
          leftEdgeStickers.forEach((s) => {
            if (start.y >= s.top && start.y <= s.top + STRIP_HEIGHT) s.pop();
          });
        },
        onTouchCancel: () => {
          edgeTouch = null;
        },
      }
    : {};

// ---------------------------------------------------------------------------

export function AppStickers() {
  const segments = useSegments() as string[];
  const hidden = isHidden(segments);
  // A new pair whenever the screen changes, like a page load on the web.
  const routeKey = segments.join('/');
  const pair = useMemo(() => (hidden ? null : pick()), [routeKey, hidden]);
  const reduceMotion = useReducedMotion();
  const handles = useRef<(StickerHandle | null)[]>([]);

  // Now and then one of the two peeks out: first 8 to 20 s after the screen
  // opens, then every 30 to 60 s after the last peek ends.
  useEffect(() => {
    if (!pair || reduceMotion) return;
    let timer: ReturnType<typeof setTimeout>;
    const peek = () => {
      handles.current[random(2)]?.peek();
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
            handles.current[i] = h;
          }}
          sticker={sticker}
          top={top}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  );
}

interface StickerHandle {
  peek: () => void;
}

const PeekingSticker = React.forwardRef<
  StickerHandle,
  { sticker: Sticker; top: number; reduceMotion: boolean }
>(function PeekingSticker({ sticker, top, reduceMotion }, ref) {
  const { height: screenHeight } = useWindowDimensions();
  const left = sticker.side === 'left';
  const edge = left ? -1 : 1; // translateX sign toward the sticker's screen edge
  const height = Math.round((WIDTH * sticker.h) / sticker.w);
  const topPx = Math.round((screenHeight * top) / 100);
  // iOS keeps the left edge free for swipe-back (see the note at the top).
  const viaRootTaps = Platform.OS === 'ios' && left;

  // Outer layer: tucked or peeking (.is-peeking).
  const outerX = useSharedValue(edge * HIDE * WIDTH);
  // Inner layer: tilted at rest, or popped (.is-popped).
  const innerX = useSharedValue(0);
  const rot = useSharedValue<number>(sticker.rot);
  const scale = useSharedValue(1);
  // Only the picture wiggles, not the bubble.
  const wiggle = useSharedValue(0);
  const bubbleOpacity = useSharedValue(0);
  const bubbleIn = useSharedValue(0);

  const [peeking, setPeeking] = useState(false);
  const [popped, setPopped] = useState(false);
  const isPopped = useRef(false);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const popTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      clearTimeout(peekTimer.current);
      clearTimeout(popTimer.current);
    },
    []
  );

  const peek = useCallback(() => {
    setPeeking(true);
    outerX.value = withTiming(edge * PEEK * WIDTH, PEEK_SLIDE);
    clearTimeout(peekTimer.current);
    peekTimer.current = setTimeout(() => {
      setPeeking(false);
      outerX.value = withTiming(edge * HIDE * WIDTH, PEEK_SLIDE);
    }, PEEK_MS);
  }, []);

  React.useImperativeHandle(ref, () => ({ peek }), [peek]);

  const tuck = useCallback(() => {
    isPopped.current = false;
    setPopped(false);
    innerX.value = withTiming(0, POP_SLIDE);
    rot.value = withTiming(sticker.rot, POP_SLIDE);
    scale.value = withTiming(1, POP_SLIDE);
    cancelAnimation(wiggle);
    wiggle.value = 0;
    bubbleOpacity.value = withTiming(0, { duration: 200, easing: EASE });
    bubbleIn.value = withTiming(0, { duration: 250, easing: EASE });
  }, []);

  const pop = useCallback(() => {
    clearTimeout(popTimer.current);
    popTimer.current = setTimeout(tuck, POP_MS);
    // Tapping it again while it's out only keeps it out longer.
    if (isPopped.current) return;
    isPopped.current = true;
    setPopped(true);
    innerX.value = withTiming(-edge * POP * WIDTH, POP_SLIDE);
    rot.value = withTiming(0, POP_SLIDE);
    scale.value = withTiming(POP_SCALE, POP_SLIDE);
    bubbleOpacity.value = withDelay(150, withTiming(1, { duration: 200, easing: EASE }));
    bubbleIn.value = withDelay(150, withTiming(1, { duration: 250, easing: EASE }));
    if (!reduceMotion) {
      // Two 0.5 s wiggles after 0.2 s: 0 -> -9deg -> 9deg -> 0 (@keyframes sticker-wiggle).
      wiggle.value = withDelay(
        200,
        withRepeat(
          withSequence(
            withTiming(-9, { duration: 125, easing: EASE_IN_OUT }),
            withTiming(9, { duration: 250, easing: EASE_IN_OUT }),
            withTiming(0, { duration: 125, easing: EASE_IN_OUT })
          ),
          2
        )
      );
    }
  }, [reduceMotion, tuck]);

  // iOS left sticker: taps on its edge strip come from the root view.
  useEffect(() => {
    if (!viaRootTaps) return;
    const entry = { top: topPx, pop };
    leftEdgeStickers.add(entry);
    return () => {
      leftEdgeStickers.delete(entry);
    };
  }, [viaRootTaps, topPx, pop]);

  const outerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: outerX.value }] }));
  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: innerX.value }, { rotate: `${rot.value}deg` }, { scale: scale.value }],
  }));
  const pictureStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${wiggle.value}deg` }] }));
  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
    transform: [{ translateY: (1 - bubbleIn.value) * 6 }, { scale: 0.8 + 0.2 * bubbleIn.value }],
  }));

  return (
    <>
      <Animated.View
        pointerEvents={viaRootTaps && !peeking && !popped ? 'none' : 'auto'}
        style={[
          styles.sticker,
          { top: topPx, width: WIDTH, height },
          left ? { left: 0 } : { right: 0 },
          outerStyle,
        ]}
      >
        <Animated.View style={[{ width: WIDTH, height }, innerStyle]}>
          <Pressable onPress={pop} style={StyleSheet.absoluteFill}>
            <Animated.View style={pictureStyle}>
              <Image source={sticker.src} style={{ width: WIDTH, height }} contentFit="contain" />
            </Animated.View>
          </Pressable>
          <View
            pointerEvents="none"
            style={[
              styles.bubbleRoom,
              left ? { left: WIDTH * 0.55, alignItems: 'flex-start' } : { right: WIDTH * 0.55, alignItems: 'flex-end' },
            ]}
          >
            <Animated.View style={bubbleStyle}>
              <View style={styles.bubbleShadow} />
              <View style={styles.bubbleFace}>
                <Text style={styles.bubbleText} numberOfLines={1}>
                  {sticker.say}
                </Text>
              </View>
            </Animated.View>
          </View>
        </Animated.View>
      </Animated.View>

      {/* The tap strip along the edge, as on the web (not the iOS left edge). */}
      {viaRootTaps ? null : (
        <Pressable onPress={pop} style={[styles.strip, { top: topPx }, left ? { left: 0 } : { right: 0 }]} />
      )}
    </>
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
  strip: {
    position: 'absolute',
    width: STRIP_WIDTH,
    height: STRIP_HEIGHT,
  },
  bubbleRoom: {
    position: 'absolute',
    top: -26,
    width: BUBBLE_ROOM,
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
  bubbleFace: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: INK,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  bubbleText: {
    fontFamily: FONTS.pixel,
    fontSize: 9,
    lineHeight: 14.4, // the web's line-height: 1.6
    color: INK,
    includeFontPadding: false,
  },
});

export default AppStickers;

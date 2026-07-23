import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import VideoPlayer from '../social/VideoPlayer';

interface MediaItem {
  url: string;
  type?: 'image' | 'video' | 'gif';
  thumbnail_url?: string;
}

interface ImageModalProps {
  mediaItems: MediaItem[];
  visible: boolean;
  index: number;
  onClose: () => void;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
// Matches styles.image dimensions — used to bound how far a zoomed image can pan.
// Full screen height, X/Twitter-style — anything less leaves a permanent black
// letterbox bar above/below every image regardless of its own aspect ratio.
const IMG_DISPLAY_W = SCREEN_W;
const IMG_DISPLAY_H = SCREEN_H;

// Swipe-down-to-dismiss tuning (X/Twitter-style).
const DISMISS_DISTANCE = 220; // translateY at which the backdrop is fully transparent
const DISMISS_THRESHOLD = 120; // drag distance past which releasing dismisses
const DISMISS_VELOCITY = 800; // or a fast-enough flick dismisses regardless of distance

export const ImageModal: React.FC<ImageModalProps> = ({
  mediaItems,
  visible,
  index: initialIndex,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const pagerRef = useRef<PagerView>(null);

  // Tracks which page(s) are currently pinch/double-tap zoomed in, keyed by
  // page index (PagerView keeps neighboring pages mounted, so this can't just
  // be a single boolean). Swipe-to-dismiss is disabled while the *visible*
  // page is zoomed, so dragging pans the zoomed image instead of closing it.
  const [zoomedPages, setZoomedPages] = useState<Set<number>>(new Set());
  const isCurrentPageZoomed = zoomedPages.has(currentIndex);

  const translateY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setZoomedPages(new Set());
      translateY.value = 0;
      setTimeout(() => {
        pagerRef.current?.setPageWithoutAnimation(initialIndex);
      }, 50);
    }
  }, [visible, initialIndex]);

  const handleZoomChange = useCallback((pageIndex: number, zoomed: boolean) => {
    setZoomedPages((prev) => {
      const hasIt = prev.has(pageIndex);
      if (zoomed === hasIt) return prev;
      const next = new Set(prev);
      zoomed ? next.add(pageIndex) : next.delete(pageIndex);
      return next;
    });
  }, []);

  const dismissPan = Gesture.Pan()
    .enabled(!isCurrentPageZoomed)
    .activeOffsetY([-10, 10])
    .failOffsetX([-15, 15])
    .onUpdate((e) => {
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const shouldDismiss =
        Math.abs(e.translationY) > DISMISS_THRESHOLD || Math.abs(e.velocityY) > DISMISS_VELOCITY;
      if (shouldDismiss) {
        translateY.value = withTiming(
          e.translationY > 0 ? SCREEN_H : -SCREEN_H,
          { duration: 200 },
          (finished) => {
            if (finished) runOnJS(onClose)();
          }
        );
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(translateY.value),
      [0, DISMISS_DISTANCE],
      [1, 0.4],
      Extrapolation.CLAMP
    ),
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      Math.abs(translateY.value),
      [0, DISMISS_DISTANCE],
      [1, 0.85],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateY: translateY.value }, { scale }],
    };
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      {/* GestureHandlerRootView must live INSIDE the Modal, not wrap it — on
          Android a Modal renders into its own native window, so a root view
          wrapping the Modal from outside sits in a different window than the
          Modal's actual content and never sees its touches. That's why pinch
          and double-tap zoom silently did nothing on Android. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnimatedStyle]} />

          <GestureDetector gesture={dismissPan}>
            <Animated.View style={[styles.flexFill, contentAnimatedStyle]}>
              <View style={[styles.closeButtonContainer, { top: Math.max(insets.top, 16) }]}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={12}>
                  <Ionicons name="close" size={30} color="white" />
                </TouchableOpacity>
              </View>

              <PagerView
                ref={pagerRef}
                style={styles.pager}
                initialPage={initialIndex}
                onPageSelected={(e) => setCurrentIndex(e.nativeEvent.position)}
              >
                {mediaItems.map((item, i) => (
                  <View key={i} style={styles.page}>
                    {item.type === 'video' ? (
                      <VideoPlayer
                        uri={item.url}
                        thumbnailUri={item.thumbnail_url}
                        width={SCREEN_W}
                        height={SCREEN_H}
                        paused={currentIndex !== i}
                        fullscreen
                      />
                    ) : (
                      <ZoomableImage url={item.url} onZoomChange={(zoomed) => handleZoomChange(i, zoomed)} />
                    )}
                  </View>
                ))}
              </PagerView>

              {/* X/Twitter only shows a counter when there's actually something
                  to count through — a "1 / 1" on a single-image post is noise. */}
              {mediaItems.length > 1 && (
                <View style={[styles.counterContainer, { bottom: Math.max(insets.bottom, 24) }]}>
                  <Text style={styles.counterText}>
                    {currentIndex + 1} / {mediaItems.length}
                  </Text>
                </View>
              )}
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

export const ZoomableImage = ({ url, onZoomChange }: { url: string; onZoomChange?: (zoomed: boolean) => void }) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const setZoomed = useCallback(
    (zoomed: boolean) => {
      setIsZoomed(zoomed);
      onZoomChange?.(zoomed);
    },
    [onZoomChange]
  );

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => { scale.value = savedScale.value * e.scale; })
    .onEnd(() => {
      if (scale.value < 1.01) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(setZoomed)(false);
      } else {
        // Clamp any existing offset into the new zoom's bounds, then persist it
        // so the image can never sit stranded in empty space.
        const maxX = (IMG_DISPLAY_W * (scale.value - 1)) / 2;
        const maxY = (IMG_DISPLAY_H * (scale.value - 1)) / 2;
        const cx = Math.min(Math.max(translateX.value, -maxX), maxX);
        const cy = Math.min(Math.max(translateY.value, -maxY), maxY);
        translateX.value = withSpring(cx);
        translateY.value = withSpring(cy);
        savedTranslateX.value = cx;
        savedTranslateY.value = cy;
        runOnJS(setZoomed)(true);
      }
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan().enabled(isZoomed).onUpdate((e) => {
    // Bound the drag to the zoomed image's edges so it can't be flung off-screen.
    const maxX = (IMG_DISPLAY_W * (scale.value - 1)) / 2;
    const maxY = (IMG_DISPLAY_H * (scale.value - 1)) / 2;
    translateX.value = Math.min(Math.max(savedTranslateX.value + e.translationX, -maxX), maxX);
    translateY.value = Math.min(Math.max(savedTranslateY.value + e.translationY, -maxY), maxY);
  }).onEnd(() => {
    savedTranslateX.value = translateX.value;
    savedTranslateY.value = translateY.value;
  });

  const doubleTap = Gesture.Tap().numberOfTaps(2).onStart(() => {
    if (scale.value > 1) {
      scale.value = withTiming(1);
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      runOnJS(setZoomed)(false);
    } else {
      scale.value = withTiming(2);
      savedScale.value = 2;
      runOnJS(setZoomed)(true);
    }
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinchGesture, panGesture, doubleTap)}>
      <Animated.View style={[styles.page, animatedStyle]}>
        <Image source={{ uri: url }} style={styles.image} contentFit="contain" transition={200} />
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  flexFill: { flex: 1 },
  backdrop: { backgroundColor: '#000' },
  closeButtonContainer: { position: 'absolute', left: 16, zIndex: 10 },
  // A translucent circle behind the X — now that it sits directly over the
  // image/video instead of a solid black header bar, it needs its own
  // contrast to stay legible against arbitrary (often light) content.
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pager: { flex: 1 },
  page: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: SCREEN_W, height: SCREEN_H },
  counterContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  counterText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export default ImageModal;

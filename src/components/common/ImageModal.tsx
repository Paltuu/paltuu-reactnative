import React, { useState, useRef, useEffect } from 'react';
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
  GestureHandlerRootView 
} from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming 
} from 'react-native-reanimated';
import VideoPlayer from '../social/VideoPlayer';

interface MediaItem {
  url: string;
  type?: 'image' | 'video';
  thumbnail_url?: string;
}

interface ImageModalProps {
  mediaItems: MediaItem[];
  visible: boolean;
  index: number;
  onClose: () => void;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export const ImageModal: React.FC<ImageModalProps> = ({
  mediaItems,
  visible,
  index: initialIndex,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const pagerRef = useRef<PagerView>(null);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setTimeout(() => {
        pagerRef.current?.setPageWithoutAnimation(initialIndex);
      }, 50);
    }
  }, [visible, initialIndex]);

  if (!visible) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={[styles.closeButtonContainer, { top: Math.max(insets.top, 16) }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
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
                    height={SCREEN_H * 0.7}
                    paused={currentIndex !== i}
                  />
                ) : (
                  <ZoomableImage url={item.url} />
                )}
              </View>
            ))}
          </PagerView>

          <View style={[styles.counterContainer, { bottom: Math.max(insets.bottom, 24) }]}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {mediaItems.length}
            </Text>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
};

const ZoomableImage = ({ url }: { url: string }) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => { scale.value = savedScale.value * e.scale; })
    .onEnd(() => {
      if (scale.value < 1.01) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        setIsZoomed(false);
      } else {
        setIsZoomed(true);
      }
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan().enabled(isZoomed).onUpdate((e) => {
    translateX.value = savedTranslateX.value + e.translationX;
    translateY.value = savedTranslateY.value + e.translationY;
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
      setIsZoomed(false);
    } else {
      scale.value = withTiming(2);
      savedScale.value = 2;
      setIsZoomed(true);
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
  container: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)' },
  closeButtonContainer: { position: 'absolute', right: 16, zIndex: 10 },
  closeButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  pager: { flex: 1 },
  page: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: SCREEN_W, height: SCREEN_H * 0.8 },
  counterContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  counterText: { color: '#fff', fontSize: 13, opacity: 0.7, fontWeight: '600' },
});

export default ImageModal;

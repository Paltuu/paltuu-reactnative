import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Animated,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ImageModalProps {
  imageUrls: Array<{ url: string }>;
  visible: boolean;
  index: number;
  onClose: () => void;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export const ImageModal: React.FC<ImageModalProps> = ({
  imageUrls,
  visible,
  index: initialIndex,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  const [scale] = useState(new Animated.Value(1));
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (
        evt: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        const { dx } = gestureState;
        
        if (dx < -80 && currentIndex < imageUrls.length - 1) {
          // Swipe left: next image
          Animated.timing(translateX, {
            toValue: -SCREEN_W,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setCurrentIndex(currentIndex + 1);
            translateX.setValue(0);
          });
        }
        else if (dx > 80 && currentIndex > 0) {
          // Swipe right: previous image
          Animated.timing(translateX, {
            toValue: SCREEN_W,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setCurrentIndex(currentIndex - 1);
            translateX.setValue(0);
          });
        }
        else {
          // Reset position
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)' }}>
        {/* Close button */}
        <View style={{ position: 'absolute', top: Math.max(insets.top, 16), right: 16, zIndex: 10 }}>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Image viewer */}
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          {...panResponder.panHandlers}
        >
          <Animated.View style={{ transform: [{ translateX }] }}>
            <Image
              source={{ uri: imageUrls[currentIndex]?.url }}
              style={{
                width: SCREEN_W,
                height: SCREEN_H * 0.8,
              }}
              contentFit="contain"
              transition={200}
            />
          </Animated.View>
        </View>

        {/* Counter */}
        <View
          style={{
            paddingBottom: Math.max(insets.bottom, 24),
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 13, opacity: 0.7 }}>
            {currentIndex + 1} / {imageUrls.length}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

export default ImageModal;

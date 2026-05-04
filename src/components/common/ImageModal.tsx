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
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale] = useState(new Animated.Value(1));
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (
        evt: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        const { dx } = gestureState;
        // Swipe left: next image
        if (dx < -50 && currentIndex < imageUrls.length - 1) {
          setCurrentIndex(currentIndex + 1);
        }
        // Swipe right: previous image
        if (dx > 50 && currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
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
        <View style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
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
          <Image
            source={{ uri: imageUrls[currentIndex]?.url }}
            style={{
              width: SCREEN_W,
              height: SCREEN_H * 0.8,
            }}
            contentFit="contain"
            transition={200}
          />
        </View>

        {/* Counter */}
        <View
          style={{
            paddingBottom: 40,
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

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
  const pagerRef = useRef<PagerView>(null);

  // Sync index when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      // Small timeout to ensure PagerView is ready before setting page
      setTimeout(() => {
        pagerRef.current?.setPageWithoutAnimation(initialIndex);
      }, 50);
    }
  }, [visible, initialIndex]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Close button */}
        <View style={[styles.closeButtonContainer, { top: Math.max(insets.top, 16) }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Native Pager */}
        <PagerView
          ref={pagerRef}
          style={styles.pager}
          initialPage={initialIndex}
          onPageSelected={(e) => setCurrentIndex(e.nativeEvent.position)}
        >
          {imageUrls.map((img, i) => (
            <View key={i} style={styles.page}>
              <Image
                source={{ uri: img.url }}
                style={styles.image}
                contentFit="contain"
                transition={200}
              />
            </View>
          ))}
        </PagerView>

        {/* Counter */}
        <View style={[styles.counterContainer, { bottom: Math.max(insets.bottom, 24) }]}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {imageUrls.length}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  closeButtonContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_H * 0.8,
  },
  counterContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  counterText: {
    color: '#fff',
    fontSize: 13,
    opacity: 0.7,
    fontWeight: '600',
  },
});

export default ImageModal;

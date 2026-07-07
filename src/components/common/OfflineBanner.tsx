import React, { useEffect, useRef, useState } from 'react';
import { Text, View, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import { COLORS } from '../../constants/colors';

const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.16,
  shadowRadius: 10,
  elevation: 10,
};

export function OfflineBanner() {
  const netInfo = useNetInfo();
  const [showBanner, setShowBanner] = useState(false);
  const [isBackOnline, setIsBackOnline] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current; // Start hidden above screen

  useEffect(() => {
    // netInfo.isConnected can be null initially during loading
    if (netInfo.isConnected === false) {
      setShowBanner(true);
      setIsBackOnline(false);
      // Slide down
      Animated.spring(slideAnim, {
        toValue: Platform.OS === 'ios' ? 50 : 30, // Fits perfectly below notch/status bar
        useNativeDriver: true,
        bounciness: 6,
      }).start();
    } else if (netInfo.isConnected === true && showBanner) {
      // Transition from offline to online
      setIsBackOnline(true);

      // Wait 2.5 seconds showing "Back online" in success green, then slide up to hide
      const timer = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 350,
          useNativeDriver: true,
        }).start(() => {
          setShowBanner(false);
          setIsBackOnline(false);
        });
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [netInfo.isConnected]);

  if (!showBanner) return null;

  return (
    <Animated.View
      className="absolute left-4 right-4 top-0 flex-row items-center justify-center gap-2 rounded-2xl py-3 px-4"
      style={[
        cardShadow,
        {
          zIndex: 99999,
          transform: [{ translateY: slideAnim }],
          backgroundColor: isBackOnline ? COLORS.success : COLORS.error,
        },
      ]}
    >
      <Ionicons name={isBackOnline ? 'wifi' : 'cloud-offline-outline'} size={16} color="#fff" />
      <Text className="font-headingSemi text-white text-xs tracking-wide">
        {isBackOnline ? 'Back online' : "You're offline"}
      </Text>
    </Animated.View>
  );
}

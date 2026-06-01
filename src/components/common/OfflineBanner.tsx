import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, Animated, Platform } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';

/**
 * Premium, Animated Offline Banner Component
 * Floating design with smooth slide-down and slide-up animations.
 * Turns green briefly to celebrate reconnection before sliding away!
 */
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
      
      // Wait 2.5 seconds showing "Connected back online!" in green, then slide up to hide
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
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: isBackOnline ? '#10B981' : '#EF4444', // Emerald Green for online, Vibrant Red for offline
        },
      ]}
    >
      <Text style={styles.text}>
        {isBackOnline ? '⚡ Back Online!' : '📡 Connection lost. You are offline'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    paddingVertical: 12,
    borderRadius: 14,
    zIndex: 99999, // Ensure it floats on top of everything
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

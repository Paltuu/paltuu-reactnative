import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const HEADER_HEIGHT = 60;

interface MainHeaderProps {
  translateY?: Animated.AnimatedInterpolation<number>;
}

export const MainHeader: React.FC<MainHeaderProps> = ({ translateY }) => {
  const insets = useSafeAreaInsets();
  
  return (
    <Animated.View 
      style={[
        styles.wrapper, 
        { 
          paddingTop: insets.top,
          transform: [{ translateY: translateY || 0 }] 
        }
      ]}
    >
      <View style={styles.container}>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="add" size={28} color="#000" />
        </TouchableOpacity>
        
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../../assets/paltuu bilkul tight.svg')}
            style={styles.logo}
            contentFit="contain"
          />
        </View>
        
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="heart-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: HEADER_HEIGHT,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 90,
    height: 30,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  }
});

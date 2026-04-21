import { useRef } from 'react';
import { Animated } from 'react-native';
import { HEADER_HEIGHT } from '../components/common/MainHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const useCollapsibleHeader = () => {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const totalHeaderHeight = HEADER_HEIGHT + insets.top;

  const diffClamp = Animated.diffClamp(scrollY, 0, totalHeaderHeight);
  
  const translateY = diffClamp.interpolate({
    inputRange: [0, totalHeaderHeight],
    outputRange: [0, -totalHeaderHeight],
  });

  return {
    scrollY,
    translateY,
    totalHeaderHeight
  };
};

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderContext } from '../../context/HeaderContext';
import { SearchBar } from './SearchBar';

export type SearchTab = 'all' | 'posts' | 'users';

const TABS: { key: SearchTab; title: string }[] = [
  { key: 'all', title: 'All' },
  { key: 'posts', title: 'Posts' },
  { key: 'users', title: 'People' },
];

interface SearchHeaderProps {
  placeholders: string[];
  onSearch: (text: string) => void;
  onClear: () => void;
  activeTab: SearchTab;
  onTabChange: (tab: SearchTab) => void;
  onHeightChange?: (height: number) => void;
}

const TabItem = React.memo(
  ({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`py-[10px] px-5 border-b-2 ${active ? 'border-primary' : 'border-transparent'}`}
    >
      <Text className={`text-[14px] ${active ? 'text-[#111] font-bold' : 'text-[#666] font-medium'}`}>
        {title}
      </Text>
    </TouchableOpacity>
  ),
);

// Merged search bar + tab switcher, sticky at the top and animated exactly
// like <MainHeader /> — slides away on scroll-down, reappears on scroll-up.
export const SearchHeader: React.FC<SearchHeaderProps> = ({
  placeholders,
  onSearch,
  onClear,
  activeTab,
  onTabChange,
  onHeightChange,
}) => {
  const insets = useSafeAreaInsets();
  const { isVisible } = useHeaderContext();
  const [height, setHeight] = useState(112);

  const animatedValue = useRef(new Animated.Value(1)).current; // 1 = visible, 0 = hidden

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isVisible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-height, 0],
  });

  return (
    <Animated.View
      style={[styles.wrapper, { top: insets.top, transform: [{ translateY }] }]}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h && Math.abs(h - height) > 0.5) {
          setHeight(h);
          onHeightChange?.(h);
        }
      }}
    >
      <View className="px-4 pt-1.5 pb-0.5">
        <SearchBar
          placeholder="Search Paltuu"
          placeholders={placeholders}
          onSearch={onSearch}
          onClear={onClear}
          tint="#A03048"
          centerWhenUnfocused={false}
        />
      </View>

      <View className="flex-row border-b-[0.5px] border-[#EEE] px-2">
        {TABS.map((tab) => (
          <TabItem
            key={tab.key}
            title={tab.title}
            active={activeTab === tab.key}
            onPress={() => onTabChange(tab.key)}
          />
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#fff',
  },
});

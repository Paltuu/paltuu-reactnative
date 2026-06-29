import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderContext, HEADER_HEIGHT } from '../../context/HeaderContext';
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

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  placeholders,
  onSearch,
  onClear,
  activeTab,
  onTabChange,
  onHeightChange,
}) => {
  const insets = useSafeAreaInsets();
  const { headerTranslateY } = useHeaderContext();

  // Keep height as SharedValue so the ratio runs on UI thread
  const heightSV = useSharedValue(112);
  const [height, setHeight] = useState(112);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value * (heightSV.value / HEADER_HEIGHT) }],
  }));

  return (
    <Animated.View
      style={[styles.wrapper, { top: insets.top }, animatedStyle]}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h && Math.abs(h - height) > 0.5) {
          heightSV.value = h;
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

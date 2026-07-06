import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SectionHeaderProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onSeeAll?: () => void;
}

export const SectionHeader = ({ title, onSeeAll }: SectionHeaderProps) => (
  <View
    style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 12,
    }}
  >
    <Text style={{ fontSize: 17, fontWeight: '800', color: '#111' }}>{title}</Text>
    {onSeeAll && (
      <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#A03048' }}>See All</Text>
      </TouchableOpacity>
    )}
  </View>
);

interface RailProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onSeeAll?: () => void;
  isLoading?: boolean;
  isEmpty?: boolean;
  skeletonWidth?: number;
  skeletonHeight?: number;
  children: React.ReactNode;
}

export const Rail = ({
  title,
  icon,
  onSeeAll,
  isLoading,
  isEmpty,
  skeletonWidth = 150,
  skeletonHeight = 190,
  children,
}: RailProps) => {
  if (!isLoading && isEmpty) return null;

  return (
    <View style={{ paddingTop: 24 }}>
      <SectionHeader title={title} icon={icon} onSeeAll={onSeeAll} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        decelerationRate="fast"
      >
        {isLoading
          ? [...Array(4)].map((_, i) => (
              <View
                key={i}
                style={{
                  width: skeletonWidth,
                  height: skeletonHeight,
                  backgroundColor: '#F3F4F6',
                  borderRadius: 16,
                }}
              />
            ))
          : children}
      </ScrollView>
    </View>
  );
};

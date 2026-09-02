import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
// Gesture-handler's ScrollView (not RN's) so this horizontal rail wins the
// touch against the parent material-top-tabs pager instead of losing a native
// touch-slop race that sometimes flipped to the next/prev tab mid-swipe.
import { ScrollView } from 'react-native-gesture-handler';
import { FONTS } from '../../constants/typography';

const DARK = '#1A1A2E';
const PRIMARY = '#A03048';
const SURFACE_SUBTLE = '#F5F5F7';
const DIVIDER = '#EEEEEE';

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
  /** The divider separates a section from the one above it — the first
   *  section on a screen has nothing to separate from, so it opts out. */
  showDivider?: boolean;
}

export const SectionHeader = ({ title, onSeeAll, showDivider = true }: SectionHeaderProps) => (
  <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
    {showDivider && <View style={{ height: 1, backgroundColor: DIVIDER, marginBottom: 16 }} />}
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontFamily: FONTS.heading, fontSize: 18, color: DARK }}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: PRIMARY }}>See All</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

interface RailProps {
  title: string;
  onSeeAll?: () => void;
  isLoading?: boolean;
  isEmpty?: boolean;
  skeletonWidth?: number;
  skeletonHeight?: number;
  children: React.ReactNode;
}

export const Rail = ({
  title,
  onSeeAll,
  isLoading,
  isEmpty,
  skeletonWidth = 150,
  skeletonHeight = 190,
  children,
}: RailProps) => {
  if (!isLoading && isEmpty) return null;

  return (
    <View style={{ paddingTop: 28 }}>
      <SectionHeader title={title} onSeeAll={onSeeAll} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 12 }}
        decelerationRate="fast"
        disallowInterruption
      >
        {isLoading
          ? [...Array(4)].map((_, i) => (
              <View
                key={i}
                style={{
                  width: skeletonWidth,
                  height: skeletonHeight,
                  backgroundColor: SURFACE_SUBTLE,
                  borderRadius: 16,
                }}
              />
            ))
          : children}
      </ScrollView>
    </View>
  );
};

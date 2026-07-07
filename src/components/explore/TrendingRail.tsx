import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SectionHeader } from './Rail';
import { FONTS } from '../../constants/typography';

const PRIMARY = '#A03048';
const SURFACE_SUBTLE = '#F5F5F7';

export const HashtagChip = ({
  tag,
  onPress,
}: {
  tag: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={{
      paddingHorizontal: 16,
      height: 38,
      borderRadius: 999,
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: '#EFEFF1',
      justifyContent: 'center',
    }}
  >
    <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13.5, color: PRIMARY }}>#{tag}</Text>
  </TouchableOpacity>
);

interface TrendingRailProps {
  hashtags: { tag: string; post_count: number }[];
  isLoading: boolean;
}

export const TrendingRail = ({ hashtags, isLoading }: TrendingRailProps) => {
  const router = useRouter();

  if (!isLoading && hashtags.length === 0) return null;

  return (
    <View style={{ paddingTop: 24 }}>
      <SectionHeader title="Trending" />

      {isLoading ? (
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 10 }}>
          {[...Array(4)].map((_, i) => (
            <View key={i} style={{ width: 90, height: 38, backgroundColor: SURFACE_SUBTLE, borderRadius: 999 }} />
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          decelerationRate="fast"
        >
          {hashtags.slice(0, 8).map((h) => (
            <HashtagChip
              key={h.tag}
              tag={h.tag}
              onPress={() => router.push(`/(app)/hashtag/${h.tag}`)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

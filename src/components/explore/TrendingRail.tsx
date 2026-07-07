import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SectionHeader } from './Rail';
import { FONTS } from '../../constants/typography';

const PRIMARY = '#A03048';
const SURFACE_SUBTLE = '#F5F5F7';
const MUTED = '#9AA0A6';

const formatCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);

export const KeywordChip = ({
  keyword,
  count,
  onPress,
}: {
  keyword: string;
  count?: number;
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    }}
  >
    <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13.5, color: PRIMARY }}>{keyword}</Text>
    {!!count && count > 0 && (
      <Text style={{ fontFamily: FONTS.body, fontSize: 11.5, color: MUTED }}>{formatCount(count)}</Text>
    )}
  </TouchableOpacity>
);

interface TrendingRailProps {
  keywords: { keyword: string; post_count: number; engagement_score?: number }[];
  isLoading: boolean;
}

export const TrendingRail = ({ keywords, isLoading }: TrendingRailProps) => {
  const router = useRouter();

  if (!isLoading && keywords.length === 0) return null;

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
          {keywords.slice(0, 8).map((k) => (
            <KeywordChip
              key={k.keyword}
              keyword={k.keyword}
              count={k.post_count}
              onPress={() => router.push(`/(app)/keyword/${encodeURIComponent(k.keyword)}`)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

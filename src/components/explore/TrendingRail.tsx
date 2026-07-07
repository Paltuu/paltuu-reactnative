import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SocialPost } from '../../api/social';
import { SectionHeader } from './Rail';
import { RailPostCard } from './RailPostCard';
import { FONTS } from '../../constants/typography';

const DARK = '#1A1A2E';
const MUTED = '#9AA0A6';
const SURFACE_SUBTLE = '#F5F5F7';

const formatCount = (n: number) => (n > 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

export const HashtagChip = ({
  tag,
  postCount,
  onPress,
}: {
  tag: string;
  postCount: number;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      height: 38,
      borderRadius: 999,
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: '#EFEFF1',
    }}
  >
    <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13.5, color: DARK }}>#{tag}</Text>
    <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: MUTED }}>{formatCount(postCount)}</Text>
  </TouchableOpacity>
);

interface TrendingRailProps {
  hashtags: { tag: string; post_count: number }[];
  posts: SocialPost[];
  isLoading: boolean;
}

export const TrendingRail = ({ hashtags, posts, isLoading }: TrendingRailProps) => {
  const router = useRouter();

  if (!isLoading && hashtags.length === 0 && posts.length === 0) return null;

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
        <>
          {hashtags.length > 0 && (
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
                  postCount={h.post_count}
                  onPress={() => router.push(`/(app)/hashtag/${h.tag}`)}
                />
              ))}
            </ScrollView>
          )}

          {posts.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingTop: hashtags.length ? 14 : 0 }}
              decelerationRate="fast"
            >
              {posts.map((p) => (
                <RailPostCard key={p.post_id} post={p} onPress={() => router.push(`/post/${p.post_id}`)} />
              ))}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
};

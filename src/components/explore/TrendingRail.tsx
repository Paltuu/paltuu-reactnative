import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SocialPost } from '../../api/social';
import { SectionHeader } from './Rail';
import { RailPostCard } from './RailPostCard';

export const HashtagRow = ({
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
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: '#FFF',
      borderBottomWidth: 0.5,
      borderBottomColor: '#F0F0F0',
    }}
    activeOpacity={0.7}
  >
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FEF2F4',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
      }}
    >
      <Text style={{ fontSize: 18 }}>🔥</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: '#111' }}>#{tag}</Text>
      <Text style={{ fontSize: 13, color: '#999', marginTop: 1 }}>
        {postCount > 1000 ? `${(postCount / 1000).toFixed(1)}K` : postCount} posts
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color="#CCC" />
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
    <View style={{ paddingTop: 20 }}>
      <SectionHeader title="Trending" icon="flame" />

      {isLoading ? (
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {[...Array(3)].map((_, i) => (
            <View key={i} style={{ height: 56, backgroundColor: '#F3F4F6', borderRadius: 16 }} />
          ))}
        </View>
      ) : (
        <>
          {hashtags.slice(0, 5).map((h) => (
            <HashtagRow
              key={h.tag}
              tag={h.tag}
              postCount={h.post_count}
              onPress={() => router.push(`/(app)/hashtag/${h.tag}`)}
            />
          ))}

          {posts.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingTop: 16 }}
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

import React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { socialApi } from '../../api/social';
import { SectionHeader } from './Rail';
import { TrendingRail } from './TrendingRail';
import { MediaGrid, GRID_ITEM_SIZE, GRID_MARGIN, GRID_GAP } from './MediaGrid';
import { TopicRail, TopicRailConfig } from './TopicRail';
import { TrendingBreedsRail } from './TrendingBreedsRail';
import { SuggestedAccountsRail } from './SuggestedAccountsRail';
import { LostFoundNearbyRail } from './LostFoundNearbyRail';
import { VetsNearbyRail } from './VetsNearbyRail';

// Curated topic rails keyed to seeded content_tags slugs (prisma/seed-content-tags.ts).
// A rail hides itself when its topic has no tagged posts yet.
const TOPIC_RAILS: TopicRailConfig[] = [
  { slug: 'cute', title: 'Cute & Viral', icon: 'sparkles' },
  { slug: 'training', title: 'Training Tips', icon: 'school' },
  { slug: 'health', title: 'Health & Care', icon: 'fitness' },
  { slug: 'funny', title: 'Funny Moments', icon: 'happy' },
  { slug: 'adoption', title: 'Adoption Stories', icon: 'heart' },
];

// How many media posts the Trending rail consumes off the head of media_posts;
// the Media grid picks up after them so the two sections never repeat a post
const TRENDING_POSTS_COUNT = 8;
const MEDIA_PREVIEW_COUNT = 12;

export const ExploreSections = () => {
  const router = useRouter();

  const { data: discovery, isLoading: isLoadingDiscovery } = useQuery({
    queryKey: ['explore', 'discovery'],
    queryFn: () => socialApi.getExploreDiscovery(),
    staleTime: 5 * 60 * 1000,
  });

  const hashtags = discovery?.trending_hashtags ?? [];
  const mediaPosts = discovery?.media_posts ?? [];
  const breeds = discovery?.trending_breeds ?? [];

  const trendingPosts = mediaPosts.slice(0, TRENDING_POSTS_COUNT);
  const gridPosts = mediaPosts.slice(TRENDING_POSTS_COUNT, TRENDING_POSTS_COUNT + MEDIA_PREVIEW_COUNT);
  const hasMoreMedia = mediaPosts.length > TRENDING_POSTS_COUNT + MEDIA_PREVIEW_COUNT;

  return (
    <View>
      <TrendingRail hashtags={hashtags} posts={trendingPosts} isLoading={isLoadingDiscovery} />

      {(isLoadingDiscovery || gridPosts.length > 0) && (
        <View style={{ paddingTop: 24 }}>
          <SectionHeader
            title="Media"
            icon="images"
            onSeeAll={hasMoreMedia ? () => router.push('/(app)/media-grid') : undefined}
          />
          {isLoadingDiscovery ? (
            <View style={{ flexDirection: 'row', marginHorizontal: GRID_MARGIN, gap: GRID_GAP }}>
              {[...Array(3)].map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: GRID_ITEM_SIZE,
                    height: GRID_ITEM_SIZE,
                    borderRadius: 16,
                    backgroundColor: '#F3F4F6',
                  }}
                />
              ))}
            </View>
          ) : (
            <MediaGrid posts={gridPosts} onPostPress={(post) => router.push(`/post/${post.post_id}`)} />
          )}
        </View>
      )}

      {TOPIC_RAILS.map((t) => (
        <TopicRail key={t.slug} {...t} />
      ))}

      <TrendingBreedsRail breeds={breeds} isLoading={isLoadingDiscovery} />

      <SuggestedAccountsRail />

      <LostFoundNearbyRail />

      <VetsNearbyRail />

      {/* The FlashList's own data (the personalized feed) renders directly below */}
      <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 6 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#111' }}>For You</Text>
      </View>
    </View>
  );
};

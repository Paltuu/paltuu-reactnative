import React, { useEffect, useState } from 'react';
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

// ─── Progressive section reveal ─────────────────────────────────────────────
// This whole tree is FlashList's ListHeaderComponent, so none of it is
// virtualized — every rail mounts and paints in one go the instant the tab
// opens, right as the user is likely to start scrolling. Each rail also
// fires its own independent query (discovery, 5x topic, suggested accounts,
// vets nearby, lost&found), so without staggering, ~9 network responses land
// in a tight cluster and each triggers a re-render/reflow of this whole
// unvirtualized block. Revealing sections a beat apart spreads both the
// initial mount/paint cost and the query-driven re-renders over ~1s instead
// of dumping it all into the first frame.
const SECTION_TRENDING = 0;
const SECTION_MEDIA = 1;
const SECTION_TOPICS_START = 2; // occupies SECTION_TOPICS_START..+TOPIC_RAILS.length-1
const SECTION_BREEDS = SECTION_TOPICS_START + TOPIC_RAILS.length;
const SECTION_SUGGESTED = SECTION_BREEDS + 1;
const SECTION_LOSTFOUND = SECTION_SUGGESTED + 1;
const SECTION_VETS = SECTION_LOSTFOUND + 1;
const TOTAL_SECTIONS = SECTION_VETS + 1;
const INITIAL_VISIBLE_SECTIONS = 2; // Trending + Media share the discovery query — free to show together
const REVEAL_STEP_MS = 120;

const useProgressiveSections = (total: number) => {
  const [visible, setVisible] = useState(Math.min(INITIAL_VISIBLE_SECTIONS, total));
  useEffect(() => {
    if (visible >= total) return;
    const timeout = setTimeout(() => setVisible((v) => v + 1), REVEAL_STEP_MS);
    return () => clearTimeout(timeout);
  }, [visible, total]);
  return visible;
};

export const ExploreSections = () => {
  const router = useRouter();
  const visibleSections = useProgressiveSections(TOTAL_SECTIONS);

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
      {visibleSections > SECTION_TRENDING && (
        <TrendingRail hashtags={hashtags} posts={trendingPosts} isLoading={isLoadingDiscovery} />
      )}

      {visibleSections > SECTION_MEDIA && (isLoadingDiscovery || gridPosts.length > 0) && (
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

      {TOPIC_RAILS.map((t, i) =>
        visibleSections > SECTION_TOPICS_START + i ? <TopicRail key={t.slug} {...t} /> : null
      )}

      {visibleSections > SECTION_BREEDS && (
        <TrendingBreedsRail breeds={breeds} isLoading={isLoadingDiscovery} />
      )}

      {visibleSections > SECTION_SUGGESTED && <SuggestedAccountsRail />}

      {visibleSections > SECTION_LOSTFOUND && <LostFoundNearbyRail />}

      {visibleSections > SECTION_VETS && <VetsNearbyRail />}

      {/* The FlashList's own data (the personalized feed) renders directly below */}
      <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 6 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#111' }}>For You</Text>
      </View>
    </View>
  );
};

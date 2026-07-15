import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { socialApi } from '../../api/social';
import { FONTS } from '../../constants/typography';
import { SectionHeader } from './Rail';
import { TrendingRail } from './TrendingRail';
import { MediaGrid, GRID_ITEM_SIZE, GRID_MARGIN, GRID_GAP } from './MediaGrid';
import { RecentAdoptionsRail } from './RecentAdoptionsRail';
import { SuggestedAccountsRail } from './SuggestedAccountsRail';
import { LostFoundNearbyRail } from './LostFoundNearbyRail';
import { VetsNearbyRail } from './VetsNearbyRail';

const DARK = '#1A1A2E';
const SURFACE_SUBTLE = '#F5F5F7';

const MEDIA_PREVIEW_COUNT = 6;

// ─── Progressive section reveal ─────────────────────────────────────────────
// This whole tree is FlashList's ListHeaderComponent, so none of it is
// virtualized — every rail mounts and paints in one go the instant the tab
// opens, right as the user is likely to start scrolling. Each rail also
// fires its own independent query (discovery, suggested accounts, vets
// nearby, lost&found), so without staggering, several network responses land
// in a tight cluster and each triggers a re-render/reflow of this whole
// unvirtualized block. Revealing sections a beat apart spreads both the
// initial mount/paint cost and the query-driven re-renders over ~1s instead
// of dumping it all into the first frame.
const SECTION_TRENDING = 0;
const SECTION_MEDIA = 1;
const SECTION_ADOPTIONS = 2;
const SECTION_SUGGESTED = 3;
const SECTION_LOSTFOUND = 4;
const SECTION_VETS = 5;
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

  const keywords = discovery?.trending_keywords ?? [];
  const mediaPosts = discovery?.media_posts ?? [];

  const gridPosts = mediaPosts.slice(0, MEDIA_PREVIEW_COUNT);
  const hasMoreMedia = mediaPosts.length > MEDIA_PREVIEW_COUNT;

  return (
    <View>
      {visibleSections > SECTION_TRENDING && (
        <TrendingRail keywords={keywords} isLoading={isLoadingDiscovery} />
      )}

      {visibleSections > SECTION_MEDIA && (isLoadingDiscovery || gridPosts.length > 0) && (
        <View style={{ paddingTop: 24 }}>
          <SectionHeader
            title="Media"
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
                    backgroundColor: SURFACE_SUBTLE,
                  }}
                />
              ))}
            </View>
          ) : (
            <MediaGrid posts={gridPosts} onPostPress={(post) => router.push(`/post/${post.post_id}`)} />
          )}
        </View>
      )}

      {visibleSections > SECTION_ADOPTIONS && <RecentAdoptionsRail />}

      {visibleSections > SECTION_SUGGESTED && <SuggestedAccountsRail />}

      {visibleSections > SECTION_LOSTFOUND && <LostFoundNearbyRail />}

      {visibleSections > SECTION_VETS && <VetsNearbyRail />}

      {/* The FlashList's own data (the personalized feed) renders directly below */}
      <View style={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 18 }}>
        <Text style={{ fontFamily: FONTS.heading, fontSize: 18, color: DARK }}>For You</Text>
      </View>
    </View>
  );
};

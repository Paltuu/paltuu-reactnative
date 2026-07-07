import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { socialApi } from '../../api/social';
import { FONTS } from '../../constants/typography';
import { Rail } from './Rail';

const DARK = '#1A1A2E';
const SURFACE_SUBTLE = '#F5F5F7';

const CARD_WIDTH = 168;
const IMAGE_HEIGHT = 190;

type LostFoundPost = Awaited<ReturnType<typeof socialApi.getLostFoundNearby>>['posts'][number];

const LostFoundCard = ({ post, onPress }: { post: LostFoundPost; onPress: () => void }) => {
  const isLost = post.post_type === 'lost';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={{ width: CARD_WIDTH }}>
      <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: SURFACE_SUBTLE }}>
        {post.main_image ? (
          <Image
            source={{ uri: post.main_image }}
            style={{ width: '100%', height: IMAGE_HEIGHT }}
            contentFit="cover"
          />
        ) : (
          <View style={{ width: '100%', height: IMAGE_HEIGHT, backgroundColor: '#FCE8ED' }} />
        )}
        <View
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            paddingHorizontal: 9,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: isLost ? '#DC2626' : '#16A34A',
          }}
        >
          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 10, color: '#FFF', letterSpacing: 0.5 }}>
            {isLost ? 'LOST' : 'FOUND'}
          </Text>
        </View>
      </View>

      <Text
        numberOfLines={1}
        style={{ fontFamily: FONTS.bodyMedium, fontSize: 13, color: DARK, marginTop: 8 }}
      >
        {post.location || post.city || (isLost ? 'Lost pet' : 'Found pet')}
      </Text>
    </TouchableOpacity>
  );
};

export const LostFoundNearbyRail = () => {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['explore', 'lost-found-nearby'],
    queryFn: () => socialApi.getLostFoundNearby(10),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const posts = data?.posts ?? [];
  const title = data?.city ? `Lost & Found in ${data.city}` : 'Lost & Found';

  return (
    <Rail
      title={title}
      isLoading={isLoading}
      isEmpty={posts.length === 0}
      onSeeAll={() => router.push('/(app)/lost-found')}
      skeletonWidth={CARD_WIDTH}
      skeletonHeight={IMAGE_HEIGHT + 26}
    >
      {posts.map((p) => (
        <LostFoundCard key={p.post_id} post={p} onPress={() => router.push('/(app)/lost-found')} />
      ))}
    </Rail>
  );
};

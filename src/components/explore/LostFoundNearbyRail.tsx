import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { socialApi } from '../../api/social';
import { FONTS } from '../../constants/typography';
import { Rail } from './Rail';

const DARK = '#1A1A2E';
const MUTED = '#9AA0A6';
const SURFACE_SUBTLE = '#F5F5F7';

type LostFoundPost = Awaited<ReturnType<typeof socialApi.getLostFoundNearby>>['posts'][number];

const LostFoundCard = ({ post, onPress }: { post: LostFoundPost; onPress: () => void }) => {
  const isLost = post.post_type === 'lost';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        width: 190,
        borderRadius: 20,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#F0F0F2',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View>
        {post.main_image ? (
          <Image
            source={{ uri: post.main_image }}
            style={{
              width: '100%',
              height: 110,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              backgroundColor: SURFACE_SUBTLE,
            }}
            contentFit="cover"
          />
        ) : (
          <View
            style={{
              width: '100%',
              height: 110,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              backgroundColor: '#FCE8ED',
            }}
          />
        )}
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            backgroundColor: isLost ? '#DC2626' : '#16A34A',
          }}
        >
          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 10, color: '#FFF', letterSpacing: 0.5 }}>
            {isLost ? 'LOST' : 'FOUND'}
          </Text>
        </View>
      </View>

      <View style={{ padding: 12 }}>
        <Text numberOfLines={2} style={{ fontFamily: FONTS.bodyMedium, fontSize: 13, color: DARK, lineHeight: 17 }}>
          {post.pet_description || (isLost ? 'Lost pet' : 'Found pet')}
        </Text>
        {(post.location || post.city) && (
          <Text numberOfLines={1} style={{ fontFamily: FONTS.body, fontSize: 11.5, color: MUTED, marginTop: 5 }}>
            {post.location || post.city}
          </Text>
        )}
      </View>
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
      skeletonWidth={190}
      skeletonHeight={176}
    >
      {posts.map((p) => (
        <LostFoundCard key={p.post_id} post={p} onPress={() => router.push('/(app)/lost-found')} />
      ))}
    </Rail>
  );
};

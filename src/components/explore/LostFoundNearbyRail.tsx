import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { socialApi } from '../../api/social';
import { Rail } from './Rail';

type LostFoundPost = Awaited<ReturnType<typeof socialApi.getLostFoundNearby>>['posts'][number];

const LostFoundCard = ({ post, onPress }: { post: LostFoundPost; onPress: () => void }) => {
  const isLost = post.post_type === 'lost';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        width: 190,
        borderRadius: 16,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#F0F0F0',
        overflow: 'hidden',
      }}
    >
      <View>
        {post.main_image ? (
          <Image
            source={{ uri: post.main_image }}
            style={{ width: '100%', height: 110, backgroundColor: '#F3F4F6' }}
            contentFit="cover"
          />
        ) : (
          <View
            style={{
              width: '100%',
              height: 110,
              backgroundColor: '#FEF2F4',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 28 }}>🐾</Text>
          </View>
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
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 }}>
            {isLost ? 'LOST' : 'FOUND'}
          </Text>
        </View>
      </View>

      <View style={{ padding: 10 }}>
        <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: '600', color: '#222', lineHeight: 17 }}>
          {post.pet_description || (isLost ? 'Lost pet' : 'Found pet')}
        </Text>
        {(post.location || post.city) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5 }}>
            <Ionicons name="location" size={11} color="#A03048" />
            <Text numberOfLines={1} style={{ fontSize: 11.5, color: '#888', flex: 1 }}>
              {post.location || post.city}
            </Text>
          </View>
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
      icon="alert-circle"
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

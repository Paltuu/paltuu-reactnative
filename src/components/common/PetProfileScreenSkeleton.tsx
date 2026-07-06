// Loading placeholder for the pet-profile screen — same shape as
// ProfileScreenSkeleton but with a square (rounded) avatar instead of a
// circle, matching the one intentional difference between the two screens.
import React from 'react';
import { View } from 'react-native';
import { Skeleton } from './Skeleton';
import { PostCardSkeleton } from '../social/PostCardSkeleton';

export function PetProfileScreenSkeleton({ insetsTop = 0 }: { insetsTop?: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ paddingTop: insetsTop + 48, alignItems: 'center' }}>
        <Skeleton width={88} height={88} borderRadius={16} />
        <Skeleton width={120} height={18} style={{ marginTop: 14 }} />
        <Skeleton width={100} height={13} style={{ marginTop: 8 }} />

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 32, marginTop: 20 }}>
          <Skeleton width={36} height={26} />
          <Skeleton width={36} height={26} />
          <Skeleton width={36} height={26} />
        </View>
      </View>

      <PostCardSkeleton />
      <PostCardSkeleton />
    </View>
  );
}

export default PetProfileScreenSkeleton;

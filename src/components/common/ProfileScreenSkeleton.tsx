// Shared loading placeholder for both the own-profile and other-user-profile
// screens — mirrors their identity block (avatar/name/stats/bio/tab bar)
// followed by a couple of post-card skeletons, so the screen doesn't just
// flash a bare spinner while the profile query is in flight.
import React from 'react';
import { View } from 'react-native';
import { Skeleton, SkeletonCircle } from './Skeleton';
import { PostCardSkeleton } from '../social/PostCardSkeleton';

export function ProfileScreenSkeleton({ insetsTop = 0 }: { insetsTop?: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ paddingTop: insetsTop + 24, alignItems: 'center' }}>
        <SkeletonCircle size={96} />
        <Skeleton width={140} height={18} style={{ marginTop: 14 }} />
        <Skeleton width={90} height={13} style={{ marginTop: 8 }} />

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 32, marginTop: 20 }}>
          <Skeleton width={36} height={26} />
          <Skeleton width={36} height={26} />
          <Skeleton width={36} height={26} />
        </View>

        <Skeleton width={180} height={13} style={{ marginTop: 16 }} />

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            width: '100%',
            paddingHorizontal: 60,
            marginTop: 24,
            paddingTop: 14,
            borderTopWidth: 1,
            borderTopColor: '#F3F4F6',
          }}
        >
          <Skeleton width={22} height={22} borderRadius={5} />
          <Skeleton width={22} height={22} borderRadius={5} />
          <Skeleton width={22} height={22} borderRadius={5} />
        </View>
      </View>

      <PostCardSkeleton />
      <PostCardSkeleton />
    </View>
  );
}

export default ProfileScreenSkeleton;

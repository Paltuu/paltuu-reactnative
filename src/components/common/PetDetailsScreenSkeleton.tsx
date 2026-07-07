// Loading placeholder for the pet-details screen, shaped like the real
// layout (image card, guardian row, about text, characteristic pills) so
// there's no flash/jump when real content swaps in.
import React from 'react';
import { Dimensions, View } from 'react-native';
import { Skeleton, SkeletonCircle } from './Skeleton';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.86;
const CARD_HEIGHT = CARD_WIDTH * 0.8;

export function PetDetailsScreenSkeleton({ insetsTop = 0 }: { insetsTop?: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ height: insetsTop + 44 }} />

      <View style={{ alignItems: 'center', marginVertical: 12 }}>
        <Skeleton width={CARD_WIDTH} height={CARD_HEIGHT} borderRadius={28} />
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
        <Skeleton width="70%" height={26} style={{ marginBottom: 10 }} />
        <Skeleton width={120} height={14} style={{ marginBottom: 24 }} />

        <Skeleton width={80} height={14} style={{ marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <SkeletonCircle size={40} style={{ marginRight: 12 }} />
          <Skeleton width={100} height={15} />
        </View>

        <Skeleton width={80} height={14} style={{ marginBottom: 12 }} />
        <Skeleton width="100%" height={14} style={{ marginBottom: 8 }} />
        <Skeleton width="90%" height={14} style={{ marginBottom: 24 }} />

        <Skeleton width={120} height={14} style={{ marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Skeleton width={70} height={36} borderRadius={20} />
          <Skeleton width={90} height={36} borderRadius={20} />
          <Skeleton width={80} height={36} borderRadius={20} />
        </View>
      </View>
    </View>
  );
}

export default PetDetailsScreenSkeleton;

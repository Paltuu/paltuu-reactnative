// Shared skeleton primitive, built on react-native-reanimated-skeleton (a
// subtler "shiver" shimmer than our earlier hand-rolled gradient sweep).
// Kept as a thin wrapper so every screen that already renders <Skeleton />
// / <SkeletonCircle /> didn't need to change when the underlying animation
// library did.
import React from 'react';
import { DimensionValue, View, ViewStyle } from 'react-native';
import ReanimatedSkeleton from 'react-native-reanimated-skeleton';

const BONE_COLOR = '#F3F4F6';
const HIGHLIGHT_COLOR = '#FBFBFC';

export function Skeleton({
  width = '100%',
  height = 14,
  borderRadius = 6,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ width, height }, style]}>
      <ReanimatedSkeleton
        isLoading
        boneColor={BONE_COLOR}
        highlightColor={HIGHLIGHT_COLOR}
        animationType="shiver"
        containerStyle={{ width: '100%', height: '100%' }}
        layout={[{ key: 'bone', width: '100%', height: '100%', borderRadius }]}
      />
    </View>
  );
}

/** Circle convenience wrapper — avatar-shaped skeletons. */
export function SkeletonCircle({ size, style }: { size: number; style?: ViewStyle }) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />;
}

export default Skeleton;

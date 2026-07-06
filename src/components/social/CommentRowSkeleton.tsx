// Loading placeholder for a single comment row — shared by the post-detail
// screen's comment list and the CommentsBottomSheet modal.
import React from 'react';
import { View } from 'react-native';
import { Skeleton, SkeletonCircle } from '../common/Skeleton';

export const CommentRowSkeleton = () => (
  <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 10 }}>
    <SkeletonCircle size={32} />
    <View style={{ flex: 1, gap: 6 }}>
      <Skeleton width={100} height={12} />
      <Skeleton width="85%" height={13} />
      <Skeleton width="55%" height={13} />
    </View>
  </View>
);

export default CommentRowSkeleton;

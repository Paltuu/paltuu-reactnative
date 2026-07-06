// Loading placeholder shaped exactly like PostCard — reuses its exported
// layout constants (avatar size, gutter, media offset) so the skeleton
// doesn't jump/resize once the real card swaps in.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton, SkeletonCircle } from '../common/Skeleton';
import { CARD_INNER_PAD, AVATAR_SIZE, COL_GAP, CONTENT_W } from './PostCard';

export const PostCardSkeleton = () => (
  <View style={s.card}>
    <View style={s.authorRow}>
      <SkeletonCircle size={AVATAR_SIZE} />
      <View style={{ flex: 1, justifyContent: 'center', gap: 6 }}>
        <Skeleton width={Math.min(140, CONTENT_W)} height={13} />
        <Skeleton width={Math.min(90, CONTENT_W)} height={11} />
      </View>
    </View>

    <View style={s.caption}>
      <Skeleton width="92%" height={14} style={{ marginBottom: 8 }} />
      <Skeleton width="60%" height={14} />
    </View>

    <View style={s.media}>
      <Skeleton height={220} borderRadius={14} />
    </View>

    <View style={s.actionRow}>
      <Skeleton width={50} height={18} borderRadius={9} />
      <Skeleton width={50} height={18} borderRadius={9} />
      <Skeleton width={50} height={18} borderRadius={9} />
      <View style={{ flex: 1 }} />
      <Skeleton width={20} height={18} borderRadius={9} />
    </View>

    <View style={s.separator} />
  </View>
);

const s = StyleSheet.create({
  card: {
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: CARD_INNER_PAD,
    gap: COL_GAP,
    marginBottom: 12,
  },
  caption: {
    marginLeft: CARD_INNER_PAD + AVATAR_SIZE + COL_GAP,
    marginRight: 14,
    marginBottom: 10,
  },
  media: {
    marginLeft: CARD_INNER_PAD + AVATAR_SIZE + COL_GAP,
    marginRight: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingLeft: CARD_INNER_PAD + AVATAR_SIZE + COL_GAP,
    paddingRight: 14,
    marginTop: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginTop: 8,
  },
});

export default PostCardSkeleton;

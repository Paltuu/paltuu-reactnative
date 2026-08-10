import React, { useCallback } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Avatar } from '../common/Avatar';
import { formatCount } from './PostCard';
import { timeAgo as formatTime } from '../../utils/timeAgo';
import { COLORS } from '../../constants/colors';
import type { SurfacedComment } from '../../api/social';

const VerifiedIcon = require('../../../assets/icons/verified-check-svgrepo-com.svg');

/**
 * A popular reply on a private account's post — the one exception to the
 * private-post feed exclusion (posts/route.ts + feedQueryFragments.ts).
 * Deliberately does NOT render any post content/media/author — only the
 * commenter's identity + their reply, framed as "replying to a post" with no
 * preview, so the private post itself is never exposed here. Tap-through only:
 * no inline like/reply actions, full interaction happens after navigating into
 * the thread (which re-verifies access server-side, see thread/[id].tsx).
 */
export function SurfacedCommentCard({ item }: { item: SurfacedComment }) {
  const router = useRouter();

  const handlePress = useCallback(() => {
    router.push({
      pathname: '/thread/[id]',
      params: { id: item.comment_id, postId: item.post_id, viaSurfaced: 'true' },
    });
  }, [router, item.comment_id, item.post_id]);

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row items-start px-3.5 py-3.5 bg-gray-50 active:bg-gray-100"
    >
      <Avatar uri={item.commenter.profile_image_url} size={36} />

      <View className="flex-1 ml-3">
        <View className="flex-row items-center gap-1.5 mb-1">
          <Ionicons name="chatbubble-ellipses-outline" size={13} color="#9CA3AF" />
          <Text className="font-body text-xs text-gray-light">Popular reply</Text>
        </View>

        <View className="flex-row items-center gap-1">
          <Text className="font-headingSemi text-sm text-dark" numberOfLines={1}>
            {item.commenter.name}
          </Text>
          {!!item.commenter.verified && (
            <Image source={VerifiedIcon} style={{ width: 13, height: 13 }} tintColor={COLORS.primary} />
          )}
          <Text className="font-body text-xs text-gray-light">
            {' '}· {formatTime(item.created_at)}
          </Text>
        </View>

        <Text className="font-body text-sm text-dark leading-5 mt-1" numberOfLines={3}>
          {item.content}
        </Text>

        <View className="flex-row items-center gap-4 mt-2">
          <View className="flex-row items-center gap-1">
            <Ionicons name="heart-outline" size={14} color="#9CA3AF" />
            <Text className="font-body text-xs text-gray-light">{formatCount(item.like_count)}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Ionicons name="chatbubble-outline" size={14} color="#9CA3AF" />
            <Text className="font-body text-xs text-gray-light">{formatCount(item.reply_count)}</Text>
          </View>
        </View>

        <Text className="font-body text-xs text-gray-light mt-2">
          Replying to a post you can't see
        </Text>
      </View>
    </Pressable>
  );
}

export default SurfacedCommentCard;

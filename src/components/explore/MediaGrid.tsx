import React from 'react';
import { View, Dimensions, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SocialPost } from '../../api/social';

const { width: screenWidth } = Dimensions.get('window');

export const GRID_MARGIN = 16;
export const GRID_GAP = 8;
export const GRID_ITEM_SIZE = Math.floor((screenWidth - GRID_MARGIN * 2 - GRID_GAP * 2) / 3);

export const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
};

export const PostGridItem = ({ post, onPress }: { post: SocialPost; onPress: () => void }) => {
  const media = post.media?.length ? post.media : post.original_media;
  const imageUri = media?.[0]?.thumbnail_url || media?.[0]?.url || '';
  const isMulti = (media?.length || 0) > 1;
  const isVideo = media?.[0]?.media_type === 'video';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE, borderRadius: 16, overflow: 'hidden' }}
    >
      <Image
        source={{ uri: imageUri }}
        style={{ width: '100%', height: '100%', backgroundColor: '#F3F4F6' }}
        contentFit="cover"
      />
      {(isMulti || isVideo) && (
        <View style={{ position: 'absolute', top: 8, right: 8 }}>
          <Ionicons name={isVideo ? 'play' : 'copy'} size={16} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );
};

export const MediaGrid = ({
  posts,
  onPostPress,
}: {
  posts: SocialPost[];
  onPostPress: (post: SocialPost) => void;
}) => (
  <View>
    {chunkArray(posts, 3).map((chunk, i) => (
      <View
        key={i}
        style={{ flexDirection: 'row', marginHorizontal: GRID_MARGIN, gap: GRID_GAP, marginBottom: GRID_GAP }}
      >
        {chunk.map((post) => (
          <PostGridItem key={post.post_id} post={post} onPress={() => onPostPress(post)} />
        ))}
      </View>
    ))}
  </View>
);

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { SocialPost } from '../../api/social';
import { mentionsToPlainText } from '../social/MentionText';
import { FONTS } from '../../constants/typography';

const CARD_WIDTH = 150;
const DARK = '#1A1A2E';
const SURFACE_SUBTLE = '#F5F5F7';
const PRIMARY_SOFT = '#FCE8ED';

export const RailPostCard = ({ post, onPress }: { post: SocialPost; onPress: () => void }) => {
  const media = post.media?.length ? post.media : post.original_media;
  const imageUri = media?.[0]?.thumbnail_url || media?.[0]?.url || '';
  const caption = mentionsToPlainText(post.content || post.original_content || '')
    .split('\n')[0]
    .trim();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ width: CARD_WIDTH }}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={{ width: CARD_WIDTH, height: CARD_WIDTH, borderRadius: 16, backgroundColor: SURFACE_SUBTLE }}
          contentFit="cover"
        />
      ) : (
        <View
          style={{
            width: CARD_WIDTH,
            height: CARD_WIDTH,
            borderRadius: 16,
            backgroundColor: PRIMARY_SOFT,
            padding: 14,
            justifyContent: 'center',
          }}
        >
          <Text numberOfLines={5} style={{ fontFamily: FONTS.bodyMedium, fontSize: 13, color: DARK, lineHeight: 18 }}>
            {caption || 'Post'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

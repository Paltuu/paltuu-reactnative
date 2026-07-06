import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SocialPost } from '../../api/social';
import { mentionsToPlainText } from '../social/MentionText';

const CARD_WIDTH = 150;

const formatCount = (n: number) => (n > 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

export const RailPostCard = ({ post, onPress }: { post: SocialPost; onPress: () => void }) => {
  const media = post.media?.length ? post.media : post.original_media;
  const imageUri = media?.[0]?.thumbnail_url || media?.[0]?.url || '';
  const isVideo = media?.[0]?.media_type === 'video';
  const caption = mentionsToPlainText(post.content || post.original_content || '')
    .split('\n')[0]
    .trim();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ width: CARD_WIDTH }}>
      {imageUri ? (
        <View>
          <Image
            source={{ uri: imageUri }}
            style={{ width: CARD_WIDTH, height: CARD_WIDTH, borderRadius: 16, backgroundColor: '#F3F4F6' }}
            contentFit="cover"
          />
          {isVideo && (
            <View
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: 'rgba(0,0,0,0.45)',
                borderRadius: 10,
                padding: 4,
              }}
            >
              <Ionicons name="play" size={12} color="#FFF" />
            </View>
          )}
        </View>
      ) : (
        <View
          style={{
            width: CARD_WIDTH,
            height: CARD_WIDTH,
            borderRadius: 16,
            backgroundColor: '#FEF2F4',
            padding: 12,
            justifyContent: 'center',
          }}
        >
          <Text numberOfLines={5} style={{ fontSize: 13, color: '#333', fontWeight: '500', lineHeight: 18 }}>
            {caption || 'Post'}
          </Text>
        </View>
      )}

      {!!imageUri && !!caption && (
        <Text numberOfLines={1} style={{ fontSize: 12.5, color: '#333', marginTop: 6, fontWeight: '500' }}>
          {caption}
        </Text>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Ionicons name="heart" size={12} color="#A03048" />
          <Text style={{ fontSize: 11.5, color: '#888' }}>{formatCount(post.like_count ?? 0)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Ionicons name="chatbubble" size={11} color="#BBB" />
          <Text style={{ fontSize: 11.5, color: '#888' }}>{formatCount(post.comment_count ?? 0)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LostFoundFeedItem } from '../../api/social';
import { CARD_INNER_PAD, AVATAR_SIZE, COL_GAP } from './PostCard';

const MUTED = '#9CA3AF';
const LOST_COLOR = '#C0392B';
const FOUND_COLOR = '#1E8A5F';
const PLACEHOLDER = require('../../../assets/dog-placeholder.webp');
const APP_ICON = require('../../../assets/paltuu-app-icon.png');

const { width: SCREEN_W } = Dimensions.get('window');
const MEDIA_LEFT_OFFSET = CARD_INNER_PAD + AVATAR_SIZE + COL_GAP;
const MEDIA_FULL_W = SCREEN_W - MEDIA_LEFT_OFFSET;
const SINGLE_IMG_W = MEDIA_FULL_W - 24;
const SINGLE_IMG_H = Math.round(SINGLE_IMG_W / 1.125);

interface LostFoundFeedCardProps {
  item: LostFoundFeedItem;
  onPress: () => void;
}

// Same PostCard geometry as AdoptionFeedCard, distinguished from it (and from
// a normal post) only by the lost/found accent label in place of "Sponsored".
export default function LostFoundFeedCard({ item, onPress }: LostFoundFeedCardProps) {
  const isLost = item.post_type === 'lost';
  const accent = isLost ? LOST_COLOR : FOUND_COLOR;
  const title = isLost ? 'Lost pet' : 'Found pet';

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={styles.card}>
      <View style={styles.authorRow}>
        <Image source={APP_ICON} style={styles.avatar} contentFit="cover" />
        <View style={styles.authorTextCol}>
          <View style={styles.authorNameRow}>
            <Text style={[styles.name, { color: accent }]} numberOfLines={1}>{title}</Text>
            <Text style={styles.location}> · {item.location || item.city}</Text>
          </View>
        </View>
      </View>

      <View style={styles.caption}>
        <Text style={styles.captionText} numberOfLines={2}>{item.pet_description}</Text>
      </View>

      <View style={styles.mediaWrapper}>
        <Image
          source={item.image_url ? { uri: item.image_url } : PLACEHOLDER}
          style={{ width: SINGLE_IMG_W, height: SINGLE_IMG_H, borderRadius: 14 }}
          contentFit="cover"
          transition={300}
          recyclingKey={item.image_url || String(item.id)}
        />
      </View>

      <View style={styles.ctaRow}>
        <View style={[styles.ctaDot, { backgroundColor: accent }]} />
        <Text style={[styles.ctaText, { color: accent }]}>View post</Text>
        <Text style={styles.chevron}>›</Text>
      </View>

      <View style={styles.separator} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', paddingVertical: 12 },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: CARD_INNER_PAD,
    gap: COL_GAP,
  },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: '#F5F5F7' },
  authorTextCol: { flex: 1, justifyContent: 'flex-start' },
  authorNameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '700', flexShrink: 0 },
  location: { fontSize: 13, color: MUTED, flexShrink: 1 },
  caption: {
    marginLeft: MEDIA_LEFT_OFFSET,
    marginRight: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  captionText: { fontSize: 15, lineHeight: 22, color: '#111', letterSpacing: -0.4 },
  mediaWrapper: {
    marginLeft: MEDIA_LEFT_OFFSET,
    marginRight: -14,
    marginBottom: 4,
    overflow: 'hidden',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: MEDIA_LEFT_OFFSET,
    marginRight: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 6,
  },
  ctaDot: { width: 6, height: 6, borderRadius: 3 },
  ctaText: { flex: 1, fontSize: 13, fontWeight: '700' },
  chevron: { fontSize: 18, color: '#C9CDD3' },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginTop: 12,
  },
});

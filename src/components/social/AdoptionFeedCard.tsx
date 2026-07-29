import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { AdoptionFeedItem } from '../../api/social';
import { CARD_INNER_PAD, AVATAR_SIZE, COL_GAP } from './PostCard';

const PRIMARY = '#A03048';
const DARK = '#111';
const MUTED = '#9CA3AF';
const PLACEHOLDER = require('../../../assets/dog-placeholder.webp');
const PAW_ICON = require('../../../assets/icons/paw-like-select.svg');
const APP_ICON = require('../../../assets/paltuu-app-icon.png');

// Mirrors PostCard's media geometry exactly (MEDIA_LEFT_OFFSET / single-image
// sizing aren't exported, so recomputed here from the same exported constants).
const { width: SCREEN_W } = Dimensions.get('window');
const MEDIA_LEFT_OFFSET = CARD_INNER_PAD + AVATAR_SIZE + COL_GAP;
const MEDIA_FULL_W = SCREEN_W - MEDIA_LEFT_OFFSET;
const SINGLE_IMG_W = MEDIA_FULL_W - 24;
const SINGLE_IMG_H = Math.round(SINGLE_IMG_W / 1.125);

const formatAge = (ageMonths: number | null | undefined): string => {
  if (ageMonths === null || ageMonths === undefined || ageMonths < 0) return '';
  if (ageMonths === 0) return 'Newborn';
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  if (years > 0 && months > 0) return `${years}y ${months}m`;
  if (years > 0) return `${years} ${years === 1 ? 'year' : 'years'}`;
  return `${months} ${months === 1 ? 'month' : 'months'}`;
};

interface AdoptionFeedCardProps {
  item: AdoptionFeedItem;
  onPress: () => void;
}

// Injected into the feed at a fixed interval (see lib/feedInjection.ts on the
// backend). Built on PostCard's exact geometry (avatar row, caption offset,
// media bleed, hairline separator) so it reads as a normal post. The avatar
// is Paltuu's own mark rather than the pet's photo — the pet isn't the one
// posting, so giving it a "profile picture" read as an uncanny impersonation
// rather than an account. Same fix as Instagram: the advertiser's account up
// top, the product's name/details down in the caption.
export default function AdoptionFeedCard({ item, onPress }: AdoptionFeedCardProps) {
  const age = formatAge(item.age_months);
  const detailParts = [item.pet_breed, age, item.city].filter(Boolean);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${item.pet_name}, up for adoption. ${detailParts.join(', ')}`}
    >
      <View style={styles.authorRow}>
        <Image source={APP_ICON} style={styles.avatar} contentFit="cover" />
        <View style={styles.authorTextCol}>
          <View style={styles.authorNameRow}>
            <Text style={styles.name} numberOfLines={1}>Paltuu Adoptions</Text>
            <Text style={styles.sponsored} numberOfLines={1}> · Sponsored</Text>
          </View>
        </View>
      </View>

      {/* Name and details are separate lines, not one run-on string: joined
          inline, a wrap would orphan a leading "·" at the start of line two,
          and the details would compete with the name at the same weight. */}
      <View style={styles.caption}>
        <Text style={styles.captionName} numberOfLines={2}>{item.pet_name}</Text>
        {detailParts.length > 0 && (
          <Text style={styles.captionMeta} numberOfLines={1}>{detailParts.join(' · ')}</Text>
        )}
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
        <Image source={PAW_ICON} style={styles.ctaIcon} contentFit="contain" tintColor={PRIMARY} />
        <Text style={styles.ctaText}>View adoption listing</Text>
        <Ionicons name="chevron-forward" size={14} color="#C9CDD3" />
      </View>

      <View style={styles.separator} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', paddingVertical: 12 },
  authorRow: {
    // flex-start (not center) so the name sits at the TOP of the 36px avatar
    // row, exactly like PostCard — that's what lets the caption tuck back up
    // into the avatar's lower half below.
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: CARD_INNER_PAD,
    gap: COL_GAP,
  },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: '#F5F5F7' },
  authorTextCol: { flex: 1, justifyContent: 'flex-start' },
  authorNameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '700', color: DARK, flexShrink: 0 },
  sponsored: { fontSize: 13, color: MUTED, flexShrink: 1 },
  caption: {
    marginLeft: MEDIA_LEFT_OFFSET,
    marginRight: 14,
    // Pull up so the caption starts right after the name line, ignoring the
    // taller avatar's overhang below it (avatar 36 vs ~20 line) — mirrors
    // PostCard.caption. Without this the caption clears the whole avatar and
    // leaves a dead band across the card.
    marginTop: -18,
    marginBottom: 8,
  },
  captionName: { fontSize: 15, lineHeight: 22, fontWeight: '700', color: DARK, letterSpacing: -0.4 },
  captionMeta: { fontSize: 13, lineHeight: 18, color: MUTED, letterSpacing: -0.2, marginTop: 1 },
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
  ctaIcon: { width: 14, height: 14 },
  ctaText: { flex: 1, fontSize: 13, fontWeight: '700', color: PRIMARY },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginTop: 12,
  },
});

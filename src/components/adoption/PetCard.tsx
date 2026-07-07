import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { FONTS } from '../../constants/typography';

const PRIMARY = '#A03048';
const DARK = '#1A1A2E';
const MUTED = '#6B7280';

const LOCATION_ICON = require('../../../assets/icons/location-pin-alt-1-svgrepo-com.svg');
const PAW_ICON = require('../../../assets/icons/paw-like-select.svg');
const PLACEHOLDER = require('../../../assets/dog-placeholder.png');

const formatAge = (ageMonths: number | null | undefined): string => {
  if (ageMonths === null || ageMonths === undefined || ageMonths < 0) return '';
  if (ageMonths === 0) return 'Newborn';
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  if (years > 0 && months > 0) return `${years}y ${months}m`;
  if (years > 0) return `${years} ${years === 1 ? 'year' : 'years'}`;
  return `${months} ${months === 1 ? 'month' : 'months'}`;
};

interface PetCardProps {
  pet: any;
  onPress: () => void;
}

export const PetCard = ({ pet, onPress }: PetCardProps) => {
  const age = formatAge(pet.age_months);
  const subtitleParts = [pet.pet_breed, age].filter(Boolean);
  const location = [pet.area, pet.city].filter(Boolean).join(', ');

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.card}>
      <View style={styles.cardInner}>
        <View style={styles.imageWrap}>
          <Image
            source={pet.main_image ? { uri: pet.main_image } : PLACEHOLDER}
            style={styles.image}
            contentFit="cover"
            transition={300}
          />
          {pet.listing_type === 'rescue' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Rescue</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>
            {pet.pet_name}
          </Text>

          {subtitleParts.length > 0 && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitleParts.join(' · ')}
            </Text>
          )}

          <View style={styles.metaRow}>
            {pet.sex ? (
              <View style={styles.metaItem}>
                <Image source={PAW_ICON} style={styles.metaIcon} contentFit="contain" />
                <Text style={styles.metaText}>
                  {pet.sex === 'male' ? 'Male' : 'Female'}
                </Text>
              </View>
            ) : null}

            {location ? (
              <View style={[styles.metaItem, { flex: 1 }]}>
                <Image
                  source={LOCATION_ICON}
                  style={styles.metaIcon}
                  contentFit="contain"
                  tintColor={PRIMARY}
                />
                <Text style={styles.metaText} numberOfLines={1}>
                  {location}
                </Text>
              </View>
            ) : null}

            {pet.price ? (
              <Text style={styles.price}>Rs {Number(pet.price).toLocaleString()}</Text>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardInner: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1.15,
    backgroundColor: '#F5F5F7',
  },
  image: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10.5,
    color: '#FFFFFF',
  },
  body: { padding: 14, backgroundColor: '#FFFFFF' },
  name: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    color: DARK,
    lineHeight: 21,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 12.5,
    color: MUTED,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaIcon: { width: 13, height: 13 },
  metaText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11.5,
    color: '#444',
  },
  price: {
    fontFamily: FONTS.headingSemi,
    fontSize: 13,
    color: PRIMARY,
    marginLeft: 'auto',
  },
});

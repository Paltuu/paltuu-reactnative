import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Clinic } from '../../types/models';
import { FONTS } from '../../constants/typography';

const PRIMARY = '#A03048';
const DARK = '#1A1A2E';
const MUTED = '#6B7280';

interface ClinicCardProps {
  clinic: Clinic;
  onPress: () => void;
  /** distance in km from the user (optional — only when location is shared) */
  distanceKm?: number | null;
}

const formatDistance = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

export const ClinicCard = ({ clinic, onPress, distanceKm }: ClinicCardProps) => {
  const rating = clinic.rating != null ? Number(clinic.rating) : null;
  const reviews = clinic.total_reviews ?? 0;

  const hasDiscount =
    !!clinic.discount_details &&
    !clinic.discount_details.toLowerCase().includes('no discount') &&
    !clinic.discount_details.toLowerCase().includes('pending negotiation');

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.card}>
      {/* Logo — always 1:1 */}
      <View style={styles.logoWrap}>
        {clinic.logo_url ? (
          <Image
            source={{ uri: clinic.logo_url }}
            style={styles.logo}
            contentFit="cover"
            transition={250}
          />
        ) : (
          <View style={[styles.logo, styles.logoFallback]}>
            <Ionicons name="medkit" size={26} color={PRIMARY} />
          </View>
        )}
      </View>

      {/* Body */}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {clinic.name}
          </Text>
          {clinic.is_verified && (
            <View style={styles.verifiedPill}>
              <MaterialIcons name="verified" size={11} color={PRIMARY} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>

        {/* meta line: rating + distance */}
        <View style={styles.metaRow}>
          {rating != null && (
            <View style={styles.metaChip}>
              <Ionicons name="star" size={11} color="#F5A623" />
              <Text style={styles.metaChipText}>
                {rating.toFixed(1)}
                {reviews ? ` (${reviews})` : ''}
              </Text>
            </View>
          )}
          {distanceKm != null && (
            <View style={styles.metaChip}>
              <Ionicons name="navigate" size={10} color={PRIMARY} />
              <Text style={styles.metaChipText}>{formatDistance(distanceKm)}</Text>
            </View>
          )}
          {clinic.category ? (
            <Text style={styles.category} numberOfLines={1}>
              {clinic.category}
            </Text>
          ) : null}
        </View>

        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={12} color={MUTED} style={{ marginTop: 1 }} />
          <Text style={styles.address} numberOfLines={2}>
            {clinic.address}
          </Text>
        </View>

        {hasDiscount && (
          <View style={styles.discountRow}>
            <MaterialIcons name="local-offer" size={11} color={PRIMARY} />
            <Text style={styles.discountText} numberOfLines={1}>
              {clinic.discount_details}
            </Text>
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={18} color="#C4C4CC" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F5F5F7',
  },
  logo: { width: '100%', height: '100%' },
  logoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5E4E8',
  },
  body: { flex: 1, marginLeft: 12, marginRight: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    color: DARK,
    flexShrink: 1,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F5E4E8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  verifiedText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9.5,
    color: PRIMARY,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
  },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaChipText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: '#444',
  },
  category: {
    fontFamily: FONTS.body,
    fontSize: 10.5,
    color: '#9AA0A6',
    flexShrink: 1,
  },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 6 },
  address: {
    fontFamily: FONTS.body,
    fontSize: 11.5,
    color: MUTED,
    flex: 1,
    lineHeight: 16,
  },
  discountRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  discountText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: PRIMARY,
    flex: 1,
  },
});

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { socialApi } from '../../api/social';
import { FONTS } from '../../constants/typography';

const PRIMARY = '#A03048';
const DARK = '#1A1A2E';
const MUTED = '#9AA0A6';
const SURFACE_SUBTLE = '#F5F5F7';

const CARD_WIDTH = 180;
const IMAGE_HEIGHT = 180;

export type NearbyClinic = Awaited<ReturnType<typeof socialApi.getVetsNearby>>['clinics'][number];

export const NearbyClinicCard = ({ clinic, onPress }: { clinic: NearbyClinic; onPress: () => void }) => {
  const rating = clinic.rating != null ? Number(clinic.rating) : null;
  const distanceKm = clinic.distance_km != null ? Number(clinic.distance_km) : null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={{ width: CARD_WIDTH }}>
      <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: SURFACE_SUBTLE }}>
        {clinic.logo_url ? (
          <Image
            source={{ uri: clinic.logo_url }}
            style={{ width: '100%', height: IMAGE_HEIGHT }}
            contentFit="cover"
          />
        ) : (
          <View style={{ width: '100%', height: IMAGE_HEIGHT, backgroundColor: '#FCE8ED' }} />
        )}

        {distanceKm != null && (
          <View
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              paddingHorizontal: 9,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: 'rgba(0,0,0,0.55)',
            }}
          >
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 10.5, color: '#FFF' }}>
              {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
            </Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <Text numberOfLines={1} style={{ fontFamily: FONTS.bodyMedium, fontSize: 13, color: DARK, flex: 1 }}>
          {clinic.name}
        </Text>
        {clinic.is_paltuu_partner && (
          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 10, color: PRIMARY }}>Verified</Text>
        )}
      </View>

      {rating != null && rating > 0 && (
        <Text style={{ fontFamily: FONTS.body, fontSize: 11.5, color: MUTED, marginTop: 2 }}>
          {rating.toFixed(1)} rating
          {clinic.total_reviews != null && clinic.total_reviews > 0 ? ` (${clinic.total_reviews})` : ''}
        </Text>
      )}
    </TouchableOpacity>
  );
};

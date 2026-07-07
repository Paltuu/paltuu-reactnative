import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { socialApi } from '../../api/social';
import { FONTS } from '../../constants/typography';

const PRIMARY = '#A03048';
const DARK = '#1A1A2E';
const MUTED = '#9AA0A6';
const SURFACE_SUBTLE = '#F5F5F7';

export type NearbyClinic = Awaited<ReturnType<typeof socialApi.getVetsNearby>>['clinics'][number];

export const NearbyClinicCard = ({ clinic, onPress }: { clinic: NearbyClinic; onPress: () => void }) => {
  const rating = clinic.rating != null ? Number(clinic.rating) : null;
  const distanceKm = clinic.distance_km != null ? Number(clinic.distance_km) : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        width: 200,
        borderRadius: 20,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#F0F0F2',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View>
        {clinic.logo_url ? (
          <Image
            source={{ uri: clinic.logo_url }}
            style={{
              width: '100%',
              height: 100,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              backgroundColor: SURFACE_SUBTLE,
            }}
            contentFit="cover"
          />
        ) : (
          <View
            style={{
              width: '100%',
              height: 100,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              backgroundColor: '#FCE8ED',
            }}
          />
        )}

        {distanceKm != null && (
          <View
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              paddingHorizontal: 8,
              paddingVertical: 3,
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

      <View style={{ padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text numberOfLines={1} style={{ fontFamily: FONTS.headingSemi, fontSize: 13.5, color: DARK, flex: 1 }}>
            {clinic.name}
          </Text>
          {clinic.is_paltuu_partner && (
            <View style={{ backgroundColor: '#FCE8ED', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 }}>
              <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 9, color: PRIMARY }}>Verified</Text>
            </View>
          )}
        </View>

        {(clinic.address || clinic.city) && (
          <Text numberOfLines={1} style={{ fontFamily: FONTS.body, fontSize: 11.5, color: MUTED, marginTop: 4 }}>
            {clinic.address || clinic.city}
          </Text>
        )}

        {rating != null && rating > 0 && (
          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: DARK, marginTop: 6 }}>
            {rating.toFixed(1)} rating
            {clinic.total_reviews != null && clinic.total_reviews > 0 && (
              <Text style={{ fontFamily: FONTS.body, color: MUTED }}> ({clinic.total_reviews})</Text>
            )}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { socialApi } from '../../api/social';

export type NearbyClinic = Awaited<ReturnType<typeof socialApi.getVetsNearby>>['clinics'][number];

export const NearbyClinicCard = ({ clinic, onPress }: { clinic: NearbyClinic; onPress: () => void }) => {
  const rating = clinic.rating != null ? Number(clinic.rating) : null;
  const distanceKm = clinic.distance_km != null ? Number(clinic.distance_km) : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        width: 200,
        borderRadius: 16,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#F0F0F0',
      }}
    >
      {clinic.logo_url ? (
        <Image
          source={{ uri: clinic.logo_url }}
          style={{
            width: '100%',
            height: 100,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            backgroundColor: '#F3F4F6',
          }}
          contentFit="cover"
        />
      ) : (
        <View
          style={{
            width: '100%',
            height: 100,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            backgroundColor: '#FEF2F4',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="medkit" size={28} color="#A03048" />
        </View>
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
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#FFF' }}>
            {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
          </Text>
        </View>
      )}

      <View style={{ padding: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: '700', color: '#111', flex: 1 }}>
            {clinic.name}
          </Text>
          {clinic.is_paltuu_partner && <Ionicons name="checkmark-circle" size={14} color="#A03048" />}
        </View>

        {(clinic.address || clinic.city) && (
          <Text numberOfLines={1} style={{ fontSize: 11.5, color: '#888', marginTop: 3 }}>
            {clinic.address || clinic.city}
          </Text>
        )}

        {rating != null && rating > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5 }}>
            <Ionicons name="star" size={12} color="#F5A623" />
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#333' }}>{rating.toFixed(1)}</Text>
            {clinic.total_reviews != null && clinic.total_reviews > 0 && (
              <Text style={{ fontSize: 11, color: '#AAA' }}>({clinic.total_reviews})</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

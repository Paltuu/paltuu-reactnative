import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Vet } from '../../types/models';
import { NO_PROFILE_IMAGE } from '../../constants/images';
import { FONTS } from '../../constants/typography';

const PRIMARY = '#A03048';

interface VetCardProps {
  vet: Vet;
  onPress?: () => void;
}

export const VetCard = ({ vet, onPress }: VetCardProps) => {
  const formattedName = /^dr\.?\s*/i.test(vet.name || '')
    ? vet.name
    : `Dr. ${vet.name}`;

  const handleCall = () => {
    if (vet.contact_details) Linking.openURL(`tel:${vet.contact_details}`);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.card}
    >
      <Image
        source={vet.profile_image_url ? vet.profile_image_url : NO_PROFILE_IMAGE}
        style={styles.avatar}
        contentFit="cover"
        transition={250}
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {formattedName}
        </Text>
        {!!vet.clinic_name && (
          <Text style={styles.clinic} numberOfLines={1}>
            {vet.clinic_name}
          </Text>
        )}
        {!!vet.location && (
          <Text style={styles.location} numberOfLines={2}>
            {vet.location}
          </Text>
        )}
      </View>
      {!!vet.contact_details && (
        <TouchableOpacity onPress={handleCall} style={styles.callBtn}>
          <Ionicons name="call" size={16} color="#FFF" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F2',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EDEDED',
  },
  info: { flex: 1, marginHorizontal: 12 },
  name: { fontFamily: FONTS.heading, fontSize: 15, color: PRIMARY },
  clinic: { fontFamily: FONTS.bodyMedium, fontSize: 12.5, color: '#3A3A44', marginTop: 2 },
  location: { fontFamily: FONTS.body, fontSize: 11.5, color: '#8A8A94', marginTop: 3, lineHeight: 16 },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

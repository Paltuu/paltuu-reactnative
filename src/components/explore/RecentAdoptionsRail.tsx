import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { petApi } from '../../api/pets';
import { FONTS } from '../../constants/typography';
import { Rail } from './Rail';

const DARK = '#1A1A2E';
const MUTED = '#9AA0A6';
const SURFACE_SUBTLE = '#F5F5F7';

const CARD_WIDTH = 150;
const IMAGE_HEIGHT = 170;

const AdoptionPetCard = ({ pet, onPress }: { pet: any; onPress: () => void }) => {
  const location = [pet.area, pet.city].filter(Boolean).join(', ');

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={{ width: CARD_WIDTH }}>
      <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: SURFACE_SUBTLE }}>
        {pet.main_image ? (
          <Image
            source={{ uri: pet.main_image }}
            style={{ width: '100%', height: IMAGE_HEIGHT }}
            contentFit="cover"
          />
        ) : (
          <View style={{ width: '100%', height: IMAGE_HEIGHT, backgroundColor: '#FCE8ED' }} />
        )}
      </View>

      <Text numberOfLines={1} style={{ fontFamily: FONTS.bodyMedium, fontSize: 13, color: DARK, marginTop: 8 }}>
        {pet.pet_name}
        {pet.pet_breed ? ` · ${pet.pet_breed}` : ''}
      </Text>
      {!!location && (
        <Text numberOfLines={1} style={{ fontFamily: FONTS.body, fontSize: 11.5, color: MUTED, marginTop: 1 }}>
          {location}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export const RecentAdoptionsRail = () => {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['explore', 'recent-adoptions'],
    queryFn: () => petApi.getAdoptionPets({ page: 1, limit: 10 }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const pets = data?.data ?? [];

  return (
    <Rail
      title="Recently Posted for Adoption"
      isLoading={isLoading}
      isEmpty={pets.length === 0}
      onSeeAll={() => router.push('/(app)/adopt')}
      skeletonWidth={CARD_WIDTH}
      skeletonHeight={IMAGE_HEIGHT + 26}
    >
      {pets.map((p: any) => (
        <AdoptionPetCard
          key={p.pet_id}
          pet={p}
          onPress={() => router.push({ pathname: '/(app)/pet-details', params: { id: p.pet_id } })}
        />
      ))}
    </Rail>
  );
};

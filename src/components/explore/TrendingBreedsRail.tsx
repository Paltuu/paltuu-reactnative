import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Rail } from './Rail';
import { FONTS } from '../../constants/typography';

const DARK = '#1A1A2E';
const MUTED = '#9AA0A6';

interface TrendingBreed {
  breed: string;
  pet_count: number;
  adoption_count: number;
}

const BreedChip = ({ breed, onPress }: { breed: TrendingBreed; onPress: () => void }) => {
  const adoptionCount = Number(breed.adoption_count) || 0;
  const petCount = Number(breed.pet_count) || 0;
  const count = adoptionCount > 0 ? adoptionCount : petCount;
  const label = adoptionCount > 0 ? 'adopted' : `listed`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        height: 38,
        borderRadius: 999,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#EFEFF1',
      }}
    >
      <Text numberOfLines={1} style={{ fontFamily: FONTS.bodyBold, fontSize: 13.5, color: DARK }}>
        {breed.breed}
      </Text>
      <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: MUTED }}>
        {count} {label}
      </Text>
    </TouchableOpacity>
  );
};

export const TrendingBreedsRail = ({
  breeds,
  isLoading,
}: {
  breeds: TrendingBreed[];
  isLoading: boolean;
}) => {
  const router = useRouter();

  return (
    <Rail
      title="Trending Breeds"
      isLoading={isLoading}
      isEmpty={breeds.length === 0}
      onSeeAll={() => router.push('/(app)/adopt')}
      skeletonWidth={130}
      skeletonHeight={38}
    >
      {breeds.slice(0, 10).map((b) => (
        <BreedChip
          key={b.breed}
          breed={b}
          onPress={() => router.push({ pathname: '/(app)/adopt', params: { breed: b.breed } })}
        />
      ))}
    </Rail>
  );
};

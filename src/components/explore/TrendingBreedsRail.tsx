import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Rail } from './Rail';

interface TrendingBreed {
  breed: string;
  pet_count: number;
  adoption_count: number;
}

const BreedCard = ({ breed, onPress }: { breed: TrendingBreed; onPress: () => void }) => {
  const adoptionCount = Number(breed.adoption_count) || 0;
  const petCount = Number(breed.pet_count) || 0;
  const count = adoptionCount > 0 ? adoptionCount : petCount;
  const caption =
    adoptionCount > 0 ? 'up for adoption' : `listing${petCount === 1 ? '' : 's'}`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        width: 140,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: '700', color: '#111' }}>
        {breed.breed}
      </Text>
      <Text style={{ fontSize: 11.5, fontWeight: '500', color: '#999', marginTop: 4 }}>
        {count} {caption}
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
      icon="paw"
      isLoading={isLoading}
      isEmpty={breeds.length === 0}
      onSeeAll={() => router.push('/(app)/adopt')}
      skeletonWidth={160}
      skeletonHeight={104}
    >
      {breeds.slice(0, 10).map((b) => (
        <BreedCard
          key={b.breed}
          breed={b}
          onPress={() => router.push({ pathname: '/(app)/adopt', params: { breed: b.breed } })}
        />
      ))}
    </Rail>
  );
};

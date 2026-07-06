import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const subtitle =
    adoptionCount > 0
      ? `${adoptionCount} up for adoption`
      : `${petCount} listing${petCount === 1 ? '' : 's'}`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        width: 160,
        padding: 14,
        borderRadius: 16,
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: '#FEF2F4',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <Ionicons name="paw" size={16} color="#A03048" />
      </View>
      <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: '700', color: '#111' }}>
        {breed.breed}
      </Text>
      <Text numberOfLines={1} style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
        {subtitle}
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

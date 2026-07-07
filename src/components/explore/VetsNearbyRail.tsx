import React from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { socialApi } from '../../api/social';
import { useLocationStore } from '../../stores/locationStore';
import { Rail } from './Rail';
import { NearbyClinicCard } from './NearbyClinicCard';

export const VetsNearbyRail = () => {
  const router = useRouter();
  const latitude = useLocationStore((s) => s.latitude);
  const longitude = useLocationStore((s) => s.longitude);
  const locationStatus = useLocationStore((s) => s.status);

  const coords = latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null;
  // Wait for the app-root location resolution to settle before fetching, so we
  // don't fire a coordinate-less request that immediately gets superseded
  const locationSettled = locationStatus !== 'idle' && locationStatus !== 'resolving';

  const { data, isLoading } = useQuery({
    queryKey: ['explore', 'vets-nearby', coords?.lat ?? null, coords?.lng ?? null],
    queryFn: () => socialApi.getVetsNearby(coords, 10),
    staleTime: 10 * 60 * 1000,
    retry: 1,
    enabled: locationSettled,
  });

  const clinics = data?.clinics ?? [];

  return (
    <Rail
      title={coords ? 'Vets & Clinics Near You' : 'Top Vets & Clinics'}
      isLoading={isLoading || !locationSettled}
      isEmpty={clinics.length === 0}
      onSeeAll={() => router.push('/(app)/pet-care')}
      skeletonWidth={180}
      skeletonHeight={230}
    >
      {clinics.map((c) => (
        <NearbyClinicCard
          key={c.clinic_id}
          clinic={c}
          onPress={() => router.push({ pathname: '/(app)/clinic/[id]', params: { id: String(c.clinic_id) } })}
        />
      ))}
    </Rail>
  );
};

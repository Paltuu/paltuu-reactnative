import { create } from 'zustand';
import { petApi } from '../api/pets';
import { findNearestCity } from '../utils/geo';

type LocationStatus = 'idle' | 'resolving' | 'resolved' | 'denied' | 'error';

interface LocationState {
  status: LocationStatus;
  cityId: number | null;
  cityName: string | null;
  latitude: number | null;
  longitude: number | null;
  resolveCity: () => Promise<void>;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  status: 'idle',
  cityId: null,
  cityName: null,
  latitude: null,
  longitude: null,

  resolveCity: async () => {
    if (get().status === 'resolving') return;
    set({ status: 'resolving' });

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Location = require('expo-location') as typeof import('expo-location');

      let { status: permission } = await Location.getForegroundPermissionsAsync();
      if (permission !== 'granted') {
        ({ status: permission } = await Location.requestForegroundPermissionsAsync());
      }
      if (permission !== 'granted') {
        set({ status: 'denied' });
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;

      const cities = await petApi.getCities();
      const nearest = findNearestCity(cities, latitude, longitude);

      if (!nearest) {
        // Keep raw coordinates even when no city matches — distance-based
        // features (e.g. nearby vets) don't need a resolved city
        set({ status: 'error', latitude, longitude });
        return;
      }

      set({
        status: 'resolved',
        cityId: nearest.city_id,
        cityName: nearest.city_name,
        latitude,
        longitude,
      });
    } catch (err) {
      if (__DEV__) console.log('[Paltuu] Failed to resolve nearest city:', err);
      set({ status: 'error' });
    }
  },
}));

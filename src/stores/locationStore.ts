import { create } from 'zustand';
import * as Location from 'expo-location';
import { petApi } from '../api/pets';
import { findNearestCity } from '../utils/geo';

type LocationStatus = 'idle' | 'resolving' | 'resolved' | 'denied' | 'error';

interface LocationState {
  status: LocationStatus;
  cityId: number | null;
  cityName: string | null;
  resolveCity: () => Promise<void>;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  status: 'idle',
  cityId: null,
  cityName: null,

  resolveCity: async () => {
    if (get().status === 'resolving') return;
    set({ status: 'resolving' });

    try {
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

      const cities = await petApi.getCities();
      const nearest = findNearestCity(
        cities,
        position.coords.latitude,
        position.coords.longitude,
      );

      if (!nearest) {
        set({ status: 'error' });
        return;
      }

      set({
        status: 'resolved',
        cityId: nearest.city_id,
        cityName: nearest.city_name,
      });
    } catch (err) {
      if (__DEV__) console.log('[Paltuu] Failed to resolve nearest city:', err);
      set({ status: 'error' });
    }
  },
}));

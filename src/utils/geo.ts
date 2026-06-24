export interface CityCoord {
  city_id: number;
  city_name: string;
  latitude: number | string | null;
  longitude: number | string | null;
}

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Finds the closest city in our own `cities` table to a GPS position —
// pets/listings are stored by city_id, not raw coordinates, so a generic
// reverse-geocoder's city name wouldn't reliably match our rows.
export function findNearestCity<T extends CityCoord>(
  cities: T[],
  lat: number,
  lng: number,
): T | null {
  let nearest: T | null = null;
  let nearestDistance = Infinity;

  for (const city of cities) {
    if (city.latitude == null || city.longitude == null) continue;
    const cityLat = Number(city.latitude);
    const cityLng = Number(city.longitude);
    if (Number.isNaN(cityLat) || Number.isNaN(cityLng)) continue;

    const distance = haversineDistanceKm(lat, lng, cityLat, cityLng);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = city;
    }
  }

  return nearest;
}

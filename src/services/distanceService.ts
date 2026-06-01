const ROAD_FACTOR = 1.35;
const AVG_SPEED_KMH = 40;

// Pricing tiers by load weight
// Rates account for SA diesel (~R22/L), return trip, wear, and driver margin
export type LoadWeight = 'light' | 'medium' | 'heavy';

const PRICING: Record<LoadWeight, { base: number; low: number; high: number }> = {
  light:  { base: 150, low: 12, high: 18 }, // boxes, small furniture (< 500kg)
  medium: { base: 250, low: 16, high: 24 }, // 1-bedroom load (500kg – 1.5t)
  heavy:  { base: 400, low: 22, high: 32 }, // 2–3 bedroom / bulky items (> 1.5t)
};

export interface RouteInfo {
  distanceKm: number;
  durationMin: number;
  suggestedMin: number;
  suggestedMax: number;
}

function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export const getRouteDistance = async (
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  weight: LoadWeight = 'medium',
): Promise<RouteInfo | null> => {
  try {
    const straightKm = haversineKm(origin, destination);
    const distanceKm = Math.round(straightKm * ROAD_FACTOR * 10) / 10;
    const durationMin = Math.round((distanceKm / AVG_SPEED_KMH) * 60);
    const { base, low, high } = PRICING[weight];
    const suggestedMin = Math.round(base + distanceKm * low);
    const suggestedMax = Math.round(base + distanceKm * high);
    return { distanceKm, durationMin, suggestedMin, suggestedMax };
  } catch {
    return null;
  }
};

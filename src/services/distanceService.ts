// SA bakkie pricing formula
const BASE_FARE = 80;
const RATE_LOW = 8;
const RATE_HIGH = 12;
const ROAD_FACTOR = 1.35; // straight-line to road-distance multiplier
const AVG_SPEED_KMH = 40; // urban average

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
): Promise<RouteInfo | null> => {
  try {
    const straightKm = haversineKm(origin, destination);
    const distanceKm = Math.round(straightKm * ROAD_FACTOR * 10) / 10;
    const durationMin = Math.round((distanceKm / AVG_SPEED_KMH) * 60);
    const suggestedMin = Math.round(BASE_FARE + distanceKm * RATE_LOW);
    const suggestedMax = Math.round(BASE_FARE + distanceKm * RATE_HIGH);
    return { distanceKm, durationMin, suggestedMin, suggestedMax };
  } catch {
    return null;
  }
};

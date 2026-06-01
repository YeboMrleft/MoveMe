import Constants from 'expo-constants';

const API_KEY: string = (Constants.expoConfig?.extra as any)?.googleMapsKey ?? '';

// SA bakkie pricing formula
const BASE_FARE = 80;   // rands
const RATE_LOW = 8;     // R per km  (competitive)
const RATE_HIGH = 12;   // R per km  (fair market)

export interface RouteInfo {
  distanceKm: number;
  durationMin: number;
  suggestedMin: number;
  suggestedMax: number;
}

export const getRouteDistance = async (
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): Promise<RouteInfo | null> => {
  if (!API_KEY) return null;
  try {
    const url =
      `https://maps.googleapis.com/maps/api/distancematrix/json` +
      `?origins=${origin.latitude},${origin.longitude}` +
      `&destinations=${destination.latitude},${destination.longitude}` +
      `&key=${API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    const element = data?.rows?.[0]?.elements?.[0];
    if (element?.status !== 'OK') return null;

    const distanceKm = Math.round((element.distance.value / 1000) * 10) / 10;
    const durationMin = Math.round(element.duration.value / 60);
    const suggestedMin = Math.round(BASE_FARE + distanceKm * RATE_LOW);
    const suggestedMax = Math.round(BASE_FARE + distanceKm * RATE_HIGH);

    return { distanceKm, durationMin, suggestedMin, suggestedMax };
  } catch {
    return null;
  }
};

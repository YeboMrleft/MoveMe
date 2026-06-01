export type DriverTier = 'bronze' | 'silver' | 'gold' | 'elite';

export interface TierInfo {
  tier: DriverTier;
  label: string;
  color: string;
  minTrips: number;
  minRating: number;
}

export const TIER_DEFS: TierInfo[] = [
  { tier: 'elite',  label: 'Elite',  color: '#7C3AED', minTrips: 200, minRating: 4.5 },
  { tier: 'gold',   label: 'Gold',   color: '#D97706', minTrips: 50,  minRating: 4.3 },
  { tier: 'silver', label: 'Silver', color: '#6B7280', minTrips: 10,  minRating: 4.0 },
  { tier: 'bronze', label: 'Bronze', color: '#B45309', minTrips: 0,   minRating: 0   },
];

export const getDriverTier = (totalTrips: number, rating: number): TierInfo => {
  for (const t of TIER_DEFS) {
    if (totalTrips >= t.minTrips && (totalTrips === 0 || rating >= t.minRating)) {
      return t;
    }
  }
  return TIER_DEFS[3];
};

export const getNextTier = (current: TierInfo): TierInfo | null => {
  const idx = TIER_DEFS.findIndex(t => t.tier === current.tier);
  return idx > 0 ? TIER_DEFS[idx - 1] : null;
};

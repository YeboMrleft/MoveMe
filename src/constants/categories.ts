export type JobCategory =
  | 'furniture'
  | 'appliances'
  | 'building'
  | 'vehicles'
  | 'general'
  | 'other';

export const JOB_CATEGORIES: {
  key: JobCategory;
  label: string;
  icon: string;
  color: string;
}[] = [
  { key: 'furniture',  label: 'Furniture',         icon: 'bed-outline',                color: '#7C3AED' },
  { key: 'appliances', label: 'Appliances',         icon: 'tv-outline',                 color: '#0EA5E9' },
  { key: 'building',   label: 'Building Materials', icon: 'construct-outline',          color: '#D97706' },
  { key: 'vehicles',   label: 'Vehicles',           icon: 'car-outline',                color: '#059669' },
  { key: 'general',    label: 'General Goods',      icon: 'cube-outline',               color: '#6366F1' },
  { key: 'other',      label: 'Other',              icon: 'ellipsis-horizontal-outline', color: '#6B7280' },
];

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TierInfo } from '../utils/driverTier';

interface Props {
  tier: TierInfo;
  size?: 'sm' | 'md';
}

const ICONS: Record<string, string> = {
  bronze: 'ribbon-outline',
  silver: 'medal-outline',
  gold: 'trophy-outline',
  elite: 'diamond-outline',
};

export default function TierBadge({ tier, size = 'sm' }: Props) {
  const sm = size === 'sm';
  return (
    <View style={[
      styles.badge,
      { backgroundColor: tier.color + '18', borderColor: tier.color + '50' },
    ]}>
      <Ionicons name={ICONS[tier.tier] as any} size={sm ? 10 : 13} color={tier.color} />
      <Text style={[styles.label, { color: tier.color, fontSize: sm ? 10 : 12 }]}>
        {tier.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  label: { fontWeight: '700' },
});

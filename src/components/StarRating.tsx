import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

interface Props {
  value: number;
  onChange?: (val: number) => void;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  showLabel?: boolean;
  showCount?: boolean;
}

export default function StarRating({
  value,
  onChange,
  size = 'md',
  interactive = true,
  showLabel = false,
  showCount = false,
}: Props) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const sizeMap = {
    sm: 18,
    md: 24,
    lg: 32,
  };

  const iconSize = sizeMap[size];
  const displayValue = hoverValue ?? value;

  const getLabel = (val: number) => {
    const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    return labels[val] || '';
  };

  return (
    <View style={styles.container}>
      <View style={[styles.row, { gap: spacing[1] }]}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity
            key={star}
            onPress={() => {
              if (interactive && onChange) {
                onChange(star);
                setHoverValue(null);
              }
            }}
            onPressIn={() => interactive && setHoverValue(star)}
            onPressOut={() => setHoverValue(null)}
            disabled={!interactive}
            activeOpacity={interactive ? 0.7 : 1}
          >
            <Ionicons
              name={star <= displayValue ? 'star' : 'star-outline'}
              size={iconSize}
              color={star <= displayValue ? colors.accent : colors.border}
            />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.info}>
        {showLabel && (
          <Text style={styles.label}>{getLabel(displayValue)}</Text>
        )}
        {showCount && (
          <Text style={styles.count}>{displayValue.toFixed(1)}/5.0</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    alignItems: 'center',
    gap: spacing[1],
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  count: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

interface DividerProps {
  variant?: 'full' | 'inset';
  margin?: keyof typeof spacing;
  style?: ViewStyle;
}

export default function Divider({
  variant = 'full',
  margin = 4,
  style,
}: DividerProps) {
  return (
    <View
      style={[
        styles.divider,
        variant === 'inset' && styles.inset,
        { marginVertical: spacing[margin as unknown as keyof typeof spacing] },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  inset: {
    marginHorizontal: spacing[4],
  },
});

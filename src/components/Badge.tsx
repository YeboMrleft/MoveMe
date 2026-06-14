import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../constants/colors';
import { spacing, radius } from '../constants/spacing';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export default function Badge({ label, variant = 'default', size = 'md', style }: BadgeProps) {
  const variantStyles = {
    default: {
      backgroundColor: colors.primary + '15',
      color: colors.primary,
    },
    success: {
      backgroundColor: colors.success + '15',
      color: colors.success,
    },
    warning: {
      backgroundColor: colors.warning + '15',
      color: colors.warning,
    },
    error: {
      backgroundColor: colors.error + '15',
      color: colors.error,
    },
    info: {
      backgroundColor: colors.info + '15',
      color: colors.info,
    },
  };

  const sizeStyles = {
    sm: {
      paddingVertical: spacing[1],
      paddingHorizontal: spacing[2],
      fontSize: 11,
    },
    md: {
      paddingVertical: spacing[1],
      paddingHorizontal: spacing[3],
      fontSize: 12,
    },
    lg: {
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[3],
      fontSize: 13,
    },
  };

  const { backgroundColor, color } = variantStyles[variant];
  const { paddingVertical, paddingHorizontal, fontSize } = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor, paddingVertical, paddingHorizontal },
        style,
      ]}
    >
      <Text style={[styles.text, { color, fontSize }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});

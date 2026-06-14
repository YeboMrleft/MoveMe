import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { colors } from '../constants/colors';
import { spacing, shadows, radius } from '../constants/spacing';

interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: keyof typeof spacing;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

export default function Card({
  children,
  variant = 'elevated',
  padding = 4,
  onPress,
  style,
  disabled,
}: CardProps) {
  const variantStyles = {
    elevated: {
      backgroundColor: colors.surface,
      borderWidth: 0,
      shadowColor: colors.shadowMd,
      shadowOpacity: 1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    outlined: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: 'transparent',
    },
    filled: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 0,
      shadowColor: 'transparent',
    },
  };

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[
        styles.card,
        variantStyles[variant],
        { padding: spacing[padding as unknown as keyof typeof spacing] },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.6,
  },
});

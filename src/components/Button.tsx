import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../constants/colors';
import { spacing, sizes, shadows } from '../constants/spacing';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  style,
  icon,
}: Props) {
  const heightMap = {
    sm: sizes.buttonHeight.sm,
    md: sizes.buttonHeight.md,
    lg: sizes.buttonHeight.lg,
  };

  const paddingHorizontalMap = {
    sm: spacing[3],
    md: spacing[4],
    lg: spacing[6],
  };

  const fontSizeMap = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  const bgColors = {
    primary: colors.primary,
    secondary: colors.secondary,
    outline: 'transparent',
    ghost: 'transparent',
    danger: colors.error,
    success: colors.success,
  };

  const textColors = {
    primary: colors.white,
    secondary: colors.white,
    outline: colors.primary,
    ghost: colors.text,
    danger: colors.white,
    success: colors.white,
  };

  const borderColors = {
    primary: 'transparent',
    secondary: 'transparent',
    outline: colors.border,
    ghost: 'transparent',
    danger: 'transparent',
    success: 'transparent',
  };

  const bg = bgColors[variant];
  const textColor = textColors[variant];
  const borderColor = borderColors[variant];
  const height = heightMap[size];
  const paddingHorizontal = paddingHorizontalMap[size];
  const fontSize = fontSizeMap[size];

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        {
          height,
          paddingHorizontal,
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === 'outline' ? 1.5 : 0,
        },
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.label, { color: textColor, fontSize }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: spacing[2] + 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowMd,
    shadowOpacity: 1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.6,
  },
});

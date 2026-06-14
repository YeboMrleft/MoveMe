import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { colors } from '../constants/colors';
import { spacing, sizes, radius, shadows } from '../constants/spacing';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  prefix?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'outlined' | 'filled';
}

export default function Input({
  label,
  error,
  prefix,
  style,
  size = 'md',
  variant = 'outlined',
  ...props
}: Props) {
  const [focused, setFocused] = useState(false);

  const heightMap = {
    sm: 36,
    md: 44,
    lg: 52,
  };

  const fontSize = {
    sm: 14,
    md: 16,
    lg: 18,
  }[size];

  const height = heightMap[size];
  const paddingHorizontal = spacing[3];

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, error && styles.labelError]}>{label}</Text>
      )}
      <View
        style={[
          styles.row,
          { height, paddingHorizontal },
          variant === 'outlined' && (
            error
              ? styles.outlinedError
              : focused
              ? styles.outlinedFocused
              : styles.outlinedNormal
          ),
          variant === 'filled' && (
            error ? styles.filledError : focused ? styles.filledFocused : styles.filledNormal
          ),
          style,
        ]}
      >
        {prefix && <Text style={[styles.prefix, { fontSize }]}>{prefix}</Text>}
        <TextInput
          style={[styles.input, { fontSize }]}
          placeholderTextColor={colors.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing[4] },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing[2],
    letterSpacing: 0.3,
  },
  labelError: {
    color: colors.error,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing[3],
  },

  // Outlined variant styles
  outlinedNormal: {
    borderColor: colors.border,
  },
  outlinedFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
    paddingHorizontal: spacing[3] - 0.5,
    shadowColor: colors.shadowSm,
    shadowOpacity: 1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  outlinedError: {
    borderColor: colors.error,
    borderWidth: 1.5,
  },

  // Filled variant styles
  filledNormal: {
    backgroundColor: colors.surfaceAlt,
    borderColor: 'transparent',
  },
  filledFocused: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 1.5,
    shadowColor: colors.shadowSm,
    shadowOpacity: 1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  filledError: {
    backgroundColor: colors.error + '08',
    borderColor: colors.error,
    borderWidth: 1.5,
  },

  prefix: {
    fontWeight: '700',
    color: colors.primary,
    marginRight: spacing[2],
  },
  input: {
    flex: 1,
    color: colors.text,
  },
  error: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.error,
    marginTop: spacing[1],
    marginLeft: spacing[1],
  },
});

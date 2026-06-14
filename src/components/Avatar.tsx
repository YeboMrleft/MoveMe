import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { shadows } from '../constants/spacing';

interface Props {
  uri?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'circle' | 'rounded';
  status?: 'online' | 'offline' | 'away';
  showBorder?: boolean;
  showBadge?: boolean;
}

export default function Avatar({
  uri,
  name,
  size = 'md',
  variant = 'circle',
  status,
  showBorder = false,
  showBadge = false,
}: Props) {
  const sizeMap = {
    sm: 32,
    md: 44,
    lg: 56,
    xl: 72,
  };

  const sizePixels = sizeMap[size];

  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const borderRadius = variant === 'circle' ? sizePixels / 2 : 12;

  const statusColors = {
    online: colors.success,
    offline: colors.textMuted,
    away: colors.warning,
  };

  const statusSize = {
    sm: 8,
    md: 10,
    lg: 12,
    xl: 14,
  }[size];

  return (
    <View style={styles.container}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.img,
            {
              width: sizePixels,
              height: sizePixels,
              borderRadius,
            },
            showBorder && styles.imageBorder,
          ]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: sizePixels,
              height: sizePixels,
              borderRadius,
            },
            showBorder && styles.placeholderBorder,
          ]}
        >
          <Text style={[styles.initials, { fontSize: sizePixels * 0.35 }]}>{initials}</Text>
        </View>
      )}

      {status && showBadge && (
        <View
          style={[
            styles.statusBadge,
            {
              width: statusSize,
              height: statusSize,
              borderRadius: statusSize / 2,
              backgroundColor: statusColors[status],
              bottom: -2,
              right: -2,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  img: {
    backgroundColor: colors.borderLight,
    shadowColor: colors.shadowSm,
    shadowOpacity: 1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  imageBorder: {
    borderWidth: 3,
    borderColor: colors.surface,
  },
  placeholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowSm,
    shadowOpacity: 1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  placeholderBorder: {
    borderWidth: 3,
    borderColor: colors.surface,
  },
  initials: {
    color: colors.white,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statusBadge: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.surface,
  },
});

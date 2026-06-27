import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing, shadows, radius } from '../constants/spacing';

interface HeaderProps {
  title: string;
  subtitle?: string;
  variant?: 'default' | 'large';
  rightAction?: {
    icon: any;
    onPress: () => void;
    label?: string;
  };
  leftAction?: {
    icon?: any;
    onPress?: () => void;
    label?: string;
  };
  style?: ViewStyle;
}

export default function Header({
  title,
  subtitle,
  variant = 'default',
  rightAction,
  leftAction,
  style,
}: HeaderProps) {
  const isLarge = variant === 'large';

  return (
    <View
      style={[
        styles.header,
        isLarge && styles.headerLarge,
        style,
      ]}
    >
      <View style={styles.content}>
        {leftAction && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={leftAction.onPress}
            disabled={!leftAction.onPress}
          >
            <Ionicons
              name={leftAction.icon || 'chevron-back'}
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
        )}

        <View style={styles.titleContainer}>
          <Text
            style={[
              styles.title,
              isLarge && styles.titleLarge,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {rightAction && (
          <TouchableOpacity
            style={[styles.actionButton, styles.rightAction]}
            onPress={rightAction.onPress}
          >
            <Ionicons
              name={rightAction.icon}
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    shadowColor: colors.shadowSm,
    shadowOpacity: 1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  headerLarge: {
    paddingVertical: spacing[6],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  titleLarge: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: spacing[1],
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '08',
  },
  rightAction: {
    marginLeft: 'auto',
  },
});

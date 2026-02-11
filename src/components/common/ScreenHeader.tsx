/**
 * ScreenHeader Component
 * Consistent header for all screens with back navigation
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, accessibility } from '../../styles';

export interface ScreenHeaderProps {
  /** Screen title */
  title: string;
  /** Back button handler - if not provided, no back button shown */
  onBack?: () => void;
  /** Right side action button */
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    accessibilityLabel: string;
  };
  /** Subtitle text */
  subtitle?: string;
  /** Whether to show a border at the bottom */
  showBorder?: boolean;
  /** Test ID */
  testID?: string;
}

/**
 * Standard screen header with back navigation and optional actions.
 *
 * @example
 * // Basic header with back
 * <ScreenHeader title="Roster" onBack={() => navigation.goBack()} />
 *
 * @example
 * // Header with right action
 * <ScreenHeader
 *   title="Draft Room"
 *   subtitle="Round 1 - Pick 12"
 *   rightAction={{
 *     icon: "settings",
 *     onPress: openSettings,
 *     accessibilityLabel: "Draft settings"
 *   }}
 * />
 */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  onBack,
  rightAction,
  subtitle,
  showBorder = true,
  testID,
}) => {
  return (
    <View style={[styles.container, showBorder && styles.withBorder]} testID={testID}>
      {/* Left section - Back button or spacer */}
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          accessibilityHint="Returns to the previous screen"
          hitSlop={accessibility.hitSlop}
        >
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}

      {/* Center section - Title and subtitle */}
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right section - Action button or spacer */}
      {rightAction ? (
        <TouchableOpacity
          onPress={rightAction.onPress}
          style={styles.rightButton}
          accessibilityLabel={rightAction.accessibilityLabel}
          accessibilityRole="button"
          hitSlop={accessibility.hitSlop}
        >
          <Ionicons name={rightAction.icon} size={24} color={colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
  },
  withBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: accessibility.minTouchTarget,
    height: accessibility.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightButton: {
    width: accessibility.minTouchTarget,
    height: accessibility.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: accessibility.minTouchTarget,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxs,
  },
});

export default ScreenHeader;

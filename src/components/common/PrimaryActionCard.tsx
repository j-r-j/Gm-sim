/**
 * PrimaryActionCard Component
 * The single, prominent call-to-action on the dashboard
 *
 * This component ensures users always know what to do next.
 * Design principle: ONE primary action at a time.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  accessibility,
} from '../../styles';

export type ActionType = 'primary' | 'success' | 'warning' | 'info';

export interface PrimaryActionCardProps {
  /** Main action label (e.g., "Play Week 5") */
  actionLabel: string;
  /** Contextual description (e.g., "vs. Dallas Cowboys") */
  description: string;
  /** Optional secondary info (e.g., "Sunday 4:25 PM") */
  secondaryInfo?: string;
  /** Press handler */
  onPress: () => void;
  /** Action type determines color scheme */
  actionType?: ActionType;
  /** Loading state */
  loading?: boolean;
  /** Disabled state with reason */
  disabled?: boolean;
  /** Reason why action is disabled */
  disabledReason?: string;
  /** Icon name from Ionicons */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Test ID */
  testID?: string;
}

/**
 * Primary action card for the dashboard.
 * This should be the most prominent element - the ONE thing users need to do.
 *
 * @example
 * // Play week action
 * <PrimaryActionCard
 *   actionLabel="Play Week 5"
 *   description="vs. Dallas Cowboys"
 *   secondaryInfo="Sunday 4:25 PM"
 *   onPress={handlePlayWeek}
 *   icon="american-football"
 * />
 *
 * @example
 * // Offseason action
 * <PrimaryActionCard
 *   actionLabel="Enter Draft Room"
 *   description="Round 1 - Pick 12"
 *   actionType="success"
 *   onPress={handleEnterDraft}
 *   icon="trophy"
 * />
 */
export const PrimaryActionCard: React.FC<PrimaryActionCardProps> = ({
  actionLabel,
  description,
  secondaryInfo,
  onPress,
  actionType = 'primary',
  loading = false,
  disabled = false,
  disabledReason,
  icon = 'play-circle',
  testID,
}) => {
  const isDisabled = disabled || loading;

  const actionColors = {
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    info: colors.info,
  };

  const backgroundColor = actionColors[actionType];

  return (
    <TouchableOpacity
      style={[styles.container, isDisabled && styles.containerDisabled]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      accessibilityLabel={`${actionLabel}. ${description}`}
      accessibilityHint={disabledReason || `Tap to ${actionLabel.toLowerCase()}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      hitSlop={accessibility.hitSlop}
      testID={testID}
    >
      {/* Header with icon */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor }]}>
          <Ionicons name={icon} size={24} color={colors.textOnPrimary} />
        </View>
        <Text style={styles.label}>NEXT UP</Text>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <Text style={styles.actionLabel}>{actionLabel}</Text>
        <Text style={styles.description}>{description}</Text>
        {secondaryInfo && <Text style={styles.secondaryInfo}>{secondaryInfo}</Text>}
      </View>

      {/* Action button */}
      <View style={[styles.actionButton, { backgroundColor }]}>
        {loading ? (
          <ActivityIndicator color={colors.textOnPrimary} size="small" />
        ) : (
          <>
            <Ionicons name="arrow-forward" size={20} color={colors.textOnPrimary} />
            <Text style={styles.actionButtonText}>
              {disabled ? disabledReason || 'Unavailable' : 'Continue'}
            </Text>
          </>
        )}
      </View>

      {/* Disabled overlay with reason */}
      {disabled && disabledReason && (
        <View style={styles.disabledOverlay}>
          <Ionicons name="lock-closed" size={16} color={colors.textLight} />
          <Text style={styles.disabledText}>{disabledReason}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  containerDisabled: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    letterSpacing: 1,
  },
  content: {
    marginBottom: spacing.lg,
  },
  actionLabel: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  secondaryInfo: {
    fontSize: fontSize.md,
    color: colors.textLight,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: accessibility.minTouchTarget,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  disabledOverlay: {
    position: 'absolute',
    bottom: spacing.lg + accessibility.minTouchTarget + spacing.sm,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  disabledText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
});

export default PrimaryActionCard;

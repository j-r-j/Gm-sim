/**
 * CompletionGate Component
 * Visual indicator showing whether a task/gate is locked, ready, or complete
 * Used to enforce the completion gates in the week flow
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../styles';

export type GateStatus = 'locked' | 'ready' | 'completed';

export interface CompletionGateProps {
  /** The gate's display title */
  title: string;
  /** Description of what's needed */
  description: string;
  /** Current status of the gate */
  status: GateStatus;
  /** Icon/emoji to display */
  icon?: string;
  /** Callback when tapped (if ready) */
  onPress?: () => void;
  /** Why the gate is locked (if locked) */
  lockedReason?: string;
}

/**
 * Get styling based on gate status
 */
function getStatusStyles(status: GateStatus): {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  iconBg: string;
} {
  switch (status) {
    case 'locked':
      return {
        backgroundColor: colors.surfaceLight,
        borderColor: colors.border,
        textColor: colors.textSecondary,
        iconBg: colors.border,
      };
    case 'ready':
      return {
        backgroundColor: colors.primary + '10',
        borderColor: colors.primary,
        textColor: colors.primary,
        iconBg: colors.primary,
      };
    case 'completed':
      return {
        backgroundColor: colors.success + '10',
        borderColor: colors.success,
        textColor: colors.success,
        iconBg: colors.success,
      };
  }
}

/**
 * Get icon based on status
 */
function getStatusIcon(status: GateStatus, customIcon?: string): string {
  if (customIcon && status !== 'completed') return customIcon;

  switch (status) {
    case 'locked':
      return '🔒';
    case 'ready':
      return customIcon || '▶️';
    case 'completed':
      return '✓';
  }
}

export function CompletionGate({
  title,
  description,
  status,
  icon,
  onPress,
  lockedReason,
}: CompletionGateProps): React.JSX.Element {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const statusStyles = getStatusStyles(status);
  const displayIcon = getStatusIcon(status, icon);

  // Pulse animation for ready state
  useEffect(() => {
    if (status === 'ready') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  const content = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: statusStyles.backgroundColor,
          borderColor: statusStyles.borderColor,
        },
      ]}
    >
      {/* Icon */}
      <Animated.View
        style={[
          styles.iconContainer,
          { backgroundColor: statusStyles.iconBg },
          status === 'ready' && { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Text style={styles.icon}>{displayIcon}</Text>
      </Animated.View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: statusStyles.textColor }]}>{title}</Text>
        <Text style={styles.description}>
          {status === 'locked' && lockedReason ? lockedReason : description}
        </Text>
      </View>

      {/* Status indicator */}
      <View style={styles.statusContainer}>
        {status === 'completed' && (
          <View style={[styles.statusBadge, styles.completedBadge]}>
            <Text style={styles.statusBadgeText}>DONE</Text>
          </View>
        )}
        {status === 'ready' && (
          <View style={[styles.statusBadge, styles.readyBadge]}>
            <Text style={styles.statusBadgeText}>READY</Text>
          </View>
        )}
        {status === 'locked' && (
          <View style={[styles.statusBadge, styles.lockedBadge]}>
            <Text style={[styles.statusBadgeText, styles.lockedBadgeText]}>LOCKED</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (status === 'ready' && onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

/**
 * Compact inline gate indicator
 */
export function GateIndicator({
  status,
  label,
}: {
  status: GateStatus;
  label: string;
}): React.JSX.Element {
  const statusStyles = getStatusStyles(status);

  return (
    <View style={[styles.indicator, { borderColor: statusStyles.borderColor }]}>
      <View style={[styles.indicatorDot, { backgroundColor: statusStyles.borderColor }]} />
      <Text style={[styles.indicatorLabel, { color: statusStyles.textColor }]}>{label}</Text>
      {status === 'completed' && <Text style={styles.indicatorCheck}>✓</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    marginVertical: spacing.xs,
    ...shadows.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 20,
    color: colors.textOnPrimary,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  statusContainer: {
    marginLeft: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  completedBadge: {
    backgroundColor: colors.success,
  },
  readyBadge: {
    backgroundColor: colors.primary,
  },
  lockedBadge: {
    backgroundColor: colors.border,
  },
  statusBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  lockedBadgeText: {
    color: colors.textSecondary,
  },
  // Inline indicator styles
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  indicatorLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  indicatorCheck: {
    fontSize: fontSize.xs,
    color: colors.success,
  },
});

export default CompletionGate;

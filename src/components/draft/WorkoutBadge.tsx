/**
 * WorkoutBadge Component
 * A small pill badge indicating workout data source (combine, pro day, both).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../styles';

export interface WorkoutBadgeProps {
  source: 'combine' | 'pro_day' | 'both' | 'none';
}

const BADGE_CONFIG: Record<
  Exclude<WorkoutBadgeProps['source'], 'none'>,
  { label: string; backgroundColor: string }
> = {
  combine: { label: 'COMBINE', backgroundColor: colors.info },
  pro_day: { label: 'PRO DAY', backgroundColor: colors.secondary },
  both: { label: 'BOTH', backgroundColor: colors.success },
};

export function WorkoutBadge({ source }: WorkoutBadgeProps): React.JSX.Element | null {
  if (source === 'none') return null;

  const config = BADGE_CONFIG[source];

  return (
    <View
      style={[styles.badge, { backgroundColor: config.backgroundColor }]}
      accessibilityLabel={`Workout data: ${config.label}`}
      accessibilityRole="text"
    >
      <Text style={styles.badgeText}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
});

export default WorkoutBadge;

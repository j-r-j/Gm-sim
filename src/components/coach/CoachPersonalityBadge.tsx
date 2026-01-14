/**
 * CoachPersonalityBadge
 * Displays coach personality type with description
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../styles';
import {
  PersonalityType,
  getPersonalityDescription,
} from '../../core/models/staff/CoachPersonality';

interface CoachPersonalityBadgeProps {
  primary: PersonalityType;
  secondary?: PersonalityType | null;
  showDescription?: boolean;
}

/**
 * Get display name for personality type
 */
function getPersonalityDisplayName(type: PersonalityType): string {
  const names: Record<PersonalityType, string> = {
    analytical: 'Analytical',
    aggressive: 'Aggressive',
    conservative: 'Conservative',
    innovative: 'Innovative',
    oldSchool: 'Old School',
    playersCoach: "Players' Coach",
  };
  return names[type];
}

/**
 * Get color for personality type
 */
function getPersonalityColor(type: PersonalityType): string {
  const colorMap: Record<PersonalityType, string> = {
    analytical: '#3B82F6', // blue
    aggressive: '#EF4444', // red
    conservative: '#6B7280', // gray
    innovative: '#8B5CF6', // purple
    oldSchool: '#92400E', // brown
    playersCoach: '#22C55E', // green
  };
  return colorMap[type];
}

export function CoachPersonalityBadge({
  primary,
  secondary,
  showDescription = true,
}: CoachPersonalityBadgeProps): React.JSX.Element {
  const primaryColor = getPersonalityColor(primary);

  return (
    <View style={styles.container}>
      <View style={styles.badgeRow}>
        <View
          style={[
            styles.badge,
            { backgroundColor: primaryColor + '20', borderColor: primaryColor },
          ]}
        >
          <Text style={[styles.badgeText, { color: primaryColor }]}>
            {getPersonalityDisplayName(primary)}
          </Text>
        </View>
        {secondary && (
          <View
            style={[
              styles.badge,
              styles.secondaryBadge,
              { backgroundColor: getPersonalityColor(secondary) + '15' },
            ]}
          >
            <Text style={[styles.secondaryText, { color: getPersonalityColor(secondary) }]}>
              {getPersonalityDisplayName(secondary)}
            </Text>
          </View>
        )}
      </View>
      {showDescription && (
        <Text style={styles.description}>{getPersonalityDescription(primary)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  secondaryBadge: {
    borderWidth: 0,
  },
  badgeText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  secondaryText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default CoachPersonalityBadge;

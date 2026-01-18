/**
 * DevelopmentOutlookDisplay Component
 * Shows coach influence on player development in a qualitative way.
 * Displays development potential and coach relationship without revealing exact values.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../styles';
import { Player } from '../../core/models/player/Player';
import { Coach } from '../../core/models/staff/Coach';
import { FitLevel } from '../../core/models/player/SchemeFit';
import {
  calculateDevelopmentImpact,
  calculatePlayerCoachChemistry,
  createDevelopmentImpactViewModel,
  DevelopmentImpactViewModel,
} from '../../core/coaching/CoachEvaluationSystem';

export interface DevelopmentOutlookDisplayProps {
  player: Player;
  coach: Coach;
  schemeFitLevel?: FitLevel;
  yearsTogether?: number;
  compact?: boolean;
}

/**
 * Get color for relationship quality
 */
function getRelationshipColor(relationship: DevelopmentImpactViewModel['relationship']): string {
  switch (relationship) {
    case 'excellent':
      return colors.success;
    case 'good':
      return colors.successLight || '#4ade80';
    case 'neutral':
      return colors.textSecondary;
    case 'strained':
      return colors.warning;
    case 'poor':
      return colors.error;
    default:
      return colors.textSecondary;
  }
}

/**
 * Get emoji for relationship quality
 */
function getRelationshipEmoji(relationship: DevelopmentImpactViewModel['relationship']): string {
  switch (relationship) {
    case 'excellent':
      return '🌟';
    case 'good':
      return '👍';
    case 'neutral':
      return '➖';
    case 'strained':
      return '⚠️';
    case 'poor':
      return '❌';
    default:
      return '➖';
  }
}

export function DevelopmentOutlookDisplay({
  player,
  coach,
  schemeFitLevel = 'neutral',
  yearsTogether = 1,
  compact = false,
}: DevelopmentOutlookDisplayProps): React.JSX.Element {
  // Calculate chemistry
  const chemistry = calculatePlayerCoachChemistry(
    coach,
    player,
    schemeFitLevel,
    yearsTogether,
    false
  );

  // Calculate development impact
  const impact = calculateDevelopmentImpact(coach, player, chemistry.chemistry, schemeFitLevel);

  // Get view model for display
  const viewModel = createDevelopmentImpactViewModel(
    impact,
    `${player.firstName} ${player.lastName}`,
    `${coach.firstName} ${coach.lastName}`
  );

  const relationshipColor = getRelationshipColor(viewModel.relationship);
  const relationshipEmoji = getRelationshipEmoji(viewModel.relationship);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactLabel}>Development</Text>
        <View style={styles.compactValueRow}>
          <Text style={styles.compactEmoji}>{relationshipEmoji}</Text>
          <Text style={[styles.compactValue, { color: relationshipColor }]}>
            {viewModel.impactDescription}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Development Outlook</Text>

      {/* Coach Relationship */}
      <View style={styles.row}>
        <Text style={styles.label}>Coach Relationship</Text>
        <View style={styles.valueRow}>
          <Text style={styles.emoji}>{relationshipEmoji}</Text>
          <Text style={[styles.value, { color: relationshipColor }]}>
            {viewModel.relationship.charAt(0).toUpperCase() + viewModel.relationship.slice(1)}
          </Text>
        </View>
      </View>

      {/* Development Potential */}
      <View style={styles.row}>
        <Text style={styles.label}>Potential</Text>
        <Text style={styles.valueText}>{viewModel.impactDescription}</Text>
      </View>

      {/* Outlook */}
      <View style={styles.outlookBox}>
        <Text style={styles.outlookText}>{viewModel.developmentOutlook}</Text>
      </View>

      {/* Skill Focus Areas */}
      {impact.impactAreas.length > 0 && (
        <View style={styles.areasContainer}>
          <Text style={styles.areasLabel}>Focus Areas:</Text>
          <View style={styles.areasRow}>
            {impact.impactAreas.slice(0, 3).map((area) => (
              <View key={area} style={styles.areaBadge}>
                <Text style={styles.areaBadgeText}>{area.replace(/([A-Z])/g, ' $1').trim()}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  value: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  valueText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  emoji: {
    fontSize: fontSize.md,
  },
  outlookBox: {
    backgroundColor: colors.backgroundTertiary || colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  outlookText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  areasContainer: {
    marginTop: spacing.sm,
  },
  areasLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  areasRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  areaBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
  },
  areaBadgeText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    textTransform: 'capitalize',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  compactLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  compactValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  compactEmoji: {
    fontSize: fontSize.sm,
  },
  compactValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});

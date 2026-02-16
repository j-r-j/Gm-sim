/**
 * ProspectCard Component
 * A rich expandable prospect card for the Big Board.
 * Collapsed: single row with key info. Expanded: full detail view.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  accessibility,
} from '../../styles';
import { Position } from '../../core/models/player/Position';
import { WorkoutBadge } from './WorkoutBadge';
import { StockArrow } from './StockArrow';

export interface ProspectCardProps {
  prospectId: string;
  prospectName: string;
  position: Position;
  collegeName: string;
  age: number;
  rank: number;

  // Enriched data
  workoutSource: 'combine' | 'pro_day' | 'both' | 'none';
  fortyYardDash: number | null;
  combineGrade: string | null;
  collegeStatLine: string | null;
  stockDirection: 'up' | 'down' | 'steady';
  awards: string[];
  tier: string | null;
  projectedRound: string;
  confidence: string;
  overallRange: string;
  userTier: string | null;

  // Callbacks
  onPress?: () => void;
  onToggleLock?: () => void;
}

export function ProspectCard({
  prospectName,
  position,
  collegeName,
  age,
  rank,
  workoutSource,
  fortyYardDash,
  combineGrade,
  collegeStatLine,
  stockDirection,
  awards,
  tier,
  projectedRound,
  confidence,
  overallRange,
  userTier,
  onPress,
  onToggleLock,
}: ProspectCardProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  const handlePress = () => {
    setExpanded((prev) => !prev);
    onPress?.();
  };

  const keyStat = fortyYardDash ? `${fortyYardDash.toFixed(2)}s` : collegeStatLine;

  return (
    <TouchableOpacity
      style={[styles.container, expanded && styles.containerExpanded]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={`Rank ${rank}, ${prospectName}, ${position}, ${collegeName}, age ${age}, projected ${projectedRound}${tier ? `, tier ${tier}` : ''}${expanded ? ', expanded' : ', tap to expand'}`}
      accessibilityRole="button"
      accessibilityHint={expanded ? 'Tap to collapse' : 'Tap to expand details'}
      accessibilityState={{ expanded }}
      hitSlop={accessibility.hitSlop}
    >
      {/* Collapsed Row */}
      <View style={styles.collapsedRow}>
        {/* Rank + Stock */}
        <View style={styles.rankContainer}>
          <Text style={styles.rank}>#{rank}</Text>
          <StockArrow direction={stockDirection} size={12} />
        </View>

        {/* Name + Position + College */}
        <View style={styles.mainInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {prospectName}
            </Text>
            <Text style={styles.positionBadge}>{position}</Text>
          </View>
          <Text style={styles.college} numberOfLines={1}>
            {collegeName} | Age {age}
          </Text>
        </View>

        {/* Workout Badge */}
        <WorkoutBadge source={workoutSource} />

        {/* Key Stat */}
        {keyStat && (
          <Text style={styles.keyStat} numberOfLines={1} accessibilityLabel={`Key stat: ${keyStat}`}>
            {keyStat}
          </Text>
        )}

        {/* Projection */}
        <Text style={styles.projection} accessibilityLabel={`Projected ${projectedRound}`}>
          {projectedRound}
        </Text>

        {/* Tier Badge */}
        {tier && (
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{tier}</Text>
          </View>
        )}

        {/* Expand indicator */}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textLight}
        />
      </View>

      {/* Expanded Details */}
      {expanded && (
        <View style={styles.expandedSection}>
          {/* College Stats */}
          {collegeStatLine && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>College Stats</Text>
              <Text style={styles.detailValue}>{collegeStatLine}</Text>
            </View>
          )}

          {/* Workout Numbers */}
          {fortyYardDash && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>40-Yard Dash</Text>
              <View style={styles.detailValueRow}>
                <Text style={styles.detailValue}>{fortyYardDash.toFixed(2)}s</Text>
                <WorkoutBadge source={workoutSource} />
              </View>
            </View>
          )}

          {/* Combine Grade */}
          {combineGrade && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Combine Grade</Text>
              <Text style={styles.detailValue}>{combineGrade}</Text>
            </View>
          )}

          {/* Awards */}
          {awards.length > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Awards</Text>
              <View style={styles.awardsContainer}>
                {awards.map((award, idx) => (
                  <View key={idx} style={styles.awardBadge}>
                    <Text style={styles.awardText}>{award}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Confidence + Overall Range */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Confidence</Text>
            <Text style={styles.detailValue}>{confidence}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Overall Range</Text>
            <Text style={styles.detailValue}>{overallRange}</Text>
          </View>

          {/* User Tier */}
          {userTier && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Your Tier</Text>
              <View style={styles.userTierBadge}>
                <Text style={styles.userTierText}>{userTier}</Text>
              </View>
            </View>
          )}

          {/* Lock Button */}
          {onToggleLock && (
            <TouchableOpacity
              style={styles.lockButton}
              onPress={onToggleLock}
              accessibilityLabel="Toggle draft board lock"
              accessibilityRole="button"
              hitSlop={accessibility.hitSlop}
            >
              <Ionicons name="lock-closed-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.lockButtonText}>Lock on Board</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: accessibility.minTouchTarget,
  },
  containerExpanded: {
    backgroundColor: colors.surfaceLight,
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  rankContainer: {
    alignItems: 'center',
    width: 32,
    gap: 2,
  },
  rank: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  mainInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flexShrink: 1,
  },
  positionBadge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.info,
  },
  college: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  keyStat: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'right',
  },
  projection: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.info,
    minWidth: 36,
    textAlign: 'right',
  },
  tierBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  tierText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  expandedSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    fontWeight: fontWeight.medium,
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.semibold,
    flexShrink: 1,
    textAlign: 'right',
  },
  detailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  awardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'flex-end',
    flex: 1,
    marginLeft: spacing.md,
  },
  awardBadge: {
    backgroundColor: colors.tierElite,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  awardText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  userTierBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  userTierText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  lockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    minHeight: accessibility.minTouchTarget,
  },
  lockButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
});

export default ProspectCard;

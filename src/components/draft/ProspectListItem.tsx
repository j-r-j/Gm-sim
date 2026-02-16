/**
 * ProspectListItem Component
 * A row item for displaying a prospect in the draft board list.
 *
 * BRAND GUIDELINE: No overall rating - show position rank and projection only.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, accessibility } from '../../styles';
import { Position } from '../../core/models/player/Position';
import { Avatar } from '../avatar';
import { WorkoutBadge } from './WorkoutBadge';
import { StockArrow } from './StockArrow';

export interface ProspectListItemProps {
  /** Prospect's unique ID */
  id: string;
  /** Prospect's full name */
  name: string;
  /** Position */
  position: Position;
  /** College name */
  collegeName: string;
  /** Projected draft round (1-7, 0 for undrafted) */
  projectedRound: number | null;
  /** Projected pick range */
  projectedPickRange: { min: number; max: number } | null;
  /** User's custom tier */
  userTier: string | null;
  /** Whether prospect is flagged by user */
  flagged: boolean;
  /** Position rank (e.g., #3 QB) */
  positionRank: number | null;
  /** Overall rank */
  overallRank: number | null;
  /** Whether this item is selected */
  isSelected?: boolean;
  /** Callback when item is pressed */
  onPress?: () => void;
  /** Callback when item is long pressed (for comparison) */
  onLongPress?: () => void;
  /** Callback when flag is toggled */
  onToggleFlag?: () => void;
  /** Age */
  age?: number;
  /** Workout data source */
  workoutSource?: 'combine' | 'pro_day' | 'both' | 'none';
  /** 40-yard dash time */
  fortyYardDash?: number | null;
  /** College stat summary line */
  collegeStatLine?: string | null;
  /** Combine grade */
  combineGrade?: string | null;
  /** Stock direction */
  stockDirection?: 'up' | 'down' | 'steady';
  /** Awards */
  awards?: string[];
}

/**
 * Format projection as readable string
 */
function formatProjection(
  round: number | null,
  pickRange: { min: number; max: number } | null
): string {
  if (round === null || round === 0) return 'UDFA';
  if (!pickRange) return `Rd ${round}`;
  if (pickRange.min === pickRange.max) return `#${pickRange.min}`;
  return `#${pickRange.min}-${pickRange.max}`;
}

/**
 * Get round color
 */
function getRoundColor(round: number | null): string {
  if (round === null || round === 0) return colors.textLight;
  if (round === 1) return colors.success;
  if (round <= 3) return colors.info;
  return colors.textSecondary;
}

/**
 * ProspectListItem Component
 */
export function ProspectListItem({
  id,
  name,
  position,
  collegeName,
  projectedRound,
  projectedPickRange,
  userTier,
  flagged,
  positionRank,
  overallRank,
  isSelected = false,
  onPress,
  onLongPress,
  onToggleFlag,
  age: _age,
  workoutSource,
  fortyYardDash,
  collegeStatLine,
  combineGrade: _combineGrade,
  stockDirection,
  awards: _awards,
}: ProspectListItemProps): React.JSX.Element {
  const roundColor = getRoundColor(projectedRound);
  const projection = formatProjection(projectedRound, projectedPickRange);

  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.containerSelected]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      accessibilityLabel={`${overallRank ? `#${overallRank} ` : ''}${name}, ${position}, ${collegeName}, Projected ${projection}${flagged ? ', Flagged' : ''}${isSelected ? ', Selected' : ''}`}
      accessibilityRole="button"
      accessibilityHint="Tap for details, long press to compare"
      accessibilityState={{ selected: isSelected }}
      hitSlop={accessibility.hitSlop}
    >
      {/* Avatar */}
      <Avatar id={id} size="xs" context="prospect" accentColor={colors.info} />

      {/* Rank Column */}
      <View style={styles.rankColumn}>
        <View style={styles.rankRow}>
          {overallRank !== null && <Text style={styles.overallRank}>#{overallRank}</Text>}
          {stockDirection && <StockArrow direction={stockDirection} size={12} />}
        </View>
        {positionRank !== null && (
          <Text style={styles.positionRank}>
            {position} #{positionRank}
          </Text>
        )}
      </View>

      {/* Main Info */}
      <View style={styles.mainInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {flagged && (
            <TouchableOpacity
              onPress={onToggleFlag}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.flagIcon}>*</Text>
            </TouchableOpacity>
          )}
          {!flagged && onToggleFlag && (
            <TouchableOpacity
              onPress={onToggleFlag}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.flagIconInactive}>*</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.college} numberOfLines={1}>
          {collegeName}
        </Text>
        {(workoutSource && workoutSource !== 'none' || fortyYardDash || collegeStatLine) && (
          <View style={styles.enrichedRow}>
            {workoutSource && workoutSource !== 'none' && (
              <WorkoutBadge source={workoutSource} />
            )}
            {fortyYardDash != null && (
              <Text style={styles.enrichedStat}>{fortyYardDash.toFixed(2)}s</Text>
            )}
            {collegeStatLine && (
              <Text style={styles.enrichedStat} numberOfLines={1}>{collegeStatLine}</Text>
            )}
          </View>
        )}
      </View>

      {/* User Tier */}
      {userTier && (
        <View style={styles.tierBadge}>
          <Text style={styles.tierText}>{userTier}</Text>
        </View>
      )}

      {/* Projection */}
      <View style={styles.projectionColumn}>
        <Text style={[styles.projectionText, { color: roundColor }]}>
          {formatProjection(projectedRound, projectedPickRange)}
        </Text>
        {projectedRound !== null && projectedRound > 0 && (
          <Text style={styles.roundLabel}>Rd {projectedRound}</Text>
        )}
      </View>

      {/* Selection indicator */}
      {isSelected && <View style={styles.selectionIndicator} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  containerSelected: {
    backgroundColor: colors.primaryLight + '20',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  rankColumn: {
    width: 50,
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  overallRank: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  positionRank: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  mainInfo: {
    flex: 1,
    marginLeft: spacing.sm,
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
    flex: 1,
  },
  flagIcon: {
    fontSize: fontSize.lg,
    color: colors.secondary,
    fontWeight: fontWeight.bold,
  },
  flagIconInactive: {
    fontSize: fontSize.lg,
    color: colors.border,
    fontWeight: fontWeight.bold,
  },
  college: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  enrichedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  enrichedStat: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    fontVariant: ['tabular-nums'],
  },
  tierBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.sm,
  },
  tierText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  projectionColumn: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  projectionText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  roundLabel: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  selectionIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary,
  },
});

export default ProspectListItem;

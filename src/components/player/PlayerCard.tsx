/**
 * PlayerCard Component
 * Compact card view of a player/prospect for lists and grids.
 *
 * BRAND GUIDELINE: No overall rating. Shows key info and skill range summary.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../styles';
import { Position } from '../../core/models/player/Position';
import { TechnicalSkills, SKILL_NAMES_BY_POSITION } from '../../core/models/player/TechnicalSkills';

export interface PlayerCardProps {
  /** Player ID */
  id: string;
  /** Player's first name */
  firstName: string;
  /** Player's last name */
  lastName: string;
  /** Player's position */
  position: Position;
  /** Player's age */
  age: number;
  /** College name (for prospects) */
  collegeName?: string;
  /** Experience in years (for NFL players) */
  experience?: number;
  /** Technical skills for range display */
  skills?: TechnicalSkills;
  /** Draft projection round (1-7) */
  projectedRound?: number;
  /** Whether player is flagged by user */
  flagged?: boolean;
  /** User's custom tier */
  userTier?: string | null;
  /** Callback when card is pressed */
  onPress?: (id: string) => void;
  /** Callback when card is long pressed (for comparison) */
  onLongPress?: (id: string) => void;
  /** Whether the card is selected */
  selected?: boolean;
}

/**
 * Get position group for color coding
 */
function getPositionGroup(position: Position): 'offense' | 'defense' | 'special' {
  const offensePositions = [
    Position.QB,
    Position.RB,
    Position.WR,
    Position.TE,
    Position.LT,
    Position.LG,
    Position.C,
    Position.RG,
    Position.RT,
  ];
  const specialPositions = [Position.K, Position.P];

  if (offensePositions.includes(position)) return 'offense';
  if (specialPositions.includes(position)) return 'special';
  return 'defense';
}

/**
 * Get position color
 */
function getPositionColor(position: Position): string {
  const group = getPositionGroup(position);
  switch (group) {
    case 'offense':
      return colors.primary;
    case 'defense':
      return colors.secondary;
    case 'special':
      return colors.info;
  }
}

/**
 * Calculate average skill range (for summary display)
 * Returns the average of all skill midpoints
 */
function getSkillRangeSummary(
  skills: TechnicalSkills,
  position: Position
): { avgMin: number; avgMax: number } {
  // Get the skill names for this position group
  const positionKey = getPositionGroupKey(position);
  const skillNames = SKILL_NAMES_BY_POSITION[positionKey];

  let totalMin = 0;
  let totalMax = 0;
  let count = 0;

  for (const skillName of skillNames) {
    const skill = skills[skillName];
    if (skill) {
      totalMin += skill.perceivedMin;
      totalMax += skill.perceivedMax;
      count++;
    }
  }

  if (count === 0) {
    return { avgMin: 50, avgMax: 70 };
  }

  return {
    avgMin: Math.round(totalMin / count),
    avgMax: Math.round(totalMax / count),
  };
}

/**
 * Map position to skill group key
 */
function getPositionGroupKey(position: Position): keyof typeof SKILL_NAMES_BY_POSITION {
  switch (position) {
    case Position.QB:
      return 'QB';
    case Position.RB:
      return 'RB';
    case Position.WR:
      return 'WR';
    case Position.TE:
      return 'TE';
    case Position.LT:
    case Position.LG:
    case Position.C:
    case Position.RG:
    case Position.RT:
      return 'OL';
    case Position.DE:
    case Position.DT:
      return 'DL';
    case Position.OLB:
    case Position.ILB:
      return 'LB';
    case Position.CB:
    case Position.FS:
    case Position.SS:
      return 'DB';
    case Position.K:
      return 'K';
    case Position.P:
      return 'P';
    default:
      return 'QB';
  }
}

/**
 * Format projected round display
 */
function formatProjectedRound(round: number): string {
  if (round === 1) return '1st';
  if (round === 2) return '2nd';
  if (round === 3) return '3rd';
  return `${round}th`;
}

/**
 * PlayerCard Component
 */
export function PlayerCard({
  id,
  firstName,
  lastName,
  position,
  age,
  collegeName,
  experience,
  skills,
  projectedRound,
  flagged = false,
  userTier,
  onPress,
  onLongPress,
  selected = false,
}: PlayerCardProps): React.JSX.Element {
  const positionColor = getPositionColor(position);
  const skillSummary = skills ? getSkillRangeSummary(skills, position) : null;

  const handlePress = () => {
    if (onPress) {
      onPress(id);
    }
  };

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress(id);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, selected && styles.containerSelected]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      {/* Flag indicator */}
      {flagged && (
        <View style={styles.flagIndicator}>
          <Text style={styles.flagIcon}>🚩</Text>
        </View>
      )}

      {/* Position badge */}
      <View style={[styles.positionBadge, { backgroundColor: positionColor }]}>
        <Text style={styles.positionText}>{position}</Text>
      </View>

      {/* Player info */}
      <View style={styles.infoContainer}>
        <Text style={styles.playerName} numberOfLines={1}>
          {firstName} {lastName}
        </Text>
        <View style={styles.detailsRow}>
          {collegeName && (
            <Text style={styles.detailText} numberOfLines={1}>
              {collegeName}
            </Text>
          )}
          {experience !== undefined && experience > 0 && (
            <Text style={styles.detailText}>
              {experience} yr{experience !== 1 ? 's' : ''} exp
            </Text>
          )}
          <Text style={styles.ageText}>Age {age}</Text>
        </View>
      </View>

      {/* Right side info */}
      <View style={styles.rightContainer}>
        {/* Skill range summary */}
        {skillSummary && (
          <View style={styles.skillSummary}>
            <Text style={styles.skillRangeText}>
              {skillSummary.avgMin}-{skillSummary.avgMax}
            </Text>
            <View style={styles.skillBar}>
              <View
                style={[
                  styles.skillBarFill,
                  {
                    left: `${skillSummary.avgMin}%`,
                    width: `${skillSummary.avgMax - skillSummary.avgMin}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Draft projection or tier */}
        {projectedRound !== undefined && (
          <View style={styles.projectionBadge}>
            <Text style={styles.projectionText}>{formatProjectedRound(projectedRound)} Rd</Text>
          </View>
        )}
        {userTier && (
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{userTier}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  containerSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.md,
  },
  flagIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    zIndex: 1,
  },
  flagIcon: {
    fontSize: fontSize.sm,
  },
  positionBadge: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  positionText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  infoContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  playerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  ageText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  rightContainer: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  skillSummary: {
    alignItems: 'flex-end',
  },
  skillRangeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    fontVariant: ['tabular-nums'],
    marginBottom: spacing.xxs,
  },
  skillBar: {
    width: 60,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  skillBarFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: colors.info,
    borderRadius: borderRadius.sm,
  },
  projectionBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  projectionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  tierBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  tierText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
});

export default PlayerCard;

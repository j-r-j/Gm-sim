/**
 * PlayerCard Component
 * Modern compact card view of a player/prospect for lists and grids.
 *
 * Design inspired by:
 * - FIFA/EA FC Ultimate Team card layouts
 * - Madden NFL MUT card designs
 * - NBA 2K MyTeam gem tier system
 *
 * BRAND GUIDELINE: No overall rating number. Shows color tier indicator and skill range.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  getRatingTierColor,
} from '../../styles';
import { Position } from '../../core/models/player/Position';
import { TechnicalSkills, SKILL_NAMES_BY_POSITION } from '../../core/models/player/TechnicalSkills';
import { Avatar } from '../avatar';

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
 * Get position color based on group
 */
function getPositionColor(position: Position): { main: string; light: string } {
  const group = getPositionGroup(position);
  switch (group) {
    case 'offense':
      return { main: colors.positionOffense, light: colors.positionOffenseLight };
    case 'defense':
      return { main: colors.positionDefense, light: colors.positionDefenseLight };
    case 'special':
      return { main: colors.positionSpecial, light: colors.positionSpecialLight };
  }
}

/**
 * Calculate average skill range (for summary display)
 * Returns the average of all skill midpoints
 */
function getSkillRangeSummary(
  skills: TechnicalSkills,
  position: Position
): { avgMin: number; avgMax: number; midpoint: number } {
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
    return { avgMin: 50, avgMax: 70, midpoint: 60 };
  }

  const avgMin = Math.round(totalMin / count);
  const avgMax = Math.round(totalMax / count);
  return {
    avgMin,
    avgMax,
    midpoint: Math.round((avgMin + avgMax) / 2),
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
 * Rating Tier Indicator - Color-coded badge showing player quality
 * Inspired by NBA 2K gem system and FIFA card tiers
 */
function RatingTierIndicator({
  rating,
  compact = false,
}: {
  rating: number;
  compact?: boolean;
}): React.JSX.Element {
  const tierInfo = getRatingTierColor(rating);

  return (
    <View
      style={[
        styles.tierIndicator,
        { backgroundColor: tierInfo.background, borderColor: tierInfo.primary },
        compact && styles.tierIndicatorCompact,
      ]}
    >
      <View style={[styles.tierDot, { backgroundColor: tierInfo.primary }]} />
      {!compact && (
        <Text style={[styles.tierText, { color: tierInfo.primary }]}>{tierInfo.tier}</Text>
      )}
    </View>
  );
}

/**
 * Skill Range Bar - Mini visualization of skill range
 */
function SkillRangeBar({
  min,
  max,
  tierColor,
}: {
  min: number;
  max: number;
  tierColor: string;
}): React.JSX.Element {
  return (
    <View style={styles.skillBarContainer}>
      <View style={styles.skillBarTrack}>
        <View
          style={[
            styles.skillBarFill,
            {
              left: `${min}%`,
              width: `${max - min}%`,
              backgroundColor: tierColor,
            },
          ]}
        />
        {/* Tick marks for reference */}
        <View style={[styles.skillBarTick, { left: '50%' }]} />
        <View style={[styles.skillBarTick, { left: '75%' }]} />
      </View>
      <Text style={styles.skillBarText}>
        {min}-{max}
      </Text>
    </View>
  );
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
  const positionColors = getPositionColor(position);
  const skillSummary = skills ? getSkillRangeSummary(skills, position) : null;
  const tierInfo = skillSummary ? getRatingTierColor(skillSummary.midpoint) : null;

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

  // Determine if this is an elite player for special styling
  const isElite = skillSummary && skillSummary.midpoint >= 90;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        selected && styles.containerSelected,
        isElite && styles.containerElite,
        tierInfo && { borderLeftColor: tierInfo.primary },
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      {/* Tier accent border */}
      <View style={[styles.tierAccent, tierInfo && { backgroundColor: tierInfo.primary }]} />

      {/* Flag indicator */}
      {flagged && (
        <View style={styles.flagIndicator}>
          <Text style={styles.flagIcon}>🚩</Text>
        </View>
      )}

      {/* Main content row */}
      <View style={styles.contentRow}>
        {/* Left: Avatar with position badge overlay */}
        <View style={styles.avatarSection}>
          <Avatar
            id={id}
            size="sm"
            age={age}
            context={collegeName ? 'prospect' : 'player'}
            accentColor={positionColors.main}
          />
          <View style={[styles.positionBadge, { backgroundColor: positionColors.main }]}>
            <Text style={styles.positionText}>{position}</Text>
          </View>
        </View>

        {/* Center: Player info */}
        <View style={styles.infoSection}>
          <Text style={styles.playerName} numberOfLines={1}>
            {firstName.charAt(0)}. {lastName}
          </Text>
          <View style={styles.detailsRow}>
            <Text style={styles.ageText}>{age} yo</Text>
            {collegeName && (
              <Text style={styles.collegeText} numberOfLines={1}>
                {collegeName}
              </Text>
            )}
            {experience !== undefined && experience > 0 && (
              <Text style={styles.expText}>
                {experience} yr{experience !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>

        {/* Right: Rating and badges */}
        <View style={styles.ratingSection}>
          {/* Tier indicator */}
          {skillSummary && <RatingTierIndicator rating={skillSummary.midpoint} />}

          {/* Skill range bar */}
          {skillSummary && tierInfo && (
            <SkillRangeBar
              min={skillSummary.avgMin}
              max={skillSummary.avgMax}
              tierColor={tierInfo.primary}
            />
          )}
        </View>
      </View>

      {/* Bottom badges row */}
      {(projectedRound !== undefined || userTier) && (
        <View style={styles.badgesRow}>
          {projectedRound !== undefined && (
            <View style={[styles.badge, styles.projectionBadge]}>
              <Text style={styles.badgeText}>{formatProjectedRound(projectedRound)} Rd</Text>
            </View>
          )}
          {userTier && (
            <View style={[styles.badge, styles.tierBadge]}>
              <Text style={styles.badgeText}>{userTier}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderLeftWidth: 4,
    borderLeftColor: colors.border,
    ...shadows.md,
  },
  containerSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderLeftWidth: 4,
  },
  containerElite: {
    backgroundColor: colors.cardHighlight,
  },
  tierAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.border,
  },
  flagIndicator: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    zIndex: 1,
  },
  flagIcon: {
    fontSize: fontSize.sm,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingLeft: spacing.lg,
  },
  avatarSection: {
    position: 'relative',
    marginRight: spacing.md,
  },
  positionBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    minWidth: 26,
    height: 18,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    ...shadows.sm,
  },
  positionText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  infoSection: {
    flex: 1,
    marginRight: spacing.md,
  },
  playerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ageText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  collegeText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    maxWidth: 100,
  },
  expText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  ratingSection: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  // Tier indicator styles
  tierIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  tierIndicatorCompact: {
    paddingHorizontal: spacing.xs,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  tierText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  // Skill bar styles
  skillBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  skillBarTrack: {
    width: 50,
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
    borderRadius: borderRadius.sm,
  },
  skillBarTick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  skillBarText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
    fontVariant: ['tabular-nums'],
    minWidth: 36,
    textAlign: 'right',
  },
  // Badge styles
  badgesRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  projectionBadge: {
    backgroundColor: colors.primaryLight,
  },
  tierBadge: {
    backgroundColor: colors.secondary,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
});

export default PlayerCard;

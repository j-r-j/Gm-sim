/**
 * TraitBadges Component
 * Displays revealed traits as colored badges and unknown traits as "???" placeholders.
 *
 * BRAND GUIDELINE: Only show revealed traits. Unknown traits appear as "???" badges.
 * Positive traits are green, negative traits are red.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../styles';
import { HiddenTraits } from '../../core/models/player/HiddenTraits';

export interface TraitBadgesProps {
  /** The hidden traits object containing revealed and unrevealed traits */
  hiddenTraits: HiddenTraits;
  /** Maximum number of unknown trait placeholders to show (default: 3) */
  maxUnknownPlaceholders?: number;
  /** Whether to show compact badges */
  compact?: boolean;
  /** Whether to show unknown placeholders */
  showUnknownPlaceholders?: boolean;
}

/**
 * Format trait name from camelCase to display format
 */
function formatTraitName(trait: string): string {
  // Handle special cases
  const specialCases: Record<string, string> = {
    clutch: 'Clutch',
    filmJunkie: 'Film Junkie',
    ironMan: 'Iron Man',
    leader: 'Leader',
    coolUnderPressure: 'Cool Under Pressure',
    motor: 'Motor',
    routeTechnician: 'Route Technician',
    brickWall: 'Brick Wall',
    schemeVersatile: 'Scheme Versatile',
    teamFirst: 'Team First',
    chokes: 'Chokes',
    lazy: 'Lazy',
    injuryProne: 'Injury Prone',
    lockerRoomCancer: 'Locker Room Cancer',
    hotHead: 'Hot Head',
    glassHands: 'Glass Hands',
    disappears: 'Disappears',
    systemDependent: 'System Dependent',
    diva: 'Diva',
  };

  return specialCases[trait] || trait.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Get icon for trait (using emoji as placeholder - would use proper icons in production)
 */
function getTraitIcon(trait: string, isPositive: boolean): string {
  if (isPositive) {
    const icons: Record<string, string> = {
      clutch: '★',
      filmJunkie: '📚',
      ironMan: '💪',
      leader: '👑',
      coolUnderPressure: '❄️',
      motor: '⚡',
      routeTechnician: '✓',
      brickWall: '🧱',
      schemeVersatile: '🔄',
      teamFirst: '🤝',
    };
    return icons[trait] || '✓';
  } else {
    const icons: Record<string, string> = {
      chokes: '😰',
      lazy: '💤',
      injuryProne: '🩹',
      lockerRoomCancer: '⚠️',
      hotHead: '🔥',
      glassHands: '🧈',
      disappears: '👻',
      systemDependent: '🔗',
      diva: '💅',
    };
    return icons[trait] || '✗';
  }
}

/**
 * Individual Trait Badge
 */
function TraitBadge({
  trait,
  isPositive,
  compact,
}: {
  trait: string;
  isPositive: boolean;
  compact?: boolean;
}): React.JSX.Element {
  const icon = getTraitIcon(trait, isPositive);

  return (
    <View
      style={[
        styles.badge,
        isPositive ? styles.badgePositive : styles.badgeNegative,
        compact && styles.badgeCompact,
      ]}
    >
      <Text style={styles.badgeIcon}>{icon}</Text>
      <Text
        style={[
          styles.badgeText,
          isPositive ? styles.badgeTextPositive : styles.badgeTextNegative,
          compact && styles.badgeTextCompact,
        ]}
      >
        {formatTraitName(trait)}
      </Text>
    </View>
  );
}

/**
 * Unknown Trait Placeholder Badge
 */
function UnknownBadge({ compact }: { compact?: boolean }): React.JSX.Element {
  return (
    <View style={[styles.badge, styles.badgeUnknown, compact && styles.badgeCompact]}>
      <Text style={[styles.badgeText, styles.badgeTextUnknown, compact && styles.badgeTextCompact]}>
        ???
      </Text>
    </View>
  );
}

/**
 * TraitBadges Component
 */
export function TraitBadges({
  hiddenTraits,
  maxUnknownPlaceholders = 3,
  compact = false,
  showUnknownPlaceholders = true,
}: TraitBadgesProps): React.JSX.Element {
  // Get revealed positive and negative traits
  const revealedPositive = hiddenTraits.positive.filter((trait) =>
    hiddenTraits.revealedToUser.includes(trait)
  );
  const revealedNegative = hiddenTraits.negative.filter((trait) =>
    hiddenTraits.revealedToUser.includes(trait)
  );

  // Calculate number of unrevealed traits
  const totalTraits = hiddenTraits.positive.length + hiddenTraits.negative.length;
  const revealedCount = revealedPositive.length + revealedNegative.length;
  const unrevealedCount = totalTraits - revealedCount;

  // Determine how many unknown placeholders to show
  const unknownCount = Math.min(
    showUnknownPlaceholders ? unrevealedCount : 0,
    maxUnknownPlaceholders
  );

  const hasNoTraits =
    revealedPositive.length === 0 && revealedNegative.length === 0 && unknownCount === 0;

  if (hasNoTraits) {
    return (
      <View style={styles.container}>
        <Text style={styles.noTraitsText}>No traits discovered yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Positive traits section */}
      {revealedPositive.length > 0 && (
        <View style={styles.section}>
          {!compact && <Text style={styles.sectionTitle}>Strengths</Text>}
          <View style={styles.badgesContainer}>
            {revealedPositive.map((trait) => (
              <TraitBadge key={trait} trait={trait} isPositive={true} compact={compact} />
            ))}
          </View>
        </View>
      )}

      {/* Negative traits section */}
      {revealedNegative.length > 0 && (
        <View style={styles.section}>
          {!compact && <Text style={styles.sectionTitle}>Concerns</Text>}
          <View style={styles.badgesContainer}>
            {revealedNegative.map((trait) => (
              <TraitBadge key={trait} trait={trait} isPositive={false} compact={compact} />
            ))}
          </View>
        </View>
      )}

      {/* Unknown traits placeholders */}
      {unknownCount > 0 && (
        <View style={styles.section}>
          {!compact && <Text style={styles.sectionTitle}>Unknown</Text>}
          <View style={styles.badgesContainer}>
            {Array.from({ length: unknownCount }, (_, i) => (
              <UnknownBadge key={`unknown-${i}`} compact={compact} />
            ))}
          </View>
        </View>
      )}

      {/* Discovery hint */}
      {!compact && unrevealedCount > 0 && (
        <Text style={styles.hintText}>
          {unrevealedCount} trait{unrevealedCount !== 1 ? 's' : ''} yet to be discovered through
          gameplay
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xxs,
  },
  badgeCompact: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  badgePositive: {
    backgroundColor: `${colors.success}20`,
    borderWidth: 1,
    borderColor: colors.success,
  },
  badgeNegative: {
    backgroundColor: `${colors.error}20`,
    borderWidth: 1,
    borderColor: colors.error,
  },
  badgeUnknown: {
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.textLight,
    borderStyle: 'dashed',
  },
  badgeIcon: {
    fontSize: fontSize.sm,
  },
  badgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  badgeTextCompact: {
    fontSize: fontSize.xs,
  },
  badgeTextPositive: {
    color: colors.success,
  },
  badgeTextNegative: {
    color: colors.error,
  },
  badgeTextUnknown: {
    color: colors.textLight,
    fontStyle: 'italic',
  },
  noTraitsText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  hintText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
});

export default TraitBadges;

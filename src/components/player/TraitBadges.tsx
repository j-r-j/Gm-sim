/**
 * TraitBadges Component
 * Displays revealed traits as colored badges and unknown traits as placeholders.
 *
 * Design inspired by:
 * - Madden NFL X-Factor and Superstar abilities
 * - NBA 2K badges system
 * - FIFA PlayStyles icons
 *
 * BRAND GUIDELINE: Only show revealed traits. Unknown traits appear as "???" badges.
 * Positive traits are styled as "Superstar" abilities, negative as "Concerns".
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
  /** Display variant */
  variant?: 'default' | 'minimal' | 'grid';
}

/** Trait tier for Madden-style badge levels */
type TraitTier = 'superstar' | 'elite' | 'standard';

/**
 * Format trait name from camelCase to display format
 */
function formatTraitName(trait: string): string {
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
 * Get short name for compact display
 */
function getShortTraitName(trait: string): string {
  const shortNames: Record<string, string> = {
    clutch: 'CLT',
    filmJunkie: 'FLM',
    ironMan: 'IRN',
    leader: 'LDR',
    coolUnderPressure: 'CUP',
    motor: 'MTR',
    routeTechnician: 'RTE',
    brickWall: 'BRK',
    schemeVersatile: 'SCH',
    teamFirst: 'TM1',
    chokes: 'CHK',
    lazy: 'LZY',
    injuryProne: 'INJ',
    lockerRoomCancer: 'LRC',
    hotHead: 'HOT',
    glassHands: 'GLS',
    disappears: 'DSP',
    systemDependent: 'SYS',
    diva: 'DVA',
  };
  return shortNames[trait] || trait.substring(0, 3).toUpperCase();
}

/**
 * Get icon for trait (Madden/2K style badge icons)
 */
function getTraitIcon(trait: string, isPositive: boolean): string {
  if (isPositive) {
    const icons: Record<string, string> = {
      clutch: '⚡',
      filmJunkie: '🎬',
      ironMan: '🛡️',
      leader: '👑',
      coolUnderPressure: '🧊',
      motor: '⚙️',
      routeTechnician: '📐',
      brickWall: '🧱',
      schemeVersatile: '🔄',
      teamFirst: '🤝',
    };
    return icons[trait] || '★';
  } else {
    const icons: Record<string, string> = {
      chokes: '😰',
      lazy: '💤',
      injuryProne: '🩹',
      lockerRoomCancer: '☠️',
      hotHead: '🔥',
      glassHands: '🫳',
      disappears: '👻',
      systemDependent: '🔗',
      diva: '💎',
    };
    return icons[trait] || '⚠️';
  }
}

/**
 * Get trait tier based on impact
 */
function getTraitTier(trait: string): TraitTier {
  const superstarTraits = ['clutch', 'leader', 'coolUnderPressure'];
  const eliteTraits = ['ironMan', 'motor', 'brickWall', 'routeTechnician'];

  if (superstarTraits.includes(trait)) return 'superstar';
  if (eliteTraits.includes(trait)) return 'elite';
  return 'standard';
}

/**
 * Superstar Badge - Enhanced positive trait badge (Madden X-Factor style)
 */
function SuperstarBadge({
  trait,
  compact,
  variant,
}: {
  trait: string;
  compact?: boolean;
  variant?: 'default' | 'minimal' | 'grid';
}): React.JSX.Element {
  const icon = getTraitIcon(trait, true);
  const tier = getTraitTier(trait);

  if (variant === 'minimal') {
    return (
      <View style={[styles.minimalBadge, styles.minimalBadgePositive]}>
        <Text style={styles.minimalIcon}>{icon}</Text>
      </View>
    );
  }

  if (variant === 'grid') {
    return (
      <View style={[styles.gridBadge, styles.gridBadgePositive]}>
        <View style={styles.gridIconContainer}>
          <Text style={styles.gridIcon}>{icon}</Text>
        </View>
        <Text style={styles.gridLabel} numberOfLines={2}>
          {formatTraitName(trait)}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        styles.badgePositive,
        tier === 'superstar' && styles.badgeSuperstar,
        tier === 'elite' && styles.badgeElite,
        compact && styles.badgeCompact,
      ]}
    >
      <View style={[styles.badgeIconContainer, tier === 'superstar' && styles.badgeIconSuperstar]}>
        <Text style={styles.badgeIcon}>{icon}</Text>
      </View>
      {!compact && (
        <Text
          style={[
            styles.badgeText,
            styles.badgeTextPositive,
            tier === 'superstar' && styles.badgeTextSuperstar,
          ]}
        >
          {formatTraitName(trait)}
        </Text>
      )}
      {compact && <Text style={styles.badgeShortText}>{getShortTraitName(trait)}</Text>}
    </View>
  );
}

/**
 * Concern Badge - Negative trait badge
 */
function ConcernBadge({
  trait,
  compact,
  variant,
}: {
  trait: string;
  compact?: boolean;
  variant?: 'default' | 'minimal' | 'grid';
}): React.JSX.Element {
  const icon = getTraitIcon(trait, false);

  if (variant === 'minimal') {
    return (
      <View style={[styles.minimalBadge, styles.minimalBadgeNegative]}>
        <Text style={styles.minimalIcon}>{icon}</Text>
      </View>
    );
  }

  if (variant === 'grid') {
    return (
      <View style={[styles.gridBadge, styles.gridBadgeNegative]}>
        <View style={styles.gridIconContainer}>
          <Text style={styles.gridIcon}>{icon}</Text>
        </View>
        <Text style={styles.gridLabel} numberOfLines={2}>
          {formatTraitName(trait)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, styles.badgeNegative, compact && styles.badgeCompact]}>
      <View style={styles.badgeIconContainer}>
        <Text style={styles.badgeIcon}>{icon}</Text>
      </View>
      {!compact && (
        <Text style={[styles.badgeText, styles.badgeTextNegative]}>{formatTraitName(trait)}</Text>
      )}
      {compact && <Text style={styles.badgeShortText}>{getShortTraitName(trait)}</Text>}
    </View>
  );
}

/**
 * Unknown Trait Placeholder Badge
 */
function UnknownBadge({
  compact,
  variant,
}: {
  compact?: boolean;
  variant?: 'default' | 'minimal' | 'grid';
}): React.JSX.Element {
  if (variant === 'minimal') {
    return (
      <View style={[styles.minimalBadge, styles.minimalBadgeUnknown]}>
        <Text style={styles.minimalIconUnknown}>?</Text>
      </View>
    );
  }

  if (variant === 'grid') {
    return (
      <View style={[styles.gridBadge, styles.gridBadgeUnknown]}>
        <View style={styles.gridIconContainer}>
          <Text style={styles.gridIconUnknown}>?</Text>
        </View>
        <Text style={styles.gridLabelUnknown}>Unknown</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, styles.badgeUnknown, compact && styles.badgeCompact]}>
      <Text style={[styles.badgeText, styles.badgeTextUnknown]}>???</Text>
    </View>
  );
}

/**
 * Section Header
 */
function SectionHeader({ title, count }: { title: string; count: number }): React.JSX.Element {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCount}>
        <Text style={styles.sectionCountText}>{count}</Text>
      </View>
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
  variant = 'default',
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
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>No traits discovered yet</Text>
          <Text style={styles.emptyHint}>Play games to reveal player traits</Text>
        </View>
      </View>
    );
  }

  // Sort positive traits by tier (superstar first)
  const sortedPositive = [...revealedPositive].sort((a, b) => {
    const tierOrder = { superstar: 0, elite: 1, standard: 2 };
    return tierOrder[getTraitTier(a)] - tierOrder[getTraitTier(b)];
  });

  return (
    <View style={styles.container}>
      {/* Positive traits section */}
      {sortedPositive.length > 0 && (
        <View style={styles.section}>
          {!compact && variant === 'default' && (
            <SectionHeader title="Abilities" count={sortedPositive.length} />
          )}
          <View style={[styles.badgesContainer, variant === 'grid' && styles.badgesGrid]}>
            {sortedPositive.map((trait) => (
              <SuperstarBadge key={trait} trait={trait} compact={compact} variant={variant} />
            ))}
          </View>
        </View>
      )}

      {/* Negative traits section */}
      {revealedNegative.length > 0 && (
        <View style={styles.section}>
          {!compact && variant === 'default' && (
            <SectionHeader title="Concerns" count={revealedNegative.length} />
          )}
          <View style={[styles.badgesContainer, variant === 'grid' && styles.badgesGrid]}>
            {revealedNegative.map((trait) => (
              <ConcernBadge key={trait} trait={trait} compact={compact} variant={variant} />
            ))}
          </View>
        </View>
      )}

      {/* Unknown traits placeholders */}
      {unknownCount > 0 && (
        <View style={styles.section}>
          {!compact && variant === 'default' && (
            <SectionHeader title="Undiscovered" count={unrevealedCount} />
          )}
          <View style={[styles.badgesContainer, variant === 'grid' && styles.badgesGrid]}>
            {Array.from({ length: unknownCount }, (_, i) => (
              <UnknownBadge key={`unknown-${i}`} compact={compact} variant={variant} />
            ))}
          </View>
        </View>
      )}

      {/* Discovery progress */}
      {!compact && variant === 'default' && totalTraits > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${(revealedCount / totalTraits) * 100}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            {revealedCount}/{totalTraits} traits discovered
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    backgroundColor: colors.border,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  sectionCountText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badgesGrid: {
    gap: spacing.md,
  },

  // Badge styles (default variant)
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  badgeCompact: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  badgePositive: {
    backgroundColor: `${colors.success}15`,
    borderWidth: 1,
    borderColor: `${colors.success}40`,
  },
  badgeSuperstar: {
    backgroundColor: `${colors.tierElite}20`,
    borderColor: colors.tierElite,
    borderWidth: 2,
  },
  badgeElite: {
    backgroundColor: `${colors.tierExcellent}15`,
    borderColor: colors.tierExcellent,
  },
  badgeNegative: {
    backgroundColor: `${colors.error}15`,
    borderWidth: 1,
    borderColor: `${colors.error}40`,
  },
  badgeUnknown: {
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.textLight,
    borderStyle: 'dashed',
  },
  badgeIconContainer: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIconSuperstar: {
    backgroundColor: colors.tierElite,
    borderRadius: borderRadius.full,
  },
  badgeIcon: {
    fontSize: fontSize.sm,
  },
  badgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  badgeShortText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  badgeTextPositive: {
    color: colors.success,
  },
  badgeTextSuperstar: {
    color: colors.tierElite,
    fontWeight: fontWeight.bold,
  },
  badgeTextNegative: {
    color: colors.error,
  },
  badgeTextUnknown: {
    color: colors.textLight,
    fontStyle: 'italic',
  },

  // Minimal variant styles
  minimalBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimalBadgePositive: {
    backgroundColor: `${colors.success}20`,
  },
  minimalBadgeNegative: {
    backgroundColor: `${colors.error}20`,
  },
  minimalBadgeUnknown: {
    backgroundColor: colors.border,
  },
  minimalIcon: {
    fontSize: fontSize.md,
  },
  minimalIconUnknown: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
  },

  // Grid variant styles
  gridBadge: {
    width: 72,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  gridBadgePositive: {
    backgroundColor: `${colors.success}10`,
    borderWidth: 1,
    borderColor: `${colors.success}30`,
  },
  gridBadgeNegative: {
    backgroundColor: `${colors.error}10`,
    borderWidth: 1,
    borderColor: `${colors.error}30`,
  },
  gridBadgeUnknown: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  gridIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  gridIcon: {
    fontSize: fontSize.xl,
  },
  gridIconUnknown: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
  },
  gridLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textAlign: 'center',
  },
  gridLabelUnknown: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
  },
  emptyIcon: {
    fontSize: fontSize.xxl,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },

  // Progress bar
  progressContainer: {
    marginTop: spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.info,
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'center',
  },
});

export default TraitBadges;

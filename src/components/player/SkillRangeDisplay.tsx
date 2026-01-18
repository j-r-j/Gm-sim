/**
 * SkillRangeDisplay Component
 * Displays a skill value as a visual range bar, showing perceived min to max.
 *
 * Design inspired by:
 * - FIFA Ultimate Team face stats display
 * - Madden skill bar visualizations
 * - Modern sports app stat displays
 *
 * BRAND GUIDELINE: Skills are ALWAYS shown as ranges, never true values.
 * The range narrows as players mature (age approaches maturityAge).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  getRatingTierColor,
} from '../../styles';

export interface SkillRangeDisplayProps {
  /** Name of the skill (e.g., 'armStrength', 'accuracy') */
  skillName: string;
  /** Lower bound of perceived skill range (1-100) */
  perceivedMin: number;
  /** Upper bound of perceived skill range (1-100) */
  perceivedMax: number;
  /** Player's current age */
  playerAge?: number;
  /** Age at which skill range collapses to true value */
  maturityAge?: number;
  /** Whether to show compact version */
  compact?: boolean;
  /** Whether the skill is revealed (single value, not range) */
  isRevealed?: boolean;
  /** Display variant */
  variant?: 'bar' | 'minimal' | 'detailed';
}

/**
 * Format skill name from camelCase to display format
 */
function formatSkillName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Get abbreviated skill name for compact display
 */
function getAbbreviatedSkillName(name: string): string {
  const abbreviations: Record<string, string> = {
    armStrength: 'ARM',
    accuracy: 'ACC',
    shortAccuracy: 'SAC',
    mediumAccuracy: 'MAC',
    deepAccuracy: 'DAC',
    throwOnRun: 'TOR',
    pocketPresence: 'PKT',
    speed: 'SPD',
    acceleration: 'ACC',
    agility: 'AGI',
    strength: 'STR',
    carrying: 'CAR',
    ballCarrierVision: 'BCV',
    breakTackle: 'BTK',
    stiffArm: 'SFA',
    spinMove: 'SPN',
    jukeMove: 'JKE',
    routeRunning: 'RTE',
    catching: 'CTH',
    catchInTraffic: 'CIT',
    release: 'RLS',
    runBlocking: 'RBK',
    passBlocking: 'PBK',
    impactBlocking: 'IBK',
    leadBlocking: 'LBK',
    tackling: 'TAK',
    hitPower: 'HIT',
    pursuit: 'PUR',
    playRecognition: 'PRC',
    manCoverage: 'MAN',
    zoneCoverage: 'ZON',
    press: 'PRS',
    finesse: 'FIN',
    power: 'POW',
    blockShedding: 'BSH',
    kickPower: 'KPW',
    kickAccuracy: 'KAC',
    awareness: 'AWR',
    stamina: 'STA',
    injury: 'INJ',
    toughness: 'TGH',
  };
  return abbreviations[name] || name.substring(0, 3).toUpperCase();
}

/**
 * Get uncertainty level description
 */
function getUncertaintyLevel(min: number, max: number): { label: string; level: number } {
  const range = max - min;
  if (range <= 5) return { label: 'Precise', level: 4 };
  if (range <= 15) return { label: 'Confident', level: 3 };
  if (range <= 25) return { label: 'Estimated', level: 2 };
  return { label: 'Uncertain', level: 1 };
}

/**
 * Minimal variant - Just the bar and value
 */
function MinimalDisplay({
  skillName,
  perceivedMin,
  perceivedMax,
  showAsRevealed,
  tierColor,
  revealedValue,
}: {
  skillName: string;
  perceivedMin: number;
  perceivedMax: number;
  showAsRevealed: boolean;
  tierColor: string;
  revealedValue: number;
}): React.JSX.Element {
  return (
    <View style={styles.minimalContainer}>
      <Text style={styles.minimalLabel}>{getAbbreviatedSkillName(skillName)}</Text>
      <View style={styles.minimalBarContainer}>
        <View style={styles.minimalBarTrack}>
          {showAsRevealed ? (
            <View
              style={[
                styles.minimalBarFill,
                { width: `${revealedValue}%`, backgroundColor: tierColor },
              ]}
            />
          ) : (
            <View
              style={[
                styles.minimalBarRange,
                {
                  left: `${perceivedMin}%`,
                  width: `${perceivedMax - perceivedMin}%`,
                  backgroundColor: tierColor,
                },
              ]}
            />
          )}
        </View>
      </View>
      <Text style={[styles.minimalValue, { color: tierColor }]}>
        {showAsRevealed ? revealedValue : `${perceivedMin}-${perceivedMax}`}
      </Text>
    </View>
  );
}

/**
 * Compact bar variant
 */
function CompactDisplay({
  skillName,
  perceivedMin,
  perceivedMax,
  showAsRevealed,
  tierColor,
  tierBg,
  revealedValue,
}: {
  skillName: string;
  perceivedMin: number;
  perceivedMax: number;
  showAsRevealed: boolean;
  tierColor: string;
  tierBg: string;
  revealedValue: number;
}): React.JSX.Element {
  return (
    <View style={styles.compactContainer}>
      <View style={styles.compactLabelContainer}>
        <Text style={styles.compactLabel}>{formatSkillName(skillName)}</Text>
        <View style={[styles.compactTierDot, { backgroundColor: tierColor }]} />
      </View>
      <View style={styles.compactBarSection}>
        <View style={[styles.compactBarBackground, { backgroundColor: tierBg }]}>
          {showAsRevealed ? (
            <View
              style={[
                styles.compactBarFill,
                {
                  width: `${revealedValue}%`,
                  backgroundColor: tierColor,
                },
              ]}
            />
          ) : (
            <>
              {/* Background fill up to range start */}
              <View
                style={[
                  styles.compactBarFill,
                  {
                    width: `${perceivedMin}%`,
                    backgroundColor: `${tierColor}30`,
                  },
                ]}
              />
              {/* Range indicator */}
              <View
                style={[
                  styles.compactBarRange,
                  {
                    left: `${perceivedMin}%`,
                    width: `${perceivedMax - perceivedMin}%`,
                    backgroundColor: tierColor,
                  },
                ]}
              />
            </>
          )}
          {/* Tick marks */}
          <View style={[styles.compactTick, { left: '50%' }]} />
          <View style={[styles.compactTick, { left: '75%' }]} />
        </View>
        <Text style={styles.compactValue}>
          {showAsRevealed ? revealedValue : `${perceivedMin}-${perceivedMax}`}
        </Text>
      </View>
    </View>
  );
}

/**
 * Detailed variant with all information
 */
function DetailedDisplay({
  skillName,
  perceivedMin,
  perceivedMax,
  playerAge,
  maturityAge,
  showAsRevealed,
  tierColor,
  tierBg,
  revealedValue,
}: {
  skillName: string;
  perceivedMin: number;
  perceivedMax: number;
  playerAge?: number;
  maturityAge?: number;
  showAsRevealed: boolean;
  tierColor: string;
  tierBg: string;
  revealedValue: number;
}): React.JSX.Element {
  const uncertainty = getUncertaintyLevel(perceivedMin, perceivedMax);

  return (
    <View style={styles.detailedContainer}>
      {/* Header row */}
      <View style={styles.detailedHeader}>
        <View style={styles.detailedLabelRow}>
          <View
            style={[
              styles.detailedTierIndicator,
              { backgroundColor: tierBg, borderColor: tierColor },
            ]}
          >
            <View style={[styles.detailedTierDot, { backgroundColor: tierColor }]} />
          </View>
          <Text style={styles.detailedLabel}>{formatSkillName(skillName)}</Text>
        </View>
        <Text style={[styles.detailedValue, { color: tierColor }]}>
          {showAsRevealed ? revealedValue : `${perceivedMin} - ${perceivedMax}`}
        </Text>
      </View>

      {/* Bar visualization */}
      <View style={styles.detailedBarContainer}>
        <View style={[styles.detailedBarTrack, { backgroundColor: tierBg }]}>
          {/* Scale markers */}
          <View style={[styles.detailedScaleMarker, { left: '25%' }]}>
            <View style={styles.detailedScaleLine} />
          </View>
          <View style={[styles.detailedScaleMarker, { left: '50%' }]}>
            <View style={[styles.detailedScaleLine, styles.detailedScaleLineMajor]} />
          </View>
          <View style={[styles.detailedScaleMarker, { left: '75%' }]}>
            <View style={styles.detailedScaleLine} />
          </View>

          {/* Fill or range */}
          {showAsRevealed ? (
            <View
              style={[
                styles.detailedBarFill,
                {
                  width: `${revealedValue}%`,
                  backgroundColor: tierColor,
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.detailedBarRange,
                {
                  left: `${perceivedMin}%`,
                  width: `${perceivedMax - perceivedMin}%`,
                  backgroundColor: tierColor,
                },
              ]}
            />
          )}
        </View>
      </View>

      {/* Footer info */}
      {!showAsRevealed && (
        <View style={styles.detailedFooter}>
          <View style={styles.uncertaintyBadge}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.uncertaintyDot,
                  i < uncertainty.level
                    ? { backgroundColor: tierColor }
                    : { backgroundColor: colors.border },
                ]}
              />
            ))}
            <Text style={styles.uncertaintyText}>{uncertainty.label}</Text>
          </View>
          {playerAge !== undefined && maturityAge !== undefined && (
            <Text style={styles.maturityText}>Reveals age {maturityAge}</Text>
          )}
        </View>
      )}
    </View>
  );
}

/**
 * SkillRangeDisplay Component
 */
export function SkillRangeDisplay({
  skillName,
  perceivedMin,
  perceivedMax,
  playerAge,
  maturityAge,
  compact = false,
  isRevealed = false,
  variant = 'bar',
}: SkillRangeDisplayProps): React.JSX.Element {
  // Calculate if the skill should be shown as revealed
  const showAsRevealed =
    isRevealed ||
    (playerAge !== undefined && maturityAge !== undefined && playerAge >= maturityAge);

  // For revealed skills, show the midpoint
  const revealedValue = Math.round((perceivedMin + perceivedMax) / 2);
  const midpoint = showAsRevealed ? revealedValue : Math.round((perceivedMin + perceivedMax) / 2);

  // Get tier colors
  const tierInfo = getRatingTierColor(midpoint);

  // Use compact variant if compact prop is true
  const effectiveVariant = compact ? 'bar' : variant;

  switch (effectiveVariant) {
    case 'minimal':
      return (
        <MinimalDisplay
          skillName={skillName}
          perceivedMin={perceivedMin}
          perceivedMax={perceivedMax}
          showAsRevealed={showAsRevealed}
          tierColor={tierInfo.primary}
          revealedValue={revealedValue}
        />
      );
    case 'detailed':
      return (
        <DetailedDisplay
          skillName={skillName}
          perceivedMin={perceivedMin}
          perceivedMax={perceivedMax}
          playerAge={playerAge}
          maturityAge={maturityAge}
          showAsRevealed={showAsRevealed}
          tierColor={tierInfo.primary}
          tierBg={tierInfo.background}
          revealedValue={revealedValue}
        />
      );
    default: // bar (compact)
      return (
        <CompactDisplay
          skillName={skillName}
          perceivedMin={perceivedMin}
          perceivedMax={perceivedMax}
          showAsRevealed={showAsRevealed}
          tierColor={tierInfo.primary}
          tierBg={tierInfo.background}
          revealedValue={revealedValue}
        />
      );
  }
}

const styles = StyleSheet.create({
  // Minimal variant styles
  minimalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  minimalLabel: {
    width: 32,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  minimalBarContainer: {
    flex: 1,
    height: 4,
  },
  minimalBarTrack: {
    flex: 1,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  minimalBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: borderRadius.sm,
  },
  minimalBarRange: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: borderRadius.sm,
  },
  minimalValue: {
    width: 40,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },

  // Compact variant styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  compactLabelContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  compactLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  compactTierDot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
  },
  compactBarSection: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactBarBackground: {
    flex: 1,
    height: 8,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  compactBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
  compactBarRange: {
    position: 'absolute',
    top: 1,
    bottom: 1,
    borderRadius: borderRadius.sm,
  },
  compactTick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  compactValue: {
    minWidth: 50,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },

  // Detailed variant styles
  detailedContainer: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  detailedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailedTierIndicator: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailedTierDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  detailedLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  detailedValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  detailedBarContainer: {
    height: 16,
    marginBottom: spacing.sm,
  },
  detailedBarTrack: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  detailedScaleMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
  detailedScaleLine: {
    flex: 1,
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  detailedScaleLineMajor: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  detailedBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: borderRadius.md,
  },
  detailedBarRange: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    borderRadius: borderRadius.sm,
  },
  detailedFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  uncertaintyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  uncertaintyDot: {
    width: 4,
    height: 4,
    borderRadius: borderRadius.full,
  },
  uncertaintyText: {
    marginLeft: spacing.xs,
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  maturityText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
});

export default SkillRangeDisplay;

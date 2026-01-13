/**
 * SkillRangeDisplay Component
 * Displays a skill value as a visual range bar, showing perceived min to max.
 *
 * BRAND GUIDELINE: Skills are ALWAYS shown as ranges, never true values.
 * The range narrows as players mature (age approaches maturityAge).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../styles';

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
}

/**
 * Format skill name from camelCase to display format
 */
function formatSkillName(name: string): string {
  // Insert space before capital letters and capitalize first letter
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Get color based on skill value (midpoint of range)
 */
function getSkillColor(min: number, max: number): string {
  const midpoint = (min + max) / 2;
  if (midpoint >= 80) return colors.success;
  if (midpoint >= 60) return colors.info;
  if (midpoint >= 40) return colors.warning;
  return colors.error;
}

/**
 * Get range uncertainty indicator
 */
function getUncertaintyLevel(min: number, max: number): string {
  const range = max - min;
  if (range <= 5) return 'High Certainty';
  if (range <= 15) return 'Moderate';
  if (range <= 25) return 'Uncertain';
  return 'Very Uncertain';
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
}: SkillRangeDisplayProps): React.JSX.Element {
  // Calculate if the skill should be shown as revealed (single value)
  const showAsRevealed =
    isRevealed ||
    (playerAge !== undefined && maturityAge !== undefined && playerAge >= maturityAge);

  // For revealed skills, show the midpoint (which equals true value after maturity)
  const revealedValue = Math.round((perceivedMin + perceivedMax) / 2);

  const rangeWidth = perceivedMax - perceivedMin;
  const leftPosition = perceivedMin;
  const skillColor = getSkillColor(perceivedMin, perceivedMax);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactLabel}>{formatSkillName(skillName)}</Text>
        <View style={styles.compactBarContainer}>
          <View style={styles.compactBarBackground}>
            {showAsRevealed ? (
              <View
                style={[
                  styles.compactBarFill,
                  {
                    left: 0,
                    width: `${revealedValue}%`,
                    backgroundColor: skillColor,
                  },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.compactBarFill,
                  {
                    left: `${leftPosition}%`,
                    width: `${rangeWidth}%`,
                    backgroundColor: skillColor,
                  },
                ]}
              />
            )}
          </View>
          <Text style={styles.compactValue}>
            {showAsRevealed ? revealedValue : `${perceivedMin}-${perceivedMax}`}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{formatSkillName(skillName)}</Text>
        <Text style={styles.valueText}>
          {showAsRevealed ? revealedValue : `${perceivedMin} - ${perceivedMax}`}
        </Text>
      </View>

      <View style={styles.barContainer}>
        {/* Background track with tick marks */}
        <View style={styles.barBackground}>
          {/* Tick marks at 25, 50, 75 */}
          <View style={[styles.tickMark, { left: '25%' }]} />
          <View style={[styles.tickMark, { left: '50%' }]} />
          <View style={[styles.tickMark, { left: '75%' }]} />

          {/* Range or revealed value indicator */}
          {showAsRevealed ? (
            <View
              style={[
                styles.barFill,
                {
                  left: 0,
                  width: `${revealedValue}%`,
                  backgroundColor: skillColor,
                  borderTopRightRadius: borderRadius.sm,
                  borderBottomRightRadius: borderRadius.sm,
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.rangeIndicator,
                {
                  left: `${leftPosition}%`,
                  width: `${rangeWidth}%`,
                  backgroundColor: skillColor,
                },
              ]}
            />
          )}
        </View>
      </View>

      {/* Uncertainty indicator for unrevealed skills */}
      {!showAsRevealed && (
        <View style={styles.uncertaintyRow}>
          <Text style={styles.uncertaintyText}>
            {getUncertaintyLevel(perceivedMin, perceivedMax)}
          </Text>
          {playerAge !== undefined && maturityAge !== undefined && (
            <Text style={styles.maturityText}>Reveals at age {maturityAge}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  valueText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  barContainer: {
    height: 12,
  },
  barBackground: {
    flex: 1,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  tickMark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.textLight,
    opacity: 0.3,
  },
  barFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: borderRadius.sm,
  },
  rangeIndicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    borderRadius: borderRadius.sm,
    opacity: 0.9,
  },
  uncertaintyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xxs,
  },
  uncertaintyText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  maturityText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  compactLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  compactBarContainer: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  compactBarFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  compactValue: {
    minWidth: 50,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});

export default SkillRangeDisplay;

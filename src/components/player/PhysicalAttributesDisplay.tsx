/**
 * PhysicalAttributesDisplay Component
 * Displays physical measurements and athletic ratings.
 *
 * Physical attributes are concrete, measurable values (unlike skills which are ranges).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../styles';
import { PhysicalAttributes } from '../../core/models/player/PhysicalAttributes';
import { Position } from '../../core/models/player/Position';

export interface PhysicalAttributesDisplayProps {
  /** Physical attributes to display */
  physical: PhysicalAttributes;
  /** Player's position (for context on what's important) */
  position: Position;
  /** Whether physicals have been revealed (combine/pro day completed) */
  revealed?: boolean;
  /** Whether to show compact version */
  compact?: boolean;
}

/**
 * Format height in feet and inches
 */
function formatHeight(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  return `${feet}'${remainingInches}"`;
}

/**
 * Format 40-yard dash time (speed field)
 */
function formatFortyTime(seconds: number): string {
  return seconds.toFixed(2) + 's';
}

/**
 * Format vertical jump in inches
 */
function formatVerticalJump(inches: number): string {
  return `${inches}"`;
}

/**
 * Get grade for a physical attribute relative to position averages
 */
function getAttributeGrade(
  value: number,
  metric: string,
  _position: Position
): 'elite' | 'above' | 'average' | 'below' {
  // For 1-100 scale ratings (acceleration, agility, strength)
  if (['acceleration', 'agility', 'strength'].includes(metric)) {
    if (value >= 85) return 'elite';
    if (value >= 70) return 'above';
    if (value >= 50) return 'average';
    return 'below';
  }

  // For 40-yard dash (speed) - lower is better
  if (metric === 'speed') {
    if (value <= 4.4) return 'elite';
    if (value <= 4.55) return 'above';
    if (value <= 4.75) return 'average';
    return 'below';
  }

  // For vertical jump - higher is better
  if (metric === 'verticalJump') {
    if (value >= 38) return 'elite';
    if (value >= 34) return 'above';
    if (value >= 30) return 'average';
    return 'below';
  }

  return 'average';
}

/**
 * Get color for grade
 */
function getGradeColor(grade: 'elite' | 'above' | 'average' | 'below' | 'unknown'): string {
  switch (grade) {
    case 'elite':
      return colors.success;
    case 'above':
      return colors.info;
    case 'average':
      return colors.text;
    case 'below':
      return colors.warning;
    case 'unknown':
      return colors.textLight;
  }
}

/**
 * Single attribute row
 */
function AttributeRow({
  label,
  value,
  grade,
  compact,
}: {
  label: string;
  value: string;
  grade: 'elite' | 'above' | 'average' | 'below' | 'unknown';
  compact?: boolean;
}): React.JSX.Element {
  const gradeColor = getGradeColor(grade);

  return (
    <View style={[styles.attributeRow, compact && styles.attributeRowCompact]}>
      <Text style={[styles.attributeLabel, compact && styles.attributeLabelCompact]}>{label}</Text>
      <Text
        style={[
          styles.attributeValue,
          { color: gradeColor },
          compact && styles.attributeValueCompact,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * PhysicalAttributesDisplay Component
 */
export function PhysicalAttributesDisplay({
  physical,
  position,
  revealed = true,
  compact = false,
}: PhysicalAttributesDisplayProps): React.JSX.Element {
  if (!revealed) {
    return (
      <View style={styles.container}>
        <View style={styles.hiddenContainer}>
          <Text style={styles.hiddenIcon}>🔒</Text>
          <Text style={styles.hiddenText}>Physical measurements not yet revealed</Text>
          <Text style={styles.hiddenHint}>Complete combine or pro day to reveal</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Basic measurements section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>
          Measurements
        </Text>
        <View style={styles.measurementsRow}>
          <View style={styles.measurementItem}>
            <Text style={styles.measurementValue}>{formatHeight(physical.height)}</Text>
            <Text style={styles.measurementLabel}>Height</Text>
          </View>
          <View style={styles.measurementDivider} />
          <View style={styles.measurementItem}>
            <Text style={styles.measurementValue}>{physical.weight} lbs</Text>
            <Text style={styles.measurementLabel}>Weight</Text>
          </View>
          <View style={styles.measurementDivider} />
          <View style={styles.measurementItem}>
            <Text style={styles.measurementValue}>{physical.armLength}"</Text>
            <Text style={styles.measurementLabel}>Arm Length</Text>
          </View>
          {physical.handSize !== undefined && (
            <>
              <View style={styles.measurementDivider} />
              <View style={styles.measurementItem}>
                <Text style={styles.measurementValue}>{physical.handSize}"</Text>
                <Text style={styles.measurementLabel}>Hand Size</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Athletic testing section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>
          Athletic Testing
        </Text>
        <View style={[styles.attributesGrid, compact && styles.attributesGridCompact]}>
          <AttributeRow
            label="40-Yard Dash"
            value={formatFortyTime(physical.speed)}
            grade={getAttributeGrade(physical.speed, 'speed', position)}
            compact={compact}
          />
          <AttributeRow
            label="Vertical Jump"
            value={formatVerticalJump(physical.verticalJump)}
            grade={getAttributeGrade(physical.verticalJump, 'verticalJump', position)}
            compact={compact}
          />
          <AttributeRow
            label="Acceleration"
            value={`${physical.acceleration}`}
            grade={getAttributeGrade(physical.acceleration, 'acceleration', position)}
            compact={compact}
          />
          <AttributeRow
            label="Agility"
            value={`${physical.agility}`}
            grade={getAttributeGrade(physical.agility, 'agility', position)}
            compact={compact}
          />
          <AttributeRow
            label="Strength"
            value={`${physical.strength}`}
            grade={getAttributeGrade(physical.strength, 'strength', position)}
            compact={compact}
          />
        </View>
      </View>
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
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitleCompact: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  measurementsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  measurementItem: {
    alignItems: 'center',
  },
  measurementValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  measurementLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  measurementDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  attributesGrid: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  attributesGridCompact: {
    padding: spacing.sm,
  },
  attributeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  attributeRowCompact: {
    paddingVertical: spacing.xs,
  },
  attributeLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  attributeLabelCompact: {
    fontSize: fontSize.sm,
  },
  attributeValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  attributeValueCompact: {
    fontSize: fontSize.sm,
  },
  hiddenContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    alignItems: 'center',
  },
  hiddenIcon: {
    fontSize: fontSize.display,
    marginBottom: spacing.md,
  },
  hiddenText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  hiddenHint: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    fontStyle: 'italic',
  },
});

export default PhysicalAttributesDisplay;

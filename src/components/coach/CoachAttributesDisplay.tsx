/**
 * CoachAttributesDisplay
 * Displays coach attributes with progressive revelation
 */

import React from 'react';
import { View, Text, StyleSheet, DimensionValue } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../styles';
import { CoachAttributes } from '../../core/models/staff/CoachAttributes';
import {
  AttributeRevelation,
  AttributeVisibility,
  getAttributeDisplayValue,
  getAttributeDisplayName,
  getAttributeDescription,
  getAttributeColor,
} from '../../core/coaching/CoachRevelationSystem';

interface CoachAttributesDisplayProps {
  attributes: CoachAttributes;
  revelation: AttributeRevelation;
}

interface AttributeRowProps {
  name: string;
  description: string;
  displayValue: string;
  visibility: AttributeVisibility;
  actualValue?: number;
}

function AttributeRow({
  name,
  description,
  displayValue,
  visibility,
  actualValue,
}: AttributeRowProps): React.JSX.Element {
  const isRevealed = visibility === 'revealed' && actualValue !== undefined;
  const barWidth: DimensionValue = isRevealed ? `${actualValue}%` : '0%';
  const barColor = isRevealed ? getAttributeColor(actualValue) : colors.textLight;

  return (
    <View style={styles.attributeRow}>
      <View style={styles.attributeHeader}>
        <Text style={styles.attributeName}>{name}</Text>
        <Text
          style={[
            styles.attributeValue,
            visibility === 'hidden' && styles.hiddenValue,
            visibility === 'vague' && styles.vagueValue,
          ]}
        >
          {displayValue}
        </Text>
      </View>
      {isRevealed && (
        <View style={styles.barContainer}>
          <View style={[styles.bar, { width: barWidth, backgroundColor: barColor }]} />
        </View>
      )}
      <Text style={styles.attributeDescription}>{description}</Text>
    </View>
  );
}

export function CoachAttributesDisplay({
  attributes,
  revelation,
}: CoachAttributesDisplayProps): React.JSX.Element {
  const attributeKeys: (keyof AttributeRevelation)[] = [
    'motivation',
    'gameDayIQ',
    'schemeTeaching',
    'development',
    'playerEvaluation',
    'talentID',
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Coaching Abilities</Text>
      <View style={styles.attributesList}>
        {attributeKeys.map((key) => {
          const visibility = revelation[key];
          const displayValue = getAttributeDisplayValue(attributes, key, visibility);

          return (
            <AttributeRow
              key={key}
              name={getAttributeDisplayName(key)}
              description={getAttributeDescription(key)}
              displayValue={displayValue}
              visibility={visibility}
              actualValue={visibility === 'revealed' ? attributes[key] : undefined}
            />
          );
        })}
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendText}>
          Attributes reveal over time as you observe the coach's work
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  attributesList: {
    gap: spacing.md,
  },
  attributeRow: {
    gap: spacing.xxs,
  },
  attributeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attributeName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  attributeValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  hiddenValue: {
    color: colors.textLight,
  },
  vagueValue: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  barContainer: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 3,
  },
  attributeDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  legend: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default CoachAttributesDisplay;

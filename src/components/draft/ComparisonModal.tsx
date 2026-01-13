/**
 * ComparisonModal Component
 * Side-by-side comparison of two prospects.
 *
 * BRAND GUIDELINE: Skills shown as ranges, NO overall rating.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../styles';
import { Position } from '../../core/models/player/Position';
import { SkillValue } from '../../core/models/player/TechnicalSkills';
import { PhysicalAttributes } from '../../core/models/player/PhysicalAttributes';

export interface ComparisonProspect {
  /** Prospect ID */
  id: string;
  /** Full name */
  name: string;
  /** Position */
  position: Position;
  /** College name */
  collegeName: string;
  /** Age */
  age: number;
  /** Skills (map of skill name to SkillValue) */
  skills: Record<string, SkillValue>;
  /** Physical attributes (null if not revealed) */
  physical: PhysicalAttributes | null;
  /** Projected round */
  projectedRound: number | null;
  /** User tier */
  userTier: string | null;
}

export interface ComparisonModalProps {
  /** Whether modal is visible */
  visible: boolean;
  /** First prospect to compare */
  prospect1: ComparisonProspect | null;
  /** Second prospect to compare */
  prospect2: ComparisonProspect | null;
  /** Callback to close modal */
  onClose: () => void;
  /** Callback to view full profile */
  onViewProfile?: (prospectId: string) => void;
}

/**
 * Get color based on which prospect has higher value
 */
function getComparisonColor(value1: number, value2: number): { color1: string; color2: string } {
  if (value1 > value2) {
    return { color1: colors.success, color2: colors.textSecondary };
  }
  if (value2 > value1) {
    return { color1: colors.textSecondary, color2: colors.success };
  }
  return { color1: colors.text, color2: colors.text };
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
 * Format height in feet and inches
 */
function formatHeight(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  return `${feet}'${remainingInches}"`;
}

/**
 * Skill comparison row
 */
function SkillComparisonRow({
  skillName,
  skill1,
  skill2,
}: {
  skillName: string;
  skill1: SkillValue | null;
  skill2: SkillValue | null;
}): React.JSX.Element {
  const mid1 = skill1 ? (skill1.perceivedMin + skill1.perceivedMax) / 2 : 0;
  const mid2 = skill2 ? (skill2.perceivedMin + skill2.perceivedMax) / 2 : 0;
  const { color1, color2 } = getComparisonColor(mid1, mid2);

  return (
    <View style={styles.comparisonRow}>
      <View style={styles.valueColumn}>
        {skill1 ? (
          <Text style={[styles.skillValue, { color: color1 }]}>
            {skill1.perceivedMin}-{skill1.perceivedMax}
          </Text>
        ) : (
          <Text style={styles.naText}>--</Text>
        )}
      </View>
      <View style={styles.labelColumn}>
        <Text style={styles.skillLabel}>{formatSkillName(skillName)}</Text>
      </View>
      <View style={styles.valueColumn}>
        {skill2 ? (
          <Text style={[styles.skillValue, { color: color2 }]}>
            {skill2.perceivedMin}-{skill2.perceivedMax}
          </Text>
        ) : (
          <Text style={styles.naText}>--</Text>
        )}
      </View>
    </View>
  );
}

/**
 * Physical attribute comparison row
 */
function PhysicalComparisonRow({
  label,
  value1,
  value2,
  format,
  higherIsBetter = true,
}: {
  label: string;
  value1: number | null;
  value2: number | null;
  format: (v: number) => string;
  higherIsBetter?: boolean;
}): React.JSX.Element {
  const v1 = value1 ?? 0;
  const v2 = value2 ?? 0;
  const comparison = higherIsBetter
    ? getComparisonColor(v1, v2)
    : getComparisonColor(v2, v1);

  return (
    <View style={styles.comparisonRow}>
      <View style={styles.valueColumn}>
        {value1 !== null ? (
          <Text style={[styles.physicalValue, { color: comparison.color1 }]}>
            {format(value1)}
          </Text>
        ) : (
          <Text style={styles.naText}>--</Text>
        )}
      </View>
      <View style={styles.labelColumn}>
        <Text style={styles.physicalLabel}>{label}</Text>
      </View>
      <View style={styles.valueColumn}>
        {value2 !== null ? (
          <Text style={[styles.physicalValue, { color: comparison.color2 }]}>
            {format(value2)}
          </Text>
        ) : (
          <Text style={styles.naText}>--</Text>
        )}
      </View>
    </View>
  );
}

/**
 * ComparisonModal Component
 */
export function ComparisonModal({
  visible,
  prospect1,
  prospect2,
  onClose,
  onViewProfile,
}: ComparisonModalProps): React.JSX.Element {
  if (!prospect1 || !prospect2) {
    return <></>;
  }

  // Get all unique skill names from both prospects
  const allSkillNames = [
    ...new Set([
      ...Object.keys(prospect1.skills),
      ...Object.keys(prospect2.skills),
    ]),
  ].sort();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Compare Prospects</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView}>
          {/* Prospect Headers */}
          <View style={styles.prospectHeaders}>
            <TouchableOpacity
              style={styles.prospectHeader}
              onPress={() => onViewProfile?.(prospect1.id)}
            >
              <Text style={styles.prospectName}>{prospect1.name}</Text>
              <Text style={styles.prospectPosition}>{prospect1.position}</Text>
              <Text style={styles.prospectCollege}>{prospect1.collegeName}</Text>
              {prospect1.userTier && (
                <View style={styles.tierBadge}>
                  <Text style={styles.tierText}>{prospect1.userTier}</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.vsColumn}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            <TouchableOpacity
              style={styles.prospectHeader}
              onPress={() => onViewProfile?.(prospect2.id)}
            >
              <Text style={styles.prospectName}>{prospect2.name}</Text>
              <Text style={styles.prospectPosition}>{prospect2.position}</Text>
              <Text style={styles.prospectCollege}>{prospect2.collegeName}</Text>
              {prospect2.userTier && (
                <View style={styles.tierBadge}>
                  <Text style={styles.tierText}>{prospect2.userTier}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Info</Text>
            <PhysicalComparisonRow
              label="Age"
              value1={prospect1.age}
              value2={prospect2.age}
              format={(v) => `${v} yrs`}
              higherIsBetter={false}
            />
            <PhysicalComparisonRow
              label="Projected"
              value1={prospect1.projectedRound}
              value2={prospect2.projectedRound}
              format={(v) => v === 0 ? 'UDFA' : `Rd ${v}`}
              higherIsBetter={false}
            />
          </View>

          {/* Physical Attributes */}
          {(prospect1.physical || prospect2.physical) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Physical Attributes</Text>
              <PhysicalComparisonRow
                label="Height"
                value1={prospect1.physical?.height ?? null}
                value2={prospect2.physical?.height ?? null}
                format={formatHeight}
              />
              <PhysicalComparisonRow
                label="Weight"
                value1={prospect1.physical?.weight ?? null}
                value2={prospect2.physical?.weight ?? null}
                format={(v) => `${v} lbs`}
              />
              <PhysicalComparisonRow
                label="40-Yard"
                value1={prospect1.physical?.speed ?? null}
                value2={prospect2.physical?.speed ?? null}
                format={(v) => `${v.toFixed(2)}s`}
                higherIsBetter={false}
              />
              <PhysicalComparisonRow
                label="Vertical"
                value1={prospect1.physical?.verticalJump ?? null}
                value2={prospect2.physical?.verticalJump ?? null}
                format={(v) => `${v}"`}
              />
              <PhysicalComparisonRow
                label="Arm Length"
                value1={prospect1.physical?.armLength ?? null}
                value2={prospect2.physical?.armLength ?? null}
                format={(v) => `${v}"`}
              />
              <PhysicalComparisonRow
                label="Hand Size"
                value1={prospect1.physical?.handSize ?? null}
                value2={prospect2.physical?.handSize ?? null}
                format={(v) => `${v}"`}
              />
            </View>
          )}

          {/* Skills Comparison */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills (Ranges)</Text>
            <Text style={styles.sectionSubtitle}>
              Green indicates advantage
            </Text>
            {allSkillNames.map((skillName) => (
              <SkillComparisonRow
                key={skillName}
                skillName={skillName}
                skill1={prospect1.skills[skillName] || null}
                skill2={prospect2.skills[skillName] || null}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    ...shadows.md,
  },
  closeButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  closeButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  headerTitle: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  headerSpacer: {
    width: 50,
  },
  scrollView: {
    flex: 1,
  },
  prospectHeaders: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    ...shadows.sm,
  },
  prospectHeader: {
    flex: 1,
    alignItems: 'center',
  },
  prospectName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  prospectPosition: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginTop: spacing.xxs,
  },
  prospectCollege: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  tierBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  tierText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  vsColumn: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
  },
  section: {
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  valueColumn: {
    flex: 1,
    alignItems: 'center',
  },
  labelColumn: {
    width: 100,
    alignItems: 'center',
  },
  skillLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  skillValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  physicalLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  physicalValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  naText: {
    fontSize: fontSize.md,
    color: colors.textLight,
    fontStyle: 'italic',
  },
});

export default ComparisonModal;

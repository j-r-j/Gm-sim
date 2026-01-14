/**
 * CoachTreeCard
 * Displays coaching tree lineage and philosophy
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../styles';
import { CoachingTree, TreeName } from '../../core/models/staff/CoachingTree';

interface CoachTreeCardProps {
  tree: CoachingTree;
}

/**
 * Tree display names and descriptions
 */
const TREE_INFO: Record<TreeName, { displayName: string; description: string }> = {
  walsh: {
    displayName: 'Walsh Tree',
    description: 'West Coast offense philosophy emphasizing short, precise passing',
  },
  parcells: {
    displayName: 'Parcells Tree',
    description: 'Power football with disciplined defense and physical running game',
  },
  belichick: {
    displayName: 'Belichick Tree',
    description: 'Adaptive game planning with versatile defensive schemes',
  },
  shanahan: {
    displayName: 'Shanahan Tree',
    description: 'Outside zone running with play-action and motion',
  },
  reid: {
    displayName: 'Reid Tree',
    description: 'Creative offensive schemes with quarterback-friendly systems',
  },
  coughlin: {
    displayName: 'Coughlin Tree',
    description: 'Disciplined, fundamentals-focused approach to both sides',
  },
  dungy: {
    displayName: 'Dungy Tree',
    description: 'Tampa 2 coverage with character-first team building',
  },
  holmgren: {
    displayName: 'Holmgren Tree',
    description: 'West Coast principles with strong quarterback development',
  },
  gruden: {
    displayName: 'Gruden Tree',
    description: 'High-tempo offense with aggressive defensive pressure',
  },
  payton: {
    displayName: 'Payton Tree',
    description: 'Creative play design with innovative offensive concepts',
  },
};

/**
 * Get generation label
 */
function getGenerationLabel(generation: number): string {
  switch (generation) {
    case 1:
      return '1st Gen (Direct Disciple)';
    case 2:
      return '2nd Generation';
    case 3:
      return '3rd Generation';
    case 4:
      return '4th Generation';
    default:
      return `${generation}th Generation`;
  }
}

/**
 * Get risk tolerance display
 */
function getRiskDisplay(risk: string): { label: string; color: string } {
  switch (risk) {
    case 'aggressive':
      return { label: 'Aggressive', color: colors.error };
    case 'conservative':
      return { label: 'Conservative', color: colors.info };
    default:
      return { label: 'Balanced', color: colors.success };
  }
}

export function CoachTreeCard({ tree }: CoachTreeCardProps): React.JSX.Element {
  const treeInfo = TREE_INFO[tree.treeName];
  const riskDisplay = getRiskDisplay(tree.philosophy.riskTolerance);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Coaching Tree</Text>

      <View style={styles.treeHeader}>
        <Text style={styles.treeName}>{treeInfo.displayName}</Text>
        <View style={styles.generationBadge}>
          <Text style={styles.generationText}>{getGenerationLabel(tree.generation)}</Text>
        </View>
      </View>

      <Text style={styles.treeDescription}>{treeInfo.description}</Text>

      <View style={styles.philosophySection}>
        <Text style={styles.philosophyTitle}>Philosophy</Text>

        <View style={styles.philosophyGrid}>
          <View style={styles.philosophyItem}>
            <Text style={styles.philosophyLabel}>Offense</Text>
            <Text style={styles.philosophyValue}>{tree.philosophy.offensiveTendency}</Text>
          </View>

          <View style={styles.philosophyItem}>
            <Text style={styles.philosophyLabel}>Defense</Text>
            <Text style={styles.philosophyValue}>{tree.philosophy.defensiveTendency}</Text>
          </View>

          <View style={styles.philosophyItem}>
            <Text style={styles.philosophyLabel}>Risk Tolerance</Text>
            <Text style={[styles.philosophyValue, { color: riskDisplay.color }]}>
              {riskDisplay.label}
            </Text>
          </View>
        </View>
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
  treeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  treeName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  generationBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  generationText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  treeDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  philosophySection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  philosophyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  philosophyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  philosophyItem: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  philosophyLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  philosophyValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textTransform: 'capitalize',
  },
});

export default CoachTreeCard;

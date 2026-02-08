/**
 * HalftimeScreen
 *
 * Shown at halftime during game simulation.
 * User can make offensive/defensive adjustments for the second half.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  accessibility,
} from '../styles';
import {
  HalftimeStats,
  HalftimeDecisions,
  OffensiveAdjustment,
  DefensiveAdjustment,
  createDefaultHalftimeDecisions,
  getHalftimeRecommendation,
  OFFENSIVE_ADJUSTMENT_LABELS,
  OFFENSIVE_ADJUSTMENT_DESCRIPTIONS,
  DEFENSIVE_ADJUSTMENT_LABELS,
  DEFENSIVE_ADJUSTMENT_DESCRIPTIONS,
} from '../core/game/HalftimeAdjustments';

export interface HalftimeScreenProps {
  stats: HalftimeStats;
  userTeamName: string;
  opponentTeamName: string;
  onConfirm: (decisions: HalftimeDecisions) => void;
}

export function HalftimeScreen({
  stats,
  userTeamName,
  opponentTeamName,
  onConfirm,
}: HalftimeScreenProps): React.JSX.Element {
  const [decisions, setDecisions] = useState<HalftimeDecisions>(createDefaultHalftimeDecisions());

  const recommendation = getHalftimeRecommendation(stats);

  const handleConfirm = () => {
    onConfirm({ ...decisions, isConfirmed: true });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>HALFTIME</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Score */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreTeam}>
            <Text style={styles.scoreTeamName}>{userTeamName}</Text>
            <Text style={styles.scoreValue}>{stats.userScore}</Text>
          </View>
          <View style={styles.scoreDivider}>
            <Text style={styles.scoreDash}>-</Text>
          </View>
          <View style={styles.scoreTeam}>
            <Text style={styles.scoreTeamName}>{opponentTeamName}</Text>
            <Text style={styles.scoreValue}>{stats.opponentScore}</Text>
          </View>
        </View>

        {/* Stats Summary */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>First Half Stats</Text>
          <View style={styles.statsGrid}>
            <StatRow
              label="Pass Yards"
              value={stats.userPassYards}
              oppValue={stats.opponentPassYards}
            />
            <StatRow
              label="Rush Yards"
              value={stats.userRushYards}
              oppValue={stats.opponentRushYards}
            />
            <StatRow
              label="Turnovers"
              value={stats.userTurnovers}
              oppValue={stats.opponentTurnovers}
              invert
            />
            <StatRow label="3rd Down %" value={`${stats.userThirdDownPct}%`} />
            <StatRow label="TOP" value={stats.userTimeOfPossession} />
          </View>
        </View>

        {/* Coordinator Recommendation */}
        <View style={styles.recommendCard}>
          <View style={styles.recommendHeader}>
            <Ionicons name="bulb" size={20} color={colors.warning} />
            <Text style={styles.recommendTitle}>Coordinator Recommendation</Text>
          </View>
          <Text style={styles.recommendText}>{recommendation.reasoning}</Text>
          <Text style={styles.recommendSuggestion}>
            Offense: {OFFENSIVE_ADJUSTMENT_LABELS[recommendation.offensiveRec]} | Defense:{' '}
            {DEFENSIVE_ADJUSTMENT_LABELS[recommendation.defensiveRec]}
          </Text>
        </View>

        {/* Offensive Adjustment */}
        <View style={styles.adjustmentCard}>
          <Text style={styles.cardTitle}>Offensive Adjustment</Text>
          {(Object.keys(OFFENSIVE_ADJUSTMENT_LABELS) as OffensiveAdjustment[]).map((adj) => (
            <TouchableOpacity
              key={adj}
              style={[
                styles.adjustmentOption,
                decisions.offensiveAdjustment === adj && styles.adjustmentSelected,
              ]}
              onPress={() => setDecisions({ ...decisions, offensiveAdjustment: adj })}
              accessibilityLabel={`${OFFENSIVE_ADJUSTMENT_LABELS[adj]}: ${OFFENSIVE_ADJUSTMENT_DESCRIPTIONS[adj]}`}
              accessibilityRole="button"
              accessibilityState={{ selected: decisions.offensiveAdjustment === adj }}
            >
              <View style={styles.adjustmentRow}>
                <Text
                  style={[
                    styles.adjustmentLabel,
                    decisions.offensiveAdjustment === adj && styles.adjustmentLabelSelected,
                  ]}
                >
                  {OFFENSIVE_ADJUSTMENT_LABELS[adj]}
                </Text>
                {decisions.offensiveAdjustment === adj && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                )}
              </View>
              <Text style={styles.adjustmentDesc}>{OFFENSIVE_ADJUSTMENT_DESCRIPTIONS[adj]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Defensive Adjustment */}
        <View style={styles.adjustmentCard}>
          <Text style={styles.cardTitle}>Defensive Adjustment</Text>
          {(Object.keys(DEFENSIVE_ADJUSTMENT_LABELS) as DefensiveAdjustment[]).map((adj) => (
            <TouchableOpacity
              key={adj}
              style={[
                styles.adjustmentOption,
                decisions.defensiveAdjustment === adj && styles.adjustmentSelected,
              ]}
              onPress={() => setDecisions({ ...decisions, defensiveAdjustment: adj })}
              accessibilityLabel={`${DEFENSIVE_ADJUSTMENT_LABELS[adj]}: ${DEFENSIVE_ADJUSTMENT_DESCRIPTIONS[adj]}`}
              accessibilityRole="button"
              accessibilityState={{ selected: decisions.defensiveAdjustment === adj }}
            >
              <View style={styles.adjustmentRow}>
                <Text
                  style={[
                    styles.adjustmentLabel,
                    decisions.defensiveAdjustment === adj && styles.adjustmentLabelSelected,
                  ]}
                >
                  {DEFENSIVE_ADJUSTMENT_LABELS[adj]}
                </Text>
                {decisions.defensiveAdjustment === adj && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                )}
              </View>
              <Text style={styles.adjustmentDesc}>{DEFENSIVE_ADJUSTMENT_DESCRIPTIONS[adj]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Confirm */}
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
          accessibilityLabel="Confirm halftime adjustments and start second half"
          accessibilityRole="button"
        >
          <Text style={styles.confirmText}>Start Second Half</Text>
          <Ionicons name="play" size={20} color={colors.textOnPrimary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatRow({
  label,
  value,
  oppValue,
  invert,
}: {
  label: string;
  value: number | string;
  oppValue?: number | string;
  invert?: boolean;
}): React.JSX.Element {
  const isBetter =
    oppValue != null
      ? invert
        ? Number(value) < Number(oppValue)
        : Number(value) > Number(oppValue)
      : false;

  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, isBetter && styles.statValueBetter]}>{value}</Text>
      {oppValue != null && <Text style={styles.statOpp}>{oppValue}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    ...shadows.md,
  },
  headerTitle: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    letterSpacing: 3,
  },
  scrollView: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.md },
  scoreCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
  },
  scoreTeam: { flex: 1, alignItems: 'center' },
  scoreTeamName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  scoreDivider: { paddingHorizontal: spacing.lg },
  scoreDash: { fontSize: 32, color: colors.textSecondary },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: { gap: spacing.xs },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xxs,
  },
  statLabel: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
  statValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    width: 60,
    textAlign: 'center',
  },
  statValueBetter: { color: colors.success },
  statOpp: { fontSize: fontSize.sm, color: colors.textSecondary, width: 60, textAlign: 'center' },
  recommendCard: {
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  recommendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  recommendTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.warning,
  },
  recommendText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  recommendSuggestion: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  adjustmentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  adjustmentOption: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  adjustmentSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  adjustmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adjustmentLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  adjustmentLabelSelected: { color: colors.primary },
  adjustmentDesc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    minHeight: accessibility.minTouchTarget,
    ...shadows.md,
  },
  confirmText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
});

export default HalftimeScreen;

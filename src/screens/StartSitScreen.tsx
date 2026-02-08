/**
 * StartSitScreen
 *
 * Shows questionable players and lets the user decide to start or sit them.
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
  StartSitState,
  StartSitDecision,
  makeStartSitDecision,
  getRiskColor,
  getRiskDescription,
} from '../core/roster/StartSitManager';

export interface StartSitScreenProps {
  startSitState: StartSitState;
  onConfirm: (state: StartSitState) => void;
  onBack: () => void;
}

export function StartSitScreen({
  startSitState,
  onConfirm,
  onBack,
}: StartSitScreenProps): React.JSX.Element {
  const [state, setState] = useState<StartSitState>(startSitState);

  const handleDecision = (playerId: string, decision: 'start' | 'sit') => {
    setState(makeStartSitDecision(state, playerId, decision));
  };

  const handleConfirm = () => {
    onConfirm(state);
  };

  if (state.decisions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="chevron-back" size={24} color={colors.textOnPrimary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Injury Decisions</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="medkit" size={48} color={colors.success} />
          <Text style={styles.emptyTitle}>All Clear</Text>
          <Text style={styles.emptyText}>
            No questionable players this week. Your team is healthy!
          </Text>
          <TouchableOpacity style={styles.doneButton} onPress={onBack}>
            <Text style={styles.doneButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={accessibility.hitSlop}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textOnPrimary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Start / Sit</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.instructions}>
          These players are questionable this week. Decide whether to play them (risk re-injury for
          production) or sit them (faster recovery).
        </Text>

        {state.decisions.map((decision) => (
          <DecisionCard
            key={decision.playerId}
            decision={decision}
            onStart={() => handleDecision(decision.playerId, 'start')}
            onSit={() => handleDecision(decision.playerId, 'sit')}
          />
        ))}

        <TouchableOpacity
          style={[styles.confirmButton, !state.allDecided && styles.confirmDisabled]}
          onPress={handleConfirm}
          disabled={!state.allDecided}
          accessibilityLabel={state.allDecided ? 'Confirm decisions' : 'Make all decisions first'}
          accessibilityRole="button"
        >
          <Text style={styles.confirmText}>
            {state.allDecided ? 'Confirm Decisions' : 'Decide on All Players'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function DecisionCard({
  decision,
  onStart,
  onSit,
}: {
  decision: StartSitDecision;
  onStart: () => void;
  onSit: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.decisionCard}>
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{decision.playerName}</Text>
        <Text style={styles.playerPosition}>{decision.position}</Text>
        <View style={styles.injuryRow}>
          <View
            style={[
              styles.riskBadge,
              { backgroundColor: getRiskColor(decision.reInjuryRisk) + '20' },
            ]}
          >
            <Text style={[styles.riskText, { color: getRiskColor(decision.reInjuryRisk) }]}>
              {decision.reInjuryRisk.toUpperCase()} RISK
            </Text>
          </View>
          <Text style={styles.injuryType}>{decision.injuryType}</Text>
        </View>
      </View>

      <Text style={styles.riskDescription}>{getRiskDescription(decision.reInjuryRisk)}</Text>

      <View style={styles.performanceRow}>
        <Text style={styles.performanceLabel}>Expected Performance:</Text>
        <Text style={styles.performanceValue}>{decision.expectedPerformance}%</Text>
      </View>

      {decision.backupName && (
        <View style={styles.backupRow}>
          <Text style={styles.backupLabel}>Backup:</Text>
          <Text style={styles.backupName}>
            {decision.backupName} (OVR {decision.backupRating})
          </Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.decisionButton,
            styles.sitButton,
            decision.decision === 'sit' && styles.sitButtonActive,
          ]}
          onPress={onSit}
          accessibilityLabel={`Sit ${decision.playerName}`}
          accessibilityRole="button"
          accessibilityState={{ selected: decision.decision === 'sit' }}
        >
          <Ionicons
            name="bed"
            size={18}
            color={decision.decision === 'sit' ? colors.textOnPrimary : colors.warning}
          />
          <Text
            style={[styles.sitButtonText, decision.decision === 'sit' && styles.buttonTextActive]}
          >
            Sit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.decisionButton,
            styles.startButton,
            decision.decision === 'start' && styles.startButtonActive,
          ]}
          onPress={onStart}
          accessibilityLabel={`Start ${decision.playerName}`}
          accessibilityRole="button"
          accessibilityState={{ selected: decision.decision === 'start' }}
        >
          <Ionicons
            name="flash"
            size={18}
            color={decision.decision === 'start' ? colors.textOnPrimary : colors.success}
          />
          <Text
            style={[
              styles.startButtonText,
              decision.decision === 'start' && styles.buttonTextActive,
            ]}
          >
            Start
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    ...shadows.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: accessibility.minTouchTarget,
  },
  backText: { color: colors.textOnPrimary, fontSize: fontSize.md },
  headerTitle: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  headerSpacer: { width: 70 },
  scrollView: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.md },
  instructions: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  doneButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  decisionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  playerInfo: { marginBottom: spacing.sm },
  playerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  playerPosition: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  injuryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  riskBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  riskText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  injuryType: { fontSize: fontSize.sm, color: colors.textSecondary },
  riskDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  performanceLabel: { fontSize: fontSize.sm, color: colors.text },
  performanceValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.warning,
  },
  backupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  backupLabel: { fontSize: fontSize.sm, color: colors.text },
  backupName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  decisionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minHeight: accessibility.minTouchTarget,
    borderWidth: 2,
  },
  sitButton: { borderColor: colors.warning },
  sitButtonActive: { backgroundColor: colors.warning, borderColor: colors.warning },
  startButton: { borderColor: colors.success },
  startButtonActive: { backgroundColor: colors.success, borderColor: colors.success },
  sitButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.warning,
  },
  startButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  buttonTextActive: { color: colors.textOnPrimary },
  confirmButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: accessibility.minTouchTarget,
    ...shadows.md,
  },
  confirmDisabled: { opacity: 0.5 },
  confirmText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
});

export default StartSitScreen;

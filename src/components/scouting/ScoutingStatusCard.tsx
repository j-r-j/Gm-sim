/**
 * ScoutingStatusCard
 * Displays the current scouting status for a prospect
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing } from '../../styles';
import { ScoutReport } from '../../core/scouting/ScoutReportGenerator';
import { FocusScoutingProgress } from '../../core/scouting/FocusPlayerSystem';
import { Scout } from '../../core/models/staff/Scout';

export interface ScoutingStatusCardProps {
  prospectId: string;
  reports: ScoutReport[];
  focusProgress: FocusScoutingProgress | null;
  assignedScout: Scout | null;
  onRequestFocus: () => void;
}

/**
 * Get phase display name
 */
function getPhaseDisplayName(phase: FocusScoutingProgress['currentPhase']): string {
  const phaseNames: Record<FocusScoutingProgress['currentPhase'], string> = {
    initial: 'Film Study',
    film: 'Deep Film Analysis',
    interviews: 'Character Interviews',
    medical: 'Medical Review',
    final: 'Report Compilation',
  };
  return phaseNames[phase];
}

/**
 * Get confidence level from reports
 */
function getConfidenceLevel(reports: ScoutReport[]): 'low' | 'medium' | 'high' {
  if (reports.length === 0) return 'low';

  const hasFocus = reports.some((r) => r.reportType === 'focus');
  if (hasFocus) return 'high';

  // Average confidence from auto reports
  const avgConfidence = reports.reduce((sum, r) => sum + r.confidence.score, 0) / reports.length;

  if (avgConfidence >= 70) return 'high';
  if (avgConfidence >= 50) return 'medium';
  return 'low';
}

/**
 * Get confidence color
 */
function getConfidenceColor(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high':
      return colors.success;
    case 'medium':
      return colors.warning;
    case 'low':
      return colors.error;
  }
}

export function ScoutingStatusCard({
  reports,
  focusProgress,
  assignedScout,
  onRequestFocus,
}: ScoutingStatusCardProps): React.JSX.Element {
  const hasFocusReport = reports.some((r) => r.reportType === 'focus');
  const hasAnyReport = reports.length > 0;
  const confidenceLevel = getConfidenceLevel(reports);
  const confidenceColor = getConfidenceColor(confidenceLevel);

  // Status: Focus in progress
  if (focusProgress && assignedScout) {
    const progressPercent = (focusProgress.weeksCompleted / focusProgress.weeksTotal) * 100;

    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Scouting Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.statusText, { color: colors.primary }]}>In Progress</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={styles.scoutName}>
              {assignedScout.firstName} {assignedScout.lastName}
            </Text>
            <Text style={styles.phaseText}>{getPhaseDisplayName(focusProgress.currentPhase)}</Text>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
          </View>

          <Text style={styles.progressLabel}>
            Week {focusProgress.weeksCompleted} of {focusProgress.weeksTotal}
          </Text>
        </View>
      </View>
    );
  }

  // Status: Focus scouting complete
  if (hasFocusReport) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Scouting Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.success + '20' }]}>
            <Text style={[styles.statusText, { color: colors.success }]}>Comprehensive</Text>
          </View>
        </View>

        <View style={styles.confidenceSection}>
          <Text style={styles.confidenceLabel}>Report Confidence</Text>
          <View style={styles.confidenceMeter}>
            <View
              style={[
                styles.confidenceLevel,
                { backgroundColor: colors.success },
                { width: '100%' },
              ]}
            />
          </View>
          <Text style={[styles.confidenceText, { color: colors.success }]}>High</Text>
        </View>

        <Text style={styles.reportCount}>{reports.length} scout report(s) on file</Text>
      </View>
    );
  }

  // Status: Auto-scouted only
  if (hasAnyReport) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Scouting Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.warning + '20' }]}>
            <Text style={[styles.statusText, { color: colors.warning }]}>Basic</Text>
          </View>
        </View>

        <View style={styles.confidenceSection}>
          <Text style={styles.confidenceLabel}>Report Confidence</Text>
          <View style={styles.confidenceMeter}>
            <View
              style={[
                styles.confidenceLevel,
                { backgroundColor: confidenceColor },
                {
                  width:
                    confidenceLevel === 'high'
                      ? '100%'
                      : confidenceLevel === 'medium'
                        ? '60%'
                        : '30%',
                },
              ]}
            />
          </View>
          <Text style={[styles.confidenceText, { color: confidenceColor }]}>
            {confidenceLevel.charAt(0).toUpperCase() + confidenceLevel.slice(1)}
          </Text>
        </View>

        <Text style={styles.reportCount}>{reports.length} auto-scout report(s)</Text>

        <TouchableOpacity style={styles.requestButton} onPress={onRequestFocus} activeOpacity={0.7}>
          <Text style={styles.requestButtonText}>Request Focus Scouting</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Status: Not scouted
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Scouting Status</Text>
        <View style={[styles.statusBadge, { backgroundColor: colors.textSecondary + '20' }]}>
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>Unknown</Text>
        </View>
      </View>

      <Text style={styles.noReportsText}>No scouts have evaluated this prospect yet.</Text>

      <TouchableOpacity style={styles.requestButton} onPress={onRequestFocus} activeOpacity={0.7}>
        <Text style={styles.requestButtonText}>Request Focus Scouting</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  progressSection: {
    marginTop: spacing.sm,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  scoutName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  phaseText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  progressLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    textAlign: 'right',
  },
  confidenceSection: {
    marginVertical: spacing.sm,
  },
  confidenceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  confidenceMeter: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  confidenceLevel: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  confidenceText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.xxs,
    textAlign: 'right',
  },
  reportCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  noReportsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  requestButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  requestButtonText: {
    color: colors.background,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
  },
});

export default ScoutingStatusCard;

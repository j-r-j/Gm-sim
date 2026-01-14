/**
 * OffseasonScreen
 * Displays current offseason phase with tasks and progress
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../styles';
import {
  OffSeasonState,
  OffSeasonTask,
  PHASE_NAMES,
  PHASE_DESCRIPTIONS,
  getCurrentPhaseTasks,
  getProgress,
  OffSeasonProgress,
} from '../core/offseason/OffSeasonPhaseManager';

interface OffseasonScreenProps {
  offseasonState: OffSeasonState;
  year: number;
  onCompleteTask: (taskId: string) => void;
  onAdvancePhase: () => void;
  onBack: () => void;
  onViewOTAReports?: () => void;
  onViewTrainingCamp?: () => void;
  onViewPreseason?: () => void;
  onViewFinalCuts?: () => void;
}

function TaskCard({
  task,
  onComplete,
}: {
  task: OffSeasonTask;
  onComplete: () => void;
}): React.JSX.Element {
  return (
    <View style={[styles.taskCard, task.isComplete && styles.taskCardComplete]}>
      <View style={styles.taskContent}>
        <View style={styles.taskHeader}>
          <Text style={[styles.taskName, task.isComplete && styles.taskNameComplete]}>
            {task.name}
          </Text>
          {task.isRequired && !task.isComplete && (
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>Required</Text>
            </View>
          )}
        </View>
        <Text style={styles.taskDescription}>{task.description}</Text>
      </View>
      {!task.isComplete ? (
        <TouchableOpacity style={styles.completeButton} onPress={onComplete}>
          <Text style={styles.completeButtonText}>Do</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.checkmark}>
          <Text style={styles.checkmarkText}>Done</Text>
        </View>
      )}
    </View>
  );
}

function ProgressBar({ progress }: { progress: OffSeasonProgress }): React.JSX.Element {
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>Offseason Progress</Text>
        <Text style={styles.progressValue}>Phase {progress.currentPhaseNumber} of 12</Text>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progress.percentComplete}%` }]} />
      </View>
      <Text style={styles.progressPercent}>{progress.percentComplete}% Complete</Text>
    </View>
  );
}

export function OffseasonScreen({
  offseasonState,
  year,
  onCompleteTask,
  onAdvancePhase,
  onBack,
  onViewOTAReports,
  onViewTrainingCamp,
  onViewPreseason,
  onViewFinalCuts,
}: OffseasonScreenProps): React.JSX.Element {
  const progress = useMemo(() => getProgress(offseasonState), [offseasonState]);
  const tasks = useMemo(() => getCurrentPhaseTasks(offseasonState), [offseasonState]);

  const requiredTasks = tasks.filter((t) => t.isRequired);
  const optionalTasks = tasks.filter((t) => !t.isRequired);

  const phaseName = PHASE_NAMES[offseasonState.currentPhase];
  const phaseDescription = PHASE_DESCRIPTIONS[offseasonState.currentPhase];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{year} Offseason</Text>
          <Text style={styles.headerSubtitle}>{phaseName}</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Progress Bar */}
        <ProgressBar progress={progress} />

        {/* Phase Info */}
        <View style={styles.phaseInfo}>
          <Text style={styles.phaseTitle}>{phaseName}</Text>
          <Text style={styles.phaseDescription}>{phaseDescription}</Text>
          <Text style={styles.phaseDay}>Day {offseasonState.phaseDay}</Text>
        </View>

        {/* Phase-specific Action Button */}
        {offseasonState.currentPhase === 'otas' && onViewOTAReports && (
          <TouchableOpacity style={styles.phaseActionButton} onPress={onViewOTAReports}>
            <Text style={styles.phaseActionButtonText}>View OTA Reports</Text>
          </TouchableOpacity>
        )}
        {offseasonState.currentPhase === 'training_camp' && onViewTrainingCamp && (
          <TouchableOpacity style={styles.phaseActionButton} onPress={onViewTrainingCamp}>
            <Text style={styles.phaseActionButtonText}>View Training Camp</Text>
          </TouchableOpacity>
        )}
        {offseasonState.currentPhase === 'preseason' && onViewPreseason && (
          <TouchableOpacity style={styles.phaseActionButton} onPress={onViewPreseason}>
            <Text style={styles.phaseActionButtonText}>View Preseason Games</Text>
          </TouchableOpacity>
        )}
        {offseasonState.currentPhase === 'final_cuts' && onViewFinalCuts && (
          <TouchableOpacity style={styles.phaseActionButton} onPress={onViewFinalCuts}>
            <Text style={styles.phaseActionButtonText}>Manage Roster Cuts</Text>
          </TouchableOpacity>
        )}

        {/* Required Tasks */}
        {requiredTasks.length > 0 && (
          <View style={styles.taskSection}>
            <Text style={styles.sectionTitle}>Required Tasks</Text>
            {requiredTasks.map((task) => (
              <TaskCard key={task.id} task={task} onComplete={() => onCompleteTask(task.id)} />
            ))}
          </View>
        )}

        {/* Optional Tasks */}
        {optionalTasks.length > 0 && (
          <View style={styles.taskSection}>
            <Text style={styles.sectionTitle}>Optional Tasks</Text>
            {optionalTasks.map((task) => (
              <TaskCard key={task.id} task={task} onComplete={() => onCompleteTask(task.id)} />
            ))}
          </View>
        )}

        {/* Advance Button */}
        <View style={styles.advanceSection}>
          <TouchableOpacity
            style={[styles.advanceButton, !progress.canAdvance && styles.advanceButtonDisabled]}
            onPress={onAdvancePhase}
            disabled={!progress.canAdvance}
          >
            <Text style={styles.advanceButtonText}>
              {progress.isComplete ? 'Start Season' : 'Advance to Next Phase'}
            </Text>
          </TouchableOpacity>
          {!progress.canAdvance && (
            <Text style={styles.advanceHint}>Complete all required tasks to advance</Text>
          )}
        </View>

        {/* Recent Events */}
        {offseasonState.events.length > 0 && (
          <View style={styles.eventsSection}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {offseasonState.events
              .slice(-5)
              .reverse()
              .map((event) => (
                <View key={event.id} style={styles.eventItem}>
                  <Text style={styles.eventText}>{event.description}</Text>
                </View>
              ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    backgroundColor: colors.primary,
    padding: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textOnPrimary,
    opacity: 0.8,
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  progressContainer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  progressValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  phaseInfo: {
    padding: spacing.lg,
    backgroundColor: colors.primary + '10',
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '30',
  },
  phaseTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  phaseDescription: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  phaseDay: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  phaseActionButton: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  phaseActionButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  taskSection: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  taskCardComplete: {
    backgroundColor: colors.success + '15',
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  taskName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  taskNameComplete: {
    color: colors.success,
  },
  requiredBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  requiredText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  taskDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  completeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginLeft: spacing.md,
  },
  completeButtonText: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
  },
  checkmark: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginLeft: spacing.md,
  },
  checkmarkText: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
  },
  advanceSection: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  advanceButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    width: '100%',
    alignItems: 'center',
    ...shadows.md,
  },
  advanceButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  advanceButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  advanceHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  eventsSection: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  eventItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});

export default OffseasonScreen;

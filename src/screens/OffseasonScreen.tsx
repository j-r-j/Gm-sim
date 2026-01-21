/**
 * OffseasonScreen
 * Displays current offseason phase with tasks and progress
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows, accessibility } from '../styles';
import {
  OffSeasonState,
  OffSeasonTask,
  TaskTargetScreen,
  OffSeasonPhaseType,
  PHASE_NAMES,
  PHASE_DESCRIPTIONS,
  PHASE_ORDER,
  getCurrentPhaseTasks,
  getProgress,
  getNextPhase,
  OffSeasonProgress,
} from '../core/offseason/OffSeasonPhaseManager';
import {
  Button,
  ScreenHeader,
  OffseasonProgressBar,
  OFFSEASON_PHASES,
  type OffseasonPhase,
} from '../components';

/**
 * Phase icons for visual identification
 */
const PHASE_ICONS: Record<OffSeasonPhaseType, string> = {
  season_end: '🏁',
  coaching_decisions: '🎯',
  contract_management: '📝',
  combine: '🏃',
  free_agency: '🤝',
  draft: '📋',
  udfa: '🔍',
  otas: '🏈',
  training_camp: '⛺',
  preseason: '🎮',
  final_cuts: '✂️',
  season_start: '🚀',
};

interface OffseasonScreenProps {
  offseasonState: OffSeasonState;
  year: number;
  rosterSize?: number; // For validation display
  onTaskAction: (taskId: string, targetScreen: TaskTargetScreen) => void;
  onCompleteTask: (taskId: string) => void;
  onAdvancePhase: () => void;
  onBack: () => void;
}

/**
 * Get button text based on task action type
 */
function getTaskButtonText(task: OffSeasonTask): string {
  if (task.isComplete) return 'Done';

  switch (task.actionType) {
    case 'view':
      return 'View';
    case 'navigate':
      return 'Go';
    case 'validate':
      return 'Check';
    case 'auto':
      return 'Auto';
    default:
      return 'Do';
  }
}

/**
 * Get button color based on task action type
 */
function getTaskButtonStyle(task: OffSeasonTask): object {
  if (task.isComplete) return styles.checkmark;

  switch (task.actionType) {
    case 'view':
      return styles.viewButton;
    case 'navigate':
      return styles.navigateButton;
    case 'validate':
      return styles.validateButton;
    case 'auto':
      return styles.autoButton;
    default:
      return styles.completeButton;
  }
}

function TaskCard({
  task,
  onAction,
  validationInfo,
}: {
  task: OffSeasonTask;
  onAction: () => void;
  validationInfo?: string;
}): React.JSX.Element {
  const isAutoTask = task.actionType === 'auto';
  const buttonText = getTaskButtonText(task);
  const buttonStyle = getTaskButtonStyle(task);

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
        {validationInfo && !task.isComplete && (
          <Text style={styles.validationInfo}>{validationInfo}</Text>
        )}
      </View>
      {!task.isComplete ? (
        <TouchableOpacity
          style={buttonStyle}
          onPress={onAction}
          disabled={isAutoTask}
          accessibilityLabel={`${task.name}. ${buttonText}`}
          accessibilityRole="button"
          accessibilityHint={task.description}
          accessibilityState={{ disabled: isAutoTask }}
          hitSlop={accessibility.hitSlop}
        >
          <Text style={styles.completeButtonText}>{buttonText}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.checkmark} accessibilityLabel={`${task.name} completed`}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.checkmarkText}>Done</Text>
        </View>
      )}
    </View>
  );
}

// PhaseTimeline and ProgressBar functions removed - replaced by OffseasonProgressBar component

export function OffseasonScreen({
  offseasonState,
  year,
  rosterSize,
  onTaskAction,
  onCompleteTask,
  onAdvancePhase,
  onBack,
}: OffseasonScreenProps): React.JSX.Element {
  const progress = useMemo(() => getProgress(offseasonState), [offseasonState]);
  const tasks = useMemo(() => getCurrentPhaseTasks(offseasonState), [offseasonState]);

  const requiredTasks = tasks.filter((t) => t.isRequired);
  const optionalTasks = tasks.filter((t) => !t.isRequired);

  const phaseName = PHASE_NAMES[offseasonState.currentPhase];
  const phaseDescription = PHASE_DESCRIPTIONS[offseasonState.currentPhase];
  const phaseIcon = PHASE_ICONS[offseasonState.currentPhase];
  const nextPhase = getNextPhase(offseasonState);
  const nextPhaseName = nextPhase ? PHASE_NAMES[nextPhase] : null;
  const nextPhaseIcon = nextPhase ? PHASE_ICONS[nextPhase] : null;

  /**
   * Handle task action based on task type
   */
  const handleTaskAction = (task: OffSeasonTask) => {
    // Auto tasks complete themselves - nothing to do
    if (task.actionType === 'auto') {
      onCompleteTask(task.id);
      return;
    }

    // For tasks with target screens, navigate there
    if (task.targetScreen) {
      onTaskAction(task.id, task.targetScreen);
    } else {
      // Fallback to simple completion
      onCompleteTask(task.id);
    }
  };

  /**
   * Get validation info for validate-type tasks
   */
  const getValidationInfo = (task: OffSeasonTask): string | undefined => {
    if (task.actionType !== 'validate') return undefined;

    switch (task.completionCondition) {
      case 'rosterSize<=53':
        if (rosterSize !== undefined) {
          return rosterSize > 53
            ? `Current roster: ${rosterSize}/53 (need to cut ${rosterSize - 53})`
            : `Roster at ${rosterSize}/53 - Ready!`;
        }
        return undefined;
      default:
        return undefined;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ScreenHeader
        title={`${year} Offseason`}
        subtitle={phaseName}
        onBack={onBack}
        testID="offseason-header"
      />

      <ScrollView style={styles.content}>
        {/* Offseason Progress Bar with Phase Timeline */}
        <View style={styles.progressSection}>
          <OffseasonProgressBar
            currentPhaseIndex={PHASE_ORDER.indexOf(offseasonState.currentPhase)}
            completedPhases={offseasonState.completedPhases as OffseasonPhase[]}
            compact
            testID="offseason-progress"
          />
        </View>

        {/* Phase Info */}
        <View style={styles.phaseInfo}>
          <View style={styles.phaseIconContainer}>
            <Text style={styles.phaseIcon}>{phaseIcon}</Text>
          </View>
          <Text style={styles.phaseTitle}>{phaseName}</Text>
          <Text style={styles.phaseDescription}>{phaseDescription}</Text>
          <Text style={styles.phaseDay}>Day {offseasonState.phaseDay}</Text>
        </View>

        {/* Required Tasks */}
        {requiredTasks.length > 0 && (
          <View style={styles.taskSection}>
            <Text style={styles.sectionTitle}>Required Tasks</Text>
            {requiredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onAction={() => handleTaskAction(task)}
                validationInfo={getValidationInfo(task)}
              />
            ))}
          </View>
        )}

        {/* Optional Tasks */}
        {optionalTasks.length > 0 && (
          <View style={styles.taskSection}>
            <Text style={styles.sectionTitle}>Optional Tasks</Text>
            {optionalTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onAction={() => handleTaskAction(task)}
                validationInfo={getValidationInfo(task)}
              />
            ))}
          </View>
        )}

        {/* Advance Button */}
        <View style={styles.advanceSection}>
          {/* Next Phase Preview */}
          {nextPhaseName && progress.canAdvance && (
            <View style={styles.nextPhasePreview}>
              <Text style={styles.nextPhaseLabel}>Next Phase</Text>
              <View style={styles.nextPhaseContent}>
                <Text style={styles.nextPhaseIcon}>{nextPhaseIcon}</Text>
                <Text style={styles.nextPhaseName}>{nextPhaseName}</Text>
              </View>
            </View>
          )}

          <Button
            label={
              progress.isComplete
                ? 'Start Season'
                : `Continue to ${nextPhaseName || 'Next Phase'}`
            }
            onPress={onAdvancePhase}
            variant="success"
            size="lg"
            disabled={!progress.canAdvance}
            rightIcon={
              <Ionicons
                name={progress.isComplete ? 'rocket' : 'arrow-forward'}
                size={20}
                color={colors.textOnPrimary}
              />
            }
            fullWidth
            accessibilityHint={
              progress.canAdvance
                ? 'Advances to the next offseason phase'
                : 'Complete all required tasks to advance'
            }
            testID="advance-phase-button"
          />
          {!progress.canAdvance && (
            <Text style={styles.advanceHint}>Complete all required tasks to advance</Text>
          )}
          {progress.canAdvance &&
            requiredTasks.every((t) => t.isComplete) &&
            optionalTasks.some((t) => !t.isComplete) && (
              <Text style={styles.optionalHint}>Optional tasks can be completed or skipped</Text>
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
  progressSection: {
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  // Timeline styles (legacy - kept for potential future use)
  timelineContainer: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timeline: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  timelineItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  timelineNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineNodeComplete: {
    backgroundColor: colors.success,
  },
  timelineNodeCurrent: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  timelineNodeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  timelineNodeTextCurrent: {
    color: colors.textOnPrimary,
  },
  timelineConnector: {
    width: 12,
    height: 2,
    backgroundColor: colors.border,
  },
  timelineConnectorComplete: {
    backgroundColor: colors.success,
  },
  timelineLabel: {
    fontSize: fontSize.lg,
    marginLeft: -28,
    marginTop: 32,
    width: 28,
    textAlign: 'center',
  },
  timelineLabelCurrent: {
    opacity: 1,
  },
  timelineLabelComplete: {
    opacity: 0.6,
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
    alignItems: 'center',
  },
  phaseIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  phaseIcon: {
    fontSize: 32,
  },
  phaseTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  phaseDescription: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
    textAlign: 'center',
  },
  phaseDay: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
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
  viewButton: {
    backgroundColor: colors.info,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginLeft: spacing.md,
  },
  navigateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginLeft: spacing.md,
  },
  validateButton: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginLeft: spacing.md,
  },
  autoButton: {
    backgroundColor: colors.textLight,
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
  validationInfo: {
    fontSize: fontSize.xs,
    color: colors.warning,
    marginTop: spacing.xs,
    fontStyle: 'italic',
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
  optionalHint: {
    fontSize: fontSize.sm,
    color: colors.info,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  nextPhasePreview: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    width: '100%',
    alignItems: 'center',
    ...shadows.sm,
  },
  nextPhaseLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  nextPhaseContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextPhaseIcon: {
    fontSize: fontSize.xl,
    marginRight: spacing.sm,
  },
  nextPhaseName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
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

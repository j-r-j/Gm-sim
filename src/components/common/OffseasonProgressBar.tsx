/**
 * OffseasonProgressBar Component
 * Visual progress indicator for the 12-phase offseason
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius, accessibility } from '../../styles';

export type OffseasonPhase =
  | 'season_end'
  | 'coaching_decisions'
  | 'contract_management'
  | 'combine'
  | 'free_agency'
  | 'draft'
  | 'udfa'
  | 'otas'
  | 'training_camp'
  | 'preseason'
  | 'final_cuts'
  | 'season_start';

export interface PhaseInfo {
  id: OffseasonPhase;
  name: string;
  shortName: string;
  icon: keyof typeof Ionicons.glyphMap;
  isRequired: boolean;
}

export const OFFSEASON_PHASES: PhaseInfo[] = [
  { id: 'season_end', name: 'Season Recap', shortName: 'Recap', icon: 'flag', isRequired: true },
  {
    id: 'coaching_decisions',
    name: 'Coaching',
    shortName: 'Staff',
    icon: 'people',
    isRequired: true,
  },
  {
    id: 'contract_management',
    name: 'Contracts',
    shortName: 'Contracts',
    icon: 'document-text',
    isRequired: true,
  },
  { id: 'combine', name: 'Combine', shortName: 'Combine', icon: 'fitness', isRequired: false },
  { id: 'free_agency', name: 'Free Agency', shortName: 'FA', icon: 'person-add', isRequired: true },
  { id: 'draft', name: 'NFL Draft', shortName: 'Draft', icon: 'trophy', isRequired: true },
  { id: 'udfa', name: 'UDFA', shortName: 'UDFA', icon: 'add-circle', isRequired: false },
  { id: 'otas', name: 'OTAs', shortName: 'OTAs', icon: 'barbell', isRequired: false },
  {
    id: 'training_camp',
    name: 'Training Camp',
    shortName: 'Camp',
    icon: 'american-football',
    isRequired: true,
  },
  {
    id: 'preseason',
    name: 'Preseason',
    shortName: 'Preseason',
    icon: 'calendar',
    isRequired: true,
  },
  { id: 'final_cuts', name: 'Final Cuts', shortName: 'Cuts', icon: 'cut', isRequired: true },
  { id: 'season_start', name: 'Season Start', shortName: 'Start', icon: 'play', isRequired: true },
];

export interface OffseasonProgressBarProps {
  /** Current phase index (0-11) */
  currentPhaseIndex: number;
  /** Array of completed phase IDs */
  completedPhases: OffseasonPhase[];
  /** Handler when a phase is tapped (for navigation) */
  onPhasePress?: (phase: PhaseInfo, index: number) => void;
  /** Whether to show full names or short names */
  compact?: boolean;
  /** Test ID */
  testID?: string;
}

/**
 * Horizontal progress bar showing offseason phase progression.
 *
 * @example
 * <OffseasonProgressBar
 *   currentPhaseIndex={4}
 *   completedPhases={['season_end', 'coaching_decisions', 'contract_management', 'combine']}
 *   onPhasePress={(phase) => navigateTo(phase.id)}
 * />
 */
export const OffseasonProgressBar: React.FC<OffseasonProgressBarProps> = ({
  currentPhaseIndex,
  completedPhases,
  onPhasePress,
  compact = false,
  testID,
}) => {
  const progress = completedPhases.length / OFFSEASON_PHASES.length;

  const isCompleted = (phase: PhaseInfo) => completedPhases.includes(phase.id);
  const isCurrent = (index: number) => index === currentPhaseIndex;
  const canNavigate = (phase: PhaseInfo, index: number) =>
    onPhasePress && (isCompleted(phase) || isCurrent(index));

  return (
    <View style={styles.container} testID={testID}>
      {/* Progress summary */}
      <View style={styles.header}>
        <Text style={styles.title}>Offseason Progress</Text>
        <Text style={styles.progressText}>
          {completedPhases.length} of {OFFSEASON_PHASES.length} phases
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      {/* Phase indicators */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.phasesContainer}
      >
        {OFFSEASON_PHASES.map((phase, index) => {
          const completed = isCompleted(phase);
          const current = isCurrent(index);
          const navigable = canNavigate(phase, index);

          return (
            <TouchableOpacity
              key={phase.id}
              style={[
                styles.phaseItem,
                completed && styles.phaseCompleted,
                current && styles.phaseCurrent,
              ]}
              onPress={navigable ? () => onPhasePress?.(phase, index) : undefined}
              disabled={!navigable}
              accessibilityLabel={`${phase.name}${completed ? ', completed' : current ? ', current phase' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: !navigable, selected: current }}
              hitSlop={accessibility.hitSlop}
            >
              <View
                style={[
                  styles.phaseIcon,
                  completed && styles.phaseIconCompleted,
                  current && styles.phaseIconCurrent,
                ]}
              >
                {completed ? (
                  <Ionicons name="checkmark" size={16} color={colors.textOnPrimary} />
                ) : (
                  <Ionicons
                    name={phase.icon}
                    size={16}
                    color={current ? colors.textOnPrimary : colors.textLight}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.phaseName,
                  completed && styles.phaseNameCompleted,
                  current && styles.phaseNameCurrent,
                ]}
                numberOfLines={1}
              >
                {compact ? phase.shortName : phase.name}
              </Text>
              {phase.isRequired && !completed && <View style={styles.requiredDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Current phase callout */}
      {currentPhaseIndex < OFFSEASON_PHASES.length && (
        <View style={styles.currentPhaseCallout}>
          <Ionicons name="arrow-forward-circle" size={20} color={colors.primary} />
          <Text style={styles.currentPhaseText}>
            Current: {OFFSEASON_PHASES[currentPhaseIndex].name}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
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
  progressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  progressBarContainer: {
    marginBottom: spacing.md,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: borderRadius.full,
  },
  phasesContainer: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  phaseItem: {
    alignItems: 'center',
    minWidth: 60,
    paddingHorizontal: spacing.xs,
    opacity: 0.5,
  },
  phaseCompleted: {
    opacity: 1,
  },
  phaseCurrent: {
    opacity: 1,
  },
  phaseIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  phaseIconCompleted: {
    backgroundColor: colors.success,
  },
  phaseIconCurrent: {
    backgroundColor: colors.primary,
  },
  phaseName: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'center',
  },
  phaseNameCompleted: {
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  phaseNameCurrent: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  requiredDot: {
    position: 'absolute',
    top: 0,
    right: spacing.sm,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.error,
  },
  currentPhaseCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  currentPhaseText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});

export default OffseasonProgressBar;

/**
 * SimControls Component
 * Control buttons for game simulation: Watch Play, Quick Sim, Sim Quarter, Sim to End.
 *
 * PRIVACY: This component only triggers simulation actions,
 * never exposes probabilities or internal mechanics.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../styles';

/**
 * Simulation mode types
 */
export type SimulationMode = 'play' | 'drive' | 'quarter' | 'end';

export interface SimControlsProps {
  /** Called when user wants to watch a single play */
  onWatchPlay: () => void;
  /** Called when user wants to quick sim a drive */
  onQuickSim: () => void;
  /** Called when user wants to sim to end of quarter */
  onSimQuarter: () => void;
  /** Called when user wants to sim to end of game */
  onSimToEnd: () => void;
  /** Is the game currently simulating */
  isSimulating?: boolean;
  /** Current simulation mode if simulating */
  currentMode?: SimulationMode | null;
  /** Is the game over */
  isGameOver?: boolean;
  /** Optional callback to view box score */
  onViewBoxScore?: () => void;
}

interface ControlButtonProps {
  label: string;
  sublabel?: string;
  onPress: () => void;
  disabled?: boolean;
  isActive?: boolean;
  variant?: 'primary' | 'secondary' | 'accent';
  icon?: string;
}

/**
 * Individual control button
 */
function ControlButton({
  label,
  sublabel,
  onPress,
  disabled = false,
  isActive = false,
  variant = 'primary',
  icon,
}: ControlButtonProps): React.JSX.Element {
  const buttonStyle = [
    styles.button,
    variant === 'secondary' && styles.buttonSecondary,
    variant === 'accent' && styles.buttonAccent,
    disabled && styles.buttonDisabled,
    isActive && styles.buttonActive,
  ];

  const textStyle = [
    styles.buttonText,
    variant === 'secondary' && styles.buttonTextSecondary,
    variant === 'accent' && styles.buttonTextAccent,
    disabled && styles.buttonTextDisabled,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {isActive ? (
        <ActivityIndicator size="small" color={colors.textOnPrimary} />
      ) : (
        <>
          {icon && <Text style={styles.buttonIcon}>{icon}</Text>}
          <Text style={textStyle}>{label}</Text>
          {sublabel && <Text style={styles.sublabelText}>{sublabel}</Text>}
        </>
      )}
    </TouchableOpacity>
  );
}

/**
 * SimControls Component
 */
export function SimControls({
  onWatchPlay,
  onQuickSim,
  onSimQuarter,
  onSimToEnd,
  isSimulating = false,
  currentMode = null,
  isGameOver = false,
  onViewBoxScore,
}: SimControlsProps): React.JSX.Element {
  // If game is over, show different controls
  if (isGameOver) {
    return (
      <View style={styles.container}>
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverText}>GAME COMPLETE</Text>
          {onViewBoxScore && (
            <TouchableOpacity
              style={styles.boxScoreButton}
              onPress={onViewBoxScore}
              activeOpacity={0.7}
            >
              <Text style={styles.boxScoreButtonText}>View Box Score</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Primary row - Main simulation controls */}
      <View style={styles.primaryRow}>
        <ControlButton
          label="Watch Play"
          icon="▶"
          onPress={onWatchPlay}
          disabled={isSimulating}
          isActive={isSimulating && currentMode === 'play'}
          variant="primary"
        />
        <ControlButton
          label="Quick Sim"
          sublabel="Drive"
          icon="⏩"
          onPress={onQuickSim}
          disabled={isSimulating}
          isActive={isSimulating && currentMode === 'drive'}
          variant="secondary"
        />
      </View>

      {/* Secondary row - Bulk simulation controls */}
      <View style={styles.secondaryRow}>
        <ControlButton
          label="Sim Quarter"
          icon="⏭"
          onPress={onSimQuarter}
          disabled={isSimulating}
          isActive={isSimulating && currentMode === 'quarter'}
          variant="secondary"
        />
        <ControlButton
          label="Sim to End"
          icon="⏮"
          onPress={onSimToEnd}
          disabled={isSimulating}
          isActive={isSimulating && currentMode === 'end'}
          variant="accent"
        />
      </View>

      {/* Status indicator */}
      {isSimulating && (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.statusText}>
            {currentMode === 'play' && 'Running play...'}
            {currentMode === 'drive' && 'Simulating drive...'}
            {currentMode === 'quarter' && 'Simulating quarter...'}
            {currentMode === 'end' && 'Simulating game...'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  primaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    ...shadows.sm,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  buttonAccent: {
    backgroundColor: colors.secondary,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
    borderColor: colors.border,
  },
  buttonActive: {
    backgroundColor: colors.primaryDark,
  },
  buttonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  buttonTextSecondary: {
    color: colors.primary,
  },
  buttonTextAccent: {
    color: colors.textOnPrimary,
  },
  buttonTextDisabled: {
    color: colors.textLight,
  },
  buttonIcon: {
    fontSize: fontSize.lg,
    marginBottom: spacing.xxs,
  },
  sublabelText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.xxs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  gameOverContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  gameOverText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.success,
    marginBottom: spacing.md,
  },
  boxScoreButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  boxScoreButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});

export default SimControls;

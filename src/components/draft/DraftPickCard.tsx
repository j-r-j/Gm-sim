/**
 * DraftPickCard Component
 * Displays the current draft pick information - which team is on the clock.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../styles';

export interface DraftPickCardProps {
  /** Current round (1-7) */
  round: number;
  /** Current pick number overall */
  pickNumber: number;
  /** Team name on the clock */
  teamName: string;
  /** Team abbreviation */
  teamAbbr: string;
  /** Whether this is the user's pick */
  isUserPick: boolean;
  /** Time remaining on the clock (seconds) */
  timeRemaining?: number;
  /** Whether the pick is being traded */
  isBeingTraded?: boolean;
  /** Original team if pick was traded */
  originalTeamAbbr?: string;
}

/**
 * Format time as MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get round suffix (1st, 2nd, 3rd, etc.)
 */
function getRoundSuffix(round: number): string {
  if (round === 1) return '1st';
  if (round === 2) return '2nd';
  if (round === 3) return '3rd';
  return `${round}th`;
}

/**
 * DraftPickCard Component
 */
export function DraftPickCard({
  round,
  pickNumber,
  teamName,
  teamAbbr,
  isUserPick,
  timeRemaining,
  isBeingTraded = false,
  originalTeamAbbr,
}: DraftPickCardProps): React.JSX.Element {
  return (
    <View style={[styles.container, isUserPick && styles.containerUserPick]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.roundText}>{getRoundSuffix(round)} Round</Text>
        <View style={styles.pickBadge}>
          <Text style={styles.pickNumber}>Pick #{pickNumber}</Text>
        </View>
      </View>

      {/* Team on the clock */}
      <View style={styles.teamSection}>
        <Text style={styles.onTheClockLabel}>ON THE CLOCK</Text>
        <View style={styles.teamInfo}>
          <Text style={styles.teamAbbr}>{teamAbbr}</Text>
          <Text style={styles.teamName}>{teamName}</Text>
        </View>
        {originalTeamAbbr && originalTeamAbbr !== teamAbbr && (
          <Text style={styles.tradedFrom}>(via {originalTeamAbbr})</Text>
        )}
      </View>

      {/* Status indicators */}
      <View style={styles.statusSection}>
        {isUserPick && (
          <View style={styles.userPickBadge}>
            <Text style={styles.userPickText}>YOUR PICK</Text>
          </View>
        )}
        {isBeingTraded && (
          <View style={styles.tradingBadge}>
            <Text style={styles.tradingText}>TRADE PENDING</Text>
          </View>
        )}
      </View>

      {/* Timer */}
      {timeRemaining !== undefined && (
        <View style={[styles.timerSection, timeRemaining < 60 && styles.timerUrgent]}>
          <Text style={[styles.timerText, timeRemaining < 60 && styles.timerTextUrgent]}>
            {formatTime(timeRemaining)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  containerUserPick: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  roundText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  pickBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  pickNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    fontVariant: ['tabular-nums'],
  },
  teamSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  onTheClockLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  teamInfo: {
    alignItems: 'center',
  },
  teamAbbr: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  teamName: {
    fontSize: fontSize.lg,
    color: colors.text,
    marginTop: spacing.xs,
  },
  tradedFrom: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  userPickBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  userPickText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  tradingBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  tradingText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  timerSection: {
    alignItems: 'center',
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  timerUrgent: {
    backgroundColor: colors.error + '20',
  },
  timerText: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  timerTextUrgent: {
    color: colors.error,
  },
});

export default DraftPickCard;

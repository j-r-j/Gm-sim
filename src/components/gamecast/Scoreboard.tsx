/**
 * Scoreboard Component
 * Displays game score, clock, quarter, and timeouts for both teams.
 *
 * PRIVACY: This component only displays outcome data,
 * never probabilities or internal mechanics.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../styles';

export interface ScoreboardProps {
  /** Home team name */
  homeTeamName: string;
  /** Home team abbreviation */
  homeTeamAbbr: string;
  /** Away team name */
  awayTeamName: string;
  /** Away team abbreviation */
  awayTeamAbbr: string;
  /** Home team score */
  homeScore: number;
  /** Away team score */
  awayScore: number;
  /** Current quarter (1-4, 5+ for OT) */
  quarter: number | 'OT';
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Home team timeouts remaining (0-3) */
  homeTimeouts: number;
  /** Away team timeouts remaining (0-3) */
  awayTimeouts: number;
  /** Which team has possession */
  possession: 'home' | 'away' | null;
  /** Is the game complete */
  isGameOver?: boolean;
}

/**
 * Format time remaining as MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format quarter display
 */
function formatQuarter(quarter: number | 'OT'): string {
  if (quarter === 'OT') return 'OT';
  if (quarter > 4) return `OT${quarter - 4}`;
  return `Q${quarter}`;
}

/**
 * Timeout indicator dots
 */
function TimeoutIndicator({
  remaining,
  isHome,
}: {
  remaining: number;
  isHome: boolean;
}): React.JSX.Element {
  const dots = [];
  for (let i = 0; i < 3; i++) {
    dots.push(
      <View
        key={i}
        style={[
          styles.timeoutDot,
          i < remaining && (isHome ? styles.timeoutDotHomeActive : styles.timeoutDotAwayActive),
        ]}
      />
    );
  }
  return (
    <View
      style={[
        styles.timeoutContainer,
        isHome ? styles.timeoutContainerHome : styles.timeoutContainerAway,
      ]}
    >
      {dots}
    </View>
  );
}

/**
 * Scoreboard Component
 */
export function Scoreboard({
  homeTeamName,
  homeTeamAbbr,
  awayTeamName,
  awayTeamAbbr,
  homeScore,
  awayScore,
  quarter,
  timeRemaining,
  homeTimeouts,
  awayTimeouts,
  possession,
  isGameOver = false,
}: ScoreboardProps): React.JSX.Element {
  const homeWinning = homeScore > awayScore;
  const awayWinning = awayScore > homeScore;
  const tied = homeScore === awayScore;

  return (
    <View style={styles.container}>
      {/* Clock Section */}
      <View style={styles.clockSection}>
        <View style={styles.quarterContainer}>
          <Text style={styles.quarterText}>{formatQuarter(quarter)}</Text>
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{isGameOver ? 'FINAL' : formatTime(timeRemaining)}</Text>
        </View>
      </View>

      {/* Score Section */}
      <View style={styles.scoresSection}>
        {/* Home Team */}
        <View style={styles.teamSection}>
          <View style={styles.teamInfo}>
            {possession === 'home' && (
              <View style={styles.possessionIndicator}>
                <Text style={styles.possessionArrow}>●</Text>
              </View>
            )}
            <View style={styles.teamNameContainer}>
              <Text style={styles.teamAbbr}>{homeTeamAbbr}</Text>
              <Text style={styles.teamName} numberOfLines={1}>
                {homeTeamName}
              </Text>
            </View>
          </View>
          <View style={[styles.scoreContainer, homeWinning && styles.scoreContainerWinning]}>
            <Text style={[styles.scoreText, homeWinning && styles.scoreTextWinning]}>
              {homeScore}
            </Text>
          </View>
          <TimeoutIndicator remaining={homeTimeouts} isHome={true} />
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Away Team */}
        <View style={styles.teamSection}>
          <View style={styles.teamInfo}>
            {possession === 'away' && (
              <View style={styles.possessionIndicator}>
                <Text style={styles.possessionArrow}>●</Text>
              </View>
            )}
            <View style={styles.teamNameContainer}>
              <Text style={styles.teamAbbr}>{awayTeamAbbr}</Text>
              <Text style={styles.teamName} numberOfLines={1}>
                {awayTeamName}
              </Text>
            </View>
          </View>
          <View style={[styles.scoreContainer, awayWinning && styles.scoreContainerWinning]}>
            <Text style={[styles.scoreText, awayWinning && styles.scoreTextWinning]}>
              {awayScore}
            </Text>
          </View>
          <TimeoutIndicator remaining={awayTimeouts} isHome={false} />
        </View>
      </View>

      {/* Status Bar */}
      {isGameOver && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            {tied ? 'FINAL - TIE' : `FINAL - ${homeWinning ? homeTeamName : awayTeamName} WIN`}
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
    overflow: 'hidden',
    ...shadows.md,
  },
  clockSection: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  quarterContainer: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  quarterText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  timeContainer: {
    minWidth: 80,
    alignItems: 'center',
  },
  timeText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  scoresSection: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  teamSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  teamInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  possessionIndicator: {
    marginRight: spacing.sm,
  },
  possessionArrow: {
    color: colors.primary,
    fontSize: fontSize.sm,
  },
  teamNameContainer: {
    flex: 1,
  },
  teamAbbr: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  teamName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  scoreContainer: {
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  scoreContainerWinning: {
    backgroundColor: colors.primary,
  },
  scoreText: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  scoreTextWinning: {
    color: colors.textOnPrimary,
  },
  timeoutContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginLeft: spacing.md,
  },
  timeoutContainerHome: {
    flexDirection: 'row',
  },
  timeoutContainerAway: {
    flexDirection: 'row',
  },
  timeoutDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  timeoutDotHomeActive: {
    backgroundColor: colors.homeTeam,
    borderColor: colors.homeTeam,
  },
  timeoutDotAwayActive: {
    backgroundColor: colors.awayTeam,
    borderColor: colors.awayTeam,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  statusBar: {
    backgroundColor: colors.success,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  statusText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});

export default Scoreboard;

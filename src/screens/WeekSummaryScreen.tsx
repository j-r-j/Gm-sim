/**
 * WeekSummaryScreen
 * Shows summary of all game results for a completed week
 * Includes standings impact and playoff implications
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../styles';

/**
 * Game result for display
 */
export interface WeekGameResult {
  gameId: string;
  homeTeam: {
    id: string;
    abbr: string;
    name: string;
  };
  awayTeam: {
    id: string;
    abbr: string;
    name: string;
  };
  homeScore: number;
  awayScore: number;
  isUserGame: boolean;
  isUpset: boolean;
}

/**
 * Division standing entry
 */
export interface DivisionStandingEntry {
  teamId: string;
  abbr: string;
  wins: number;
  losses: number;
  isUserTeam: boolean;
  playoffPosition: 'leader' | 'wildcard' | 'in_hunt' | 'out';
  gamesBehind: number;
}

/**
 * Playoff implication
 */
export interface PlayoffImplication {
  teamId: string;
  teamName: string;
  type: 'clinched_division' | 'clinched_playoff' | 'eliminated' | 'controls_destiny';
  description: string;
}

/**
 * Props for WeekSummaryScreen
 */
export interface WeekSummaryScreenProps {
  /** Week number */
  week: number;
  /** Season phase */
  phase: string;
  /** All game results for this week */
  results: WeekGameResult[];
  /** User's team result summary */
  userResult: {
    won: boolean;
    score: string;
    opponent: string;
    newRecord: string;
  } | null;
  /** User's division standings */
  divisionStandings: DivisionStandingEntry[];
  /** User's conference name */
  conference: string;
  /** User's division name */
  division: string;
  /** Playoff implications this week */
  playoffImplications: PlayoffImplication[];
  /** Career record (total wins-losses) */
  careerRecord: {
    wins: number;
    losses: number;
    seasons: number;
  };
  /** Callback to advance to next week */
  onAdvanceWeek: () => void;
  /** Callback to view full standings */
  onViewStandings: () => void;
  /** Callback to view playoff bracket (if in playoffs) */
  onViewBracket?: () => void;
  /** Callback to go back */
  onBack: () => void;
}

/**
 * Get playoff round name
 */
function getPlayoffRoundName(week: number): string {
  switch (week) {
    case 19:
      return 'Wild Card Round';
    case 20:
      return 'Divisional Round';
    case 21:
      return 'Conference Championships';
    case 22:
      return 'Super Bowl';
    default:
      return `Week ${week}`;
  }
}

/**
 * Single game result row
 */
function GameResultRow({ result }: { result: WeekGameResult }): React.JSX.Element {
  const homeWon = result.homeScore > result.awayScore;
  const awayWon = result.awayScore > result.homeScore;

  return (
    <View style={[styles.resultRow, result.isUserGame && styles.userResultRow]}>
      <View style={styles.teamScore}>
        <Text style={[styles.teamAbbr, awayWon && styles.winnerText]}>{result.awayTeam.abbr}</Text>
        <Text style={[styles.scoreText, awayWon && styles.winnerText]}>{result.awayScore}</Text>
      </View>
      <Text style={styles.atText}>@</Text>
      <View style={styles.teamScore}>
        <Text style={[styles.teamAbbr, homeWon && styles.winnerText]}>{result.homeTeam.abbr}</Text>
        <Text style={[styles.scoreText, homeWon && styles.winnerText]}>{result.homeScore}</Text>
      </View>
      {result.isUpset && <Text style={styles.upsetBadge}>UPSET</Text>}
    </View>
  );
}

/**
 * Division standings mini view
 */
function DivisionMiniStandings({
  conference,
  division,
  standings,
}: {
  conference: string;
  division: string;
  standings: DivisionStandingEntry[];
}): React.JSX.Element {
  return (
    <View style={styles.divisionCard}>
      <Text style={styles.divisionTitle}>
        {conference} {division}
      </Text>
      {standings.map((team, index) => (
        <View
          key={team.teamId}
          style={[styles.standingRow, team.isUserTeam && styles.userStandingRow]}
        >
          <Text style={styles.standingRank}>{index + 1}.</Text>
          <Text style={[styles.standingAbbr, team.isUserTeam && styles.userText]}>{team.abbr}</Text>
          <Text style={[styles.standingRecord, team.isUserTeam && styles.userText]}>
            {team.wins}-{team.losses}
          </Text>
          {team.gamesBehind > 0 && <Text style={styles.gamesBehind}>-{team.gamesBehind}</Text>}
          {team.playoffPosition === 'leader' && <Text style={styles.playoffBadge}>DIV</Text>}
          {team.playoffPosition === 'wildcard' && (
            <Text style={[styles.playoffBadge, styles.wildcardBadge]}>WC</Text>
          )}
        </View>
      ))}
    </View>
  );
}

export function WeekSummaryScreen({
  week,
  phase,
  results,
  userResult,
  divisionStandings,
  conference,
  division,
  playoffImplications,
  careerRecord,
  onAdvanceWeek,
  onViewStandings,
  onViewBracket,
  onBack,
}: WeekSummaryScreenProps): React.JSX.Element {
  const weekTitle = phase === 'playoffs' ? getPlayoffRoundName(week) : `Week ${week}`;
  const isPlayoffs = phase === 'playoffs';

  // Calculate career winning percentage
  const careerWinPct =
    careerRecord.wins + careerRecord.losses > 0
      ? ((careerRecord.wins / (careerRecord.wins + careerRecord.losses)) * 100).toFixed(1)
      : '0.0';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{weekTitle} Summary</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User's Game Result */}
        {userResult && (
          <View style={[styles.section, styles.userResultSection]}>
            <View
              style={[styles.userResultCard, userResult.won ? styles.winCard : styles.lossCard]}
            >
              <Text style={styles.userResultLabel}>YOUR RESULT</Text>
              <Text style={styles.userResultOutcome}>{userResult.won ? 'VICTORY!' : 'DEFEAT'}</Text>
              <Text style={styles.userResultScore}>{userResult.score}</Text>
              <Text style={styles.userResultOpponent}>vs {userResult.opponent}</Text>
              <View style={styles.recordContainer}>
                <Text style={styles.recordLabel}>Season Record:</Text>
                <Text style={styles.recordValue}>{userResult.newRecord}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Career Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Career Record</Text>
          <View style={styles.careerCard}>
            <View style={styles.careerStat}>
              <Text style={styles.careerStatValue}>
                {careerRecord.wins}-{careerRecord.losses}
              </Text>
              <Text style={styles.careerStatLabel}>Total Record</Text>
            </View>
            <View style={styles.careerStat}>
              <Text style={styles.careerStatValue}>{careerWinPct}%</Text>
              <Text style={styles.careerStatLabel}>Win Pct</Text>
            </View>
            <View style={styles.careerStat}>
              <Text style={styles.careerStatValue}>{careerRecord.seasons}</Text>
              <Text style={styles.careerStatLabel}>Seasons</Text>
            </View>
          </View>
        </View>

        {/* Division Standings */}
        {!isPlayoffs && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Division Standings</Text>
              <TouchableOpacity onPress={onViewStandings}>
                <Text style={styles.viewAllLink}>View All →</Text>
              </TouchableOpacity>
            </View>
            <DivisionMiniStandings
              conference={conference}
              division={division}
              standings={divisionStandings}
            />
          </View>
        )}

        {/* Playoff Implications */}
        {playoffImplications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Playoff Implications</Text>
            {playoffImplications.map((impl, index) => (
              <View
                key={index}
                style={[
                  styles.implicationCard,
                  impl.type === 'clinched_division' && styles.clinchCard,
                  impl.type === 'clinched_playoff' && styles.clinchCard,
                  impl.type === 'eliminated' && styles.eliminatedCard,
                ]}
              >
                <Text style={styles.implicationTeam}>{impl.teamName}</Text>
                <Text style={styles.implicationText}>{impl.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* All Game Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Results</Text>
          <View style={styles.resultsCard}>
            {results.map((result) => (
              <GameResultRow key={result.gameId} result={result} />
            ))}
          </View>
        </View>

        {/* Playoff Bracket Button (if in playoffs) */}
        {isPlayoffs && onViewBracket && (
          <TouchableOpacity style={styles.bracketButton} onPress={onViewBracket}>
            <Text style={styles.bracketButtonText}>View Playoff Bracket</Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Advance Button */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.advanceButton} onPress={onAdvanceWeek} activeOpacity={0.8}>
          <Text style={styles.advanceButtonText}>
            {isPlayoffs && week >= 22 ? 'End Season' : 'Advance to Next Week'}
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: spacing.xs,
    width: 60,
  },
  backText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  viewAllLink: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  userResultSection: {
    paddingTop: spacing.lg,
  },
  userResultCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  winCard: {
    backgroundColor: colors.success + '20',
    borderWidth: 2,
    borderColor: colors.success,
  },
  lossCard: {
    backgroundColor: colors.error + '20',
    borderWidth: 2,
    borderColor: colors.error,
  },
  userResultLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  userResultOutcome: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  userResultScore: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  userResultOpponent: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  recordContainer: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  recordLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  recordValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  careerCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  careerStat: {
    flex: 1,
    alignItems: 'center',
  },
  careerStatValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  careerStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  divisionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  divisionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userStandingRow: {
    backgroundColor: colors.primaryLight,
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  standingRank: {
    width: 20,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  standingAbbr: {
    width: 40,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  standingRecord: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  userText: {
    color: colors.primary,
  },
  gamesBehind: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  playoffBadge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  wildcardBadge: {
    backgroundColor: colors.warning,
  },
  implicationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.border,
  },
  clinchCard: {
    borderLeftColor: colors.success,
    backgroundColor: colors.success + '10',
  },
  eliminatedCard: {
    borderLeftColor: colors.error,
    backgroundColor: colors.error + '10',
  },
  implicationTeam: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  implicationText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  resultsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    ...shadows.sm,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  userResultRow: {
    backgroundColor: colors.primaryLight,
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  teamScore: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
    justifyContent: 'space-between',
  },
  teamAbbr: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  scoreText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  winnerText: {
    color: colors.success,
  },
  atText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    width: 20,
    textAlign: 'center',
  },
  upsetBadge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.warning,
    marginLeft: spacing.sm,
  },
  bracketButton: {
    backgroundColor: colors.secondary,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  bracketButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  bottomPadding: {
    height: spacing.xl,
  },
  actionBar: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  advanceButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  advanceButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
});

export default WeekSummaryScreen;

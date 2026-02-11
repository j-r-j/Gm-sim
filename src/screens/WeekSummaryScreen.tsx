/**
 * WeekSummaryScreen
 * Shows a summary of the week's results after the user's game.
 *
 * Features:
 * - Hero card for user's game result (score, key stats, MVP)
 * - Compact grid of other game scores
 * - Collapsible division standings snapshot
 * - Headlines and injury updates
 * - Sticky "Advance to Week N+1" CTA
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  accessibility,
} from '../styles';
import { ScreenHeader } from '../components';

/**
 * Props for WeekSummaryScreen
 */
export interface WeekSummaryScreenProps {
  userGameResult: {
    userTeam: { name: string; abbreviation: string; score: number };
    opponent: { name: string; abbreviation: string; score: number };
    isWin: boolean;
    keyStats: string;
    mvp?: string;
  };
  otherGames: Array<{
    homeTeam: { name: string; abbreviation: string; score: number };
    awayTeam: { name: string; abbreviation: string; score: number };
  }>;
  standings: Array<{
    teamName: string;
    wins: number;
    losses: number;
    ties: number;
    isUserTeam: boolean;
  }>;
  headlines: string[];
  injuryUpdates: string[];
  currentWeek: number;
  onAdvance: () => void;
  isAdvancing: boolean;
}

/**
 * Hero card showing user's game result
 */
function HeroCard({
  userGameResult,
}: {
  userGameResult: WeekSummaryScreenProps['userGameResult'];
}): React.JSX.Element {
  const { userTeam, opponent, isWin, keyStats, mvp } = userGameResult;
  const isTie = userTeam.score === opponent.score;

  const resultLabel = isTie ? 'TIE' : isWin ? 'VICTORY' : 'DEFEAT';
  const bannerStyle = isTie
    ? styles.heroBannerTie
    : isWin
      ? styles.heroBannerWin
      : styles.heroBannerLoss;

  return (
    <View
      style={styles.heroCard}
      accessibilityLabel={`Your game result: ${userTeam.abbreviation} ${userTeam.score}, ${opponent.abbreviation} ${opponent.score}. ${resultLabel}`}
    >
      <View style={[styles.heroBanner, bannerStyle]}>
        <Text style={styles.heroBannerText}>{resultLabel}</Text>
      </View>

      <View style={styles.heroContent}>
        {/* Matchup scores */}
        <View style={styles.heroMatchup}>
          <View style={styles.heroTeamBlock}>
            <Text style={styles.heroTeamAbbr}>{userTeam.abbreviation}</Text>
            <Text
              style={[
                styles.heroScore,
                isWin && styles.heroScoreWinner,
                isTie && styles.heroScoreTie,
              ]}
            >
              {userTeam.score}
            </Text>
          </View>

          <View style={styles.heroVsDivider}>
            <Text style={styles.heroVsText}>-</Text>
            <Text style={styles.heroFinalLabel}>FINAL</Text>
          </View>

          <View style={styles.heroTeamBlock}>
            <Text style={styles.heroTeamAbbr}>{opponent.abbreviation}</Text>
            <Text
              style={[
                styles.heroScore,
                !isWin && !isTie && styles.heroScoreWinner,
                isTie && styles.heroScoreTie,
              ]}
            >
              {opponent.score}
            </Text>
          </View>
        </View>

        {/* Key stats */}
        <Text style={styles.heroKeyStats} accessibilityLabel={`Key stats: ${keyStats}`}>
          {keyStats}
        </Text>

        {/* MVP */}
        {mvp && (
          <View style={styles.heroMvpRow}>
            <Text style={styles.heroMvpLabel}>MVP</Text>
            <Text style={styles.heroMvpName} accessibilityLabel={`Game MVP: ${mvp}`}>
              {mvp}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Compact score row for other games
 */
function OtherGameRow({
  game,
}: {
  game: WeekSummaryScreenProps['otherGames'][number];
}): React.JSX.Element {
  const homeWon = game.homeTeam.score > game.awayTeam.score;
  const awayWon = game.awayTeam.score > game.homeTeam.score;

  return (
    <View
      style={styles.otherGameRow}
      accessibilityLabel={`${game.awayTeam.abbreviation} ${game.awayTeam.score} at ${game.homeTeam.abbreviation} ${game.homeTeam.score}, Final`}
    >
      <View style={styles.otherGameTeamRow}>
        <Text style={[styles.otherGameAbbr, awayWon && styles.otherGameWinner]}>
          {game.awayTeam.abbreviation}
        </Text>
        <Text style={[styles.otherGameScore, awayWon && styles.otherGameWinner]}>
          {game.awayTeam.score}
        </Text>
      </View>
      <View style={styles.otherGameTeamRow}>
        <Text style={[styles.otherGameAbbr, homeWon && styles.otherGameWinner]}>
          {game.homeTeam.abbreviation}
        </Text>
        <Text style={[styles.otherGameScore, homeWon && styles.otherGameWinner]}>
          {game.homeTeam.score}
        </Text>
      </View>
      <Text style={styles.otherGameFinal}>FINAL</Text>
    </View>
  );
}

/**
 * Standings table row
 */
function StandingsRow({
  entry,
  leaderWins,
}: {
  entry: WeekSummaryScreenProps['standings'][number];
  leaderWins: number;
}): React.JSX.Element {
  const record = `${entry.wins}-${entry.losses}${entry.ties > 0 ? `-${entry.ties}` : ''}`;
  const gb = calculateGB(entry.wins, leaderWins);

  return (
    <View
      style={[styles.standingsRow, entry.isUserTeam && styles.standingsUserRow]}
      accessibilityLabel={`${entry.teamName}, Record ${record}, Games back ${gb}${entry.isUserTeam ? ', Your team' : ''}`}
    >
      <Text
        style={[styles.standingsTeam, entry.isUserTeam && styles.standingsUserText]}
        numberOfLines={1}
      >
        {entry.teamName}
      </Text>
      <Text style={[styles.standingsCell, entry.isUserTeam && styles.standingsUserText]}>
        {entry.wins}
      </Text>
      <Text style={[styles.standingsCell, entry.isUserTeam && styles.standingsUserText]}>
        {entry.losses}
      </Text>
      <Text style={[styles.standingsCell, entry.isUserTeam && styles.standingsUserText]}>
        {entry.ties}
      </Text>
      <Text style={[styles.standingsCell, entry.isUserTeam && styles.standingsUserText]}>{gb}</Text>
    </View>
  );
}

/**
 * Calculate games back from the division leader
 */
function calculateGB(wins: number, leaderWins: number): string {
  const diff = leaderWins - wins;
  if (diff === 0) return '-';
  return String(diff);
}

/**
 * Main WeekSummaryScreen component
 */
export function WeekSummaryScreen({
  userGameResult,
  otherGames,
  standings,
  headlines,
  injuryUpdates,
  currentWeek,
  onAdvance,
  isAdvancing,
}: WeekSummaryScreenProps): React.JSX.Element {
  const [standingsExpanded, setStandingsExpanded] = useState(false);

  const sortedStandings = [...standings].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return 0;
  });
  const leaderWins = sortedStandings.length > 0 ? sortedStandings[0].wins : 0;

  // Split other games into two columns
  const leftColumn = otherGames.filter((_, i) => i % 2 === 0);
  const rightColumn = otherGames.filter((_, i) => i % 2 === 1);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={`Week ${currentWeek} Summary`} testID="week-summary-header" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Hero Card - User's Game Result */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel} accessibilityRole="header">
            YOUR GAME
          </Text>
          <HeroCard userGameResult={userGameResult} />
        </View>

        {/* 2. Other Scores Grid */}
        {otherGames.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel} accessibilityRole="header">
              OTHER SCORES
            </Text>
            <View style={styles.otherGamesGrid}>
              <View style={styles.otherGamesColumn}>
                {leftColumn.map((game, index) => (
                  <OtherGameRow key={`left-${index}`} game={game} />
                ))}
              </View>
              <View style={styles.otherGamesColumn}>
                {rightColumn.map((game, index) => (
                  <OtherGameRow key={`right-${index}`} game={game} />
                ))}
              </View>
            </View>
          </View>
        )}

        {/* 3. Standings Snapshot (collapsible) */}
        {standings.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.standingsToggle}
              onPress={() => setStandingsExpanded(!standingsExpanded)}
              activeOpacity={0.7}
              accessibilityLabel={`Division standings, ${standingsExpanded ? 'tap to collapse' : 'tap to expand'}`}
              accessibilityRole="button"
              hitSlop={accessibility.hitSlop}
            >
              <Text style={styles.sectionLabel}>DIVISION STANDINGS</Text>
              <Text style={styles.standingsChevron}>{standingsExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {standingsExpanded && (
              <View style={styles.standingsCard}>
                {/* Header */}
                <View style={styles.standingsHeaderRow}>
                  <Text style={styles.standingsHeaderTeam}>Team</Text>
                  <Text style={styles.standingsHeaderCell}>W</Text>
                  <Text style={styles.standingsHeaderCell}>L</Text>
                  <Text style={styles.standingsHeaderCell}>T</Text>
                  <Text style={styles.standingsHeaderCell}>GB</Text>
                </View>
                {sortedStandings.map((entry, index) => (
                  <StandingsRow key={`standing-${index}`} entry={entry} leaderWins={leaderWins} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* 4. Headlines */}
        {headlines.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel} accessibilityRole="header">
              HEADLINES
            </Text>
            <View style={styles.headlinesCard}>
              {headlines.map((headline, index) => (
                <View
                  key={`headline-${index}`}
                  style={[
                    styles.headlineRow,
                    index < headlines.length - 1 && styles.headlineRowBorder,
                  ]}
                  accessibilityLabel={headline}
                >
                  <Text style={styles.headlineBullet}>*</Text>
                  <Text style={styles.headlineText}>{headline}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Injury Updates */}
        {injuryUpdates.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel} accessibilityRole="header">
              INJURY REPORT
            </Text>
            <View style={styles.injuryCard}>
              {injuryUpdates.map((update, index) => (
                <View
                  key={`injury-${index}`}
                  style={[
                    styles.injuryRow,
                    index < injuryUpdates.length - 1 && styles.injuryRowBorder,
                  ]}
                  accessibilityLabel={`Injury update: ${update}`}
                >
                  <Text style={styles.injuryIcon}>+</Text>
                  <Text style={styles.injuryText}>{update}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bottom padding for sticky button */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* 5. Sticky CTA Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.advanceButton, isAdvancing && styles.advanceButtonDisabled]}
          onPress={onAdvance}
          disabled={isAdvancing}
          activeOpacity={0.8}
          accessibilityLabel={`Advance to Week ${currentWeek + 1}`}
          accessibilityRole="button"
          hitSlop={accessibility.hitSlop}
        >
          {isAdvancing ? (
            <View style={styles.advanceButtonContent}>
              <ActivityIndicator color={colors.textOnPrimary} size="small" />
              <Text style={styles.advanceButtonText}>Advancing...</Text>
            </View>
          ) : (
            <Text style={styles.advanceButtonText}>Advance to Week {currentWeek + 1}</Text>
          )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },

  // Sections
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },

  // Hero Card
  heroCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    ...shadows.lg,
  },
  heroBanner: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  heroBannerWin: {
    backgroundColor: colors.success,
  },
  heroBannerLoss: {
    backgroundColor: colors.error,
  },
  heroBannerTie: {
    backgroundColor: colors.warning,
  },
  heroBannerText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    letterSpacing: 2,
  },
  heroContent: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  heroMatchup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTeamBlock: {
    alignItems: 'center',
    minWidth: 80,
  },
  heroTeamAbbr: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  heroScore: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  heroScoreWinner: {
    color: colors.success,
  },
  heroScoreTie: {
    color: colors.warning,
  },
  heroVsDivider: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  heroVsText: {
    fontSize: fontSize.xl,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  heroFinalLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.bold,
    marginTop: spacing.xs,
  },
  heroKeyStats: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroMvpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  heroMvpLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginRight: spacing.sm,
  },
  heroMvpName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },

  // Other Games Grid
  otherGamesGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  otherGamesColumn: {
    flex: 1,
    gap: spacing.sm,
  },
  otherGameRow: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  otherGameTeamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xxs,
  },
  otherGameAbbr: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  otherGameScore: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  otherGameWinner: {
    color: colors.success,
  },
  otherGameFinal: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },

  // Standings
  standingsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: accessibility.minTouchTarget,
  },
  standingsChevron: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  standingsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  standingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  standingsHeaderTeam: {
    flex: 1,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  standingsHeaderCell: {
    width: 32,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  standingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  standingsUserRow: {
    backgroundColor: colors.primaryLight + '15',
  },
  standingsTeam: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  standingsCell: {
    width: 32,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  standingsUserText: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },

  // Headlines
  headlinesCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  headlineRow: {
    flexDirection: 'row',
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  headlineRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headlineBullet: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginRight: spacing.sm,
    marginTop: 1,
  },
  headlineText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },

  // Injury Updates
  injuryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    ...shadows.sm,
  },
  injuryRow: {
    flexDirection: 'row',
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  injuryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  injuryIcon: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.error,
    marginRight: spacing.sm,
    marginTop: 1,
  },
  injuryText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },

  // Bottom
  bottomSpacer: {
    height: 100,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  advanceButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: accessibility.minTouchTarget,
    ...shadows.md,
  },
  advanceButtonDisabled: {
    opacity: 0.7,
  },
  advanceButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  advanceButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
});

export default WeekSummaryScreen;

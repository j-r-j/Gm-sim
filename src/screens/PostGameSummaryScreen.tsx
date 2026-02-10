/**
 * PostGameSummaryScreen
 * Shows detailed game results after completion
 *
 * Features:
 * - Final score with team records
 * - Box score (passing, rushing, receiving leaders)
 * - Key plays / turning points
 * - Player of the game
 * - Clear "Continue" CTA
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
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
import { BoxScore, PlayerStatLine } from '../core/game/BoxScoreGenerator';
import { PlayResult } from '../core/engine/PlayResolver';

/**
 * Props for PostGameSummaryScreen
 */
export interface PostGameSummaryScreenProps {
  /** Was it a win for the user? */
  isWin: boolean;
  /** Final scores */
  homeScore: number;
  awayScore: number;
  /** Team info */
  homeTeam: {
    name: string;
    abbr: string;
    record: string;
    isUser: boolean;
  };
  awayTeam: {
    name: string;
    abbr: string;
    record: string;
    isUser: boolean;
  };
  /** Box score data */
  boxScore: BoxScore;
  /** Key plays from the game */
  keyPlays?: PlayResult[];
  /** Week number */
  week: number;
  /** Season phase */
  phase: string;
  /** Callback when user acknowledges (continue button) */
  onContinue: () => void;
  /** Callback to go back */
  onBack?: () => void;
}

/**
 * Stat leader card component
 */
function StatLeaderCard({
  title,
  leaders,
}: {
  title: string;
  leaders: PlayerStatLine[];
}): React.JSX.Element {
  if (leaders.length === 0) {
    return <View />;
  }

  return (
    <View style={styles.statCard} accessibilityLabel={`${title} leaders`}>
      <Text style={styles.statCardTitle} accessibilityRole="header">
        {title}
      </Text>
      {leaders.slice(0, 2).map((leader, index) => (
        <View
          key={`${leader.playerId}-${index}`}
          style={styles.leaderRow}
          accessibilityLabel={`${leader.playerName}, ${leader.position}, ${leader.statLine}`}
        >
          <View style={styles.leaderInfo}>
            <Text style={styles.leaderName}>{leader.playerName}</Text>
            <Text style={styles.leaderTeam}>{leader.position}</Text>
          </View>
          <Text style={styles.leaderStat}>{leader.statLine}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Team comparison stat row
 */
function ComparisonRow({
  label,
  homeValue,
  awayValue,
}: {
  label: string;
  homeValue: number | string;
  awayValue: number | string;
}): React.JSX.Element {
  const homeNum = typeof homeValue === 'number' ? homeValue : parseFloat(homeValue) || 0;
  const awayNum = typeof awayValue === 'number' ? awayValue : parseFloat(awayValue) || 0;
  const homeWins = homeNum > awayNum;
  const awayWins = awayNum > homeNum;

  return (
    <View
      style={styles.comparisonRow}
      accessibilityLabel={`${label}: Home ${homeValue}, Away ${awayValue}`}
    >
      <Text style={[styles.comparisonValue, homeWins && styles.comparisonWinner]}>{homeValue}</Text>
      <Text style={styles.comparisonLabel}>{label}</Text>
      <Text style={[styles.comparisonValue, awayWins && styles.comparisonWinner]}>{awayValue}</Text>
    </View>
  );
}

/**
 * Key play card
 */
function KeyPlayCard({ play }: { play: PlayResult }): React.JSX.Element {
  const getPlayIcon = () => {
    if (play.touchdown) return '🏈';
    if (play.turnover) return '⚠️';
    if (play.yardsGained >= 20) return '💨';
    if (play.outcome === 'field_goal_made') return '🥅';
    return '📋';
  };

  const playType = play.touchdown ? 'Touchdown' : play.turnover ? 'Turnover' : 'Key play';

  return (
    <View
      style={[
        styles.keyPlayCard,
        play.touchdown && styles.keyPlayTouchdown,
        play.turnover && styles.keyPlayTurnover,
      ]}
      accessibilityLabel={`${playType}: ${play.description}`}
    >
      <Text style={styles.keyPlayIcon}>{getPlayIcon()}</Text>
      <Text style={styles.keyPlayText} numberOfLines={2}>
        {play.description}
      </Text>
    </View>
  );
}

export function PostGameSummaryScreen({
  isWin,
  homeScore,
  awayScore,
  homeTeam,
  awayTeam,
  boxScore,
  keyPlays = [],
  week,
  phase,
  onContinue,
  onBack,
}: PostGameSummaryScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'summary' | 'boxscore'>('summary');
  const isTie = homeScore === awayScore;
  const homeWins = homeScore > awayScore;

  // Get week label
  const getWeekLabel = () => {
    if (phase === 'playoffs') {
      switch (week) {
        case 19:
          return 'Wild Card';
        case 20:
          return 'Divisional Round';
        case 21:
          return 'Conference Championship';
        case 22:
          return 'Super Bowl';
        default:
          return `Playoff Week ${week - 18}`;
      }
    }
    return `Week ${week}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ScreenHeader
        title={`${getWeekLabel()} - Final`}
        onBack={onBack}
        testID="post-game-summary-header"
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Result Banner */}
        <View
          style={[
            styles.resultBanner,
            isWin && styles.resultBannerWin,
            !isWin && !isTie && styles.resultBannerLoss,
            isTie && styles.resultBannerTie,
          ]}
          accessibilityLabel={`Final score: ${awayTeam.abbr} ${awayScore}, ${homeTeam.abbr} ${homeScore}. ${isTie ? 'Tie game' : isWin ? 'Victory' : 'Defeat'}`}
        >
          <Text style={styles.resultLabel} accessibilityRole="header">
            {isTie ? 'TIE GAME' : isWin ? 'VICTORY!' : 'DEFEAT'}
          </Text>
          <View style={styles.finalScoreContainer}>
            <View style={styles.teamScoreBlock}>
              <Text style={styles.teamAbbr}>{awayTeam.abbr}</Text>
              <Text style={[styles.teamFinalScore, !homeWins && !isTie && styles.winnerScore]}>
                {awayScore}
              </Text>
              <Text style={styles.teamRecord}>({awayTeam.record})</Text>
            </View>

            <Text style={styles.atSymbol}>@</Text>

            <View style={styles.teamScoreBlock}>
              <Text style={styles.teamAbbr}>{homeTeam.abbr}</Text>
              <Text style={[styles.teamFinalScore, homeWins && styles.winnerScore]}>
                {homeScore}
              </Text>
              <Text style={styles.teamRecord}>({homeTeam.record})</Text>
            </View>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer} accessibilityRole="tablist">
          <TouchableOpacity
            style={[styles.tab, activeTab === 'summary' && styles.tabActive]}
            onPress={() => setActiveTab('summary')}
            accessibilityLabel="Summary tab"
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'summary' }}
          >
            <Text style={[styles.tabText, activeTab === 'summary' && styles.tabTextActive]}>
              Summary
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'boxscore' && styles.tabActive]}
            onPress={() => setActiveTab('boxscore')}
            accessibilityLabel="Box Score tab"
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'boxscore' }}
          >
            <Text style={[styles.tabText, activeTab === 'boxscore' && styles.tabTextActive]}>
              Box Score
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'summary' ? (
          <>
            {/* Team Comparison */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Team Stats
              </Text>
              <View style={styles.comparisonCard}>
                <View style={styles.comparisonHeader}>
                  <Text style={styles.comparisonTeam}>{homeTeam.abbr}</Text>
                  <Text style={styles.comparisonHeaderLabel}>STAT</Text>
                  <Text style={styles.comparisonTeam}>{awayTeam.abbr}</Text>
                </View>
                {boxScore.teamComparison.map((stat) => (
                  <ComparisonRow
                    key={stat.category}
                    label={stat.category}
                    homeValue={stat.home}
                    awayValue={stat.away}
                  />
                ))}
              </View>
            </View>

            {/* Key Plays */}
            {keyPlays.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  Key Plays
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.keyPlaysScroll}
                >
                  {keyPlays.slice(0, 5).map((play, index) => (
                    <KeyPlayCard key={`play-${index}`} play={play} />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Stat Leaders */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Game Leaders
              </Text>
              <StatLeaderCard title="Passing" leaders={boxScore.passingLeaders} />
              <StatLeaderCard title="Rushing" leaders={boxScore.rushingLeaders} />
              <StatLeaderCard title="Receiving" leaders={boxScore.receivingLeaders} />
            </View>
          </>
        ) : (
          <>
            {/* Scoring Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Scoring
              </Text>
              <View style={styles.scoringCard}>
                {boxScore.scoringSummary.map((play, index) => (
                  <View
                    key={`scoring-${index}`}
                    style={styles.scoringRow}
                    accessibilityLabel={`Q${play.quarter}: ${play.team} ${play.description}, score ${play.homeScore}-${play.awayScore}`}
                  >
                    <View style={styles.scoringInfo}>
                      <Text style={styles.scoringTeam}>{play.team}</Text>
                      <Text style={styles.scoringDesc}>{play.description}</Text>
                    </View>
                    <View style={styles.scoringScore}>
                      <Text style={styles.scoringQuarter}>Q{play.quarter}</Text>
                      <Text style={styles.scoringResult}>
                        {play.homeScore}-{play.awayScore}
                      </Text>
                    </View>
                  </View>
                ))}
                {boxScore.scoringSummary.length === 0 && (
                  <Text style={styles.emptyText}>No scoring plays</Text>
                )}
              </View>
            </View>

            {/* Full Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Passing
              </Text>
              {boxScore.passingLeaders.map((leader, index) => (
                <View
                  key={`pass-${index}`}
                  style={styles.fullStatRow}
                  accessibilityLabel={`${leader.playerName}, ${leader.position}, ${leader.statLine}`}
                >
                  <Text style={styles.fullStatName}>{leader.playerName}</Text>
                  <Text style={styles.fullStatTeam}>{leader.position}</Text>
                  <Text style={styles.fullStatValue}>{leader.statLine}</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Rushing
              </Text>
              {boxScore.rushingLeaders.map((leader, index) => (
                <View
                  key={`rush-${index}`}
                  style={styles.fullStatRow}
                  accessibilityLabel={`${leader.playerName}, ${leader.position}, ${leader.statLine}`}
                >
                  <Text style={styles.fullStatName}>{leader.playerName}</Text>
                  <Text style={styles.fullStatTeam}>{leader.position}</Text>
                  <Text style={styles.fullStatValue}>{leader.statLine}</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Receiving
              </Text>
              {boxScore.receivingLeaders.map((leader, index) => (
                <View
                  key={`rec-${index}`}
                  style={styles.fullStatRow}
                  accessibilityLabel={`${leader.playerName}, ${leader.position}, ${leader.statLine}`}
                >
                  <Text style={styles.fullStatName}>{leader.playerName}</Text>
                  <Text style={styles.fullStatTeam}>{leader.position}</Text>
                  <Text style={styles.fullStatValue}>{leader.statLine}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={onContinue}
          activeOpacity={0.8}
          accessibilityLabel="Continue to week summary"
          accessibilityRole="button"
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          <Text style={styles.continueSubtext}>View Week Summary</Text>
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
  content: {
    flex: 1,
  },
  resultBanner: {
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
  },
  resultBannerWin: {
    backgroundColor: colors.success + '20',
  },
  resultBannerLoss: {
    backgroundColor: colors.error + '20',
  },
  resultBannerTie: {
    backgroundColor: colors.warning + '20',
  },
  resultLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  finalScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  teamScoreBlock: {
    alignItems: 'center',
  },
  teamAbbr: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  teamFinalScore: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  winnerScore: {
    color: colors.success,
  },
  teamRecord: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  atSymbol: {
    fontSize: fontSize.xl,
    color: colors.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: accessibility.minTouchTarget,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  section: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  comparisonCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  comparisonHeaderLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  comparisonTeam: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    width: 40,
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  comparisonValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    width: 40,
    textAlign: 'center',
  },
  comparisonWinner: {
    color: colors.success,
  },
  comparisonLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'center',
  },
  keyPlaysScroll: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  keyPlayCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    width: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  keyPlayTouchdown: {
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  keyPlayTurnover: {
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  keyPlayIcon: {
    fontSize: 24,
  },
  keyPlayText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  statCardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  leaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  leaderTeam: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  leaderStat: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  scoringCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  scoringRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scoringInfo: {
    flex: 1,
  },
  scoringTeam: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  scoringDesc: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginTop: spacing.xxs,
  },
  scoringScore: {
    alignItems: 'flex-end',
  },
  scoringQuarter: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  scoringResult: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  emptyText: {
    padding: spacing.md,
    textAlign: 'center',
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  fullStatRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    alignItems: 'center',
    ...shadows.sm,
  },
  fullStatName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  fullStatTeam: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.md,
  },
  fullStatValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
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
  continueButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    minHeight: accessibility.minTouchTarget,
    ...shadows.md,
  },
  continueButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  continueSubtext: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xs,
    opacity: 0.8,
    marginTop: spacing.xxs,
  },
});

export default PostGameSummaryScreen;

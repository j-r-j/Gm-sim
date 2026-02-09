/**
 * OtherGamesTicker Component
 * Shows condensed live scores of all other games happening this week
 * Updates in real-time alongside the user's game simulation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  accessibility,
} from '../../styles';
import { LiveGameScore } from '../../core/simulation/WeekFlowState';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface OtherGamesTickerProps {
  /** All live game scores for the week */
  games: LiveGameScore[];
  /** Callback when a game is tapped for details */
  onGamePress?: (game: LiveGameScore) => void;
  /** Whether to show expanded view by default */
  defaultExpanded?: boolean;
  /** Maximum games to show in collapsed view */
  maxCollapsedGames?: number;
}

/**
 * Format quarter display
 */
function formatQuarter(quarter: number | 'OT' | 'Final'): string {
  if (quarter === 'Final') return 'F';
  if (quarter === 'OT') return 'OT';
  return `Q${quarter}`;
}

/**
 * Format time remaining
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Single game score pill component
 */
function GameScorePill({
  game,
  onPress,
}: {
  game: LiveGameScore;
  onPress?: () => void;
}): React.JSX.Element {
  const isComplete = game.isComplete || game.quarter === 'Final';
  const homeWinning = game.homeScore > game.awayScore;
  const awayWinning = game.awayScore > game.homeScore;

  return (
    <TouchableOpacity
      style={[
        styles.gamePill,
        isComplete && styles.gamePillComplete,
        game.isUserGame && styles.gamePillUser,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
      accessibilityLabel={`${game.awayTeamAbbr} ${game.awayScore}, ${game.homeTeamAbbr} ${game.homeScore}, ${isComplete ? 'Final' : `${formatQuarter(game.quarter)} ${formatTime(game.timeRemaining)}`}`}
      accessibilityRole="button"
      hitSlop={accessibility.hitSlop}
    >
      {/* Away Team */}
      <View
        style={styles.teamContainer}
        accessibilityLabel={`Away: ${game.awayTeamAbbr} ${game.awayScore}`}
      >
        <Text
          style={[styles.teamAbbr, awayWinning && isComplete && styles.winnerText]}
          numberOfLines={1}
        >
          {game.awayTeamAbbr}
        </Text>
        <Text
          style={[
            styles.scoreText,
            awayWinning && isComplete && styles.winnerText,
            !isComplete && game.possession === 'away' && styles.possessionIndicator,
          ]}
        >
          {game.awayScore}
        </Text>
      </View>

      {/* Status */}
      <View
        style={styles.statusContainer}
        accessibilityLabel={`Game status: ${isComplete ? 'Final' : `${formatQuarter(game.quarter)} ${formatTime(game.timeRemaining)}`}`}
      >
        <Text style={[styles.statusText, isComplete && styles.finalText]}>
          {isComplete ? 'F' : formatQuarter(game.quarter)}
        </Text>
        {!isComplete && <Text style={styles.timeText}>{formatTime(game.timeRemaining)}</Text>}
      </View>

      {/* Home Team */}
      <View
        style={styles.teamContainer}
        accessibilityLabel={`Home: ${game.homeTeamAbbr} ${game.homeScore}`}
      >
        <Text
          style={[styles.teamAbbr, homeWinning && isComplete && styles.winnerText]}
          numberOfLines={1}
        >
          {game.homeTeamAbbr}
        </Text>
        <Text
          style={[
            styles.scoreText,
            homeWinning && isComplete && styles.winnerText,
            !isComplete && game.possession === 'home' && styles.possessionIndicator,
          ]}
        >
          {game.homeScore}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Expanded game row component
 */
function GameRowExpanded({
  game,
  onPress,
}: {
  game: LiveGameScore;
  onPress?: () => void;
}): React.JSX.Element {
  const isComplete = game.isComplete || game.quarter === 'Final';
  const homeWinning = game.homeScore > game.awayScore;
  const awayWinning = game.awayScore > game.homeScore;

  return (
    <TouchableOpacity
      style={[styles.gameRowExpanded, game.isUserGame && styles.gameRowUser]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
      accessibilityLabel={`${game.awayTeamAbbr} ${game.awayScore}, ${game.homeTeamAbbr} ${game.homeScore}, ${isComplete ? 'Final' : `${formatQuarter(game.quarter)} ${formatTime(game.timeRemaining)}`}`}
      accessibilityRole="button"
    >
      {/* Away Team */}
      <View
        style={styles.expandedTeam}
        accessibilityLabel={`Away: ${game.awayTeamAbbr}${!isComplete && game.possession === 'away' ? ', has possession' : ''}`}
      >
        <Text
          style={[styles.expandedAbbr, awayWinning && isComplete && styles.winnerText]}
          numberOfLines={1}
        >
          {game.awayTeamAbbr}
        </Text>
        {!isComplete && game.possession === 'away' && (
          <View style={styles.possessionDot} accessibilityLabel="Has possession" />
        )}
      </View>

      <Text
        style={[styles.expandedScore, awayWinning && isComplete && styles.winnerText]}
        accessibilityLabel={`Away score: ${game.awayScore}`}
      >
        {game.awayScore}
      </Text>

      {/* Status */}
      <View
        style={styles.expandedStatus}
        accessibilityLabel={`Game status: ${isComplete ? 'Final' : `${formatQuarter(game.quarter)} ${formatTime(game.timeRemaining)}`}`}
      >
        <Text style={[styles.expandedStatusText, isComplete && styles.finalText]}>
          {isComplete ? 'FINAL' : formatQuarter(game.quarter)}
        </Text>
        {!isComplete && (
          <Text style={styles.expandedTimeText}>{formatTime(game.timeRemaining)}</Text>
        )}
      </View>

      <Text
        style={[styles.expandedScore, homeWinning && isComplete && styles.winnerText]}
        accessibilityLabel={`Home score: ${game.homeScore}`}
      >
        {game.homeScore}
      </Text>

      {/* Home Team */}
      <View
        style={[styles.expandedTeam, styles.expandedTeamRight]}
        accessibilityLabel={`Home: ${game.homeTeamAbbr}${!isComplete && game.possession === 'home' ? ', has possession' : ''}`}
      >
        {!isComplete && game.possession === 'home' && (
          <View style={styles.possessionDot} accessibilityLabel="Has possession" />
        )}
        <Text
          style={[styles.expandedAbbr, homeWinning && isComplete && styles.winnerText]}
          numberOfLines={1}
        >
          {game.homeTeamAbbr}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function OtherGamesTicker({
  games,
  onGamePress,
  defaultExpanded = false,
  maxCollapsedGames = 4,
}: OtherGamesTickerProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Filter out user's game for the ticker (shown separately in main view)
  const otherGames = games.filter((g) => !g.isUserGame);
  const completedCount = otherGames.filter((g) => g.isComplete || g.quarter === 'Final').length;

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  if (otherGames.length === 0) {
    return <View />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
        accessibilityLabel={`Other Games, ${completedCount} of ${otherGames.length} Final. ${isExpanded ? 'Collapse' : 'Expand'}`}
        accessibilityRole="button"
        hitSlop={accessibility.hitSlop}
      >
        <Text style={styles.headerTitle}>Other Games</Text>
        <View style={styles.headerRight}>
          <Text
            style={styles.headerCount}
            accessibilityLabel={`${completedCount} of ${otherGames.length} games final`}
          >
            {completedCount}/{otherGames.length} Final
          </Text>
          <Text style={styles.expandIcon} accessible={false}>
            {isExpanded ? '▲' : '▼'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Content */}
      {isExpanded ? (
        <View style={styles.expandedContainer}>
          {otherGames.map((game) => (
            <GameRowExpanded
              key={game.gameId}
              game={game}
              onPress={onGamePress ? () => onGamePress(game) : undefined}
            />
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tickerContent}
        >
          {otherGames.slice(0, maxCollapsedGames).map((game) => (
            <GameScorePill
              key={game.gameId}
              game={game}
              onPress={onGamePress ? () => onGamePress(game) : undefined}
            />
          ))}
          {otherGames.length > maxCollapsedGames && (
            <TouchableOpacity
              style={styles.moreButton}
              onPress={toggleExpanded}
              accessibilityLabel={`Show ${otherGames.length - maxCollapsedGames} more games`}
              accessibilityRole="button"
              hitSlop={accessibility.hitSlop}
            >
              <Text style={styles.moreButtonText}>+{otherGames.length - maxCollapsedGames}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  expandIcon: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  tickerContent: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  gamePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 100,
    gap: spacing.xs,
  },
  gamePillComplete: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gamePillUser: {
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  teamContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  teamAbbr: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.text,
    width: 28,
  },
  scoreText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    minWidth: 16,
    textAlign: 'right',
  },
  winnerText: {
    color: colors.success,
  },
  possessionIndicator: {
    color: colors.secondary,
  },
  statusContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  timeText: {
    fontSize: 8,
    color: colors.textLight,
  },
  finalText: {
    color: colors.success,
    fontWeight: fontWeight.bold,
  },
  moreButton: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  expandedContainer: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  gameRowExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gameRowUser: {
    backgroundColor: colors.secondary + '10',
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  expandedTeam: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 50,
    gap: spacing.xxs,
  },
  expandedTeamRight: {
    justifyContent: 'flex-end',
  },
  expandedAbbr: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  expandedScore: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    width: 30,
    textAlign: 'center',
  },
  expandedStatus: {
    alignItems: 'center',
    width: 60,
    paddingHorizontal: spacing.sm,
  },
  expandedStatusText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
  },
  expandedTimeText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  possessionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },
});

export default OtherGamesTicker;

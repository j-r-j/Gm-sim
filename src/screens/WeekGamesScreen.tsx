/**
 * WeekGamesScreen
 * Shows all games for the current week with the ability to play your game
 * and simulate remaining games
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../styles';

/**
 * Game display item
 */
export interface WeekGameItem {
  gameId: string;
  homeTeam: {
    id: string;
    name: string;
    abbr: string;
    record: string;
  };
  awayTeam: {
    id: string;
    name: string;
    abbr: string;
    record: string;
  };
  isUserGame: boolean;
  isComplete: boolean;
  homeScore: number | null;
  awayScore: number | null;
  timeSlot: string;
  isDivisional: boolean;
}

/**
 * Props for WeekGamesScreen
 */
export interface WeekGamesScreenProps {
  /** Current week number */
  week: number;
  /** Current phase (regularSeason, playoffs, etc.) */
  phase: string;
  /** All games for this week */
  games: WeekGameItem[];
  /** Whether user's game has been played */
  userGamePlayed: boolean;
  /** Whether all games are complete */
  allGamesComplete: boolean;
  /** Callback to play user's game */
  onPlayGame: () => void;
  /** Callback to simulate remaining games */
  onSimRemaining: () => void;
  /** Callback to view week summary */
  onViewSummary: () => void;
  /** Callback to go back */
  onBack: () => void;
}

/**
 * Time slot display names
 */
const TIME_SLOT_NAMES: Record<string, string> = {
  thursday: 'Thursday Night',
  early_sunday: 'Sunday 1:00 PM',
  late_sunday: 'Sunday 4:25 PM',
  sunday_night: 'Sunday Night',
  monday_night: 'Monday Night',
};

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
 * Single game card component
 */
function GameCard({
  game,
  onPlay,
}: {
  game: WeekGameItem;
  onPlay?: () => void;
}): React.JSX.Element {
  const getResultBadge = () => {
    if (!game.isComplete) return null;
    return (
      <View style={styles.resultBadge}>
        <Text style={styles.resultBadgeText}>FINAL</Text>
      </View>
    );
  };

  return (
    <View style={[styles.gameCard, game.isUserGame && styles.userGameCard]}>
      {game.isUserGame && (
        <View style={styles.yourGameBanner}>
          <Text style={styles.yourGameText}>YOUR GAME</Text>
        </View>
      )}

      <View style={styles.gameHeader}>
        <Text style={styles.timeSlot}>{TIME_SLOT_NAMES[game.timeSlot] || game.timeSlot}</Text>
        {game.isDivisional && <Text style={styles.divisionBadge}>DIV</Text>}
        {getResultBadge()}
      </View>

      <View style={styles.matchupContainer}>
        {/* Away Team */}
        <View style={styles.teamRow}>
          <Text style={styles.teamAbbr}>{game.awayTeam.abbr}</Text>
          <Text style={styles.teamName} numberOfLines={1}>
            {game.awayTeam.name}
          </Text>
          <Text style={styles.teamRecord}>({game.awayTeam.record})</Text>
          {game.isComplete && (
            <Text
              style={[
                styles.score,
                (game.awayScore ?? 0) > (game.homeScore ?? 0) && styles.winningScore,
              ]}
            >
              {game.awayScore}
            </Text>
          )}
        </View>

        <Text style={styles.atSymbol}>@</Text>

        {/* Home Team */}
        <View style={styles.teamRow}>
          <Text style={styles.teamAbbr}>{game.homeTeam.abbr}</Text>
          <Text style={styles.teamName} numberOfLines={1}>
            {game.homeTeam.name}
          </Text>
          <Text style={styles.teamRecord}>({game.homeTeam.record})</Text>
          {game.isComplete && (
            <Text
              style={[
                styles.score,
                (game.homeScore ?? 0) > (game.awayScore ?? 0) && styles.winningScore,
              ]}
            >
              {game.homeScore}
            </Text>
          )}
        </View>
      </View>

      {/* Play button for user's game */}
      {game.isUserGame && !game.isComplete && onPlay && (
        <TouchableOpacity style={styles.playButton} onPress={onPlay} activeOpacity={0.8}>
          <Text style={styles.playButtonText}>PLAY GAME</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function WeekGamesScreen({
  week,
  phase,
  games,
  userGamePlayed,
  allGamesComplete,
  onPlayGame,
  onSimRemaining,
  onViewSummary,
  onBack,
}: WeekGamesScreenProps): React.JSX.Element {
  const completedCount = games.filter((g) => g.isComplete).length;
  const totalCount = games.length;
  const weekTitle = phase === 'playoffs' ? getPlayoffRoundName(week) : `Week ${week}`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{weekTitle}</Text>
          <Text style={styles.subtitle}>
            {completedCount}/{totalCount} Games Complete
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${(completedCount / totalCount) * 100}%` }]}
          />
        </View>
      </View>

      {/* Games List */}
      <FlatList
        data={games}
        keyExtractor={(item) => item.gameId}
        renderItem={({ item }) => (
          <GameCard
            game={item}
            onPlay={item.isUserGame && !item.isComplete ? onPlayGame : undefined}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No games scheduled this week</Text>
          </View>
        }
      />

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        {!userGamePlayed && (
          <TouchableOpacity style={styles.actionButton} onPress={onPlayGame} activeOpacity={0.8}>
            <Text style={styles.actionButtonText}>Play Your Game</Text>
          </TouchableOpacity>
        )}

        {userGamePlayed && !allGamesComplete && (
          <TouchableOpacity
            style={[styles.actionButton, styles.simButton]}
            onPress={onSimRemaining}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>
              Sim Remaining ({totalCount - completedCount} games)
            </Text>
          </TouchableOpacity>
        )}

        {allGamesComplete && (
          <TouchableOpacity
            style={[styles.actionButton, styles.summaryButton]}
            onPress={onViewSummary}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>View Week Summary</Text>
          </TouchableOpacity>
        )}
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
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textOnPrimary,
    opacity: 0.8,
  },
  placeholder: {
    width: 60,
  },
  progressContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  gameCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  userGameCard: {
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  yourGameBanner: {
    backgroundColor: colors.secondary,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
  yourGameText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  timeSlot: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  divisionBadge: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  resultBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  resultBadgeText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  matchupContainer: {
    padding: spacing.md,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  teamAbbr: {
    width: 40,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  teamName: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  teamRecord: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.md,
  },
  score: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    minWidth: 30,
    textAlign: 'right',
  },
  winningScore: {
    color: colors.success,
  },
  atSymbol: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xxs,
  },
  playButton: {
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  playButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  actionBar: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  simButton: {
    backgroundColor: colors.warning,
  },
  summaryButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});

export default WeekGamesScreen;

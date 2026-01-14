/**
 * ScheduleScreen
 * Displays the team's game schedule for the season
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles';
import { ScheduledGame } from '../core/season/ScheduleGenerator';
import { Team } from '../core/models/team/Team';

/**
 * Props for ScheduleScreen
 */
export interface ScheduleScreenProps {
  /** User's team ID */
  userTeamId: string;
  /** All teams */
  teams: Record<string, Team>;
  /** Full season schedule */
  schedule: ScheduledGame[];
  /** Current week */
  currentWeek: number;
  /** Callback to go back */
  onBack: () => void;
  /** Callback when game is selected for simulation */
  onSelectGame?: (game: ScheduledGame) => void;
}

/**
 * Processed game for display
 */
interface DisplayGame {
  gameId: string;
  week: number;
  opponent: {
    id: string;
    name: string;
    abbr: string;
    record: string;
  };
  isHome: boolean;
  isDivisional: boolean;
  isConference: boolean;
  result?: {
    userScore: number;
    opponentScore: number;
    won: boolean;
  };
  isBye: boolean;
  isPast: boolean;
  isCurrent: boolean;
}

/**
 * Game card component
 */
function GameCard({
  game,
  onPress,
}: {
  game: DisplayGame;
  onPress?: () => void;
}) {
  if (game.isBye) {
    return (
      <View style={[styles.gameCard, styles.byeCard]}>
        <Text style={styles.weekLabel}>Week {game.week}</Text>
        <Text style={styles.byeText}>BYE WEEK</Text>
      </View>
    );
  }

  const resultText = game.result
    ? `${game.result.userScore} - ${game.result.opponentScore}`
    : game.isPast
      ? 'Not Played'
      : '';

  return (
    <TouchableOpacity
      style={[
        styles.gameCard,
        game.isCurrent && styles.currentGameCard,
        game.result?.won && styles.winCard,
        game.result && !game.result.won && styles.lossCard,
      ]}
      onPress={onPress}
      disabled={!onPress || game.isPast}
    >
      <View style={styles.weekColumn}>
        <Text style={styles.weekLabel}>Week {game.week}</Text>
        {game.isDivisional && <Text style={styles.divisionBadge}>DIV</Text>}
      </View>

      <View style={styles.gameInfo}>
        <Text style={styles.homeAway}>{game.isHome ? 'vs' : '@'}</Text>
        <Text style={styles.opponentName}>{game.opponent.name}</Text>
        <Text style={styles.opponentRecord}>({game.opponent.record})</Text>
      </View>

      <View style={styles.resultColumn}>
        {game.result ? (
          <>
            <Text style={[styles.resultText, game.result.won ? styles.winText : styles.lossText]}>
              {game.result.won ? 'W' : 'L'}
            </Text>
            <Text style={styles.scoreText}>{resultText}</Text>
          </>
        ) : game.isCurrent ? (
          <Text style={styles.playButton}>PLAY</Text>
        ) : (
          <Text style={styles.upcomingText}>Upcoming</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function ScheduleScreen({
  userTeamId,
  teams,
  schedule,
  currentWeek,
  onBack,
  onSelectGame,
}: ScheduleScreenProps) {
  // Process schedule to get user's games
  const displayGames = useMemo(() => {
    const userGames: DisplayGame[] = [];
    const gamesByWeek = new Map<number, ScheduledGame>();

    // Find all games involving user's team
    for (const game of schedule) {
      if (game.homeTeamId === userTeamId || game.awayTeamId === userTeamId) {
        gamesByWeek.set(game.week, game);
      }
    }

    // Create display games for weeks 1-18
    for (let week = 1; week <= 18; week++) {
      const game = gamesByWeek.get(week);

      if (!game) {
        // Bye week
        userGames.push({
          gameId: `bye-${week}`,
          week,
          opponent: { id: '', name: '', abbr: '', record: '' },
          isHome: false,
          isDivisional: false,
          isConference: false,
          isBye: true,
          isPast: week < currentWeek,
          isCurrent: week === currentWeek,
        });
        continue;
      }

      const isHome = game.homeTeamId === userTeamId;
      const opponentId = isHome ? game.awayTeamId : game.homeTeamId;
      const opponent = teams[opponentId];

      const displayGame: DisplayGame = {
        gameId: game.gameId,
        week,
        opponent: {
          id: opponentId,
          name: opponent ? `${opponent.city} ${opponent.nickname}` : 'Unknown',
          abbr: opponent?.abbreviation || '???',
          record: opponent
            ? `${opponent.currentRecord.wins}-${opponent.currentRecord.losses}`
            : '0-0',
        },
        isHome,
        isDivisional: game.isDivisional,
        isConference: game.isConference,
        isBye: false,
        isPast: week < currentWeek,
        isCurrent: week === currentWeek,
      };

      // Add result if game is complete
      if (game.isComplete && game.homeScore !== null && game.awayScore !== null) {
        const userScore = isHome ? game.homeScore : game.awayScore;
        const opponentScore = isHome ? game.awayScore : game.homeScore;
        displayGame.result = {
          userScore,
          opponentScore,
          won: userScore > opponentScore,
        };
      }

      userGames.push(displayGame);
    }

    return userGames;
  }, [schedule, userTeamId, teams, currentWeek]);

  // Calculate record summary
  const recordSummary = useMemo(() => {
    const team = teams[userTeamId];
    if (!team) return { wins: 0, losses: 0, ties: 0 };
    return {
      wins: team.currentRecord.wins,
      losses: team.currentRecord.losses,
      ties: team.currentRecord.ties || 0,
    };
  }, [teams, userTeamId]);

  const userTeam = teams[userTeamId];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Schedule</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Team Info */}
      <View style={styles.teamInfo}>
        <Text style={styles.teamName}>
          {userTeam ? `${userTeam.city} ${userTeam.nickname}` : 'Your Team'}
        </Text>
        <Text style={styles.record}>
          {recordSummary.wins}-{recordSummary.losses}
          {recordSummary.ties > 0 ? `-${recordSummary.ties}` : ''}
        </Text>
      </View>

      {/* Schedule List */}
      <FlatList
        data={displayGames}
        keyExtractor={(item) => item.gameId}
        renderItem={({ item }) => (
          <GameCard
            game={item}
            onPress={
              item.isCurrent && !item.isBye && onSelectGame
                ? () => {
                    const originalGame = schedule.find((g) => g.gameId === item.gameId);
                    if (originalGame) onSelectGame(originalGame);
                  }
                : undefined
            }
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  backText: {
    color: colors.primary,
    fontSize: fontSize.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  placeholder: {
    width: 60,
  },
  teamInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  teamName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  record: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  listContent: {
    padding: spacing.md,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  currentGameCard: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  winCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  lossCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  byeCard: {
    justifyContent: 'center',
    opacity: 0.6,
  },
  byeText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
    flex: 1,
  },
  weekColumn: {
    width: 60,
    alignItems: 'center',
  },
  weekLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  divisionBadge: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    marginTop: 2,
  },
  gameInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  homeAway: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    width: 24,
  },
  opponentName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    flex: 1,
  },
  opponentRecord: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  resultColumn: {
    width: 70,
    alignItems: 'center',
  },
  resultText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  winText: {
    color: colors.success,
  },
  lossText: {
    color: colors.error,
  },
  scoreText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  playButton: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  upcomingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});

export default ScheduleScreen;

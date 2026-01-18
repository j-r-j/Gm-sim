/**
 * WeeklySchedulePopup
 * Shows all games for the current week when advancing.
 * User can play/sim their game, then watch live results for other games.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../styles';
import { BoxScoreModal } from '../components/BoxScoreModal';
import { BoxScore } from '../core/game/BoxScoreGenerator';
import { GameResult } from '../core/game/GameRunner';

/**
 * Game data for display
 */
export interface WeeklyGame {
  gameId: string;
  homeTeam: {
    id: string;
    city: string;
    nickname: string;
    abbr: string;
    record: string;
  };
  awayTeam: {
    id: string;
    city: string;
    nickname: string;
    abbr: string;
    record: string;
  };
  isUserGame: boolean;
  timeSlot: string;
  isDivisional: boolean;
}

/**
 * Game result after simulation
 */
export interface SimulatedGame extends WeeklyGame {
  homeScore: number;
  awayScore: number;
  isComplete: boolean;
  boxScore?: BoxScore;
  result?: GameResult;
}

/**
 * Props for WeeklySchedulePopup
 */
export interface WeeklySchedulePopupProps {
  /** Current week number */
  week: number;
  /** Current phase (regularSeason, playoffs, etc.) */
  phase: string;
  /** All games for this week */
  games: WeeklyGame[];
  /** User's team ID */
  userTeamId: string;
  /** Whether user is on bye this week */
  isUserOnBye: boolean;
  /** Callback to play user's game (navigate to gamecast) */
  onPlayGame: () => void;
  /** Callback to sim user's game */
  onSimUserGame: () => Promise<GameResult | null>;
  /** Callback to sim all other games */
  onSimOtherGames: () => Promise<SimulatedGame[]>;
  /** Callback when all games are done and ready to proceed */
  onComplete: (results: SimulatedGame[]) => void;
  /** Callback to go back */
  onBack: () => void;
}

/**
 * Time slot display names
 */
const TIME_SLOT_NAMES: Record<string, string> = {
  thursday: 'THU',
  early_sunday: 'SUN 1PM',
  late_sunday: 'SUN 4PM',
  sunday_night: 'SNF',
  monday_night: 'MNF',
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
 * Phase indicator for game simulation
 */
type SimPhase = 'initial' | 'user_playing' | 'simulating_others' | 'complete';

/**
 * Single game card for the schedule
 */
function GameCard({
  game,
  isSimulated,
  isAnimating,
  onPress,
}: {
  game: WeeklyGame | SimulatedGame;
  isSimulated: boolean;
  isAnimating: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isAnimating) {
      // Animate the score reveal
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.02,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else if (isSimulated) {
      fadeAnim.setValue(1);
    }
  }, [isAnimating, isSimulated, fadeAnim, scaleAnim]);

  const simulatedGame = game as SimulatedGame;
  const hasScore = isSimulated && simulatedGame.homeScore !== undefined;
  const homeWon = hasScore && simulatedGame.homeScore > simulatedGame.awayScore;
  const awayWon = hasScore && simulatedGame.awayScore > simulatedGame.homeScore;

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} disabled={!isSimulated}>
      <Animated.View
        style={[
          styles.gameCard,
          game.isUserGame && styles.userGameCard,
          isSimulated && styles.completedGameCard,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {game.isUserGame && (
          <View style={styles.yourGameBanner}>
            <Text style={styles.yourGameText}>YOUR GAME</Text>
          </View>
        )}

        <View style={styles.gameContent}>
          {/* Time slot / Status */}
          <View style={styles.gameStatus}>
            {isSimulated ? (
              <Text style={styles.finalText}>FINAL</Text>
            ) : (
              <Text style={styles.timeSlotText}>
                {TIME_SLOT_NAMES[game.timeSlot] || game.timeSlot}
              </Text>
            )}
            {game.isDivisional && <Text style={styles.divBadge}>DIV</Text>}
          </View>

          {/* Matchup */}
          <View style={styles.matchup}>
            {/* Away Team */}
            <View style={styles.teamRow}>
              <Text style={[styles.teamAbbr, awayWon && styles.winnerText]}>
                {game.awayTeam.abbr}
              </Text>
              <Text style={styles.teamName} numberOfLines={1}>
                {game.awayTeam.nickname}
              </Text>
              <Text style={styles.record}>({game.awayTeam.record})</Text>
              {hasScore && (
                <Animated.Text
                  style={[styles.score, awayWon && styles.winnerText, { opacity: fadeAnim }]}
                >
                  {simulatedGame.awayScore}
                </Animated.Text>
              )}
            </View>

            <Text style={styles.atSymbol}>@</Text>

            {/* Home Team */}
            <View style={styles.teamRow}>
              <Text style={[styles.teamAbbr, homeWon && styles.winnerText]}>
                {game.homeTeam.abbr}
              </Text>
              <Text style={styles.teamName} numberOfLines={1}>
                {game.homeTeam.nickname}
              </Text>
              <Text style={styles.record}>({game.homeTeam.record})</Text>
              {hasScore && (
                <Animated.Text
                  style={[styles.score, homeWon && styles.winnerText, { opacity: fadeAnim }]}
                >
                  {simulatedGame.homeScore}
                </Animated.Text>
              )}
            </View>
          </View>

          {/* Tap hint for completed games */}
          {isSimulated && <Text style={styles.tapHint}>Tap for box score</Text>}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function WeeklySchedulePopup({
  week,
  phase,
  games,
  userTeamId: _userTeamId,
  isUserOnBye,
  onPlayGame,
  onSimUserGame,
  onSimOtherGames,
  onComplete,
  onBack,
}: WeeklySchedulePopupProps): React.JSX.Element {
  // _userTeamId is available for future use if needed
  const [simPhase, setSimPhase] = useState<SimPhase>('initial');
  const [simulatedGames, setSimulatedGames] = useState<Map<string, SimulatedGame>>(new Map());
  const [animatingGameId, setAnimatingGameId] = useState<string | null>(null);
  const [selectedBoxScore, setSelectedBoxScore] = useState<BoxScore | null>(null);
  const [showBoxScore, setShowBoxScore] = useState(false);

  const weekTitle = phase === 'playoffs' ? getPlayoffRoundName(week) : `Week ${week}`;
  const userGame = games.find((g) => g.isUserGame);
  const otherGames = games.filter((g) => !g.isUserGame);
  const completedCount = simulatedGames.size;
  const totalCount = games.length;
  const allComplete = completedCount === totalCount;

  // Handle playing user's game (navigates to gamecast)
  const handlePlayGame = useCallback(() => {
    setSimPhase('user_playing');
    onPlayGame();
  }, [onPlayGame]);

  // Handle simming user's game
  const handleSimUserGame = useCallback(async () => {
    setSimPhase('user_playing');
    const result = await onSimUserGame();
    if (result && userGame) {
      const simGame: SimulatedGame = {
        ...userGame,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        isComplete: true,
        boxScore: result.boxScore,
        result,
      };
      setSimulatedGames((prev) => new Map(prev).set(userGame.gameId, simGame));
      setAnimatingGameId(userGame.gameId);
      setTimeout(() => setAnimatingGameId(null), 500);
    }
    // Auto-proceed to simulating other games
    simulateOtherGames();
  }, [onSimUserGame, userGame]);

  // Simulate other games with animation
  const simulateOtherGames = useCallback(async () => {
    setSimPhase('simulating_others');

    const results = await onSimOtherGames();

    // Animate each game result one by one
    for (let i = 0; i < results.length; i++) {
      const game = results[i];
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          setAnimatingGameId(game.gameId);
          setSimulatedGames((prev) => new Map(prev).set(game.gameId, game));
          setTimeout(() => {
            setAnimatingGameId(null);
            resolve();
          }, 400);
        }, 300);
      });
    }

    setSimPhase('complete');
  }, [onSimOtherGames]);

  // Handle user returning from gamecast with result
  const handleUserGameComplete = useCallback(
    (result: GameResult) => {
      if (userGame) {
        const simGame: SimulatedGame = {
          ...userGame,
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          isComplete: true,
          boxScore: result.boxScore,
          result,
        };
        setSimulatedGames((prev) => new Map(prev).set(userGame.gameId, simGame));
        setAnimatingGameId(userGame.gameId);
        setTimeout(() => setAnimatingGameId(null), 500);

        // Auto-proceed to simulating other games
        simulateOtherGames();
      }
    },
    [userGame, simulateOtherGames]
  );

  // Expose the callback for external use
  useEffect(() => {
    // Store reference for external access
    (globalThis as Record<string, unknown>).__weeklyScheduleHandleUserGameComplete =
      handleUserGameComplete;
    return () => {
      delete (globalThis as Record<string, unknown>).__weeklyScheduleHandleUserGameComplete;
    };
  }, [handleUserGameComplete]);

  // Handle clicking a completed game to see box score
  const handleGamePress = useCallback(
    (gameId: string) => {
      const game = simulatedGames.get(gameId);
      if (game?.boxScore) {
        setSelectedBoxScore(game.boxScore);
        setShowBoxScore(true);
      }
    },
    [simulatedGames]
  );

  // Handle completing the week
  const handleComplete = useCallback(() => {
    const allResults = Array.from(simulatedGames.values());
    onComplete(allResults);
  }, [simulatedGames, onComplete]);

  // Render game card with current state
  const renderGame = (game: WeeklyGame) => {
    const simulated = simulatedGames.get(game.gameId);
    const isSimulated = !!simulated;
    const isAnimating = animatingGameId === game.gameId;

    return (
      <GameCard
        key={game.gameId}
        game={simulated || game}
        isSimulated={isSimulated}
        isAnimating={isAnimating}
        onPress={() => handleGamePress(game.gameId)}
      />
    );
  };

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

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* User's Game Section */}
        {!isUserOnBye && userGame && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Matchup</Text>
            {renderGame(userGame)}

            {/* Action buttons for user's game */}
            {simPhase === 'initial' && (
              <View style={styles.userGameActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.playButton]}
                  onPress={handlePlayGame}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionButtonText}>PLAY GAME</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.simButton]}
                  onPress={handleSimUserGame}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionButtonText}>SIM GAME</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Bye Week Notice */}
        {isUserOnBye && (
          <View style={styles.byeWeekCard}>
            <Text style={styles.byeWeekTitle}>BYE WEEK</Text>
            <Text style={styles.byeWeekText}>
              Your team has the week off. Watch the other games around the league.
            </Text>
            {simPhase === 'initial' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.simAllButton]}
                onPress={simulateOtherGames}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>SIM ALL GAMES</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Other Games Section */}
        {otherGames.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Around the League</Text>
            {simPhase === 'simulating_others' && (
              <View style={styles.simulatingBanner}>
                <Text style={styles.simulatingText}>Simulating games...</Text>
              </View>
            )}
            {otherGames.map(renderGame)}
          </View>
        )}

        {/* Spacer for action bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Action Bar */}
      {allComplete && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionButton, styles.continueButton]}
            onPress={handleComplete}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>CONTINUE TO WEEK SUMMARY</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Box Score Modal */}
      <BoxScoreModal
        visible={showBoxScore}
        boxScore={selectedBoxScore}
        onClose={() => setShowBoxScore(false)}
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
  scrollContainer: {
    flex: 1,
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
  gameCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadows.sm,
  },
  userGameCard: {
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  completedGameCard: {
    borderWidth: 1,
    borderColor: colors.success,
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
  gameContent: {
    padding: spacing.md,
  },
  gameStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  timeSlotText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  finalText: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: fontWeight.bold,
  },
  divBadge: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  matchup: {
    gap: spacing.xxs,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xxs,
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
  record: {
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
  winnerText: {
    color: colors.success,
  },
  atSymbol: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: 16,
  },
  tapHint: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  userGameActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  playButton: {
    backgroundColor: colors.primary,
  },
  simButton: {
    backgroundColor: colors.secondary,
  },
  simAllButton: {
    backgroundColor: colors.primary,
    marginTop: spacing.md,
  },
  continueButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  byeWeekCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    margin: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  byeWeekTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  byeWeekText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  simulatingBanner: {
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  simulatingText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  actionBar: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomSpacer: {
    height: spacing.xxxl,
  },
});

export default WeeklySchedulePopup;

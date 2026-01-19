/**
 * LiveGameSimulationScreen
 * Enhanced game simulation screen with live score updates and other games ticker
 *
 * Features:
 * - Live scoreboard with animated score changes
 * - Play-by-play feed with auto-scroll
 * - Adjustable simulation speed (1x, 2x, 4x, Skip)
 * - Other games ticker showing league-wide scores
 * - Clear game state indicators
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {
  Scoreboard,
  PlayByPlayFeed,
  FieldVisualization,
  type PlayItem,
} from '../components/gamecast';
import { OtherGamesTicker } from '../components/week-flow';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../styles';
import { GameRunner, type GameResult } from '../core/game/GameRunner';
import { type LiveGameState } from '../core/engine/GameStateMachine';
import { type PlayResult } from '../core/engine/PlayResolver';
import { type GameSetupResult } from '../core/game/GameSetup';
import { type LiveGameScore } from '../core/simulation/WeekFlowState';

/**
 * Simulation speed options
 */
export type SimulationSpeed = '1x' | '2x' | '4x' | 'instant';

/**
 * Speed delays in milliseconds
 */
const SPEED_DELAYS: Record<SimulationSpeed, number> = {
  '1x': 1000,
  '2x': 500,
  '4x': 250,
  instant: 0,
};

/**
 * Props for LiveGameSimulationScreen
 */
export interface LiveGameSimulationScreenProps {
  /** Game setup result from GameSetup */
  gameSetup: GameSetupResult;
  /** Game info (week, date) */
  gameInfo?: {
    week?: number;
    date?: string;
  };
  /** Other games happening this week (for ticker) */
  otherGames?: LiveGameScore[];
  /** Callback to update other games (for simulating them in parallel) */
  onOtherGamesUpdate?: (games: LiveGameScore[]) => void;
  /** Callback when game ends */
  onGameEnd: (result: GameResult) => void;
  /** Callback to go back */
  onBack?: () => void;
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
 * Convert a PlayResult to a PlayItem for the feed
 */
function playResultToPlayItem(
  play: PlayResult,
  index: number,
  state: LiveGameState,
  offenseTeam: string
): PlayItem {
  const isScoringPlay = play.touchdown || play.outcome === 'field_goal_made';
  const isTurnover = play.turnover;
  const isBigPlay = play.yardsGained >= 20;

  return {
    id: `play-${index}`,
    quarter: typeof state.clock.quarter === 'number' ? state.clock.quarter : 5,
    time: formatTime(state.clock.timeRemaining),
    offenseTeam,
    description: play.description,
    isScoring: isScoringPlay,
    isTurnover,
    isBigPlay,
    score: `${state.score.home}-${state.score.away}`,
  };
}

/**
 * Delay helper for animation
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function LiveGameSimulationScreen({
  gameSetup,
  gameInfo,
  otherGames = [],
  onOtherGamesUpdate: _onOtherGamesUpdate,
  onGameEnd,
  onBack,
}: LiveGameSimulationScreenProps): React.JSX.Element {
  // Game runner ref
  const gameRunnerRef = useRef<GameRunner | null>(null);
  const isSimulatingRef = useRef(false);

  // State
  const [gameState, setGameState] = useState<LiveGameState | null>(null);
  const [plays, setPlays] = useState<PlayItem[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [speed, setSpeed] = useState<SimulationSpeed>('1x');
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Score animation
  const homeScoreAnim = useRef(new Animated.Value(1)).current;
  const awayScoreAnim = useRef(new Animated.Value(1)).current;
  const prevScoreRef = useRef({ home: 0, away: 0 });

  // Derived state
  const homeTeamAbbr = gameSetup.homeTeamState.teamName.substring(0, 3).toUpperCase();
  const awayTeamAbbr = gameSetup.awayTeamState.teamName.substring(0, 3).toUpperCase();

  // Initialize game runner
  useEffect(() => {
    gameRunnerRef.current = new GameRunner(
      gameSetup,
      { mode: 'playByPlay' },
      {
        week: gameInfo?.week || 1,
        date: gameInfo?.date || new Date().toISOString().split('T')[0],
      }
    );
    setGameState(gameRunnerRef.current.getCurrentState());
  }, [gameSetup, gameInfo]);

  // Animate score changes
  useEffect(() => {
    if (!gameState) return;

    if (gameState.score.home !== prevScoreRef.current.home) {
      Animated.sequence([
        Animated.timing(homeScoreAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(homeScoreAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }

    if (gameState.score.away !== prevScoreRef.current.away) {
      Animated.sequence([
        Animated.timing(awayScoreAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(awayScoreAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }

    prevScoreRef.current = { home: gameState.score.home, away: gameState.score.away };
  }, [gameState?.score.home, gameState?.score.away, homeScoreAnim, awayScoreAnim]);

  // Handle game complete
  const handleGameComplete = useCallback(() => {
    if (!gameRunnerRef.current) return;

    setIsGameOver(true);
    setIsSimulating(false);
    isSimulatingRef.current = false;

    // Get the complete game result with all stats from the runner
    const result = gameRunnerRef.current.getResult();

    // Override week if provided via gameInfo
    if (gameInfo?.week) {
      result.week = gameInfo.week;
    }

    setGameResult(result);
    onGameEnd(result);
  }, [gameInfo, onGameEnd]);

  // Run simulation with selected speed
  const runSimulation = useCallback(async () => {
    if (!gameRunnerRef.current || isSimulatingRef.current || isGameOver) return;

    setIsSimulating(true);
    isSimulatingRef.current = true;

    try {
      while (!gameRunnerRef.current.getCurrentState().isComplete && isSimulatingRef.current) {
        const currentState = gameRunnerRef.current.getCurrentState();
        const offenseTeam = currentState.field.possession === 'home' ? homeTeamAbbr : awayTeamAbbr;

        const { play, state, isComplete } = gameRunnerRef.current.runNextPlay();

        // Add play to feed
        const playItem = playResultToPlayItem(play, plays.length, state, offenseTeam);
        setPlays((prev) => [...prev, playItem]);
        setGameState(state);

        if (isComplete) {
          handleGameComplete();
          return;
        }

        // Delay based on speed (unless instant)
        const delayTime = SPEED_DELAYS[speed];
        if (delayTime > 0) {
          await delay(delayTime);
        }

        // Safety check
        if (state.plays.length > 300) {
          break;
        }
      }

      if (gameRunnerRef.current.getCurrentState().isComplete) {
        handleGameComplete();
      }
    } finally {
      setIsSimulating(false);
      isSimulatingRef.current = false;
    }
  }, [speed, isGameOver, plays.length, homeTeamAbbr, awayTeamAbbr, handleGameComplete]);

  // Start/pause simulation
  const toggleSimulation = useCallback(() => {
    if (isSimulating) {
      isSimulatingRef.current = false;
      setIsSimulating(false);
    } else {
      runSimulation();
    }
  }, [isSimulating, runSimulation]);

  // Change speed
  const handleSpeedChange = useCallback((newSpeed: SimulationSpeed) => {
    setSpeed(newSpeed);
    setShowSpeedMenu(false);
  }, []);

  // Skip to end
  const handleSkipToEnd = useCallback(async () => {
    if (!gameRunnerRef.current || isGameOver) return;

    // Stop current simulation if running
    isSimulatingRef.current = false;
    setIsSimulating(true);

    // Run all plays instantly
    while (!gameRunnerRef.current.getCurrentState().isComplete) {
      const currentState = gameRunnerRef.current.getCurrentState();
      const offenseTeam = currentState.field.possession === 'home' ? homeTeamAbbr : awayTeamAbbr;

      const { play, state, isComplete } = gameRunnerRef.current.runNextPlay();

      // Only add scoring plays and big plays when skipping
      if (play.touchdown || play.turnover || play.yardsGained >= 20) {
        const playItem = playResultToPlayItem(play, plays.length, state, offenseTeam);
        setPlays((prev) => [...prev, playItem]);
      }

      setGameState(state);

      if (isComplete || state.plays.length > 300) {
        break;
      }
    }

    handleGameComplete();
  }, [isGameOver, plays.length, homeTeamAbbr, awayTeamAbbr, handleGameComplete]);

  // Loading state
  if (!gameState) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Preparing game...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate derived values
  const isRedZone =
    (gameState.field.possession === 'home' && gameState.field.ballPosition >= 80) ||
    (gameState.field.possession === 'away' && gameState.field.ballPosition <= 20);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && !isSimulating ? (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{isGameOver ? 'Final' : 'Live Game'}</Text>
          {!isGameOver && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
        {/* Scoreboard with animated scores */}
        <View style={styles.scoreboardContainer}>
          <Scoreboard
            homeTeamName={gameSetup.homeTeamState.teamName}
            homeTeamAbbr={homeTeamAbbr}
            awayTeamName={gameSetup.awayTeamState.teamName}
            awayTeamAbbr={awayTeamAbbr}
            homeScore={gameState.score.home}
            awayScore={gameState.score.away}
            quarter={gameState.clock.quarter}
            timeRemaining={gameState.clock.timeRemaining}
            homeTimeouts={gameSetup.homeTeamState.timeoutsRemaining}
            awayTimeouts={gameSetup.awayTeamState.timeoutsRemaining}
            possession={isGameOver ? null : gameState.field.possession}
            isGameOver={isGameOver}
          />
        </View>

        {/* Field Visualization */}
        {!isGameOver && (
          <FieldVisualization
            ballPosition={gameState.field.ballPosition}
            down={gameState.field.down}
            yardsToGo={gameState.field.yardsToGo}
            possession={gameState.field.possession}
            homeTeamAbbr={homeTeamAbbr}
            awayTeamAbbr={awayTeamAbbr}
            isRedZone={isRedZone}
          />
        )}

        {/* Simulation Controls */}
        {!isGameOver && (
          <View style={styles.controlsContainer}>
            {/* Play/Pause Button */}
            <TouchableOpacity
              style={[styles.mainButton, isSimulating && styles.pauseButton]}
              onPress={toggleSimulation}
              activeOpacity={0.8}
            >
              <Text style={styles.mainButtonText}>{isSimulating ? '⏸ Pause' : '▶ Play'}</Text>
            </TouchableOpacity>

            {/* Speed Selector */}
            <View style={styles.speedContainer}>
              <TouchableOpacity
                style={styles.speedButton}
                onPress={() => setShowSpeedMenu(!showSpeedMenu)}
                activeOpacity={0.8}
              >
                <Text style={styles.speedButtonText}>{speed}</Text>
                <Text style={styles.speedArrow}>▼</Text>
              </TouchableOpacity>

              {showSpeedMenu && (
                <View style={styles.speedMenu}>
                  {(['1x', '2x', '4x', 'instant'] as SimulationSpeed[]).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.speedOption, speed === s && styles.speedOptionActive]}
                      onPress={() => handleSpeedChange(s)}
                    >
                      <Text
                        style={[
                          styles.speedOptionText,
                          speed === s && styles.speedOptionTextActive,
                        ]}
                      >
                        {s === 'instant' ? 'Skip' : s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Skip to End */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkipToEnd}
              activeOpacity={0.8}
            >
              <Text style={styles.skipButtonText}>Skip →|</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Game Over Actions */}
        {isGameOver && gameResult && (
          <View style={styles.gameOverContainer}>
            <View
              style={[
                styles.resultCard,
                gameResult.homeScore > gameResult.awayScore
                  ? styles.resultCardWin
                  : gameResult.homeScore < gameResult.awayScore
                    ? styles.resultCardLoss
                    : styles.resultCardTie,
              ]}
            >
              <Text style={styles.resultLabel}>GAME OVER</Text>
              <Text style={styles.resultScore}>
                {gameResult.homeScore} - {gameResult.awayScore}
              </Text>
            </View>
          </View>
        )}

        {/* Play-by-Play Feed */}
        <View style={styles.feedContainer}>
          <Text style={styles.feedTitle}>Play-by-Play</Text>
          <PlayByPlayFeed
            plays={plays}
            maxHeight={300}
            autoScroll={true}
            emptyMessage="Game starting..."
          />
        </View>

        {/* Other Games Ticker */}
        {otherGames.length > 0 && (
          <View style={styles.tickerContainer}>
            <OtherGamesTicker
              games={otherGames}
              onGamePress={(_game) => {
                // Could show expanded game details in future
              }}
            />
          </View>
        )}
      </ScrollView>
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
    ...shadows.md,
  },
  backButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    width: 60,
  },
  backButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  liveText: {
    color: colors.error,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  headerSpacer: {
    width: 60,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  scoreboardContainer: {
    ...shadows.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  mainButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    minWidth: 120,
    alignItems: 'center',
    ...shadows.md,
  },
  pauseButton: {
    backgroundColor: colors.warning,
  },
  mainButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  speedContainer: {
    position: 'relative',
  },
  speedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  speedButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  speedArrow: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  speedMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
    zIndex: 100,
    ...shadows.lg,
  },
  speedOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  speedOptionActive: {
    backgroundColor: colors.primaryLight,
  },
  speedOptionText: {
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'center',
  },
  speedOptionTextActive: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.bold,
  },
  skipButton: {
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  skipButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  gameOverContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  resultCard: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  resultCardWin: {
    backgroundColor: colors.success + '20',
    borderWidth: 2,
    borderColor: colors.success,
  },
  resultCardLoss: {
    backgroundColor: colors.error + '20',
    borderWidth: 2,
    borderColor: colors.error,
  },
  resultCardTie: {
    backgroundColor: colors.warning + '20',
    borderWidth: 2,
    borderColor: colors.warning,
  },
  resultLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  resultScore: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  feedContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  feedTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tickerContainer: {
    marginTop: spacing.sm,
  },
});

export default LiveGameSimulationScreen;

/**
 * GamecastScreen
 * Main screen for live game viewing with play-by-play simulation.
 *
 * This screen integrates all gamecast components and manages game state
 * through the GameRunner from the core simulation engine.
 *
 * PRIVACY: This screen follows the "black box" principle - only outcomes
 * are displayed, never probabilities, dice rolls, or internal mechanics.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Text, TouchableOpacity, Alert } from 'react-native';
import {
  FieldVisualization,
  Scoreboard,
  PlayByPlayFeed,
  SimControls,
  type PlayItem,
  type SimulationMode,
} from '../components/gamecast';
import { colors, spacing, fontSize, fontWeight, shadows } from '../styles';
import { GameRunner, type GameResult } from '../core/game/GameRunner';
import { type LiveGameState } from '../core/engine/GameStateMachine';
import { type PlayResult } from '../core/engine/PlayResolver';
import { type GameSetupResult } from '../core/game/GameSetup';

/**
 * Props for GamecastScreen
 */
export interface GamecastScreenProps {
  /** Game setup result from GameSetup */
  gameSetup: GameSetupResult;
  /** Optional game info */
  gameInfo?: {
    week?: number;
    date?: string;
  };
  /** Callback when game ends */
  onGameEnd?: (result: GameResult) => void;
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

/**
 * GamecastScreen Component
 */
export function GamecastScreen({
  gameSetup,
  gameInfo,
  onGameEnd,
  onBack,
}: GamecastScreenProps): React.JSX.Element {
  // Game runner ref
  const gameRunnerRef = useRef<GameRunner | null>(null);

  // State
  const [gameState, setGameState] = useState<LiveGameState | null>(null);
  const [plays, setPlays] = useState<PlayItem[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentMode, setCurrentMode] = useState<SimulationMode | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);

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

  // Handle single play
  const handleWatchPlay = useCallback(async () => {
    if (!gameRunnerRef.current || isSimulating || isGameOver) return;

    setIsSimulating(true);
    setCurrentMode('play');

    try {
      const currentState = gameRunnerRef.current.getCurrentState();
      const offenseTeam = currentState.field.possession === 'home' ? homeTeamAbbr : awayTeamAbbr;

      // Add delay for animation effect
      await delay(500);

      const { play, state, isComplete } = gameRunnerRef.current.runNextPlay();

      // Add play to feed
      const playItem = playResultToPlayItem(play, plays.length, state, offenseTeam);
      setPlays((prev) => [...prev, playItem]);

      // Update state
      setGameState(state);

      if (isComplete) {
        handleGameComplete();
      }
    } finally {
      setIsSimulating(false);
      setCurrentMode(null);
    }
  }, [isSimulating, isGameOver, plays.length, homeTeamAbbr, awayTeamAbbr]);

  // Handle quick sim (one drive)
  const handleQuickSim = useCallback(async () => {
    if (!gameRunnerRef.current || isSimulating || isGameOver) return;

    setIsSimulating(true);
    setCurrentMode('drive');

    try {
      const currentState = gameRunnerRef.current.getCurrentState();
      const offenseTeam = currentState.field.possession === 'home' ? homeTeamAbbr : awayTeamAbbr;

      const { plays: drivePlays, state, isComplete } = gameRunnerRef.current.runDrive();

      // Add all plays to feed
      const newPlays = drivePlays.map((play, idx) =>
        playResultToPlayItem(play, plays.length + idx, state, offenseTeam)
      );
      setPlays((prev) => [...prev, ...newPlays]);

      // Update state
      setGameState(state);

      if (isComplete) {
        handleGameComplete();
      }
    } finally {
      setIsSimulating(false);
      setCurrentMode(null);
    }
  }, [isSimulating, isGameOver, plays.length, homeTeamAbbr, awayTeamAbbr]);

  // Handle sim quarter
  const handleSimQuarter = useCallback(async () => {
    if (!gameRunnerRef.current || isSimulating || isGameOver) return;

    setIsSimulating(true);
    setCurrentMode('quarter');

    try {
      const { plays: quarterPlays, state, isComplete } = gameRunnerRef.current.runQuarter();

      // Add all plays to feed
      const newPlays = quarterPlays.map((play, idx) => {
        const playState = gameRunnerRef.current?.getCurrentState() || state;
        const offenseTeam = playState.field.possession === 'home' ? homeTeamAbbr : awayTeamAbbr;
        return playResultToPlayItem(play, plays.length + idx, state, offenseTeam);
      });
      setPlays((prev) => [...prev, ...newPlays]);

      // Update state
      setGameState(state);

      if (isComplete) {
        handleGameComplete();
      }
    } finally {
      setIsSimulating(false);
      setCurrentMode(null);
    }
  }, [isSimulating, isGameOver, plays.length, homeTeamAbbr, awayTeamAbbr]);

  // Handle sim to end
  const handleSimToEnd = useCallback(async () => {
    if (!gameRunnerRef.current || isSimulating || isGameOver) return;

    setIsSimulating(true);
    setCurrentMode('end');

    try {
      // Run remaining plays until game is over
      while (!gameRunnerRef.current.getCurrentState().isComplete) {
        const currentState = gameRunnerRef.current.getCurrentState();
        const offenseTeam = currentState.field.possession === 'home' ? homeTeamAbbr : awayTeamAbbr;

        const { play, state, isComplete } = gameRunnerRef.current.runNextPlay();

        const playItem = playResultToPlayItem(play, plays.length, state, offenseTeam);
        setPlays((prev) => [...prev, playItem]);
        setGameState(state);

        if (isComplete) {
          break;
        }

        // Safety check to prevent infinite loops
        if (state.plays.length > 300) {
          break;
        }
      }

      handleGameComplete();
    } finally {
      setIsSimulating(false);
      setCurrentMode(null);
    }
  }, [isSimulating, isGameOver, plays.length, homeTeamAbbr, awayTeamAbbr]);

  // Handle game complete
  const handleGameComplete = useCallback(() => {
    if (!gameRunnerRef.current) return;

    setIsGameOver(true);

    // Generate final result
    const finalState = gameRunnerRef.current.getCurrentState();
    const boxScore = gameRunnerRef.current.getBoxScore();

    // Create a minimal game result for the callback
    const result: GameResult = {
      gameId: finalState.gameId,
      week: gameInfo?.week || 1,
      homeTeamId: finalState.homeTeam.teamId,
      awayTeamId: finalState.awayTeam.teamId,
      homeScore: finalState.score.home,
      awayScore: finalState.score.away,
      winnerId:
        finalState.score.home > finalState.score.away
          ? finalState.homeTeam.teamId
          : finalState.score.away > finalState.score.home
            ? finalState.awayTeam.teamId
            : '',
      loserId:
        finalState.score.home < finalState.score.away
          ? finalState.homeTeam.teamId
          : finalState.score.away < finalState.score.home
            ? finalState.awayTeam.teamId
            : '',
      isTie: finalState.score.home === finalState.score.away,
      homeStats: {} as GameResult['homeStats'],
      awayStats: {} as GameResult['awayStats'],
      boxScore,
      injuries: [],
      notableEvents: [],
      keyPlays: [],
    };

    setGameResult(result);

    if (onGameEnd) {
      onGameEnd(result);
    }
  }, [gameInfo, onGameEnd]);

  // Handle view box score
  const handleViewBoxScore = useCallback(() => {
    if (!gameResult?.boxScore) {
      Alert.alert('Box Score', 'Box score not available yet.');
      return;
    }

    const { homeTeam, awayTeam, passingLeaders, rushingLeaders, teamComparison } = gameResult.boxScore;

    // Get team comparison stats
    const totalYardsHome = teamComparison.find(c => c.category === 'Total Yards')?.home || 0;
    const totalYardsAway = teamComparison.find(c => c.category === 'Total Yards')?.away || 0;
    const turnoversHome = teamComparison.find(c => c.category === 'Turnovers')?.home || 0;
    const turnoversAway = teamComparison.find(c => c.category === 'Turnovers')?.away || 0;

    // Format passing leaders - use statLine which contains formatted stats
    const passingText = passingLeaders.length > 0
      ? passingLeaders.slice(0, 2).map(p => `${p.playerName}: ${p.statLine}`).join('\n')
      : 'No passing stats';

    // Format rushing leaders
    const rushingText = rushingLeaders.length > 0
      ? rushingLeaders.slice(0, 2).map(p => `${p.playerName}: ${p.statLine}`).join('\n')
      : 'No rushing stats';

    const boxScoreText = `
FINAL SCORE
${homeTeam.name}: ${homeTeam.score}
${awayTeam.name}: ${awayTeam.score}

TOTAL YARDS
Home: ${totalYardsHome} | Away: ${totalYardsAway}

TURNOVERS
Home: ${turnoversHome} | Away: ${turnoversAway}

PASSING LEADERS
${passingText}

RUSHING LEADERS
${rushingText}`.trim();

    Alert.alert('Box Score', boxScoreText);
  }, [gameResult]);

  // If game state not initialized yet
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
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Gamecast</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
        {/* Scoreboard */}
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

        {/* Field Visualization */}
        <FieldVisualization
          ballPosition={gameState.field.ballPosition}
          down={gameState.field.down}
          yardsToGo={gameState.field.yardsToGo}
          possession={gameState.field.possession}
          homeTeamAbbr={homeTeamAbbr}
          awayTeamAbbr={awayTeamAbbr}
          isRedZone={isRedZone}
        />

        {/* Sim Controls */}
        <SimControls
          onWatchPlay={handleWatchPlay}
          onQuickSim={handleQuickSim}
          onSimQuarter={handleSimQuarter}
          onSimToEnd={handleSimToEnd}
          isSimulating={isSimulating}
          currentMode={currentMode}
          isGameOver={isGameOver}
          onViewBoxScore={handleViewBoxScore}
        />

        {/* Play-by-Play Feed */}
        <PlayByPlayFeed
          plays={plays}
          maxHeight={400}
          autoScroll={true}
          emptyMessage="Press 'Watch Play' to start the game!"
        />
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
  },
  backButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  headerTitle: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  headerSpacer: {
    width: 60, // Match back button width for centering
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
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
});

export default GamecastScreen;

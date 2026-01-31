/**
 * GameDayScreen
 *
 * Unified game day experience combining pre-game, live simulation, and post-game
 * into a single cohesive screen with clear phase transitions.
 *
 * Features:
 * - Pre-game: Matchup info, injury report, predictions
 * - Live game: Scoreboard, play-by-play, simulation controls
 * - Post-game: Final score, box score, key plays, MVP
 * - Smooth transitions between phases
 * - Accessibility compliant (44pt touch targets, proper labels)
 */

import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Scoreboard,
  PlayByPlayFeed,
  FieldVisualization,
  type PlayItem,
} from '../components/gamecast';
import { LoadingScreen } from '../components';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  accessibility,
} from '../styles';
import {
  GameDayFlow,
  createGameDayFlow,
  GameDayFlowState,
  PreGameInfo,
  PostGameInfo,
  LiveGameDisplay,
  SimulationSpeed,
  GamePrediction,
} from '../core/gameflow';
import { GameState } from '../core/models/game/GameState';
import { ScheduledGame, updateGameResult } from '../core/season/ScheduleGenerator';
import { GameResult } from '../core/game/GameRunner';

// ============================================================================
// TYPES
// ============================================================================

export interface GameDayScreenProps {
  /** The scheduled game */
  game: ScheduledGame;
  /** Current game state */
  gameState: GameState;
  /** User's team ID */
  userTeamId: string;
  /** Callback when game completes */
  onGameComplete: (result: GameResult, updatedGameState: GameState) => void;
  /** Callback to go back */
  onBack?: () => void;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Pre-game phase component
 */
function PreGamePhase({
  preGameInfo,
  prediction,
  onSetPrediction,
  onStartGame,
}: {
  preGameInfo: PreGameInfo;
  prediction: GamePrediction;
  onSetPrediction: (p: GamePrediction) => void;
  onStartGame: () => void;
}) {
  const {
    userTeam,
    opponent,
    isUserHome,
    weather,
    userInjuries,
    opponentInjuries,
    keyMatchup,
    userForm,
    opponentForm,
  } = preGameInfo;

  return (
    <ScrollView style={styles.phaseContainer} contentContainerStyle={styles.phaseContent}>
      {/* Matchup Header */}
      <View style={styles.matchupHeader}>
        <Text style={styles.weekLabel}>Week {preGameInfo.week}</Text>
        <View style={styles.matchupTeams}>
          <View style={styles.teamColumn}>
            <Text style={styles.teamAbbr}>{userTeam.abbreviation}</Text>
            <Text style={styles.teamName}>{userTeam.nickname}</Text>
            <Text style={styles.teamRecord}>
              {userTeam.currentRecord.wins}-{userTeam.currentRecord.losses}
            </Text>
            <View style={styles.formRow}>
              {userForm.slice(0, 3).map((g, i) => (
                <View
                  key={i}
                  style={[styles.formBadge, g.result === 'W' ? styles.formWin : styles.formLoss]}
                >
                  <Text style={styles.formText}>{g.result}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.vsColumn}>
            <Text style={styles.vsText}>{isUserHome ? 'vs' : '@'}</Text>
          </View>

          <View style={styles.teamColumn}>
            <Text style={styles.teamAbbr}>{opponent.abbreviation}</Text>
            <Text style={styles.teamName}>{opponent.nickname}</Text>
            <Text style={styles.teamRecord}>
              {opponent.currentRecord.wins}-{opponent.currentRecord.losses}
            </Text>
            <View style={styles.formRow}>
              {opponentForm.slice(0, 3).map((g, i) => (
                <View
                  key={i}
                  style={[styles.formBadge, g.result === 'W' ? styles.formWin : styles.formLoss]}
                >
                  <Text style={styles.formText}>{g.result}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Key Matchup */}
      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>Key Matchup</Text>
        <Text style={styles.infoCardText}>{keyMatchup}</Text>
      </View>

      {/* Weather */}
      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>Weather</Text>
        <View style={styles.weatherRow}>
          <Ionicons
            name={weather.precipitation === 'none' ? 'sunny' : 'rainy'}
            size={24}
            color={colors.text}
          />
          <Text style={styles.weatherText}>
            {weather.temperature}°F • Wind: {weather.wind} mph
            {weather.isDome && ' (Dome)'}
          </Text>
        </View>
      </View>

      {/* Injuries */}
      {(userInjuries.length > 0 || opponentInjuries.length > 0) && (
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Injury Report</Text>
          {userInjuries.length > 0 && (
            <View style={styles.injurySection}>
              <Text style={styles.injuryTeam}>{userTeam.abbreviation}</Text>
              {userInjuries.slice(0, 3).map((inj) => (
                <Text key={inj.playerId} style={styles.injuryText}>
                  {inj.playerName} ({inj.position}) - {inj.status.toUpperCase()}
                </Text>
              ))}
            </View>
          )}
          {opponentInjuries.length > 0 && (
            <View style={styles.injurySection}>
              <Text style={styles.injuryTeam}>{opponent.abbreviation}</Text>
              {opponentInjuries.slice(0, 3).map((inj) => (
                <Text key={inj.playerId} style={styles.injuryText}>
                  {inj.playerName} ({inj.position}) - {inj.status.toUpperCase()}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Prediction */}
      <View style={styles.predictionCard}>
        <Text style={styles.predictionTitle}>Your Prediction</Text>
        <Text style={styles.predictionSubtitle}>(Optional - affects post-game reaction)</Text>
        <View style={styles.predictionButtons}>
          <TouchableOpacity
            style={[
              styles.predictionButton,
              prediction === 'win' && styles.predictionButtonSelected,
            ]}
            onPress={() => onSetPrediction(prediction === 'win' ? null : 'win')}
            accessibilityLabel="Predict win"
            accessibilityRole="button"
            accessibilityState={{ selected: prediction === 'win' }}
          >
            <Text
              style={[
                styles.predictionButtonText,
                prediction === 'win' && styles.predictionButtonTextSelected,
              ]}
            >
              Win
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.predictionButton,
              prediction === 'loss' && styles.predictionButtonSelected,
            ]}
            onPress={() => onSetPrediction(prediction === 'loss' ? null : 'loss')}
            accessibilityLabel="Predict loss"
            accessibilityRole="button"
            accessibilityState={{ selected: prediction === 'loss' }}
          >
            <Text
              style={[
                styles.predictionButtonText,
                prediction === 'loss' && styles.predictionButtonTextSelected,
              ]}
            >
              Loss
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Start Game Button */}
      <TouchableOpacity
        style={styles.startButton}
        onPress={onStartGame}
        accessibilityLabel="Start game simulation"
        accessibilityRole="button"
        accessibilityHint="Begins the game simulation"
      >
        <Ionicons name="play" size={24} color={colors.textOnPrimary} />
        <Text style={styles.startButtonText}>Start Game</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/**
 * Live game phase component
 */
function LiveGamePhase({
  liveGame,
  plays,
  speed,
  isPaused,
  isSimulating,
  onSpeedChange,
  onPause,
  _onResume,
  onSkip,
  onWatchPlay,
}: {
  liveGame: LiveGameDisplay;
  plays: PlayItem[];
  speed: SimulationSpeed;
  isPaused: boolean;
  isSimulating: boolean;
  onSpeedChange: (s: SimulationSpeed) => void;
  onPause: () => void;
  _onResume: () => void;
  onSkip: () => void;
  onWatchPlay: () => void;
}) {
  const isRedZone =
    (liveGame.possession === 'home' && liveGame.ballPosition >= 80) ||
    (liveGame.possession === 'away' && liveGame.ballPosition <= 20);

  return (
    <ScrollView style={styles.phaseContainer} contentContainerStyle={styles.phaseContent}>
      {/* Scoreboard */}
      <Scoreboard
        homeTeamName={liveGame.homeTeam.name}
        homeTeamAbbr={liveGame.homeTeam.abbr}
        awayTeamName={liveGame.awayTeam.name}
        awayTeamAbbr={liveGame.awayTeam.abbr}
        homeScore={liveGame.homeScore}
        awayScore={liveGame.awayScore}
        quarter={liveGame.quarter === 'Final' ? 4 : liveGame.quarter}
        timeRemaining={liveGame.timeRemaining}
        homeTimeouts={liveGame.homeTeam.timeoutsRemaining}
        awayTimeouts={liveGame.awayTeam.timeoutsRemaining}
        possession={liveGame.isComplete ? null : liveGame.possession}
        isGameOver={liveGame.isComplete}
      />

      {/* Field Visualization */}
      {!liveGame.isComplete && (
        <FieldVisualization
          ballPosition={liveGame.ballPosition}
          down={liveGame.down}
          yardsToGo={liveGame.yardsToGo}
          possession={liveGame.possession}
          homeTeamAbbr={liveGame.homeTeam.abbr}
          awayTeamAbbr={liveGame.awayTeam.abbr}
          isRedZone={isRedZone}
        />
      )}

      {/* Simulation Controls */}
      {!liveGame.isComplete && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[styles.controlButton, styles.playButton]}
            onPress={isPaused || !isSimulating ? onWatchPlay : onPause}
            accessibilityLabel={isPaused || !isSimulating ? 'Play next' : 'Pause'}
            accessibilityRole="button"
          >
            <Ionicons
              name={isPaused || !isSimulating ? 'play' : 'pause'}
              size={20}
              color={colors.textOnPrimary}
            />
            <Text style={styles.controlButtonText}>
              {isPaused || !isSimulating ? 'Play' : 'Pause'}
            </Text>
          </TouchableOpacity>

          {/* Speed Selector */}
          <View style={styles.speedSelector}>
            {(['slow', 'normal', 'fast'] as SimulationSpeed[]).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.speedButton, speed === s && styles.speedButtonActive]}
                onPress={() => onSpeedChange(s)}
                accessibilityLabel={`${s} speed`}
                accessibilityRole="button"
                accessibilityState={{ selected: speed === s }}
              >
                <Text style={[styles.speedButtonText, speed === s && styles.speedButtonTextActive]}>
                  {s === 'slow' ? '1x' : s === 'normal' ? '2x' : '4x'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.controlButton, styles.skipButton]}
            onPress={onSkip}
            accessibilityLabel="Skip to end"
            accessibilityRole="button"
          >
            <Text style={styles.skipButtonText}>Skip</Text>
            <Ionicons name="play-forward" size={18} color={colors.textOnPrimary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Play-by-Play */}
      <View style={styles.playByPlayContainer}>
        <Text style={styles.sectionTitle}>Play-by-Play</Text>
        <PlayByPlayFeed
          plays={plays}
          maxHeight={300}
          autoScroll={true}
          emptyMessage="Game starting..."
        />
      </View>
    </ScrollView>
  );
}

/**
 * Post-game phase component
 */
function PostGamePhase({
  postGameInfo,
  onContinue,
  isDisabled,
  isLoading,
}: {
  postGameInfo: PostGameInfo;
  onContinue: () => void;
  isDisabled?: boolean;
  isLoading?: boolean;
}) {
  const { result, userWon, newUserRecord, mvp, keyPlays, newInjuries, predictionCorrect } =
    postGameInfo;

  return (
    <ScrollView style={styles.phaseContainer} contentContainerStyle={styles.phaseContent}>
      {/* Final Score Card */}
      <View style={[styles.finalScoreCard, userWon ? styles.winCard : styles.lossCard]}>
        <Text style={styles.finalLabel}>FINAL</Text>
        <Text style={styles.finalScore}>
          {result.homeScore} - {result.awayScore}
        </Text>
        <Text style={[styles.resultText, userWon ? styles.winText : styles.lossText]}>
          {userWon ? 'VICTORY!' : 'DEFEAT'}
        </Text>
        <Text style={styles.newRecord}>Record: {newUserRecord}</Text>

        {predictionCorrect !== null && (
          <View style={styles.predictionResult}>
            <Ionicons
              name={predictionCorrect ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={predictionCorrect ? colors.success : colors.error}
            />
            <Text style={styles.predictionResultText}>
              Prediction {predictionCorrect ? 'Correct!' : 'Wrong'}
            </Text>
          </View>
        )}
      </View>

      {/* MVP */}
      {mvp && (
        <View style={styles.mvpCard}>
          <Text style={styles.mvpLabel}>PLAYER OF THE GAME</Text>
          <Text style={styles.mvpName}>{mvp.playerName}</Text>
          <Text style={styles.mvpPosition}>{mvp.position}</Text>
          <Text style={styles.mvpStats}>{mvp.statLine}</Text>
        </View>
      )}

      {/* Key Plays */}
      {keyPlays.length > 0 && (
        <View style={styles.keyPlaysCard}>
          <Text style={styles.sectionTitle}>Key Plays</Text>
          {keyPlays.slice(0, 5).map((play) => (
            <View key={play.id} style={styles.keyPlayItem}>
              <Text style={styles.keyPlayTime}>
                Q{play.quarter} {play.time}
              </Text>
              <Text style={styles.keyPlayDescription}>{play.description}</Text>
            </View>
          ))}
        </View>
      )}

      {/* New Injuries */}
      {newInjuries.length > 0 && (
        <View style={styles.injuryCard}>
          <Text style={styles.sectionTitle}>Injuries</Text>
          {newInjuries.map((injury) => (
            <Text key={injury.playerId} style={styles.injuryItem}>
              {injury.playerName} - {injury.injury}
            </Text>
          ))}
        </View>
      )}

      {/* Continue Button */}
      <TouchableOpacity
        style={[styles.continueButton, isDisabled && styles.continueButtonDisabled]}
        onPress={onContinue}
        disabled={isDisabled}
        accessibilityLabel={isLoading ? 'Saving game results' : 'Continue'}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
      >
        {isLoading ? (
          <>
            <ActivityIndicator size="small" color={colors.textOnPrimary} />
            <Text style={styles.continueButtonText}>Saving...</Text>
          </>
        ) : (
          <>
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.textOnPrimary} />
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GameDayScreen({
  game,
  gameState,
  userTeamId,
  onGameComplete,
  onBack,
}: GameDayScreenProps): React.JSX.Element {
  // Game day flow
  const gameDayFlowRef = useRef<GameDayFlow | null>(null);

  // Store initial values in refs to avoid re-initializing when props change
  // This is critical: we only want to initialize the game flow once
  const initialGameRef = useRef(game);
  const initialGameStateRef = useRef(gameState);
  const initialUserTeamIdRef = useRef(userTeamId);

  // State
  const [flowState, setFlowState] = useState<GameDayFlowState | null>(null);
  const [plays, setPlays] = useState<PlayItem[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);

  // Initialize game day flow - only runs once on mount
  useEffect(() => {
    const flow = createGameDayFlow();
    gameDayFlowRef.current = flow;

    // Wire up callbacks
    flow.setOnStateChange((state) => {
      setFlowState(state);
    });

    flow.setOnLiveGameUpdate((liveGame) => {
      // Convert to PlayItem format
      if (liveGame.recentPlays.length > 0) {
        setPlays((prev) => {
          const newPlays = liveGame.recentPlays
            .filter((p) => !prev.some((existing) => existing.id === p.id))
            .map((p) => ({
              id: p.id,
              quarter: p.quarter,
              time: p.time,
              offenseTeam: p.offenseTeam,
              description: p.description,
              isScoring: p.isScoring,
              isTurnover: p.isTurnover,
              isBigPlay: p.isBigPlay,
              score: p.score,
            }));
          return [...prev, ...newPlays];
        });
      }
    });

    // Initialize with the initial values captured on mount
    flow.initializeGameDay(
      initialGameRef.current,
      initialGameStateRef.current,
      initialUserTeamIdRef.current
    );

    return () => {
      // Cleanup
    };
    // Empty dependency array - only initialize once on mount
    // Using refs for initial values ensures we don't re-initialize when props change
  }, []);

  // Handlers
  const handleSetPrediction = useCallback((prediction: GamePrediction) => {
    gameDayFlowRef.current?.setPrediction(prediction);
  }, []);

  const handleStartGame = useCallback(() => {
    setPlays([]);
    gameDayFlowRef.current?.startGame();
  }, []);

  const handleSpeedChange = useCallback((speed: SimulationSpeed) => {
    gameDayFlowRef.current?.setSpeed(speed);
  }, []);

  const handlePause = useCallback(() => {
    gameDayFlowRef.current?.pause();
    setIsSimulating(false);
  }, []);

  const handleResume = useCallback(() => {
    gameDayFlowRef.current?.resume();
    setIsSimulating(true);
  }, []);

  const handleWatchPlay = useCallback(async () => {
    setIsSimulating(true);
    await gameDayFlowRef.current?.runNextPlay();
    setIsSimulating(false);
  }, []);

  const handleSkip = useCallback(async () => {
    setIsSimulating(true);
    await gameDayFlowRef.current?.skipToEnd();
    setIsSimulating(false);
  }, []);

  const handleContinue = useCallback(() => {
    // Prevent double-tap
    if (isContinuing) return;

    const result = gameDayFlowRef.current?.getGameResult();
    if (!result) return;

    // Disable button immediately
    setIsContinuing(true);

    try {
      // Get the original game state from when the screen was mounted
      const originalGameState = initialGameStateRef.current;
      const schedule = originalGameState.league.schedule;

      if (!schedule) {
        console.error('No schedule found in game state');
        setIsContinuing(false);
        return;
      }

      // 1. Update the schedule with game result
      const updatedSchedule = updateGameResult(
        schedule,
        game.gameId,
        result.homeScore,
        result.awayScore
      );

      // 2. Update team records
      const homeTeam = originalGameState.teams[result.homeTeamId];
      const awayTeam = originalGameState.teams[result.awayTeamId];

      if (!homeTeam || !awayTeam) {
        console.error('Teams not found');
        setIsContinuing(false);
        return;
      }

      const homeWon = result.homeScore > result.awayScore;
      const awayWon = result.awayScore > result.homeScore;
      const isTie = result.homeScore === result.awayScore;

      const updatedTeams = {
        ...originalGameState.teams,
        [result.homeTeamId]: {
          ...homeTeam,
          currentRecord: {
            ...homeTeam.currentRecord,
            wins: homeTeam.currentRecord.wins + (homeWon ? 1 : 0),
            losses: homeTeam.currentRecord.losses + (awayWon ? 1 : 0),
            ties: homeTeam.currentRecord.ties + (isTie ? 1 : 0),
          },
        },
        [result.awayTeamId]: {
          ...awayTeam,
          currentRecord: {
            ...awayTeam.currentRecord,
            wins: awayTeam.currentRecord.wins + (awayWon ? 1 : 0),
            losses: awayTeam.currentRecord.losses + (homeWon ? 1 : 0),
            ties: awayTeam.currentRecord.ties + (isTie ? 1 : 0),
          },
        },
      };

      // 3. Apply injuries to players
      let updatedPlayers = { ...originalGameState.players };
      for (const injury of result.injuries) {
        const player = updatedPlayers[injury.playerId];
        if (player && injury.weeksOut > 0) {
          updatedPlayers[injury.playerId] = {
            ...player,
            injuryStatus: {
              ...player.injuryStatus,
              severity: injury.weeksOut > 4 ? 'ir' : injury.weeksOut > 1 ? 'out' : 'questionable',
              type: player.injuryStatus.type || 'other',
              weeksRemaining: injury.weeksOut,
              isPublic: true,
            },
          };
        }
      }

      // 4. Create the updated game state
      const updatedGameState: GameState = {
        ...originalGameState,
        teams: updatedTeams,
        players: updatedPlayers,
        league: {
          ...originalGameState.league,
          schedule: updatedSchedule,
        },
      };

      // 5. Call onGameComplete with the updated state
      onGameComplete(result, updatedGameState);
    } catch (error) {
      console.error('Error processing game result:', error);
      setIsContinuing(false);
    }
  }, [isContinuing, game.gameId, onGameComplete]);

  // Loading state
  if (!flowState) {
    return (
      <LoadingScreen
        message="Preparing game day..."
        hint="Setting up matchup"
        testID="gameday-loading"
      />
    );
  }

  // Determine which phase to render
  const renderPhase = () => {
    switch (flowState.phase) {
      case 'pre_game':
        if (!flowState.preGameInfo) return null;
        return (
          <PreGamePhase
            preGameInfo={flowState.preGameInfo}
            prediction={flowState.prediction}
            onSetPrediction={handleSetPrediction}
            onStartGame={handleStartGame}
          />
        );

      case 'coin_toss':
        return (
          <View style={styles.coinTossContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.coinTossText}>Coin Toss...</Text>
          </View>
        );

      case 'simulating':
        if (!flowState.liveGame) return null;
        return (
          <LiveGamePhase
            liveGame={flowState.liveGame}
            plays={plays}
            speed={flowState.simulationSpeed}
            isPaused={flowState.isPaused}
            isSimulating={isSimulating}
            onSpeedChange={handleSpeedChange}
            onPause={handlePause}
            _onResume={handleResume}
            onSkip={handleSkip}
            onWatchPlay={handleWatchPlay}
          />
        );

      case 'post_game':
        if (!flowState.postGameInfo) return null;
        return (
          <PostGamePhase
            postGameInfo={flowState.postGameInfo}
            onContinue={handleContinue}
            isDisabled={isContinuing}
            isLoading={isContinuing}
          />
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && flowState.phase === 'pre_game' ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={accessibility.hitSlop}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textOnPrimary} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}

        <Text style={styles.headerTitle}>
          {flowState.phase === 'pre_game'
            ? 'Game Day'
            : flowState.phase === 'post_game'
              ? 'Final'
              : 'Live Game'}
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {renderPhase()}
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

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
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: accessibility.minTouchTarget,
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
    width: 70,
  },
  phaseContainer: {
    flex: 1,
  },
  phaseContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },

  // Pre-game styles
  matchupHeader: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  weekLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  matchupTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  teamColumn: {
    alignItems: 'center',
    flex: 1,
  },
  teamAbbr: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  teamName: {
    fontSize: fontSize.md,
    color: colors.text,
    marginTop: spacing.xs,
  },
  teamRecord: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  formBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formWin: {
    backgroundColor: colors.success,
  },
  formLoss: {
    backgroundColor: colors.error,
  },
  formText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  vsColumn: {
    paddingHorizontal: spacing.md,
  },
  vsText: {
    fontSize: fontSize.xl,
    color: colors.textSecondary,
    fontWeight: fontWeight.bold,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  infoCardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoCardText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  weatherText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  injurySection: {
    marginBottom: spacing.sm,
  },
  injuryTeam: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  injuryText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  predictionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  predictionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  predictionSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  predictionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  predictionButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    minWidth: 100,
    alignItems: 'center',
  },
  predictionButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  predictionButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  predictionButtonTextSelected: {
    color: colors.textOnPrimary,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    minHeight: accessibility.minTouchTarget,
    ...shadows.md,
  },
  startButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },

  // Live game styles
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    minHeight: accessibility.minTouchTarget,
  },
  playButton: {
    backgroundColor: colors.success,
  },
  controlButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  speedSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  speedButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  speedButtonActive: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  speedButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  speedButtonTextActive: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.bold,
  },
  skipButton: {
    backgroundColor: colors.secondary,
  },
  skipButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  playByPlayContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  // Coin toss styles
  coinTossContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  coinTossText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  // Post-game styles
  finalScoreCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
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
  finalLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  finalScore: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginVertical: spacing.sm,
  },
  resultText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  winText: {
    color: colors.success,
  },
  lossText: {
    color: colors.error,
  },
  newRecord: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  predictionResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  predictionResultText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  mvpCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  mvpLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  mvpName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  mvpPosition: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  mvpStats: {
    fontSize: fontSize.md,
    color: colors.text,
    marginTop: spacing.xs,
  },
  keyPlaysCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  keyPlayItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  keyPlayTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  keyPlayDescription: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginTop: spacing.xxs,
  },
  injuryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  injuryItem: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginVertical: spacing.xs,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    minHeight: accessibility.minTouchTarget,
    ...shadows.md,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
});

export default GameDayScreen;

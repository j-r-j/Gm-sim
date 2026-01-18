/**
 * WeeklySchedulePopup
 * Shows all games for the current week when advancing.
 * User can play/sim their game, then watch live results for other games.
 *
 * Premium UX features inspired by Madden, Football Manager, and NBA 2K:
 * - Animated score counters that count up dramatically
 * - Context-based game badges (UPSET, BLOWOUT, THRILLER, OT)
 * - Haptic feedback on score reveals
 * - Animated progress indicator with contextual messages
 * - Momentum-based color shifts for wins/losses
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
  Easing,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
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
 * Get game context badge based on score differential and game type
 */
type GameBadge = 'UPSET' | 'BLOWOUT' | 'THRILLER' | 'SHUTOUT' | null;

function getGameBadge(game: SimulatedGame): GameBadge {
  const scoreDiff = Math.abs(game.homeScore - game.awayScore);
  const totalScore = game.homeScore + game.awayScore;

  // Shutout (one team scored 0)
  if (game.homeScore === 0 || game.awayScore === 0) {
    return 'SHUTOUT';
  }

  // Blowout (21+ point difference)
  if (scoreDiff >= 21) {
    return 'BLOWOUT';
  }

  // Thriller (3 or fewer points difference and high scoring)
  if (scoreDiff <= 3 && totalScore >= 40) {
    return 'THRILLER';
  }

  // Upset detection would require knowing records/rankings
  // For now, we can mark close games between division rivals as potential upsets
  if (scoreDiff <= 7 && game.isDivisional) {
    return 'UPSET';
  }

  return null;
}

/**
 * Get badge styling based on type
 */
function getBadgeStyle(badge: GameBadge): { bg: string; text: string } {
  switch (badge) {
    case 'UPSET':
      return { bg: '#f6ad55', text: '#744210' }; // Orange
    case 'BLOWOUT':
      return { bg: '#fc8181', text: '#742a2a' }; // Red
    case 'THRILLER':
      return { bg: '#68d391', text: '#22543d' }; // Green
    case 'SHUTOUT':
      return { bg: '#b794f4', text: '#44337a' }; // Purple
    default:
      return { bg: colors.border, text: colors.textSecondary };
  }
}

/**
 * Trigger haptic feedback (mobile only)
 */
async function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' = 'medium') {
  try {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
      }
    }
  } catch {
    // Haptics not available, ignore
  }
}

/**
 * Phase indicator for game simulation
 */
type SimPhase = 'initial' | 'user_playing' | 'simulating_others' | 'complete';

/**
 * Animated score component that counts up
 */
function AnimatedScore({
  value,
  isWinner,
  isAnimating,
  delay = 0,
}: {
  value: number;
  isWinner: boolean;
  isAnimating: boolean;
  delay?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isAnimating) {
      // Reset values
      animatedValue.setValue(0);
      setDisplayValue(0);

      // Start animation after delay
      const timeout = setTimeout(() => {
        // Count up animation
        Animated.timing(animatedValue, {
          toValue: value,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();

        // Scale pop animation
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.3,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();

        // Flash animation for winner
        if (isWinner) {
          Animated.sequence([
            Animated.timing(flashAnim, {
              toValue: 1,
              duration: 150,
              useNativeDriver: false,
            }),
            Animated.timing(flashAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false,
            }),
          ]).start();
        }
      }, delay);

      // Listen to animated value changes
      const listener = animatedValue.addListener(({ value: v }) => {
        setDisplayValue(Math.round(v));
      });

      return () => {
        clearTimeout(timeout);
        animatedValue.removeListener(listener);
      };
    } else {
      setDisplayValue(value);
    }
  }, [isAnimating, value, delay, animatedValue, scaleAnim, flashAnim, isWinner]);

  const backgroundColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', isWinner ? 'rgba(56, 161, 105, 0.3)' : 'transparent'],
  });

  return (
    <Animated.View
      style={[
        styles.scoreContainer,
        {
          transform: [{ scale: scaleAnim }],
          backgroundColor,
        },
      ]}
    >
      <Text style={[styles.score, isWinner && styles.winnerText]}>{displayValue}</Text>
    </Animated.View>
  );
}

/**
 * Animated progress dots
 */
function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.loop(
        Animated.stagger(200, [
          Animated.sequence([
            Animated.timing(dot1, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dot1, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(dot2, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dot2, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(dot3, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dot3, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    };
    animate();
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.dotsContainer}>
      {[dot1, dot2, dot3].map((dot, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              transform: [
                {
                  translateY: dot.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -8],
                  }),
                },
              ],
              opacity: dot.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 1],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * Single game card for the schedule
 */
function GameCard({
  game,
  isSimulated,
  isAnimating,
  onPress,
  userTeamId,
}: {
  game: WeeklyGame | SimulatedGame;
  isSimulated: boolean;
  isAnimating: boolean;
  onPress: () => void;
  userTeamId: string;
}): React.JSX.Element {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(isSimulated ? 0 : 20)).current;
  const opacityAnim = useRef(new Animated.Value(isSimulated ? 1 : 0)).current;

  useEffect(() => {
    if (isAnimating) {
      // Slide in and fade animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Scale pop
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.03,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Trigger haptic on score reveal
      triggerHaptic('medium');
    } else if (isSimulated) {
      slideAnim.setValue(0);
      opacityAnim.setValue(1);
    }
  }, [isAnimating, isSimulated, slideAnim, opacityAnim, scaleAnim]);

  const simulatedGame = game as SimulatedGame;
  const hasScore = isSimulated && simulatedGame.homeScore !== undefined;
  const homeWon = hasScore && simulatedGame.homeScore > simulatedGame.awayScore;
  const awayWon = hasScore && simulatedGame.awayScore > simulatedGame.homeScore;

  // Check if user's team won/lost for this game
  const isUserHome = game.homeTeam.id === userTeamId;
  const isUserAway = game.awayTeam.id === userTeamId;
  const userWon = (isUserHome && homeWon) || (isUserAway && awayWon);
  const userLost = (isUserHome && awayWon) || (isUserAway && homeWon);

  // Get game badge for completed games
  const badge = hasScore ? getGameBadge(simulatedGame) : null;
  const badgeStyle = badge ? getBadgeStyle(badge) : null;

  // Dynamic border color based on user's game result
  const getBorderStyle = () => {
    if (game.isUserGame && isSimulated) {
      if (userWon) return styles.userWonCard;
      if (userLost) return styles.userLostCard;
    }
    if (game.isUserGame) return styles.userGameCard;
    if (isSimulated) return styles.completedGameCard;
    return {};
  };

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} disabled={!isSimulated}>
      <Animated.View
        style={[
          styles.gameCard,
          getBorderStyle(),
          {
            transform: [{ scale: scaleAnim }, { translateX: slideAnim }],
            opacity: isSimulated ? 1 : opacityAnim,
          },
        ]}
      >
        {game.isUserGame && (
          <View
            style={[
              styles.yourGameBanner,
              userWon && styles.yourGameBannerWin,
              userLost && styles.yourGameBannerLoss,
            ]}
          >
            <Text style={styles.yourGameText}>
              {isSimulated
                ? userWon
                  ? 'VICTORY!'
                  : userLost
                    ? 'DEFEAT'
                    : 'YOUR GAME'
                : 'YOUR GAME'}
            </Text>
          </View>
        )}

        <View style={styles.gameContent}>
          {/* Time slot / Status / Badge */}
          <View style={styles.gameStatus}>
            <View style={styles.statusLeft}>
              {isSimulated ? (
                <Text style={styles.finalText}>FINAL</Text>
              ) : (
                <Text style={styles.timeSlotText}>
                  {TIME_SLOT_NAMES[game.timeSlot] || game.timeSlot}
                </Text>
              )}
            </View>
            <View style={styles.badgesContainer}>
              {badge && badgeStyle && (
                <View style={[styles.gameBadge, { backgroundColor: badgeStyle.bg }]}>
                  <Text style={[styles.gameBadgeText, { color: badgeStyle.text }]}>{badge}</Text>
                </View>
              )}
              {game.isDivisional && <Text style={styles.divBadge}>DIV</Text>}
            </View>
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
                <AnimatedScore
                  value={simulatedGame.awayScore}
                  isWinner={awayWon}
                  isAnimating={isAnimating}
                  delay={0}
                />
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
                <AnimatedScore
                  value={simulatedGame.homeScore}
                  isWinner={homeWon}
                  isAnimating={isAnimating}
                  delay={100}
                />
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

/**
 * Animated progress bar
 */
function AnimatedProgressBar({ progress }: { progress: number }) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, widthAnim]);

  const width = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressBar}>
      <Animated.View style={[styles.progressFill, { width }]} />
    </View>
  );
}

export function WeeklySchedulePopup({
  week,
  phase,
  games,
  userTeamId,
  isUserOnBye,
  onPlayGame,
  onSimUserGame,
  onSimOtherGames,
  onComplete,
  onBack,
}: WeeklySchedulePopupProps): React.JSX.Element {
  const [simPhase, setSimPhase] = useState<SimPhase>('initial');
  const [simulatedGames, setSimulatedGames] = useState<Map<string, SimulatedGame>>(new Map());
  const [animatingGameId, setAnimatingGameId] = useState<string | null>(null);
  const [selectedBoxScore, setSelectedBoxScore] = useState<BoxScore | null>(null);
  const [showBoxScore, setShowBoxScore] = useState(false);
  const [currentSimGame, setCurrentSimGame] = useState(0);
  const [totalSimGames, setTotalSimGames] = useState(0);

  const weekTitle = phase === 'playoffs' ? getPlayoffRoundName(week) : `Week ${week}`;
  const userGame = games.find((g) => g.isUserGame);
  const otherGames = games.filter((g) => !g.isUserGame);
  const completedCount = simulatedGames.size;
  const totalCount = games.length;
  const allComplete = completedCount === totalCount;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Handle playing user's game (navigates to gamecast)
  const handlePlayGame = useCallback(() => {
    setSimPhase('user_playing');
    onPlayGame();
  }, [onPlayGame]);

  // Handle simming user's game
  const handleSimUserGame = useCallback(async () => {
    setSimPhase('user_playing');
    triggerHaptic('light');

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

      // Check if user won for celebration haptic
      const isUserHome = userGame.homeTeam.id === userTeamId;
      const userWon = isUserHome
        ? result.homeScore > result.awayScore
        : result.awayScore > result.homeScore;

      if (userWon) {
        triggerHaptic('success');
      } else {
        triggerHaptic('heavy');
      }

      setTimeout(() => setAnimatingGameId(null), 800);
    }
    // Auto-proceed to simulating other games
    simulateOtherGames();
  }, [onSimUserGame, userGame, userTeamId]);

  // Simulate other games with animation
  const simulateOtherGames = useCallback(async () => {
    setSimPhase('simulating_others');
    triggerHaptic('light');

    const results = await onSimOtherGames();
    setTotalSimGames(results.length);

    // Animate each game result one by one with dramatic pacing
    for (let i = 0; i < results.length; i++) {
      const game = results[i];
      setCurrentSimGame(i + 1);

      await new Promise<void>((resolve) => {
        // Variable delay based on game type for drama
        const isCloserGame =
          game.homeScore !== undefined &&
          game.awayScore !== undefined &&
          Math.abs(game.homeScore - game.awayScore) <= 7;
        const delay = isCloserGame ? 500 : 350; // Longer pause for close games

        setTimeout(() => {
          setAnimatingGameId(game.gameId);
          setSimulatedGames((prev) => new Map(prev).set(game.gameId, game));
          triggerHaptic('light');

          setTimeout(() => {
            setAnimatingGameId(null);
            resolve();
          }, 600); // Animation duration
        }, delay);
      });
    }

    setSimPhase('complete');
    triggerHaptic('success');
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
        setTimeout(() => setAnimatingGameId(null), 800);

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
        triggerHaptic('light');
        setSelectedBoxScore(game.boxScore);
        setShowBoxScore(true);
      }
    },
    [simulatedGames]
  );

  // Handle completing the week
  const handleComplete = useCallback(() => {
    triggerHaptic('medium');
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
        userTeamId={userTeamId}
      />
    );
  };

  // Get simulation status message
  const getSimStatusMessage = () => {
    if (simPhase === 'simulating_others' && totalSimGames > 0) {
      return `Simulating game ${currentSimGame} of ${totalSimGames}...`;
    }
    return 'Simulating games...';
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
        <AnimatedProgressBar progress={progress} />
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
                <View style={styles.simulatingContent}>
                  <LoadingDots />
                  <Text style={styles.simulatingText}>{getSimStatusMessage()}</Text>
                </View>
                <View style={styles.miniProgressBar}>
                  <View
                    style={[
                      styles.miniProgressFill,
                      { width: `${(currentSimGame / Math.max(totalSimGames, 1)) * 100}%` },
                    ]}
                  />
                </View>
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
  userWonCard: {
    borderWidth: 3,
    borderColor: colors.success,
  },
  userLostCard: {
    borderWidth: 2,
    borderColor: colors.error,
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
  yourGameBannerWin: {
    backgroundColor: colors.success,
  },
  yourGameBannerLoss: {
    backgroundColor: colors.error,
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
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  gameBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  gameBadgeText: {
    fontSize: fontSize.xs,
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
  scoreContainer: {
    minWidth: 36,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
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
  simulatingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  simulatingText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  miniProgressBar: {
    height: 3,
    backgroundColor: 'rgba(26, 54, 93, 0.2)',
    borderRadius: 2,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    height: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
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

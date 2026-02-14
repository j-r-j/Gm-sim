/**
 * WeeklySchedulePopup
 * Redesigned Week Results screen with a modern, sports-app inspired layout.
 *
 * Features:
 * - Hero card for user's game result with celebration styling
 * - Compact scoreboard grid for other games
 * - Clean visual hierarchy and typography
 * - Smooth animations for score reveals
 * - Badge system for special games (UPSET, THRILLER, etc.)
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
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  accessibility,
} from '../styles';
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
  homeScore?: number;
  awayScore?: number;
  isComplete?: boolean;
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
  week: number;
  phase: string;
  games: WeeklyGame[];
  userTeamId: string;
  isUserOnBye: boolean;
  onPlayGame: () => void;
  onSimUserGame: () => Promise<GameResult | null>;
  onSimOtherGames: () => Promise<SimulatedGame[]>;
  onAdvanceWeek: () => void;
  onBack: () => void;
}

type SimPhase = 'initial' | 'user_playing' | 'simulating_others' | 'complete';
type GameBadge = 'UPSET' | 'BLOWOUT' | 'THRILLER' | 'SHUTOUT' | null;

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
 * Get game context badge
 */
function getGameBadge(game: SimulatedGame): GameBadge {
  const scoreDiff = Math.abs(game.homeScore - game.awayScore);
  const totalScore = game.homeScore + game.awayScore;

  if (game.homeScore === 0 || game.awayScore === 0) return 'SHUTOUT';
  if (scoreDiff >= 21) return 'BLOWOUT';
  if (scoreDiff <= 3 && totalScore >= 40) return 'THRILLER';
  if (scoreDiff <= 7 && game.isDivisional) return 'UPSET';
  return null;
}

/**
 * Badge colors
 */
const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  UPSET: { bg: '#FEF3C7', text: '#92400E' },
  BLOWOUT: { bg: '#FEE2E2', text: '#991B1B' },
  THRILLER: { bg: '#D1FAE5', text: '#065F46' },
  SHUTOUT: { bg: '#EDE9FE', text: '#5B21B6' },
};

/**
 * Trigger haptic feedback
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
    // Haptics not available
  }
}

/**
 * Hero Card - User's Game Result
 */
function HeroGameCard({
  game,
  userTeamId,
  isComplete,
  onViewBoxScore,
  isAnimating,
}: {
  game: WeeklyGame | SimulatedGame;
  userTeamId: string;
  isComplete: boolean;
  onViewBoxScore: () => void;
  isAnimating: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const hasScore = isComplete && game.homeScore !== undefined;
  const homeWon = hasScore && (game.homeScore ?? 0) > (game.awayScore ?? 0);
  const awayWon = hasScore && (game.awayScore ?? 0) > (game.homeScore ?? 0);
  const isTie = hasScore && game.homeScore === game.awayScore;

  const isUserHome = game.homeTeam.id === userTeamId;
  const userWon = (isUserHome && homeWon) || (!isUserHome && awayWon);
  const userLost = (isUserHome && awayWon) || (!isUserHome && homeWon);

  useEffect(() => {
    if (isAnimating && hasScore) {
      // Celebration pulse animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.02,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      if (userWon) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          { iterations: 2 }
        ).start();
      }
    }
  }, [isAnimating, hasScore, userWon, scaleAnim, pulseAnim]);

  const getBgColor = () => {
    if (!hasScore) return colors.surface;
    if (userWon) return '#ECFDF5'; // Light green
    if (userLost) return '#FEF2F2'; // Light red
    return '#FFFBEB'; // Light yellow for tie
  };

  const getBorderColor = () => {
    if (!hasScore) return colors.border;
    if (userWon) return colors.success;
    if (userLost) return colors.error;
    return colors.warning;
  };

  const getResultText = () => {
    if (!hasScore) return 'UPCOMING';
    if (isTie) return 'TIE';
    return userWon ? 'VICTORY' : 'DEFEAT';
  };

  const getResultColor = () => {
    if (!hasScore) return colors.textSecondary;
    if (userWon) return colors.success;
    if (userLost) return colors.error;
    return colors.warning;
  };

  return (
    <Animated.View style={[styles.heroCard, { transform: [{ scale: scaleAnim }] }]}>
      {/* Result Banner */}
      <View style={[styles.heroBanner, { backgroundColor: getBorderColor() }]}>
        <Text style={styles.heroBannerText}>{getResultText()}</Text>
      </View>

      <View style={[styles.heroContent, { backgroundColor: getBgColor() }]}>
        {/* Matchup */}
        <View style={styles.heroMatchup}>
          {/* Away Team */}
          <View style={styles.heroTeam}>
            <View style={[styles.heroTeamBadge, awayWon && styles.heroTeamBadgeWinner]}>
              <Text style={[styles.heroTeamAbbr, awayWon && styles.heroTeamAbbrWinner]}>
                {game.awayTeam.abbr}
              </Text>
            </View>
            <Text style={styles.heroTeamName} numberOfLines={1}>
              {game.awayTeam.nickname}
            </Text>
            <Text style={styles.heroTeamRecord}>{game.awayTeam.record}</Text>
            {hasScore && (
              <Text
                style={[
                  styles.heroScore,
                  awayWon && styles.heroScoreWinner,
                  awayWon && { color: getResultColor() },
                ]}
              >
                {game.awayScore}
              </Text>
            )}
          </View>

          {/* VS Divider */}
          <View style={styles.heroVsDivider}>
            <Text style={styles.heroVsText}>@</Text>
            {hasScore && <Text style={styles.heroFinalText}>FINAL</Text>}
          </View>

          {/* Home Team */}
          <View style={styles.heroTeam}>
            <View style={[styles.heroTeamBadge, homeWon && styles.heroTeamBadgeWinner]}>
              <Text style={[styles.heroTeamAbbr, homeWon && styles.heroTeamAbbrWinner]}>
                {game.homeTeam.abbr}
              </Text>
            </View>
            <Text style={styles.heroTeamName} numberOfLines={1}>
              {game.homeTeam.nickname}
            </Text>
            <Text style={styles.heroTeamRecord}>{game.homeTeam.record}</Text>
            {hasScore && (
              <Text
                style={[
                  styles.heroScore,
                  homeWon && styles.heroScoreWinner,
                  homeWon && { color: getResultColor() },
                ]}
              >
                {game.homeScore}
              </Text>
            )}
          </View>
        </View>

        {/* Box Score Button */}
        {hasScore && (
          <TouchableOpacity
            style={styles.heroBoxScoreBtn}
            onPress={onViewBoxScore}
            activeOpacity={0.7}
            accessibilityLabel="View box score"
            accessibilityRole="button"
            hitSlop={accessibility.hitSlop}
          >
            <Text style={styles.heroBoxScoreText}>View Box Score</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

/**
 * Compact Scoreboard Card for other games
 */
function ScoreboardCard({
  game,
  onPress,
  isAnimating,
}: {
  game: WeeklyGame | SimulatedGame;
  onPress: () => void;
  isAnimating: boolean;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const hasScore = game.isComplete && game.homeScore !== undefined;
  const homeWon = hasScore && (game.homeScore ?? 0) > (game.awayScore ?? 0);
  const awayWon = hasScore && (game.awayScore ?? 0) > (game.homeScore ?? 0);
  const badge = hasScore ? getGameBadge(game as SimulatedGame) : null;

  useEffect(() => {
    if (isAnimating) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (hasScore) {
      fadeAnim.setValue(1);
    }
  }, [isAnimating, hasScore, fadeAnim]);

  return (
    <TouchableOpacity
      activeOpacity={hasScore ? 0.7 : 1}
      onPress={hasScore ? onPress : undefined}
      disabled={!hasScore}
      accessibilityLabel={`${game.awayTeam.abbr} at ${game.homeTeam.abbr}${hasScore ? `, ${game.awayScore} to ${game.homeScore}, final` : ', pending'}${badge ? `, ${badge}` : ''}`}
      accessibilityRole="button"
      hitSlop={accessibility.hitSlop}
    >
      <Animated.View
        style={[
          styles.scoreCard,
          hasScore && styles.scoreCardComplete,
          { opacity: hasScore ? fadeAnim : 0.5 },
        ]}
      >
        {/* Badge */}
        {badge && (
          <View style={[styles.scoreBadge, { backgroundColor: BADGE_COLORS[badge].bg }]}>
            <Text style={[styles.scoreBadgeText, { color: BADGE_COLORS[badge].text }]}>
              {badge}
            </Text>
          </View>
        )}

        {/* Away Team Row */}
        <View style={styles.scoreTeamRow}>
          <Text style={[styles.scoreTeamAbbr, awayWon && styles.scoreTeamWinner]}>
            {game.awayTeam.abbr}
          </Text>
          <Text style={styles.scoreTeamName} numberOfLines={1}>
            {game.awayTeam.nickname}
          </Text>
          {hasScore ? (
            <Text style={[styles.scoreValue, awayWon && styles.scoreValueWinner]}>
              {game.awayScore}
            </Text>
          ) : (
            <Text style={styles.scoreTeamRecord}>{game.awayTeam.record}</Text>
          )}
        </View>

        {/* Home Team Row */}
        <View style={styles.scoreTeamRow}>
          <Text style={[styles.scoreTeamAbbr, homeWon && styles.scoreTeamWinner]}>
            {game.homeTeam.abbr}
          </Text>
          <Text style={styles.scoreTeamName} numberOfLines={1}>
            {game.homeTeam.nickname}
          </Text>
          {hasScore ? (
            <Text style={[styles.scoreValue, homeWon && styles.scoreValueWinner]}>
              {game.homeScore}
            </Text>
          ) : (
            <Text style={styles.scoreTeamRecord}>{game.homeTeam.record}</Text>
          )}
        </View>

        {/* Status */}
        <View style={styles.scoreStatus}>
          {hasScore ? (
            <Text style={styles.scoreStatusFinal}>FINAL</Text>
          ) : (
            <Text style={styles.scoreStatusPending}>Pending</Text>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

/**
 * Bye Week Card
 */
function ByeWeekCard() {
  return (
    <View style={styles.byeCard}>
      <View style={styles.byeIconContainer}>
        <Text style={styles.byeIcon}>🏖️</Text>
      </View>
      <Text style={styles.byeTitle}>Bye Week</Text>
      <Text style={styles.byeSubtitle}>
        Your team has the week off. Check out the other games around the league.
      </Text>
    </View>
  );
}

/**
 * Main Component
 */
export function WeeklySchedulePopup({
  week,
  phase,
  games,
  userTeamId,
  isUserOnBye,
  onPlayGame,
  onSimUserGame,
  onSimOtherGames,
  onAdvanceWeek,
  onBack,
}: WeeklySchedulePopupProps): React.JSX.Element {
  const [simPhase, setSimPhase] = useState<SimPhase>('initial');
  const [simulatedGames, setSimulatedGames] = useState<Map<string, SimulatedGame>>(new Map());
  const [animatingGameId, setAnimatingGameId] = useState<string | null>(null);
  const [selectedBoxScore, setSelectedBoxScore] = useState<BoxScore | null>(null);
  const [showBoxScore, setShowBoxScore] = useState(false);

  const weekTitle = phase === 'playoffs' ? getPlayoffRoundName(week) : `Week ${week}`;
  const userGame = games.find((g) => g.isUserGame);
  const otherGames = games.filter((g) => !g.isUserGame);
  const userGameAlreadyComplete = userGame?.isComplete === true;

  const prevUserGameCompleteRef = useRef(userGameAlreadyComplete);

  // Reset state when returning from playing
  useEffect(() => {
    if (userGameAlreadyComplete && !prevUserGameCompleteRef.current) {
      setSimPhase('initial');
    }
    if (userGameAlreadyComplete && simPhase === 'user_playing') {
      setSimPhase('initial');
    }
    prevUserGameCompleteRef.current = userGameAlreadyComplete;
  }, [userGameAlreadyComplete, simPhase]);

  // Pre-populate all already-complete games (user's and others)
  useEffect(() => {
    const alreadyComplete = games.filter((g) => g.isComplete && !simulatedGames.has(g.gameId));
    if (alreadyComplete.length > 0) {
      setSimulatedGames((prev) => {
        const next = new Map(prev);
        for (const game of alreadyComplete) {
          next.set(game.gameId, {
            ...game,
            homeScore: game.homeScore ?? 0,
            awayScore: game.awayScore ?? 0,
            isComplete: true,
          });
        }
        return next;
      });
    }
  }, [games, simulatedGames]);

  const completedCount = simulatedGames.size;
  const totalCount = games.length;
  const allComplete = completedCount === totalCount;

  // Play user's game
  const handlePlayGame = useCallback(() => {
    setSimPhase('user_playing');
    onPlayGame();
  }, [onPlayGame]);

  // Sim user's game
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

      const isUserHome = userGame.homeTeam.id === userTeamId;
      const userWon = isUserHome
        ? result.homeScore > result.awayScore
        : result.awayScore > result.homeScore;

      triggerHaptic(userWon ? 'success' : 'heavy');
      setTimeout(() => setAnimatingGameId(null), 800);
    }
    simulateOtherGames();
  }, [onSimUserGame, userGame, userTeamId]);

  // Simulate other games
  const simulateOtherGames = useCallback(async () => {
    setSimPhase('simulating_others');
    triggerHaptic('light');

    const results = await onSimOtherGames();

    // Add all results at once instead of one-by-one
    if (results.length > 0) {
      setSimulatedGames((prev) => {
        const next = new Map(prev);
        for (const game of results) {
          next.set(game.gameId, game);
        }
        return next;
      });
    }

    setSimPhase('complete');
    triggerHaptic('success');
  }, [onSimOtherGames]);

  // Handle user game complete callback
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
        simulateOtherGames();
      }
    },
    [userGame, simulateOtherGames]
  );

  // Expose callback
  useEffect(() => {
    (globalThis as Record<string, unknown>).__weeklyScheduleHandleUserGameComplete =
      handleUserGameComplete;
    return () => {
      delete (globalThis as Record<string, unknown>).__weeklyScheduleHandleUserGameComplete;
    };
  }, [handleUserGameComplete]);

  // Handle box score view
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

  // Advance week
  const handleAdvanceWeek = useCallback(() => {
    triggerHaptic('medium');
    onAdvanceWeek();
  }, [onAdvanceWeek]);

  const userGameData = userGame ? simulatedGames.get(userGame.gameId) || userGame : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          hitSlop={accessibility.hitSlop}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{weekTitle}</Text>
          <View style={styles.progressPill}>
            <View
              style={[
                styles.progressPillFill,
                { width: `${(completedCount / totalCount) * 100}%` },
              ]}
            />
            <Text style={styles.progressPillText}>
              {completedCount}/{totalCount} Complete
            </Text>
          </View>
        </View>

        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User's Game Section */}
        {!isUserOnBye && userGameData && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>YOUR GAME</Text>
            <HeroGameCard
              game={userGameData}
              userTeamId={userTeamId}
              isComplete={simulatedGames.has(userGame!.gameId)}
              onViewBoxScore={() => handleGamePress(userGame!.gameId)}
              isAnimating={animatingGameId === userGame!.gameId}
            />

            {/* Action Buttons */}
            {simPhase === 'initial' && !userGameAlreadyComplete && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handlePlayGame}
                  activeOpacity={0.8}
                  accessibilityLabel="Play game"
                  accessibilityRole="button"
                  hitSlop={accessibility.hitSlop}
                >
                  <Text style={styles.primaryBtnText}>Play Game</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={handleSimUserGame}
                  activeOpacity={0.8}
                  accessibilityLabel="Simulate your game"
                  accessibilityRole="button"
                  hitSlop={accessibility.hitSlop}
                >
                  <Text style={styles.secondaryBtnText}>Simulate</Text>
                </TouchableOpacity>
              </View>
            )}

            {simPhase === 'initial' && userGameAlreadyComplete && otherGames.length > 0 && (
              <TouchableOpacity
                style={styles.fullWidthBtn}
                onPress={simulateOtherGames}
                activeOpacity={0.8}
                accessibilityLabel="Simulate league games"
                accessibilityRole="button"
                hitSlop={accessibility.hitSlop}
              >
                <Text style={styles.fullWidthBtnText}>Simulate League Games</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Bye Week */}
        {isUserOnBye && (
          <View style={styles.section}>
            <ByeWeekCard />
            {simPhase === 'initial' && (
              <TouchableOpacity
                style={styles.fullWidthBtn}
                onPress={simulateOtherGames}
                activeOpacity={0.8}
                accessibilityLabel="Simulate all games"
                accessibilityRole="button"
                hitSlop={accessibility.hitSlop}
              >
                <Text style={styles.fullWidthBtnText}>Simulate All Games</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Other Games Scoreboard */}
        {otherGames.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>AROUND THE LEAGUE</Text>
            <View style={styles.scoreboardGrid}>
              {otherGames.map((game) => {
                const simulated = simulatedGames.get(game.gameId);
                return (
                  <ScoreboardCard
                    key={game.gameId}
                    game={simulated || game}
                    onPress={() => handleGamePress(game.gameId)}
                    isAnimating={animatingGameId === game.gameId}
                  />
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Action */}
      {allComplete && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.advanceBtn}
            onPress={handleAdvanceWeek}
            activeOpacity={0.8}
            accessibilityLabel="Continue to next week"
            accessibilityRole="button"
            hitSlop={accessibility.hitSlop}
          >
            <Text style={styles.advanceBtnText}>Continue to Next Week</Text>
            <Text style={styles.advanceBtnArrow}>→</Text>
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
    backgroundColor: '#F8FAFC',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 24,
    color: colors.textOnPrimary,
    fontWeight: fontWeight.bold,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    marginBottom: spacing.xs,
  },
  progressPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    overflow: 'hidden',
    minWidth: 140,
  },
  progressPillFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.success,
    borderRadius: borderRadius.full,
  },
  progressPillText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
  },

  // Scroll
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
  heroBannerText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    letterSpacing: 2,
  },
  heroContent: {
    padding: spacing.lg,
  },
  heroMatchup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTeam: {
    flex: 1,
    alignItems: 'center',
  },
  heroTeamBadge: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroTeamBadgeWinner: {
    backgroundColor: colors.primary,
  },
  heroTeamAbbr: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  heroTeamAbbrWinner: {
    color: colors.textOnPrimary,
  },
  heroTeamName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xxs,
    textAlign: 'center',
  },
  heroTeamRecord: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  heroScore: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  heroScoreWinner: {
    fontWeight: fontWeight.bold,
  },
  heroVsDivider: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  heroVsText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  heroFinalText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.bold,
    marginTop: spacing.xs,
  },
  heroBoxScoreBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  heroBoxScoreText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  primaryBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  fullWidthBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.md,
  },
  fullWidthBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },

  // Bye Card
  byeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
  },
  byeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  byeIcon: {
    fontSize: 32,
  },
  byeTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  byeSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Scoreboard Grid
  scoreboardGrid: {
    gap: spacing.sm,
  },

  // Score Card
  scoreCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  scoreCardComplete: {
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  scoreBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  scoreBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  scoreTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  scoreTeamAbbr: {
    width: 40,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  scoreTeamWinner: {
    color: colors.success,
  },
  scoreTeamName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    marginRight: spacing.sm,
  },
  scoreTeamRecord: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  scoreValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    minWidth: 32,
    textAlign: 'right',
  },
  scoreValueWinner: {
    color: colors.success,
  },
  scoreStatus: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
  },
  scoreStatusFinal: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.success,
    textAlign: 'center',
  },
  scoreStatusPending: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
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
  advanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  advanceBtnText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    marginRight: spacing.sm,
  },
  advanceBtnArrow: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
});

export default WeeklySchedulePopup;

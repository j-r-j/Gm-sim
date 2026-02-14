/**
 * Game Flow Wrappers
 * Weekly game flow screen wrappers extracted from ScreenWrappers.tsx
 *
 * Includes: WeeklySchedule, LiveGameSimulation, PostGameSummary,
 * WeekSummary, GamePlan, StartSit, WeeklyAwards
 */

import React, { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useGame } from '../GameContext';
import { ScreenProps } from '../types';
import { processWeekEnd, LoadingFallback } from './shared';
import { type WeeklyGamePlan } from '../../core/gameplan/GamePlanManager';
import { type StartSitState } from '../../core/roster/StartSitManager';
import { type WaiverWireState } from '../../core/roster/WaiverWireManager';
import { GameState } from '../../core/models/game/GameState';
import { WeeklySchedulePopup, WeeklyGame, SimulatedGame } from '../../screens/WeeklySchedulePopup';
import { GameDayScreen } from '../../screens/GameDayScreen';
import { WeekSummaryScreen } from '../../screens/WeekSummaryScreen';
import { simulateWeek, advanceWeek, getUserTeamGame } from '../../core/season/WeekSimulator';
import { updateSeasonStatsFromGame } from '../../core/game/SeasonStatsAggregator';
import { getAllNews } from '../../core/news/NewsFeedManager';
import { applyMidSeasonProgression } from '../../core/career/PlayerProgression';
import { GamePlanScreen } from '../../screens/GamePlanScreen';
import { analyzeOpponent, applyGamePlan } from '../../core/gameplan';
import { StartSitScreen } from '../../screens/StartSitScreen';
import {
  generateStartSitDecisions,
  applyStartSitDecisions,
} from '../../core/roster/StartSitManager';
import { WeeklyAwardsScreen } from '../../screens/WeeklyAwardsScreen';
import { createWeeklyAwardsState, generateAwardRaces } from '../../core/season/WeeklyAwards';
import { TradeOffersScreen } from '../../screens/TradeOffersScreen';
import {
  acceptTradeOffer,
  rejectTradeOffer,
  createTradeOffersState,
} from '../../core/trade/AITradeOfferGenerator';
import { WaiverWireScreen } from '../../screens/WaiverWireScreen';
import { createWaiverWireState } from '../../core/roster/WaiverWireManager';

// ============================================
// WEEKLY SCHEDULE SCREEN
// ============================================

export function WeeklyScheduleScreenWrapper({
  navigation,
}: ScreenProps<'WeeklySchedule'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState, setIsLoading } = useGame();

  // Ref to track the latest state for use in async callbacks
  // This fixes the race condition where handleSimOtherGames uses stale state
  const latestStateRef = useRef<GameState | null>(null);

  if (!gameState) {
    return <LoadingFallback message="Loading weekly schedule..." />;
  }

  // Keep ref updated with current state
  latestStateRef.current = gameState;

  const { calendar, schedule } = gameState.league;
  const week = calendar.currentWeek;
  const phase = calendar.currentPhase;
  const userTeamId = gameState.userTeamId;

  // Check if user is on bye
  const byeWeek = schedule?.byeWeeks?.[userTeamId];
  const isUserOnBye = byeWeek === week;

  // Get all games for current week
  const weeklyGames: WeeklyGame[] = [];
  const regularSeasonGames = schedule?.regularSeason || [];

  for (const game of regularSeasonGames) {
    if (game.week !== week) continue;

    const homeTeam = gameState.teams[game.homeTeamId];
    const awayTeam = gameState.teams[game.awayTeamId];

    if (!homeTeam || !awayTeam) continue;

    const isUserGame = game.homeTeamId === userTeamId || game.awayTeamId === userTeamId;

    weeklyGames.push({
      gameId: game.gameId,
      homeTeam: {
        id: game.homeTeamId,
        city: homeTeam.city,
        nickname: homeTeam.nickname,
        abbr: homeTeam.abbreviation,
        record: `${homeTeam.currentRecord.wins}-${homeTeam.currentRecord.losses}`,
      },
      awayTeam: {
        id: game.awayTeamId,
        city: awayTeam.city,
        nickname: awayTeam.nickname,
        abbr: awayTeam.abbreviation,
        record: `${awayTeam.currentRecord.wins}-${awayTeam.currentRecord.losses}`,
      },
      isUserGame,
      timeSlot: game.timeSlot || 'early_sunday',
      isDivisional: game.isDivisional,
      // Include scores if game is complete (for user's game that was just played)
      ...(game.isComplete && {
        homeScore: game.homeScore ?? undefined,
        awayScore: game.awayScore ?? undefined,
        isComplete: true,
      }),
    });
  }

  // Sort: user game first, then by time slot
  const timeSlotOrder = ['thursday', 'early_sunday', 'late_sunday', 'sunday_night', 'monday_night'];
  weeklyGames.sort((a, b) => {
    if (a.isUserGame && !b.isUserGame) return -1;
    if (!a.isUserGame && b.isUserGame) return 1;
    return timeSlotOrder.indexOf(a.timeSlot) - timeSlotOrder.indexOf(b.timeSlot);
  });

  // Handle playing user's game (navigate to Gamecast)
  const handlePlayGame = () => {
    navigation.navigate('Gamecast');
  };

  // Handle simulating user's game
  const handleSimUserGame = async () => {
    if (!schedule?.regularSeason) return null;
    setIsLoading(true);

    try {
      const { simulateUserTeamGame } = await import('../../core/season/WeekSimulator');
      const result = simulateUserTeamGame(schedule, week, userTeamId, gameState);

      if (!result) {
        setIsLoading(false);
        return null;
      }

      // Update schedule with user's game result
      const updatedSchedule = { ...schedule };
      const updatedGames = [...updatedSchedule.regularSeason];

      const gameIndex = updatedGames.findIndex((g) => g.gameId === result.game.gameId);
      if (gameIndex >= 0) {
        updatedGames[gameIndex] = result.game;
      }
      updatedSchedule.regularSeason = updatedGames;

      // Update team records
      const updatedTeams = { ...gameState.teams };
      const homeTeam = updatedTeams[result.game.homeTeamId];
      const awayTeam = updatedTeams[result.game.awayTeamId];

      if (homeTeam && awayTeam) {
        const homeWon = result.result.homeScore > result.result.awayScore;
        const awayWon = result.result.awayScore > result.result.homeScore;
        const tie = result.result.homeScore === result.result.awayScore;

        updatedTeams[result.game.homeTeamId] = {
          ...homeTeam,
          currentRecord: {
            ...homeTeam.currentRecord,
            wins: homeTeam.currentRecord.wins + (homeWon ? 1 : 0),
            losses: homeTeam.currentRecord.losses + (awayWon ? 1 : 0),
            ties: homeTeam.currentRecord.ties + (tie ? 1 : 0),
            pointsFor: homeTeam.currentRecord.pointsFor + result.result.homeScore,
            pointsAgainst: homeTeam.currentRecord.pointsAgainst + result.result.awayScore,
          },
        };
        updatedTeams[result.game.awayTeamId] = {
          ...awayTeam,
          currentRecord: {
            ...awayTeam.currentRecord,
            wins: awayTeam.currentRecord.wins + (awayWon ? 1 : 0),
            losses: awayTeam.currentRecord.losses + (homeWon ? 1 : 0),
            ties: awayTeam.currentRecord.ties + (tie ? 1 : 0),
            pointsFor: awayTeam.currentRecord.pointsFor + result.result.awayScore,
            pointsAgainst: awayTeam.currentRecord.pointsAgainst + result.result.homeScore,
          },
        };
      }

      // Update season stats
      let updatedSeasonStats = gameState.seasonStats || {};
      updatedSeasonStats = updateSeasonStatsFromGame(updatedSeasonStats, result.result);

      const updatedState: GameState = {
        ...gameState,
        league: {
          ...gameState.league,
          schedule: updatedSchedule,
        },
        teams: updatedTeams,
        seasonStats: updatedSeasonStats,
      };

      // Update ref synchronously before state update so handleSimOtherGames can access it
      latestStateRef.current = updatedState;

      setGameState(updatedState);
      await saveGameState(updatedState);
      setIsLoading(false);

      return result.result;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error simulating user game:', error);
      setIsLoading(false);
      return null;
    }
  };

  // Handle simulating all other games
  const handleSimOtherGames = async (): Promise<SimulatedGame[]> => {
    // Use ref to get the latest state (fixes race condition after user game simulation)
    const currentState = latestStateRef.current || gameState;
    const currentSchedule = currentState.league.schedule;

    if (!currentSchedule?.regularSeason) return [];
    setIsLoading(true);

    try {
      const weekResults = simulateWeek(week, currentSchedule, currentState, userTeamId, false);

      // Update schedule with simulated game results
      const updatedSchedule = { ...currentSchedule };
      const updatedGames = [...updatedSchedule.regularSeason];

      for (const simResult of weekResults.games) {
        const gameIndex = updatedGames.findIndex((g) => g.gameId === simResult.game.gameId);
        if (gameIndex >= 0) {
          updatedGames[gameIndex] = simResult.game;
        }
      }
      updatedSchedule.regularSeason = updatedGames;

      // Update team records - use currentState to preserve user's game result
      const updatedTeams = { ...currentState.teams };
      for (const simResult of weekResults.games) {
        const { result, game } = simResult;
        const homeTeam = updatedTeams[game.homeTeamId];
        const awayTeam = updatedTeams[game.awayTeamId];

        if (homeTeam && awayTeam) {
          const homeWon = result.homeScore > result.awayScore;
          const awayWon = result.awayScore > result.homeScore;
          const tie = result.homeScore === result.awayScore;

          updatedTeams[game.homeTeamId] = {
            ...homeTeam,
            currentRecord: {
              ...homeTeam.currentRecord,
              wins: homeTeam.currentRecord.wins + (homeWon ? 1 : 0),
              losses: homeTeam.currentRecord.losses + (awayWon ? 1 : 0),
              ties: homeTeam.currentRecord.ties + (tie ? 1 : 0),
              pointsFor: homeTeam.currentRecord.pointsFor + result.homeScore,
              pointsAgainst: homeTeam.currentRecord.pointsAgainst + result.awayScore,
            },
          };
          updatedTeams[game.awayTeamId] = {
            ...awayTeam,
            currentRecord: {
              ...awayTeam.currentRecord,
              wins: awayTeam.currentRecord.wins + (awayWon ? 1 : 0),
              losses: awayTeam.currentRecord.losses + (homeWon ? 1 : 0),
              ties: awayTeam.currentRecord.ties + (tie ? 1 : 0),
              pointsFor: awayTeam.currentRecord.pointsFor + result.awayScore,
              pointsAgainst: awayTeam.currentRecord.pointsAgainst + result.homeScore,
            },
          };
        }
      }

      // Aggregate player stats - use currentState to preserve previous updates
      let updatedSeasonStats = currentState.seasonStats || {};
      for (const simResult of weekResults.games) {
        updatedSeasonStats = updateSeasonStatsFromGame(updatedSeasonStats, simResult.result);
      }

      const updatedState: GameState = {
        ...currentState,
        league: {
          ...currentState.league,
          schedule: updatedSchedule,
        },
        teams: updatedTeams,
        seasonStats: updatedSeasonStats,
      };

      // Update ref with the final state
      latestStateRef.current = updatedState;

      setGameState(updatedState);
      await saveGameState(updatedState);
      setIsLoading(false);

      // Convert to SimulatedGame format
      const simulatedGames: SimulatedGame[] = weekResults.games.map((simResult) => {
        const homeTeam = currentState.teams[simResult.game.homeTeamId];
        const awayTeam = currentState.teams[simResult.game.awayTeamId];

        return {
          gameId: simResult.game.gameId,
          homeTeam: {
            id: simResult.game.homeTeamId,
            city: homeTeam.city,
            nickname: homeTeam.nickname,
            abbr: homeTeam.abbreviation,
            record: `${homeTeam.currentRecord.wins}-${homeTeam.currentRecord.losses}`,
          },
          awayTeam: {
            id: simResult.game.awayTeamId,
            city: awayTeam.city,
            nickname: awayTeam.nickname,
            abbr: awayTeam.abbreviation,
            record: `${awayTeam.currentRecord.wins}-${awayTeam.currentRecord.losses}`,
          },
          isUserGame: false,
          timeSlot: simResult.game.timeSlot || 'early_sunday',
          isDivisional: simResult.game.isDivisional,
          homeScore: simResult.result.homeScore,
          awayScore: simResult.result.awayScore,
          isComplete: true,
          boxScore: simResult.result.boxScore,
          result: simResult.result,
        };
      });

      return simulatedGames;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error simulating other games:', error);
      setIsLoading(false);
      return [];
    }
  };

  // Handle advancing to next week
  const handleAdvanceWeek = async () => {
    setIsLoading(true);
    try {
      let newWeek = calendar.currentWeek + 1;
      let newPhase = calendar.currentPhase;

      // Handle phase transitions
      if (newPhase === 'regularSeason' && newWeek > 18) {
        newWeek = 19;
        newPhase = 'playoffs';
      }

      // Process injury recovery using the advanceWeek function
      const advanceResult = advanceWeek(calendar.currentWeek, gameState);
      const updatedPlayers = { ...gameState.players };

      for (const recoveredPlayerId of advanceResult.recoveredPlayers) {
        const player = updatedPlayers[recoveredPlayerId];
        if (player) {
          updatedPlayers[recoveredPlayerId] = {
            ...player,
            injuryStatus: {
              ...player.injuryStatus,
              severity: 'none',
              weeksRemaining: 0,
            },
          };
        }
      }

      // Decrement weeks remaining for players still injured
      for (const playerId of Object.keys(updatedPlayers)) {
        const player = updatedPlayers[playerId];
        if (
          player.injuryStatus.weeksRemaining > 0 &&
          !advanceResult.recoveredPlayers.includes(playerId)
        ) {
          updatedPlayers[playerId] = {
            ...player,
            injuryStatus: {
              ...player.injuryStatus,
              weeksRemaining: player.injuryStatus.weeksRemaining - 1,
            },
          };
        }
      }

      const updatedState: GameState = {
        ...gameState,
        league: {
          ...gameState.league,
          calendar: {
            ...calendar,
            currentWeek: newWeek,
            currentPhase: newPhase,
          },
        },
        players: updatedPlayers,
      };

      setGameState(updatedState);
      await saveGameState(updatedState);

      // Navigate appropriately
      if (newPhase === 'playoffs' && calendar.currentPhase !== 'playoffs') {
        navigation.navigate('PlayoffBracket');
      } else {
        navigation.navigate('Dashboard');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error advancing week:', error);
      Alert.alert('Error', 'Failed to advance week');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <WeeklySchedulePopup
      week={week}
      phase={phase}
      games={weeklyGames}
      userTeamId={userTeamId}
      isUserOnBye={isUserOnBye}
      onPlayGame={handlePlayGame}
      onSimUserGame={handleSimUserGame}
      onSimOtherGames={handleSimOtherGames}
      onAdvanceWeek={handleAdvanceWeek}
      onBack={() => navigation.goBack()}
    />
  );
}

// ============================================
// LIVE GAME SIMULATION SCREEN (now using unified GameDayScreen)
// TODO (P2-6): Add halftime decision pause point. When the GameDayScreen engine
// supports a halftime callback, present options like "Adjust game plan" or
// "No changes" before resuming the second half. The halftimeDecisions state
// (GameState.halftimeDecisions) is already defined in the state model.
// ============================================

export function LiveGameSimulationScreenWrapper({
  navigation,
}: ScreenProps<'LiveGameSimulation'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState, setLastGameResult } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading game simulation..." />;
  }

  const { calendar, schedule } = gameState.league;
  const week = calendar.currentWeek;
  const userTeamId = gameState.userTeamId;

  // Guard: need schedule
  if (!schedule) {
    Alert.alert('Error', 'No schedule available');
    navigation.goBack();
    return <LoadingFallback message="No schedule available..." />;
  }

  // Get user's game for this week
  const userGame = getUserTeamGame(schedule, week, userTeamId);

  if (!userGame) {
    Alert.alert('Error', 'No game found for this week');
    navigation.goBack();
    return <LoadingFallback message="No game found..." />;
  }

  return (
    <GameDayScreen
      game={userGame}
      gameState={gameState}
      userTeamId={userTeamId}
      onBack={() => navigation.goBack()}
      onGameComplete={async (result, updatedState) => {
        // Store the game result in context for WeekSummary to access
        setLastGameResult(result);

        // Apply mid-season progression to user's team players
        const userTeamForProg = updatedState.teams[updatedState.userTeamId];
        if (userTeamForProg) {
          const isHome = result.homeTeamId === updatedState.userTeamId;
          const uScore = isHome ? result.homeScore : result.awayScore;
          const oScore = isHome ? result.awayScore : result.homeScore;
          const scoreDiff = uScore - oScore;

          // Derive a simple game performance score (0-100)
          let gamePerformanceScore: number;
          if (scoreDiff >= 14)
            gamePerformanceScore = 75 + Math.floor(Math.random() * 16); // 75-90
          else if (scoreDiff > 0)
            gamePerformanceScore = 60 + Math.floor(Math.random() * 16); // 60-75
          else if (scoreDiff >= -7)
            gamePerformanceScore = 40 + Math.floor(Math.random() * 16); // 40-55
          else gamePerformanceScore = 20 + Math.floor(Math.random() * 21); // 20-40

          const headCoachId = userTeamForProg.staffHierarchy?.headCoach;
          const headCoach = headCoachId ? (updatedState.coaches[headCoachId] ?? null) : null;
          const currentWeek = updatedState.league.calendar.currentWeek;

          const updatedPlayers = { ...updatedState.players };
          const breakoutNames: string[] = [];

          for (const playerId of userTeamForProg.rosterPlayerIds) {
            const player = updatedPlayers[playerId];
            if (!player) continue;
            const progResult = applyMidSeasonProgression(
              player,
              gamePerformanceScore,
              headCoach,
              currentWeek
            );
            updatedPlayers[playerId] = progResult.updatedPlayer;
            if (progResult.isBreakout && progResult.breakoutDescription) {
              breakoutNames.push(`${player.firstName} ${player.lastName}`);
            }
          }

          updatedState = { ...updatedState, players: updatedPlayers };

          // Show breakout alert if any players broke out
          if (breakoutNames.length > 0) {
            const names = breakoutNames.join(', ');
            Alert.alert(
              'Breakout Performance!',
              `${names} ${breakoutNames.length === 1 ? 'is' : 'are'} having a breakout season!`
            );
          }
        }

        setGameState(updatedState);
        await saveGameState(updatedState);

        // Check if this was a playoff game and handle Championship/SeasonOver flow
        const cal = updatedState.league.calendar;
        if (cal.currentPhase === 'playoffs') {
          const userTeamId = updatedState.userTeamId;
          const isHome = result.homeTeamId === userTeamId;
          const userScore = isHome ? result.homeScore : result.awayScore;
          const opponentScore = isHome ? result.awayScore : result.homeScore;
          const userWon = userScore > opponentScore;

          // Check if this was the Super Bowl
          const playoffs = updatedState.league.schedule?.playoffs;
          const isSuperBowl =
            playoffs?.superBowl != null &&
            (playoffs.superBowl.homeTeamId === userTeamId ||
              playoffs.superBowl.awayTeamId === userTeamId);

          if (isSuperBowl && userWon) {
            // User won the Super Bowl!
            navigation.navigate('ChampionshipCelebration');
            return;
          } else if (!userWon) {
            // User was eliminated from playoffs
            navigation.navigate('SeasonOver');
            return;
          }
        }

        // Navigate to week summary instead of post-game summary
        navigation.navigate('WeekSummary');
      }}
    />
  );
}

// ============================================
// WEEK SUMMARY SCREEN
// ============================================

export function WeekSummaryScreenWrapper({
  navigation,
}: ScreenProps<'WeekSummary'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState, lastGameResult, setIsLoading } = useGame();
  const [isAdvancing, setIsAdvancing] = useState(false);

  if (!gameState) {
    return <LoadingFallback message="Loading week summary..." />;
  }

  const { calendar, schedule } = gameState.league;
  const week = calendar.currentWeek;
  const userTeamId = gameState.userTeamId;
  const userTeam = gameState.teams[userTeamId];

  // --- Build user game result ---
  const userGame = schedule ? getUserTeamGame(schedule, week, userTeamId) : null;
  const homeTeamId = userGame?.homeTeamId ?? lastGameResult?.homeTeamId ?? '';
  const awayTeamId = userGame?.awayTeamId ?? lastGameResult?.awayTeamId ?? '';
  const homeScore = userGame?.isComplete ? userGame.homeScore! : (lastGameResult?.homeScore ?? 0);
  const awayScore = userGame?.isComplete ? userGame.awayScore! : (lastGameResult?.awayScore ?? 0);
  const isHome = homeTeamId === userTeamId;
  const homeTeam = gameState.teams[homeTeamId];
  const awayTeam = gameState.teams[awayTeamId];
  const userScore = isHome ? homeScore : awayScore;
  const opponentScore = isHome ? awayScore : homeScore;
  const opponentTeam = isHome ? awayTeam : homeTeam;

  const userGameResult = {
    userTeam: {
      name: userTeam ? `${userTeam.city} ${userTeam.nickname}` : 'Your Team',
      abbreviation: userTeam?.abbreviation ?? '???',
      score: userScore,
    },
    opponent: {
      name: opponentTeam ? `${opponentTeam.city} ${opponentTeam.nickname}` : 'Opponent',
      abbreviation: opponentTeam?.abbreviation ?? '???',
      score: opponentScore,
    },
    isWin: userScore > opponentScore,
    keyStats: lastGameResult?.boxScore
      ? `${lastGameResult.boxScore.passingLeaders?.[0]?.playerName ?? 'N/A'} led the passing attack`
      : 'Final score',
    mvp: lastGameResult?.boxScore?.passingLeaders?.[0]?.playerName,
  };

  // --- Build other games ---
  const otherGames: Array<{
    homeTeam: { name: string; abbreviation: string; score: number };
    awayTeam: { name: string; abbreviation: string; score: number };
  }> = [];

  if (schedule?.regularSeason) {
    for (const game of schedule.regularSeason) {
      if (game.week !== week) continue;
      if (game.homeTeamId === userTeamId || game.awayTeamId === userTeamId) continue;
      if (!game.isComplete) continue;

      const ht = gameState.teams[game.homeTeamId];
      const at = gameState.teams[game.awayTeamId];
      if (!ht || !at) continue;

      otherGames.push({
        homeTeam: {
          name: `${ht.city} ${ht.nickname}`,
          abbreviation: ht.abbreviation,
          score: game.homeScore ?? 0,
        },
        awayTeam: {
          name: `${at.city} ${at.nickname}`,
          abbreviation: at.abbreviation,
          score: game.awayScore ?? 0,
        },
      });
    }
  }

  // --- Build standings (user's division) ---
  const standings: Array<{
    teamName: string;
    wins: number;
    losses: number;
    ties: number;
    isUserTeam: boolean;
  }> = [];

  if (userTeam) {
    const confKey = userTeam.conference.toLowerCase() as 'afc' | 'nfc';
    const divKey = userTeam.division.toLowerCase() as 'north' | 'south' | 'east' | 'west';
    const divisionTeamIds = gameState.league.standings?.[confKey]?.[divKey] || [];

    // If we have standings entries, use them; otherwise build from teams in same division
    const teamIds =
      divisionTeamIds.length > 0
        ? divisionTeamIds
        : Object.values(gameState.teams)
            .filter((t) => t.conference === userTeam.conference && t.division === userTeam.division)
            .map((t) => t.id);

    for (const teamId of teamIds) {
      const t = gameState.teams[teamId];
      if (!t) continue;
      standings.push({
        teamName: `${t.city} ${t.nickname}`,
        wins: t.currentRecord.wins,
        losses: t.currentRecord.losses,
        ties: t.currentRecord.ties,
        isUserTeam: teamId === userTeamId,
      });
    }
  }

  // --- Build headlines from news feed ---
  const headlines: string[] = [];
  if (gameState.newsFeed) {
    const allNews = getAllNews(gameState.newsFeed);
    const recentNews = allNews.slice(0, 5);
    for (const item of recentNews) {
      headlines.push(item.headline || '');
    }
  }

  // --- Build injury updates ---
  const injuryUpdates: string[] = [];
  if (userTeam) {
    for (const playerId of userTeam.rosterPlayerIds) {
      const player = gameState.players[playerId];
      if (player && player.injuryStatus && player.injuryStatus.severity !== 'none') {
        injuryUpdates.push(
          `${player.firstName} ${player.lastName} (${player.position}) - ${player.injuryStatus.severity}, ${player.injuryStatus.weeksRemaining} weeks`
        );
      }
    }
  }

  // --- Handle advance ---
  const handleAdvance = async () => {
    setIsAdvancing(true);
    setIsLoading(true);
    try {
      // Process week end (consolidates all weekly systems)
      const weekEndResult = processWeekEnd(gameState);
      const newState = weekEndResult.state;
      setGameState(newState);
      await saveGameState(newState);

      // Check if fired
      if (weekEndResult.fired) {
        navigation.navigate('Fired');
        return;
      }

      // Check if season ended -> auto-transition to offseason or playoffs
      const newPhase = newState.league.calendar.currentPhase;
      if (newPhase === 'playoffs' && calendar.currentPhase === 'regularSeason') {
        // Just entered playoffs - check if user team made playoffs
        const playoffBracket = newState.league.schedule?.playoffs;
        const userInPlayoffs =
          playoffBracket &&
          (playoffBracket.wildCardRound?.some(
            (g) => g.homeTeamId === userTeamId || g.awayTeamId === userTeamId
          ) ||
            playoffBracket.divisionalRound?.some(
              (g) => g.homeTeamId === userTeamId || g.awayTeamId === userTeamId
            ));

        if (!userInPlayoffs) {
          // User missed playoffs - show season over screen
          navigation.navigate('SeasonOver');
        } else {
          navigation.navigate('PlayoffBracket');
        }
      } else {
        navigation.navigate('Dashboard');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error advancing week:', error);
      Alert.alert('Error', 'Failed to advance week');
    } finally {
      setIsAdvancing(false);
      setIsLoading(false);
    }
  };

  return (
    <WeekSummaryScreen
      userGameResult={userGameResult}
      otherGames={otherGames}
      standings={standings}
      headlines={headlines}
      injuryUpdates={injuryUpdates}
      currentWeek={week}
      onAdvance={handleAdvance}
      isAdvancing={isAdvancing}
    />
  );
}

// ============================================
// NEW WEEKLY DECISION SYSTEM SCREENS
// ============================================

export function GamePlanScreenWrapper({ navigation }: ScreenProps<'GamePlan'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading..." />;
  }

  // getUserTeamGame is already imported at the top

  const week = gameState.league.calendar.currentWeek;
  const schedule = gameState.league.schedule;

  // Get opponent info
  let opponentAnalysis = null;
  if (schedule) {
    const userGame = getUserTeamGame(schedule, week, gameState.userTeamId);
    if (userGame) {
      const isHome = userGame.homeTeamId === gameState.userTeamId;
      const opponentId = isHome ? userGame.awayTeamId : userGame.homeTeamId;
      const opponentTeam = gameState.teams[opponentId];
      if (opponentTeam) {
        const opponentPlayers = opponentTeam.rosterPlayerIds
          .map((id: string) => gameState.players[id])
          .filter(Boolean);
        opponentAnalysis = analyzeOpponent(opponentTeam, opponentPlayers, gameState);
      }
    }
  }

  return (
    <GamePlanScreen
      week={week}
      opponentAnalysis={opponentAnalysis}
      existingPlan={gameState.weeklyGamePlan || null}
      onConfirm={async (plan: WeeklyGamePlan) => {
        const updated = applyGamePlan(gameState, plan);
        setGameState(updated);
        await saveGameState(updated);
        navigation.goBack();
      }}
      onBack={() => navigation.goBack()}
    />
  );
}

export function StartSitScreenWrapper({ navigation }: ScreenProps<'StartSit'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading..." />;
  }

  const startSitState = gameState.startSitDecisions || generateStartSitDecisions(gameState);

  return (
    <StartSitScreen
      startSitState={startSitState}
      onConfirm={async (state: StartSitState) => {
        const updated = applyStartSitDecisions(gameState, state);
        setGameState(updated);
        await saveGameState(updated);
        navigation.goBack();
      }}
      onBack={() => navigation.goBack()}
    />
  );
}

export function WeeklyAwardsScreenWrapper({
  navigation,
}: ScreenProps<'WeeklyAwards'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading..." />;
  }

  const awardsState = gameState.weeklyAwards || createWeeklyAwardsState();
  const awardRaces = generateAwardRaces(gameState);

  return (
    <WeeklyAwardsScreen
      awardsState={awardsState}
      awardRaces={awardRaces}
      userTeamId={gameState.userTeamId}
      onBack={() => navigation.goBack()}
    />
  );
}

// ============================================
// TRADE OFFERS SCREEN
// ============================================

export function TradeOffersScreenWrapper({
  navigation,
}: ScreenProps<'TradeOffers'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading..." />;
  }

  const tradeOffers = gameState.tradeOffers || createTradeOffersState();

  return (
    <TradeOffersScreen
      tradeOffers={tradeOffers}
      onAccept={async (offerId: string) => {
        const updated = acceptTradeOffer(gameState, offerId);
        setGameState(updated);
        await saveGameState(updated);
      }}
      onReject={async (offerId: string) => {
        const updated = rejectTradeOffer(gameState, offerId);
        setGameState(updated);
        await saveGameState(updated);
      }}
      onBack={() => navigation.goBack()}
    />
  );
}

// ============================================
// WAIVER WIRE SCREEN
// ============================================

export function WaiverWireScreenWrapper({
  navigation,
}: ScreenProps<'WaiverWire'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading..." />;
  }

  const waiverState = gameState.waiverWire || createWaiverWireState();
  const userTeam = gameState.teams[gameState.userTeamId];

  // Build practice squad player list
  const practiceSquadPlayers = (userTeam?.practiceSquadIds || [])
    .map((id: string) => {
      const p = gameState.players[id];
      if (!p) return null;
      const skills = Object.values(p.skills || {});
      const skillValues = skills
        .filter(
          (s: unknown): s is { trueValue: number } =>
            s != null && typeof s === 'object' && 'trueValue' in (s as Record<string, unknown>)
        )
        .map((s) => s.trueValue);
      const rating =
        skillValues.length > 0
          ? Math.round(skillValues.reduce((a: number, b: number) => a + b, 0) / skillValues.length)
          : 50;
      return {
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        position: p.position as string,
        rating,
      };
    })
    .filter((x): x is { id: string; name: string; position: string; rating: number } => x != null);

  // Build droppable player list (bottom of roster by rating)
  const droppablePlayers = (userTeam?.rosterPlayerIds || [])
    .map((id: string) => {
      const p = gameState.players[id];
      if (!p) return null;
      const skills = Object.values(p.skills || {});
      const skillValues = skills
        .filter(
          (s: unknown): s is { trueValue: number } =>
            s != null && typeof s === 'object' && 'trueValue' in (s as Record<string, unknown>)
        )
        .map((s) => s.trueValue);
      const rating =
        skillValues.length > 0
          ? Math.round(skillValues.reduce((a: number, b: number) => a + b, 0) / skillValues.length)
          : 50;
      return {
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        position: p.position as string,
        rating,
      };
    })
    .filter((x): x is { id: string; name: string; position: string; rating: number } => x != null)
    .sort((a, b) => a.rating - b.rating);

  return (
    <WaiverWireScreen
      waiverState={waiverState}
      practiceSquadPlayers={practiceSquadPlayers}
      rosterCount={userTeam?.rosterPlayerIds?.length || 0}
      droppablePlayers={droppablePlayers}
      onStateChange={async (state: WaiverWireState) => {
        const updated = { ...gameState, waiverWire: state };
        setGameState(updated);
        await saveGameState(updated);
      }}
      onBack={() => navigation.goBack()}
    />
  );
}

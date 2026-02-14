/**
 * Offseason Wrappers
 * Offseason-related screen wrappers extracted from ScreenWrappers.tsx
 *
 * Includes: OffseasonScreen, SeasonRecap, OTAs, TrainingCamp, Preseason, FinalCuts
 */

import React, { useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { useGame } from '../GameContext';
import { ScreenProps } from '../types';
import {
  LoadingFallback,
  tryCompleteViewTask,
  tryCompleteOffseasonTask,
  validateOffseasonPhaseAdvance,
} from './shared';

// Screen components
import { OffseasonScreen } from '../../screens/OffseasonScreen';
import { SeasonRecapScreen } from '../../screens/SeasonRecapScreen';
import { OTAsScreen } from '../../screens/OTAsScreen';
import { TrainingCampScreen } from '../../screens/TrainingCampScreen';
import { PreseasonScreen } from '../../screens/PreseasonScreen';
import { FinalCutsScreen } from '../../screens/FinalCutsScreen';

// Core types and offseason management
import { GameState } from '../../core/models/game/GameState';
import {
  completeTask as completeOffseasonTask,
  advancePhase as advanceOffseasonPhase,
  canAdvancePhase,
  PHASE_ORDER,
  TaskTargetScreen,
} from '../../core/offseason/OffSeasonPhaseManager';
import { enterPhase, initializeOffseason } from '../../core/offseason/OffseasonOrchestrator';
import { transitionToNewSeason } from '../../core/season/SeasonTransitionService';
import { Position } from '../../core/models/player/Position';

// Offseason phase modules
import {
  OTASummary,
  generateOTAReport,
  generateRookieIntegrationReport,
  generatePositionBattlePreview,
} from '../../core/offseason/phases/OTAsPhase';
import {
  createPositionBattle,
  generateDevelopmentReveal,
  generateCampInjury,
  getTrainingCampSummary,
} from '../../core/offseason/phases/TrainingCampPhase';
import {
  simulatePreseasonGame,
  createPreseasonEvaluation,
  getPreseasonSummary,
} from '../../core/offseason/phases/PreseasonPhase';
import {
  CutEvaluationPlayer,
  evaluateRosterForCuts,
  getFinalCutsSummary,
  isPracticeSquadEligible,
} from '../../core/offseason/phases/FinalCutsPhase';

// ============================================
// OFFSEASON SCREEN
// ============================================

export function OffseasonScreenWrapper({
  navigation,
}: ScreenProps<'Offseason'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  // Initialize offseason if it doesn't exist
  useEffect(() => {
    if (gameState && !gameState.offseasonState) {
      // Use orchestrator to initialize offseason with persistent data
      const initResult = initializeOffseason(gameState);
      // Enter the first phase to auto-generate data
      const phaseResult = enterPhase(initResult.gameState, 'season_end');
      setGameState(phaseResult.gameState);
      saveGameState(phaseResult.gameState);
    }
  }, [gameState?.offseasonState]);

  if (!gameState) {
    return <LoadingFallback message="Loading offseason..." />;
  }

  const offseasonState = gameState.offseasonState;
  if (!offseasonState) {
    // Initializing offseason state...
    return <LoadingFallback message="Initializing offseason..." />;
  }

  // Get roster size for validation display
  const userTeam = gameState.teams[gameState.userTeamId];
  const rosterSize = userTeam?.rosterPlayerIds?.length ?? 0;

  /**
   * Handle task action - navigate to appropriate screen
   */
  const handleTaskAction = (taskId: string, targetScreen: TaskTargetScreen) => {
    // Map target screens to navigation routes
    switch (targetScreen) {
      case 'DraftBoard':
        navigation.navigate('DraftBoard');
        break;
      case 'DraftRoom':
        navigation.navigate('DraftRoom');
        break;
      case 'FreeAgency':
        navigation.navigate('FreeAgency');
        break;
      case 'Staff':
        navigation.navigate('Staff');
        break;
      case 'Finances':
        navigation.navigate('Finances');
        break;
      case 'ContractManagement':
        navigation.navigate('ContractManagement');
        break;
      case 'Roster':
        navigation.navigate('Roster');
        break;
      case 'FinalCuts':
        navigation.navigate('FinalCuts');
        break;
      case 'OTAs':
        navigation.navigate('OTAs');
        break;
      case 'TrainingCamp':
        navigation.navigate('TrainingCamp');
        break;
      case 'Preseason':
        navigation.navigate('Preseason');
        break;
      case 'SeasonRecap':
        navigation.navigate('SeasonRecap');
        break;
      case 'OwnerRelations':
        navigation.navigate('OwnerRelations');
        break;
      default:
        // Unknown screen - just complete the task
        handleCompleteTask(taskId);
        return;
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    const newOffseasonState = completeOffseasonTask(offseasonState!, taskId);
    const updatedState: GameState = {
      ...gameState,
      offseasonState: newOffseasonState,
    };
    setGameState(updatedState);
    await saveGameState(updatedState);
  };

  const handleAdvanceOffseasonPhase = async () => {
    if (!canAdvancePhase(offseasonState!)) return;

    // Validate phase-specific requirements
    const validationError = validateOffseasonPhaseAdvance(gameState);
    if (validationError) {
      Alert.alert('Cannot Advance', validationError);
      return;
    }

    const newOffseasonState = advanceOffseasonPhase(offseasonState!);

    if (newOffseasonState.isComplete) {
      // Offseason complete - use SeasonTransitionService for full year-over-year transition
      const transitionedState = transitionToNewSeason({
        ...gameState,
        offseasonState: undefined,
        offseasonData: undefined,
      });
      setGameState(transitionedState);
      await saveGameState(transitionedState);
      Alert.alert('Offseason Complete', 'Preseason begins!');
      navigation.goBack();
    } else {
      // Use orchestrator to enter the new phase and auto-generate data
      const phaseResult = enterPhase(
        { ...gameState, offseasonState: newOffseasonState },
        newOffseasonState.currentPhase
      );

      const phaseIndex = PHASE_ORDER.indexOf(newOffseasonState.currentPhase);
      const updatedState: GameState = {
        ...phaseResult.gameState,
        league: {
          ...phaseResult.gameState.league,
          calendar: {
            ...phaseResult.gameState.league.calendar,
            offseasonPhase: phaseIndex + 1,
          },
        },
      };
      setGameState(updatedState);
      await saveGameState(updatedState);
    }
  };

  return (
    <OffseasonScreen
      offseasonState={offseasonState}
      year={gameState.league.calendar.currentYear}
      rosterSize={rosterSize}
      onTaskAction={handleTaskAction}
      onCompleteTask={handleCompleteTask}
      onAdvancePhase={handleAdvanceOffseasonPhase}
      onBack={() => navigation.goBack()}
    />
  );
}

// ============================================
// SEASON RECAP SCREEN
// ============================================

export function SeasonRecapScreenWrapper({
  navigation,
}: ScreenProps<'SeasonRecap'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  // Auto-complete offseason view task when screen is visited
  useEffect(() => {
    if (gameState) {
      const updatedState = tryCompleteViewTask(gameState, 'SeasonRecap');
      if (updatedState) {
        setGameState(updatedState);
        saveGameState(updatedState);
      }
    }
  }, []); // Only run on mount

  if (!gameState) {
    return <LoadingFallback message="Loading season recap..." />;
  }

  const userTeam = gameState.teams[gameState.userTeamId];
  const teamName = `${userTeam.city} ${userTeam.nickname}`;

  // Helper to calculate player overall rating from skills
  const calculatePlayerOverall = (player: (typeof gameState.players)[string]) => {
    const skills = Object.values(player.skills);
    return skills.length > 0
      ? Math.round(
          skills.reduce((sum, s) => sum + (s.perceivedMin + s.perceivedMax) / 2, 0) / skills.length
        )
      : 50;
  };

  // Get or generate season recap data
  let recap = gameState.offseasonState?.seasonRecap;

  if (!recap) {
    // Get team record from Team.currentRecord
    const teamRecord = userTeam.currentRecord;

    // Calculate division finish by comparing records of teams in same division
    const confKey = userTeam.conference.toLowerCase() as 'afc' | 'nfc';
    const divKey = userTeam.division.toLowerCase() as 'north' | 'south' | 'east' | 'west';
    const divisionTeamIds = gameState.league.standings[confKey]?.[divKey] || [];
    const divisionTeams = divisionTeamIds
      .map((teamId: string) => gameState.teams[teamId])
      .filter(Boolean)
      .sort((a, b) => {
        const aWinPct =
          a.currentRecord.wins /
          Math.max(1, a.currentRecord.wins + a.currentRecord.losses + a.currentRecord.ties);
        const bWinPct =
          b.currentRecord.wins /
          Math.max(1, b.currentRecord.wins + b.currentRecord.losses + b.currentRecord.ties);
        return bWinPct - aWinPct;
      });
    const divisionFinish = divisionTeams.findIndex((t) => t.id === gameState.userTeamId) + 1 || 4;

    // Calculate draft position based on record (simplified)
    const allTeams = Object.values(gameState.teams);
    const sortedByRecord = [...allTeams].sort((a, b) => {
      const aWinPct =
        a.currentRecord.wins /
        Math.max(1, a.currentRecord.wins + a.currentRecord.losses + a.currentRecord.ties);
      const bWinPct =
        b.currentRecord.wins /
        Math.max(1, b.currentRecord.wins + b.currentRecord.losses + b.currentRecord.ties);
      return aWinPct - bWinPct; // Worst record gets best pick
    });

    const draftPosition = sortedByRecord.findIndex((t) => t.id === gameState.userTeamId) + 1 || 16;

    // Get top performers from roster with calculated ratings
    const rosterPlayersWithRatings = userTeam.rosterPlayerIds
      .map((id) => gameState.players[id])
      .filter(Boolean)
      .map((player) => ({ player, rating: calculatePlayerOverall(player) }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);

    const topPerformers = rosterPlayersWithRatings.map(({ player, rating }) => {
      // Calculate grade based on overall rating
      let grade: string;
      if (rating >= 90) grade = 'A+';
      else if (rating >= 85) grade = 'A';
      else if (rating >= 80) grade = 'A-';
      else if (rating >= 75) grade = 'B+';
      else if (rating >= 70) grade = 'B';
      else if (rating >= 65) grade = 'B-';
      else if (rating >= 60) grade = 'C+';
      else if (rating >= 55) grade = 'C';
      else grade = 'C-';

      return {
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.position,
        grade,
      };
    });

    // Determine if team made playoffs (simplified: 10+ wins)
    const madePlayoffs = teamRecord.wins >= 10;

    recap = {
      year: gameState.league.calendar.currentYear,
      teamRecord: {
        wins: teamRecord.wins,
        losses: teamRecord.losses,
        ties: teamRecord.ties,
      },
      divisionFinish,
      madePlayoffs,
      playoffResult: null,
      draftPosition,
      topPerformers,
      awards: (() => {
        try {
          const { generateSeasonAwards } = require('../../core/offseason/bridges/PhaseGenerators') as {
            generateSeasonAwards: typeof import('../../core/offseason/bridges/PhaseGenerators').generateSeasonAwards;
          };
          return generateSeasonAwards(gameState, gameState.seasonStats).map((a) => ({
            award: a.award,
            playerId: a.playerId,
            playerName: a.playerName,
          }));
        } catch {
          return [];
        }
      })(),
      seasonWriteUp: '',
      playerImprovements: [],
    };
  }

  return (
    <SeasonRecapScreen
      recap={recap}
      teamName={teamName}
      onBack={() => navigation.goBack()}
      onPlayerSelect={(playerId) => navigation.navigate('PlayerProfile', { playerId })}
    />
  );
}

// ============================================
// OTAs SCREEN
// ============================================

export function OTAsScreenWrapper({ navigation }: ScreenProps<'OTAs'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  // Auto-complete offseason view task when screen is visited
  useEffect(() => {
    if (gameState) {
      const updatedState = tryCompleteViewTask(gameState, 'OTAs');
      if (updatedState) {
        setGameState(updatedState);
        saveGameState(updatedState);
      }
    }
  }, []); // Only run on mount

  // Build summary from stored offseasonData or generate as fallback (memoized)
  const summary = useMemo((): OTASummary | null => {
    if (!gameState) return null;

    const userTeam = gameState.teams[gameState.userTeamId];
    const od = gameState.offseasonData;

    // Use stored data if available
    if (od && od.otaReports && od.otaReports.length > 0) {
      const rookieReports = od.rookieIntegrationReports || [];
      return {
        year: gameState.league.calendar.currentYear,
        totalParticipants: od.otaReports.length,
        holdouts: od.otaReports.filter((r) => r.attendance === 'holdout').length,
        standouts: od.otaReports.filter((r) => r.impression === 'standout'),
        concerns: od.otaReports.filter((r) => r.impression === 'concerning'),
        rookieReports,
        positionBattles: od.positionBattles
          ? od.positionBattles.map((b) => {
              // Convert stored PositionBattle to PositionBattlePreview for the summary
              const sorted = [...b.competitors].sort((a, c) => c.currentScore - a.currentScore);
              const incumbent = sorted[0];
              const challengers = sorted.slice(1);
              return generatePositionBattlePreview(
                b.position,
                {
                  id: incumbent?.playerId || '',
                  name: incumbent?.playerName || '',
                  rating: incumbent?.currentScore || 0,
                },
                challengers.map((c) => ({
                  id: c.playerId,
                  name: c.playerName,
                  rating: c.currentScore,
                }))
              );
            })
          : [],
      };
    }

    // Fallback: generate from scratch (runs only once due to useMemo)
    const rosterPlayers = userTeam.rosterPlayerIds
      .map((id) => gameState.players[id])
      .filter((p) => p !== undefined);

    const otaReports = rosterPlayers.map((player) => {
      let playerType: 'rookie' | 'veteran' | 'free_agent' = 'veteran';
      if (player.experience === 0) playerType = 'rookie';
      else if (player.experience <= 2) playerType = 'free_agent';

      const skillEntries = Object.entries(player.skills);
      const avgSkill =
        skillEntries.length > 0
          ? skillEntries.reduce(
              (sum, [_, skill]) => sum + (skill.perceivedMin + skill.perceivedMax) / 2,
              0
            ) / skillEntries.length
          : 50;

      const hasMotor = player.hiddenTraits?.positive?.includes('motor');
      const isLazy = player.hiddenTraits?.negative?.includes('lazy');
      const workEthic = hasMotor ? 80 : isLazy ? 40 : 60;

      return generateOTAReport(
        player.id,
        `${player.firstName} ${player.lastName}`,
        player.position,
        playerType,
        avgSkill,
        workEthic
      );
    });

    const rookiePlayers = rosterPlayers.filter((p) => p.experience === 0);
    const rookieReports = rookiePlayers.map((player) => {
      const skillEntries = Object.entries(player.skills);
      const avgSkill =
        skillEntries.length > 0
          ? skillEntries.reduce(
              (sum, [_, skill]) => sum + (skill.perceivedMin + skill.perceivedMax) / 2,
              0
            ) / skillEntries.length
          : 50;
      const athleticScore = (player.physical.speed + player.physical.agility) / 2;

      return generateRookieIntegrationReport(
        player.id,
        `${player.firstName} ${player.lastName}`,
        player.position,
        null,
        avgSkill,
        athleticScore
      );
    });

    const keyPositions = [Position.QB, Position.RB, Position.WR];
    const positionBattles = keyPositions
      .map((pos) => {
        const positionPlayers = rosterPlayers
          .filter((p) => p.position === pos)
          .map((p) => {
            const skillEntries = Object.entries(p.skills);
            const rating =
              skillEntries.length > 0
                ? skillEntries.reduce(
                    (sum, [_, skill]) => sum + (skill.perceivedMin + skill.perceivedMax) / 2,
                    0
                  ) / skillEntries.length
                : 50;
            return { id: p.id, name: `${p.firstName} ${p.lastName}`, rating };
          })
          .sort((a, b) => b.rating - a.rating);

        if (positionPlayers.length < 2) return null;

        const [incumbent, ...challengers] = positionPlayers;
        return generatePositionBattlePreview(pos, incumbent, challengers.slice(0, 3));
      })
      .filter((battle): battle is NonNullable<typeof battle> => battle !== null);

    return {
      year: gameState.league.calendar.currentYear,
      totalParticipants: otaReports.length,
      holdouts: otaReports.filter((r) => r.attendance === 'holdout').length,
      standouts: otaReports.filter((r) => r.impression === 'standout'),
      concerns: otaReports.filter((r) => r.impression === 'concerning'),
      rookieReports,
      positionBattles,
    };
  }, [gameState]);

  if (!gameState || !summary) {
    return <LoadingFallback message="Loading OTAs..." />;
  }

  return (
    <OTAsScreen
      gameState={gameState}
      summary={summary}
      onBack={() => navigation.goBack()}
      onPlayerSelect={(playerId) => navigation.navigate('PlayerProfile', { playerId })}
    />
  );
}

// ============================================
// TRAINING CAMP SCREEN
// ============================================

export function TrainingCampScreenWrapper({
  navigation,
}: ScreenProps<'TrainingCamp'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  // Auto-complete offseason view task when screen is visited
  useEffect(() => {
    if (gameState) {
      const updatedState = tryCompleteViewTask(gameState, 'TrainingCamp');
      if (updatedState) {
        setGameState(updatedState);
        saveGameState(updatedState);
      }
    }
  }, []); // Only run on mount

  // Build summary from stored offseasonData or generate as fallback (memoized)
  const summary = useMemo(() => {
    if (!gameState) return null;

    const userTeam = gameState.teams[gameState.userTeamId];
    const od = gameState.offseasonData;

    // Use stored data if available
    if (
      od &&
      ((od.positionBattles && od.positionBattles.length > 0) ||
        (od.developmentReveals && od.developmentReveals.length > 0) ||
        (od.campInjuries && od.campInjuries.length > 0))
    ) {
      return getTrainingCampSummary(
        od.positionBattles || [],
        od.developmentReveals || [],
        od.campInjuries || []
      );
    }

    // Fallback: generate from scratch (runs only once due to useMemo)
    const rosterPlayers = userTeam.rosterPlayerIds
      .map((id) => gameState.players[id])
      .filter((p) => p !== undefined);

    const playersByPosition = new Map<Position, typeof rosterPlayers>();
    for (const player of rosterPlayers) {
      const pos = player.position;
      if (!playersByPosition.has(pos)) {
        playersByPosition.set(pos, []);
      }
      playersByPosition.get(pos)!.push(player);
    }

    const battles = [];
    for (const [position, players] of playersByPosition) {
      if (players.length >= 2) {
        const sortedPlayers = [...players].sort((a, b) => {
          const aSkill =
            Object.values(a.skills).reduce(
              (sum, s) => sum + (s.perceivedMin + s.perceivedMax) / 2,
              0
            ) / Math.max(Object.keys(a.skills).length, 1);
          const bSkill =
            Object.values(b.skills).reduce(
              (sum, s) => sum + (s.perceivedMin + s.perceivedMax) / 2,
              0
            ) / Math.max(Object.keys(b.skills).length, 1);
          return bSkill - aSkill;
        });

        if (sortedPlayers.length >= 2) {
          const top2 = sortedPlayers.slice(0, 2);
          const competitors = top2.map((p) => {
            const avgSkill =
              Object.values(p.skills).reduce(
                (sum, s) => sum + (s.perceivedMin + s.perceivedMax) / 2,
                0
              ) / Math.max(Object.keys(p.skills).length, 1);
            return {
              playerId: p.id,
              playerName: `${p.firstName} ${p.lastName}`,
              initialRating: Math.round(avgSkill),
            };
          });

          const battle = createPositionBattle(position, 'starter', competitors);
          battles.push(battle);
        }
      }
    }

    const reveals = rosterPlayers
      .map((player) =>
        generateDevelopmentReveal(
          player.id,
          `${player.firstName} ${player.lastName}`,
          player.position,
          player.age,
          player.experience
        )
      )
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const injuries = rosterPlayers
      .map((player) => {
        const isInjuryProne = player.hiddenTraits?.negative?.includes('injuryProne') ?? false;
        return generateCampInjury(
          player.id,
          `${player.firstName} ${player.lastName}`,
          player.position,
          isInjuryProne
        );
      })
      .filter((i): i is NonNullable<typeof i> => i !== null);

    return getTrainingCampSummary(battles, reveals, injuries);
  }, [gameState]);

  if (!gameState || !summary) {
    return <LoadingFallback message="Loading Training Camp..." />;
  }

  return (
    <TrainingCampScreen
      gameState={gameState}
      summary={summary}
      onBack={() => navigation.goBack()}
      onPlayerSelect={(playerId) => navigation.navigate('PlayerProfile', { playerId })}
    />
  );
}

// ============================================
// PRESEASON SCREEN
// ============================================

export function PreseasonScreenWrapper({
  navigation,
}: ScreenProps<'Preseason'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  // Auto-complete offseason view task when screen is visited
  useEffect(() => {
    if (gameState) {
      const updatedState = tryCompleteViewTask(gameState, 'Preseason');
      if (updatedState) {
        setGameState(updatedState);
        saveGameState(updatedState);
      }
    }
  }, []); // Only run on mount

  // Build summary from stored offseasonData or generate as fallback (memoized)
  const summary = useMemo(() => {
    if (!gameState) return null;

    const userTeam = gameState.teams[gameState.userTeamId];
    const od = gameState.offseasonData;

    // Use stored data if available
    if (od && od.preseasonGames && od.preseasonGames.length > 0) {
      const evaluations = od.preseasonEvaluations || [];
      return getPreseasonSummary(od.preseasonGames, evaluations);
    }

    // Fallback: generate from scratch (runs only once due to useMemo)
    const rosterPlayers = userTeam.rosterPlayerIds
      .map((id) => gameState.players[id])
      .filter((p) => p !== undefined);

    const playersWithRatings = rosterPlayers.map((player) => {
      const skills = Object.values(player.skills);
      const avgSkill =
        skills.length > 0
          ? skills.reduce((sum, s) => sum + (s.perceivedMin + s.perceivedMax) / 2, 0) /
            skills.length
          : 50;

      const positionPlayers = rosterPlayers.filter((p) => p.position === player.position);
      const sortedBySkill = [...positionPlayers].sort((a, b) => {
        const aAvg =
          Object.values(a.skills).reduce(
            (s, sk) => s + (sk.perceivedMin + sk.perceivedMax) / 2,
            0
          ) / Math.max(Object.keys(a.skills).length, 1);
        const bAvg =
          Object.values(b.skills).reduce(
            (s, sk) => s + (sk.perceivedMin + sk.perceivedMax) / 2,
            0
          ) / Math.max(Object.keys(b.skills).length, 1);
        return bAvg - aAvg;
      });
      const positionRank = sortedBySkill.findIndex((p) => p.id === player.id);
      const isStarter = positionRank < 2;

      return {
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.position,
        overallRating: Math.round(avgSkill),
        isStarter,
      };
    });

    const otherTeams = Object.values(gameState.teams).filter((t) => t.id !== gameState.userTeamId);
    const opponents = otherTeams.slice(0, 3).map((t) => `${t.city} ${t.nickname}`);

    const games = [
      simulatePreseasonGame(1, opponents[0] || 'Team A', true, playersWithRatings),
      simulatePreseasonGame(2, opponents[1] || 'Team B', false, playersWithRatings),
      simulatePreseasonGame(3, opponents[2] || 'Team C', true, playersWithRatings),
    ];

    const playerPerformanceMap = new Map<
      string,
      {
        playerId: string;
        playerName: string;
        position: string;
        performances: (typeof games)[0]['playerPerformances'];
      }
    >();

    for (const game of games) {
      for (const perf of game.playerPerformances) {
        if (!playerPerformanceMap.has(perf.playerId)) {
          playerPerformanceMap.set(perf.playerId, {
            playerId: perf.playerId,
            playerName: perf.playerName,
            position: perf.position,
            performances: [],
          });
        }
        playerPerformanceMap.get(perf.playerId)!.performances.push(perf);
      }
    }

    const evaluations = Array.from(playerPerformanceMap.values()).map((data) =>
      createPreseasonEvaluation(data.playerId, data.playerName, data.position, data.performances)
    );

    return getPreseasonSummary(games, evaluations);
  }, [gameState]);

  if (!gameState || !summary) {
    return <LoadingFallback message="Loading Preseason..." />;
  }

  return (
    <PreseasonScreen
      gameState={gameState}
      summary={summary}
      onBack={() => navigation.goBack()}
      onPlayerSelect={(playerId) => navigation.navigate('PlayerProfile', { playerId })}
    />
  );
}

// ============================================
// FINAL CUTS SCREEN
// ============================================

export function FinalCutsScreenWrapper({
  navigation,
}: ScreenProps<'FinalCuts'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  // Auto-complete offseason view task and validate roster size
  useEffect(() => {
    if (gameState) {
      const userTeam = gameState.teams[gameState.userTeamId];
      const rosterSize = userTeam?.rosterPlayerIds?.length ?? 0;

      // First, complete the view task for visiting this screen
      let updatedState = tryCompleteViewTask(gameState, 'FinalCuts');

      // Then, if roster is at or below 53, auto-complete the cut_to_53 task
      if (rosterSize <= 53) {
        const stateToCheck = updatedState || gameState;
        const cutTaskState = tryCompleteOffseasonTask(stateToCheck, 'cut_to_53');
        if (cutTaskState) {
          updatedState = cutTaskState;
        }
      }

      if (updatedState) {
        setGameState(updatedState);
        saveGameState(updatedState);
      }
    }
  }, [gameState?.teams[gameState?.userTeamId]?.rosterPlayerIds?.length]); // Re-run when roster size changes

  // Build evaluation data from stored offseasonData or generate as fallback (memoized)
  const evaluationData = useMemo(() => {
    if (!gameState) return null;

    const userTeam = gameState.teams[gameState.userTeamId];
    const rosterPlayers = userTeam.rosterPlayerIds
      .map((id) => gameState.players[id])
      .filter((p) => p !== undefined);

    const od = gameState.offseasonData;

    // Use stored preseason evaluations to build stable preseason grades
    const storedGradeMap = new Map<string, number>();
    if (od && od.preseasonEvaluations && od.preseasonEvaluations.length > 0) {
      for (const ev of od.preseasonEvaluations) {
        storedGradeMap.set(ev.playerId, Math.round(ev.avgGrade));
      }
    }

    const cutEvaluationPlayers: CutEvaluationPlayer[] = rosterPlayers.map((player) => {
      const skills = Object.values(player.skills);
      const overallRating =
        skills.length > 0
          ? Math.round(
              skills.reduce((sum, s) => sum + (s.perceivedMin + s.perceivedMax) / 2, 0) /
                skills.length
            )
          : 50;

      const baseSalary = overallRating * 50 + player.experience * 200;
      const guaranteed = player.experience <= 1 ? baseSalary * 0.5 : baseSalary * 0.2;
      const deadCap = player.experience <= 2 ? baseSalary * 0.3 : baseSalary * 0.1;

      const psEligible = isPracticeSquadEligible(player.experience, 0, player.experience >= 4);

      let recommendation: CutEvaluationPlayer['recommendation'] = 'keep';
      if (overallRating < 50) {
        recommendation = psEligible ? 'practice_squad' : 'cut';
      } else if (overallRating < 60) {
        recommendation = 'practice_squad';
      } else if (overallRating >= 75) {
        recommendation = 'keep';
      }

      const notes: string[] = [];
      if (psEligible) notes.push('Practice squad eligible');
      if (player.experience === 0) notes.push('Rookie - needs development');
      if (player.age >= 30) notes.push('Veteran presence');

      // Use stored preseason grade if available, otherwise derive deterministically
      const preseasonGrade =
        storedGradeMap.get(player.id) ?? Math.round(overallRating + (player.age % 10) - 5);

      return {
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.position,
        age: player.age,
        experience: player.experience,
        overallRating,
        preseasonGrade,
        salary: Math.round(baseSalary),
        guaranteed: Math.round(guaranteed),
        deadCapIfCut: Math.round(deadCap),
        isVested: player.experience >= 4,
        practiceSquadEligible: psEligible,
        recommendation,
        notes,
      };
    });

    const evaluation = evaluateRosterForCuts(cutEvaluationPlayers, 53);

    const summary = getFinalCutsSummary(
      evaluation.cut,
      evaluation.practiceSquad.slice(0, 16),
      evaluation.ir,
      [], // No waiver claims in this mock
      evaluation.keep
    );

    return {
      summary,
      rosterSize: rosterPlayers.length,
      practiceSquadSize: Math.min(evaluation.practiceSquad.length, 16),
    };
  }, [gameState]);

  if (!gameState || !evaluationData) {
    return <LoadingFallback message="Loading Final Cuts..." />;
  }

  return (
    <FinalCutsScreen
      gameState={gameState}
      summary={evaluationData.summary}
      rosterSize={evaluationData.rosterSize}
      maxRosterSize={53}
      practiceSquadSize={evaluationData.practiceSquadSize}
      maxPracticeSquadSize={16}
      onBack={() => navigation.goBack()}
      onPlayerSelect={(playerId) => navigation.navigate('PlayerProfile', { playerId })}
    />
  );
}

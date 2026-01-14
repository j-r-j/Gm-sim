/**
 * Screen Wrappers
 * Bridge components that adapt existing screens to React Navigation
 *
 * These wrappers:
 * 1. Use the GameContext for state
 * 2. Convert navigation.navigate() calls to the old onBack/onAction patterns
 * 3. Pass route params where needed
 *
 * This allows incremental migration - screens can be updated one at a time.
 */

import React, { useCallback } from 'react';
import { Alert, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { useGame } from './GameContext';
import { ScreenProps } from './types';
import { colors, spacing, fontSize } from '../styles';

// Import all existing screens
import { StartScreen } from '../screens/StartScreen';
import { TeamSelectionScreen } from '../screens/TeamSelectionScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { GMDashboardScreen, DashboardAction } from '../screens/GMDashboardScreen';
import { RosterScreen } from '../screens/RosterScreen';
import { StaffScreen } from '../screens/StaffScreen';
import { FinancesScreen } from '../screens/FinancesScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { StandingsScreen } from '../screens/StandingsScreen';
import { NewsScreen } from '../screens/NewsScreen';
import { GamecastScreen } from '../screens/GamecastScreen';
import { PlayoffBracketScreen, PlayoffMatchup, PlayoffSeed } from '../screens/PlayoffBracketScreen';
import { TradeScreen } from '../screens/TradeScreen';
import { DraftBoardScreen } from '../screens/DraftBoardScreen';
import { DraftRoomScreen, DraftRoomProspect } from '../screens/DraftRoomScreen';
import { FreeAgencyScreen, FreeAgent } from '../screens/FreeAgencyScreen';
import { PlayerProfileScreen } from '../screens/PlayerProfileScreen';
import { OffseasonScreen } from '../screens/OffseasonScreen';
import { CareerSummaryScreen } from '../screens/CareerSummaryScreen';
import { CoachProfileScreen } from '../screens/CoachProfileScreen';
import { DepthChartScreen } from '../screens/DepthChartScreen';
import { OwnerRelationsScreen } from '../screens/OwnerRelationsScreen';
import { ContractManagementScreen } from '../screens/ContractManagementScreen';
import { OTAsScreen } from '../screens/OTAsScreen';
import { TrainingCampScreen } from '../screens/TrainingCampScreen';
import { PreseasonScreen } from '../screens/PreseasonScreen';
import { FinalCutsScreen } from '../screens/FinalCutsScreen';
import { generateDepthChart, DepthChart } from '../core/roster/DepthChartManager';
import { createOwnerViewModel } from '../core/models/owner';
import { createPatienceViewModel } from '../core/career/PatienceMeterManager';
import { PlayerContract } from '../core/contracts';
import {
  OTASummary,
  generateOTAReport,
  generateRookieIntegrationReport,
  generatePositionBattlePreview,
} from '../core/offseason/phases/OTAsPhase';
import {
  TrainingCampSummary,
  createPositionBattle,
  generateDevelopmentReveal,
  generateCampInjury,
  getTrainingCampSummary,
} from '../core/offseason/phases/TrainingCampPhase';
import {
  PreseasonSummary,
  simulatePreseasonGame,
  createPreseasonEvaluation,
  getPreseasonSummary,
} from '../core/offseason/phases/PreseasonPhase';
import {
  CutEvaluationPlayer,
  evaluateRosterForCuts,
  getFinalCutsSummary,
  isPracticeSquadEligible,
} from '../core/offseason/phases/FinalCutsPhase';
import { Position } from '../core/models/player/Position';

// Core imports
import { GameState } from '../core/models/game/GameState';
import { createNewGame } from '../services/NewGameService';
import { gameStorage, SaveSlot } from '../services/storage/GameStorage';
import { FakeCity } from '../core/models/team/FakeCities';
import { setupGame, GameConfig } from '../core/game/GameSetup';
import { simulateWeek, advanceWeek } from '../core/season/WeekSimulator';
import {
  createOffSeasonState,
  completeTask as completeOffseasonTask,
  advancePhase as advanceOffseasonPhase,
  canAdvancePhase,
  PHASE_ORDER,
} from '../core/offseason/OffSeasonPhaseManager';
import {
  createNewsFeedState,
  generateAndAddLeagueNews,
  advanceNewsFeedWeek,
  getAllNews,
} from '../core/news/NewsFeedManager';
import { LeagueNewsContext } from '../core/news/NewsGenerators';
import { createPatienceMeterState, updatePatienceValue } from '../core/career/PatienceMeterManager';
import {
  shouldFire,
  createFiringRecord,
  createDefaultTenureStats,
  FiringContext,
} from '../core/career/FiringMechanics';
import { convertProspectsToDraftBoard, sortProspectsByRank } from '../utils/prospectUtils';
import {
  canFireCoach,
  canPromoteCoach,
  canExtendCoach,
  fireCoachAction,
  promoteCoachAction,
  getExtensionRecommendation,
} from '../core/coaching/CoachManagementActions';

// ============================================
// START SCREEN
// ============================================

export function StartScreenWrapper({ navigation }: ScreenProps<'Start'>): React.JSX.Element {
  const { setGameState, setIsLoading } = useGame();

  const handleNewGame = useCallback(() => {
    navigation.navigate('TeamSelection');
  }, [navigation]);

  const handleContinue = useCallback(
    async (slot: SaveSlot) => {
      setIsLoading(true);
      try {
        const loadedState = await gameStorage.load<GameState>(slot);
        if (loadedState) {
          setGameState(loadedState);
          navigation.navigate('Dashboard');
        } else {
          Alert.alert('Error', 'Could not load save file.');
        }
      } catch (error) {
        console.error('Error loading game:', error);
        Alert.alert('Error', 'Failed to load game. The save file may be corrupted.');
      } finally {
        setIsLoading(false);
      }
    },
    [navigation, setGameState, setIsLoading]
  );

  const handleSettings = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  return (
    <StartScreen
      onNewGame={handleNewGame}
      onContinue={handleContinue}
      onSettings={handleSettings}
    />
  );
}

// ============================================
// TEAM SELECTION SCREEN
// ============================================

export function TeamSelectionScreenWrapper({
  navigation,
}: ScreenProps<'TeamSelection'>): React.JSX.Element {
  const { setGameState, setIsLoading } = useGame();

  const handleTeamSelected = useCallback(
    async (team: FakeCity, gmName: string, saveSlot: SaveSlot) => {
      setIsLoading(true);
      try {
        const newGameState = createNewGame({
          saveSlot,
          gmName,
          selectedTeam: team,
          startYear: 2025,
        });

        await gameStorage.save(saveSlot, newGameState);
        setGameState(newGameState);
        navigation.navigate('Dashboard');
      } catch (error) {
        console.error('Error creating new game:', error);
        Alert.alert('Error', 'Failed to create new game. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [navigation, setGameState, setIsLoading]
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return <TeamSelectionScreen onSelectTeam={handleTeamSelected} onBack={handleBack} />;
}

// ============================================
// SETTINGS SCREEN
// ============================================

export function SettingsScreenWrapper({ navigation }: ScreenProps<'Settings'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  const currentSettings = gameState?.gameSettings || {
    simulationSpeed: 'normal' as const,
    autoSaveEnabled: true,
    notificationsEnabled: true,
  };

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleUpdateSettings = useCallback(
    async (updates: Partial<typeof currentSettings>) => {
      if (gameState) {
        const updatedState: GameState = {
          ...gameState,
          gameSettings: { ...currentSettings, ...updates },
        };
        setGameState(updatedState);
        await saveGameState(updatedState);
      }
    },
    [gameState, setGameState, saveGameState, currentSettings]
  );

  const handleClearData = useCallback(async () => {
    await Promise.all([gameStorage.delete(0), gameStorage.delete(1), gameStorage.delete(2)]);
    setGameState(null);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Start' }],
      })
    );
  }, [navigation, setGameState]);

  return (
    <SettingsScreen
      settings={currentSettings}
      onUpdateSettings={handleUpdateSettings}
      onBack={handleBack}
      onClearData={handleClearData}
      version="1.0.0"
    />
  );
}

// ============================================
// DASHBOARD SCREEN
// ============================================

export function DashboardScreenWrapper({
  navigation,
}: ScreenProps<'Dashboard'>): React.JSX.Element {
  const { gameState, setGameState, saveGame, saveGameState, setIsLoading, setFiringRecord } =
    useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading game..." />;
  }

  // Advance week handler (complex logic moved from App.tsx)
  const handleAdvanceWeek = useCallback(async () => {
    if (!gameState) return;

    setIsLoading(true);

    try {
      const { calendar, schedule } = gameState.league;

      if (!schedule) {
        Alert.alert('Error', 'No schedule available');
        setIsLoading(false);
        return;
      }

      let newWeek = calendar.currentWeek;
      let newPhase = calendar.currentPhase;
      let newYear = calendar.currentYear;
      let offseasonPhase = calendar.offseasonPhase;

      const updatedTeams = { ...gameState.teams };
      const updatedSchedule = { ...schedule };
      let updatedPlayers = { ...gameState.players };

      // Simulate games if in regular season or playoffs
      if ((newPhase === 'regularSeason' || newPhase === 'playoffs') && schedule.regularSeason) {
        const weekResults = simulateWeek(
          calendar.currentWeek,
          schedule,
          gameState,
          gameState.userTeamId,
          true
        );

        // Update team records
        for (const { game, result } of weekResults.games) {
          const homeTeam = updatedTeams[game.homeTeamId];
          const awayTeam = updatedTeams[game.awayTeamId];

          if (homeTeam && awayTeam) {
            if (result.isTie) {
              updatedTeams[game.homeTeamId] = {
                ...homeTeam,
                currentRecord: {
                  ...homeTeam.currentRecord,
                  ties: homeTeam.currentRecord.ties + 1,
                },
              };
              updatedTeams[game.awayTeamId] = {
                ...awayTeam,
                currentRecord: {
                  ...awayTeam.currentRecord,
                  ties: awayTeam.currentRecord.ties + 1,
                },
              };
            } else if (result.winnerId === game.homeTeamId) {
              updatedTeams[game.homeTeamId] = {
                ...homeTeam,
                currentRecord: {
                  ...homeTeam.currentRecord,
                  wins: homeTeam.currentRecord.wins + 1,
                },
              };
              updatedTeams[game.awayTeamId] = {
                ...awayTeam,
                currentRecord: {
                  ...awayTeam.currentRecord,
                  losses: awayTeam.currentRecord.losses + 1,
                },
              };
            } else {
              updatedTeams[game.homeTeamId] = {
                ...homeTeam,
                currentRecord: {
                  ...homeTeam.currentRecord,
                  losses: homeTeam.currentRecord.losses + 1,
                },
              };
              updatedTeams[game.awayTeamId] = {
                ...awayTeam,
                currentRecord: {
                  ...awayTeam.currentRecord,
                  wins: awayTeam.currentRecord.wins + 1,
                },
              };
            }
          }

          if (updatedSchedule.regularSeason) {
            updatedSchedule.regularSeason = updatedSchedule.regularSeason.map((g) =>
              g.gameId === game.gameId ? game : g
            );
          }
        }

        // Process injuries
        for (const injury of weekResults.injuryReport) {
          const player = updatedPlayers[injury.playerId];
          if (player) {
            updatedPlayers[injury.playerId] = {
              ...player,
              injuryStatus: {
                ...player.injuryStatus,
                severity: injury.weeksRemaining > 4 ? 'ir' : 'out',
                weeksRemaining: injury.weeksRemaining,
              },
            };
          }
        }
      }

      // Process injury recovery
      const advanceResult = advanceWeek(calendar.currentWeek, gameState);
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

      // Generate news
      let updatedNewsFeed =
        gameState.newsFeed || createNewsFeedState(calendar.currentYear, calendar.currentWeek);

      if ((newPhase === 'regularSeason' || newPhase === 'playoffs') && schedule.regularSeason) {
        const userTeam = updatedTeams[gameState.userTeamId];
        if (userTeam) {
          const userGameNews: LeagueNewsContext = {
            teamId: gameState.userTeamId,
            teamName: `${userTeam.city} ${userTeam.nickname}`,
            winStreak:
              userTeam.currentRecord.wins > userTeam.currentRecord.losses
                ? userTeam.currentRecord.wins
                : undefined,
          };
          updatedNewsFeed = generateAndAddLeagueNews(updatedNewsFeed, userGameNews);
        }
      }

      // Update patience meter
      let updatedPatienceMeter = gameState.patienceMeter;
      const userTeam = updatedTeams[gameState.userTeamId];
      const userOwnerId = `owner-${userTeam.abbreviation}`;
      const userOwner = gameState.owners[userOwnerId];

      if ((newPhase === 'regularSeason' || newPhase === 'playoffs') && userTeam && userOwner) {
        if (!updatedPatienceMeter) {
          updatedPatienceMeter = createPatienceMeterState(
            userOwnerId,
            userOwner.patienceMeter || 50,
            calendar.currentWeek,
            calendar.currentYear
          );
        }

        const wins = userTeam.currentRecord.wins;
        const losses = userTeam.currentRecord.losses;
        const winPct = wins + losses > 0 ? wins / (wins + losses) : 0.5;

        let patienceChange = 0;
        if (winPct >= 0.7) {
          patienceChange = 3;
        } else if (winPct >= 0.5) {
          patienceChange = 1;
        } else if (winPct >= 0.35) {
          patienceChange = -2;
        } else {
          patienceChange = -4;
        }

        const ownerPatience = userOwner.personality?.traits?.patience || 50;
        const modifier = ownerPatience < 30 ? 1.5 : ownerPatience > 70 ? 0.5 : 1.0;
        patienceChange = Math.round(patienceChange * modifier);

        const eventDesc =
          patienceChange > 0
            ? `Team performance: ${wins}-${losses}`
            : `Concerns over ${losses} losses`;
        updatedPatienceMeter = updatePatienceValue(
          updatedPatienceMeter,
          patienceChange,
          calendar.currentWeek,
          calendar.currentYear,
          eventDesc
        );

        // Check for firing
        const firingContext: FiringContext = {
          consecutiveLosingSeason: losses > wins ? 1 : 0,
          missedPlayoffsCount: 0,
          ownerDefianceCount: 0,
          majorScandals: 0,
          recentPatienceHistory: updatedPatienceMeter.history.slice(-5).map((h) => h.value),
          ownershipJustChanged: false,
          seasonExpectation: 'competitive',
        };

        const firingCheck = shouldFire(updatedPatienceMeter, firingContext, userOwner);

        if (firingCheck.shouldFire) {
          const tenureStats = gameState.tenureStats || createDefaultTenureStats();
          const record = createFiringRecord(
            gameState.userName,
            gameState.userTeamId,
            userOwner,
            calendar.currentYear,
            calendar.currentWeek,
            tenureStats,
            updatedPatienceMeter,
            firingContext,
            0,
            3000000
          );
          setFiringRecord(record);
          navigation.navigate('Fired');
          setIsLoading(false);
          return;
        }
      }

      updatedNewsFeed = advanceNewsFeedWeek(
        updatedNewsFeed,
        calendar.currentYear,
        calendar.currentWeek + 1
      );

      newWeek = calendar.currentWeek + 1;

      // Handle phase transitions
      if (newPhase === 'regularSeason' && newWeek > 18) {
        newWeek = 19;
        newPhase = 'playoffs';
      } else if (newPhase === 'playoffs' && newWeek > 22) {
        newWeek = 1;
        newPhase = 'offseason';
        offseasonPhase = 1;

        if (!gameState.offseasonState) {
          const newOffseasonState = createOffSeasonState(newYear);
          const updatedState: GameState = {
            ...gameState,
            offseasonState: newOffseasonState,
            league: {
              ...gameState.league,
              calendar: {
                ...calendar,
                currentWeek: newWeek,
                currentPhase: newPhase,
                currentYear: newYear,
                offseasonPhase: 1,
              },
            },
          };
          setGameState(updatedState);
          await saveGameState(updatedState);
          Alert.alert(
            'Season Complete',
            'The offseason begins. Complete offseason tasks to prepare for next season.'
          );
          setIsLoading(false);
          return;
        }
      } else if (newPhase === 'offseason') {
        if (offseasonPhase && offseasonPhase >= 12) {
          newPhase = 'preseason';
          offseasonPhase = null;
          newYear = calendar.currentYear + 1;
          newWeek = 1;
        } else {
          offseasonPhase = (offseasonPhase || 0) + 1;
        }
      } else if (newPhase === 'preseason' && newWeek > 4) {
        newWeek = 1;
        newPhase = 'regularSeason';
      }

      const updatedState: GameState = {
        ...gameState,
        league: {
          ...gameState.league,
          calendar: {
            ...calendar,
            currentWeek: newWeek,
            currentPhase: newPhase,
            currentYear: newYear,
            offseasonPhase,
          },
          schedule: updatedSchedule,
        },
        teams: updatedTeams,
        players: updatedPlayers,
        newsFeed: updatedNewsFeed,
        patienceMeter: updatedPatienceMeter || gameState.patienceMeter,
      };

      setGameState(updatedState);
      await saveGameState(updatedState);

      const phaseLabel =
        newPhase === 'offseason' ? `Offseason Phase ${offseasonPhase}` : `Week ${newWeek}`;
      Alert.alert('Week Advanced', `Now in ${phaseLabel}`);
    } catch (error) {
      console.error('Error advancing week:', error);
      Alert.alert('Error', 'Failed to advance week');
    } finally {
      setIsLoading(false);
    }
  }, [gameState, setGameState, saveGameState, setIsLoading, setFiringRecord, navigation]);

  const handleAction = useCallback(
    (action: DashboardAction) => {
      switch (action) {
        case 'gamecast':
          navigation.navigate('Gamecast');
          break;
        case 'depthChart':
          navigation.navigate('DepthChart');
          break;
        case 'ownerRelations':
          navigation.navigate('OwnerRelations');
          break;
        case 'contracts':
          navigation.navigate('ContractManagement');
          break;
        case 'draft':
          if (
            gameState?.league.calendar.currentPhase === 'offseason' &&
            gameState?.league.calendar.offseasonPhase === 7
          ) {
            navigation.navigate('DraftRoom');
          } else {
            navigation.navigate('DraftBoard');
          }
          break;
        case 'roster':
          navigation.navigate('Roster');
          break;
        case 'schedule':
          navigation.navigate('Schedule');
          break;
        case 'standings':
          if (gameState?.league.calendar.currentPhase === 'playoffs') {
            navigation.navigate('PlayoffBracket');
          } else {
            navigation.navigate('Standings');
          }
          break;
        case 'freeAgency':
          navigation.navigate('FreeAgency');
          break;
        case 'staff':
          navigation.navigate('Staff');
          break;
        case 'finances':
          navigation.navigate('Finances');
          break;
        case 'news':
          navigation.navigate('News');
          break;
        case 'offseason':
          navigation.navigate('Offseason');
          break;
        case 'advanceWeek':
          handleAdvanceWeek();
          break;
        case 'saveGame':
          saveGame();
          break;
        case 'settings':
          navigation.navigate('Settings');
          break;
        case 'mainMenu':
          Alert.alert('Return to Main Menu', 'Any unsaved progress will be lost. Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Yes',
              onPress: () => {
                setGameState(null);
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Start' }],
                  })
                );
              },
            },
          ]);
          break;
      }
    },
    [gameState, navigation, handleAdvanceWeek, saveGame, setGameState]
  );

  return <GMDashboardScreen gameState={gameState} onAction={handleAction} />;
}

// ============================================
// ROSTER SCREEN
// ============================================

export function RosterScreenWrapper({ navigation }: ScreenProps<'Roster'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading roster..." />;
  }

  const userTeam = gameState.teams[gameState.userTeamId];
  const leagueCap = (gameState.league.settings?.salaryCap || 255000) * 1000;
  const capSpace = userTeam.finances?.capSpace ?? leagueCap * 0.2;

  return (
    <RosterScreen
      rosterIds={userTeam.rosterPlayerIds}
      players={gameState.players}
      capSpace={capSpace}
      onBack={() => navigation.goBack()}
      onSelectPlayer={(playerId) => navigation.navigate('PlayerProfile', { playerId })}
      onGetCutPreview={(playerId) => {
        const player = gameState.players[playerId];
        if (!player) return null;
        const estimatedSalary = 2000000 + Math.random() * 10000000;
        return {
          playerId,
          playerName: `${player.firstName} ${player.lastName}`,
          capSavings: estimatedSalary * 0.7,
          deadMoney: estimatedSalary * 0.3,
          recommendation:
            player.age >= 30 ? 'Consider releasing - aging player' : 'Still productive',
        };
      }}
      onCutPlayer={async (playerId) => {
        const player = gameState.players[playerId];
        if (!player) return false;

        const updatedRoster = userTeam.rosterPlayerIds.filter((id) => id !== playerId);
        const updatedTeam = {
          ...userTeam,
          rosterPlayerIds: updatedRoster,
        };
        const updatedState: GameState = {
          ...gameState,
          teams: {
            ...gameState.teams,
            [userTeam.id]: updatedTeam,
          },
        };
        setGameState(updatedState);
        await saveGameState(updatedState);
        return true;
      }}
      isExtensionEligible={(playerId) => {
        const player = gameState.players[playerId];
        return player ? player.experience >= 2 : false;
      }}
      onExtendPlayer={async (_playerId, offer) => {
        const aav = offer.totalValue / offer.years;
        if (aav >= 5000000 && offer.guaranteed >= offer.totalValue * 0.3) {
          return 'accepted';
        } else if (aav >= 3000000) {
          return 'counter';
        }
        return 'rejected';
      }}
      onTrade={() => navigation.navigate('Trade')}
    />
  );
}

// ============================================
// DEPTH CHART SCREEN
// ============================================

export function DepthChartScreenWrapper({
  navigation,
}: ScreenProps<'DepthChart'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading depth chart..." />;
  }

  // Get or generate depth chart for user's team
  const userTeamId = gameState.userTeamId;
  const existingDepthChart = gameState.depthCharts?.[userTeamId];

  // Use existing or generate new depth chart
  const depthChart: DepthChart = existingDepthChart || generateDepthChart(gameState, userTeamId);

  const handleDepthChartChange = async (newDepthChart: DepthChart) => {
    const updatedState: GameState = {
      ...gameState,
      depthCharts: {
        ...gameState.depthCharts,
        [userTeamId]: newDepthChart,
      },
    };
    setGameState(updatedState);
    await saveGameState(updatedState);
  };

  const handlePlayerSelect = (playerId: string) => {
    navigation.navigate('PlayerProfile', { playerId });
  };

  return (
    <DepthChartScreen
      gameState={gameState}
      depthChart={depthChart}
      onBack={() => navigation.goBack()}
      onDepthChartChange={handleDepthChartChange}
      onPlayerSelect={handlePlayerSelect}
    />
  );
}

// ============================================
// OWNER RELATIONS SCREEN
// ============================================

export function OwnerRelationsScreenWrapper({
  navigation,
}: ScreenProps<'OwnerRelations'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading owner relations..." />;
  }

  const userTeam = gameState.teams[gameState.userTeamId];
  const ownerId = `owner-${userTeam.abbreviation}`;
  const owner = gameState.owners[ownerId];

  if (!owner) {
    return <LoadingFallback message="Owner not found..." />;
  }

  const ownerViewModel = createOwnerViewModel(owner);
  const patienceView = gameState.patienceMeter
    ? createPatienceViewModel(gameState.patienceMeter)
    : null;

  return (
    <OwnerRelationsScreen
      owner={ownerViewModel}
      patienceView={patienceView}
      teamName={`${userTeam.city} ${userTeam.nickname}`}
      currentWeek={gameState.league.calendar.currentWeek}
      onBack={() => navigation.goBack()}
      onDemandPress={(demand) => {
        // Future: Navigate to demand-specific screen
        Alert.alert(
          'Owner Demand',
          `${demand.description}\n\nDeadline: Week ${demand.deadline}\n\nConsequence: ${demand.consequence}`
        );
      }}
    />
  );
}

// ============================================
// CONTRACT MANAGEMENT SCREEN
// ============================================

export function ContractManagementScreenWrapper({
  navigation,
}: ScreenProps<'ContractManagement'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading contracts..." />;
  }

  const userTeam = gameState.teams[gameState.userTeamId];

  // Build cap status from team finances
  // Note: In a full implementation, we'd track SalaryCapState in GameState
  // For now, we create a mock cap status from team finances
  const capStatus = {
    salaryCap: 255000, // $255M cap in thousands
    currentCapUsage: Math.round(
      255000 - userTeam.finances.capSpace / 1000 // Convert dollars to thousands
    ),
    capSpace: Math.round(userTeam.finances.capSpace / 1000),
    deadMoney: 0,
    effectiveCapSpace: Math.round(userTeam.finances.capSpace / 1000),
    percentUsed: ((255000 - userTeam.finances.capSpace / 1000) / 255000) * 100,
    top51Total: 0,
    isOverCap: userTeam.finances.capSpace < 0,
    meetsFloor: true,
    rolloverFromPreviousYear: 0,
  };

  // Get contracts from players on the roster
  // In a full implementation, we'd track PlayerContract objects in GameState
  // For now, we create mock contracts from player data
  const contracts: PlayerContract[] = userTeam.rosterPlayerIds
    .map((playerId) => {
      const player = gameState.players[playerId];
      if (!player) return null;

      // Create a mock contract based on player data
      const contract: PlayerContract = {
        id: `contract-${playerId}`,
        playerId,
        playerName: `${player.firstName} ${player.lastName}`,
        teamId: userTeam.id,
        position: player.position,
        status: 'active',
        type: player.experience <= 3 ? 'rookie' : 'veteran',
        signedYear: gameState.league.calendar.currentYear - player.experience,
        totalYears: 4,
        yearsRemaining: Math.max(1, 4 - player.experience),
        totalValue: Math.round(Math.random() * 50000 + 1000), // Mock value
        guaranteedMoney: Math.round(Math.random() * 20000 + 500),
        signingBonus: Math.round(Math.random() * 10000),
        averageAnnualValue: Math.round(Math.random() * 15000 + 500),
        yearlyBreakdown: [
          {
            year: 1,
            baseSalary: Math.round(Math.random() * 10000 + 500),
            prorationedBonus: Math.round(Math.random() * 2000),
            rosterBonus: 0,
            workoutBonus: 0,
            optionBonus: 0,
            incentivesLTBE: 0,
            incentivesNLTBE: 0,
            capHit: Math.round(Math.random() * 12000 + 500),
            isGuaranteed: Math.random() > 0.5,
            isGuaranteedForInjury: Math.random() > 0.7,
            isVoidYear: false,
          },
        ],
        voidYears: 0,
        hasNoTradeClause: Math.random() > 0.9,
        hasNoTagClause: false,
        originalContractId: null,
        notes: [],
      };
      return contract;
    })
    .filter((c): c is PlayerContract => c !== null);

  return (
    <ContractManagementScreen
      gameState={gameState}
      capStatus={capStatus}
      contracts={contracts}
      onBack={() => navigation.goBack()}
      onPlayerSelect={(playerId) => {
        navigation.navigate('PlayerProfile', { playerId });
      }}
      onCutPlayer={(playerId, breakdown) => {
        const player = gameState.players[playerId];
        Alert.alert(
          'Cut Analysis',
          `${player?.firstName} ${player?.lastName}\n\n` +
            `Standard Cut:\n` +
            `  Cap Savings: $${(breakdown.standardCut.capSavings / 1000).toFixed(1)}M\n` +
            `  Dead Money: $${(breakdown.standardCut.deadMoney / 1000).toFixed(1)}M\n\n` +
            `Post-June 1:\n` +
            `  Cap Savings: $${(breakdown.postJune1Cut.capSavings / 1000).toFixed(1)}M\n` +
            `  Dead Money: $${(breakdown.postJune1Cut.deadMoney / 1000).toFixed(1)}M\n\n` +
            `Recommendation: ${breakdown.bestOptionReason}`
        );
      }}
    />
  );
}

// ============================================
// STAFF SCREEN
// ============================================

export function StaffScreenWrapper({ navigation }: ScreenProps<'Staff'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading staff..." />;
  }

  const teamCoaches = Object.values(gameState.coaches).filter(
    (coach) => coach.teamId === gameState.userTeamId
  );

  const teamScouts = Object.values(gameState.scouts).filter(
    (scout) => scout.teamId === gameState.userTeamId
  );

  return (
    <StaffScreen
      coaches={teamCoaches}
      scouts={teamScouts}
      onBack={() => navigation.goBack()}
      onSelectStaff={(staffId, type) => {
        if (type === 'coach') {
          navigation.navigate('CoachProfile', { coachId: staffId });
        } else {
          // Scout profile - to be implemented
          const scout = gameState.scouts[staffId];
          if (scout) {
            Alert.alert(
              `${scout.firstName} ${scout.lastName}`,
              `Region: ${scout.attributes.regionKnowledge || 'General'}\nExperience: ${scout.attributes.experience}`
            );
          }
        }
      }}
    />
  );
}

// ============================================
// FINANCES SCREEN
// ============================================

export function FinancesScreenWrapper({ navigation }: ScreenProps<'Finances'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading finances..." />;
  }

  const userTeam = gameState.teams[gameState.userTeamId];
  const salaryCap = (gameState.league.settings?.salaryCap || 255000) * 1000;

  return (
    <FinancesScreen
      team={userTeam}
      players={gameState.players}
      salaryCap={salaryCap}
      onBack={() => navigation.goBack()}
      onSelectPlayer={(playerId) => navigation.navigate('PlayerProfile', { playerId })}
    />
  );
}

// ============================================
// SCHEDULE SCREEN
// ============================================

export function ScheduleScreenWrapper({ navigation }: ScreenProps<'Schedule'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading schedule..." />;
  }

  const schedule = gameState.league.schedule;
  const scheduleGames = schedule ? schedule.regularSeason : [];

  return (
    <ScheduleScreen
      userTeamId={gameState.userTeamId}
      teams={gameState.teams}
      schedule={scheduleGames}
      currentWeek={gameState.league.calendar.currentWeek}
      onBack={() => navigation.goBack()}
      onSelectGame={(game) => {
        if (game.week === gameState.league.calendar.currentWeek) {
          navigation.navigate('Gamecast');
        }
      }}
    />
  );
}

// ============================================
// STANDINGS SCREEN
// ============================================

export function StandingsScreenWrapper({
  navigation,
}: ScreenProps<'Standings'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading standings..." />;
  }

  return (
    <StandingsScreen
      teams={gameState.teams}
      userTeamId={gameState.userTeamId}
      onBack={() => navigation.goBack()}
    />
  );
}

// ============================================
// NEWS SCREEN
// ============================================

export function NewsScreenWrapper({ navigation }: ScreenProps<'News'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading news..." />;
  }

  const currentWeek = gameState.league.calendar.currentWeek;
  const currentYear = gameState.league.calendar.currentYear;
  const readStatus = gameState.newsReadStatus || {};

  const mapCategory = (
    category: string
  ): 'trade' | 'injury' | 'team' | 'league' | 'yourTeam' | 'draft' | 'freeAgency' => {
    const mapping: Record<
      string,
      'trade' | 'injury' | 'team' | 'league' | 'yourTeam' | 'draft' | 'freeAgency'
    > = {
      trade: 'trade',
      injury: 'injury',
      team: 'team',
      league: 'league',
      draft: 'draft',
      signing: 'freeAgency',
      performance: 'team',
      milestone: 'team',
      coaching: 'team',
    };
    return mapping[category] || 'league';
  };

  let newsItems;
  if (gameState.newsFeed && gameState.newsFeed.newsItems.length > 0) {
    newsItems = getAllNews(gameState.newsFeed).map((item) => ({
      id: item.id,
      headline: item.headline,
      summary: item.body,
      date:
        typeof item.timestamp === 'number'
          ? new Date(item.timestamp).toISOString()
          : item.timestamp,
      category: mapCategory(item.category),
      week: item.week,
      year: item.season,
      relatedTeamIds: item.teamId ? [item.teamId] : [],
      isRead: item.isRead || readStatus[item.id] || false,
      priority: item.priority as 'breaking' | 'normal' | 'minor',
    }));
  } else {
    newsItems = [
      {
        id: '1',
        headline: 'Season Underway',
        summary: `Week ${currentWeek} of the ${currentYear} season is here.`,
        date: new Date().toISOString(),
        category: 'league' as const,
        week: currentWeek,
        year: currentYear,
        relatedTeamIds: [],
        isRead: readStatus['1'] || false,
        priority: 'normal' as const,
      },
      {
        id: '2',
        headline: 'Draft Class Revealed',
        summary: `${Object.keys(gameState.prospects).length} prospects available for the upcoming draft.`,
        date: new Date().toISOString(),
        category: 'draft' as const,
        week: currentWeek,
        year: currentYear,
        relatedTeamIds: [],
        isRead: readStatus['2'] || false,
        priority: 'normal' as const,
      },
    ];
  }

  return (
    <NewsScreen
      news={newsItems}
      currentWeek={currentWeek}
      currentYear={currentYear}
      onBack={() => navigation.goBack()}
      onMarkRead={async (newsId) => {
        const updatedState: GameState = {
          ...gameState,
          newsReadStatus: {
            ...readStatus,
            [newsId]: true,
          },
        };
        setGameState(updatedState);
        await saveGameState(updatedState);
      }}
    />
  );
}

// ============================================
// GAMECAST SCREEN
// ============================================

export function GamecastScreenWrapper({ navigation }: ScreenProps<'Gamecast'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading gamecast..." />;
  }

  const userTeam = gameState.teams[gameState.userTeamId];
  const opponentTeamIds = Object.keys(gameState.teams).filter((id) => id !== gameState.userTeamId);
  const opponentId =
    opponentTeamIds[gameState.league.calendar.currentWeek % opponentTeamIds.length];

  const gameConfig: GameConfig = {
    homeTeamId: gameState.userTeamId,
    awayTeamId: opponentId,
    week: gameState.league.calendar.currentWeek,
    isPlayoff: gameState.league.calendar.currentPhase === 'playoffs',
  };

  const teamsMap = new Map(Object.entries(gameState.teams));
  const playersMap = new Map(Object.entries(gameState.players));
  const coachesMap = new Map(Object.entries(gameState.coaches));

  let realGameSetup;
  try {
    realGameSetup = setupGame(gameConfig, teamsMap, playersMap, coachesMap);
  } catch (error) {
    console.error('Error setting up game:', error);
    Alert.alert('Error', 'Failed to set up game. Please try again.');
    navigation.goBack();
    return <LoadingFallback message="Error setting up game..." />;
  }

  return (
    <GamecastScreen
      gameSetup={realGameSetup}
      gameInfo={{
        week: gameState.league.calendar.currentWeek,
        date: new Date().toISOString().split('T')[0],
      }}
      onBack={() => navigation.goBack()}
      onGameEnd={async (result) => {
        const won = result.homeScore > result.awayScore;
        const lost = result.homeScore < result.awayScore;
        const currentStreak = userTeam.currentRecord.streak;
        const newStreak = won
          ? currentStreak > 0
            ? currentStreak + 1
            : 1
          : lost
            ? currentStreak < 0
              ? currentStreak - 1
              : -1
            : 0;

        const updatedTeam = {
          ...userTeam,
          currentRecord: {
            ...userTeam.currentRecord,
            wins: userTeam.currentRecord.wins + (won ? 1 : 0),
            losses: userTeam.currentRecord.losses + (lost ? 1 : 0),
            ties: userTeam.currentRecord.ties + (!won && !lost ? 1 : 0),
            pointsFor: userTeam.currentRecord.pointsFor + result.homeScore,
            pointsAgainst: userTeam.currentRecord.pointsAgainst + result.awayScore,
            streak: newStreak,
          },
        };

        const updatedState: GameState = {
          ...gameState,
          teams: {
            ...gameState.teams,
            [userTeam.id]: updatedTeam,
          },
        };

        setGameState(updatedState);
        await saveGameState(updatedState);
        navigation.goBack();
      }}
    />
  );
}

// ============================================
// PLAYOFF BRACKET SCREEN
// ============================================

export function PlayoffBracketScreenWrapper({
  navigation,
}: ScreenProps<'PlayoffBracket'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading playoffs..." />;
  }

  const generateSeeds = (conference: 'AFC' | 'NFC'): PlayoffSeed[] => {
    const confTeams = Object.values(gameState.teams)
      .filter((t) => t.conference === conference)
      .sort((a, b) => {
        if (b.currentRecord.wins !== a.currentRecord.wins) {
          return b.currentRecord.wins - a.currentRecord.wins;
        }
        return b.currentRecord.losses - a.currentRecord.losses;
      })
      .slice(0, 7);

    return confTeams.map((team, index) => ({
      seed: index + 1,
      teamId: team.id,
      record: team.currentRecord,
      conference,
    }));
  };

  const afcSeeds = generateSeeds('AFC');
  const nfcSeeds = generateSeeds('NFC');

  const generateMatchups = (): PlayoffMatchup[] => {
    const matchups: PlayoffMatchup[] = [];
    const week = gameState.league.calendar.currentWeek;

    for (const conf of ['AFC', 'NFC'] as const) {
      const seeds = conf === 'AFC' ? afcSeeds : nfcSeeds;

      matchups.push({
        gameId: `wc-${conf}-1`,
        round: 'wildCard',
        conference: conf,
        homeSeed: 2,
        awaySeed: 7,
        homeTeamId: seeds[1]?.teamId || null,
        awayTeamId: seeds[6]?.teamId || null,
        homeScore: week > 19 ? 28 + Math.floor(Math.random() * 7) : null,
        awayScore: week > 19 ? 21 + Math.floor(Math.random() * 7) : null,
        winnerId: week > 19 ? seeds[1]?.teamId || null : null,
        isComplete: week > 19,
      });

      matchups.push({
        gameId: `wc-${conf}-2`,
        round: 'wildCard',
        conference: conf,
        homeSeed: 3,
        awaySeed: 6,
        homeTeamId: seeds[2]?.teamId || null,
        awayTeamId: seeds[5]?.teamId || null,
        homeScore: week > 19 ? 24 + Math.floor(Math.random() * 10) : null,
        awayScore: week > 19 ? 17 + Math.floor(Math.random() * 7) : null,
        winnerId: week > 19 ? seeds[2]?.teamId || null : null,
        isComplete: week > 19,
      });

      matchups.push({
        gameId: `wc-${conf}-3`,
        round: 'wildCard',
        conference: conf,
        homeSeed: 4,
        awaySeed: 5,
        homeTeamId: seeds[3]?.teamId || null,
        awayTeamId: seeds[4]?.teamId || null,
        homeScore: week > 19 ? 21 + Math.floor(Math.random() * 10) : null,
        awayScore: week > 19 ? 14 + Math.floor(Math.random() * 14) : null,
        winnerId: week > 19 ? seeds[3]?.teamId || null : null,
        isComplete: week > 19,
      });
    }

    return matchups;
  };

  const matchups = generateMatchups();
  const currentRound =
    gameState.league.calendar.currentWeek <= 18
      ? 'wildCard'
      : gameState.league.calendar.currentWeek <= 20
        ? 'divisional'
        : gameState.league.calendar.currentWeek <= 21
          ? 'conference'
          : gameState.league.calendar.currentWeek <= 22
            ? 'superBowl'
            : 'complete';

  return (
    <PlayoffBracketScreen
      teams={gameState.teams}
      afcSeeds={afcSeeds}
      nfcSeeds={nfcSeeds}
      matchups={matchups}
      userTeamId={gameState.userTeamId}
      currentRound={currentRound}
      championId={null}
      onBack={() => navigation.goBack()}
    />
  );
}

// ============================================
// TRADE SCREEN
// ============================================

export function TradeScreenWrapper({ navigation }: ScreenProps<'Trade'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading trade..." />;
  }

  const userTeam = gameState.teams[gameState.userTeamId];

  return (
    <TradeScreen
      userTeam={userTeam}
      teams={gameState.teams}
      players={gameState.players}
      draftPicks={gameState.draftPicks}
      onBack={() => navigation.goBack()}
      onSubmitTrade={async (proposal) => {
        const offeredValue = proposal.assetsOffered.reduce((sum, a) => sum + a.value, 0);
        const requestedValue = proposal.assetsRequested.reduce((sum, a) => sum + a.value, 0);

        if (offeredValue >= requestedValue * 0.85) {
          const updatedTeams = { ...gameState.teams };
          const userTeamCopy = { ...updatedTeams[proposal.offeringTeamId] };
          const partnerTeamCopy = { ...updatedTeams[proposal.receivingTeamId] };

          for (const asset of proposal.assetsOffered) {
            if (asset.type === 'player') {
              userTeamCopy.rosterPlayerIds = userTeamCopy.rosterPlayerIds.filter(
                (id) => id !== asset.playerId
              );
              partnerTeamCopy.rosterPlayerIds = [
                ...partnerTeamCopy.rosterPlayerIds,
                asset.playerId,
              ];
            }
          }
          for (const asset of proposal.assetsRequested) {
            if (asset.type === 'player') {
              partnerTeamCopy.rosterPlayerIds = partnerTeamCopy.rosterPlayerIds.filter(
                (id) => id !== asset.playerId
              );
              userTeamCopy.rosterPlayerIds = [...userTeamCopy.rosterPlayerIds, asset.playerId];
            }
          }

          const updatedPicks = { ...gameState.draftPicks };
          for (const asset of proposal.assetsOffered) {
            if (asset.type === 'pick' && updatedPicks[asset.pickId]) {
              updatedPicks[asset.pickId] = {
                ...updatedPicks[asset.pickId],
                currentTeamId: proposal.receivingTeamId,
              };
            }
          }
          for (const asset of proposal.assetsRequested) {
            if (asset.type === 'pick' && updatedPicks[asset.pickId]) {
              updatedPicks[asset.pickId] = {
                ...updatedPicks[asset.pickId],
                currentTeamId: proposal.offeringTeamId,
              };
            }
          }

          updatedTeams[proposal.offeringTeamId] = userTeamCopy;
          updatedTeams[proposal.receivingTeamId] = partnerTeamCopy;

          const updatedState: GameState = {
            ...gameState,
            teams: updatedTeams,
            draftPicks: updatedPicks,
          };
          setGameState(updatedState);
          await saveGameState(updatedState);
          return 'accepted';
        } else if (offeredValue >= requestedValue * 0.7) {
          return 'counter';
        }
        return 'rejected';
      }}
    />
  );
}

// ============================================
// DRAFT BOARD SCREEN
// ============================================

export function DraftBoardScreenWrapper({
  navigation,
}: ScreenProps<'DraftBoard'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading draft board..." />;
  }

  const draftBoardProspects = sortProspectsByRank(
    convertProspectsToDraftBoard(gameState.prospects)
  );

  return (
    <DraftBoardScreen
      prospects={draftBoardProspects}
      draftYear={gameState.league.calendar.currentYear}
      onSelectProspect={(id) => navigation.navigate('PlayerProfile', { prospectId: id })}
      onToggleFlag={async (id) => {
        const prospect = gameState.prospects[id];
        if (prospect) {
          const updatedState: GameState = {
            ...gameState,
            prospects: {
              ...gameState.prospects,
              [id]: {
                ...prospect,
                flagged: !prospect.flagged,
              },
            },
          };
          setGameState(updatedState);
          await saveGameState(updatedState);
        }
      }}
      onBack={() => navigation.goBack()}
    />
  );
}

// ============================================
// DRAFT ROOM SCREEN
// ============================================

export function DraftRoomScreenWrapper({
  navigation,
}: ScreenProps<'DraftRoom'>): React.JSX.Element {
  const {
    gameState,
    draftCurrentPick,
    draftedProspects,
    autoPickEnabled,
    draftPaused,
    setDraftCurrentPick,
    setDraftedProspects,
    setAutoPickEnabled,
    setDraftPaused,
  } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading draft room..." />;
  }

  const teamIds = Object.keys(gameState.teams);
  const totalPicks = teamIds.length * 7;

  const draftOrder = Array.from({ length: totalPicks }, (_, i) => {
    const round = Math.floor(i / teamIds.length) + 1;
    const pickInRound = i % teamIds.length;
    const teamIndex = round % 2 === 1 ? pickInRound : teamIds.length - 1 - pickInRound;
    return {
      round,
      pickNumber: i + 1,
      teamId: teamIds[teamIndex],
      teamName: `${gameState.teams[teamIds[teamIndex]].city} ${gameState.teams[teamIds[teamIndex]].nickname}`,
      teamAbbr: gameState.teams[teamIds[teamIndex]].abbreviation,
    };
  });

  const currentPickInfo = draftOrder[draftCurrentPick - 1] || draftOrder[0];
  const recentPicks = draftOrder
    .slice(Math.max(0, draftCurrentPick - 6), draftCurrentPick - 1)
    .map((pick) => ({
      ...pick,
      selectedProspectId: Object.entries(draftedProspects).find(([_, teamId]) =>
        draftOrder.find((p) => p.pickNumber === pick.pickNumber && p.teamId === teamId)
      )?.[0],
    }));
  const upcomingPicks = draftOrder.slice(draftCurrentPick, draftCurrentPick + 5);

  const availableProspects: DraftRoomProspect[] = Object.values(gameState.prospects)
    .filter((p) => !draftedProspects[p.id])
    .map((p, index) => ({
      id: p.id,
      name: `${p.player.firstName} ${p.player.lastName}`,
      position: p.player.position,
      collegeName: p.collegeName,
      projectedRound: p.consensusProjection?.projectedRound ?? null,
      projectedPickRange: p.consensusProjection?.projectedPickRange ?? null,
      userTier: p.userTier,
      flagged: p.flagged,
      positionRank: index + 1,
      overallRank: index + 1,
      isDrafted: false,
    }));

  return (
    <DraftRoomScreen
      currentPick={currentPickInfo}
      userTeamId={gameState.userTeamId}
      recentPicks={recentPicks}
      upcomingPicks={upcomingPicks}
      availableProspects={availableProspects}
      tradeOffers={[]}
      autoPickEnabled={autoPickEnabled}
      isPaused={draftPaused}
      onSelectProspect={async (prospectId) => {
        const newDraftedProspects = {
          ...draftedProspects,
          [prospectId]: currentPickInfo.teamId,
        };
        setDraftedProspects(newDraftedProspects);

        if (draftCurrentPick < totalPicks) {
          setDraftCurrentPick(draftCurrentPick + 1);
        } else {
          Alert.alert('Draft Complete', 'The draft has concluded!');
          navigation.goBack();
        }
      }}
      onViewProspect={(prospectId) => navigation.navigate('PlayerProfile', { prospectId })}
      onAcceptTrade={(tradeId) => Alert.alert('Trade Accepted', `Trade ${tradeId} accepted`)}
      onRejectTrade={(tradeId) => Alert.alert('Trade Rejected', `Trade ${tradeId} rejected`)}
      onCounterTrade={(tradeId) =>
        Alert.alert('Counter Trade', `Counter offer for trade ${tradeId}`)
      }
      onProposeTrade={() => Alert.alert('Propose Trade', 'Trade proposal feature coming soon')}
      onToggleAutoPick={() => setAutoPickEnabled(!autoPickEnabled)}
      onTogglePause={() => setDraftPaused(!draftPaused)}
      onBack={() => navigation.goBack()}
    />
  );
}

// ============================================
// FREE AGENCY SCREEN
// ============================================

export function FreeAgencyScreenWrapper({
  navigation,
}: ScreenProps<'FreeAgency'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading free agency..." />;
  }

  const userTeam = gameState.teams[gameState.userTeamId];
  const leagueCap = (gameState.league.settings?.salaryCap || 255000) * 1000;
  const capSpace = userTeam.finances?.capSpace ?? leagueCap * 0.2;

  const freeAgents: FreeAgent[] = Object.values(gameState.players)
    .filter((p) => {
      const isOnRoster = Object.values(gameState.teams).some(
        (t) =>
          t.rosterPlayerIds.includes(p.id) ||
          t.practiceSquadIds.includes(p.id) ||
          t.injuredReserveIds.includes(p.id)
      );
      return !isOnRoster;
    })
    .slice(0, 50)
    .map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      position: p.position,
      age: p.age,
      experience: p.experience || 0,
      estimatedValue: 2000000 + Math.random() * 15000000,
      skills: Object.fromEntries(
        Object.entries(p.skills).map(([key, skill]) => [
          key,
          { perceivedMin: skill.perceivedMin, perceivedMax: skill.perceivedMax },
        ])
      ),
    }));

  return (
    <FreeAgencyScreen
      freeAgents={freeAgents}
      capSpace={capSpace}
      teamName={`${userTeam.city} ${userTeam.nickname}`}
      onMakeOffer={async (playerId, offer) => {
        const agent = freeAgents.find((a) => a.id === playerId);
        if (!agent) return 'rejected';

        const offerRatio = offer.annualSalary / agent.estimatedValue;
        if (offerRatio >= 0.9) {
          const player = gameState.players[playerId];
          if (player) {
            const updatedTeam = {
              ...userTeam,
              rosterPlayerIds: [...userTeam.rosterPlayerIds, playerId],
              finances: userTeam.finances
                ? {
                    ...userTeam.finances,
                    capSpace: userTeam.finances.capSpace - offer.annualSalary,
                    currentCapUsage: userTeam.finances.currentCapUsage + offer.annualSalary,
                  }
                : userTeam.finances,
            };
            const updatedState: GameState = {
              ...gameState,
              teams: {
                ...gameState.teams,
                [userTeam.id]: updatedTeam,
              },
            };
            setGameState(updatedState);
            await saveGameState(updatedState);
          }
          return 'accepted';
        } else if (offerRatio >= 0.7) {
          return 'counter';
        }
        return 'rejected';
      }}
      onBack={() => navigation.goBack()}
    />
  );
}

// ============================================
// PLAYER PROFILE SCREEN
// ============================================

export function PlayerProfileScreenWrapper({
  navigation,
  route,
}: ScreenProps<'PlayerProfile'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();
  const { playerId, prospectId } = route.params;

  if (!gameState) {
    return <LoadingFallback message="Loading player..." />;
  }

  const realProspect = prospectId ? gameState.prospects[prospectId] : null;
  const realPlayer = playerId ? gameState.players[playerId] : null;

  let profileData = null;

  if (realProspect) {
    profileData = {
      playerId: realProspect.id,
      firstName: realProspect.player.firstName,
      lastName: realProspect.player.lastName,
      position: realProspect.player.position,
      age: realProspect.player.age,
      experience: 0,
      skills: realProspect.player.skills as Record<
        string,
        { trueValue: number; perceivedMin: number; perceivedMax: number; maturityAge: number }
      >,
      physical: realProspect.player.physical,
      physicalsRevealed: realProspect.physicalsRevealed,
      hiddenTraits: realProspect.player.hiddenTraits,
      collegeName: realProspect.collegeName,
      draftYear: realProspect.draftYear,
      projectedRound: realProspect.consensusProjection?.projectedRound ?? null,
      projectedPickRange: realProspect.consensusProjection?.projectedPickRange ?? null,
      userTier: realProspect.userTier,
      flagged: realProspect.flagged,
    };
  } else if (realPlayer) {
    profileData = {
      playerId: realPlayer.id,
      firstName: realPlayer.firstName,
      lastName: realPlayer.lastName,
      position: realPlayer.position,
      age: realPlayer.age,
      experience: realPlayer.experience || 0,
      skills: realPlayer.skills as Record<
        string,
        { trueValue: number; perceivedMin: number; perceivedMax: number; maturityAge: number }
      >,
      physical: realPlayer.physical,
      physicalsRevealed: true,
      hiddenTraits: realPlayer.hiddenTraits,
      collegeName: undefined,
      draftYear: undefined,
      projectedRound: null,
      projectedPickRange: null,
      userTier: null,
      flagged: false,
    };
  }

  if (!profileData) {
    navigation.goBack();
    return <LoadingFallback message="Player not found..." />;
  }

  return (
    <PlayerProfileScreen
      {...profileData}
      onBack={() => navigation.goBack()}
      onToggleFlag={async () => {
        if (realProspect) {
          const updatedState: GameState = {
            ...gameState,
            prospects: {
              ...gameState.prospects,
              [realProspect.id]: {
                ...realProspect,
                flagged: !realProspect.flagged,
              },
            },
          };
          setGameState(updatedState);
          await saveGameState(updatedState);
        }
      }}
    />
  );
}

// ============================================
// OFFSEASON SCREEN
// ============================================

export function OffseasonScreenWrapper({
  navigation,
}: ScreenProps<'Offseason'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading offseason..." />;
  }

  let offseasonState = gameState.offseasonState;
  if (!offseasonState) {
    offseasonState = createOffSeasonState(gameState.league.calendar.currentYear);
  }

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

    const newOffseasonState = advanceOffseasonPhase(offseasonState!);

    if (newOffseasonState.isComplete) {
      const updatedState: GameState = {
        ...gameState,
        offseasonState: undefined,
        league: {
          ...gameState.league,
          calendar: {
            ...gameState.league.calendar,
            currentPhase: 'preseason',
            currentWeek: 1,
            offseasonPhase: null,
            currentYear: gameState.league.calendar.currentYear + 1,
          },
        },
      };
      setGameState(updatedState);
      await saveGameState(updatedState);
      Alert.alert('Offseason Complete', 'Preseason begins!');
      navigation.goBack();
    } else {
      const phaseIndex = PHASE_ORDER.indexOf(newOffseasonState.currentPhase);
      const updatedState: GameState = {
        ...gameState,
        offseasonState: newOffseasonState,
        league: {
          ...gameState.league,
          calendar: {
            ...gameState.league.calendar,
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
      onCompleteTask={handleCompleteTask}
      onAdvancePhase={handleAdvanceOffseasonPhase}
      onBack={() => navigation.goBack()}
      onViewOTAReports={() => navigation.navigate('OTAs')}
      onViewTrainingCamp={() => navigation.navigate('TrainingCamp')}
      onViewPreseason={() => navigation.navigate('Preseason')}
      onViewFinalCuts={() => navigation.navigate('FinalCuts')}
    />
  );
}

// ============================================
// COACH PROFILE SCREEN
// ============================================

export function CoachProfileScreenWrapper({
  navigation,
  route,
}: ScreenProps<'CoachProfile'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();
  const { coachId } = route.params;

  if (!gameState) {
    return <LoadingFallback message="Loading coach profile..." />;
  }

  const coach = gameState.coaches[coachId];

  if (!coach) {
    navigation.goBack();
    return <LoadingFallback message="Coach not found..." />;
  }

  const isOwnTeam = coach.teamId === gameState.userTeamId;
  const team = coach.teamId ? gameState.teams[coach.teamId] : null;
  const teamName = team ? `${team.city} ${team.nickname}` : undefined;

  const handleManageCoach = (action: 'extend' | 'fire' | 'promote') => {
    const teamId = gameState.userTeamId;
    const coachName = `${coach.firstName} ${coach.lastName}`;

    switch (action) {
      case 'extend': {
        // Check if extension is possible
        const validation = canExtendCoach(gameState, coachId, teamId);
        if (!validation.canPerform) {
          Alert.alert('Cannot Extend', validation.reason || 'Extension not available');
          return;
        }

        // Get recommended terms
        const recommendation = getExtensionRecommendation(gameState, coachId);
        if (!recommendation.eligible) {
          Alert.alert('Cannot Extend', recommendation.reason || 'Extension not available');
          return;
        }

        // Show extension offer dialog
        const years = recommendation.recommendedYears || 2;
        const salary = recommendation.recommendedSalary || coach.contract!.salaryPerYear;
        const guaranteed = recommendation.recommendedGuaranteed || salary * years * 0.4;

        Alert.alert(
          'Contract Extension',
          `Offer ${coachName} a ${years}-year extension at $${formatCurrencyShort(salary)}/year?\n\nTotal Value: $${formatCurrencyShort(salary * years)}\nGuaranteed: $${formatCurrencyShort(guaranteed)}`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Offer Extension',
              onPress: () => {
                // For now, auto-accept. Future: negotiation system
                const { extendCoachAction } = require('../core/coaching/CoachManagementActions');
                const result = extendCoachAction(gameState, coachId, teamId, {
                  yearsAdded: years,
                  newSalaryPerYear: salary,
                  newGuaranteed: guaranteed,
                  signingBonus: Math.round(salary * 0.1),
                });

                if (result.success) {
                  setGameState(result.gameState);
                  saveGameState(result.gameState);
                  Alert.alert('Extension Complete', result.message);
                } else {
                  Alert.alert('Extension Failed', result.message);
                }
              },
            },
          ]
        );
        break;
      }

      case 'fire': {
        // Validate firing
        const validation = canFireCoach(gameState, coachId, teamId);
        if (!validation.canPerform) {
          Alert.alert('Cannot Release', validation.reason || 'Cannot release this coach');
          return;
        }

        // Build confirmation message
        const deadMoney = coach.contract?.deadMoneyIfFired || 0;
        let confirmMessage = `Are you sure you want to release ${coachName}?`;
        if (deadMoney > 0) {
          confirmMessage += `\n\nDead Money: $${formatCurrencyShort(deadMoney)}`;
        }
        if (validation.warning) {
          confirmMessage += `\n\nWarning: ${validation.warning}`;
        }

        Alert.alert('Release Coach', confirmMessage, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Release',
            style: 'destructive',
            onPress: () => {
              const result = fireCoachAction(gameState, coachId, teamId);

              if (result.success) {
                setGameState(result.gameState);
                saveGameState(result.gameState);
                Alert.alert('Coach Released', result.message);
                navigation.goBack();
              } else {
                Alert.alert('Release Failed', result.message);
              }
            },
          },
        ]);
        break;
      }

      case 'promote': {
        // Validate promotion
        const validation = canPromoteCoach(gameState, coachId, teamId);
        if (!validation.canPerform) {
          Alert.alert('Cannot Promote', validation.reason || 'Cannot promote this coach');
          return;
        }

        Alert.alert(
          'Promote to Head Coach',
          `Are you sure you want to promote ${coachName} to Head Coach?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Promote',
              onPress: () => {
                const result = promoteCoachAction(gameState, coachId, teamId);

                if (result.success) {
                  setGameState(result.gameState);
                  saveGameState(result.gameState);
                  Alert.alert('Promotion Complete', result.message);
                } else {
                  Alert.alert('Promotion Failed', result.message);
                }
              },
            },
          ]
        );
        break;
      }
    }
  };

  return (
    <CoachProfileScreen
      coach={coach}
      isOwnTeam={isOwnTeam}
      teamName={teamName}
      onBack={() => navigation.goBack()}
      onManageCoach={isOwnTeam ? handleManageCoach : undefined}
    />
  );
}

/**
 * Format currency for short display (e.g., "2.5M")
 */
function formatCurrencyShort(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K`;
  }
  return amount.toString();
}

// ============================================
// CAREER SUMMARY SCREEN
// ============================================

export function CareerSummaryScreenWrapper({
  navigation: _navigation,
}: ScreenProps<'CareerSummary'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading career summary..." />;
  }

  // This screen is typically shown after firing, so we may not have firingRecord here
  // For general career viewing, we'd need different data
  return (
    <View style={styles.fallbackContainer}>
      <Text style={styles.fallbackText}>Career Summary</Text>
      <Text style={styles.fallbackSubtext}>Coming soon...</Text>
    </View>
  );
}

// ============================================
// FIRED SCREEN
// ============================================

export function FiredScreenWrapper({ navigation }: ScreenProps<'Fired'>): React.JSX.Element {
  const { gameState, firingRecord, setGameState, setFiringRecord } = useGame();

  if (!firingRecord || !gameState) {
    navigation.goBack();
    return <LoadingFallback message="Loading..." />;
  }

  const teamName = `${gameState.teams[gameState.userTeamId].city} ${gameState.teams[gameState.userTeamId].nickname}`;

  return (
    <CareerSummaryScreen
      firingRecord={firingRecord}
      teamName={teamName}
      onContinue={() => {
        Alert.alert(
          'Looking for New Job',
          'Job market feature coming soon. For now, you can start a new career.',
          [
            {
              text: 'OK',
              onPress: () => {
                setGameState(null);
                setFiringRecord(null);
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Start' }],
                  })
                );
              },
            },
          ]
        );
      }}
      onMainMenu={() => {
        setGameState(null);
        setFiringRecord(null);
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Start' }],
          })
        );
      }}
    />
  );
}

// ============================================
// OTAS SCREEN
// ============================================

export function OTAsScreenWrapper({ navigation }: ScreenProps<'OTAs'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading OTAs..." />;
  }

  const userTeam = gameState.teams[gameState.userTeamId];

  // Generate OTA reports for user team players
  const rosterPlayers = userTeam.rosterPlayerIds
    .map((id) => gameState.players[id])
    .filter((p) => p !== undefined);

  const otaReports = rosterPlayers.map((player) => {
    // Determine player type
    let playerType: 'rookie' | 'veteran' | 'free_agent' = 'veteran';
    if (player.experience === 0) playerType = 'rookie';
    else if (player.experience <= 2) playerType = 'free_agent';

    // Calculate average skill
    const skillEntries = Object.entries(player.skills);
    const avgSkill =
      skillEntries.length > 0
        ? skillEntries.reduce(
            (sum, [_, skill]) => sum + (skill.perceivedMin + skill.perceivedMax) / 2,
            0
          ) / skillEntries.length
        : 50;

    // Get work ethic from hidden traits (check if 'motor' is in positive traits)
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

  // Generate rookie reports
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
      null, // Draft round - could be enhanced
      avgSkill,
      athleticScore
    );
  });

  // Generate position battle previews for key positions
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

  // Build summary
  const summary: OTASummary = {
    year: gameState.league.calendar.currentYear,
    totalParticipants: otaReports.length,
    holdouts: otaReports.filter((r) => r.attendance === 'holdout').length,
    standouts: otaReports.filter((r) => r.impression === 'standout'),
    concerns: otaReports.filter((r) => r.impression === 'concerning'),
    rookieReports,
    positionBattles,
  };

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
// TRAINING CAMP SCREEN WRAPPER
// ============================================

export function TrainingCampScreenWrapper({
  navigation,
}: ScreenProps<'TrainingCamp'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading Training Camp..." />;
  }

  const userTeam = gameState.teams[gameState.userTeamId];

  // Get roster players
  const rosterPlayers = userTeam.rosterPlayerIds
    .map((id) => gameState.players[id])
    .filter((p) => p !== undefined);

  // Generate position battles
  // Group players by position and create battles for key positions
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
    // Only create battles if there are at least 2 players at the position
    if (players.length >= 2) {
      // Sort by perceived skill (average of perceived min/max)
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

      // Create starter battle if top 2 are close
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

  // Generate development reveals for roster players
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

  // Generate camp injuries
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

  // Build summary
  const summary = getTrainingCampSummary(battles, reveals, injuries);

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
// PRESEASON SCREEN WRAPPER
// ============================================

export function PreseasonScreenWrapper({
  navigation,
}: ScreenProps<'Preseason'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading Preseason..." />;
  }

  const userTeam = gameState.teams[gameState.userTeamId];

  // Get roster players with their ratings
  const rosterPlayers = userTeam.rosterPlayerIds
    .map((id) => gameState.players[id])
    .filter((p) => p !== undefined);

  // Calculate "overall rating" based on perceived skills
  const playersWithRatings = rosterPlayers.map((player) => {
    const skills = Object.values(player.skills);
    const avgSkill =
      skills.length > 0
        ? skills.reduce((sum, s) => sum + (s.perceivedMin + s.perceivedMax) / 2, 0) / skills.length
        : 50;

    // Determine if starter (top 2 at position based on depth chart or skill)
    const positionPlayers = rosterPlayers.filter((p) => p.position === player.position);
    const sortedBySkill = positionPlayers.sort((a, b) => {
      const aAvg =
        Object.values(a.skills).reduce((s, sk) => s + (sk.perceivedMin + sk.perceivedMax) / 2, 0) /
        Math.max(Object.keys(a.skills).length, 1);
      const bAvg =
        Object.values(b.skills).reduce((s, sk) => s + (sk.perceivedMin + sk.perceivedMax) / 2, 0) /
        Math.max(Object.keys(b.skills).length, 1);
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

  // Get opponent team names (use 3 random other teams)
  const otherTeams = Object.values(gameState.teams).filter((t) => t.id !== gameState.userTeamId);
  const opponents = otherTeams.slice(0, 3).map((t) => `${t.city} ${t.nickname}`);

  // Simulate 3 preseason games
  const games = [
    simulatePreseasonGame(1, opponents[0] || 'Team A', true, playersWithRatings),
    simulatePreseasonGame(2, opponents[1] || 'Team B', false, playersWithRatings),
    simulatePreseasonGame(3, opponents[2] || 'Team C', true, playersWithRatings),
  ];

  // Create evaluations by aggregating performances across games
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

  // Build summary
  const summary = getPreseasonSummary(games, evaluations);

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
// FINAL CUTS SCREEN WRAPPER
// ============================================

export function FinalCutsScreenWrapper({
  navigation,
}: ScreenProps<'FinalCuts'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading Final Cuts..." />;
  }

  const userTeam = gameState.teams[gameState.userTeamId];

  // Get roster players and convert to cut evaluation format
  const rosterPlayers = userTeam.rosterPlayerIds
    .map((id) => gameState.players[id])
    .filter((p) => p !== undefined);

  const cutEvaluationPlayers: CutEvaluationPlayer[] = rosterPlayers.map((player) => {
    const skills = Object.values(player.skills);
    const overallRating =
      skills.length > 0
        ? Math.round(
            skills.reduce((sum, s) => sum + (s.perceivedMin + s.perceivedMax) / 2, 0) /
              skills.length
          )
        : 50;

    // Mock salary/contract data (would come from actual contract in real implementation)
    const baseSalary = overallRating * 50 + player.experience * 200;
    const guaranteed = player.experience <= 1 ? baseSalary * 0.5 : baseSalary * 0.2;
    const deadCap = player.experience <= 2 ? baseSalary * 0.3 : baseSalary * 0.1;

    // Determine PS eligibility
    const psEligible = isPracticeSquadEligible(player.experience, 0, player.experience >= 4);

    // Calculate recommendation based on rating and experience
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

    return {
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      age: player.age,
      experience: player.experience,
      overallRating,
      preseasonGrade: Math.round(overallRating + (Math.random() * 10 - 5)),
      salary: Math.round(baseSalary),
      guaranteed: Math.round(guaranteed),
      deadCapIfCut: Math.round(deadCap),
      isVested: player.experience >= 4,
      practiceSquadEligible: psEligible,
      recommendation,
      notes,
    };
  });

  // Evaluate roster for cuts
  const evaluation = evaluateRosterForCuts(cutEvaluationPlayers, 53);

  // Build summary
  const summary = getFinalCutsSummary(
    evaluation.cut,
    evaluation.practiceSquad.slice(0, 16),
    evaluation.ir,
    [], // No waiver claims in this mock
    evaluation.keep
  );

  return (
    <FinalCutsScreen
      gameState={gameState}
      summary={summary}
      rosterSize={rosterPlayers.length}
      maxRosterSize={53}
      practiceSquadSize={Math.min(evaluation.practiceSquad.length, 16)}
      maxPracticeSquadSize={16}
      onBack={() => navigation.goBack()}
      onPlayerSelect={(playerId) => navigation.navigate('PlayerProfile', { playerId })}
    />
  );
}

// ============================================
// LOADING FALLBACK
// ============================================

function LoadingFallback({ message }: { message: string }): React.JSX.Element {
  return (
    <View style={styles.fallbackContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.fallbackText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  fallbackText: {
    marginTop: spacing.md,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  fallbackSubtext: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});

/**
 * GM Sim App
 * NFL General Manager Simulation
 */

import React, { useState, useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';

// Screens
import { StartScreen } from './src/screens/StartScreen';
import { TeamSelectionScreen } from './src/screens/TeamSelectionScreen';
import { GMDashboardScreen, DashboardAction } from './src/screens/GMDashboardScreen';
import { GamecastScreen } from './src/screens/GamecastScreen';
import { DraftBoardScreen } from './src/screens/DraftBoardScreen';
import { PlayerProfileScreen } from './src/screens/PlayerProfileScreen';
import { ScheduleScreen } from './src/screens/ScheduleScreen';
import { StandingsScreen } from './src/screens/StandingsScreen';
import { RosterScreen } from './src/screens/RosterScreen';
import { StaffScreen } from './src/screens/StaffScreen';
import { FinancesScreen } from './src/screens/FinancesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { NewsScreen } from './src/screens/NewsScreen';
import { DraftRoomScreen, DraftPick as DraftRoomPick, DraftRoomProspect, TradeOffer } from './src/screens/DraftRoomScreen';
import { FreeAgencyScreen, FreeAgent, ContractOffer } from './src/screens/FreeAgencyScreen';

// Services and Models
import { createNewGame } from './src/services/NewGameService';
import { gameStorage, SaveSlot } from './src/services/storage/GameStorage';
import { GameState, updateLastSaved } from './src/core/models/game/GameState';
import { FakeCity } from './src/core/models/team/FakeCities';
import { colors } from './src/styles';

// Utilities for converting data
import { convertProspectsToDraftBoard, sortProspectsByRank } from './src/utils/prospectUtils';
import { setupGame, GameConfig } from './src/core/game/GameSetup';

// Navigation types
type Screen =
  | 'loading'
  | 'start'
  | 'teamSelection'
  | 'dashboard'
  | 'gamecast'
  | 'draftBoard'
  | 'draftRoom'
  | 'freeAgency'
  | 'playerProfile'
  | 'schedule'
  | 'standings'
  | 'roster'
  | 'staff'
  | 'finances'
  | 'news'
  | 'settings';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('loading');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Draft state
  const [draftCurrentPick, setDraftCurrentPick] = useState(1);
  const [draftedProspects, setDraftedProspects] = useState<Record<string, string>>({}); // prospectId -> teamId
  const [autoPickEnabled, setAutoPickEnabled] = useState(false);
  const [draftPaused, setDraftPaused] = useState(false);

  // Initialize app
  useEffect(() => {
    // Small delay to show loading screen
    const timer = setTimeout(() => {
      setCurrentScreen('start');
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Handle new game creation
  const handleNewGame = useCallback(() => {
    setCurrentScreen('teamSelection');
  }, []);

  // Handle team selection and game creation
  const handleTeamSelected = useCallback(async (team: FakeCity, gmName: string, saveSlot: SaveSlot) => {
    setIsLoading(true);
    try {
      // Create new game state
      const newGameState = createNewGame({
        saveSlot,
        gmName,
        selectedTeam: team,
        startYear: 2025,
      });

      // Save to storage
      await gameStorage.save(saveSlot, newGameState);

      setGameState(newGameState);
      setCurrentScreen('dashboard');
    } catch (error) {
      console.error('Error creating new game:', error);
      Alert.alert('Error', 'Failed to create new game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle continue game
  const handleContinue = useCallback(async (slot: SaveSlot) => {
    setIsLoading(true);
    try {
      const loadedState = await gameStorage.load<GameState>(slot);
      if (loadedState) {
        setGameState(loadedState);
        setCurrentScreen('dashboard');
      } else {
        Alert.alert('Error', 'Could not load save file.');
      }
    } catch (error) {
      console.error('Error loading game:', error);
      Alert.alert('Error', 'Failed to load game. The save file may be corrupted.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle settings
  const handleSettings = useCallback(() => {
    setCurrentScreen('settings');
  }, []);

  // Helper to save game state (used by various callbacks)
  const saveGameState = useCallback(async (updatedState: GameState) => {
    try {
      await gameStorage.save(updatedState.saveSlot, updatedState);
    } catch (error) {
      console.error('Error auto-saving game:', error);
    }
  }, []);

  // Handle save game
  const saveGame = useCallback(async () => {
    if (!gameState) return;

    setIsLoading(true);
    try {
      const updatedState = updateLastSaved(gameState);
      await gameStorage.save(gameState.saveSlot, updatedState);
      setGameState(updatedState);
      Alert.alert('Success', 'Game saved successfully!');
    } catch (error) {
      console.error('Error saving game:', error);
      Alert.alert('Error', 'Failed to save game.');
    } finally {
      setIsLoading(false);
    }
  }, [gameState]);

  // Handle advance week
  const handleAdvanceWeek = useCallback(() => {
    if (!gameState) return;

    // Simulate advancing the week
    const { calendar } = gameState.league;
    let newWeek = calendar.currentWeek + 1;
    let newPhase = calendar.currentPhase;
    let newYear = calendar.currentYear;
    let offseasonPhase = calendar.offseasonPhase;

    // Handle phase transitions
    if (newPhase === 'regularSeason' && newWeek > 18) {
      newWeek = 19;
      newPhase = 'playoffs';
    } else if (newPhase === 'playoffs' && newWeek > 22) {
      newWeek = 1;
      newPhase = 'offseason';
      offseasonPhase = 1;
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
      },
    };

    setGameState(updatedState);
    Alert.alert('Week Advanced', `Now in ${newPhase === 'offseason' ? 'Offseason Phase ' + offseasonPhase : 'Week ' + newWeek}`);
  }, [gameState]);

  // Handle dashboard actions
  const handleDashboardAction = useCallback((action: DashboardAction) => {
    switch (action) {
      case 'gamecast':
        setCurrentScreen('gamecast');
        break;
      case 'draft':
        // Navigate to draft room during draft phase, otherwise show draft board
        if (gameState?.league.calendar.currentPhase === 'offseason' &&
            gameState?.league.calendar.offseasonPhase === 7) {
          setCurrentScreen('draftRoom');
        } else {
          setCurrentScreen('draftBoard');
        }
        break;
      case 'roster':
        setCurrentScreen('roster');
        break;
      case 'schedule':
        setCurrentScreen('schedule');
        break;
      case 'standings':
        setCurrentScreen('standings');
        break;
      case 'freeAgency':
        setCurrentScreen('freeAgency');
        break;
      case 'staff':
        setCurrentScreen('staff');
        break;
      case 'finances':
        setCurrentScreen('finances');
        break;
      case 'news':
        setCurrentScreen('news');
        break;
      case 'advanceWeek':
        handleAdvanceWeek();
        break;
      case 'saveGame':
        saveGame();
        break;
      case 'settings':
        setCurrentScreen('settings');
        break;
      case 'mainMenu':
        // Confirm before going to main menu
        Alert.alert(
          'Return to Main Menu',
          'Any unsaved progress will be lost. Are you sure?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Yes',
              onPress: () => {
                setGameState(null);
                setCurrentScreen('start');
              },
            },
          ]
        );
        break;
      default:
        break;
    }
  }, [saveGame, handleAdvanceWeek]);

  // Navigation helpers
  const goToDashboard = useCallback(() => {
    setCurrentScreen('dashboard');
    setSelectedProspectId(null);
  }, []);

  const goToStart = useCallback(() => {
    setCurrentScreen('start');
  }, []);

  // Loading screen
  if (currentScreen === 'loading' || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={styles.loadingText}>
          {currentScreen === 'loading' ? 'Loading GM Sim...' : 'Please wait...'}
        </Text>
      </View>
    );
  }

  // Start Screen
  if (currentScreen === 'start') {
    return (
      <>
        <StatusBar style="light" />
        <StartScreen
          onNewGame={handleNewGame}
          onContinue={handleContinue}
          onSettings={handleSettings}
        />
      </>
    );
  }

  // Team Selection Screen
  if (currentScreen === 'teamSelection') {
    return (
      <>
        <StatusBar style="light" />
        <TeamSelectionScreen
          onSelectTeam={handleTeamSelected}
          onBack={goToStart}
        />
      </>
    );
  }

  // Settings Screen
  if (currentScreen === 'settings') {
    const currentSettings = gameState?.gameSettings || {
      simulationSpeed: 'normal' as const,
      autoSaveEnabled: true,
      notificationsEnabled: true,
    };

    return (
      <>
        <StatusBar style="light" />
        <SettingsScreen
          settings={currentSettings}
          onUpdateSettings={async (updates) => {
            if (gameState) {
              const updatedState: GameState = {
                ...gameState,
                gameSettings: { ...currentSettings, ...updates },
              };
              setGameState(updatedState);
              // Persist settings to storage
              await saveGameState(updatedState);
            }
          }}
          onBack={gameState ? goToDashboard : goToStart}
          onClearData={async () => {
            // Delete each slot individually
            await Promise.all([
              gameStorage.delete(0),
              gameStorage.delete(1),
              gameStorage.delete(2),
            ]);
            setGameState(null);
            setCurrentScreen('start');
          }}
          version="1.0.0"
        />
      </>
    );
  }

  // Game screens require gameState
  if (!gameState) {
    return (
      <>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No game loaded</Text>
          <Text style={styles.backLink} onPress={goToStart}>
            Return to Start
          </Text>
        </View>
      </>
    );
  }

  // GM Dashboard
  if (currentScreen === 'dashboard') {
    return (
      <>
        <StatusBar style="light" />
        <GMDashboardScreen
          gameState={gameState}
          onAction={handleDashboardAction}
        />
      </>
    );
  }

  // Schedule Screen
  if (currentScreen === 'schedule') {
    const schedule = gameState.league.schedule;
    const scheduleGames = schedule ? schedule.regularSeason : [];

    return (
      <>
        <StatusBar style="light" />
        <ScheduleScreen
          userTeamId={gameState.userTeamId}
          teams={gameState.teams}
          schedule={scheduleGames}
          currentWeek={gameState.league.calendar.currentWeek}
          onBack={goToDashboard}
          onSelectGame={(game) => {
            if (game.week === gameState.league.calendar.currentWeek) {
              setCurrentScreen('gamecast');
            }
          }}
        />
      </>
    );
  }

  // Standings Screen
  if (currentScreen === 'standings') {
    return (
      <>
        <StatusBar style="light" />
        <StandingsScreen
          teams={gameState.teams}
          userTeamId={gameState.userTeamId}
          onBack={goToDashboard}
        />
      </>
    );
  }

  // Roster Screen
  if (currentScreen === 'roster') {
    const userTeam = gameState.teams[gameState.userTeamId];
    // Calculate cap space (simplified)
    const capSpace = userTeam.finances?.capSpace || 50000000;

    return (
      <>
        <StatusBar style="light" />
        <RosterScreen
          rosterIds={userTeam.rosterPlayerIds}
          players={gameState.players}
          capSpace={capSpace}
          onBack={goToDashboard}
          onSelectPlayer={(playerId) => {
            // Could navigate to player detail
            const player = gameState.players[playerId];
            if (player) {
              Alert.alert(
                `${player.firstName} ${player.lastName}`,
                `Position: ${player.position}\nAge: ${player.age}`
              );
            }
          }}
        />
      </>
    );
  }

  // Staff Screen
  if (currentScreen === 'staff') {
    // Get coaches for user's team
    const teamCoaches = Object.values(gameState.coaches).filter(
      (coach) => coach.teamId === gameState.userTeamId
    );

    // Get scouts for user's team
    const teamScouts = Object.values(gameState.scouts).filter(
      (scout) => scout.teamId === gameState.userTeamId
    );

    return (
      <>
        <StatusBar style="light" />
        <StaffScreen
          coaches={teamCoaches}
          scouts={teamScouts}
          onBack={goToDashboard}
          onSelectStaff={(staffId, type) => {
            if (type === 'coach') {
              const coach = gameState.coaches[staffId];
              if (coach) {
                Alert.alert(
                  `${coach.firstName} ${coach.lastName}`,
                  `Role: ${coach.role}\nReputation: ${coach.attributes.reputation}`
                );
              }
            }
          }}
        />
      </>
    );
  }

  // Finances Screen
  if (currentScreen === 'finances') {
    const userTeam = gameState.teams[gameState.userTeamId];
    const salaryCap = 255000000; // $255M NFL cap

    return (
      <>
        <StatusBar style="light" />
        <FinancesScreen
          team={userTeam}
          players={gameState.players}
          salaryCap={salaryCap}
          onBack={goToDashboard}
          onSelectPlayer={(playerId) => {
            const player = gameState.players[playerId];
            if (player) {
              Alert.alert(
                `${player.firstName} ${player.lastName}`,
                `Position: ${player.position}`
              );
            }
          }}
        />
      </>
    );
  }

  // Free Agency Screen
  if (currentScreen === 'freeAgency') {
    const userTeam = gameState.teams[gameState.userTeamId];
    const capSpace = userTeam.finances?.capSpace || 50000000;

    // Get players without a team (free agents)
    // In a real implementation, we'd have a separate free agent pool
    // For now, create some simulated free agents from existing player data
    const freeAgents: FreeAgent[] = Object.values(gameState.players)
      .filter(p => {
        // Find players not on any team's roster
        const isOnRoster = Object.values(gameState.teams).some(
          t => t.rosterPlayerIds.includes(p.id) ||
               t.practiceSquadIds.includes(p.id) ||
               t.injuredReserveIds.includes(p.id)
        );
        return !isOnRoster;
      })
      .slice(0, 50) // Limit to 50 for performance
      .map(p => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        position: p.position,
        age: p.age,
        experience: p.experience || 0,
        estimatedValue: 2000000 + (Math.random() * 15000000), // $2M - $17M
        skills: Object.fromEntries(
          Object.entries(p.skills).map(([key, skill]) => [
            key,
            { perceivedMin: skill.perceivedMin, perceivedMax: skill.perceivedMax }
          ])
        ),
      }));

    return (
      <>
        <StatusBar style="light" />
        <FreeAgencyScreen
          freeAgents={freeAgents}
          capSpace={capSpace}
          teamName={`${userTeam.city} ${userTeam.nickname}`}
          onMakeOffer={async (playerId, offer) => {
            // Simple offer evaluation: accept if offer >= 90% of estimated value
            const agent = freeAgents.find(a => a.id === playerId);
            if (!agent) return 'rejected';

            const offerRatio = offer.annualSalary / agent.estimatedValue;
            if (offerRatio >= 0.9) {
              // Accept - add player to roster
              const player = gameState.players[playerId];
              if (player) {
                const updatedTeam = {
                  ...userTeam,
                  rosterPlayerIds: [...userTeam.rosterPlayerIds, playerId],
                  finances: userTeam.finances ? {
                    ...userTeam.finances,
                    capSpace: userTeam.finances.capSpace - offer.annualSalary,
                    currentCapUsage: userTeam.finances.currentCapUsage + offer.annualSalary,
                  } : userTeam.finances,
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
          onBack={goToDashboard}
        />
      </>
    );
  }

  // News Screen
  if (currentScreen === 'news') {
    const currentWeek = gameState.league.calendar.currentWeek;
    const currentYear = gameState.league.calendar.currentYear;
    const readStatus = gameState.newsReadStatus || {};

    // Generate some placeholder news items based on game state
    const newsItems = [
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

    return (
      <>
        <StatusBar style="light" />
        <NewsScreen
          news={newsItems}
          currentWeek={currentWeek}
          currentYear={currentYear}
          onBack={goToDashboard}
          onMarkRead={async (newsId) => {
            // Persist read state in game state
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
      </>
    );
  }

  // Gamecast Screen
  if (currentScreen === 'gamecast') {
    const userTeam = gameState.teams[gameState.userTeamId];

    // Find an opponent (pick a team from a different division)
    const opponentTeamIds = Object.keys(gameState.teams).filter(
      (id) => id !== gameState.userTeamId
    );
    const opponentId = opponentTeamIds[gameState.league.calendar.currentWeek % opponentTeamIds.length];

    // Create game config
    const gameConfig: GameConfig = {
      homeTeamId: gameState.userTeamId,
      awayTeamId: opponentId,
      week: gameState.league.calendar.currentWeek,
      isPlayoff: gameState.league.calendar.currentPhase === 'playoffs',
    };

    // Convert Records to Maps for setupGame
    const teamsMap = new Map(Object.entries(gameState.teams));
    const playersMap = new Map(Object.entries(gameState.players));
    const coachesMap = new Map(Object.entries(gameState.coaches));

    // Create real game setup
    let realGameSetup;
    try {
      realGameSetup = setupGame(gameConfig, teamsMap, playersMap, coachesMap);
    } catch (error) {
      console.error('Error setting up game:', error);
      Alert.alert('Error', 'Failed to set up game. Please try again.');
      goToDashboard();
      return null;
    }

    return (
      <>
        <StatusBar style="light" />
        <GamecastScreen
          gameSetup={realGameSetup}
          gameInfo={{
            week: gameState.league.calendar.currentWeek,
            date: new Date().toISOString().split('T')[0],
          }}
          onBack={goToDashboard}
          onGameEnd={async (result) => {
            // Update team record based on game result
            const won = result.homeScore > result.awayScore;
            const lost = result.homeScore < result.awayScore;
            const currentStreak = userTeam.currentRecord.streak;
            // Update streak: positive = wins, negative = losses
            const newStreak = won
              ? (currentStreak > 0 ? currentStreak + 1 : 1)
              : lost
                ? (currentStreak < 0 ? currentStreak - 1 : -1)
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
            // Persist game results to storage
            await saveGameState(updatedState);

            goToDashboard();
          }}
        />
      </>
    );
  }

  // Draft Board Screen
  if (currentScreen === 'draftBoard') {
    // Convert real prospects to DraftBoardProspect format
    const draftBoardProspects = sortProspectsByRank(
      convertProspectsToDraftBoard(gameState.prospects)
    );

    return (
      <>
        <StatusBar style="light" />
        <DraftBoardScreen
          prospects={draftBoardProspects}
          draftYear={gameState.league.calendar.currentYear}
          onSelectProspect={(id) => {
            setSelectedProspectId(id);
            setCurrentScreen('playerProfile');
          }}
          onToggleFlag={async (id) => {
            // Toggle flag in game state
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
              // Persist flag change to storage
              await saveGameState(updatedState);
            }
          }}
          onBack={goToDashboard}
        />
      </>
    );
  }

  // Draft Room Screen
  if (currentScreen === 'draftRoom') {
    const teamIds = Object.keys(gameState.teams);
    const totalPicks = teamIds.length * 7; // 7 rounds

    // Build draft order (simplified - in real implementation would use trade logic)
    const draftOrder = Array.from({ length: totalPicks }, (_, i) => {
      const round = Math.floor(i / teamIds.length) + 1;
      const pickInRound = i % teamIds.length;
      // Serpentine order: odd rounds normal, even rounds reversed
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
      .map(pick => ({
        ...pick,
        selectedProspectId: Object.entries(draftedProspects).find(([_, teamId]) =>
          draftOrder.find(p => p.pickNumber === pick.pickNumber && p.teamId === teamId)
        )?.[0],
      }));
    const upcomingPicks = draftOrder.slice(draftCurrentPick, draftCurrentPick + 5);

    // Convert prospects to DraftRoomProspect format
    const availableProspects: DraftRoomProspect[] = Object.values(gameState.prospects)
      .filter(p => !draftedProspects[p.id])
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
      <>
        <StatusBar style="light" />
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
            // Draft the prospect for current team
            const newDraftedProspects = {
              ...draftedProspects,
              [prospectId]: currentPickInfo.teamId,
            };
            setDraftedProspects(newDraftedProspects);

            // Advance to next pick
            if (draftCurrentPick < totalPicks) {
              setDraftCurrentPick(draftCurrentPick + 1);
            } else {
              // Draft complete
              Alert.alert('Draft Complete', 'The draft has concluded!');
              goToDashboard();
            }
          }}
          onViewProspect={(prospectId) => {
            setSelectedProspectId(prospectId);
            setCurrentScreen('playerProfile');
          }}
          onAcceptTrade={(tradeId) => {
            Alert.alert('Trade Accepted', `Trade ${tradeId} accepted`);
          }}
          onRejectTrade={(tradeId) => {
            Alert.alert('Trade Rejected', `Trade ${tradeId} rejected`);
          }}
          onCounterTrade={(tradeId) => {
            Alert.alert('Counter Trade', `Counter offer for trade ${tradeId}`);
          }}
          onProposeTrade={() => {
            Alert.alert('Propose Trade', 'Trade proposal feature coming soon');
          }}
          onToggleAutoPick={() => {
            setAutoPickEnabled(!autoPickEnabled);
          }}
          onTogglePause={() => {
            setDraftPaused(!draftPaused);
          }}
          onBack={goToDashboard}
        />
      </>
    );
  }

  // Player Profile Screen
  if (currentScreen === 'playerProfile') {
    // If coming from draft board, find that prospect from real data
    const realProspect = selectedProspectId
      ? gameState.prospects[selectedProspectId]
      : null;

    // Build profile data from real prospect
    const profileData = realProspect
      ? {
          playerId: realProspect.id,
          firstName: realProspect.player.firstName,
          lastName: realProspect.player.lastName,
          position: realProspect.player.position,
          age: realProspect.player.age,
          experience: 0,
          skills: realProspect.player.skills as Record<string, { trueValue: number; perceivedMin: number; perceivedMax: number; maturityAge: number }>,
          physical: realProspect.player.physical,
          physicalsRevealed: realProspect.physicalsRevealed,
          hiddenTraits: realProspect.player.hiddenTraits,
          collegeName: realProspect.collegeName,
          draftYear: realProspect.draftYear,
          projectedRound: realProspect.consensusProjection?.projectedRound ?? null,
          projectedPickRange: realProspect.consensusProjection?.projectedPickRange ?? null,
          userTier: realProspect.userTier,
          flagged: realProspect.flagged,
        }
      : null;

    // If no prospect found, go back to dashboard
    if (!profileData) {
      goToDashboard();
      return null;
    }

    return (
      <>
        <StatusBar style="light" />
        <PlayerProfileScreen
          {...profileData}
          onBack={() => {
            if (selectedProspectId) {
              setSelectedProspectId(null);
              setCurrentScreen('draftBoard');
            } else {
              goToDashboard();
            }
          }}
          onToggleFlag={async () => {
            // Toggle flag in game state
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
              // Persist flag change to storage
              await saveGameState(updatedState);
            }
          }}
        />
      </>
    );
  }

  // Fallback
  return (
    <>
      <StatusBar style="light" />
      <GMDashboardScreen
        gameState={gameState}
        onAction={handleDashboardAction}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textOnPrimary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: colors.error,
    marginBottom: 16,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  placeholderTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  backLink: {
    fontSize: 16,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});

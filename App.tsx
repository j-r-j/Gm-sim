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

// Services and Models
import { createNewGame } from './src/services/NewGameService';
import { gameStorage, SaveSlot } from './src/services/storage/GameStorage';
import { GameState, updateLastSaved } from './src/core/models/game/GameState';
import { FakeCity } from './src/core/models/team/FakeCities';
import { colors } from './src/styles';

// Mock data for screens that need it
import { mockProspects, mockPlayerProfile, mockGameSetup } from './src/utils/mockData';

// Navigation types
type Screen =
  | 'loading'
  | 'start'
  | 'teamSelection'
  | 'dashboard'
  | 'gamecast'
  | 'draftBoard'
  | 'playerProfile'
  | 'settings';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('loading');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
        setCurrentScreen('draftBoard');
        break;
      case 'roster':
        // For now, show player profile as placeholder
        setCurrentScreen('playerProfile');
        break;
      case 'schedule':
      case 'standings':
      case 'freeAgency':
      case 'staff':
      case 'finances':
      case 'news':
        // Placeholder - these will navigate to their respective screens
        Alert.alert('Coming Soon', `${action} screen is coming in a future update.`);
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

  // Settings Screen (placeholder)
  if (currentScreen === 'settings') {
    return (
      <>
        <StatusBar style="light" />
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderTitle}>Settings</Text>
          <Text style={styles.placeholderText}>Settings screen coming soon!</Text>
          <Text
            style={styles.backLink}
            onPress={gameState ? goToDashboard : goToStart}
          >
            Go Back
          </Text>
        </View>
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

  // Gamecast Screen
  if (currentScreen === 'gamecast') {
    const userTeam = gameState.teams[gameState.userTeamId];

    return (
      <>
        <StatusBar style="light" />
        <GamecastScreen
          gameSetup={mockGameSetup}
          gameInfo={{
            week: gameState.league.calendar.currentWeek,
            date: new Date().toISOString().split('T')[0],
          }}
          onBack={goToDashboard}
          onGameEnd={(result) => {
            // Update team record based on game result
            const won = result.homeScore > result.awayScore;
            const updatedTeam = {
              ...userTeam,
              currentRecord: {
                ...userTeam.currentRecord,
                wins: userTeam.currentRecord.wins + (won ? 1 : 0),
                losses: userTeam.currentRecord.losses + (won ? 0 : 1),
                pointsFor: userTeam.currentRecord.pointsFor + result.homeScore,
                pointsAgainst: userTeam.currentRecord.pointsAgainst + result.awayScore,
              },
            };

            setGameState({
              ...gameState,
              teams: {
                ...gameState.teams,
                [userTeam.id]: updatedTeam,
              },
            });

            goToDashboard();
          }}
        />
      </>
    );
  }

  // Draft Board Screen
  if (currentScreen === 'draftBoard') {
    return (
      <>
        <StatusBar style="light" />
        <DraftBoardScreen
          prospects={mockProspects}
          draftYear={gameState.league.calendar.currentYear}
          onSelectProspect={(id) => {
            setSelectedProspectId(id);
            setCurrentScreen('playerProfile');
          }}
          onToggleFlag={(id) => {
            console.log('Toggle flag for:', id);
          }}
          onBack={goToDashboard}
        />
      </>
    );
  }

  // Player Profile Screen
  if (currentScreen === 'playerProfile') {
    // If coming from draft board, find that prospect
    const prospect = selectedProspectId
      ? mockProspects.find((p) => p.id === selectedProspectId)
      : null;

    const profileData = prospect
      ? {
          playerId: prospect.id,
          firstName: prospect.name.split(' ')[0],
          lastName: prospect.name.split(' ').slice(1).join(' '),
          position: prospect.position,
          age: prospect.age,
          experience: 0,
          skills: prospect.skills,
          physical: prospect.physical!,
          physicalsRevealed: true,
          hiddenTraits: { positive: [], negative: [], revealedToUser: [] },
          collegeName: prospect.collegeName,
          draftYear: gameState.league.calendar.currentYear,
          projectedRound: prospect.projectedRound,
          projectedPickRange: prospect.projectedPickRange,
          userTier: prospect.userTier,
          flagged: prospect.flagged,
        }
      : mockPlayerProfile;

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
          onToggleFlag={() => {
            console.log('Toggle flag');
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

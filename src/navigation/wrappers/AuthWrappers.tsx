/**
 * Auth/Startup Screen Wrappers
 * Bridge components for pre-game and settings screens
 *
 * These wrappers handle:
 * - Start screen (load/new game)
 * - Team selection
 * - Staff decision (keep/clean house)
 * - Staff hiring (pick new coaches)
 * - Settings
 */

import React, { useCallback, useState } from 'react';
import { Text, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { showAlert, showConfirm } from '@utils/alert';
import { useGame } from '../GameContext';
import { ScreenProps } from '../types';
import { colors, spacing, fontSize } from '../../styles';

// Screen imports
import { StartScreen } from '../../screens/StartScreen';
import { TeamSelectionScreen } from '../../screens/TeamSelectionScreen';
import { StaffDecisionScreen } from '../../screens/StaffDecisionScreen';
import { StaffHiringScreen } from '../../screens/StaffHiringScreen';
import { SettingsScreen } from '../../screens/SettingsScreen';

// Core imports
import { GameState } from '../../core/models/game/GameState';
import { createNewGame } from '../../services/NewGameService';
import { gameStorage, SaveSlot } from '../../services/storage/GameStorage';
import { FakeCity, FAKE_CITIES } from '../../core/models/team/FakeCities';
import {
  HiringCandidate,
  createCandidateContract,
} from '../../core/coaching/NewGameCandidateGenerator';
import { Coach } from '../../core/models/staff/Coach';
import { Team } from '../../core/models/team/Team';

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
          showAlert('Error', 'Could not load save file.');
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading game:', error);
        showAlert('Error', 'Failed to load game. The save file may be corrupted.');
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
  const { setPendingNewGame } = useGame();
  const [isCreating, setIsCreating] = useState(false);
  const [progressText, setProgressText] = useState('');

  const handleTeamSelected = useCallback(
    (team: FakeCity, gmName: string, saveSlot: SaveSlot) => {
      setIsCreating(true);
      setProgressText('Creating your franchise...');

      // Use setTimeout to let the loading indicator render before synchronous work
      setTimeout(() => {
        try {
          // Generate the game state ONCE and store in context
          const newGameState = createNewGame({
            saveSlot,
            gmName,
            selectedTeam: team,
            startYear: 2025,
            onHistoryProgress: (year, totalYears, phase) => {
              if (phase === 'setup') {
                setProgressText('Creating your franchise...');
              } else if (phase === 'final') {
                setProgressText('Preparing your first season...');
              } else {
                setProgressText(`Simulating year ${year} of ${totalYears}...`);
              }
            },
          });

          setProgressText('Preparing your first season...');

          // Store in context so it persists across navigation
          setPendingNewGame(newGameState);

          // Navigate to staff decision screen
          navigation.navigate('StaffDecision', {
            teamCity: team.abbreviation,
            gmName,
            saveSlot,
          });
        } finally {
          setIsCreating(false);
          setProgressText('');
        }
      }, 50);
    },
    [navigation, setPendingNewGame]
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (isCreating) {
    return (
      <SafeAreaView style={styles.fallbackContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.fallbackText}>{progressText || 'Creating your franchise...'}</Text>
      </SafeAreaView>
    );
  }

  return <TeamSelectionScreen onSelectTeam={handleTeamSelected} onBack={handleBack} />;
}

// ============================================
// STAFF DECISION SCREEN
// ============================================

export function StaffDecisionScreenWrapper({
  navigation,
  route,
}: ScreenProps<'StaffDecision'>): React.JSX.Element {
  const { pendingNewGame, setGameState, setIsLoading, clearPendingNewGame } = useGame();
  const { teamCity: teamAbbrev, saveSlot } = route.params;

  // Find the team by abbreviation
  const teamCity = FAKE_CITIES.find((c) => c.abbreviation === teamAbbrev);

  // Use pending game state from context (generated in TeamSelection)
  if (!teamCity || !pendingNewGame) {
    return (
      <SafeAreaView style={styles.fallbackContainer}>
        <Text>{!pendingNewGame ? 'Game state not found. Please go back.' : 'Team not found'}</Text>
      </SafeAreaView>
    );
  }

  const userTeam = pendingNewGame.teams[pendingNewGame.userTeamId];

  // Get coaches from gameState using the staffHierarchy IDs
  const getCoachesFromHierarchy = (): Coach[] => {
    if (!userTeam) return [];
    const coachIds = [
      userTeam.staffHierarchy.headCoach,
      userTeam.staffHierarchy.offensiveCoordinator,
      userTeam.staffHierarchy.defensiveCoordinator,
    ].filter((id): id is string => id !== null);

    return coachIds
      .map((id) => pendingNewGame.coaches[id])
      .filter((c): c is Coach => c !== undefined);
  };

  const coaches = getCoachesFromHierarchy();
  const staffBudget = userTeam?.staffHierarchy.staffBudget || 30000000;

  const handleKeepStaff = useCallback(async () => {
    setIsLoading(true);
    try {
      // Save game (non-blocking: proceed to Dashboard even if save fails on web)
      try {
        await gameStorage.save(saveSlot as SaveSlot, pendingNewGame);
      } catch {
        // Storage may fail on web due to localStorage quota limits.
        // Continue anyway — the game state is held in memory.
        // eslint-disable-next-line no-console
        console.warn('Game save failed (likely localStorage quota on web). Continuing...');
      }
      setGameState(pendingNewGame);
      clearPendingNewGame();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        })
      );
    } catch {
      showAlert('Error', 'Failed to start game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [navigation, setGameState, setIsLoading, pendingNewGame, saveSlot, clearPendingNewGame]);

  const handleCleanHouse = useCallback(() => {
    // Show confirmation dialog before proceeding
    showConfirm(
      'Clean House?',
      'This will release all current coaching staff. They will be available to rehire from the candidate pool. Continue?',
      () => {
        navigation.navigate('StaffHiring', {
          teamCity: teamAbbrev,
          gmName: route.params.gmName,
          saveSlot,
          formerStaffIds: coaches.map((c: Coach) => c.id),
        });
      }
    );
  }, [navigation, teamAbbrev, route.params.gmName, saveSlot, coaches]);

  const handleBack = useCallback(() => {
    // Clear pending game when going back to team selection
    clearPendingNewGame();
    navigation.goBack();
  }, [navigation, clearPendingNewGame]);

  return (
    <StaffDecisionScreen
      team={userTeam!}
      teamCity={teamCity}
      coaches={coaches}
      staffBudget={staffBudget}
      currentYear={2025}
      onKeepStaff={handleKeepStaff}
      onCleanHouse={handleCleanHouse}
      onBack={handleBack}
    />
  );
}

// ============================================
// STAFF HIRING SCREEN
// ============================================

export function StaffHiringScreenWrapper({
  navigation,
  route,
}: ScreenProps<'StaffHiring'>): React.JSX.Element {
  const { pendingNewGame, setGameState, setIsLoading, clearPendingNewGame } = useGame();
  const { teamCity: teamAbbrev, saveSlot, formerStaffIds = [] } = route.params;

  // Find the team by abbreviation
  const teamCity = FAKE_CITIES.find((c) => c.abbreviation === teamAbbrev);

  // Use pending game state from context
  if (!teamCity || !pendingNewGame) {
    return (
      <SafeAreaView style={styles.fallbackContainer}>
        <Text>{!pendingNewGame ? 'Game state not found. Please go back.' : 'Team not found'}</Text>
      </SafeAreaView>
    );
  }

  const userTeam = pendingNewGame.teams[pendingNewGame.userTeamId];

  // Get former staff from the pending game state coaches record
  const formerStaff: Coach[] = formerStaffIds
    .map((id: string) => pendingNewGame.coaches[id])
    .filter((c): c is Coach => c !== undefined);

  const staffBudget = userTeam?.staffHierarchy.staffBudget || 30000000;

  const handleComplete = useCallback(
    async (hiredStaff: { hc: HiringCandidate; oc: HiringCandidate; dc: HiringCandidate }) => {
      setIsLoading(true);
      try {
        // Create coaches with contracts
        const headCoach = createCandidateContract(hiredStaff.hc, userTeam!.id, 2025);
        const offensiveCoordinator = createCandidateContract(hiredStaff.oc, userTeam!.id, 2025);
        const defensiveCoordinator = createCandidateContract(hiredStaff.dc, userTeam!.id, 2025);

        // Update the team's staffHierarchy with new coach IDs
        const updatedUserTeam: Team = {
          ...userTeam!,
          staffHierarchy: {
            ...userTeam!.staffHierarchy,
            headCoach: headCoach.id,
            offensiveCoordinator: offensiveCoordinator.id,
            defensiveCoordinator: defensiveCoordinator.id,
            coachingSpend:
              (headCoach.contract?.salaryPerYear || 0) +
              (offensiveCoordinator.contract?.salaryPerYear || 0) +
              (defensiveCoordinator.contract?.salaryPerYear || 0),
            remainingBudget:
              userTeam!.staffHierarchy.staffBudget -
              (headCoach.contract?.salaryPerYear || 0) -
              (offensiveCoordinator.contract?.salaryPerYear || 0) -
              (defensiveCoordinator.contract?.salaryPerYear || 0) -
              userTeam!.staffHierarchy.scoutingSpend,
          },
        };

        // Remove former staff (if clean house was used) and add new coaches
        const updatedCoaches: Record<string, Coach> = {
          ...Object.fromEntries(
            Object.entries(pendingNewGame.coaches).filter(([id]) => !formerStaffIds.includes(id))
          ),
          [headCoach.id]: headCoach,
          [offensiveCoordinator.id]: offensiveCoordinator,
          [defensiveCoordinator.id]: defensiveCoordinator,
        };

        // If clean house was used (formerStaffIds is not empty), also remove scouts
        // associated with the user's team
        let updatedScouts = pendingNewGame.scouts;
        let finalUserTeam = updatedUserTeam;

        if (formerStaffIds.length > 0 && pendingNewGame.scouts) {
          // Remove scouts that belong to the user's team
          updatedScouts = Object.fromEntries(
            Object.entries(pendingNewGame.scouts).filter(
              ([, scout]) => scout.teamId !== pendingNewGame.userTeamId
            )
          );

          // Clear scout references in the staffHierarchy
          finalUserTeam = {
            ...updatedUserTeam,
            staffHierarchy: {
              ...updatedUserTeam.staffHierarchy,
              headScout: null,
              offensiveScout: null,
              defensiveScout: null,
              scoutingSpend: 0,
              remainingBudget:
                updatedUserTeam.staffHierarchy.staffBudget -
                (headCoach.contract?.salaryPerYear || 0) -
                (offensiveCoordinator.contract?.salaryPerYear || 0) -
                (defensiveCoordinator.contract?.salaryPerYear || 0),
            },
          };
        }

        const finalGameState: GameState = {
          ...pendingNewGame,
          teams: {
            ...pendingNewGame.teams,
            [pendingNewGame.userTeamId]: finalUserTeam,
          },
          coaches: updatedCoaches,
          scouts: updatedScouts,
        };

        // Save game (non-blocking: proceed even if save fails on web)
        try {
          await gameStorage.save(saveSlot as SaveSlot, finalGameState);
        } catch {
          // eslint-disable-next-line no-console
          console.warn('Game save failed (likely localStorage quota on web). Continuing...');
        }
        setGameState(finalGameState);
        clearPendingNewGame();
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Dashboard' }],
          })
        );
      } catch {
        showAlert('Error', 'Failed to start game. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [
      navigation,
      setGameState,
      setIsLoading,
      pendingNewGame,
      userTeam,
      saveSlot,
      clearPendingNewGame,
      formerStaffIds,
    ]
  );

  const handleBack = useCallback(() => {
    // Go back to staff decision (don't clear pending game - user may want to keep staff instead)
    navigation.goBack();
  }, [navigation]);

  return (
    <StaffHiringScreen
      teamCity={teamCity}
      staffBudget={staffBudget}
      currentYear={2025}
      formerStaff={formerStaff}
      onComplete={handleComplete}
      onBack={handleBack}
    />
  );
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
// STYLES
// ============================================

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
});

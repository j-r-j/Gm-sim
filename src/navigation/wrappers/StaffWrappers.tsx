/**
 * Staff Screen Wrappers
 * Bridge components for staff management screens
 *
 * These wrappers handle:
 * - Staff overview (coaches/scouts, vacancies, hiring)
 * - Finances (team finances, cap, contracts)
 * - Coach profile (extend/fire/promote actions)
 * - Coach hiring (candidates, budget, hire flow)
 * - Coaching tree visualization
 */

import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { useGame } from '../GameContext';
import { ScreenProps } from '../types';
import { LoadingFallback, tryCompleteViewTask } from './shared';

// Screen imports
import { StaffScreen } from '../../screens/StaffScreen';
import { FinancesScreen } from '../../screens/FinancesScreen';
import { CoachProfileScreen } from '../../screens/CoachProfileScreen';
import { CoachHiringScreen } from '../../screens/CoachHiringScreen';
import { CoachingTreeScreen } from '../../screens/CoachingTreeScreen';

// Core imports
import { GameState } from '../../core/models/game/GameState';
import { Coach } from '../../core/models/staff/Coach';
import { CoachRole } from '../../core/models/staff/StaffSalary';
import { getCoachHierarchyKey } from '../../core/models/staff/StaffHierarchy';
import { extendCoachAction } from '../../core/coaching/CoachManagementActions';
import {
  canFireCoach,
  canPromoteCoach,
  canExtendCoach,
  fireCoachAction,
  promoteCoachAction,
  getExtensionRecommendation,
} from '../../core/coaching/CoachManagementActions';
import {
  HiringCandidate,
  createCandidateContract,
  generateHiringCandidates,
} from '../../core/coaching/NewGameCandidateGenerator';

// ============================================
// STAFF SCREEN
// ============================================

export function StaffScreenWrapper({ navigation }: ScreenProps<'Staff'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  // Auto-complete offseason view task when screen is visited
  useEffect(() => {
    if (gameState) {
      const updatedState = tryCompleteViewTask(gameState, 'Staff');
      if (updatedState) {
        setGameState(updatedState);
        saveGameState(updatedState);
      }
    }
  }, []); // Only run on mount

  if (!gameState) {
    return <LoadingFallback message="Loading staff..." />;
  }

  const team = gameState.teams[gameState.userTeamId];
  const hierarchy = team.staffHierarchy;

  const teamCoaches = Object.values(gameState.coaches).filter(
    (coach) => coach.teamId === gameState.userTeamId
  );

  const teamScouts = Object.values(gameState.scouts).filter(
    (scout) => scout.teamId === gameState.userTeamId
  );

  // Calculate vacancies from staff hierarchy
  const roleDisplayNames: Record<CoachRole, string> = {
    headCoach: 'Head Coach',
    offensiveCoordinator: 'Offensive Coordinator',
    defensiveCoordinator: 'Defensive Coordinator',
  };

  const rolePriorities: Record<CoachRole, 'critical' | 'important' | 'normal'> = {
    headCoach: 'critical',
    offensiveCoordinator: 'important',
    defensiveCoordinator: 'important',
  };

  const allRoles: CoachRole[] = ['headCoach', 'offensiveCoordinator', 'defensiveCoordinator'];

  const vacancies = allRoles
    .filter((role) => {
      const key = getCoachHierarchyKey(role);
      return hierarchy[key] === null;
    })
    .map((role) => ({
      role,
      displayName: roleDisplayNames[role],
      priority: rolePriorities[role],
    }));

  return (
    <StaffScreen
      coaches={teamCoaches}
      scouts={teamScouts}
      vacancies={vacancies}
      onBack={() => navigation.goBack()}
      onHireCoach={(role) => {
        navigation.navigate('CoachHiring', { vacancyRole: role });
      }}
      onSelectStaff={(staffId, type) => {
        if (type === 'coach') {
          navigation.navigate('CoachProfile', { coachId: staffId });
        } else {
          // Show detailed scout profile with actions
          const scout = gameState.scouts[staffId];
          if (scout) {
            const regionText = scout.attributes.regionKnowledge || 'General';
            const evaluationText =
              scout.attributes.evaluation >= 80
                ? 'Elite'
                : scout.attributes.evaluation >= 60
                  ? 'Good'
                  : 'Average';
            const speedText =
              scout.attributes.speed >= 80
                ? 'Fast'
                : scout.attributes.speed >= 60
                  ? 'Moderate'
                  : 'Thorough';
            const positionSpecialty = scout.attributes.positionSpecialty || 'General';

            Alert.alert(
              `${scout.firstName} ${scout.lastName}`,
              `SCOUTING PROFILE\n\n` +
                `Region: ${regionText}\n` +
                `Position Focus: ${positionSpecialty}\n` +
                `Experience: ${scout.attributes.experience} years\n` +
                `Evaluation Skill: ${evaluationText}\n` +
                `Scouting Speed: ${speedText}`,
              [
                {
                  text: 'View Scouting Reports',
                  onPress: () => navigation.navigate('ScoutingReports'),
                },
                {
                  text: 'View Big Board',
                  onPress: () => navigation.navigate('BigBoard'),
                },
                { text: 'Close', style: 'cancel' },
              ]
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
  const { gameState, setGameState, saveGameState } = useGame();

  // Auto-complete offseason view task when screen is visited
  useEffect(() => {
    if (gameState) {
      const updatedState = tryCompleteViewTask(gameState, 'Finances');
      if (updatedState) {
        setGameState(updatedState);
        saveGameState(updatedState);
      }
    }
  }, []); // Only run on mount

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
      contracts={gameState.contracts}
      currentYear={gameState.league.calendar.currentYear}
      onBack={() => navigation.goBack()}
      onSelectPlayer={(playerId) => navigation.navigate('PlayerProfile', { playerId })}
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
              const firedRole = coach.role;
              const result = fireCoachAction(gameState, coachId, teamId);

              if (result.success) {
                setGameState(result.gameState);
                saveGameState(result.gameState);

                // Offer to hire a replacement
                Alert.alert(
                  'Coach Released',
                  `${result.message}\n\nWould you like to hire a replacement?`,
                  [
                    {
                      text: 'Hire Replacement',
                      onPress: () => {
                        navigation.replace('CoachHiring', { vacancyRole: firedRole });
                      },
                    },
                    {
                      text: 'Later',
                      style: 'cancel',
                      onPress: () => navigation.goBack(),
                    },
                  ]
                );
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
      onViewCoachingTree={() => navigation.navigate('CoachingTree', { coachId })}
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
// COACH HIRING SCREEN
// ============================================

export function CoachHiringScreenWrapper({
  navigation,
  route,
}: ScreenProps<'CoachHiring'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();
  const { vacancyRole } = route.params;

  if (!gameState) {
    return <LoadingFallback message="Loading..." />;
  }

  // Get team info
  const team = gameState.teams[gameState.userTeamId];
  const teamName = `${team.city} ${team.nickname}`;

  // Default to headCoach if no role specified
  const roleToFill = (vacancyRole || 'headCoach') as CoachRole;

  // Format role for display
  const formatRole = (role: string) => {
    return role.replace(/([A-Z])/g, ' $1').trim();
  };

  // Gather current team coaches for tag generation context
  const currentTeamCoaches: Coach[] = [];
  const hierarchy = team.staffHierarchy;
  const coachPositions = ['headCoach', 'offensiveCoordinator', 'defensiveCoordinator'] as const;
  for (const pos of coachPositions) {
    const coachId = hierarchy[pos];
    if (coachId && gameState.coaches[coachId]) {
      currentTeamCoaches.push(gameState.coaches[coachId]);
    }
  }

  // Calculate coaching budget remaining
  // Sum up salaries of existing coaches, subtract from staff budget
  const currentCoachingSpend = currentTeamCoaches.reduce(
    (total, c) => total + (c.contract?.salaryPerYear ?? 0),
    0
  );
  const staffBudget = hierarchy.staffBudget ?? 0;
  // Coaching gets ~80% of staff budget
  const coachingBudget = Math.round(staffBudget * 0.8);
  const coachingBudgetRemaining = Math.max(0, coachingBudget - currentCoachingSpend);

  // Generate candidates using the proper system
  const candidates = React.useMemo(
    () =>
      generateHiringCandidates(roleToFill, {
        count: 7,
        currentYear: gameState.league.calendar.currentYear,
        currentTeamCoaches,
        coachingBudgetRemaining,
      }),
    [roleToFill]
  );

  // Handle hiring a coach
  const handleHireCoach = (candidate: HiringCandidate) => {
    // Create the full coach entity with contract from the candidate
    const newCoach = createCandidateContract(
      candidate,
      gameState.userTeamId,
      gameState.league.calendar.currentYear
    );

    // Get the hierarchy key for this role
    const hierarchyKey = getCoachHierarchyKey(roleToFill);

    // Update the team's staff hierarchy and coaching spend
    const updatedTeam = {
      ...team,
      staffHierarchy: {
        ...team.staffHierarchy,
        [hierarchyKey]: newCoach.id,
        coachingSpend: currentCoachingSpend + candidate.expectedSalary,
        remainingBudget: team.staffHierarchy.remainingBudget - candidate.expectedSalary,
      },
    };

    // Update the coaches map
    const updatedCoaches = {
      ...gameState.coaches,
      [newCoach.id]: newCoach,
    };

    // Update the teams map
    const updatedTeams = {
      ...gameState.teams,
      [gameState.userTeamId]: updatedTeam,
    };

    // Create the updated game state
    const updatedGameState: GameState = {
      ...gameState,
      coaches: updatedCoaches,
      teams: updatedTeams,
    };

    // Save the updated state
    setGameState(updatedGameState);
    saveGameState(updatedGameState);

    const coachName = `${candidate.coach.firstName} ${candidate.coach.lastName}`;

    // Show success and navigate back
    Alert.alert(
      'Coach Hired!',
      `${coachName} has been hired as your ${formatRole(roleToFill)}.\n\nContract: ${candidate.expectedYears} years, $${(candidate.expectedSalary / 1_000_000).toFixed(1)}M/year`,
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <CoachHiringScreen
      vacancyRole={roleToFill}
      teamName={teamName}
      candidates={candidates}
      coachingBudgetRemaining={coachingBudgetRemaining}
      onBack={() => navigation.goBack()}
      onHire={(candidate) => {
        const coachName = `${candidate.coach.firstName} ${candidate.coach.lastName}`;
        Alert.alert(
          'Hire Coach',
          `Are you sure you want to hire ${coachName} as your new ${formatRole(roleToFill)}?\n\nContract: ${candidate.expectedYears} years, $${(candidate.expectedSalary / 1_000_000).toFixed(1)}M/year`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Hire',
              onPress: () => handleHireCoach(candidate),
            },
          ]
        );
      }}
    />
  );
}

// ============================================
// COACHING TREE SCREEN
// ============================================

export function CoachingTreeScreenWrapper({
  navigation,
  route,
}: ScreenProps<'CoachingTree'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading Coaching Tree..." />;
  }

  const { coachId } = route.params;

  // Find the coach
  const coach = gameState.coaches[coachId];
  if (!coach) {
    return <LoadingFallback message="Coach not found..." />;
  }

  // Get all coaches in the league for tree comparisons
  const allCoaches = Object.values(gameState.coaches);

  return (
    <CoachingTreeScreen
      gameState={gameState}
      coach={coach}
      relatedCoaches={allCoaches}
      onBack={() => navigation.goBack()}
      onCoachSelect={(selectedCoachId) =>
        navigation.navigate('CoachProfile', { coachId: selectedCoachId })
      }
    />
  );
}

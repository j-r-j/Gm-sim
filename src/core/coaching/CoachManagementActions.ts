/**
 * Coach Management Actions
 * High-level functions that perform coach management actions and return updated GameState
 */

import { GameState } from '../models/game/GameState';
import { Coach, getCoachFullName } from '../models/staff/Coach';
import { CoachRole } from '../models/staff/StaffSalary';
import {
  CoachContract,
  createCoachContract,
  calculateDeadMoney,
  isContractExpiring,
} from '../models/staff/CoachContract';
import { getCoachHierarchyKey, StaffHierarchy } from '../models/staff/StaffHierarchy';

/**
 * Result of a coach management action
 */
export interface CoachActionResult {
  success: boolean;
  gameState: GameState;
  message: string;
  deadMoney?: number;
}

/**
 * Extension offer parameters
 */
export interface ExtensionOffer {
  yearsAdded: number;
  newSalaryPerYear: number;
  newGuaranteed: number;
  signingBonus: number;
}

/**
 * Validation result for coach actions
 */
export interface CoachActionValidation {
  canPerform: boolean;
  reason?: string;
  warning?: string;
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validates if a coach can be fired
 */
export function canFireCoach(
  gameState: GameState,
  coachId: string,
  teamId: string
): CoachActionValidation {
  const coach = gameState.coaches[coachId];
  if (!coach) {
    return { canPerform: false, reason: 'Coach not found' };
  }

  if (coach.teamId !== teamId) {
    return { canPerform: false, reason: 'Coach is not on your team' };
  }

  // Check if this is the head coach and there are no coordinators to promote
  if (coach.role === 'headCoach') {
    const teamCoaches = Object.values(gameState.coaches).filter((c) => c.teamId === teamId);
    const hasOC = teamCoaches.some((c) => c.role === 'offensiveCoordinator');
    const hasDC = teamCoaches.some((c) => c.role === 'defensiveCoordinator');

    if (!hasOC && !hasDC) {
      return {
        canPerform: true,
        warning: 'You have no coordinators to promote. You will need to hire a new head coach.',
      };
    }
  }

  // Check dead money warning
  if (coach.contract && coach.contract.deadMoneyIfFired > 0) {
    return {
      canPerform: true,
      warning: `Firing will result in $${formatCurrency(coach.contract.deadMoneyIfFired)} dead money`,
    };
  }

  return { canPerform: true };
}

/**
 * Validates if a coach can be promoted
 */
export function canPromoteCoach(
  gameState: GameState,
  coachId: string,
  teamId: string
): CoachActionValidation {
  const coach = gameState.coaches[coachId];
  if (!coach) {
    return { canPerform: false, reason: 'Coach not found' };
  }

  if (coach.teamId !== teamId) {
    return { canPerform: false, reason: 'Coach is not on your team' };
  }

  if (coach.role === 'headCoach') {
    return { canPerform: false, reason: 'Coach is already the head coach' };
  }

  // Only coordinators can be promoted to HC
  const promotableRoles: CoachRole[] = ['offensiveCoordinator', 'defensiveCoordinator'];
  if (!promotableRoles.includes(coach.role)) {
    return { canPerform: false, reason: 'Only coordinators can be promoted to Head Coach' };
  }

  // Check if there's already a head coach
  const currentHC = Object.values(gameState.coaches).find(
    (c) => c.teamId === teamId && c.role === 'headCoach'
  );
  if (currentHC) {
    return {
      canPerform: false,
      reason: 'You must release the current head coach first',
    };
  }

  return { canPerform: true };
}

/**
 * Validates if a coach contract can be extended
 */
export function canExtendCoach(
  gameState: GameState,
  coachId: string,
  teamId: string
): CoachActionValidation {
  const coach = gameState.coaches[coachId];
  if (!coach) {
    return { canPerform: false, reason: 'Coach not found' };
  }

  if (coach.teamId !== teamId) {
    return { canPerform: false, reason: 'Coach is not on your team' };
  }

  if (!coach.contract) {
    return { canPerform: false, reason: 'Coach has no contract' };
  }

  // Can only extend if 2 or fewer years remaining
  if (coach.contract.yearsRemaining > 2) {
    return {
      canPerform: false,
      reason: 'Contract extension only available with 2 or fewer years remaining',
    };
  }

  return { canPerform: true };
}

// ============================================
// ACTION FUNCTIONS
// ============================================

/**
 * Fires a coach and updates the GameState
 */
export function fireCoachAction(
  gameState: GameState,
  coachId: string,
  teamId: string
): CoachActionResult {
  // Validate
  const validation = canFireCoach(gameState, coachId, teamId);
  if (!validation.canPerform) {
    return {
      success: false,
      gameState,
      message: validation.reason || 'Cannot fire coach',
    };
  }

  const coach = gameState.coaches[coachId];
  const coachName = getCoachFullName(coach);
  const deadMoney = coach.contract ? calculateDeadMoney(coach.contract) : 0;

  // Update coach to be available again
  const updatedCoach: Coach = {
    ...coach,
    teamId: null,
    isAvailable: true,
    contract: null,
  };

  // Get team hierarchy and update
  const team = gameState.teams[teamId];
  const hierarchyKey = getCoachHierarchyKey(coach.role);

  // Create updated hierarchy
  const updatedHierarchy: StaffHierarchy = {
    ...team.staffHierarchy,
    [hierarchyKey]: null,
  };

  // Update team
  const updatedTeam = {
    ...team,
    staffHierarchy: updatedHierarchy,
  };

  // Create updated state
  const updatedGameState: GameState = {
    ...gameState,
    coaches: {
      ...gameState.coaches,
      [coachId]: updatedCoach,
    },
    teams: {
      ...gameState.teams,
      [teamId]: updatedTeam,
    },
  };

  return {
    success: true,
    gameState: updatedGameState,
    message: `${coachName} has been released.${deadMoney > 0 ? ` Dead money: $${formatCurrency(deadMoney)}` : ''}`,
    deadMoney,
  };
}

/**
 * Promotes a coordinator to head coach
 */
export function promoteCoachAction(
  gameState: GameState,
  coachId: string,
  teamId: string
): CoachActionResult {
  // Validate
  const validation = canPromoteCoach(gameState, coachId, teamId);
  if (!validation.canPerform) {
    return {
      success: false,
      gameState,
      message: validation.reason || 'Cannot promote coach',
    };
  }

  const coach = gameState.coaches[coachId];
  const coachName = getCoachFullName(coach);
  const oldRole = coach.role;

  // Update coach to new role
  const updatedCoach: Coach = {
    ...coach,
    role: 'headCoach',
  };

  // Update hierarchy - remove from old position, add to HC
  const team = gameState.teams[teamId];
  const oldHierarchyKey = getCoachHierarchyKey(oldRole);
  const newHierarchyKey = getCoachHierarchyKey('headCoach');

  const updatedHierarchy: StaffHierarchy = {
    ...team.staffHierarchy,
    [oldHierarchyKey]: null,
    [newHierarchyKey]: coachId,
  };

  // Update team
  const updatedTeam = {
    ...team,
    staffHierarchy: updatedHierarchy,
  };

  // Create updated state
  const updatedGameState: GameState = {
    ...gameState,
    coaches: {
      ...gameState.coaches,
      [coachId]: updatedCoach,
    },
    teams: {
      ...gameState.teams,
      [teamId]: updatedTeam,
    },
  };

  return {
    success: true,
    gameState: updatedGameState,
    message: `${coachName} has been promoted to Head Coach!`,
  };
}

/**
 * Extends a coach's contract
 */
export function extendCoachAction(
  gameState: GameState,
  coachId: string,
  teamId: string,
  offer: ExtensionOffer
): CoachActionResult {
  // Validate
  const validation = canExtendCoach(gameState, coachId, teamId);
  if (!validation.canPerform) {
    return {
      success: false,
      gameState,
      message: validation.reason || 'Cannot extend coach',
    };
  }

  const coach = gameState.coaches[coachId];
  const coachName = getCoachFullName(coach);
  const oldContract = coach.contract!;

  // Create new extended contract
  const newYearsTotal = oldContract.yearsRemaining + offer.yearsAdded;
  const newContract: CoachContract = createCoachContract({
    id: `${oldContract.id}-ext`,
    coachId,
    teamId,
    yearsTotal: newYearsTotal,
    salaryPerYear: offer.newSalaryPerYear,
    guaranteedMoney: offer.newGuaranteed,
    signingBonus: offer.signingBonus,
    startYear: gameState.league.calendar.currentYear,
    isInterim: false,
    canBePoached: oldContract.canBePoached,
    hasNoTradeClause: oldContract.hasNoTradeClause,
  });

  // Update coach with new contract
  const updatedCoach: Coach = {
    ...coach,
    contract: newContract,
  };

  // Create updated state
  const updatedGameState: GameState = {
    ...gameState,
    coaches: {
      ...gameState.coaches,
      [coachId]: updatedCoach,
    },
  };

  return {
    success: true,
    gameState: updatedGameState,
    message: `${coachName}'s contract has been extended for ${offer.yearsAdded} years at $${formatCurrency(offer.newSalaryPerYear)}/year`,
  };
}

/**
 * Gets extension eligibility and recommended terms
 */
export function getExtensionRecommendation(
  gameState: GameState,
  coachId: string
): {
  eligible: boolean;
  reason?: string;
  recommendedYears?: number;
  recommendedSalary?: number;
  recommendedGuaranteed?: number;
} {
  const coach = gameState.coaches[coachId];
  if (!coach || !coach.contract) {
    return { eligible: false, reason: 'Coach has no contract' };
  }

  if (coach.contract.yearsRemaining > 2) {
    return { eligible: false, reason: 'Too much time remaining on current contract' };
  }

  // Base recommendation on reputation and current salary
  const reputation = coach.attributes.reputation;
  const currentSalary = coach.contract.salaryPerYear;

  // Calculate recommended raise based on reputation
  let raiseMultiplier = 1.0;
  if (reputation >= 85) raiseMultiplier = 1.25;
  else if (reputation >= 70) raiseMultiplier = 1.15;
  else if (reputation >= 50) raiseMultiplier = 1.05;
  else raiseMultiplier = 1.0;

  const recommendedSalary = Math.round((currentSalary * raiseMultiplier) / 100000) * 100000;

  // Recommended years based on age and reputation
  let recommendedYears = 3;
  if (coach.attributes.age >= 60) recommendedYears = 2;
  else if (reputation >= 80) recommendedYears = 4;
  else if (reputation >= 60) recommendedYears = 3;
  else recommendedYears = 2;

  // Guaranteed as percentage of total value
  const totalValue = recommendedSalary * recommendedYears;
  let guaranteedPct = 0.4;
  if (reputation >= 80) guaranteedPct = 0.5;
  else if (reputation >= 60) guaranteedPct = 0.4;
  else guaranteedPct = 0.3;

  return {
    eligible: true,
    recommendedYears,
    recommendedSalary,
    recommendedGuaranteed: Math.round(totalValue * guaranteedPct),
  };
}

/**
 * Gets all coaches eligible for extension on a team
 */
export function getExtensionEligibleCoaches(gameState: GameState, teamId: string): Coach[] {
  return Object.values(gameState.coaches).filter((coach) => {
    if (coach.teamId !== teamId) return false;
    if (!coach.contract) return false;
    return isContractExpiring(coach.contract) || coach.contract.yearsRemaining <= 2;
  });
}

/**
 * Gets coaches with expiring contracts
 */
export function getExpiringContractCoaches(gameState: GameState, teamId: string): Coach[] {
  return Object.values(gameState.coaches).filter((coach) => {
    if (coach.teamId !== teamId) return false;
    if (!coach.contract) return false;
    return isContractExpiring(coach.contract);
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K`;
  }
  return amount.toString();
}

/**
 * Coach Entity
 * Main coach model combining all coach-related data
 */

import { CoachingTree, createDefaultCoachingTree } from './CoachingTree';
import { CoachPersonality, createDefaultPersonality } from './CoachPersonality';
import {
  CoachAttributes,
  createDefaultAttributes,
  createAttributesViewModel,
  CoachAttributesViewModel,
} from './CoachAttributes';
import {
  CoordinatorTendencies,
  getTendenciesDescription,
  isOffensiveTendencies,
} from './CoordinatorTendencies';
import { CoachContract } from './CoachContract';
import { CoachRole } from './StaffSalary';
import { OffensiveScheme, DefensiveScheme } from '../player/SchemeFit';

/**
 * Scheme type (offensive or defensive)
 */
export type SchemeType = OffensiveScheme | DefensiveScheme;

/**
 * Career history entry for a coach
 */
export interface CareerHistoryEntry {
  teamId: string;
  teamName: string;
  role: CoachRole;
  yearStart: number;
  yearEnd: number;
  wins: number;
  losses: number;
  playoffAppearances: number;
  championships: number;
  achievements: string[];
}

/**
 * Coach entity - full data model
 */
export interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  role: CoachRole;
  teamId: string | null;

  // What they run (only coordinators/HC have schemes)
  scheme: SchemeType | null;

  // Core data
  tree: CoachingTree;
  personality: CoachPersonality;
  attributes: CoachAttributes;

  // Coordinators only
  tendencies: CoordinatorTendencies | null;

  // Contract
  contract: CoachContract | null;

  // Career history
  careerHistory: CareerHistoryEntry[];

  // Relationships (hidden, -10 to +10)
  playerChemistry: Record<string, number>; // playerId -> chemistry
  staffChemistry: Record<string, number>; // coachId -> chemistry

  // Status
  isAvailable: boolean; // Free agent coach
  isRetired: boolean;
  interviewRequests: string[]; // teamIds requesting interviews
}

/**
 * View model for UI (hides sensitive attributes)
 */
export interface CoachViewModel {
  id: string;
  fullName: string;
  role: CoachRole;
  teamName: string | null;
  scheme: SchemeType | null;

  // Public info
  tree: {
    name: string;
    generation: number;
  };
  personalityType: string;
  yearsExperience: number;
  age: number;

  // Attributes view model (limited info)
  attributesView: CoachAttributesViewModel;

  // Tendencies description (vague, not raw numbers)
  tendenciesDescription: string | null;

  // Career summary (public)
  careerWins: number;
  careerLosses: number;
  championships: number;

  // Contract (if on your team)
  contractYearsRemaining: number | null;
  salary: number | null;

  // Hidden from ViewModel:
  // - attributes (development, gameDayIQ, etc.)
  // - chemistry values
  // - ego
  // - tendencies (partially - user sees general description, not numbers)
}

/**
 * Creates a coach view model from a full coach entity
 */
export function createCoachViewModel(
  coach: Coach,
  teamName: string | null,
  isOwnTeam: boolean
): CoachViewModel {
  // Calculate career totals
  const careerWins = coach.careerHistory.reduce((sum, entry) => sum + entry.wins, 0);
  const careerLosses = coach.careerHistory.reduce((sum, entry) => sum + entry.losses, 0);
  const championships = coach.careerHistory.reduce((sum, entry) => sum + entry.championships, 0);

  return {
    id: coach.id,
    fullName: `${coach.firstName} ${coach.lastName}`,
    role: coach.role,
    teamName,
    scheme: coach.scheme,

    tree: {
      name: coach.tree.treeName,
      generation: coach.tree.generation,
    },
    personalityType: coach.personality.primary,
    yearsExperience: coach.attributes.yearsExperience,
    age: coach.attributes.age,

    attributesView: createAttributesViewModel(coach.attributes),

    tendenciesDescription: coach.tendencies ? getTendenciesDescription(coach.tendencies) : null,

    careerWins,
    careerLosses,
    championships,

    // Only show contract details for own team
    contractYearsRemaining: isOwnTeam ? (coach.contract?.yearsRemaining ?? null) : null,
    salary: isOwnTeam ? (coach.contract?.salaryPerYear ?? null) : null,
  };
}

/**
 * Creates a default coach
 */
export function createDefaultCoach(
  id: string,
  firstName: string,
  lastName: string,
  role: CoachRole
): Coach {
  return {
    id,
    firstName,
    lastName,
    role,
    teamId: null,
    scheme: null,
    tree: createDefaultCoachingTree(),
    personality: createDefaultPersonality(),
    attributes: createDefaultAttributes(),
    tendencies: null,
    contract: null,
    careerHistory: [],
    playerChemistry: {},
    staffChemistry: {},
    isAvailable: true,
    isRetired: false,
    interviewRequests: [],
  };
}

/**
 * Validates a coach entity
 */
export function validateCoach(coach: Coach): boolean {
  // Must have ID and name
  if (!coach.id || !coach.firstName || !coach.lastName) {
    return false;
  }

  // Tendencies must match role
  if (coach.tendencies) {
    const isOC = coach.role === 'offensiveCoordinator' || coach.role === 'headCoach';
    const isDC = coach.role === 'defensiveCoordinator' || coach.role === 'headCoach';

    if (isOffensiveTendencies(coach.tendencies) && !isOC) {
      return false;
    }
    if (!isOffensiveTendencies(coach.tendencies) && !isDC) {
      return false;
    }
  }

  // Chemistry values must be in range
  for (const chemistry of Object.values(coach.playerChemistry)) {
    if (chemistry < -10 || chemistry > 10) {
      return false;
    }
  }

  for (const chemistry of Object.values(coach.staffChemistry)) {
    if (chemistry < -10 || chemistry > 10) {
      return false;
    }
  }

  return true;
}

/**
 * Gets the full name of a coach
 */
export function getCoachFullName(coach: Coach): string {
  return `${coach.firstName} ${coach.lastName}`;
}

/**
 * Checks if a coach is a coordinator
 */
export function isCoordinator(coach: Coach): boolean {
  return (
    coach.role === 'offensiveCoordinator' ||
    coach.role === 'defensiveCoordinator' ||
    coach.role === 'specialTeamsCoordinator'
  );
}

/**
 * Checks if a coach is a position coach
 */
export function isPositionCoach(coach: Coach): boolean {
  const positionCoachRoles: CoachRole[] = [
    'qbCoach',
    'rbCoach',
    'wrCoach',
    'teCoach',
    'olCoach',
    'dlCoach',
    'lbCoach',
    'dbCoach',
    'stCoach',
  ];

  return positionCoachRoles.includes(coach.role);
}

/**
 * Gets career winning percentage
 */
export function getCareerWinningPercentage(coach: Coach): number | null {
  const totalGames = coach.careerHistory.reduce(
    (sum, entry) => sum + entry.wins + entry.losses,
    0
  );

  if (totalGames === 0) return null;

  const totalWins = coach.careerHistory.reduce((sum, entry) => sum + entry.wins, 0);
  return totalWins / totalGames;
}

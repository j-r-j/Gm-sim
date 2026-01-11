/**
 * Coaching Staff Manager
 * Manages the 14-position coaching hierarchy, vacancies, interim assignments, and chemistry
 */

import { Coach, validateCoach } from '../models/staff/Coach';
import { CoachRole, ALL_COACH_ROLES } from '../models/staff/StaffSalary';
import {
  StaffHierarchy,
  COACHING_REPORTS_TO,
  getCoachHierarchyKey,
  getCoachingPositionKeys,
  getVacantCoachingPositions,
  countFilledCoachingPositions,
} from '../models/staff/StaffHierarchy';
import { calculateTreeChemistry, TreeName } from '../models/staff/CoachingTree';
import { calculatePersonalityChemistry } from '../models/staff/CoachPersonality';

/**
 * Staff chemistry result (hidden from UI)
 */
export interface StaffChemistryResult {
  overallChemistry: number; // -10 to +10
  treeChemistry: number;
  personalityChemistry: number;
  tenureBonus: number;
  details: ChemistryPairing[];
}

/**
 * Individual chemistry pairing
 */
export interface ChemistryPairing {
  coach1Id: string;
  coach2Id: string;
  chemistry: number; // -10 to +10
  source: 'tree' | 'personality' | 'tenure';
}

/**
 * Staff chemistry view model (qualitative only)
 */
export interface StaffChemistryViewModel {
  overallDescription: string;
  staffHarmony: 'excellent' | 'good' | 'neutral' | 'strained' | 'toxic';
  notableRelationships: string[];
}

/**
 * Vacancy info
 */
export interface VacancyInfo {
  role: CoachRole;
  displayName: string;
  reportsTo: CoachRole | 'gm';
  isInterimFilled: boolean;
  interimCoachId: string | null;
  priority: 'critical' | 'important' | 'normal';
}

/**
 * Interim assignment
 */
export interface InterimAssignment {
  vacantRole: CoachRole;
  interimCoachId: string;
  originalRole: CoachRole;
  gamesAsInterim: number;
}

/**
 * Coaching tree relationship
 */
export interface CoachingTreeRelationship {
  coachId: string;
  treeName: TreeName;
  generation: number;
  mentorId: string | null;
  mentees: string[];
}

/**
 * Staff manager state
 */
export interface CoachingStaffState {
  teamId: string;
  coaches: Map<string, Coach>;
  interimAssignments: InterimAssignment[];
  coachingTreeRelationships: CoachingTreeRelationship[];
  yearsTogetherMatrix: Map<string, Map<string, number>>;
}

/**
 * Creates initial coaching staff state
 */
export function createCoachingStaffState(teamId: string): CoachingStaffState {
  return {
    teamId,
    coaches: new Map(),
    interimAssignments: [],
    coachingTreeRelationships: [],
    yearsTogetherMatrix: new Map(),
  };
}

/**
 * Gets all coaches on staff
 */
export function getStaffCoaches(
  state: CoachingStaffState,
  hierarchy: StaffHierarchy
): Coach[] {
  const coaches: Coach[] = [];
  const positionKeys = getCoachingPositionKeys();

  for (const key of positionKeys) {
    const coachId = hierarchy[key] as string | null;
    if (coachId) {
      const coach = state.coaches.get(coachId);
      if (coach) {
        coaches.push(coach);
      }
    }
  }

  return coaches;
}

/**
 * Gets a coach by their role
 */
export function getCoachByRole(
  state: CoachingStaffState,
  hierarchy: StaffHierarchy,
  role: CoachRole
): Coach | null {
  const key = getCoachHierarchyKey(role);
  const coachId = hierarchy[key] as string | null;
  if (!coachId) return null;
  return state.coaches.get(coachId) ?? null;
}

/**
 * Gets vacancies with details
 */
export function getVacancies(hierarchy: StaffHierarchy): VacancyInfo[] {
  const vacantPositions = getVacantCoachingPositions(hierarchy);
  const vacancies: VacancyInfo[] = [];

  for (const key of vacantPositions) {
    const role = key as CoachRole;
    vacancies.push({
      role,
      displayName: getCoachRoleDisplayName(role),
      reportsTo: COACHING_REPORTS_TO[role],
      isInterimFilled: false,
      interimCoachId: null,
      priority: getVacancyPriority(role),
    });
  }

  return vacancies;
}

/**
 * Gets display name for coach role
 */
function getCoachRoleDisplayName(role: CoachRole): string {
  const displayNames: Record<CoachRole, string> = {
    headCoach: 'Head Coach',
    offensiveCoordinator: 'Offensive Coordinator',
    defensiveCoordinator: 'Defensive Coordinator',
    specialTeamsCoordinator: 'Special Teams Coordinator',
    qbCoach: 'Quarterbacks Coach',
    rbCoach: 'Running Backs Coach',
    wrCoach: 'Wide Receivers Coach',
    teCoach: 'Tight Ends Coach',
    olCoach: 'Offensive Line Coach',
    dlCoach: 'Defensive Line Coach',
    lbCoach: 'Linebackers Coach',
    dbCoach: 'Defensive Backs Coach',
    stCoach: 'Special Teams Coach',
  };
  return displayNames[role];
}

/**
 * Gets vacancy priority
 */
function getVacancyPriority(role: CoachRole): 'critical' | 'important' | 'normal' {
  if (role === 'headCoach') return 'critical';
  if (
    role === 'offensiveCoordinator' ||
    role === 'defensiveCoordinator'
  ) {
    return 'important';
  }
  return 'normal';
}

/**
 * Hires a coach to a position
 */
export function hireCoach(
  state: CoachingStaffState,
  hierarchy: StaffHierarchy,
  coach: Coach,
  role: CoachRole
): { state: CoachingStaffState; hierarchy: StaffHierarchy } {
  if (!validateCoach(coach)) {
    throw new Error('Invalid coach');
  }

  const key = getCoachHierarchyKey(role);

  // Check if position is already filled
  if (hierarchy[key]) {
    throw new Error(`Position ${role} is already filled`);
  }

  // Update coach with new role and team
  const updatedCoach: Coach = {
    ...coach,
    role,
    teamId: hierarchy.teamId,
    isAvailable: false,
  };

  // Add coach to state
  const newCoaches = new Map(state.coaches);
  newCoaches.set(coach.id, updatedCoach);

  // Update hierarchy
  const newHierarchy = {
    ...hierarchy,
    [key]: coach.id,
  };

  // Add to years together matrix
  const newYearsMatrix = new Map(state.yearsTogetherMatrix);
  newYearsMatrix.set(coach.id, new Map());

  // Initialize years together with existing staff
  for (const [existingId] of state.coaches) {
    const existingMatrix = newYearsMatrix.get(existingId);
    if (existingMatrix) {
      existingMatrix.set(coach.id, 0);
    }
    newYearsMatrix.get(coach.id)?.set(existingId, 0);
  }

  return {
    state: {
      ...state,
      coaches: newCoaches,
      yearsTogetherMatrix: newYearsMatrix,
    },
    hierarchy: newHierarchy,
  };
}

/**
 * Fires a coach from a position
 */
export function fireCoach(
  state: CoachingStaffState,
  hierarchy: StaffHierarchy,
  coachId: string
): { state: CoachingStaffState; hierarchy: StaffHierarchy } {
  const coach = state.coaches.get(coachId);
  if (!coach) {
    throw new Error('Coach not found');
  }

  const key = getCoachHierarchyKey(coach.role);

  // Remove from hierarchy
  const newHierarchy = {
    ...hierarchy,
    [key]: null,
  };

  // Remove from state
  const newCoaches = new Map(state.coaches);
  newCoaches.delete(coachId);

  // Remove from years together matrix
  const newYearsMatrix = new Map(state.yearsTogetherMatrix);
  newYearsMatrix.delete(coachId);
  for (const [, matrix] of newYearsMatrix) {
    matrix.delete(coachId);
  }

  // Remove any interim assignments involving this coach
  const newInterimAssignments = state.interimAssignments.filter(
    (a) => a.interimCoachId !== coachId
  );

  return {
    state: {
      ...state,
      coaches: newCoaches,
      yearsTogetherMatrix: newYearsMatrix,
      interimAssignments: newInterimAssignments,
    },
    hierarchy: newHierarchy,
  };
}

/**
 * Assigns an interim coach to a vacant position
 */
export function assignInterim(
  state: CoachingStaffState,
  vacantRole: CoachRole,
  interimCoachId: string
): CoachingStaffState {
  const coach = state.coaches.get(interimCoachId);
  if (!coach) {
    throw new Error('Coach not found');
  }

  // Remove any existing interim assignment for this role
  const filteredAssignments = state.interimAssignments.filter(
    (a) => a.vacantRole !== vacantRole
  );

  const newAssignment: InterimAssignment = {
    vacantRole,
    interimCoachId,
    originalRole: coach.role,
    gamesAsInterim: 0,
  };

  return {
    ...state,
    interimAssignments: [...filteredAssignments, newAssignment],
  };
}

/**
 * Removes an interim assignment
 */
export function removeInterim(
  state: CoachingStaffState,
  vacantRole: CoachRole
): CoachingStaffState {
  return {
    ...state,
    interimAssignments: state.interimAssignments.filter(
      (a) => a.vacantRole !== vacantRole
    ),
  };
}

/**
 * Gets interim assignment for a role
 */
export function getInterimForRole(
  state: CoachingStaffState,
  role: CoachRole
): InterimAssignment | null {
  return state.interimAssignments.find((a) => a.vacantRole === role) ?? null;
}

/**
 * Calculates staff chemistry (HIDDEN from UI)
 */
export function calculateStaffChemistry(
  state: CoachingStaffState,
  hierarchy: StaffHierarchy
): StaffChemistryResult {
  const coaches = getStaffCoaches(state, hierarchy);
  const details: ChemistryPairing[] = [];

  let totalTreeChemistry = 0;
  let totalPersonalityChemistry = 0;
  let totalTenureBonus = 0;
  let pairCount = 0;

  // Calculate pairwise chemistry
  for (let i = 0; i < coaches.length; i++) {
    for (let j = i + 1; j < coaches.length; j++) {
      const coach1 = coaches[i];
      const coach2 = coaches[j];

      // Tree chemistry
      const treeResult = calculateTreeChemistry(coach1.tree, coach2.tree);
      const treeChem = (treeResult.min + treeResult.max) / 2;
      totalTreeChemistry += treeChem;
      details.push({
        coach1Id: coach1.id,
        coach2Id: coach2.id,
        chemistry: treeChem,
        source: 'tree',
      });

      // Personality chemistry
      const personalityChem = calculatePersonalityChemistry(
        coach1.personality,
        coach2.personality
      );
      totalPersonalityChemistry += personalityChem;
      details.push({
        coach1Id: coach1.id,
        coach2Id: coach2.id,
        chemistry: personalityChem,
        source: 'personality',
      });

      // Tenure bonus
      const yearsTogether = getYearsTogether(state, coach1.id, coach2.id);
      const tenureBonus = Math.min(yearsTogether * 0.5, 3); // Max +3
      totalTenureBonus += tenureBonus;
      if (yearsTogether > 0) {
        details.push({
          coach1Id: coach1.id,
          coach2Id: coach2.id,
          chemistry: tenureBonus,
          source: 'tenure',
        });
      }

      pairCount++;
    }
  }

  // Average chemistry
  const avgTreeChem = pairCount > 0 ? totalTreeChemistry / pairCount : 0;
  const avgPersonalityChem = pairCount > 0 ? totalPersonalityChemistry / pairCount : 0;
  const avgTenureBonus = pairCount > 0 ? totalTenureBonus / pairCount : 0;

  // Overall chemistry (weighted average)
  const overallChemistry = Math.max(
    -10,
    Math.min(10, avgTreeChem * 0.4 + avgPersonalityChem * 0.4 + avgTenureBonus * 0.2)
  );

  return {
    overallChemistry,
    treeChemistry: avgTreeChem,
    personalityChemistry: avgPersonalityChem,
    tenureBonus: avgTenureBonus,
    details,
  };
}

/**
 * Gets years two coaches have been together
 */
function getYearsTogether(
  state: CoachingStaffState,
  coach1Id: string,
  coach2Id: string
): number {
  const matrix = state.yearsTogetherMatrix.get(coach1Id);
  if (!matrix) return 0;
  return matrix.get(coach2Id) ?? 0;
}

/**
 * Creates staff chemistry view model (qualitative only)
 */
export function createStaffChemistryViewModel(
  chemistry: StaffChemistryResult,
  coaches: Map<string, Coach>
): StaffChemistryViewModel {
  // Determine harmony level
  let staffHarmony: StaffChemistryViewModel['staffHarmony'];
  if (chemistry.overallChemistry >= 5) {
    staffHarmony = 'excellent';
  } else if (chemistry.overallChemistry >= 2) {
    staffHarmony = 'good';
  } else if (chemistry.overallChemistry >= -2) {
    staffHarmony = 'neutral';
  } else if (chemistry.overallChemistry >= -5) {
    staffHarmony = 'strained';
  } else {
    staffHarmony = 'toxic';
  }

  // Generate notable relationships
  const notableRelationships: string[] = [];

  // Find strongest positive relationship
  const positivePairings = chemistry.details.filter((d) => d.chemistry >= 3);
  if (positivePairings.length > 0) {
    const strongest = positivePairings.reduce((a, b) =>
      a.chemistry > b.chemistry ? a : b
    );
    const coach1 = coaches.get(strongest.coach1Id);
    const coach2 = coaches.get(strongest.coach2Id);
    if (coach1 && coach2) {
      notableRelationships.push(
        `${coach1.firstName} ${coach1.lastName} and ${coach2.firstName} ${coach2.lastName} work well together`
      );
    }
  }

  // Find strongest negative relationship
  const negativePairings = chemistry.details.filter((d) => d.chemistry <= -3);
  if (negativePairings.length > 0) {
    const weakest = negativePairings.reduce((a, b) =>
      a.chemistry < b.chemistry ? a : b
    );
    const coach1 = coaches.get(weakest.coach1Id);
    const coach2 = coaches.get(weakest.coach2Id);
    if (coach1 && coach2) {
      notableRelationships.push(
        `Tension between ${coach1.firstName} ${coach1.lastName} and ${coach2.firstName} ${coach2.lastName}`
      );
    }
  }

  // Overall description
  let overallDescription: string;
  switch (staffHarmony) {
    case 'excellent':
      overallDescription = 'The coaching staff has excellent cohesion';
      break;
    case 'good':
      overallDescription = 'The coaching staff works well together';
      break;
    case 'neutral':
      overallDescription = 'The coaching staff has a professional relationship';
      break;
    case 'strained':
      overallDescription = 'There are some tensions within the coaching staff';
      break;
    case 'toxic':
      overallDescription = 'The coaching staff has significant internal conflicts';
      break;
  }

  return {
    overallDescription,
    staffHarmony,
    notableRelationships,
  };
}

/**
 * Advances staff state by one year
 */
export function advanceStaffYear(state: CoachingStaffState): CoachingStaffState {
  // Increment years together for all pairs
  const newYearsMatrix = new Map(state.yearsTogetherMatrix);

  for (const [coach1Id, matrix] of newYearsMatrix) {
    const newMatrix = new Map(matrix);
    for (const [coach2Id, years] of newMatrix) {
      newMatrix.set(coach2Id, years + 1);
    }
    newYearsMatrix.set(coach1Id, newMatrix);
  }

  return {
    ...state,
    yearsTogetherMatrix: newYearsMatrix,
  };
}

/**
 * Builds coaching tree relationships
 */
export function buildCoachingTreeRelationships(
  coaches: Coach[]
): CoachingTreeRelationship[] {
  const relationships: CoachingTreeRelationship[] = [];

  for (const coach of coaches) {
    // Find mentees (coaches with this coach as mentor)
    const mentees = coaches
      .filter((c) => c.tree.mentorId === coach.id)
      .map((c) => c.id);

    relationships.push({
      coachId: coach.id,
      treeName: coach.tree.treeName,
      generation: coach.tree.generation,
      mentorId: coach.tree.mentorId,
      mentees,
    });
  }

  return relationships;
}

/**
 * Gets coaches from the same coaching tree
 */
export function getSameTreeCoaches(
  coaches: Coach[],
  treeName: TreeName
): Coach[] {
  return coaches.filter((c) => c.tree.treeName === treeName);
}

/**
 * Checks if minimum staff requirements are met
 */
export function hasMinimumCoachingStaff(hierarchy: StaffHierarchy): boolean {
  // Must have head coach
  if (!hierarchy.headCoach) return false;

  // Must have at least one coordinator
  if (
    !hierarchy.offensiveCoordinator &&
    !hierarchy.defensiveCoordinator
  ) {
    return false;
  }

  return true;
}

/**
 * Gets staff completeness percentage
 */
export function getStaffCompleteness(hierarchy: StaffHierarchy): number {
  const filled = countFilledCoachingPositions(hierarchy);
  const total = ALL_COACH_ROLES.length;
  return (filled / total) * 100;
}

/**
 * Validates coaching staff state
 */
export function validateCoachingStaffState(state: CoachingStaffState): boolean {
  // Validate all coaches
  for (const [, coach] of state.coaches) {
    if (!validateCoach(coach)) return false;
  }

  // Validate interim assignments reference valid coaches
  for (const assignment of state.interimAssignments) {
    if (!state.coaches.has(assignment.interimCoachId)) return false;
  }

  return true;
}

/**
 * Gets a summary of the coaching staff
 */
export function getCoachingStaffSummary(
  state: CoachingStaffState,
  hierarchy: StaffHierarchy
): {
  totalPositions: number;
  filledPositions: number;
  vacancies: number;
  interimAssignments: number;
  hasHeadCoach: boolean;
  hasOffensiveCoordinator: boolean;
  hasDefensiveCoordinator: boolean;
} {
  const filled = countFilledCoachingPositions(hierarchy);

  return {
    totalPositions: ALL_COACH_ROLES.length,
    filledPositions: filled,
    vacancies: ALL_COACH_ROLES.length - filled,
    interimAssignments: state.interimAssignments.length,
    hasHeadCoach: !!hierarchy.headCoach,
    hasOffensiveCoordinator: !!hierarchy.offensiveCoordinator,
    hasDefensiveCoordinator: !!hierarchy.defensiveCoordinator,
  };
}

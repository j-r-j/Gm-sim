/**
 * Scouting Department Manager
 * Manages the 8-position scouting department, regional assignments, and budget
 */

import {
  Scout,
  validateScout,
  createScoutContract,
  advanceScoutContractYear,
} from '../models/staff/Scout';
import { ScoutRole, SCOUT_SALARY_RANGES } from '../models/staff/StaffSalary';
import { ScoutRegion, ALL_SCOUT_REGIONS } from '../models/staff/ScoutAttributes';

/**
 * Scouting department position configuration
 */
export interface ScoutingPosition {
  role: ScoutRole;
  displayName: string;
  count: number;
  region?: ScoutRegion; // For regional scouts
}

/**
 * Total scouting department positions
 */
export const TOTAL_SCOUTING_POSITIONS = 3;

/**
 * Department structure: 1 Head Scout, 1 Offensive Scout, 1 Defensive Scout
 */
export const SCOUTING_DEPARTMENT_STRUCTURE: ScoutingPosition[] = [
  { role: 'headScout', displayName: 'Head Scout', count: 1 },
  { role: 'offensiveScout', displayName: 'Offensive Scout', count: 1 },
  { role: 'defensiveScout', displayName: 'Defensive Scout', count: 1 },
];

/**
 * Regional assignment for scouts
 */
export interface RegionalAssignment {
  scoutId: string;
  region: ScoutRegion;
  isPrimary: boolean;
}

/**
 * Scouting department state
 */
export interface ScoutingDepartmentState {
  teamId: string;
  scouts: Map<string, Scout>;
  regionalAssignments: RegionalAssignment[];
  budget: number;
  spentBudget: number;
}

/**
 * Vacancy information
 */
export interface ScoutingVacancy {
  role: ScoutRole;
  displayName: string;
  region: ScoutRegion | null;
  salaryRange: { min: number; max: number };
  priority: 'critical' | 'important' | 'normal';
}

/**
 * Department summary view model
 */
export interface ScoutingDepartmentSummary {
  totalPositions: number;
  filledPositions: number;
  vacancies: number;
  hasDirector: boolean;
  hasProScout: boolean;
  regionsCovered: ScoutRegion[];
  regionsUncovered: ScoutRegion[];
  budgetRemaining: number;
  budgetUsedPercent: number;
}

/**
 * Creates an empty scouting department state
 */
export function createScoutingDepartmentState(
  teamId: string,
  budget: number
): ScoutingDepartmentState {
  return {
    teamId,
    scouts: new Map(),
    regionalAssignments: [],
    budget,
    spentBudget: 0,
  };
}

/**
 * Gets all scouts in the department
 */
export function getDepartmentScouts(state: ScoutingDepartmentState): Scout[] {
  return Array.from(state.scouts.values());
}

/**
 * Gets scouts by role
 */
export function getScoutsByRole(state: ScoutingDepartmentState, role: ScoutRole): Scout[] {
  return getDepartmentScouts(state).filter((s) => s.role === role);
}

/**
 * Gets the head scout
 */
export function getHeadScout(state: ScoutingDepartmentState): Scout | null {
  const headScouts = getScoutsByRole(state, 'headScout');
  return headScouts.length > 0 ? headScouts[0] : null;
}

/**
 * Gets scouts assigned to a region
 */
export function getScoutsForRegion(state: ScoutingDepartmentState, region: ScoutRegion): Scout[] {
  const assignments = state.regionalAssignments.filter((a) => a.region === region);
  const scoutIds = new Set(assignments.map((a) => a.scoutId));
  return getDepartmentScouts(state).filter((s) => scoutIds.has(s.id));
}

/**
 * Gets primary scout for a region
 */
export function getPrimaryScoutForRegion(
  state: ScoutingDepartmentState,
  region: ScoutRegion
): Scout | null {
  const assignment = state.regionalAssignments.find((a) => a.region === region && a.isPrimary);
  if (!assignment) return null;
  return state.scouts.get(assignment.scoutId) ?? null;
}

/**
 * Gets vacancies in the department
 */
export function getScoutingVacancies(state: ScoutingDepartmentState): ScoutingVacancy[] {
  const vacancies: ScoutingVacancy[] = [];
  const scouts = getDepartmentScouts(state);

  // Check head scout
  const hasHeadScout = scouts.some((s) => s.role === 'headScout');
  if (!hasHeadScout) {
    vacancies.push({
      role: 'headScout',
      displayName: 'Head Scout',
      region: null,
      salaryRange: SCOUT_SALARY_RANGES.headScout,
      priority: 'critical',
    });
  }

  // Check offensive scout
  const hasOffensiveScout = scouts.some((s) => s.role === 'offensiveScout');
  if (!hasOffensiveScout) {
    vacancies.push({
      role: 'offensiveScout',
      displayName: 'Offensive Scout',
      region: null,
      salaryRange: SCOUT_SALARY_RANGES.offensiveScout,
      priority: 'important',
    });
  }

  // Check defensive scout
  const hasDefensiveScout = scouts.some((s) => s.role === 'defensiveScout');
  if (!hasDefensiveScout) {
    vacancies.push({
      role: 'defensiveScout',
      displayName: 'Defensive Scout',
      region: null,
      salaryRange: SCOUT_SALARY_RANGES.defensiveScout,
      priority: 'important',
    });
  }

  return vacancies;
}

/**
 * Hires a scout to the department
 */
export function hireScout(
  state: ScoutingDepartmentState,
  scout: Scout,
  salary: number,
  years: number
): ScoutingDepartmentState | null {
  // Validate scout
  if (!validateScout(scout)) {
    return null;
  }

  // Check budget
  if (state.spentBudget + salary > state.budget) {
    return null;
  }

  // Validate salary is in range
  const salaryRange = SCOUT_SALARY_RANGES[scout.role];
  if (salary < salaryRange.min || salary > salaryRange.max) {
    return null;
  }

  // Check position availability
  const vacancies = getScoutingVacancies(state);
  const hasVacancy = vacancies.some((v) => {
    if (v.role !== scout.role) return false;
    if (v.region !== null && v.region !== scout.region) return false;
    return true;
  });

  if (!hasVacancy) {
    return null;
  }

  // Create contract and update scout
  const contract = createScoutContract(salary, years);
  const updatedScout: Scout = {
    ...scout,
    teamId: state.teamId,
    contract,
    isAvailable: false,
  };

  // Add to department
  const newScouts = new Map(state.scouts);
  newScouts.set(scout.id, updatedScout);

  // Regional assignments not used in simplified scout structure
  const newAssignments = [...state.regionalAssignments];

  return {
    ...state,
    scouts: newScouts,
    regionalAssignments: newAssignments,
    spentBudget: state.spentBudget + salary,
  };
}

/**
 * Fires a scout from the department
 */
export function fireScout(
  state: ScoutingDepartmentState,
  scoutId: string
): ScoutingDepartmentState | null {
  const scout = state.scouts.get(scoutId);
  if (!scout) {
    return null;
  }

  // Remove scout
  const newScouts = new Map(state.scouts);
  newScouts.delete(scoutId);

  // Remove regional assignments
  const newAssignments = state.regionalAssignments.filter((a) => a.scoutId !== scoutId);

  // Recalculate spent budget
  const salary = scout.contract?.salary ?? 0;

  return {
    ...state,
    scouts: newScouts,
    regionalAssignments: newAssignments,
    spentBudget: state.spentBudget - salary,
  };
}

/**
 * Assigns a scout to a region
 * Note: In simplified structure, region assignments are not used
 */
export function assignScoutToRegion(
  state: ScoutingDepartmentState,
  scoutId: string,
  region: ScoutRegion,
  isPrimary: boolean = false
): ScoutingDepartmentState | null {
  const scout = state.scouts.get(scoutId);
  if (!scout) {
    return null;
  }

  // In simplified structure, all scouts can cover any region
  // This function is kept for API compatibility

  // Check if this scout already has an assignment to this region
  const existingAssignment = state.regionalAssignments.find(
    (a) => a.scoutId === scoutId && a.region === region
  );

  if (existingAssignment) {
    // Update primary status
    const newAssignments = state.regionalAssignments.map((a) => {
      if (a.scoutId === scoutId && a.region === region) {
        return { ...a, isPrimary };
      }
      // If setting new primary, remove primary from others
      if (isPrimary && a.region === region && a.scoutId !== scoutId) {
        return { ...a, isPrimary: false };
      }
      return a;
    });

    return {
      ...state,
      regionalAssignments: newAssignments,
    };
  }

  // Add new assignment
  const newAssignments = [...state.regionalAssignments];

  // If setting as primary, remove primary from current primary
  if (isPrimary) {
    for (let i = 0; i < newAssignments.length; i++) {
      if (newAssignments[i].region === region) {
        newAssignments[i] = { ...newAssignments[i], isPrimary: false };
      }
    }
  }

  newAssignments.push({
    scoutId,
    region,
    isPrimary,
  });

  return {
    ...state,
    regionalAssignments: newAssignments,
  };
}

/**
 * Removes a scout's assignment from a region
 */
export function removeScoutFromRegion(
  state: ScoutingDepartmentState,
  scoutId: string,
  region: ScoutRegion
): ScoutingDepartmentState {
  const newAssignments = state.regionalAssignments.filter(
    (a) => !(a.scoutId === scoutId && a.region === region)
  );

  return {
    ...state,
    regionalAssignments: newAssignments,
  };
}

/**
 * Updates department budget
 */
export function updateScoutingBudget(
  state: ScoutingDepartmentState,
  newBudget: number
): ScoutingDepartmentState | null {
  // Cannot reduce budget below spent amount
  if (newBudget < state.spentBudget) {
    return null;
  }

  return {
    ...state,
    budget: newBudget,
  };
}

/**
 * Advances all scout contracts by one year
 */
export function advanceScoutingYear(state: ScoutingDepartmentState): {
  state: ScoutingDepartmentState;
  expiredContracts: string[];
} {
  const newScouts = new Map<string, Scout>();
  const expiredContracts: string[] = [];
  let newSpentBudget = 0;

  for (const [id, scout] of state.scouts) {
    if (!scout.contract) {
      newScouts.set(id, scout);
      continue;
    }

    const advancedContract = advanceScoutContractYear(scout.contract);

    if (advancedContract === null) {
      // Contract expired
      expiredContracts.push(id);
      newScouts.set(id, {
        ...scout,
        contract: null,
        isAvailable: true,
        teamId: null,
      });
    } else {
      newScouts.set(id, {
        ...scout,
        contract: advancedContract,
      });
      newSpentBudget += advancedContract.salary;
    }
  }

  // Remove regional assignments for expired scouts
  const newAssignments = state.regionalAssignments.filter(
    (a) => !expiredContracts.includes(a.scoutId)
  );

  return {
    state: {
      ...state,
      scouts: newScouts,
      regionalAssignments: newAssignments,
      spentBudget: newSpentBudget,
    },
    expiredContracts,
  };
}

/**
 * Gets department summary
 */
export function getScoutingDepartmentSummary(
  state: ScoutingDepartmentState
): ScoutingDepartmentSummary {
  const scouts = getDepartmentScouts(state);
  const vacancies = getScoutingVacancies(state);

  // In simplified structure, all scouts cover all regions
  const regionsCovered: ScoutRegion[] = scouts.length > 0 ? [...ALL_SCOUT_REGIONS] : [];
  const regionsUncovered: ScoutRegion[] = scouts.length === 0 ? [...ALL_SCOUT_REGIONS] : [];

  const budgetRemaining = state.budget - state.spentBudget;
  const budgetUsedPercent = state.budget > 0 ? (state.spentBudget / state.budget) * 100 : 0;

  return {
    totalPositions: TOTAL_SCOUTING_POSITIONS,
    filledPositions: scouts.length,
    vacancies: vacancies.length,
    hasDirector: scouts.some((s) => s.role === 'headScout'),
    hasProScout: false, // Pro scout role removed in simplified structure
    regionsCovered,
    regionsUncovered,
    budgetRemaining,
    budgetUsedPercent,
  };
}

/**
 * Checks if department has minimum staffing
 */
export function hasMinimumScoutingStaff(state: ScoutingDepartmentState): boolean {
  const scouts = getDepartmentScouts(state);

  // Must have at least head scout
  const hasHeadScout = scouts.some((s) => s.role === 'headScout');

  return hasHeadScout;
}

/**
 * Gets total department salary
 */
export function getTotalDepartmentSalary(state: ScoutingDepartmentState): number {
  let total = 0;
  for (const [, scout] of state.scouts) {
    if (scout.contract) {
      total += scout.contract.salary;
    }
  }
  return total;
}

/**
 * Validates scouting department state
 */
export function validateScoutingDepartmentState(state: ScoutingDepartmentState): boolean {
  // Validate all scouts
  for (const [, scout] of state.scouts) {
    if (!validateScout(scout)) return false;
  }

  // Validate regional assignments reference valid scouts
  for (const assignment of state.regionalAssignments) {
    if (!state.scouts.has(assignment.scoutId)) return false;
  }

  // Validate budget
  if (state.spentBudget > state.budget) return false;
  if (state.budget < 0 || state.spentBudget < 0) return false;

  return true;
}

/**
 * Renews a scout's contract
 */
export function renewScoutContract(
  state: ScoutingDepartmentState,
  scoutId: string,
  newSalary: number,
  years: number
): ScoutingDepartmentState | null {
  const scout = state.scouts.get(scoutId);
  if (!scout) {
    return null;
  }

  // Get old salary to calculate budget change
  const oldSalary = scout.contract?.salary ?? 0;
  const budgetDiff = newSalary - oldSalary;

  // Check budget
  if (state.spentBudget + budgetDiff > state.budget) {
    return null;
  }

  // Validate salary is in range
  const salaryRange = SCOUT_SALARY_RANGES[scout.role];
  if (newSalary < salaryRange.min || newSalary > salaryRange.max) {
    return null;
  }

  // Create new contract
  const newContract = createScoutContract(newSalary, years);
  const updatedScout: Scout = {
    ...scout,
    contract: newContract,
  };

  const newScouts = new Map(state.scouts);
  newScouts.set(scoutId, updatedScout);

  return {
    ...state,
    scouts: newScouts,
    spentBudget: state.spentBudget + budgetDiff,
  };
}

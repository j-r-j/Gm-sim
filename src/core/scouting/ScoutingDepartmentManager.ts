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
export const TOTAL_SCOUTING_POSITIONS = 8;

/**
 * Department structure: 1 Director, 2 National, 4 Regional, 1 Pro
 */
export const SCOUTING_DEPARTMENT_STRUCTURE: ScoutingPosition[] = [
  { role: 'scoutingDirector', displayName: 'Director of Scouting', count: 1 },
  { role: 'nationalScout', displayName: 'National Scout', count: 2 },
  {
    role: 'regionalScout',
    displayName: 'Regional Scout (Northeast)',
    count: 1,
    region: 'northeast',
  },
  {
    role: 'regionalScout',
    displayName: 'Regional Scout (Southeast)',
    count: 1,
    region: 'southeast',
  },
  { role: 'regionalScout', displayName: 'Regional Scout (Midwest)', count: 1, region: 'midwest' },
  { role: 'regionalScout', displayName: 'Regional Scout (West)', count: 1, region: 'west' },
  { role: 'proScout', displayName: 'Pro Scout', count: 1 },
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
 * Gets the scouting director
 */
export function getScoutingDirector(state: ScoutingDepartmentState): Scout | null {
  const directors = getScoutsByRole(state, 'scoutingDirector');
  return directors.length > 0 ? directors[0] : null;
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

  // Check director
  const hasDirector = scouts.some((s) => s.role === 'scoutingDirector');
  if (!hasDirector) {
    vacancies.push({
      role: 'scoutingDirector',
      displayName: 'Director of Scouting',
      region: null,
      salaryRange: SCOUT_SALARY_RANGES.scoutingDirector,
      priority: 'critical',
    });
  }

  // Check national scouts (need 2)
  const nationalScouts = scouts.filter((s) => s.role === 'nationalScout');
  const nationalVacancies = 2 - nationalScouts.length;
  for (let i = 0; i < nationalVacancies; i++) {
    vacancies.push({
      role: 'nationalScout',
      displayName: 'National Scout',
      region: null,
      salaryRange: SCOUT_SALARY_RANGES.nationalScout,
      priority: 'important',
    });
  }

  // Check regional scouts (1 per region as defined in structure)
  const structureRegions = SCOUTING_DEPARTMENT_STRUCTURE.filter(
    (pos) => pos.role === 'regionalScout' && pos.region
  ).map((pos) => pos.region!);

  for (const region of structureRegions) {
    const regionScout = scouts.find((s) => s.role === 'regionalScout' && s.region === region);
    if (!regionScout) {
      vacancies.push({
        role: 'regionalScout',
        displayName: `Regional Scout (${getRegionDisplayNameForVacancy(region)})`,
        region,
        salaryRange: SCOUT_SALARY_RANGES.regionalScout,
        priority: 'normal',
      });
    }
  }

  // Check pro scout
  const hasProScout = scouts.some((s) => s.role === 'proScout');
  if (!hasProScout) {
    vacancies.push({
      role: 'proScout',
      displayName: 'Pro Scout',
      region: null,
      salaryRange: SCOUT_SALARY_RANGES.proScout,
      priority: 'important',
    });
  }

  return vacancies;
}

/**
 * Helper to get region display name
 */
function getRegionDisplayNameForVacancy(region: ScoutRegion): string {
  const displayNames: Record<ScoutRegion, string> = {
    northeast: 'Northeast',
    southeast: 'Southeast',
    midwest: 'Midwest',
    west: 'West Coast',
    southwest: 'Southwest',
  };
  return displayNames[region];
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

  // Create regional assignment if regional scout
  const newAssignments = [...state.regionalAssignments];
  if (scout.role === 'regionalScout' && scout.region) {
    newAssignments.push({
      scoutId: scout.id,
      region: scout.region,
      isPrimary: true,
    });
  }

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

  // Only national scouts and regional scouts can be assigned to regions
  if (scout.role !== 'nationalScout' && scout.role !== 'regionalScout') {
    return null;
  }

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

  // Update scout's region if regional scout
  let updatedScouts = state.scouts;
  if (scout.role === 'regionalScout') {
    updatedScouts = new Map(state.scouts);
    updatedScouts.set(scoutId, { ...scout, region });
  }

  return {
    ...state,
    scouts: updatedScouts,
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

  // Get covered regions
  const coveredRegions = new Set<ScoutRegion>();
  for (const scout of scouts) {
    if (scout.role === 'regionalScout' && scout.region) {
      coveredRegions.add(scout.region);
    }
  }
  // National scouts also provide coverage
  const nationalScouts = scouts.filter((s) => s.role === 'nationalScout');
  if (nationalScouts.length > 0) {
    for (const region of ALL_SCOUT_REGIONS) {
      coveredRegions.add(region);
    }
  }

  const regionsCovered = Array.from(coveredRegions);
  const regionsUncovered = ALL_SCOUT_REGIONS.filter((r) => !coveredRegions.has(r));

  const budgetRemaining = state.budget - state.spentBudget;
  const budgetUsedPercent = state.budget > 0 ? (state.spentBudget / state.budget) * 100 : 0;

  return {
    totalPositions: TOTAL_SCOUTING_POSITIONS,
    filledPositions: scouts.length,
    vacancies: vacancies.length,
    hasDirector: scouts.some((s) => s.role === 'scoutingDirector'),
    hasProScout: scouts.some((s) => s.role === 'proScout'),
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

  // Must have at least director or one national scout
  const hasDirector = scouts.some((s) => s.role === 'scoutingDirector');
  const hasNationalScout = scouts.some((s) => s.role === 'nationalScout');

  return hasDirector || hasNationalScout;
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

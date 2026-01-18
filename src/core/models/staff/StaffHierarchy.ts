/**
 * Staff Hierarchy Model
 * Defines the organizational structure of coaching and scouting staff
 */

import { CoachRole, ScoutRole } from './StaffSalary';

/**
 * Staff hierarchy for a team
 * 3 coaching positions + 3 scouting positions = 6 total staff
 */
export interface StaffHierarchy {
  teamId: string;

  // Coaching staff (3 positions)
  headCoach: string | null; // Coach ID
  offensiveCoordinator: string | null;
  defensiveCoordinator: string | null;

  // Scouting staff (3 positions)
  headScout: string | null;
  offensiveScout: string | null;
  defensiveScout: string | null;

  // Budget
  staffBudget: number;
  coachingSpend: number;
  scoutingSpend: number;
  remainingBudget: number;
}

/**
 * Reporting structure for coaches
 */
export const COACHING_REPORTS_TO: Record<CoachRole, CoachRole | 'gm'> = {
  headCoach: 'gm',
  offensiveCoordinator: 'headCoach',
  defensiveCoordinator: 'headCoach',
};

/**
 * Reporting structure for scouts
 */
export const SCOUTING_REPORTS_TO: Record<ScoutRole, ScoutRole | 'gm'> = {
  headScout: 'gm',
  offensiveScout: 'headScout',
  defensiveScout: 'headScout',
};

/**
 * Number of coaching positions
 */
export const COACHING_POSITIONS_COUNT = 3;

/**
 * Number of scouting positions
 */
export const SCOUTING_POSITIONS_COUNT = 3;

/**
 * Total staff positions
 */
export const TOTAL_STAFF_POSITIONS = 6;

/**
 * Creates an empty staff hierarchy for a team
 */
export function createEmptyStaffHierarchy(teamId: string, staffBudget: number): StaffHierarchy {
  return {
    teamId,

    // Coaching staff
    headCoach: null,
    offensiveCoordinator: null,
    defensiveCoordinator: null,

    // Scouting staff
    headScout: null,
    offensiveScout: null,
    defensiveScout: null,

    // Budget
    staffBudget,
    coachingSpend: 0,
    scoutingSpend: 0,
    remainingBudget: staffBudget,
  };
}

/**
 * Gets the coach role key in hierarchy for a given role
 */
export function getCoachHierarchyKey(role: CoachRole): keyof StaffHierarchy {
  const mapping: Record<CoachRole, keyof StaffHierarchy> = {
    headCoach: 'headCoach',
    offensiveCoordinator: 'offensiveCoordinator',
    defensiveCoordinator: 'defensiveCoordinator',
  };

  return mapping[role];
}

/**
 * Gets all coaching position keys
 */
export function getCoachingPositionKeys(): (keyof StaffHierarchy)[] {
  return ['headCoach', 'offensiveCoordinator', 'defensiveCoordinator'];
}

/**
 * Gets all scouting position keys
 */
export function getScoutingPositionKeys(): (keyof StaffHierarchy)[] {
  return ['headScout', 'offensiveScout', 'defensiveScout'];
}

/**
 * Counts filled coaching positions
 */
export function countFilledCoachingPositions(hierarchy: StaffHierarchy): number {
  const keys = getCoachingPositionKeys();
  return keys.filter((key) => hierarchy[key] !== null).length;
}

/**
 * Counts filled scouting positions
 */
export function countFilledScoutingPositions(hierarchy: StaffHierarchy): number {
  const keys = getScoutingPositionKeys();
  return keys.filter((key) => hierarchy[key] !== null).length;
}

/**
 * Gets vacant coaching positions
 */
export function getVacantCoachingPositions(hierarchy: StaffHierarchy): (keyof StaffHierarchy)[] {
  const keys = getCoachingPositionKeys();
  return keys.filter((key) => hierarchy[key] === null);
}

/**
 * Gets vacant scouting positions
 */
export function getVacantScoutingPositions(hierarchy: StaffHierarchy): (keyof StaffHierarchy)[] {
  const keys = getScoutingPositionKeys();
  return keys.filter((key) => hierarchy[key] === null);
}

/**
 * Updates budget after hiring/firing
 */
export function updateBudget(
  hierarchy: StaffHierarchy,
  coachingSpend: number,
  scoutingSpend: number
): StaffHierarchy {
  return {
    ...hierarchy,
    coachingSpend,
    scoutingSpend,
    remainingBudget: hierarchy.staffBudget - coachingSpend - scoutingSpend,
  };
}

/**
 * Validates staff hierarchy
 */
export function validateStaffHierarchy(hierarchy: StaffHierarchy): boolean {
  // Budget must be non-negative
  if (hierarchy.staffBudget < 0) {
    return false;
  }

  // Spending cannot exceed budget
  if (hierarchy.coachingSpend + hierarchy.scoutingSpend > hierarchy.staffBudget) {
    return false;
  }

  // Remaining budget must be calculated correctly
  const expectedRemaining =
    hierarchy.staffBudget - hierarchy.coachingSpend - hierarchy.scoutingSpend;
  if (hierarchy.remainingBudget !== expectedRemaining) {
    return false;
  }

  return true;
}

/**
 * Gets the direct reports for a coach role
 */
export function getDirectReports(role: CoachRole): CoachRole[] {
  const reports: CoachRole[] = [];

  for (const [coachRole, reportsTo] of Object.entries(COACHING_REPORTS_TO)) {
    if (reportsTo === role) {
      reports.push(coachRole as CoachRole);
    }
  }

  return reports;
}

/**
 * Checks if staff hierarchy has minimum required positions filled
 */
export function hasMinimumStaff(hierarchy: StaffHierarchy): boolean {
  // Must have head coach
  if (!hierarchy.headCoach) {
    return false;
  }

  // Must have at least one coordinator
  const hasCoordinator =
    hierarchy.offensiveCoordinator !== null || hierarchy.defensiveCoordinator !== null;

  if (!hasCoordinator) {
    return false;
  }

  return true;
}

/**
 * Gets staff hierarchy summary
 */
export function getStaffHierarchySummary(hierarchy: StaffHierarchy): {
  coachingFilled: number;
  coachingTotal: number;
  scoutingFilled: number;
  scoutingTotal: number;
  budgetUsed: number;
  budgetTotal: number;
} {
  return {
    coachingFilled: countFilledCoachingPositions(hierarchy),
    coachingTotal: getCoachingPositionKeys().length,
    scoutingFilled: countFilledScoutingPositions(hierarchy),
    scoutingTotal: getScoutingPositionKeys().length,
    budgetUsed: hierarchy.coachingSpend + hierarchy.scoutingSpend,
    budgetTotal: hierarchy.staffBudget,
  };
}

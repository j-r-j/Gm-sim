/**
 * Staff Hierarchy Model
 * Defines the organizational structure of coaching and scouting staff
 */

import { CoachRole, ScoutRole } from './StaffSalary';

/**
 * Staff hierarchy for a team
 * 14 coaching positions + 8 scouting positions = 22 total staff
 */
export interface StaffHierarchy {
  teamId: string;

  // Coaching staff (14 positions)
  headCoach: string | null; // Coach ID
  offensiveCoordinator: string | null;
  defensiveCoordinator: string | null;
  specialTeamsCoordinator: string | null;
  qbCoach: string | null;
  rbCoach: string | null;
  wrCoach: string | null;
  teCoach: string | null;
  olCoach: string | null;
  dlCoach: string | null;
  lbCoach: string | null;
  dbCoach: string | null;
  stCoach: string | null;

  // Scouting staff (8 positions)
  scoutingDirector: string | null;
  nationalScout: string | null;
  regionalScoutNortheast: string | null;
  regionalScoutSoutheast: string | null;
  regionalScoutMidwest: string | null;
  regionalScoutWest: string | null;
  regionalScoutSouthwest: string | null;
  proScout: string | null;

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
  specialTeamsCoordinator: 'headCoach',
  qbCoach: 'offensiveCoordinator',
  rbCoach: 'offensiveCoordinator',
  wrCoach: 'offensiveCoordinator',
  teCoach: 'offensiveCoordinator',
  olCoach: 'offensiveCoordinator',
  dlCoach: 'defensiveCoordinator',
  lbCoach: 'defensiveCoordinator',
  dbCoach: 'defensiveCoordinator',
  stCoach: 'specialTeamsCoordinator',
};

/**
 * Reporting structure for scouts
 */
export const SCOUTING_REPORTS_TO: Record<ScoutRole, ScoutRole | 'gm'> = {
  scoutingDirector: 'gm',
  nationalScout: 'scoutingDirector',
  regionalScout: 'scoutingDirector',
  proScout: 'scoutingDirector',
};

/**
 * Number of coaching positions
 */
export const COACHING_POSITIONS_COUNT = 13; // Not including additional stCoach

/**
 * Number of scouting positions
 */
export const SCOUTING_POSITIONS_COUNT = 8;

/**
 * Total staff positions
 */
export const TOTAL_STAFF_POSITIONS = 21; // 13 coaching + 8 scouting

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
    specialTeamsCoordinator: null,
    qbCoach: null,
    rbCoach: null,
    wrCoach: null,
    teCoach: null,
    olCoach: null,
    dlCoach: null,
    lbCoach: null,
    dbCoach: null,
    stCoach: null,

    // Scouting staff
    scoutingDirector: null,
    nationalScout: null,
    regionalScoutNortheast: null,
    regionalScoutSoutheast: null,
    regionalScoutMidwest: null,
    regionalScoutWest: null,
    regionalScoutSouthwest: null,
    proScout: null,

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
    specialTeamsCoordinator: 'specialTeamsCoordinator',
    qbCoach: 'qbCoach',
    rbCoach: 'rbCoach',
    wrCoach: 'wrCoach',
    teCoach: 'teCoach',
    olCoach: 'olCoach',
    dlCoach: 'dlCoach',
    lbCoach: 'lbCoach',
    dbCoach: 'dbCoach',
    stCoach: 'stCoach',
  };

  return mapping[role];
}

/**
 * Gets all coaching position keys
 */
export function getCoachingPositionKeys(): (keyof StaffHierarchy)[] {
  return [
    'headCoach',
    'offensiveCoordinator',
    'defensiveCoordinator',
    'specialTeamsCoordinator',
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
}

/**
 * Gets all scouting position keys
 */
export function getScoutingPositionKeys(): (keyof StaffHierarchy)[] {
  return [
    'scoutingDirector',
    'nationalScout',
    'regionalScoutNortheast',
    'regionalScoutSoutheast',
    'regionalScoutMidwest',
    'regionalScoutWest',
    'regionalScoutSouthwest',
    'proScout',
  ];
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
    hierarchy.offensiveCoordinator !== null ||
    hierarchy.defensiveCoordinator !== null ||
    hierarchy.specialTeamsCoordinator !== null;

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

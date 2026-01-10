/**
 * Staff Salary Model
 * Defines salary ranges and budget tiers for coaching and scouting staff
 */

/**
 * Coach role types
 */
export type CoachRole =
  | 'headCoach'
  | 'offensiveCoordinator'
  | 'defensiveCoordinator'
  | 'specialTeamsCoordinator'
  | 'qbCoach'
  | 'rbCoach'
  | 'wrCoach'
  | 'teCoach'
  | 'olCoach'
  | 'dlCoach'
  | 'lbCoach'
  | 'dbCoach'
  | 'stCoach';

/**
 * Scout role types
 */
export type ScoutRole = 'scoutingDirector' | 'nationalScout' | 'regionalScout' | 'proScout';

/**
 * Salary range structure
 */
export interface SalaryRange {
  min: number;
  max: number;
}

/**
 * Salary ranges for coaches in dollars per year
 */
export const COACH_SALARY_RANGES: Record<CoachRole, SalaryRange> = {
  headCoach: { min: 8_000_000, max: 18_000_000 },
  offensiveCoordinator: { min: 2_000_000, max: 6_000_000 },
  defensiveCoordinator: { min: 2_000_000, max: 6_000_000 },
  specialTeamsCoordinator: { min: 1_000_000, max: 3_000_000 },
  qbCoach: { min: 500_000, max: 1_500_000 },
  rbCoach: { min: 400_000, max: 1_200_000 },
  wrCoach: { min: 400_000, max: 1_200_000 },
  teCoach: { min: 400_000, max: 1_200_000 },
  olCoach: { min: 500_000, max: 1_500_000 },
  dlCoach: { min: 500_000, max: 1_500_000 },
  lbCoach: { min: 400_000, max: 1_200_000 },
  dbCoach: { min: 500_000, max: 1_500_000 },
  stCoach: { min: 300_000, max: 800_000 },
};

/**
 * Salary ranges for scouts in dollars per year
 */
export const SCOUT_SALARY_RANGES: Record<ScoutRole, SalaryRange> = {
  scoutingDirector: { min: 1_000_000, max: 3_000_000 },
  nationalScout: { min: 500_000, max: 1_200_000 },
  regionalScout: { min: 200_000, max: 600_000 },
  proScout: { min: 300_000, max: 800_000 },
};

/**
 * Staff budget tier type
 */
export type BudgetTier = 'elite' | 'high' | 'mid' | 'low' | 'bottom';

/**
 * Staff budget structure
 */
export interface StaffBudget {
  tier: BudgetTier;
  totalBudget: number;
  coachingBudget: number;
  scoutingBudget: number;
}

/**
 * Budget tier ranges
 */
export const STAFF_BUDGET_TIERS: Record<BudgetTier, SalaryRange> = {
  elite: { min: 35_000_000, max: 40_000_000 },
  high: { min: 25_000_000, max: 30_000_000 },
  mid: { min: 18_000_000, max: 24_000_000 },
  low: { min: 12_000_000, max: 17_000_000 },
  bottom: { min: 8_000_000, max: 11_000_000 },
};

/**
 * All coach roles
 */
export const ALL_COACH_ROLES: CoachRole[] = [
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

/**
 * All scout roles
 */
export const ALL_SCOUT_ROLES: ScoutRole[] = [
  'scoutingDirector',
  'nationalScout',
  'regionalScout',
  'proScout',
];

/**
 * Gets the salary range for a coach role
 */
export function getCoachSalaryRange(role: CoachRole): SalaryRange {
  return COACH_SALARY_RANGES[role];
}

/**
 * Gets the salary range for a scout role
 */
export function getScoutSalaryRange(role: ScoutRole): SalaryRange {
  return SCOUT_SALARY_RANGES[role];
}

/**
 * Validates a salary is within range for a role
 */
export function isValidCoachSalary(role: CoachRole, salary: number): boolean {
  const range = COACH_SALARY_RANGES[role];
  return salary >= range.min && salary <= range.max;
}

/**
 * Validates a salary is within range for a scout role
 */
export function isValidScoutSalary(role: ScoutRole, salary: number): boolean {
  const range = SCOUT_SALARY_RANGES[role];
  return salary >= range.min && salary <= range.max;
}

/**
 * Gets the budget tier for a given total budget
 */
export function getBudgetTier(totalBudget: number): BudgetTier {
  if (totalBudget >= STAFF_BUDGET_TIERS.elite.min) return 'elite';
  if (totalBudget >= STAFF_BUDGET_TIERS.high.min) return 'high';
  if (totalBudget >= STAFF_BUDGET_TIERS.mid.min) return 'mid';
  if (totalBudget >= STAFF_BUDGET_TIERS.low.min) return 'low';
  return 'bottom';
}

/**
 * Creates a staff budget with recommended allocation
 */
export function createStaffBudget(totalBudget: number): StaffBudget {
  // Typical split: 80% coaching, 20% scouting
  const coachingBudget = Math.round(totalBudget * 0.8);
  const scoutingBudget = totalBudget - coachingBudget;

  return {
    tier: getBudgetTier(totalBudget),
    totalBudget,
    coachingBudget,
    scoutingBudget,
  };
}

/**
 * Gets display name for coach role
 */
export function getCoachRoleDisplayName(role: CoachRole): string {
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
 * Gets display name for scout role
 */
export function getScoutRoleDisplayName(role: ScoutRole): string {
  const displayNames: Record<ScoutRole, string> = {
    scoutingDirector: 'Director of Scouting',
    nationalScout: 'National Scout',
    regionalScout: 'Regional Scout',
    proScout: 'Pro Scout',
  };

  return displayNames[role];
}

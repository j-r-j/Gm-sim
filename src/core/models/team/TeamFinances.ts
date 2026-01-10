/**
 * Team Finances Model
 * Tracks salary cap, cap space, dead money, and staff budget
 */

/**
 * Reasons for cap penalties
 */
export type CapPenaltyReason = 'cut' | 'trade' | 'restructure' | 'retirement';

/**
 * A cap penalty from a previous transaction
 */
export interface CapPenalty {
  id: string;
  playerId: string;
  playerName: string;
  reason: CapPenaltyReason;
  amount: number;
  yearsRemaining: number;
}

/**
 * Complete team finances
 */
export interface TeamFinances {
  teamId: string;

  // Salary cap
  salaryCap: number; // League-wide cap
  currentCapUsage: number; // Total committed
  capSpace: number; // Remaining space
  deadMoney: number; // From cuts/trades

  // Projected future
  nextYearCommitted: number;
  twoYearsOutCommitted: number;
  threeYearsOutCommitted: number;

  // Staff budget (separate from player cap)
  staffBudget: number;
  staffSpending: number;

  // Penalties
  capPenalties: CapPenalty[];
}

/**
 * Valid cap penalty reasons
 */
export const ALL_CAP_PENALTY_REASONS: CapPenaltyReason[] = ['cut', 'trade', 'restructure', 'retirement'];

/**
 * Default salary cap value (in thousands)
 */
export const DEFAULT_SALARY_CAP = 255000; // $255 million

/**
 * Default salary floor (percentage of cap)
 */
export const SALARY_FLOOR_PERCENTAGE = 0.89; // 89% of cap

/**
 * Default staff budget (in thousands)
 */
export const DEFAULT_STAFF_BUDGET = 30000; // $30 million

/**
 * Validates a cap penalty
 */
export function validateCapPenalty(penalty: CapPenalty): boolean {
  if (!penalty.id || typeof penalty.id !== 'string') return false;
  if (!penalty.playerId || typeof penalty.playerId !== 'string') return false;
  if (!penalty.playerName || typeof penalty.playerName !== 'string') return false;
  if (!ALL_CAP_PENALTY_REASONS.includes(penalty.reason)) return false;
  if (typeof penalty.amount !== 'number' || penalty.amount < 0) return false;
  if (typeof penalty.yearsRemaining !== 'number' || penalty.yearsRemaining < 0) return false;

  return true;
}

/**
 * Validates team finances
 */
export function validateTeamFinances(finances: TeamFinances): boolean {
  if (!finances.teamId || typeof finances.teamId !== 'string') return false;

  // Salary cap validation
  if (typeof finances.salaryCap !== 'number' || finances.salaryCap < 0) return false;
  if (typeof finances.currentCapUsage !== 'number' || finances.currentCapUsage < 0) return false;
  if (typeof finances.deadMoney !== 'number' || finances.deadMoney < 0) return false;

  // Cap space should match calculation (allow small rounding differences)
  const expectedCapSpace = finances.salaryCap - finances.currentCapUsage;
  if (Math.abs(finances.capSpace - expectedCapSpace) > 1) return false;

  // Future commitments
  if (typeof finances.nextYearCommitted !== 'number' || finances.nextYearCommitted < 0) return false;
  if (typeof finances.twoYearsOutCommitted !== 'number' || finances.twoYearsOutCommitted < 0) return false;
  if (typeof finances.threeYearsOutCommitted !== 'number' || finances.threeYearsOutCommitted < 0)
    return false;

  // Staff budget
  if (typeof finances.staffBudget !== 'number' || finances.staffBudget < 0) return false;
  if (typeof finances.staffSpending !== 'number' || finances.staffSpending < 0) return false;
  if (finances.staffSpending > finances.staffBudget) return false;

  // Cap penalties
  if (!Array.isArray(finances.capPenalties)) return false;
  for (const penalty of finances.capPenalties) {
    if (!validateCapPenalty(penalty)) return false;
  }

  return true;
}

/**
 * Creates default team finances
 */
export function createDefaultTeamFinances(teamId: string, salaryCap: number = DEFAULT_SALARY_CAP): TeamFinances {
  return {
    teamId,
    salaryCap,
    currentCapUsage: 0,
    capSpace: salaryCap,
    deadMoney: 0,
    nextYearCommitted: 0,
    twoYearsOutCommitted: 0,
    threeYearsOutCommitted: 0,
    staffBudget: DEFAULT_STAFF_BUDGET,
    staffSpending: 0,
    capPenalties: [],
  };
}

/**
 * Calculates total dead money from cap penalties
 */
export function calculateDeadMoneyFromPenalties(penalties: CapPenalty[]): number {
  return penalties.reduce((total, penalty) => total + penalty.amount, 0);
}

/**
 * Recalculates cap space based on current usage
 */
export function recalculateCapSpace(finances: TeamFinances): TeamFinances {
  return {
    ...finances,
    capSpace: finances.salaryCap - finances.currentCapUsage,
  };
}

/**
 * Adds a cap penalty
 */
export function addCapPenalty(finances: TeamFinances, penalty: CapPenalty): TeamFinances {
  const newPenalties = [...finances.capPenalties, penalty];
  const newDeadMoney = calculateDeadMoneyFromPenalties(newPenalties);

  return {
    ...finances,
    capPenalties: newPenalties,
    deadMoney: newDeadMoney,
    currentCapUsage: finances.currentCapUsage + penalty.amount,
    capSpace: finances.salaryCap - (finances.currentCapUsage + penalty.amount),
  };
}

/**
 * Advances penalties by one year (reduces years remaining, removes expired)
 */
export function advanceCapPenalties(finances: TeamFinances): TeamFinances {
  const advancedPenalties = finances.capPenalties
    .map((penalty) => ({
      ...penalty,
      yearsRemaining: penalty.yearsRemaining - 1,
    }))
    .filter((penalty) => penalty.yearsRemaining > 0);

  const newDeadMoney = calculateDeadMoneyFromPenalties(advancedPenalties);

  return {
    ...finances,
    capPenalties: advancedPenalties,
    deadMoney: newDeadMoney,
  };
}

/**
 * Checks if team is over the salary cap
 */
export function isOverCap(finances: TeamFinances): boolean {
  return finances.currentCapUsage > finances.salaryCap;
}

/**
 * Checks if team meets the salary floor
 */
export function meetsSalaryFloor(finances: TeamFinances): boolean {
  const floor = finances.salaryCap * SALARY_FLOOR_PERCENTAGE;
  return finances.currentCapUsage >= floor;
}

/**
 * Gets remaining staff budget
 */
export function getRemainingStaffBudget(finances: TeamFinances): number {
  return finances.staffBudget - finances.staffSpending;
}

/**
 * Gets a summary of team finances for display
 */
export function getFinancesSummary(finances: TeamFinances): {
  capUsagePercentage: number;
  capStatus: 'healthy' | 'tight' | 'over';
  deadMoneyPercentage: number;
  staffBudgetRemaining: number;
} {
  const capUsagePercentage = (finances.currentCapUsage / finances.salaryCap) * 100;

  let capStatus: 'healthy' | 'tight' | 'over';
  if (finances.capSpace < 0) {
    capStatus = 'over';
  } else if (capUsagePercentage > 95) {
    capStatus = 'tight';
  } else {
    capStatus = 'healthy';
  }

  return {
    capUsagePercentage,
    capStatus,
    deadMoneyPercentage: (finances.deadMoney / finances.salaryCap) * 100,
    staffBudgetRemaining: getRemainingStaffBudget(finances),
  };
}

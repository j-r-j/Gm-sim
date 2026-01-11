/**
 * Salary Cap Manager
 * Real-time cap tracking, future projections, and rollover handling
 */

import { PlayerContract, getCapHitForYear, advanceContractYear } from './Contract';
import {
  TeamFinances,
  DEFAULT_SALARY_CAP,
  SALARY_FLOOR_PERCENTAGE,
} from '../models/team/TeamFinances';

/**
 * Cap penalty from a transaction
 */
export interface CapPenalty {
  id: string;
  playerId: string;
  playerName: string;
  reason: 'cut' | 'trade' | 'restructure' | 'retirement';
  amount: number;
  year: number;
  yearsRemaining: number;
}

/**
 * Cap projection for a future year
 */
export interface CapProjection {
  year: number;
  projectedCap: number;
  committedSpend: number;
  deadMoney: number;
  projectedSpace: number;
  expiringContracts: number;
  top51CapHits: number;
}

/**
 * Cap status for current year
 */
export interface CapStatus {
  salaryCap: number;
  currentCapUsage: number;
  capSpace: number;
  deadMoney: number;
  effectiveCapSpace: number; // Cap space minus dead money
  percentUsed: number;
  top51Total: number;
  isOverCap: boolean;
  meetsFloor: boolean;
  rolloverFromPreviousYear: number;
}

/**
 * Salary cap state for a team
 */
export interface SalaryCapState {
  teamId: string;
  currentYear: number;
  salaryCap: number;
  baselineCap: number; // League-wide cap before rollover
  rollover: number; // Carried over from previous year
  contracts: Map<string, PlayerContract>;
  penalties: CapPenalty[];
  previousYearUnusedCap: number;
}

/**
 * Creates initial salary cap state
 */
export function createSalaryCapState(
  teamId: string,
  currentYear: number,
  baselineCap: number = DEFAULT_SALARY_CAP
): SalaryCapState {
  return {
    teamId,
    currentYear,
    salaryCap: baselineCap,
    baselineCap,
    rollover: 0,
    contracts: new Map(),
    penalties: [],
    previousYearUnusedCap: 0,
  };
}

/**
 * Adds a contract to cap tracking
 */
export function addContract(state: SalaryCapState, contract: PlayerContract): SalaryCapState {
  const newContracts = new Map(state.contracts);
  newContracts.set(contract.id, contract);

  return {
    ...state,
    contracts: newContracts,
  };
}

/**
 * Removes a contract from cap tracking
 */
export function removeContract(state: SalaryCapState, contractId: string): SalaryCapState {
  const newContracts = new Map(state.contracts);
  newContracts.delete(contractId);

  return {
    ...state,
    contracts: newContracts,
  };
}

/**
 * Adds a cap penalty
 */
export function addCapPenalty(state: SalaryCapState, penalty: CapPenalty): SalaryCapState {
  return {
    ...state,
    penalties: [...state.penalties, penalty],
  };
}

/**
 * Calculates total cap usage for a year
 */
export function calculateCapUsage(state: SalaryCapState, year: number): number {
  let total = 0;

  // Sum all contract cap hits for the year
  for (const contract of state.contracts.values()) {
    total += getCapHitForYear(contract, year);
  }

  // Add penalties for this year
  for (const penalty of state.penalties) {
    if (penalty.year === year) {
      total += penalty.amount;
    }
  }

  return total;
}

/**
 * Gets top 51 cap hits for a year (used during offseason)
 */
export function getTop51CapHits(state: SalaryCapState, year: number): number {
  const capHits: number[] = [];

  for (const contract of state.contracts.values()) {
    const hit = getCapHitForYear(contract, year);
    if (hit > 0) {
      capHits.push(hit);
    }
  }

  // Sort descending and take top 51
  capHits.sort((a, b) => b - a);
  const top51 = capHits.slice(0, 51);

  return top51.reduce((sum, hit) => sum + hit, 0);
}

/**
 * Calculates dead money for a year
 */
export function calculateDeadMoney(state: SalaryCapState, year: number): number {
  return state.penalties.filter((p) => p.year === year).reduce((sum, p) => sum + p.amount, 0);
}

/**
 * Gets current cap status
 */
export function getCapStatus(state: SalaryCapState): CapStatus {
  const currentCapUsage = calculateCapUsage(state, state.currentYear);
  const deadMoney = calculateDeadMoney(state, state.currentYear);
  const capSpace = state.salaryCap - currentCapUsage;
  const top51Total = getTop51CapHits(state, state.currentYear);
  const floor = state.salaryCap * SALARY_FLOOR_PERCENTAGE;

  return {
    salaryCap: state.salaryCap,
    currentCapUsage,
    capSpace,
    deadMoney,
    effectiveCapSpace: capSpace,
    percentUsed: (currentCapUsage / state.salaryCap) * 100,
    top51Total,
    isOverCap: capSpace < 0,
    meetsFloor: currentCapUsage >= floor,
    rolloverFromPreviousYear: state.rollover,
  };
}

/**
 * Projects cap for future years
 */
export function projectCap(
  state: SalaryCapState,
  yearsAhead: number = 3,
  annualCapGrowth: number = 0.08 // ~8% annual cap growth
): CapProjection[] {
  const projections: CapProjection[] = [];
  let projectedCap = state.salaryCap;

  for (let i = 0; i <= yearsAhead; i++) {
    const year = state.currentYear + i;

    // Grow cap each year (except current)
    if (i > 0) {
      projectedCap = Math.round(projectedCap * (1 + annualCapGrowth));
    }

    const committedSpend = calculateCapUsage(state, year);
    const deadMoney = calculateDeadMoney(state, year);

    // Count expiring contracts
    let expiringContracts = 0;
    for (const contract of state.contracts.values()) {
      const lastYear = contract.signedYear + contract.totalYears - 1;
      if (lastYear === year) {
        expiringContracts++;
      }
    }

    projections.push({
      year,
      projectedCap,
      committedSpend,
      deadMoney,
      projectedSpace: projectedCap - committedSpend,
      expiringContracts,
      top51CapHits: getTop51CapHits(state, year),
    });
  }

  return projections;
}

/**
 * Calculates rollover amount
 */
export function calculateRollover(state: SalaryCapState): number {
  const capUsage = calculateCapUsage(state, state.currentYear);
  const unusedCap = Math.max(0, state.salaryCap - capUsage);
  return unusedCap;
}

/**
 * Advances to next year with rollover
 */
export function advanceCapYear(state: SalaryCapState, newBaselineCap: number): SalaryCapState {
  // Calculate rollover from unused cap
  const rollover = calculateRollover(state);

  // Advance all contracts
  const newContracts = new Map<string, PlayerContract>();
  for (const [id, contract] of state.contracts) {
    const advanced = advanceContractYear(contract);
    if (advanced && advanced.status === 'active') {
      newContracts.set(id, advanced);
    }
  }

  // Advance penalties (reduce years remaining, remove expired)
  const newPenalties = state.penalties
    .map((p) => ({
      ...p,
      yearsRemaining: p.yearsRemaining - 1,
    }))
    .filter((p) => p.yearsRemaining > 0);

  return {
    ...state,
    currentYear: state.currentYear + 1,
    salaryCap: newBaselineCap + rollover,
    baselineCap: newBaselineCap,
    rollover,
    contracts: newContracts,
    penalties: newPenalties,
    previousYearUnusedCap: rollover,
  };
}

/**
 * Gets contracts by cap hit (sorted highest to lowest)
 */
export function getContractsByCapHit(
  state: SalaryCapState,
  year?: number
): { contract: PlayerContract; capHit: number }[] {
  const targetYear = year ?? state.currentYear;
  const contractHits: { contract: PlayerContract; capHit: number }[] = [];

  for (const contract of state.contracts.values()) {
    const capHit = getCapHitForYear(contract, targetYear);
    if (capHit > 0) {
      contractHits.push({ contract, capHit });
    }
  }

  return contractHits.sort((a, b) => b.capHit - a.capHit);
}

/**
 * Gets expiring contracts for a year
 */
export function getExpiringContracts(state: SalaryCapState, year?: number): PlayerContract[] {
  const targetYear = year ?? state.currentYear;
  const expiring: PlayerContract[] = [];

  for (const contract of state.contracts.values()) {
    const lastYear = contract.signedYear + contract.totalYears - 1;
    if (lastYear === targetYear) {
      expiring.push(contract);
    }
  }

  return expiring;
}

/**
 * Checks if team can afford a new contract
 */
export function canAffordContract(state: SalaryCapState, firstYearCapHit: number): boolean {
  const status = getCapStatus(state);
  return status.capSpace >= firstYearCapHit;
}

/**
 * Gets effective cap space (accounts for minimum roster requirements)
 */
export function getEffectiveCapSpace(state: SalaryCapState): number {
  const status = getCapStatus(state);
  const contractCount = state.contracts.size;

  // If under roster minimum (53), need to reserve space for minimum contracts
  const rosterMinimum = 53;
  const minimumSalary = 795; // Minimum rookie salary in thousands

  if (contractCount < rosterMinimum) {
    const slotsNeeded = rosterMinimum - contractCount;
    const reservedSpace = slotsNeeded * minimumSalary;
    return Math.max(0, status.capSpace - reservedSpace);
  }

  return status.capSpace;
}

/**
 * Gets cap summary for display
 */
export function getCapSummary(state: SalaryCapState): {
  capStatusDescription: string;
  spaceDescription: string;
  deadMoneyDescription: string;
  flexibilityRating: 'excellent' | 'good' | 'moderate' | 'limited' | 'critical';
} {
  const status = getCapStatus(state);
  const deadMoneyPct = (status.deadMoney / status.salaryCap) * 100;

  let capStatusDescription: string;
  if (status.isOverCap) {
    capStatusDescription = 'Over the cap - must make moves to comply';
  } else if (status.percentUsed > 95) {
    capStatusDescription = 'Very tight cap situation';
  } else if (status.percentUsed > 85) {
    capStatusDescription = 'Limited cap flexibility';
  } else if (status.percentUsed > 70) {
    capStatusDescription = 'Moderate cap room available';
  } else {
    capStatusDescription = 'Significant cap space available';
  }

  let spaceDescription: string;
  const spaceInMillions = status.capSpace / 1000;
  if (status.capSpace < 0) {
    spaceDescription = `$${Math.abs(spaceInMillions).toFixed(1)}M over cap`;
  } else if (status.capSpace < 5000) {
    spaceDescription = `$${spaceInMillions.toFixed(1)}M available`;
  } else if (status.capSpace < 20000) {
    spaceDescription = `$${spaceInMillions.toFixed(0)}M available`;
  } else {
    spaceDescription = `$${spaceInMillions.toFixed(0)}M+ available`;
  }

  let deadMoneyDescription: string;
  if (deadMoneyPct < 1) {
    deadMoneyDescription = 'Minimal dead money';
  } else if (deadMoneyPct < 5) {
    deadMoneyDescription = 'Low dead money obligations';
  } else if (deadMoneyPct < 10) {
    deadMoneyDescription = 'Moderate dead money burden';
  } else {
    deadMoneyDescription = 'Significant dead money issues';
  }

  let flexibilityRating: 'excellent' | 'good' | 'moderate' | 'limited' | 'critical';
  if (status.isOverCap) {
    flexibilityRating = 'critical';
  } else if (status.percentUsed > 95) {
    flexibilityRating = 'limited';
  } else if (status.percentUsed > 85) {
    flexibilityRating = 'moderate';
  } else if (status.percentUsed > 70) {
    flexibilityRating = 'good';
  } else {
    flexibilityRating = 'excellent';
  }

  return {
    capStatusDescription,
    spaceDescription,
    deadMoneyDescription,
    flexibilityRating,
  };
}

/**
 * Validates salary cap state
 */
export function validateSalaryCapState(state: SalaryCapState): boolean {
  if (!state.teamId || typeof state.teamId !== 'string') return false;
  if (typeof state.currentYear !== 'number') return false;
  if (state.currentYear < 2000 || state.currentYear > 2100) return false;
  if (typeof state.salaryCap !== 'number' || state.salaryCap < 0) return false;
  if (typeof state.baselineCap !== 'number' || state.baselineCap < 0) return false;
  if (typeof state.rollover !== 'number' || state.rollover < 0) return false;
  if (!(state.contracts instanceof Map)) return false;

  for (const penalty of state.penalties) {
    if (typeof penalty.amount !== 'number' || penalty.amount < 0) return false;
    if (typeof penalty.yearsRemaining !== 'number' || penalty.yearsRemaining < 0) return false;
  }

  return true;
}

/**
 * Updates team finances from cap state
 */
export function syncTeamFinances(finances: TeamFinances, capState: SalaryCapState): TeamFinances {
  const status = getCapStatus(capState);
  const projections = projectCap(capState, 3);

  return {
    ...finances,
    salaryCap: capState.salaryCap,
    currentCapUsage: status.currentCapUsage,
    capSpace: status.capSpace,
    deadMoney: status.deadMoney,
    nextYearCommitted: projections[1]?.committedSpend ?? 0,
    twoYearsOutCommitted: projections[2]?.committedSpend ?? 0,
    threeYearsOutCommitted: projections[3]?.committedSpend ?? 0,
  };
}

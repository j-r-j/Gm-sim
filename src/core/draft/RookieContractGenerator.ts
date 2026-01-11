/**
 * Rookie Contract Generator
 * Generates slotted 4-year contracts with 5th year options for first round picks.
 */

import { DraftPick } from '../models/league/DraftPick';

/**
 * Rookie contract structure
 */
export interface RookieContract {
  /** Unique contract ID */
  id: string;
  /** Player ID */
  playerId: string;
  /** Team ID */
  teamId: string;
  /** Draft year */
  draftYear: number;
  /** Overall pick number */
  overallPick: number;
  /** Round drafted */
  round: number;
  /** Total contract length in years */
  years: number;
  /** Total contract value (thousands) */
  totalValue: number;
  /** Guaranteed money (thousands) */
  guaranteed: number;
  /** Year-by-year salary breakdown (thousands) */
  yearlyBreakdown: YearlyContractBreakdown[];
  /** Signing bonus (thousands) */
  signingBonus: number;
  /** Whether this pick has a 5th year option */
  hasFifthYearOption: boolean;
  /** 5th year option details (null if not applicable) */
  fifthYearOption: FifthYearOption | null;
}

/**
 * Yearly contract breakdown
 */
export interface YearlyContractBreakdown {
  year: number;
  baseSalary: number;
  prorationedBonus: number;
  capHit: number;
  isGuaranteed: boolean;
}

/**
 * 5th year option details
 */
export interface FifthYearOption {
  /** Year the option would be exercised */
  optionYear: number;
  /** Deadline to exercise (May 3rd of 4th year) */
  exerciseDeadline: string;
  /** Estimated option salary (top 10 at position or average of 3-25) */
  estimatedSalary: number;
  /** Whether option has been exercised */
  exercised: boolean;
  /** Whether option has been declined */
  declined: boolean;
  /** Whether option salary is fully guaranteed */
  fullyGuaranteed: boolean;
}

/**
 * Rookie wage scale for 2024 (in thousands)
 * Based on actual NFL rookie pool allocations
 */
const ROOKIE_WAGE_SCALE: Record<number, { totalValue: number; signingBonus: number }> = {
  1: { totalValue: 41200, signingBonus: 28500 },
  2: { totalValue: 36800, signingBonus: 24800 },
  3: { totalValue: 33200, signingBonus: 21600 },
  4: { totalValue: 30000, signingBonus: 19000 },
  5: { totalValue: 27500, signingBonus: 17000 },
  6: { totalValue: 25600, signingBonus: 15200 },
  7: { totalValue: 24000, signingBonus: 13800 },
  8: { totalValue: 22600, signingBonus: 12600 },
  9: { totalValue: 21400, signingBonus: 11500 },
  10: { totalValue: 20300, signingBonus: 10600 },
  11: { totalValue: 19300, signingBonus: 9800 },
  12: { totalValue: 18400, signingBonus: 9100 },
  13: { totalValue: 17600, signingBonus: 8500 },
  14: { totalValue: 16900, signingBonus: 7900 },
  15: { totalValue: 16200, signingBonus: 7400 },
  16: { totalValue: 15600, signingBonus: 6900 },
  17: { totalValue: 15000, signingBonus: 6500 },
  18: { totalValue: 14500, signingBonus: 6100 },
  19: { totalValue: 14000, signingBonus: 5800 },
  20: { totalValue: 13600, signingBonus: 5500 },
  21: { totalValue: 13200, signingBonus: 5200 },
  22: { totalValue: 12800, signingBonus: 4900 },
  23: { totalValue: 12500, signingBonus: 4700 },
  24: { totalValue: 12200, signingBonus: 4500 },
  25: { totalValue: 11900, signingBonus: 4300 },
  26: { totalValue: 11600, signingBonus: 4100 },
  27: { totalValue: 11400, signingBonus: 3900 },
  28: { totalValue: 11100, signingBonus: 3800 },
  29: { totalValue: 10900, signingBonus: 3600 },
  30: { totalValue: 10700, signingBonus: 3500 },
  31: { totalValue: 10500, signingBonus: 3400 },
  32: { totalValue: 10300, signingBonus: 3300 },
  // Round 2
  33: { totalValue: 9200, signingBonus: 2200 },
  34: { totalValue: 9000, signingBonus: 2100 },
  35: { totalValue: 8800, signingBonus: 2000 },
  36: { totalValue: 8600, signingBonus: 1900 },
  37: { totalValue: 8400, signingBonus: 1800 },
  38: { totalValue: 8200, signingBonus: 1700 },
  39: { totalValue: 8000, signingBonus: 1650 },
  40: { totalValue: 7800, signingBonus: 1600 },
  41: { totalValue: 7650, signingBonus: 1550 },
  42: { totalValue: 7500, signingBonus: 1500 },
  43: { totalValue: 7350, signingBonus: 1450 },
  44: { totalValue: 7200, signingBonus: 1400 },
  45: { totalValue: 7050, signingBonus: 1350 },
  46: { totalValue: 6900, signingBonus: 1300 },
  47: { totalValue: 6750, signingBonus: 1250 },
  48: { totalValue: 6600, signingBonus: 1200 },
  49: { totalValue: 6500, signingBonus: 1150 },
  50: { totalValue: 6400, signingBonus: 1100 },
  51: { totalValue: 6300, signingBonus: 1050 },
  52: { totalValue: 6200, signingBonus: 1000 },
  53: { totalValue: 6100, signingBonus: 960 },
  54: { totalValue: 6000, signingBonus: 920 },
  55: { totalValue: 5900, signingBonus: 880 },
  56: { totalValue: 5800, signingBonus: 850 },
  57: { totalValue: 5700, signingBonus: 820 },
  58: { totalValue: 5600, signingBonus: 790 },
  59: { totalValue: 5500, signingBonus: 760 },
  60: { totalValue: 5450, signingBonus: 730 },
  61: { totalValue: 5400, signingBonus: 700 },
  62: { totalValue: 5350, signingBonus: 680 },
  63: { totalValue: 5300, signingBonus: 660 },
  64: { totalValue: 5250, signingBonus: 640 },
};

/**
 * Default contract values for later rounds (thousands)
 */
const LATER_ROUND_DEFAULTS: Record<number, { totalValue: number; signingBonus: number }> = {
  3: { totalValue: 5000, signingBonus: 500 },
  4: { totalValue: 4400, signingBonus: 300 },
  5: { totalValue: 4100, signingBonus: 200 },
  6: { totalValue: 3900, signingBonus: 150 },
  7: { totalValue: 3800, signingBonus: 100 },
};

/**
 * Base rookie minimum salary (thousands)
 */
export const ROOKIE_MINIMUM_SALARY = 795;

/**
 * Annual salary escalation percentage
 */
const ANNUAL_ESCALATION = 0.05; // 5% per year

/**
 * Gets contract slot values for a pick
 */
export function getSlotValues(
  overallPick: number,
  round: number
): { totalValue: number; signingBonus: number } {
  // Check specific slot first
  if (ROOKIE_WAGE_SCALE[overallPick]) {
    return ROOKIE_WAGE_SCALE[overallPick];
  }

  // Fall back to round defaults
  if (LATER_ROUND_DEFAULTS[round]) {
    return LATER_ROUND_DEFAULTS[round];
  }

  // Default minimum contract
  return { totalValue: 3800, signingBonus: 50 };
}

/**
 * Calculates yearly breakdown for a rookie contract
 */
export function calculateYearlyBreakdown(
  totalValue: number,
  signingBonus: number,
  years: number,
  round: number,
  draftYear: number
): YearlyContractBreakdown[] {
  const breakdown: YearlyContractBreakdown[] = [];
  const proratedBonusPerYear = signingBonus / years;

  // Calculate base remaining after bonus
  const baseSalaryPool = totalValue - signingBonus;

  // Year 1 starts at minimum, escalates each year
  let yearOneSalary = ROOKIE_MINIMUM_SALARY;
  const escalationFactor = ANNUAL_ESCALATION;

  // Adjust year 1 salary based on round
  if (round === 1) {
    yearOneSalary = baseSalaryPool * 0.18; // ~18% in year 1 for 1st rounders
  } else if (round === 2) {
    yearOneSalary = baseSalaryPool * 0.2;
  } else {
    yearOneSalary = Math.max(ROOKIE_MINIMUM_SALARY, baseSalaryPool * 0.22);
  }

  let currentSalary = yearOneSalary;

  for (let i = 0; i < years; i++) {
    const year = draftYear + i;
    const baseSalary = Math.round(currentSalary);
    const prorationedBonus = Math.round(proratedBonusPerYear);
    const capHit = baseSalary + prorationedBonus;

    // Guarantees: Rounds 1-2 are fully guaranteed, 3-7 have partial guarantees
    let isGuaranteed = false;
    if (round <= 2) {
      isGuaranteed = true; // All years guaranteed for rounds 1-2
    } else if (i === 0) {
      isGuaranteed = true; // Year 1 guaranteed for all picks
    } else if (round <= 4 && i === 1) {
      isGuaranteed = true; // Year 2 guaranteed for rounds 3-4
    }

    breakdown.push({
      year,
      baseSalary,
      prorationedBonus,
      capHit,
      isGuaranteed,
    });

    // Escalate for next year
    currentSalary *= 1 + escalationFactor;
  }

  return breakdown;
}

/**
 * Calculates guaranteed money
 */
function calculateGuaranteedMoney(breakdown: YearlyContractBreakdown[]): number {
  return breakdown.filter((y) => y.isGuaranteed).reduce((sum, y) => sum + y.capHit, 0);
}

/**
 * Creates a 5th year option for first round picks
 */
function createFifthYearOption(draftYear: number, overallPick: number): FifthYearOption {
  // 5th year option salary is based on pick position
  // Top 10 picks get salary of top 10 at their position
  // Picks 11-32 get average of picks 3-25 at their position
  const isTop10 = overallPick <= 10;

  // Estimated salary (simplified)
  const estimatedSalary = isTop10 ? 25000 : 18000;

  return {
    optionYear: draftYear + 4,
    exerciseDeadline: `May 3, ${draftYear + 3}`,
    estimatedSalary,
    exercised: false,
    declined: false,
    fullyGuaranteed: true, // 5th year options are now fully guaranteed when exercised
  };
}

/**
 * Generates a rookie contract for a draft pick
 */
export function generateRookieContract(pick: DraftPick, playerId: string): RookieContract {
  if (pick.overallPick === null) {
    throw new Error('Pick must have overall pick number assigned');
  }

  const slotValues = getSlotValues(pick.overallPick, pick.round);
  const years = 4; // All rookie contracts are 4 years

  const yearlyBreakdown = calculateYearlyBreakdown(
    slotValues.totalValue,
    slotValues.signingBonus,
    years,
    pick.round,
    pick.year
  );

  const guaranteed = calculateGuaranteedMoney(yearlyBreakdown);
  const hasFifthYearOption = pick.round === 1;

  return {
    id: `contract-${pick.year}-${pick.overallPick}-${playerId}`,
    playerId,
    teamId: pick.currentTeamId,
    draftYear: pick.year,
    overallPick: pick.overallPick,
    round: pick.round,
    years,
    totalValue: slotValues.totalValue,
    guaranteed,
    yearlyBreakdown,
    signingBonus: slotValues.signingBonus,
    hasFifthYearOption,
    fifthYearOption: hasFifthYearOption ? createFifthYearOption(pick.year, pick.overallPick) : null,
  };
}

/**
 * Exercises the 5th year option
 */
export function exerciseFifthYearOption(contract: RookieContract): RookieContract {
  if (!contract.hasFifthYearOption || !contract.fifthYearOption) {
    throw new Error('Contract does not have a 5th year option');
  }

  if (contract.fifthYearOption.exercised) {
    throw new Error('5th year option has already been exercised');
  }

  const newFifthYearOption: FifthYearOption = {
    ...contract.fifthYearOption,
    exercised: true,
  };

  // Add 5th year to breakdown
  const fifthYearBreakdown: YearlyContractBreakdown = {
    year: contract.fifthYearOption.optionYear,
    baseSalary: contract.fifthYearOption.estimatedSalary,
    prorationedBonus: 0,
    capHit: contract.fifthYearOption.estimatedSalary,
    isGuaranteed: true, // 5th year options are fully guaranteed
  };

  return {
    ...contract,
    years: 5,
    totalValue: contract.totalValue + contract.fifthYearOption.estimatedSalary,
    guaranteed: contract.guaranteed + contract.fifthYearOption.estimatedSalary,
    yearlyBreakdown: [...contract.yearlyBreakdown, fifthYearBreakdown],
    fifthYearOption: newFifthYearOption,
  };
}

/**
 * Declines the 5th year option
 */
export function declineFifthYearOption(contract: RookieContract): RookieContract {
  if (!contract.hasFifthYearOption || !contract.fifthYearOption) {
    throw new Error('Contract does not have a 5th year option');
  }

  if (contract.fifthYearOption.declined) {
    throw new Error('5th year option has already been declined');
  }

  if (contract.fifthYearOption.exercised) {
    throw new Error('Cannot decline an already exercised option');
  }

  return {
    ...contract,
    fifthYearOption: {
      ...contract.fifthYearOption,
      declined: true,
    },
  };
}

/**
 * Gets cap hit for a specific year
 */
export function getCapHitForYear(contract: RookieContract, year: number): number {
  const yearBreakdown = contract.yearlyBreakdown.find((y) => y.year === year);
  return yearBreakdown?.capHit || 0;
}

/**
 * Gets remaining years on contract
 */
export function getRemainingYears(contract: RookieContract, currentYear: number): number {
  const lastYear = contract.draftYear + contract.years - 1;
  return Math.max(0, lastYear - currentYear + 1);
}

/**
 * Gets remaining guaranteed money
 */
export function getRemainingGuaranteed(contract: RookieContract, currentYear: number): number {
  return contract.yearlyBreakdown
    .filter((y) => y.year >= currentYear && y.isGuaranteed)
    .reduce((sum, y) => sum + y.capHit, 0);
}

/**
 * Gets dead cap if player is released
 */
export function getDeadCap(contract: RookieContract, currentYear: number): number {
  // Dead cap = remaining prorated bonus + any guaranteed salary
  const remainingYears = contract.yearlyBreakdown.filter((y) => y.year >= currentYear);
  const remainingBonus = remainingYears.reduce((sum, y) => sum + y.prorationedBonus, 0);
  const guaranteedSalary = remainingYears
    .filter((y) => y.isGuaranteed)
    .reduce((sum, y) => sum + y.baseSalary, 0);

  return remainingBonus + guaranteedSalary;
}

/**
 * Contract summary for display
 */
export interface ContractSummary {
  totalValue: string;
  guaranteed: string;
  years: number;
  averageAnnualValue: string;
  hasFifthYearOption: boolean;
  fifthYearStatus: 'available' | 'exercised' | 'declined' | 'none';
}

/**
 * Gets contract summary for display
 */
export function getContractSummary(contract: RookieContract): ContractSummary {
  const formatMoney = (value: number): string => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}M`;
    }
    return `$${value}K`;
  };

  let fifthYearStatus: ContractSummary['fifthYearStatus'] = 'none';
  if (contract.hasFifthYearOption && contract.fifthYearOption) {
    if (contract.fifthYearOption.exercised) {
      fifthYearStatus = 'exercised';
    } else if (contract.fifthYearOption.declined) {
      fifthYearStatus = 'declined';
    } else {
      fifthYearStatus = 'available';
    }
  }

  return {
    totalValue: formatMoney(contract.totalValue),
    guaranteed: formatMoney(contract.guaranteed),
    years: contract.years,
    averageAnnualValue: formatMoney(contract.totalValue / contract.years),
    hasFifthYearOption: contract.hasFifthYearOption,
    fifthYearStatus,
  };
}

/**
 * Validates a rookie contract
 */
export function validateRookieContract(contract: RookieContract): boolean {
  if (!contract.id || typeof contract.id !== 'string') return false;
  if (!contract.playerId || typeof contract.playerId !== 'string') return false;
  if (!contract.teamId || typeof contract.teamId !== 'string') return false;

  if (typeof contract.draftYear !== 'number') return false;
  if (contract.draftYear < 2000 || contract.draftYear > 2100) return false;

  if (typeof contract.overallPick !== 'number') return false;
  if (contract.overallPick < 1 || contract.overallPick > 300) return false;

  if (typeof contract.round !== 'number') return false;
  if (contract.round < 1 || contract.round > 7) return false;

  if (typeof contract.years !== 'number') return false;
  if (contract.years < 4 || contract.years > 5) return false;

  if (typeof contract.totalValue !== 'number' || contract.totalValue < 0) return false;
  if (typeof contract.guaranteed !== 'number' || contract.guaranteed < 0) return false;
  if (typeof contract.signingBonus !== 'number' || contract.signingBonus < 0) return false;

  if (!Array.isArray(contract.yearlyBreakdown)) return false;
  if (contract.yearlyBreakdown.length !== contract.years) return false;

  // 5th year option only for round 1
  if (contract.hasFifthYearOption && contract.round !== 1) return false;

  return true;
}

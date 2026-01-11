/**
 * Player Contract Model
 * Complete contract system with years, value, guarantees, signing bonus proration,
 * cap hits, and dead money calculations.
 */

import { Position } from '../models/player/Position';

/**
 * Contract status
 */
export type ContractStatus = 'active' | 'expired' | 'voided' | 'restructured';

/**
 * Contract type
 */
export type ContractType = 'rookie' | 'veteran' | 'extension' | 'franchise_tag' | 'transition_tag';

/**
 * Yearly contract breakdown
 */
export interface ContractYear {
  /** Season year */
  year: number;
  /** Base salary for this year (thousands) */
  baseSalary: number;
  /** Prorated signing bonus for this year (thousands) */
  prorationedBonus: number;
  /** Roster bonus (thousands) */
  rosterBonus: number;
  /** Workout bonus (thousands) */
  workoutBonus: number;
  /** Option bonus (thousands) */
  optionBonus: number;
  /** Incentives (thousands) - likely to be earned */
  incentivesLTBE: number;
  /** Incentives (thousands) - not likely to be earned */
  incentivesNLTBE: number;
  /** Total cap hit for this year (thousands) */
  capHit: number;
  /** Is this year's salary guaranteed? */
  isGuaranteed: boolean;
  /** Is this year's salary guaranteed for injury only? */
  isGuaranteedForInjury: boolean;
  /** Is this a void year? */
  isVoidYear: boolean;
}

/**
 * Full player contract
 */
export interface PlayerContract {
  /** Unique contract ID */
  id: string;
  /** Player ID */
  playerId: string;
  /** Player name (for display/dead money tracking) */
  playerName: string;
  /** Team ID */
  teamId: string;
  /** Player position */
  position: Position;
  /** Contract status */
  status: ContractStatus;
  /** Contract type */
  type: ContractType;
  /** Year contract was signed */
  signedYear: number;
  /** Total contract length in years */
  totalYears: number;
  /** Remaining years on contract */
  yearsRemaining: number;
  /** Total contract value (thousands) */
  totalValue: number;
  /** Total guaranteed money (thousands) */
  guaranteedMoney: number;
  /** Signing bonus (thousands) */
  signingBonus: number;
  /** Average annual value (thousands) */
  averageAnnualValue: number;
  /** Year-by-year breakdown */
  yearlyBreakdown: ContractYear[];
  /** Number of void years at end of contract */
  voidYears: number;
  /** Has no-trade clause? */
  hasNoTradeClause: boolean;
  /** Has no-tag clause? */
  hasNoTagClause: boolean;
  /** Original contract ID if restructured */
  originalContractId: string | null;
  /** Contract notes/history */
  notes: string[];
}

/**
 * Contract offer (for negotiations)
 */
export interface ContractOffer {
  /** Total years offered */
  years: number;
  /** Total value offered (thousands) */
  totalValue: number;
  /** Guaranteed money offered (thousands) */
  guaranteedMoney: number;
  /** Signing bonus offered (thousands) */
  signingBonus: number;
  /** First year base salary (thousands) */
  firstYearSalary: number;
  /** Annual salary escalation percentage (0-0.2) */
  annualEscalation: number;
  /** Include no-trade clause? */
  noTradeClause: boolean;
  /** Number of void years */
  voidYears: number;
}

/**
 * Creates a unique contract ID
 */
export function createContractId(playerId: string, signedYear: number): string {
  return `contract-${playerId}-${signedYear}-${Date.now()}`;
}

/**
 * Calculates yearly breakdown from contract offer
 */
export function calculateYearlyBreakdown(offer: ContractOffer, signedYear: number): ContractYear[] {
  const breakdown: ContractYear[] = [];
  const proratedBonusPerYear = offer.signingBonus / (offer.years + offer.voidYears);
  let currentSalary = offer.firstYearSalary;

  // Calculate remaining value after signing bonus for regular years
  const remainingValue = offer.totalValue - offer.signingBonus;
  const totalEscalationFactor = Array.from({ length: offer.years }, (_, i) =>
    Math.pow(1 + offer.annualEscalation, i)
  ).reduce((a, b) => a + b, 0);

  // Calculate year 1 base from remaining value
  const year1Base = remainingValue / totalEscalationFactor;
  currentSalary = offer.firstYearSalary || year1Base;

  // Calculate guaranteed years (typically first 2-3 years for larger deals)
  const guaranteedYears = Math.ceil(offer.guaranteedMoney / (offer.totalValue / offer.years));

  for (let i = 0; i < offer.years; i++) {
    const year = signedYear + i;
    const baseSalary = Math.round(currentSalary);
    const prorationedBonus = Math.round(proratedBonusPerYear);
    const capHit = baseSalary + prorationedBonus;

    breakdown.push({
      year,
      baseSalary,
      prorationedBonus,
      rosterBonus: 0,
      workoutBonus: 0,
      optionBonus: 0,
      incentivesLTBE: 0,
      incentivesNLTBE: 0,
      capHit,
      isGuaranteed: i < guaranteedYears,
      isGuaranteedForInjury: i < guaranteedYears + 1,
      isVoidYear: false,
    });

    // Apply escalation for next year
    currentSalary *= 1 + offer.annualEscalation;
  }

  // Add void years
  for (let i = 0; i < offer.voidYears; i++) {
    const year = signedYear + offer.years + i;
    breakdown.push({
      year,
      baseSalary: 0,
      prorationedBonus: Math.round(proratedBonusPerYear),
      rosterBonus: 0,
      workoutBonus: 0,
      optionBonus: 0,
      incentivesLTBE: 0,
      incentivesNLTBE: 0,
      capHit: Math.round(proratedBonusPerYear),
      isGuaranteed: false,
      isGuaranteedForInjury: false,
      isVoidYear: true,
    });
  }

  return breakdown;
}

/**
 * Creates a player contract from an offer
 */
export function createPlayerContract(
  playerId: string,
  playerName: string,
  teamId: string,
  position: Position,
  offer: ContractOffer,
  signedYear: number,
  type: ContractType = 'veteran'
): PlayerContract {
  const yearlyBreakdown = calculateYearlyBreakdown(offer, signedYear);

  return {
    id: createContractId(playerId, signedYear),
    playerId,
    playerName,
    teamId,
    position,
    status: 'active',
    type,
    signedYear,
    totalYears: offer.years,
    yearsRemaining: offer.years,
    totalValue: offer.totalValue,
    guaranteedMoney: offer.guaranteedMoney,
    signingBonus: offer.signingBonus,
    averageAnnualValue: Math.round(offer.totalValue / offer.years),
    yearlyBreakdown,
    voidYears: offer.voidYears,
    hasNoTradeClause: offer.noTradeClause,
    hasNoTagClause: false,
    originalContractId: null,
    notes: [`Signed ${offer.years}-year, $${(offer.totalValue / 1000).toFixed(1)}M contract`],
  };
}

/**
 * Gets the cap hit for a specific year
 */
export function getCapHitForYear(contract: PlayerContract, year: number): number {
  const yearData = contract.yearlyBreakdown.find((y) => y.year === year);
  return yearData?.capHit ?? 0;
}

/**
 * Gets the current year's cap hit
 */
export function getCurrentCapHit(contract: PlayerContract, currentYear: number): number {
  return getCapHitForYear(contract, currentYear);
}

/**
 * Calculates remaining prorated bonus
 */
export function getRemainingProration(contract: PlayerContract, currentYear: number): number {
  return contract.yearlyBreakdown
    .filter((y) => y.year >= currentYear)
    .reduce((sum, y) => sum + y.prorationedBonus, 0);
}

/**
 * Calculates remaining guaranteed money
 */
export function getRemainingGuaranteed(contract: PlayerContract, currentYear: number): number {
  return contract.yearlyBreakdown
    .filter((y) => y.year >= currentYear && y.isGuaranteed && !y.isVoidYear)
    .reduce((sum, y) => sum + y.baseSalary + y.prorationedBonus, 0);
}

/**
 * Calculates dead money if player is cut
 */
export function calculateDeadMoney(contract: PlayerContract, currentYear: number): number {
  // Dead money = remaining prorated bonus + guaranteed salary
  const remainingProration = getRemainingProration(contract, currentYear);
  const guaranteedSalary = contract.yearlyBreakdown
    .filter((y) => y.year >= currentYear && y.isGuaranteed && !y.isVoidYear)
    .reduce((sum, y) => sum + y.baseSalary, 0);

  return remainingProration + guaranteedSalary;
}

/**
 * Calculates cap savings if player is cut
 */
export function calculateCapSavings(contract: PlayerContract, currentYear: number): number {
  const currentCapHit = getCurrentCapHit(contract, currentYear);
  const deadMoney = calculateDeadMoney(contract, currentYear);
  return currentCapHit - deadMoney;
}

/**
 * Calculates dead money for post-June 1 cut
 */
export function calculatePostJune1DeadMoney(
  contract: PlayerContract,
  currentYear: number
): {
  year1DeadMoney: number;
  year2DeadMoney: number;
} {
  // Post-June 1: Current year's prorated bonus hits this year
  // Remaining years' proration hits next year
  const currentYearData = contract.yearlyBreakdown.find((y) => y.year === currentYear);
  const futureYears = contract.yearlyBreakdown.filter((y) => y.year > currentYear);

  const year1DeadMoney =
    (currentYearData?.prorationedBonus ?? 0) +
    contract.yearlyBreakdown
      .filter((y) => y.year === currentYear && y.isGuaranteed && !y.isVoidYear)
      .reduce((sum, y) => sum + y.baseSalary, 0);

  const year2DeadMoney =
    futureYears.reduce((sum, y) => sum + y.prorationedBonus, 0) +
    futureYears
      .filter((y) => y.isGuaranteed && !y.isVoidYear)
      .reduce((sum, y) => sum + y.baseSalary, 0);

  return { year1DeadMoney, year2DeadMoney };
}

/**
 * Advances contract by one year
 */
export function advanceContractYear(contract: PlayerContract): PlayerContract | null {
  if (contract.yearsRemaining <= 0 || contract.status !== 'active') {
    return null;
  }

  const newYearsRemaining = contract.yearsRemaining - 1;

  if (newYearsRemaining <= 0) {
    return {
      ...contract,
      yearsRemaining: 0,
      status: 'expired',
    };
  }

  return {
    ...contract,
    yearsRemaining: newYearsRemaining,
  };
}

/**
 * Checks if contract is expiring this year
 */
export function isExpiringContract(contract: PlayerContract): boolean {
  return contract.yearsRemaining === 1 && contract.status === 'active';
}

/**
 * Gets the final year of the contract
 */
export function getContractEndYear(contract: PlayerContract): number {
  return contract.signedYear + contract.totalYears - 1;
}

/**
 * Contract summary for display (PUBLIC - visible to user)
 */
export interface ContractSummary {
  /** Total contract value formatted */
  totalValue: string;
  /** Guaranteed money formatted */
  guaranteed: string;
  /** Average annual value formatted */
  aav: string;
  /** Total years */
  years: number;
  /** Years remaining */
  yearsRemaining: number;
  /** Current year cap hit formatted */
  currentCapHit: string;
  /** Contract status description */
  statusDescription: string;
}

/**
 * Gets contract summary for display (PUBLIC INFO)
 */
export function getContractSummary(contract: PlayerContract, currentYear: number): ContractSummary {
  const formatMoney = (value: number): string => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}M`;
    }
    return `$${value}K`;
  };

  let statusDescription: string;
  switch (contract.status) {
    case 'active':
      if (isExpiringContract(contract)) {
        statusDescription = 'Expiring';
      } else {
        statusDescription = 'Active';
      }
      break;
    case 'expired':
      statusDescription = 'Expired';
      break;
    case 'voided':
      statusDescription = 'Voided';
      break;
    case 'restructured':
      statusDescription = 'Restructured';
      break;
  }

  return {
    totalValue: formatMoney(contract.totalValue),
    guaranteed: formatMoney(contract.guaranteedMoney),
    aav: formatMoney(contract.averageAnnualValue),
    years: contract.totalYears,
    yearsRemaining: contract.yearsRemaining,
    currentCapHit: formatMoney(getCurrentCapHit(contract, currentYear)),
    statusDescription,
  };
}

/**
 * Validates a player contract
 */
export function validatePlayerContract(contract: PlayerContract): boolean {
  // Basic validations
  if (!contract.id || typeof contract.id !== 'string') return false;
  if (!contract.playerId || typeof contract.playerId !== 'string') return false;
  if (!contract.teamId || typeof contract.teamId !== 'string') return false;

  // Year validations
  if (typeof contract.signedYear !== 'number') return false;
  if (contract.signedYear < 2000 || contract.signedYear > 2100) return false;
  if (contract.totalYears < 1 || contract.totalYears > 10) return false;
  if (contract.yearsRemaining < 0 || contract.yearsRemaining > contract.totalYears) return false;

  // Money validations
  if (typeof contract.totalValue !== 'number' || contract.totalValue < 0) return false;
  if (typeof contract.guaranteedMoney !== 'number' || contract.guaranteedMoney < 0) return false;
  if (typeof contract.signingBonus !== 'number' || contract.signingBonus < 0) return false;
  if (contract.guaranteedMoney > contract.totalValue) return false;
  if (contract.signingBonus > contract.totalValue) return false;

  // Yearly breakdown validation
  if (!Array.isArray(contract.yearlyBreakdown)) return false;
  if (contract.yearlyBreakdown.length < contract.totalYears) return false;

  for (const year of contract.yearlyBreakdown) {
    if (typeof year.year !== 'number') return false;
    if (typeof year.baseSalary !== 'number' || year.baseSalary < 0) return false;
    if (typeof year.capHit !== 'number' || year.capHit < 0) return false;
  }

  return true;
}

/**
 * Minimum salary by experience (thousands)
 */
export const VETERAN_MINIMUM_SALARY: Record<number, number> = {
  0: 795, // Rookies
  1: 915, // 1 year
  2: 990, // 2 years
  3: 1065, // 3 years
  4: 1145, // 4 years
  5: 1215, // 5 years
  6: 1215, // 6 years
  7: 1215, // 7+ years
};

/**
 * Gets minimum salary for a player based on experience
 */
export function getMinimumSalary(yearsExperience: number): number {
  const cappedExperience = Math.min(yearsExperience, 7);
  return VETERAN_MINIMUM_SALARY[cappedExperience] ?? VETERAN_MINIMUM_SALARY[7];
}

/**
 * Creates a minimum salary contract
 */
export function createMinimumContract(
  playerId: string,
  playerName: string,
  teamId: string,
  position: Position,
  yearsExperience: number,
  signedYear: number,
  years: number = 1
): PlayerContract {
  const minSalary = getMinimumSalary(yearsExperience);

  const offer: ContractOffer = {
    years,
    totalValue: minSalary * years,
    guaranteedMoney: minSalary, // First year guaranteed
    signingBonus: 0,
    firstYearSalary: minSalary,
    annualEscalation: 0,
    noTradeClause: false,
    voidYears: 0,
  };

  return createPlayerContract(playerId, playerName, teamId, position, offer, signedYear, 'veteran');
}

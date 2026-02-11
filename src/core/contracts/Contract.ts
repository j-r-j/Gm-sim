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
 * Uses simplified bonus/salary model:
 * - bonus = guaranteed money for this year
 * - salary = non-guaranteed money for this year
 * - capHit = bonus + salary
 *
 * Backward-compatible properties:
 * - baseSalary: alias for salary
 * - prorationedBonus: alias for bonus
 * - rosterBonus: always 0 (not used in simplified model)
 * - isGuaranteed: whether this year is guaranteed (always true for bonus portion)
 */
export interface ContractYear {
  /** Season year */
  year: number;
  /** Guaranteed bonus for this year (thousands) - counts as dead money if cut */
  bonus: number;
  /** Non-guaranteed salary for this year (thousands) - team can cut to avoid */
  salary: number;
  /** Total cap hit for this year (thousands) = bonus + salary */
  capHit: number;
  /** Is this a void year? */
  isVoidYear: boolean;
  /** @deprecated Use salary instead - alias for backward compatibility */
  baseSalary?: number;
  /** @deprecated Use bonus instead - alias for backward compatibility */
  prorationedBonus?: number;
  /** @deprecated Not used in simplified model */
  rosterBonus?: number;
  /** Whether this year is guaranteed */
  isGuaranteed?: boolean;
  /** @deprecated Not used in simplified model */
  workoutBonus?: number;
  /** @deprecated Not used in simplified model */
  optionBonus?: number;
  /** @deprecated Not used in simplified model */
  incentivesLTBE?: number;
  /** @deprecated Not used in simplified model */
  incentivesNLTBE?: number;
  /** @deprecated Not used in simplified model */
  isGuaranteedForInjury?: boolean;
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
 * Uses simplified bonus/salary model where:
 * - bonus = guaranteed money per year
 * - salary = non-guaranteed money per year
 * - total compensation per year = bonus + salary
 *
 * Backward-compatible properties (optional):
 * - totalValue: computed as (bonusPerYear + salaryPerYear) * years
 * - guaranteedMoney: computed as bonusPerYear * years
 * - signingBonus: alias for bonusPerYear (for first year)
 * - firstYearSalary: alias for salaryPerYear
 * - voidYears: always 0 (not used in simplified model)
 */
export interface ContractOffer {
  /** Total years offered */
  years: number;
  /** Guaranteed bonus per year (thousands) - this is the dead money if cut */
  bonusPerYear: number;
  /** Non-guaranteed salary per year (thousands) - can cut to avoid */
  salaryPerYear: number;
  /** Include no-trade clause? */
  noTradeClause: boolean;
  /** @deprecated Use (bonusPerYear + salaryPerYear) * years instead */
  totalValue?: number;
  /** @deprecated Use bonusPerYear * years instead */
  guaranteedMoney?: number;
  /** @deprecated Use bonusPerYear instead */
  signingBonus?: number;
  /** @deprecated Use salaryPerYear instead */
  firstYearSalary?: number;
  /** @deprecated Not used in simplified model */
  voidYears?: number;
  /** @deprecated Not used in simplified model */
  annualEscalation?: number;
}

/**
 * Creates a unique contract ID
 */
export function createContractId(playerId: string, signedYear: number): string {
  return `contract-${playerId}-${signedYear}-${Date.now()}`;
}

/**
 * Calculates yearly breakdown from contract offer
 * Each year has bonus (guaranteed) + salary (non-guaranteed) = cap hit
 */
export function calculateYearlyBreakdown(offer: ContractOffer, signedYear: number): ContractYear[] {
  const breakdown: ContractYear[] = [];

  for (let i = 0; i < offer.years; i++) {
    const year = signedYear + i;
    const bonus = Math.round(offer.bonusPerYear);
    const salary = Math.round(offer.salaryPerYear);
    const capHit = bonus + salary;

    breakdown.push({
      year,
      bonus,
      salary,
      capHit,
      isVoidYear: false,
      // Backward-compatible properties
      baseSalary: salary,
      prorationedBonus: bonus,
      rosterBonus: 0,
      isGuaranteed: bonus > 0,
    });
  }

  return breakdown;
}

/**
 * Helper to get total value from a contract offer
 * @deprecated Use (bonusPerYear + salaryPerYear) * years directly
 */
export function getOfferTotalValue(offer: ContractOffer): number {
  return (offer.bonusPerYear + offer.salaryPerYear) * offer.years;
}

/**
 * Helper to get guaranteed money from a contract offer
 * @deprecated Use bonusPerYear * years directly
 */
export function getOfferGuaranteedMoney(offer: ContractOffer): number {
  return offer.bonusPerYear * offer.years;
}

/**
 * Post-June 1 dead money result
 */
export interface PostJune1DeadMoney {
  year1DeadMoney: number;
  year2DeadMoney: number;
}

/**
 * Calculates dead money for post-June 1 designation
 * Post-June 1 cuts spread the dead money over 2 years:
 * - Year 1: Current year's bonus only
 * - Year 2: Remaining years' bonus accelerated
 */
export function calculatePostJune1DeadMoney(
  contract: PlayerContract,
  currentYear: number
): PostJune1DeadMoney {
  const currentYearData = contract.yearlyBreakdown.find((y) => y.year === currentYear);
  const futureYearData = contract.yearlyBreakdown.filter(
    (y) => y.year > currentYear && !y.isVoidYear
  );

  // Year 1: just current year's bonus
  const year1DeadMoney = currentYearData?.bonus ?? 0;

  // Year 2: remaining years' bonus accelerated
  const year2DeadMoney = futureYearData.reduce((sum, y) => sum + y.bonus, 0);

  return { year1DeadMoney, year2DeadMoney };
}

/**
 * Creates a player contract from an offer
 * Total value = (bonus + salary) * years
 * Guaranteed = bonus * years
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
  const aav = offer.bonusPerYear + offer.salaryPerYear;
  const totalValue = aav * offer.years;
  const guaranteedMoney = offer.bonusPerYear * offer.years;

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
    totalValue,
    guaranteedMoney,
    signingBonus: 0, // Not used in simplified model
    averageAnnualValue: aav,
    yearlyBreakdown,
    voidYears: 0, // Not used in simplified model
    hasNoTradeClause: offer.noTradeClause,
    hasNoTagClause: false,
    originalContractId: null,
    notes: [`Signed ${offer.years}-year, $${(totalValue / 1000).toFixed(1)}M contract`],
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
 * Calculates remaining guaranteed bonus money
 */
export function getRemainingBonus(contract: PlayerContract, currentYear: number): number {
  return contract.yearlyBreakdown
    .filter((y) => y.year >= currentYear && !y.isVoidYear)
    .reduce((sum, y) => sum + y.bonus, 0);
}

/**
 * Calculates remaining guaranteed money (alias for getRemainingBonus)
 */
export function getRemainingGuaranteed(contract: PlayerContract, currentYear: number): number {
  return getRemainingBonus(contract, currentYear);
}

/**
 * Calculates dead money if player is cut
 * Dead money = remaining bonus (guaranteed) for all future years
 */
export function calculateDeadMoney(contract: PlayerContract, currentYear: number): number {
  return getRemainingBonus(contract, currentYear);
}

/**
 * Calculates cap savings if player is cut
 * Savings = non-guaranteed salary for current year
 */
export function calculateCapSavings(contract: PlayerContract, currentYear: number): number {
  const currentYearData = contract.yearlyBreakdown.find((y) => y.year === currentYear);
  return currentYearData?.salary ?? 0;
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
    if (typeof year.bonus !== 'number' || year.bonus < 0) return false;
    if (typeof year.salary !== 'number' || year.salary < 0) return false;
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
 * For minimum contracts, all money is guaranteed (bonus), no non-guaranteed salary
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
    bonusPerYear: minSalary, // All guaranteed
    salaryPerYear: 0, // No non-guaranteed portion
    noTradeClause: false,
  };

  return createPlayerContract(playerId, playerName, teamId, position, offer, signedYear, 'veteran');
}

/**
 * Checks if a player can be traded based on their contract's no-trade clause
 * Returns whether the trade is allowed and the reason if blocked
 */
export function canTradePlayer(contract: PlayerContract | null): {
  canTrade: boolean;
  reason?: string;
} {
  // No contract means free agent or practice squad - can be moved
  if (!contract) {
    return { canTrade: true };
  }

  // Check for no-trade clause
  if (contract.hasNoTradeClause) {
    return {
      canTrade: false,
      reason: `${contract.playerName} has a no-trade clause and must approve any trade.`,
    };
  }

  // Contract is active and no NTC - trade allowed
  if (contract.status === 'active') {
    return { canTrade: true };
  }

  // Expired or voided contracts shouldn't have tradeable players
  if (contract.status === 'expired' || contract.status === 'voided') {
    return {
      canTrade: false,
      reason: `${contract.playerName}'s contract is no longer active.`,
    };
  }

  return { canTrade: true };
}

/**
 * Checks if a player with a no-trade clause has approved the trade
 * In a full implementation, this would involve negotiation/approval flow
 * For now, returns true if NTC player has been explicitly approved
 */
export function hasNoTradeClauseApproval(
  contract: PlayerContract,
  approvedPlayerIds: Set<string>
): boolean {
  if (!contract.hasNoTradeClause) {
    return true; // No NTC, no approval needed
  }
  return approvedPlayerIds.has(contract.playerId);
}

/**
 * Creates a ContractOffer from old-style parameters (for backward compatibility)
 * Converts totalValue/guaranteedMoney style to bonusPerYear/salaryPerYear style
 */
export function createContractOffer(params: {
  years: number;
  totalValue: number;
  guaranteedMoney: number;
  noTradeClause?: boolean;
}): ContractOffer {
  const { years, totalValue, guaranteedMoney, noTradeClause = false } = params;
  const aav = Math.round(totalValue / years);
  const bonusPerYear = Math.round(guaranteedMoney / years);
  const salaryPerYear = aav - bonusPerYear;

  return {
    years,
    bonusPerYear,
    salaryPerYear,
    noTradeClause,
    // Include backward compat properties
    totalValue,
    guaranteedMoney,
  };
}

/**
 * Coach Contract Model
 * Defines contract structure for coaches
 */

/**
 * Coach contract details
 */
export interface CoachContract {
  id: string;
  coachId: string;
  teamId: string;

  // Terms
  yearsTotal: number; // 1-5 years
  yearsRemaining: number;
  salaryPerYear: number;
  guaranteedMoney: number;
  signingBonus: number;

  // Calculated
  deadMoneyIfFired: number; // Remaining guarantees

  // Status
  isInterim: boolean;
  canBePoached: boolean; // For coordinators
  hasNoTradeClause: boolean; // Rare for coaches

  // Dates
  startYear: number;
  endYear: number;
}

/**
 * Creates a new coach contract
 */
export function createCoachContract(params: {
  id: string;
  coachId: string;
  teamId: string;
  yearsTotal: number;
  salaryPerYear: number;
  guaranteedMoney: number;
  signingBonus?: number;
  startYear: number;
  isInterim?: boolean;
  canBePoached?: boolean;
  hasNoTradeClause?: boolean;
}): CoachContract {
  const signingBonus = params.signingBonus ?? 0;

  return {
    id: params.id,
    coachId: params.coachId,
    teamId: params.teamId,
    yearsTotal: params.yearsTotal,
    yearsRemaining: params.yearsTotal,
    salaryPerYear: params.salaryPerYear,
    guaranteedMoney: params.guaranteedMoney,
    signingBonus,
    deadMoneyIfFired: params.guaranteedMoney,
    isInterim: params.isInterim ?? false,
    canBePoached: params.canBePoached ?? true,
    hasNoTradeClause: params.hasNoTradeClause ?? false,
    startYear: params.startYear,
    endYear: params.startYear + params.yearsTotal - 1,
  };
}

/**
 * Calculates dead money if coach is fired
 * Dead money = remaining guaranteed money
 */
export function calculateDeadMoney(contract: CoachContract): number {
  // Simplified calculation: pro-rate guaranteed money over contract length
  const guaranteedPerYear = contract.guaranteedMoney / contract.yearsTotal;
  return Math.round(guaranteedPerYear * contract.yearsRemaining);
}

/**
 * Advances a contract by one year
 * Returns null if contract has expired
 */
export function advanceContractYear(contract: CoachContract): CoachContract | null {
  if (contract.yearsRemaining <= 1) {
    return null; // Contract expired
  }

  const newYearsRemaining = contract.yearsRemaining - 1;

  return {
    ...contract,
    yearsRemaining: newYearsRemaining,
    deadMoneyIfFired: calculateDeadMoney({
      ...contract,
      yearsRemaining: newYearsRemaining,
    }),
  };
}

/**
 * Validates a coach contract
 */
export function validateContract(contract: CoachContract): boolean {
  // Years total must be 1-5
  if (contract.yearsTotal < 1 || contract.yearsTotal > 5) {
    return false;
  }

  // Years remaining cannot exceed years total
  if (contract.yearsRemaining > contract.yearsTotal || contract.yearsRemaining < 0) {
    return false;
  }

  // Salary must be positive
  if (contract.salaryPerYear <= 0) {
    return false;
  }

  // Guaranteed money cannot exceed total contract value
  const totalContractValue = contract.salaryPerYear * contract.yearsTotal + contract.signingBonus;
  if (contract.guaranteedMoney > totalContractValue) {
    return false;
  }

  // End year must be calculated correctly
  if (contract.endYear !== contract.startYear + contract.yearsTotal - 1) {
    return false;
  }

  return true;
}

/**
 * Gets total remaining value of a contract
 */
export function getRemainingContractValue(contract: CoachContract): number {
  return contract.salaryPerYear * contract.yearsRemaining;
}

/**
 * Gets total contract value
 */
export function getTotalContractValue(contract: CoachContract): number {
  return contract.salaryPerYear * contract.yearsTotal + contract.signingBonus;
}

/**
 * Checks if a contract is expiring (1 year or less remaining)
 */
export function isContractExpiring(contract: CoachContract): boolean {
  return contract.yearsRemaining <= 1;
}

/**
 * Gets a contract summary for display
 */
export function getContractSummary(contract: CoachContract): string {
  const totalValue = getTotalContractValue(contract);
  const formattedValue = (totalValue / 1_000_000).toFixed(1);

  if (contract.isInterim) {
    return 'Interim';
  }

  return `${contract.yearsRemaining}yr / $${formattedValue}M`;
}

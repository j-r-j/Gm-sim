/**
 * Staff Budget Manager
 * Manages coaching staff budget, spending, dead money, and contract negotiations
 */

import { Coach } from '../models/staff/Coach';
import {
  CoachContract,
  createCoachContract,
  calculateDeadMoney,
  advanceContractYear,
} from '../models/staff/CoachContract';
import {
  CoachRole,
  BudgetTier,
  COACH_SALARY_RANGES,
  getBudgetTier,
  getCoachSalaryRange,
} from '../models/staff/StaffSalary';
import { StaffHierarchy, updateBudget, getCoachingPositionKeys } from '../models/staff/StaffHierarchy';

/**
 * Budget status
 */
export interface BudgetStatus {
  tier: BudgetTier;
  totalBudget: number;
  coachingSpend: number;
  scoutingSpend: number;
  remainingBudget: number;
  percentUsed: number;
  canAffordMinStaff: boolean;
}

/**
 * Dead money entry
 */
export interface DeadMoneyEntry {
  coachId: string;
  coachName: string;
  originalRole: CoachRole;
  amount: number;
  yearsRemaining: number;
  yearIncurred: number;
}

/**
 * Contract negotiation parameters
 */
export interface ContractNegotiationParams {
  coachId: string;
  role: CoachRole;
  yearsOffered: number;
  salaryOffered: number;
  guaranteedOffered: number;
  signingBonus?: number;
}

/**
 * Contract counter-offer
 */
export interface ContractCounterOffer {
  yearsRequested: number;
  salaryRequested: number;
  guaranteedRequested: number;
  signingBonusRequested: number;
  willAcceptCurrent: boolean;
  counterReason: string;
}

/**
 * Budget projection
 */
export interface BudgetProjection {
  year: number;
  expectedSpend: number;
  expiringContracts: number;
  deadMoney: number;
  projectedRemaining: number;
}

/**
 * Staff budget state
 */
export interface StaffBudgetState {
  teamId: string;
  currentYear: number;
  totalBudget: number;
  coachingBudget: number; // 80% of total typically
  scoutingBudget: number; // 20% of total typically
  deadMoney: DeadMoneyEntry[];
  pendingNegotiations: ContractNegotiationParams[];
}

/**
 * Creates initial budget state
 */
export function createStaffBudgetState(
  teamId: string,
  totalBudget: number,
  currentYear: number
): StaffBudgetState {
  return {
    teamId,
    currentYear,
    totalBudget,
    coachingBudget: Math.round(totalBudget * 0.8),
    scoutingBudget: Math.round(totalBudget * 0.2),
    deadMoney: [],
    pendingNegotiations: [],
  };
}

/**
 * Gets current budget status
 */
export function getBudgetStatus(
  state: StaffBudgetState,
  hierarchy: StaffHierarchy
): BudgetStatus {
  const percentUsed =
    hierarchy.staffBudget > 0
      ? ((hierarchy.coachingSpend + hierarchy.scoutingSpend) / hierarchy.staffBudget) * 100
      : 0;

  // Calculate minimum staff cost (HC + 1 coordinator)
  const minHeadCoachCost = COACH_SALARY_RANGES.headCoach.min;
  const minCoordinatorCost = Math.min(
    COACH_SALARY_RANGES.offensiveCoordinator.min,
    COACH_SALARY_RANGES.defensiveCoordinator.min
  );
  const minStaffCost = minHeadCoachCost + minCoordinatorCost;

  return {
    tier: getBudgetTier(hierarchy.staffBudget),
    totalBudget: hierarchy.staffBudget,
    coachingSpend: hierarchy.coachingSpend,
    scoutingSpend: hierarchy.scoutingSpend,
    remainingBudget: hierarchy.remainingBudget,
    percentUsed: Math.round(percentUsed * 10) / 10,
    canAffordMinStaff: hierarchy.remainingBudget >= minStaffCost,
  };
}

/**
 * Calculates dead money if a coach is fired
 */
export function calculateFiringDeadMoney(contract: CoachContract): number {
  return calculateDeadMoney(contract);
}

/**
 * Records dead money from firing a coach
 */
export function recordDeadMoney(
  state: StaffBudgetState,
  coach: Coach,
  contract: CoachContract
): StaffBudgetState {
  const deadMoneyAmount = calculateFiringDeadMoney(contract);

  if (deadMoneyAmount <= 0) {
    return state;
  }

  const entry: DeadMoneyEntry = {
    coachId: coach.id,
    coachName: `${coach.firstName} ${coach.lastName}`,
    originalRole: coach.role,
    amount: deadMoneyAmount,
    yearsRemaining: Math.min(contract.yearsRemaining, 2), // Dead money spread over max 2 years
    yearIncurred: state.currentYear,
  };

  return {
    ...state,
    deadMoney: [...state.deadMoney, entry],
  };
}

/**
 * Gets total active dead money
 */
export function getTotalDeadMoney(state: StaffBudgetState): number {
  return state.deadMoney.reduce((total, entry) => total + entry.amount, 0);
}

/**
 * Advances dead money by one year
 */
export function advanceDeadMoneyYear(state: StaffBudgetState): StaffBudgetState {
  const updatedDeadMoney = state.deadMoney
    .map((entry) => ({
      ...entry,
      yearsRemaining: entry.yearsRemaining - 1,
      amount: Math.round(entry.amount / 2), // Reduce by half each year
    }))
    .filter((entry) => entry.yearsRemaining > 0 && entry.amount > 0);

  return {
    ...state,
    currentYear: state.currentYear + 1,
    deadMoney: updatedDeadMoney,
  };
}

/**
 * Checks if a salary offer is valid for a role
 */
export function isValidSalaryOffer(role: CoachRole, salary: number): boolean {
  const range = getCoachSalaryRange(role);
  return salary >= range.min && salary <= range.max;
}

/**
 * Generates a counter-offer based on coach expectations
 * FOR ENGINE USE ONLY - coach attributes drive expectations
 */
export function generateCounterOffer(
  coach: Coach,
  offer: ContractNegotiationParams
): ContractCounterOffer {
  const salaryRange = getCoachSalaryRange(offer.role);
  const reputation = coach.attributes.reputation;

  // Higher reputation = higher demands
  const salaryExpectation = calculateSalaryExpectation(reputation, salaryRange);
  const yearsExpectation = calculateYearsExpectation(reputation, coach.attributes.age);
  const guaranteedExpectation = calculateGuaranteedExpectation(reputation, offer.yearsOffered);

  // Check if offer meets expectations
  const salaryMet = offer.salaryOffered >= salaryExpectation * 0.9;
  const yearsMet = offer.yearsOffered >= yearsExpectation;
  const guaranteedMet = offer.guaranteedOffered >= guaranteedExpectation * 0.8;

  const willAcceptCurrent = salaryMet && yearsMet && guaranteedMet;

  let counterReason: string;
  if (!salaryMet) {
    counterReason = 'Seeking higher annual salary';
  } else if (!yearsMet) {
    counterReason = 'Looking for more job security';
  } else if (!guaranteedMet) {
    counterReason = 'Wants more guaranteed money';
  } else {
    counterReason = 'Satisfied with terms';
  }

  return {
    yearsRequested: yearsExpectation,
    salaryRequested: salaryExpectation,
    guaranteedRequested: guaranteedExpectation,
    signingBonusRequested: Math.round(salaryExpectation * 0.1),
    willAcceptCurrent,
    counterReason,
  };
}

/**
 * Calculates salary expectation based on reputation
 */
function calculateSalaryExpectation(
  reputation: number,
  range: { min: number; max: number }
): number {
  // Map reputation (1-100) to salary range
  const rangeSpread = range.max - range.min;
  const baseMultiplier = (reputation - 30) / 70; // 0-1 range for rep 30-100
  const salary = range.min + rangeSpread * Math.max(0, Math.min(1, baseMultiplier));
  return Math.round(salary / 100000) * 100000; // Round to nearest 100k
}

/**
 * Calculates years expectation
 */
function calculateYearsExpectation(reputation: number, age: number): number {
  // High reputation coaches want longer deals
  // Older coaches may accept shorter deals
  let baseYears = 3;

  if (reputation >= 85) baseYears = 5;
  else if (reputation >= 70) baseYears = 4;
  else if (reputation >= 50) baseYears = 3;
  else baseYears = 2;

  // Age adjustment
  if (age >= 65) baseYears = Math.min(baseYears, 2);
  else if (age >= 60) baseYears = Math.min(baseYears, 3);

  return baseYears;
}

/**
 * Calculates guaranteed money expectation
 */
function calculateGuaranteedExpectation(reputation: number, _years: number): number {
  // Higher reputation = higher guaranteed percentage
  let guaranteedPct = 0.3; // Base 30% guaranteed

  if (reputation >= 85) guaranteedPct = 0.6;
  else if (reputation >= 70) guaranteedPct = 0.5;
  else if (reputation >= 55) guaranteedPct = 0.4;

  // This will be multiplied by total contract value elsewhere
  return guaranteedPct;
}

/**
 * Creates a coach contract from accepted negotiation
 */
export function createContractFromNegotiation(
  negotiation: ContractNegotiationParams,
  startYear: number
): CoachContract {
  return createCoachContract({
    id: `contract-${negotiation.coachId}-${startYear}`,
    coachId: negotiation.coachId,
    teamId: '', // Will be set when hiring
    yearsTotal: negotiation.yearsOffered,
    salaryPerYear: negotiation.salaryOffered,
    guaranteedMoney: negotiation.guaranteedOffered,
    signingBonus: negotiation.signingBonus ?? 0,
    startYear,
    isInterim: false,
    canBePoached: true,
    hasNoTradeClause: false,
  });
}

/**
 * Updates hierarchy budget after hiring
 */
export function updateBudgetAfterHiring(
  hierarchy: StaffHierarchy,
  newSalary: number
): StaffHierarchy {
  const newCoachingSpend = hierarchy.coachingSpend + newSalary;
  return updateBudget(hierarchy, newCoachingSpend, hierarchy.scoutingSpend);
}

/**
 * Updates hierarchy budget after firing
 */
export function updateBudgetAfterFiring(
  hierarchy: StaffHierarchy,
  removedSalary: number
): StaffHierarchy {
  const newCoachingSpend = Math.max(0, hierarchy.coachingSpend - removedSalary);
  return updateBudget(hierarchy, newCoachingSpend, hierarchy.scoutingSpend);
}

/**
 * Projects budget for future years
 */
export function projectBudget(
  state: StaffBudgetState,
  hierarchy: StaffHierarchy,
  contracts: Map<string, CoachContract>,
  yearsAhead: number = 3
): BudgetProjection[] {
  const projections: BudgetProjection[] = [];
  let currentDeadMoney = [...state.deadMoney];
  const contractList = Array.from(contracts.values());

  for (let year = 0; year < yearsAhead; year++) {
    const projectedYear = state.currentYear + year;

    // Count expiring contracts
    const expiringContracts = contractList.filter(
      (c) => c.endYear === projectedYear
    ).length;

    // Calculate expected spend (current spend minus expiring)
    let expectedSpend = hierarchy.coachingSpend;
    for (const contract of contractList) {
      if (contract.endYear === projectedYear) {
        expectedSpend -= contract.salaryPerYear;
      }
    }

    // Calculate dead money for this year
    const deadMoneyThisYear = currentDeadMoney.reduce(
      (total, entry) => total + entry.amount,
      0
    );

    // Project remaining
    const projectedRemaining =
      state.totalBudget - expectedSpend - deadMoneyThisYear;

    projections.push({
      year: projectedYear,
      expectedSpend: Math.max(0, expectedSpend),
      expiringContracts,
      deadMoney: deadMoneyThisYear,
      projectedRemaining: Math.max(0, projectedRemaining),
    });

    // Advance dead money for next iteration
    currentDeadMoney = currentDeadMoney
      .map((entry) => ({
        ...entry,
        yearsRemaining: entry.yearsRemaining - 1,
        amount: Math.round(entry.amount / 2),
      }))
      .filter((entry) => entry.yearsRemaining > 0);
  }

  return projections;
}

/**
 * Gets expiring contracts for a year
 */
export function getExpiringContracts(
  contracts: Map<string, CoachContract>,
  year: number
): CoachContract[] {
  return Array.from(contracts.values()).filter((c) => c.endYear === year);
}

/**
 * Advances all contracts by one year
 */
export function advanceContractsYear(
  contracts: Map<string, CoachContract>
): {
  activeContracts: Map<string, CoachContract>;
  expiredContracts: CoachContract[];
} {
  const activeContracts = new Map<string, CoachContract>();
  const expiredContracts: CoachContract[] = [];

  for (const [id, contract] of contracts) {
    const advanced = advanceContractYear(contract);
    if (advanced) {
      activeContracts.set(id, advanced);
    } else {
      expiredContracts.push(contract);
    }
  }

  return { activeContracts, expiredContracts };
}

/**
 * Calculates total coaching staff salary
 */
export function calculateTotalCoachingSalary(
  contracts: Map<string, CoachContract>,
  hierarchy: StaffHierarchy
): number {
  let total = 0;
  const positionKeys = getCoachingPositionKeys();

  for (const key of positionKeys) {
    const coachId = hierarchy[key] as string | null;
    if (coachId) {
      const contract = contracts.get(coachId);
      if (contract) {
        total += contract.salaryPerYear;
      }
    }
  }

  return total;
}

/**
 * Gets budget tier description
 */
export function getBudgetTierDescription(tier: BudgetTier): string {
  switch (tier) {
    case 'elite':
      return 'Elite budget - Can compete for any coach';
    case 'high':
      return 'High budget - Can afford top-tier staff';
    case 'mid':
      return 'Average budget - Competitive options available';
    case 'low':
      return 'Limited budget - Budget-conscious decisions needed';
    case 'bottom':
      return 'Minimal budget - Significant constraints';
  }
}

/**
 * Checks if team can afford a contract
 */
export function canAffordContract(
  hierarchy: StaffHierarchy,
  annualSalary: number
): boolean {
  return hierarchy.remainingBudget >= annualSalary;
}

/**
 * Gets maximum affordable salary for a role
 */
export function getMaxAffordableSalary(
  hierarchy: StaffHierarchy,
  role: CoachRole
): number {
  const range = getCoachSalaryRange(role);
  return Math.min(hierarchy.remainingBudget, range.max);
}

/**
 * Validates budget state
 */
export function validateBudgetState(state: StaffBudgetState): boolean {
  if (state.totalBudget < 0) return false;
  if (state.coachingBudget < 0) return false;
  if (state.scoutingBudget < 0) return false;
  if (state.coachingBudget + state.scoutingBudget > state.totalBudget) return false;

  for (const entry of state.deadMoney) {
    if (entry.amount < 0) return false;
    if (entry.yearsRemaining < 0) return false;
  }

  return true;
}

/**
 * Gets budget summary for display
 */
export function getBudgetSummary(
  state: StaffBudgetState,
  hierarchy: StaffHierarchy
): {
  tierDescription: string;
  spendDescription: string;
  deadMoneyDescription: string;
  flexibilityDescription: string;
} {
  const status = getBudgetStatus(state, hierarchy);
  const totalDeadMoney = getTotalDeadMoney(state);

  const tierDescription = getBudgetTierDescription(status.tier);

  let spendDescription: string;
  if (status.percentUsed >= 90) {
    spendDescription = 'Budget nearly fully utilized';
  } else if (status.percentUsed >= 70) {
    spendDescription = 'Majority of budget committed';
  } else if (status.percentUsed >= 50) {
    spendDescription = 'Moderate budget flexibility';
  } else {
    spendDescription = 'Significant budget available';
  }

  let deadMoneyDescription: string;
  if (totalDeadMoney === 0) {
    deadMoneyDescription = 'No dead money obligations';
  } else if (totalDeadMoney < state.totalBudget * 0.05) {
    deadMoneyDescription = 'Minimal dead money impact';
  } else if (totalDeadMoney < state.totalBudget * 0.1) {
    deadMoneyDescription = 'Moderate dead money obligations';
  } else {
    deadMoneyDescription = 'Significant dead money burden';
  }

  let flexibilityDescription: string;
  if (status.remainingBudget >= COACH_SALARY_RANGES.headCoach.max) {
    flexibilityDescription = 'Can pursue any coach on the market';
  } else if (status.remainingBudget >= COACH_SALARY_RANGES.headCoach.min) {
    flexibilityDescription = 'Can make competitive offers';
  } else if (status.remainingBudget >= COACH_SALARY_RANGES.offensiveCoordinator.min) {
    flexibilityDescription = 'Limited to coordinator-level hires';
  } else {
    flexibilityDescription = 'Very limited hiring capacity';
  }

  return {
    tierDescription,
    spendDescription,
    deadMoneyDescription,
    flexibilityDescription,
  };
}

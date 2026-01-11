/**
 * Cut Calculator
 * Calculate cap savings, dead money hit, and pre/post June 1 options
 */

import {
  PlayerContract,
  getCapHitForYear,
  calculateDeadMoney,
  calculatePostJune1DeadMoney,
  calculateCapSavings,
} from './Contract';
import { CapPenalty } from './SalaryCapManager';

/**
 * Cut type
 */
export type CutType = 'standard' | 'post_june_1' | 'designated_post_june_1';

/**
 * Cut analysis result
 */
export interface CutAnalysis {
  /** Cut type being analyzed */
  cutType: CutType;
  /** Current year cap hit before cut */
  currentCapHit: number;
  /** Dead money from cut */
  deadMoney: number;
  /** Cap savings from cut */
  capSavings: number;
  /** If post-June 1, second year dead money */
  secondYearDeadMoney: number;
  /** Total dead money (year 1 + year 2 for post-June 1) */
  totalDeadMoney: number;
  /** Total cap savings over 2 years */
  totalCapSavings: number;
  /** Is this cut advisable? */
  isAdvisable: boolean;
  /** Reasoning for recommendation */
  recommendation: string;
}

/**
 * Full cut breakdown with all options
 */
export interface CutBreakdown {
  playerId: string;
  playerName: string;
  contractId: string;
  currentYear: number;
  yearsRemaining: number;
  standardCut: CutAnalysis;
  postJune1Cut: CutAnalysis;
  designatedPostJune1Cut: CutAnalysis;
  bestOption: CutType;
  bestOptionReason: string;
}

/**
 * Cut result with cap penalties
 */
export interface CutResult {
  success: boolean;
  contract: PlayerContract;
  penalties: CapPenalty[];
  capSavings: number;
  error: string | null;
}

/**
 * Analyzes a standard (pre-June 1) cut
 */
export function analyzeStandardCut(contract: PlayerContract, currentYear: number): CutAnalysis {
  const currentCapHit = getCapHitForYear(contract, currentYear);
  const deadMoney = calculateDeadMoney(contract, currentYear);
  const capSavings = calculateCapSavings(contract, currentYear);

  let isAdvisable = capSavings > 0;
  let recommendation: string;

  if (capSavings <= 0) {
    recommendation = 'Cut would not create cap savings - contract has significant guarantees';
    isAdvisable = false;
  } else if (capSavings < currentCapHit * 0.3) {
    recommendation = 'Modest cap savings - consider restructure instead';
    isAdvisable = contract.yearsRemaining <= 1;
  } else if (deadMoney > currentCapHit) {
    recommendation = 'Large dead money hit - consider post-June 1 designation';
  } else {
    recommendation = 'Standard cut provides meaningful cap savings';
  }

  return {
    cutType: 'standard',
    currentCapHit,
    deadMoney,
    capSavings,
    secondYearDeadMoney: 0,
    totalDeadMoney: deadMoney,
    totalCapSavings: capSavings,
    isAdvisable,
    recommendation,
  };
}

/**
 * Analyzes a post-June 1 cut
 */
export function analyzePostJune1Cut(contract: PlayerContract, currentYear: number): CutAnalysis {
  const currentCapHit = getCapHitForYear(contract, currentYear);
  const { year1DeadMoney, year2DeadMoney } = calculatePostJune1DeadMoney(contract, currentYear);

  // Post-June 1 savings is current cap hit minus year 1 dead money
  const year1Savings = currentCapHit - year1DeadMoney;

  // Year 2 savings is the original year 2 cap hit minus the accelerated dead money
  const year2CapHit = getCapHitForYear(contract, currentYear + 1);
  const year2Savings = year2CapHit - year2DeadMoney;

  const totalDeadMoney = year1DeadMoney + year2DeadMoney;
  const totalCapSavings = year1Savings + year2Savings;

  let isAdvisable = year1Savings > 0;
  let recommendation: string;

  if (year1Savings <= 0) {
    recommendation = 'No immediate cap relief from post-June 1 cut';
    isAdvisable = false;
  } else if (year2DeadMoney > year2CapHit) {
    recommendation = 'Post-June 1 spreads dead money but increases year 2 hit';
  } else if (year1Savings > currentCapHit * 0.5) {
    recommendation = 'Post-June 1 provides significant immediate relief';
    isAdvisable = true;
  } else {
    recommendation = 'Post-June 1 offers some cap flexibility';
  }

  return {
    cutType: 'post_june_1',
    currentCapHit,
    deadMoney: year1DeadMoney,
    capSavings: year1Savings,
    secondYearDeadMoney: year2DeadMoney,
    totalDeadMoney,
    totalCapSavings,
    isAdvisable,
    recommendation,
  };
}

/**
 * Analyzes a designated post-June 1 cut
 * Can be done before June 1 but cap treated as if done after
 */
export function analyzeDesignatedPostJune1Cut(
  contract: PlayerContract,
  currentYear: number
): CutAnalysis {
  // Same math as post-June 1, but can be executed earlier
  const analysis = analyzePostJune1Cut(contract, currentYear);

  let recommendation = analysis.recommendation;
  if (analysis.isAdvisable) {
    recommendation = 'Designated post-June 1: Get relief now, spread dead money';
  }

  return {
    ...analysis,
    cutType: 'designated_post_june_1',
    recommendation,
  };
}

/**
 * Gets full cut breakdown for a contract
 */
export function getCutBreakdown(contract: PlayerContract, currentYear: number): CutBreakdown {
  const standardCut = analyzeStandardCut(contract, currentYear);
  const postJune1Cut = analyzePostJune1Cut(contract, currentYear);
  const designatedPostJune1Cut = analyzeDesignatedPostJune1Cut(contract, currentYear);

  // Determine best option
  let bestOption: CutType = 'standard';
  let bestOptionReason: string;

  // Compare cap savings and advisability
  if (
    !standardCut.isAdvisable &&
    !postJune1Cut.isAdvisable &&
    !designatedPostJune1Cut.isAdvisable
  ) {
    bestOption = 'standard';
    bestOptionReason = 'No cut option creates positive cap savings - keep player or restructure';
  } else if (standardCut.capSavings >= postJune1Cut.capSavings && standardCut.isAdvisable) {
    bestOption = 'standard';
    bestOptionReason = 'Standard cut provides best immediate cap relief';
  } else if (postJune1Cut.capSavings > standardCut.capSavings * 1.5 && postJune1Cut.isAdvisable) {
    bestOption = 'designated_post_june_1';
    bestOptionReason = 'Designated post-June 1 provides significantly better immediate relief';
  } else if (postJune1Cut.totalCapSavings > standardCut.capSavings && postJune1Cut.isAdvisable) {
    bestOption = 'post_june_1';
    bestOptionReason = 'Post-June 1 cut optimizes total cap savings over 2 years';
  } else {
    bestOption = 'standard';
    bestOptionReason = 'Standard cut is the simplest option with adequate savings';
  }

  return {
    playerId: contract.playerId,
    playerName: contract.playerName,
    contractId: contract.id,
    currentYear,
    yearsRemaining: contract.yearsRemaining,
    standardCut,
    postJune1Cut,
    designatedPostJune1Cut,
    bestOption,
    bestOptionReason,
  };
}

/**
 * Creates cap penalties from a cut
 */
export function createCutPenalties(
  contract: PlayerContract,
  currentYear: number,
  cutType: CutType
): CapPenalty[] {
  const penalties: CapPenalty[] = [];

  if (cutType === 'standard') {
    const deadMoney = calculateDeadMoney(contract, currentYear);
    if (deadMoney > 0) {
      penalties.push({
        id: `penalty-cut-${contract.id}-${currentYear}`,
        playerId: contract.playerId,
        playerName: contract.playerName,
        reason: 'cut',
        amount: deadMoney,
        year: currentYear,
        yearsRemaining: 1,
      });
    }
  } else {
    // Post-June 1 (or designated)
    const { year1DeadMoney, year2DeadMoney } = calculatePostJune1DeadMoney(contract, currentYear);

    if (year1DeadMoney > 0) {
      penalties.push({
        id: `penalty-cut-${contract.id}-${currentYear}`,
        playerId: contract.playerId,
        playerName: contract.playerName,
        reason: 'cut',
        amount: year1DeadMoney,
        year: currentYear,
        yearsRemaining: 1,
      });
    }

    if (year2DeadMoney > 0) {
      penalties.push({
        id: `penalty-cut-${contract.id}-${currentYear + 1}`,
        playerId: contract.playerId,
        playerName: contract.playerName,
        reason: 'cut',
        amount: year2DeadMoney,
        year: currentYear + 1,
        yearsRemaining: 2,
      });
    }
  }

  return penalties;
}

/**
 * Executes a player cut
 */
export function executeCut(
  contract: PlayerContract,
  currentYear: number,
  cutType: CutType
): CutResult {
  if (contract.status !== 'active') {
    return {
      success: false,
      contract,
      penalties: [],
      capSavings: 0,
      error: 'Cannot cut player with inactive contract',
    };
  }

  const analysis =
    cutType === 'standard'
      ? analyzeStandardCut(contract, currentYear)
      : cutType === 'post_june_1'
        ? analyzePostJune1Cut(contract, currentYear)
        : analyzeDesignatedPostJune1Cut(contract, currentYear);

  const penalties = createCutPenalties(contract, currentYear, cutType);

  const updatedContract: PlayerContract = {
    ...contract,
    status: 'voided',
    yearsRemaining: 0,
    notes: [
      ...contract.notes,
      `Released (${cutType.replace(/_/g, ' ')}) in ${currentYear} - Dead money: $${(analysis.totalDeadMoney / 1000).toFixed(1)}M`,
    ],
  };

  return {
    success: true,
    contract: updatedContract,
    penalties,
    capSavings: analysis.capSavings,
    error: null,
  };
}

/**
 * Compares multiple cut candidates
 */
export interface CutCandidate {
  contract: PlayerContract;
  breakdown: CutBreakdown;
  valueScore: number; // Lower is better to cut (less value for cap hit)
}

/**
 * Ranks players as cut candidates
 */
export function rankCutCandidates(
  contracts: PlayerContract[],
  currentYear: number,
  minSavings: number = 1000 // Minimum $1M savings to consider
): CutCandidate[] {
  const candidates: CutCandidate[] = [];

  for (const contract of contracts) {
    if (contract.status !== 'active') continue;

    const breakdown = getCutBreakdown(contract, currentYear);
    const bestAnalysis =
      breakdown.bestOption === 'standard'
        ? breakdown.standardCut
        : breakdown.bestOption === 'post_june_1'
          ? breakdown.postJune1Cut
          : breakdown.designatedPostJune1Cut;

    if (bestAnalysis.capSavings < minSavings) continue;

    // Value score: ratio of dead money to cap savings
    // Lower is better (less dead money per dollar saved)
    const valueScore = bestAnalysis.totalDeadMoney / Math.max(1, bestAnalysis.capSavings);

    candidates.push({
      contract,
      breakdown,
      valueScore,
    });
  }

  // Sort by value score (lower is better)
  return candidates.sort((a, b) => a.valueScore - b.valueScore);
}

/**
 * Gets summary for display
 */
export function getCutSummary(breakdown: CutBreakdown): {
  recommendedAction: string;
  savingsDescription: string;
  deadMoneyDescription: string;
  timingAdvice: string;
} {
  const bestAnalysis =
    breakdown.bestOption === 'standard'
      ? breakdown.standardCut
      : breakdown.bestOption === 'post_june_1'
        ? breakdown.postJune1Cut
        : breakdown.designatedPostJune1Cut;

  let recommendedAction: string;
  if (!bestAnalysis.isAdvisable) {
    recommendedAction = 'Keep player or restructure - cut not advisable';
  } else if (breakdown.bestOption === 'standard') {
    recommendedAction = 'Release player (standard cut)';
  } else if (breakdown.bestOption === 'designated_post_june_1') {
    recommendedAction = 'Designate as post-June 1 cut';
  } else {
    recommendedAction = 'Wait until after June 1 to release';
  }

  const savingsDescription = `$${(bestAnalysis.capSavings / 1000).toFixed(1)}M immediate cap savings`;

  let deadMoneyDescription: string;
  if (bestAnalysis.totalDeadMoney === 0) {
    deadMoneyDescription = 'No dead money';
  } else if (bestAnalysis.secondYearDeadMoney > 0) {
    deadMoneyDescription = `$${(bestAnalysis.deadMoney / 1000).toFixed(1)}M year 1, $${(bestAnalysis.secondYearDeadMoney / 1000).toFixed(1)}M year 2`;
  } else {
    deadMoneyDescription = `$${(bestAnalysis.totalDeadMoney / 1000).toFixed(1)}M dead money`;
  }

  let timingAdvice: string;
  if (breakdown.yearsRemaining <= 1) {
    timingAdvice = 'Final year - standard cut is typically best';
  } else if (breakdown.postJune1Cut.capSavings > breakdown.standardCut.capSavings * 1.3) {
    timingAdvice = 'Post-June 1 designation recommended for better cap relief';
  } else {
    timingAdvice = 'Can cut now for immediate roster flexibility';
  }

  return {
    recommendedAction,
    savingsDescription,
    deadMoneyDescription,
    timingAdvice,
  };
}

/**
 * Validates cut is legal
 */
export function validateCut(
  contract: PlayerContract,
  _currentYear: number,
  _cutType: CutType
): { isValid: boolean; error: string | null } {
  if (contract.status !== 'active') {
    return { isValid: false, error: 'Contract is not active' };
  }

  if (contract.yearsRemaining <= 0) {
    return { isValid: false, error: 'Contract has no years remaining' };
  }

  // Post-June 1 designations limited to 2 per team per year (simplified here)
  // In full implementation, would check team's designation count

  return { isValid: true, error: null };
}

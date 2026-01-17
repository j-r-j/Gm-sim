/**
 * Offer Evaluation System
 * Evaluates contract offers from the player's perspective
 * Guaranteed money (bonus) is weighted MORE than non-guaranteed salary
 *
 * NFL Contract Reality:
 * - Players prioritize guaranteed money because they can be cut at any time
 * - A $10M/yr deal with $5M guaranteed is WORSE than $8M/yr with $6M guaranteed
 * - Elite players demand 60%+ of their deal guaranteed
 * - Older players especially value guarantees (injury risk)
 */

import { Position } from '../models/player/Position';
import { ContractOffer } from './Contract';
import { getFranchiseTagValue } from './FranchiseTagSystem';

/**
 * Player's interest level in an offer
 */
export type InterestLevel = 'very_interested' | 'interested' | 'lukewarm' | 'not_interested' | 'insulted';

/**
 * Offer evaluation result
 */
export interface OfferEvaluation {
  /** Interest level (qualitative) */
  interestLevel: InterestLevel;
  /** Acceptance likelihood 0-100 (for UI progress bar) */
  acceptanceLikelihood: number;
  /** Weighted value of the offer from player's perspective */
  perceivedValue: number;
  /** How the offer compares to market (0-100, 100 = at market) */
  marketComparison: number;
  /** Breakdown of evaluation factors */
  factors: {
    bonusScore: number; // How good is the guaranteed money (0-100)
    salaryScore: number; // How good is the non-guaranteed (0-100)
    yearsScore: number; // How good is the length (0-100)
    totalScore: number; // Combined weighted score (0-100)
  };
  /** Player's likely response */
  responseHint: string;
}

/**
 * Player's contract expectations based on their value
 */
export interface PlayerExpectations {
  /** Expected bonus per year (guaranteed) */
  expectedBonusPerYear: number;
  /** Expected salary per year (non-guaranteed) */
  expectedSalaryPerYear: number;
  /** Expected contract length */
  expectedYears: number;
  /** Minimum acceptable bonus per year */
  minimumBonusPerYear: number;
  /** Minimum acceptable total (bonus + salary) per year */
  minimumTotalPerYear: number;
  /** How flexible the player is (affects acceptance threshold) */
  flexibility: 'rigid' | 'moderate' | 'flexible';
}

/**
 * Weights for offer evaluation
 * Bonus (guaranteed) is weighted 2x salary because:
 * - Players can be cut and lose non-guaranteed money
 * - Guaranteed money is "real" money they will receive
 * - This reflects actual NFL player priorities
 */
const EVALUATION_WEIGHTS = {
  bonus: 0.55, // Guaranteed money is most important
  salary: 0.25, // Non-guaranteed matters but less
  years: 0.20, // Contract length affects total value
};

/**
 * Position groups for age-based adjustments
 */
function getPositionGroup(position: Position): string {
  switch (position) {
    case Position.QB:
      return 'QB';
    case Position.RB:
      return 'RB';
    case Position.WR:
    case Position.TE:
      return 'SKILL';
    case Position.LT:
    case Position.LG:
    case Position.C:
    case Position.RG:
    case Position.RT:
      return 'OL';
    case Position.DE:
    case Position.DT:
      return 'DL';
    case Position.OLB:
    case Position.ILB:
      return 'LB';
    case Position.CB:
    case Position.FS:
    case Position.SS:
      return 'DB';
    default:
      return 'ST';
  }
}

/**
 * Get peak age for position (affects how much player values guarantees)
 */
function getPeakAge(position: Position): number {
  const peakAges: Record<string, number> = {
    QB: 32,
    RB: 26,
    SKILL: 28,
    OL: 30,
    DL: 28,
    LB: 27,
    DB: 27,
    ST: 32,
  };
  return peakAges[getPositionGroup(position)] || 28;
}

/**
 * Calculate player's contract expectations based on their attributes
 */
export function calculatePlayerExpectations(
  position: Position,
  overallRating: number,
  age: number,
  experience: number,
  year: number
): PlayerExpectations {
  const franchiseValue = getFranchiseTagValue(position, 1, year);
  const peakAge = getPeakAge(position);

  // Determine market tier based on rating
  let tierMultiplier: number;
  let guaranteePct: number;
  let flexibility: 'rigid' | 'moderate' | 'flexible';

  if (overallRating >= 90) {
    tierMultiplier = 0.95;
    guaranteePct = 0.60;
    flexibility = 'rigid'; // Elite players are demanding
  } else if (overallRating >= 80) {
    tierMultiplier = 0.75;
    guaranteePct = 0.50;
    flexibility = 'moderate';
  } else if (overallRating >= 70) {
    tierMultiplier = 0.55;
    guaranteePct = 0.45;
    flexibility = 'moderate';
  } else if (overallRating >= 60) {
    tierMultiplier = 0.35;
    guaranteePct = 0.35;
    flexibility = 'flexible';
  } else {
    tierMultiplier = 0.15;
    guaranteePct = 0.25;
    flexibility = 'flexible';
  }

  // Age adjustments
  let ageMultiplier = 1.0;
  if (age > peakAge + 3) {
    ageMultiplier = 0.70;
    guaranteePct += 0.10; // Older players want MORE guarantees
  } else if (age > peakAge + 1) {
    ageMultiplier = 0.85;
    guaranteePct += 0.05;
  } else if (age < peakAge - 2) {
    ageMultiplier = 1.05;
  }

  const baseAAV = Math.round(franchiseValue * tierMultiplier * ageMultiplier);

  // Expected years based on age
  let expectedYears: number;
  if (age > peakAge + 2) {
    expectedYears = 2;
  } else if (age > peakAge) {
    expectedYears = 3;
  } else if (overallRating >= 85) {
    expectedYears = 4;
  } else {
    expectedYears = 3;
  }

  // Split AAV into bonus (guaranteed) and salary
  const expectedBonusPerYear = Math.round(baseAAV * guaranteePct);
  const expectedSalaryPerYear = baseAAV - expectedBonusPerYear;

  // Minimums (player will reject offers below this)
  const minimumBonusPerYear = Math.round(expectedBonusPerYear * 0.75);
  const minimumTotalPerYear = Math.round(baseAAV * 0.80);

  return {
    expectedBonusPerYear,
    expectedSalaryPerYear,
    expectedYears,
    minimumBonusPerYear,
    minimumTotalPerYear,
    flexibility,
  };
}

/**
 * Evaluate a contract offer from the player's perspective
 * Returns interest level and acceptance likelihood
 */
export function evaluateContractOffer(
  offer: ContractOffer,
  expectations: PlayerExpectations
): OfferEvaluation {
  const offerTotal = offer.bonusPerYear + offer.salaryPerYear;
  const expectedTotal = expectations.expectedBonusPerYear + expectations.expectedSalaryPerYear;

  // Score each component (0-100 scale, 100 = meets/exceeds expectations)
  const bonusScore = Math.min(100, (offer.bonusPerYear / expectations.expectedBonusPerYear) * 100);
  const salaryScore = Math.min(100, (offer.salaryPerYear / expectations.expectedSalaryPerYear) * 100);
  const yearsScore = Math.min(100, (offer.years / expectations.expectedYears) * 100);

  // Weighted total score
  const totalScore =
    bonusScore * EVALUATION_WEIGHTS.bonus +
    salaryScore * EVALUATION_WEIGHTS.salary +
    yearsScore * EVALUATION_WEIGHTS.years;

  // Market comparison (how close to expected)
  const marketComparison = Math.min(100, (offerTotal / expectedTotal) * 100);

  // Perceived value (weighted heavily toward bonus)
  // This represents how the player VALUES the offer, not just dollar amount
  const perceivedValue = offer.bonusPerYear * 1.5 + offer.salaryPerYear * 0.8;

  // Check minimum thresholds
  const meetsBonusMin = offer.bonusPerYear >= expectations.minimumBonusPerYear;
  const meetsTotalMin = offerTotal >= expectations.minimumTotalPerYear;

  // Calculate acceptance likelihood
  let acceptanceLikelihood: number;

  if (!meetsBonusMin || !meetsTotalMin) {
    // Below minimum - very low acceptance
    acceptanceLikelihood = Math.max(0, totalScore * 0.3);
  } else {
    // Above minimum - use total score with flexibility adjustment
    const flexibilityBonus =
      expectations.flexibility === 'flexible' ? 15 :
      expectations.flexibility === 'moderate' ? 5 : 0;

    acceptanceLikelihood = Math.min(100, totalScore + flexibilityBonus);
  }

  // Determine interest level
  let interestLevel: InterestLevel;
  let responseHint: string;

  if (acceptanceLikelihood >= 90) {
    interestLevel = 'very_interested';
    responseHint = 'Player is eager to sign. Deal likely to be accepted.';
  } else if (acceptanceLikelihood >= 70) {
    interestLevel = 'interested';
    responseHint = 'Player likes the offer. May accept or counter for small improvements.';
  } else if (acceptanceLikelihood >= 50) {
    interestLevel = 'lukewarm';
    responseHint = 'Player is considering it. Likely to counter with higher demands.';
  } else if (acceptanceLikelihood >= 25) {
    interestLevel = 'not_interested';
    responseHint = 'Offer is below expectations. Need significant improvements.';
  } else {
    interestLevel = 'insulted';
    responseHint = 'Offer is insulting. Player may refuse to negotiate.';
  }

  // Adjust response based on what's lacking
  if (meetsTotalMin && !meetsBonusMin) {
    responseHint = 'Player wants more guaranteed money (bonus). The salary is okay but they need security.';
  } else if (!meetsTotalMin && bonusScore > salaryScore) {
    responseHint = 'Overall value is too low. Increase both bonus and salary.';
  }

  return {
    interestLevel,
    acceptanceLikelihood: Math.round(acceptanceLikelihood),
    perceivedValue: Math.round(perceivedValue),
    marketComparison: Math.round(marketComparison),
    factors: {
      bonusScore: Math.round(bonusScore),
      salaryScore: Math.round(salaryScore),
      yearsScore: Math.round(yearsScore),
      totalScore: Math.round(totalScore),
    },
    responseHint,
  };
}

/**
 * Get a description of what the player prioritizes
 */
export function getPlayerPrioritiesDescription(expectations: PlayerExpectations): string[] {
  const priorities: string[] = [];

  const guaranteePct = expectations.expectedBonusPerYear /
    (expectations.expectedBonusPerYear + expectations.expectedSalaryPerYear);

  if (guaranteePct >= 0.55) {
    priorities.push('Heavily prioritizes guaranteed money');
  } else if (guaranteePct >= 0.45) {
    priorities.push('Values guaranteed money highly');
  } else {
    priorities.push('Balance of guaranteed and total value');
  }

  if (expectations.flexibility === 'rigid') {
    priorities.push('Unlikely to negotiate - take it or leave it');
  } else if (expectations.flexibility === 'flexible') {
    priorities.push('Willing to negotiate and find middle ground');
  }

  return priorities;
}

/**
 * Suggest improvements to make an offer more appealing
 */
export function suggestOfferImprovements(
  offer: ContractOffer,
  expectations: PlayerExpectations,
  evaluation: OfferEvaluation
): string[] {
  const suggestions: string[] = [];

  // Check bonus first (most important to players)
  if (evaluation.factors.bonusScore < 80) {
    const neededBonus = expectations.expectedBonusPerYear;
    const increaseNeeded = neededBonus - offer.bonusPerYear;
    if (increaseNeeded > 0) {
      suggestions.push(`Increase guaranteed bonus by ~$${(increaseNeeded / 1000).toFixed(1)}M/year`);
    }
  }

  // Check total compensation
  if (evaluation.marketComparison < 85) {
    suggestions.push('Offer is below market value - increase total compensation');
  }

  // Check years
  if (evaluation.factors.yearsScore < 80 && offer.years < expectations.expectedYears) {
    suggestions.push(`Consider adding ${expectations.expectedYears - offer.years} more year(s)`);
  }

  // Check salary if bonus is okay
  if (evaluation.factors.bonusScore >= 80 && evaluation.factors.salaryScore < 70) {
    suggestions.push('Non-guaranteed salary portion could be higher');
  }

  if (suggestions.length === 0 && evaluation.acceptanceLikelihood >= 85) {
    suggestions.push('Offer looks strong - player likely to accept');
  }

  return suggestions;
}

/**
 * Format money for display
 */
export function formatMoney(thousands: number): string {
  if (thousands >= 1000) {
    return `$${(thousands / 1000).toFixed(1)}M`;
  }
  return `$${thousands}K`;
}

/**
 * Get summary of an offer for display
 */
export function getOfferSummary(offer: ContractOffer): {
  totalPerYear: string;
  bonusPerYear: string;
  salaryPerYear: string;
  totalContract: string;
  guaranteedTotal: string;
  years: number;
} {
  const totalPerYear = offer.bonusPerYear + offer.salaryPerYear;
  const totalContract = totalPerYear * offer.years;
  const guaranteedTotal = offer.bonusPerYear * offer.years;

  return {
    totalPerYear: formatMoney(totalPerYear),
    bonusPerYear: formatMoney(offer.bonusPerYear),
    salaryPerYear: formatMoney(offer.salaryPerYear),
    totalContract: formatMoney(totalContract),
    guaranteedTotal: formatMoney(guaranteedTotal),
    years: offer.years,
  };
}

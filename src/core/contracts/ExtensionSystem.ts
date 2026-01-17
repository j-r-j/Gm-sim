/**
 * Extension System
 * Market value calculation, player demands, and contract negotiation
 */

import { Position } from '../models/player/Position';
import { PlayerContract, ContractOffer, ContractYear, VETERAN_MINIMUM_SALARY } from './Contract';
import { getFranchiseTagValue } from './FranchiseTagSystem';

/**
 * Market value tier
 */
export type MarketTier = 'elite' | 'premium' | 'starter' | 'quality' | 'depth' | 'minimum';

/**
 * Player valuation (HIDDEN from user - engine use only)
 */
export interface PlayerValuation {
  playerId: string;
  position: Position;
  age: number;
  experience: number;
  overallRating: number; // 0-100
  marketTier: MarketTier;
  estimatedAAV: number;
  estimatedYears: number;
  estimatedGuaranteed: number;
  confidenceLevel: number; // 0-1, how certain is this valuation
}

/**
 * Player contract demands
 */
export interface PlayerDemands {
  playerId: string;
  minimumYears: number;
  minimumAAV: number;
  minimumGuaranteed: number;
  preferredYears: number;
  preferredAAV: number;
  preferredGuaranteed: number;
  noTradeClause: boolean;
  noTagClause: boolean;
  flexibilityLevel: 'rigid' | 'moderate' | 'flexible';
  willingToTakeLessToConte: boolean;
}

/**
 * Negotiation result
 */
export interface NegotiationResult {
  accepted: boolean;
  counterOffer: ContractOffer | null;
  playerResponse: string;
  negotiationRound: number;
  closeness: number; // 0-1, how close to agreement
}

/**
 * Extension result
 */
export interface ExtensionResult {
  success: boolean;
  newContract: PlayerContract | null;
  yearsAdded: number;
  newMoneyAdded: number;
  error: string | null;
}

/**
 * Market value percentages by position (percentage of franchise tag)
 * HIDDEN - used for engine calculations
 */
const MARKET_TIER_PERCENTAGES: Record<MarketTier, { min: number; max: number }> = {
  elite: { min: 1.0, max: 1.25 }, // 100-125% of franchise tag
  premium: { min: 0.85, max: 1.0 }, // 85-100%
  starter: { min: 0.65, max: 0.85 }, // 65-85%
  quality: { min: 0.45, max: 0.65 }, // 45-65%
  depth: { min: 0.25, max: 0.45 }, // 25-45%
  minimum: { min: 0, max: 0.25 }, // Vet minimum to 25%
};

/**
 * Guarantee percentages by tier
 */
const GUARANTEE_PERCENTAGES: Record<MarketTier, { min: number; max: number }> = {
  elite: { min: 0.5, max: 0.7 }, // 50-70% guaranteed
  premium: { min: 0.4, max: 0.55 },
  starter: { min: 0.3, max: 0.45 },
  quality: { min: 0.2, max: 0.35 },
  depth: { min: 0.1, max: 0.25 },
  minimum: { min: 0, max: 0.15 },
};

/**
 * Contract length by tier and age
 */
function getExpectedContractYears(tier: MarketTier, age: number): { min: number; max: number } {
  // Base years by tier
  const baseYears: Record<MarketTier, { min: number; max: number }> = {
    elite: { min: 4, max: 6 },
    premium: { min: 3, max: 5 },
    starter: { min: 3, max: 4 },
    quality: { min: 2, max: 3 },
    depth: { min: 1, max: 2 },
    minimum: { min: 1, max: 1 },
  };

  const years = baseYears[tier];

  // Age adjustments
  if (age >= 32) {
    return { min: 1, max: Math.min(2, years.max) };
  } else if (age >= 30) {
    return { min: Math.min(2, years.min), max: Math.min(3, years.max) };
  } else if (age >= 28) {
    return { min: years.min, max: Math.min(4, years.max) };
  }

  return years;
}

/**
 * Determines market tier based on player rating (HIDDEN)
 */
export function determineMarketTier(overallRating: number, position: Position): MarketTier {
  // Position adjustments - premium positions have higher bars
  const isPremiumPosition = [
    Position.QB,
    Position.DE,
    Position.CB,
    Position.LT,
    Position.WR,
  ].includes(position);
  const adjustedRating = isPremiumPosition ? overallRating : overallRating + 3;

  if (adjustedRating >= 90) return 'elite';
  if (adjustedRating >= 80) return 'premium';
  if (adjustedRating >= 70) return 'starter';
  if (adjustedRating >= 60) return 'quality';
  if (adjustedRating >= 50) return 'depth';
  return 'minimum';
}

/**
 * Calculates estimated market value (HIDDEN - for engine use)
 */
export function calculateMarketValue(
  position: Position,
  overallRating: number,
  age: number,
  experience: number,
  currentYear: number
): PlayerValuation {
  const tier = determineMarketTier(overallRating, position);
  const franchiseValue = getFranchiseTagValue(position, 1, currentYear);

  // Calculate AAV based on tier
  const tierPcts = MARKET_TIER_PERCENTAGES[tier];
  const ratingWithinTier = (overallRating % 10) / 10; // Position within tier
  const aavPct = tierPcts.min + (tierPcts.max - tierPcts.min) * ratingWithinTier;
  let estimatedAAV = Math.round(franchiseValue * aavPct);

  // Age discount
  if (age >= 32) {
    estimatedAAV = Math.round(estimatedAAV * 0.75);
  } else if (age >= 30) {
    estimatedAAV = Math.round(estimatedAAV * 0.85);
  } else if (age >= 28) {
    estimatedAAV = Math.round(estimatedAAV * 0.95);
  }

  // Minimum salary floor
  const minSalary = VETERAN_MINIMUM_SALARY[Math.min(experience, 7)] ?? VETERAN_MINIMUM_SALARY[7];
  estimatedAAV = Math.max(estimatedAAV, minSalary);

  // Years
  const yearsRange = getExpectedContractYears(tier, age);
  const estimatedYears = Math.round((yearsRange.min + yearsRange.max) / 2);

  // Guarantees
  const guaranteePcts = GUARANTEE_PERCENTAGES[tier];
  const guaranteePct = (guaranteePcts.min + guaranteePcts.max) / 2;
  const estimatedGuaranteed = Math.round(estimatedAAV * estimatedYears * guaranteePct);

  // Confidence based on sample size (experience)
  const confidenceLevel = Math.min(1, 0.5 + experience * 0.1);

  return {
    playerId: '',
    position,
    age,
    experience,
    overallRating,
    marketTier: tier,
    estimatedAAV,
    estimatedYears,
    estimatedGuaranteed,
    confidenceLevel,
  };
}

/**
 * Generates player demands based on valuation (HIDDEN - engine use)
 */
export function generatePlayerDemands(
  valuation: PlayerValuation,
  playerPersonality: { greedy: number; loyal: number; competitive: number } // 0-100 each
): PlayerDemands {
  // Base demands from valuation
  let preferredAAV = valuation.estimatedAAV;
  let preferredYears = valuation.estimatedYears;
  let preferredGuaranteed = valuation.estimatedGuaranteed;

  // Greedy players ask for more
  if (playerPersonality.greedy > 70) {
    preferredAAV = Math.round(preferredAAV * 1.15);
    preferredGuaranteed = Math.round(preferredGuaranteed * 1.2);
  } else if (playerPersonality.greedy > 50) {
    preferredAAV = Math.round(preferredAAV * 1.05);
  }

  // Minimum is 85% of preferred
  const minimumAAV = Math.round(preferredAAV * 0.85);
  const minimumGuaranteed = Math.round(preferredGuaranteed * 0.75);
  const minimumYears = Math.max(1, preferredYears - 1);

  // Flexibility based on personality
  let flexibilityLevel: 'rigid' | 'moderate' | 'flexible';
  if (playerPersonality.greedy > 70) {
    flexibilityLevel = 'rigid';
  } else if (playerPersonality.loyal > 60) {
    flexibilityLevel = 'flexible';
  } else {
    flexibilityLevel = 'moderate';
  }

  // Elite players want no-trade/no-tag clauses
  const wantsNTC = valuation.marketTier === 'elite' || valuation.marketTier === 'premium';
  const wantsNoTag = valuation.marketTier === 'elite';

  return {
    playerId: valuation.playerId,
    minimumYears,
    minimumAAV,
    minimumGuaranteed,
    preferredYears,
    preferredAAV,
    preferredGuaranteed,
    noTradeClause: wantsNTC,
    noTagClause: wantsNoTag,
    flexibilityLevel,
    willingToTakeLessToConte: playerPersonality.competitive > 70,
  };
}

/**
 * Evaluates an offer against player demands
 * Uses simplified bonus/salary model where bonus is weighted higher
 */
export function evaluateOffer(offer: ContractOffer, demands: PlayerDemands): NegotiationResult {
  // Calculate offer AAV and guaranteed from new model
  const offerAAV = offer.bonusPerYear + offer.salaryPerYear;
  const offerGuaranteed = offer.bonusPerYear * offer.years;

  // Calculate how close each component is to demands
  // Weight guaranteed (bonus) higher than total - players care more about guarantees
  const aavScore = Math.min(1, offerAAV / demands.preferredAAV);
  const yearsScore = Math.min(1, offer.years / demands.preferredYears);
  const guaranteedScore = Math.min(1, offerGuaranteed / demands.preferredGuaranteed);

  // Weighted closeness - guaranteed money weighted highest
  const closeness = aavScore * 0.35 + yearsScore * 0.15 + guaranteedScore * 0.50;

  // Check minimum thresholds
  const meetsMinimumAAV = offerAAV >= demands.minimumAAV;
  const meetsMinimumYears = offer.years >= demands.minimumYears;
  const meetsMinimumGuaranteed = offerGuaranteed >= demands.minimumGuaranteed;

  if (!meetsMinimumAAV || !meetsMinimumYears || !meetsMinimumGuaranteed) {
    // Generate counter-offer with new model
    const preferredGuaranteePct = demands.preferredGuaranteed / (demands.preferredAAV * demands.preferredYears);
    const counterBonusPerYear = Math.round(demands.preferredAAV * preferredGuaranteePct);
    const counterSalaryPerYear = demands.preferredAAV - counterBonusPerYear;

    const counterOffer: ContractOffer = {
      years: demands.preferredYears,
      bonusPerYear: counterBonusPerYear,
      salaryPerYear: counterSalaryPerYear,
      noTradeClause: demands.noTradeClause,
    };

    let response: string;
    if (!meetsMinimumGuaranteed) {
      response = 'We need more guaranteed money (bonus) to provide security.';
    } else if (!meetsMinimumAAV) {
      response = 'The offer is well below market value. We need significantly more.';
    } else {
      response = "The contract length doesn't meet our requirements.";
    }

    return {
      accepted: false,
      counterOffer,
      playerResponse: response,
      negotiationRound: 1,
      closeness,
    };
  }

  // Above minimums - check if close enough to accept
  const acceptanceThreshold =
    demands.flexibilityLevel === 'flexible'
      ? 0.80
      : demands.flexibilityLevel === 'moderate'
        ? 0.88
        : 0.95;

  if (closeness >= acceptanceThreshold) {
    return {
      accepted: true,
      counterOffer: null,
      playerResponse: "We're happy with the terms. Let's finalize the deal.",
      negotiationRound: 1,
      closeness,
    };
  }

  // Close but needs adjustment - split the difference
  const preferredGuaranteePct = demands.preferredGuaranteed / (demands.preferredAAV * demands.preferredYears);
  const counterBonusPerYear = Math.round(
    (offer.bonusPerYear + demands.preferredAAV * preferredGuaranteePct) / 2
  );
  const counterSalaryPerYear = Math.round(
    (offer.salaryPerYear + demands.preferredAAV * (1 - preferredGuaranteePct)) / 2
  );

  const counterOffer: ContractOffer = {
    years: Math.round((offer.years + demands.preferredYears) / 2),
    bonusPerYear: counterBonusPerYear,
    salaryPerYear: counterSalaryPerYear,
    noTradeClause: demands.noTradeClause || offer.noTradeClause,
  };

  return {
    accepted: false,
    counterOffer,
    playerResponse: "We're close, but need more guaranteed money.",
    negotiationRound: 1,
    closeness,
  };
}

/**
 * Extends an existing contract using bonus/salary model
 */
export function extendContract(
  existingContract: PlayerContract,
  newYears: number,
  bonusPerYear: number,
  salaryPerYear: number,
  currentYear: number
): ExtensionResult {
  if (existingContract.status !== 'active') {
    return {
      success: false,
      newContract: null,
      yearsAdded: 0,
      newMoneyAdded: 0,
      error: 'Can only extend active contracts',
    };
  }

  if (newYears < 1 || newYears > 5) {
    return {
      success: false,
      newContract: null,
      yearsAdded: 0,
      newMoneyAdded: 0,
      error: 'Extension must be 1-5 years',
    };
  }

  // Keep remaining years from current contract
  const remainingYears = existingContract.yearlyBreakdown.filter(
    (y) => y.year >= currentYear && !y.isVoidYear
  );

  // Create new extension years
  const extensionStartYear = existingContract.signedYear + existingContract.totalYears;

  const newExtensionYears: ContractYear[] = [];
  for (let i = 0; i < newYears; i++) {
    const year = extensionStartYear + i;
    newExtensionYears.push({
      year,
      bonus: bonusPerYear,
      salary: salaryPerYear,
      capHit: bonusPerYear + salaryPerYear,
      isVoidYear: false,
    });
  }

  // Combine all years
  const pastYears = existingContract.yearlyBreakdown.filter((y) => y.year < currentYear);
  const allYears = [...pastYears, ...remainingYears, ...newExtensionYears];

  const newMoney = (bonusPerYear + salaryPerYear) * newYears;
  const newGuaranteed = bonusPerYear * newYears;

  const totalYears = existingContract.yearsRemaining + newYears;
  const totalValue = existingContract.totalValue + newMoney;
  const totalGuaranteed = existingContract.guaranteedMoney + newGuaranteed;

  const newContract: PlayerContract = {
    ...existingContract,
    id: `${existingContract.id}-ext-${currentYear}`,
    totalYears,
    yearsRemaining: totalYears,
    totalValue,
    guaranteedMoney: totalGuaranteed,
    signingBonus: 0, // Not used in simplified model
    averageAnnualValue: Math.round(totalValue / totalYears),
    yearlyBreakdown: allYears,
    type: 'extension',
    notes: [
      ...existingContract.notes,
      `Extended ${newYears} years, $${(newMoney / 1000).toFixed(1)}M new money in ${currentYear}`,
    ],
    originalContractId: existingContract.originalContractId || existingContract.id,
  };

  return {
    success: true,
    newContract,
    yearsAdded: newYears,
    newMoneyAdded: newMoney,
    error: null,
  };
}

/**
 * Gets extension-eligible contracts
 */
export function getExtensionEligible(
  contracts: PlayerContract[],
  _currentYear: number
): PlayerContract[] {
  return contracts.filter((c) => {
    // Must be active
    if (c.status !== 'active') return false;

    // Typically can extend in final 2 years
    if (c.yearsRemaining > 2) return false;

    // Can't extend franchise tags
    if (c.type === 'franchise_tag' || c.type === 'transition_tag') return false;

    return true;
  });
}

/**
 * Calculates recommended extension offer using bonus/salary model
 */
export function calculateRecommendedOffer(
  valuation: PlayerValuation,
  _existingContract: PlayerContract,
  targetYears: number = 3
): ContractOffer {
  // Calculate guarantee percentage based on market tier
  const guaranteePcts: Record<MarketTier, number> = {
    elite: 0.60,
    premium: 0.50,
    starter: 0.45,
    quality: 0.35,
    depth: 0.25,
    minimum: 0.20,
  };
  const guaranteePct = guaranteePcts[valuation.marketTier] || 0.40;

  const bonusPerYear = Math.round(valuation.estimatedAAV * guaranteePct);
  const salaryPerYear = valuation.estimatedAAV - bonusPerYear;

  return {
    years: targetYears,
    bonusPerYear,
    salaryPerYear,
    noTradeClause: valuation.marketTier === 'elite',
  };
}

/**
 * Gets extension summary for display (PUBLIC info only)
 */
export function getExtensionSummary(
  existingContract: PlayerContract,
  proposedOffer: ContractOffer
): {
  currentContractRemaining: string;
  proposedNewMoney: string;
  proposedNewYears: number;
  newTotalYears: number;
  newAAV: string;
  bonusPerYear: string;
  salaryPerYear: string;
  capImpactDescription: string;
} {
  const formatMoney = (value: number): string => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}M`;
    }
    return `$${value}K`;
  };

  const currentRemaining = existingContract.yearlyBreakdown
    .filter(
      (y) =>
        y.year >=
        existingContract.signedYear + existingContract.totalYears - existingContract.yearsRemaining
    )
    .reduce((sum, y) => sum + y.capHit, 0);

  const offerAAV = proposedOffer.bonusPerYear + proposedOffer.salaryPerYear;
  const newTotalYears = existingContract.yearsRemaining + proposedOffer.years;
  const newTotalValue = existingContract.totalValue + offerAAV * proposedOffer.years;
  const newAAV = newTotalValue / newTotalYears;

  const capImpactDescription = `${formatMoney(proposedOffer.bonusPerYear)}/yr guaranteed, ${formatMoney(proposedOffer.salaryPerYear)}/yr non-guaranteed`;

  return {
    currentContractRemaining: formatMoney(currentRemaining),
    proposedNewMoney: formatMoney(offerAAV * proposedOffer.years),
    proposedNewYears: proposedOffer.years,
    newTotalYears,
    newAAV: formatMoney(newAAV),
    bonusPerYear: formatMoney(proposedOffer.bonusPerYear),
    salaryPerYear: formatMoney(proposedOffer.salaryPerYear),
    capImpactDescription,
  };
}

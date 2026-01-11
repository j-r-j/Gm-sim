/**
 * Market Value Calculator
 * Calculates player market value based on age, production, position, and market factors
 */

import { Position } from '../models/player/Position';
import { getFranchiseTagValue } from '../contracts/FranchiseTagSystem';
import { VETERAN_MINIMUM_SALARY } from '../contracts/Contract';

/**
 * Market demand level for a position
 */
export type MarketDemand = 'very_high' | 'high' | 'moderate' | 'low' | 'very_low';

/**
 * Production tier (HIDDEN - engine use only)
 */
export type ProductionTier = 'elite' | 'pro_bowl' | 'starter' | 'quality' | 'depth' | 'minimum';

/**
 * Market conditions affecting all players
 */
export interface MarketConditions {
  year: number;
  salaryCap: number;
  capGrowthRate: number;
  positionDemand: Map<Position, MarketDemand>;
  supplyByPosition: Map<Position, number>;
  averageContractsByPosition: Map<Position, number>;
}

/**
 * Player production metrics (HIDDEN from user)
 */
export interface PlayerProduction {
  playerId: string;
  position: Position;
  age: number;
  experience: number;
  overallRating: number;
  recentPerformance: number; // 0-100, weighted recent seasons
  durability: number; // 0-100, games played ratio
  primeYearsRemaining: number;
  trajectory: 'ascending' | 'peak' | 'declining' | 'unknown';
}

/**
 * Market value result
 */
export interface MarketValueResult {
  baseValue: number;
  ageAdjustedValue: number;
  demandAdjustedValue: number;
  finalValue: number;
  projectedAAV: number;
  projectedYears: number;
  projectedGuaranteed: number;
  tier: ProductionTier;
  reasoning: string;
}

/**
 * Position value multipliers (relative to franchise tag)
 */
const POSITION_VALUE_MULTIPLIERS: Record<Position, number> = {
  [Position.QB]: 1.0,
  [Position.DE]: 0.95,
  [Position.CB]: 0.9,
  [Position.LT]: 0.88,
  [Position.WR]: 0.85,
  [Position.DT]: 0.82,
  [Position.OLB]: 0.8,
  [Position.FS]: 0.78,
  [Position.SS]: 0.78,
  [Position.TE]: 0.75,
  [Position.ILB]: 0.72,
  [Position.RB]: 0.7,
  [Position.LG]: 0.68,
  [Position.RG]: 0.68,
  [Position.C]: 0.65,
  [Position.RT]: 0.85,
  [Position.K]: 0.4,
  [Position.P]: 0.35,
};

/**
 * Age decline curves by position group
 */
const AGE_DECLINE_FACTORS: Record<string, { peakAge: number; declineRate: number }> = {
  QB: { peakAge: 32, declineRate: 0.03 },
  RB: { peakAge: 26, declineRate: 0.08 },
  WR: { peakAge: 28, declineRate: 0.05 },
  TE: { peakAge: 28, declineRate: 0.05 },
  OL: { peakAge: 30, declineRate: 0.04 },
  DL: { peakAge: 28, declineRate: 0.05 },
  LB: { peakAge: 27, declineRate: 0.06 },
  DB: { peakAge: 27, declineRate: 0.06 },
  ST: { peakAge: 32, declineRate: 0.03 },
};

/**
 * Gets position group for age calculations
 */
function getPositionGroup(position: Position): string {
  switch (position) {
    case Position.QB:
      return 'QB';
    case Position.RB:
      return 'RB';
    case Position.WR:
      return 'WR';
    case Position.TE:
      return 'TE';
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
    case Position.K:
    case Position.P:
      return 'ST';
    default:
      return 'DB';
  }
}

/**
 * Creates default market conditions
 */
export function createDefaultMarketConditions(year: number, salaryCap: number): MarketConditions {
  const positionDemand = new Map<Position, MarketDemand>();
  const supplyByPosition = new Map<Position, number>();
  const averageContractsByPosition = new Map<Position, number>();

  // Set default demand levels (can be adjusted based on actual FA pool)
  positionDemand.set(Position.QB, 'very_high');
  positionDemand.set(Position.DE, 'high');
  positionDemand.set(Position.CB, 'high');
  positionDemand.set(Position.LT, 'high');
  positionDemand.set(Position.WR, 'moderate');
  positionDemand.set(Position.DT, 'moderate');
  positionDemand.set(Position.OLB, 'moderate');
  positionDemand.set(Position.FS, 'moderate');
  positionDemand.set(Position.SS, 'moderate');
  positionDemand.set(Position.TE, 'moderate');
  positionDemand.set(Position.ILB, 'low');
  positionDemand.set(Position.RB, 'low');
  positionDemand.set(Position.LG, 'low');
  positionDemand.set(Position.RG, 'low');
  positionDemand.set(Position.C, 'low');
  positionDemand.set(Position.RT, 'moderate');
  positionDemand.set(Position.K, 'very_low');
  positionDemand.set(Position.P, 'very_low');

  return {
    year,
    salaryCap,
    capGrowthRate: 0.08, // ~8% annual cap growth
    positionDemand,
    supplyByPosition,
    averageContractsByPosition,
  };
}

/**
 * Updates market conditions based on actual free agent pool
 */
export function updateMarketConditions(
  conditions: MarketConditions,
  freeAgentCounts: Map<Position, number>,
  teamNeeds: Map<Position, number>
): MarketConditions {
  const newDemand = new Map<Position, MarketDemand>(conditions.positionDemand);
  const newSupply = new Map<Position, number>(freeAgentCounts);

  // Adjust demand based on supply/demand ratio
  for (const [position, count] of freeAgentCounts) {
    const needs = teamNeeds.get(position) || 0;
    const ratio = needs > 0 ? count / needs : 1;

    let demand: MarketDemand;
    if (ratio < 0.3) {
      demand = 'very_high';
    } else if (ratio < 0.5) {
      demand = 'high';
    } else if (ratio < 1.0) {
      demand = 'moderate';
    } else if (ratio < 2.0) {
      demand = 'low';
    } else {
      demand = 'very_low';
    }

    newDemand.set(position, demand);
  }

  return {
    ...conditions,
    positionDemand: newDemand,
    supplyByPosition: newSupply,
  };
}

/**
 * Determines production tier from rating
 */
export function determineProductionTier(overallRating: number, position: Position): ProductionTier {
  // Premium positions have higher standards
  const isPremium = [Position.QB, Position.DE, Position.CB, Position.LT, Position.WR].includes(
    position
  );
  const adjustedRating = isPremium ? overallRating : overallRating + 3;

  if (adjustedRating >= 92) return 'elite';
  if (adjustedRating >= 85) return 'pro_bowl';
  if (adjustedRating >= 75) return 'starter';
  if (adjustedRating >= 65) return 'quality';
  if (adjustedRating >= 55) return 'depth';
  return 'minimum';
}

/**
 * Tier value percentages relative to franchise tag
 */
const TIER_VALUE_PERCENTAGES: Record<ProductionTier, { min: number; max: number }> = {
  elite: { min: 1.0, max: 1.3 },
  pro_bowl: { min: 0.8, max: 1.0 },
  starter: { min: 0.55, max: 0.8 },
  quality: { min: 0.35, max: 0.55 },
  depth: { min: 0.2, max: 0.35 },
  minimum: { min: 0, max: 0.2 },
};

/**
 * Contract length expectations by tier and age
 */
function getExpectedYears(tier: ProductionTier, age: number, position: Position): number {
  const group = getPositionGroup(position);
  const { peakAge } = AGE_DECLINE_FACTORS[group] || { peakAge: 28 };

  const baseYears: Record<ProductionTier, number> = {
    elite: 5,
    pro_bowl: 4,
    starter: 3,
    quality: 2,
    depth: 1,
    minimum: 1,
  };

  let years = baseYears[tier];

  // Age adjustments
  if (age >= peakAge + 4) {
    years = Math.min(years, 2);
  } else if (age >= peakAge + 2) {
    years = Math.min(years, 3);
  } else if (age >= peakAge) {
    years = Math.min(years, 4);
  }

  return Math.max(1, years);
}

/**
 * Calculates age adjustment factor
 */
export function calculateAgeAdjustment(age: number, position: Position): number {
  const group = getPositionGroup(position);
  const factors = AGE_DECLINE_FACTORS[group] || { peakAge: 28, declineRate: 0.05 };

  if (age <= factors.peakAge) {
    // Young players get premium
    if (age <= factors.peakAge - 3) {
      return 1.1; // Young player premium
    }
    return 1.0;
  }

  // Calculate decline based on years past peak
  const yearsPastPeak = age - factors.peakAge;
  const declineFactor = Math.pow(1 - factors.declineRate, yearsPastPeak);

  // Floor at 0.5 for very old players
  return Math.max(0.5, declineFactor);
}

/**
 * Calculates demand adjustment factor
 */
export function calculateDemandAdjustment(
  position: Position,
  conditions: MarketConditions
): number {
  const demand = conditions.positionDemand.get(position) || 'moderate';

  const demandMultipliers: Record<MarketDemand, number> = {
    very_high: 1.2,
    high: 1.1,
    moderate: 1.0,
    low: 0.9,
    very_low: 0.8,
  };

  return demandMultipliers[demand];
}

/**
 * Calculates player's estimated prime years remaining
 */
export function calculatePrimeYearsRemaining(age: number, position: Position): number {
  const group = getPositionGroup(position);
  const { peakAge, declineRate } = AGE_DECLINE_FACTORS[group] || { peakAge: 28, declineRate: 0.05 };

  // Consider "prime" as years until significant decline
  const declineStart = peakAge + 2;
  const primeEnd = declineStart + Math.ceil(0.15 / declineRate); // Until 15% decline

  const remaining = primeEnd - age;
  return Math.max(0, remaining);
}

/**
 * Calculates trajectory based on recent performance
 */
export function determineTrajectory(
  age: number,
  recentPerformance: number,
  position: Position
): 'ascending' | 'peak' | 'declining' | 'unknown' {
  const group = getPositionGroup(position);
  const { peakAge } = AGE_DECLINE_FACTORS[group] || { peakAge: 28 };

  if (age < peakAge - 2) {
    if (recentPerformance >= 75) {
      return 'ascending';
    }
    return 'unknown';
  }

  if (age >= peakAge - 2 && age <= peakAge + 1) {
    return 'peak';
  }

  if (recentPerformance >= 80) {
    return 'peak'; // Still performing at high level despite age
  }

  return 'declining';
}

/**
 * Main market value calculation function
 */
export function calculateMarketValue(
  production: PlayerProduction,
  conditions: MarketConditions
): MarketValueResult {
  const franchiseValue = getFranchiseTagValue(production.position, 1, conditions.year);
  const tier = determineProductionTier(production.overallRating, production.position);

  // Calculate base value from tier and rating
  const tierRange = TIER_VALUE_PERCENTAGES[tier];
  const ratingWithinTier = (production.overallRating % 10) / 10;
  const tierPct = tierRange.min + (tierRange.max - tierRange.min) * ratingWithinTier;

  const positionMultiplier = POSITION_VALUE_MULTIPLIERS[production.position] || 0.7;
  const baseValue = Math.round(franchiseValue * tierPct * positionMultiplier);

  // Apply age adjustment
  const ageAdjustment = calculateAgeAdjustment(production.age, production.position);
  const ageAdjustedValue = Math.round(baseValue * ageAdjustment);

  // Apply demand adjustment
  const demandAdjustment = calculateDemandAdjustment(production.position, conditions);
  const demandAdjustedValue = Math.round(ageAdjustedValue * demandAdjustment);

  // Apply durability adjustment
  const durabilityAdjustment = 0.9 + (production.durability / 100) * 0.1;
  const durabilityAdjustedValue = Math.round(demandAdjustedValue * durabilityAdjustment);

  // Apply trajectory adjustment
  let trajectoryAdjustment = 1.0;
  if (production.trajectory === 'ascending') {
    trajectoryAdjustment = 1.1;
  } else if (production.trajectory === 'declining') {
    trajectoryAdjustment = 0.85;
  }

  const finalValue = Math.round(durabilityAdjustedValue * trajectoryAdjustment);

  // Ensure minimum salary floor
  const minSalary =
    VETERAN_MINIMUM_SALARY[Math.min(production.experience, 7)] ?? VETERAN_MINIMUM_SALARY[7];
  const projectedAAV = Math.max(finalValue, minSalary);

  // Calculate contract structure
  const projectedYears = getExpectedYears(tier, production.age, production.position);

  // Guaranteed money based on tier
  const guaranteePercentages: Record<ProductionTier, number> = {
    elite: 0.65,
    pro_bowl: 0.55,
    starter: 0.45,
    quality: 0.35,
    depth: 0.25,
    minimum: 0.15,
  };
  const guaranteePct = guaranteePercentages[tier];
  const projectedGuaranteed = Math.round(projectedAAV * projectedYears * guaranteePct);

  // Generate reasoning
  const reasoningParts: string[] = [];
  if (tier === 'elite' || tier === 'pro_bowl') {
    reasoningParts.push(`${tier} level player`);
  }
  if (ageAdjustment < 0.9) {
    reasoningParts.push('age discount applied');
  } else if (ageAdjustment > 1.0) {
    reasoningParts.push('young player premium');
  }
  if (demandAdjustment > 1.05) {
    reasoningParts.push('high position demand');
  } else if (demandAdjustment < 0.95) {
    reasoningParts.push('lower position demand');
  }
  if (production.trajectory === 'ascending') {
    reasoningParts.push('ascending trajectory');
  } else if (production.trajectory === 'declining') {
    reasoningParts.push('declining trajectory');
  }

  const reasoning =
    reasoningParts.length > 0 ? reasoningParts.join(', ') : 'Standard market valuation';

  return {
    baseValue,
    ageAdjustedValue,
    demandAdjustedValue,
    finalValue: projectedAAV,
    projectedAAV,
    projectedYears,
    projectedGuaranteed,
    tier,
    reasoning,
  };
}

/**
 * Calculates market value for multiple players
 */
export function calculateMarketValues(
  productions: PlayerProduction[],
  conditions: MarketConditions
): Map<string, MarketValueResult> {
  const results = new Map<string, MarketValueResult>();

  for (const production of productions) {
    const result = calculateMarketValue(production, conditions);
    results.set(production.playerId, result);
  }

  return results;
}

/**
 * Ranks free agents by market value
 */
export function rankByMarketValue(
  productions: PlayerProduction[],
  conditions: MarketConditions
): Array<{ playerId: string; marketValue: number; tier: ProductionTier }> {
  const results = calculateMarketValues(productions, conditions);

  return Array.from(results.entries())
    .map(([playerId, result]) => ({
      playerId,
      marketValue: result.finalValue,
      tier: result.tier,
    }))
    .sort((a, b) => b.marketValue - a.marketValue);
}

/**
 * Gets market value summary for display (PUBLIC info)
 */
export interface MarketValueSummary {
  estimatedValue: string;
  contractProjection: string;
  marketDescription: string;
}

export function getMarketValueSummary(result: MarketValueResult): MarketValueSummary {
  const formatMoney = (value: number): string => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}M`;
    }
    return `$${value}K`;
  };

  const tierDescriptions: Record<ProductionTier, string> = {
    elite: 'Top of the market',
    pro_bowl: 'Premium player',
    starter: 'Solid starter value',
    quality: 'Quality depth option',
    depth: 'Depth/rotational value',
    minimum: 'Minimum salary range',
  };

  return {
    estimatedValue: formatMoney(result.projectedAAV),
    contractProjection: `${result.projectedYears}yr / ${formatMoney(result.projectedAAV * result.projectedYears)}`,
    marketDescription: tierDescriptions[result.tier],
  };
}

/**
 * Compares a contract offer to market value
 */
export interface OfferComparison {
  offerAAV: number;
  marketAAV: number;
  percentageOfMarket: number;
  assessment: 'above_market' | 'at_market' | 'below_market' | 'significantly_below';
  description: string;
}

export function compareOfferToMarket(
  offerTotalValue: number,
  offerYears: number,
  marketValue: MarketValueResult
): OfferComparison {
  const offerAAV = Math.round(offerTotalValue / offerYears);
  const percentageOfMarket = (offerAAV / marketValue.projectedAAV) * 100;

  let assessment: OfferComparison['assessment'];
  let description: string;

  if (percentageOfMarket >= 110) {
    assessment = 'above_market';
    description = 'Offer exceeds market expectations';
  } else if (percentageOfMarket >= 95) {
    assessment = 'at_market';
    description = 'Offer is in line with market value';
  } else if (percentageOfMarket >= 80) {
    assessment = 'below_market';
    description = 'Offer is below market expectations';
  } else {
    assessment = 'significantly_below';
    description = 'Offer is significantly below market value';
  }

  return {
    offerAAV,
    marketAAV: marketValue.projectedAAV,
    percentageOfMarket,
    assessment,
    description,
  };
}

/**
 * Validates production metrics
 */
export function validatePlayerProduction(production: PlayerProduction): boolean {
  if (!production.playerId || typeof production.playerId !== 'string') return false;
  if (typeof production.age !== 'number' || production.age < 20 || production.age > 45)
    return false;
  if (typeof production.experience !== 'number' || production.experience < 0) return false;
  if (
    typeof production.overallRating !== 'number' ||
    production.overallRating < 0 ||
    production.overallRating > 100
  )
    return false;
  if (
    typeof production.recentPerformance !== 'number' ||
    production.recentPerformance < 0 ||
    production.recentPerformance > 100
  )
    return false;
  if (
    typeof production.durability !== 'number' ||
    production.durability < 0 ||
    production.durability > 100
  )
    return false;

  return true;
}

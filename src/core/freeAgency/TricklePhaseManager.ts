/**
 * Trickle Phase Manager
 * Manages the slower-paced period of free agency after the initial frenzy
 * Features bargain signings, veteran minimum deals, and patient negotiations
 */

import { Position } from '../models/player/Position';
import { ContractOffer, VETERAN_MINIMUM_SALARY } from '../contracts/Contract';
import { FreeAgent, TeamFABudget } from './FreeAgencyManager';
import { MarketValueResult, ProductionTier } from './MarketValueCalculator';

/**
 * Trickle phase sub-phases
 */
export type TrickleSubPhase = 'early' | 'mid' | 'late' | 'training_camp';

/**
 * Market adjustment over time
 */
export interface MarketAdjustment {
  daysSinceFrenzy: number;
  valueMultiplier: number;
  patienceLevel: number;
}

/**
 * Bargain signing opportunity
 */
export interface BargainOpportunity {
  freeAgentId: string;
  originalMarketValue: number;
  currentAskingPrice: number;
  discountPercentage: number;
  daysOnMarket: number;
  reason: 'age' | 'injury_history' | 'market_saturated' | 'position_depth' | 'late_signing';
}

/**
 * Trickle phase state
 */
export interface TricklePhaseState {
  isActive: boolean;
  subPhase: TrickleSubPhase;
  dayNumber: number;
  totalDays: number;
  marketAdjustments: Map<string, MarketAdjustment>;
  bargainOpportunities: BargainOpportunity[];
  minimumSignings: string[];
  visitHistory: Map<string, string[]>; // playerId -> teamIds that have visited
}

/**
 * Creates initial trickle phase state
 */
export function createTricklePhaseState(totalDays: number = 90): TricklePhaseState {
  return {
    isActive: false,
    subPhase: 'early',
    dayNumber: 0,
    totalDays,
    marketAdjustments: new Map(),
    bargainOpportunities: [],
    minimumSignings: [],
    visitHistory: new Map(),
  };
}

/**
 * Starts the trickle phase
 */
export function startTricklePhase(state: TricklePhaseState): TricklePhaseState {
  return {
    ...state,
    isActive: true,
    subPhase: 'early',
    dayNumber: 1,
  };
}

/**
 * Ends the trickle phase
 */
export function endTricklePhase(state: TricklePhaseState): TricklePhaseState {
  return {
    ...state,
    isActive: false,
  };
}

/**
 * Advances the trickle phase by one day
 */
export function advanceTrickleDay(state: TricklePhaseState): TricklePhaseState {
  const newDay = state.dayNumber + 1;

  // Determine sub-phase
  let subPhase: TrickleSubPhase;
  const progress = newDay / state.totalDays;

  if (progress < 0.25) {
    subPhase = 'early';
  } else if (progress < 0.5) {
    subPhase = 'mid';
  } else if (progress < 0.85) {
    subPhase = 'late';
  } else {
    subPhase = 'training_camp';
  }

  return {
    ...state,
    dayNumber: newDay,
    subPhase,
  };
}

/**
 * Calculates market value adjustment based on time on market
 */
export function calculateTimeAdjustment(daysSinceFrenzy: number): MarketAdjustment {
  // Value decreases over time as players get more desperate
  let valueMultiplier: number;
  let patienceLevel: number;

  if (daysSinceFrenzy <= 7) {
    valueMultiplier = 1.0;
    patienceLevel = 1.0;
  } else if (daysSinceFrenzy <= 21) {
    valueMultiplier = 0.95;
    patienceLevel = 0.85;
  } else if (daysSinceFrenzy <= 45) {
    valueMultiplier = 0.85;
    patienceLevel = 0.7;
  } else if (daysSinceFrenzy <= 75) {
    valueMultiplier = 0.75;
    patienceLevel = 0.5;
  } else {
    valueMultiplier = 0.6;
    patienceLevel = 0.3;
  }

  return {
    daysSinceFrenzy,
    valueMultiplier,
    patienceLevel,
  };
}

/**
 * Updates market adjustment for a player
 */
export function updateMarketAdjustment(
  state: TricklePhaseState,
  playerId: string
): TricklePhaseState {
  const adjustment = calculateTimeAdjustment(state.dayNumber);

  const newAdjustments = new Map(state.marketAdjustments);
  newAdjustments.set(playerId, adjustment);

  return {
    ...state,
    marketAdjustments: newAdjustments,
  };
}

/**
 * Identifies bargain opportunities
 */
export function identifyBargainOpportunities(
  state: TricklePhaseState,
  freeAgents: FreeAgent[],
  marketValues: Map<string, MarketValueResult>
): TricklePhaseState {
  const opportunities: BargainOpportunity[] = [];

  for (const fa of freeAgents) {
    if (fa.status !== 'available') continue;

    const marketValue = marketValues.get(fa.playerId);
    if (!marketValue) continue;

    const adjustment = state.marketAdjustments.get(fa.playerId);
    const daysOnMarket = adjustment?.daysSinceFrenzy || state.dayNumber;

    // Determine reason for discount
    let reason: BargainOpportunity['reason'];
    let discount = 0;

    if (fa.age >= 32) {
      reason = 'age';
      discount = 0.2 + (fa.age - 32) * 0.05;
    } else if (daysOnMarket > 60) {
      reason = 'late_signing';
      discount = 0.25;
    } else if (marketValue.tier === 'depth' || marketValue.tier === 'minimum') {
      reason = 'position_depth';
      discount = 0.15;
    } else if (daysOnMarket > 30) {
      reason = 'market_saturated';
      discount = 0.1;
    } else {
      continue; // No significant discount
    }

    if (discount < 0.1) continue;

    const currentAskingPrice = Math.round(marketValue.projectedAAV * (1 - discount));

    opportunities.push({
      freeAgentId: fa.id,
      originalMarketValue: marketValue.projectedAAV,
      currentAskingPrice,
      discountPercentage: discount * 100,
      daysOnMarket,
      reason,
    });
  }

  // Sort by discount percentage
  opportunities.sort((a, b) => b.discountPercentage - a.discountPercentage);

  return {
    ...state,
    bargainOpportunities: opportunities,
  };
}

/**
 * Generates a veteran minimum contract offer
 */
export function generateMinimumOffer(experience: number): ContractOffer {
  const minSalary = VETERAN_MINIMUM_SALARY[Math.min(experience, 7)] ?? VETERAN_MINIMUM_SALARY[7];

  return {
    years: 1,
    totalValue: minSalary,
    guaranteedMoney: minSalary,
    signingBonus: 0,
    firstYearSalary: minSalary,
    annualEscalation: 0,
    noTradeClause: false,
    voidYears: 0,
  };
}

/**
 * Generates a bargain offer based on current market conditions
 */
export function generateBargainOffer(
  opportunity: BargainOpportunity,
  years: number = 1
): ContractOffer {
  const aav = opportunity.currentAskingPrice;

  return {
    years,
    totalValue: aav * years,
    guaranteedMoney: Math.round(aav * 0.5),
    signingBonus: 0,
    firstYearSalary: aav,
    annualEscalation: 0.02,
    noTradeClause: false,
    voidYears: 0,
  };
}

/**
 * Records a team visit with a player
 */
export function recordVisit(
  state: TricklePhaseState,
  playerId: string,
  teamId: string
): TricklePhaseState {
  const existingVisits = state.visitHistory.get(playerId) || [];

  if (existingVisits.includes(teamId)) {
    return state; // Already visited
  }

  const newVisitHistory = new Map(state.visitHistory);
  newVisitHistory.set(playerId, [...existingVisits, teamId]);

  return {
    ...state,
    visitHistory: newVisitHistory,
  };
}

/**
 * Gets teams that have visited a player
 */
export function getPlayerVisitors(state: TricklePhaseState, playerId: string): string[] {
  return state.visitHistory.get(playerId) || [];
}

/**
 * Records a minimum salary signing
 */
export function recordMinimumSigning(
  state: TricklePhaseState,
  freeAgentId: string
): TricklePhaseState {
  return {
    ...state,
    minimumSignings: [...state.minimumSignings, freeAgentId],
  };
}

/**
 * Determines if a player will accept an offer during trickle phase
 */
export function willPlayerAcceptTrickleOffer(
  offer: ContractOffer,
  marketValue: MarketValueResult,
  daysOnMarket: number,
  existingOfferCount: number
): { willAccept: boolean; reason: string } {
  const offerAAV = offer.totalValue / offer.years;
  const adjustment = calculateTimeAdjustment(daysOnMarket);

  // Adjusted expectations
  const adjustedExpectation = marketValue.projectedAAV * adjustment.valueMultiplier;

  // Check if offer meets adjusted expectations
  const percentageOfAdjusted = offerAAV / adjustedExpectation;

  if (percentageOfAdjusted >= 0.95) {
    return { willAccept: true, reason: 'Offer meets current market expectations' };
  }

  // Consider if getting desperate
  if (daysOnMarket > 60 && percentageOfAdjusted >= 0.8) {
    return { willAccept: true, reason: 'Accepting after extended time on market' };
  }

  // Training camp approaching
  if (daysOnMarket > 80 && percentageOfAdjusted >= 0.7) {
    return { willAccept: true, reason: 'Training camp approaching, need to sign' };
  }

  // No other offers and this is reasonable
  if (existingOfferCount === 0 && percentageOfAdjusted >= 0.75 && daysOnMarket > 45) {
    return { willAccept: true, reason: 'Only offer on the table' };
  }

  return { willAccept: false, reason: 'Holding out for better offer' };
}

/**
 * Gets best bargain opportunities by position
 */
export function getBargainsByPosition(
  state: TricklePhaseState,
  freeAgents: Map<string, FreeAgent>,
  position: Position
): BargainOpportunity[] {
  return state.bargainOpportunities.filter((opp) => {
    const fa = freeAgents.get(opp.freeAgentId);
    return fa && fa.position === position;
  });
}

/**
 * Gets remaining quality free agents
 */
export function getRemainingQualityPlayers(
  freeAgents: FreeAgent[],
  marketValues: Map<string, MarketValueResult>,
  minTier: ProductionTier = 'quality'
): FreeAgent[] {
  const tierOrder: ProductionTier[] = [
    'elite',
    'pro_bowl',
    'starter',
    'quality',
    'depth',
    'minimum',
  ];
  const minTierIndex = tierOrder.indexOf(minTier);

  return freeAgents.filter((fa) => {
    if (fa.status !== 'available') return false;

    const marketValue = marketValues.get(fa.playerId);
    if (!marketValue) return false;

    const tierIndex = tierOrder.indexOf(marketValue.tier);
    return tierIndex <= minTierIndex;
  });
}

/**
 * Simulates AI team trickle phase activity
 */
export function simulateTeamTrickleActivity(
  teamBudget: TeamFABudget,
  availablePlayers: FreeAgent[],
  bargains: BargainOpportunity[],
  subPhase: TrickleSubPhase
): { targetPlayerId: string; offerType: 'bargain' | 'minimum' } | null {
  // Early phase - still being selective
  if (subPhase === 'early' && teamBudget.remaining > 30000) {
    return null; // Wait for better value
  }

  // Check for bargain opportunities at need positions
  for (const need of teamBudget.priorityPositions) {
    const positionBargains = bargains.filter((b) => {
      const fa = availablePlayers.find((p) => p.id === b.freeAgentId);
      return fa && fa.position === need && b.discountPercentage >= 15;
    });

    if (positionBargains.length > 0) {
      // Take best bargain
      const best = positionBargains[0];
      if (best.currentAskingPrice <= teamBudget.remaining) {
        return { targetPlayerId: best.freeAgentId, offerType: 'bargain' };
      }
    }
  }

  // Late phase or training camp - fill roster with minimums
  if (subPhase === 'late' || subPhase === 'training_camp') {
    const minSalary = VETERAN_MINIMUM_SALARY[0];
    if (teamBudget.remaining >= minSalary) {
      // Find any available player at need position
      for (const need of teamBudget.priorityPositions) {
        const available = availablePlayers.find(
          (p) => p.position === need && p.status === 'available'
        );
        if (available) {
          return { targetPlayerId: available.id, offerType: 'minimum' };
        }
      }
    }
  }

  return null;
}

/**
 * Gets trickle phase summary for display
 */
export interface TricklePhaseSummary {
  isActive: boolean;
  subPhase: string;
  dayNumber: number;
  daysRemaining: number;
  averageDiscount: number;
  bargainCount: number;
  minimumSigningsCount: number;
  topBargains: Array<{
    playerName: string;
    discount: string;
    askingPrice: string;
  }>;
}

export function getTricklePhaseSummary(
  state: TricklePhaseState,
  freeAgents: Map<string, FreeAgent>
): TricklePhaseSummary {
  const formatMoney = (value: number): string => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}M`;
    }
    return `$${value}K`;
  };

  const avgDiscount =
    state.bargainOpportunities.length > 0
      ? state.bargainOpportunities.reduce((sum, b) => sum + b.discountPercentage, 0) /
        state.bargainOpportunities.length
      : 0;

  const topBargains = state.bargainOpportunities.slice(0, 5).map((b) => {
    const fa = freeAgents.get(b.freeAgentId);
    return {
      playerName: fa?.playerName || 'Unknown',
      discount: `${b.discountPercentage.toFixed(0)}%`,
      askingPrice: formatMoney(b.currentAskingPrice),
    };
  });

  const subPhaseDescriptions: Record<TrickleSubPhase, string> = {
    early: 'Early Trickle: Quality players still available',
    mid: 'Mid Trickle: Bargains emerging',
    late: 'Late Trickle: Roster filling time',
    training_camp: 'Training Camp: Final signings',
  };

  return {
    isActive: state.isActive,
    subPhase: subPhaseDescriptions[state.subPhase],
    dayNumber: state.dayNumber,
    daysRemaining: state.totalDays - state.dayNumber,
    averageDiscount: avgDiscount,
    bargainCount: state.bargainOpportunities.length,
    minimumSigningsCount: state.minimumSignings.length,
    topBargains,
  };
}

/**
 * Validates trickle phase state
 */
export function validateTricklePhaseState(state: TricklePhaseState): boolean {
  if (typeof state.isActive !== 'boolean') return false;
  if (typeof state.dayNumber !== 'number') return false;
  if (typeof state.totalDays !== 'number') return false;
  if (state.dayNumber < 0) return false;
  if (state.totalDays < 0) return false;

  if (!(state.marketAdjustments instanceof Map)) return false;
  if (!(state.visitHistory instanceof Map)) return false;
  if (!Array.isArray(state.bargainOpportunities)) return false;
  if (!Array.isArray(state.minimumSignings)) return false;

  return true;
}

/**
 * AI Free Agency Logic
 * Handles AI team decision making for free agency
 * Includes needs assessment, budget allocation, and offer generation
 */

import { Position, OFFENSIVE_POSITIONS, DEFENSIVE_POSITIONS } from '../models/player/Position';
import { ContractOffer } from '../contracts/Contract';
import { FreeAgencyState, FreeAgent, TeamFABudget } from './FreeAgencyManager';
import { MarketValueResult } from './MarketValueCalculator';

/**
 * Position need level
 */
export type NeedLevel = 'critical' | 'moderate' | 'depth' | 'none';

/**
 * Team roster composition
 */
export interface RosterComposition {
  teamId: string;
  positionCounts: Map<Position, number>;
  starterQuality: Map<Position, number>; // Average rating of starters
  depthQuality: Map<Position, number>; // Average rating of backups
  averageAge: Map<Position, number>;
}

/**
 * Team needs assessment
 */
export interface TeamNeedsAssessment {
  teamId: string;
  needs: Map<Position, NeedLevel>;
  priorityPositions: Position[];
  totalNeedScore: number;
  weakestPositions: Position[];
  capSituation: 'excellent' | 'good' | 'moderate' | 'limited' | 'critical';
}

/**
 * AI strategy for free agency
 */
export type FAStrategy =
  | 'aggressive' // Spend big, fill needs immediately
  | 'balanced' // Mix of quality signings and value
  | 'value' // Seek bargains and underpay
  | 'rebuild' // Focus on young players, short deals
  | 'contend'; // Win-now, overpay for proven talent

/**
 * Team AI profile
 */
export interface TeamAIProfile {
  teamId: string;
  strategy: FAStrategy;
  riskTolerance: number; // 0-1, willingness to take risks on players
  valuePremium: number; // Multiplier on market value team is willing to pay
  maxContractYears: number; // Longest contract willing to offer
  preferredAgeTiers: Array<{ minAge: number; maxAge: number; preference: number }>;
  positionValueMultipliers: Map<Position, number>; // Position-specific spending adjustments
}

/**
 * AI offer decision
 */
export interface AIOfferDecision {
  shouldMakeOffer: boolean;
  offer: ContractOffer | null;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  competitionAwareness: boolean; // Adjusted for competing offers
}

/**
 * AI signing target
 */
export interface AISigningTarget {
  freeAgentId: string;
  priority: number; // 1-10, higher is more important
  maxOffer: ContractOffer;
  willingness: number; // 0-1, how badly team wants player
  alternativePlayers: string[]; // Other players who fill same need
}

/**
 * Minimum roster requirements by position
 */
const MIN_ROSTER_BY_POSITION: Partial<Record<Position, number>> = {
  [Position.QB]: 2,
  [Position.RB]: 3,
  [Position.WR]: 5,
  [Position.TE]: 3,
  [Position.LT]: 2,
  [Position.LG]: 2,
  [Position.C]: 2,
  [Position.RG]: 2,
  [Position.RT]: 2,
  [Position.DE]: 4,
  [Position.DT]: 4,
  [Position.OLB]: 4,
  [Position.ILB]: 3,
  [Position.CB]: 5,
  [Position.FS]: 2,
  [Position.SS]: 2,
  [Position.K]: 1,
  [Position.P]: 1,
};

/**
 * Ideal starter quality by position (for contending teams)
 */
const IDEAL_STARTER_QUALITY: Partial<Record<Position, number>> = {
  [Position.QB]: 85,
  [Position.LT]: 80,
  [Position.DE]: 80,
  [Position.CB]: 78,
  [Position.WR]: 78,
  [Position.RB]: 75,
  [Position.TE]: 75,
};

/**
 * Creates default AI profile for a team
 */
export function createDefaultAIProfile(
  teamId: string,
  teamRecord: { wins: number; losses: number },
  capSpace: number,
  salaryCap: number
): TeamAIProfile {
  const winPercentage = teamRecord.wins / (teamRecord.wins + teamRecord.losses);
  const capPercentage = capSpace / salaryCap;

  // Determine strategy based on team situation
  let strategy: FAStrategy;
  if (winPercentage >= 0.65 && capPercentage >= 0.15) {
    strategy = 'contend';
  } else if (winPercentage >= 0.5 && capPercentage >= 0.2) {
    strategy = 'aggressive';
  } else if (winPercentage >= 0.4) {
    strategy = 'balanced';
  } else if (winPercentage >= 0.25) {
    strategy = 'value';
  } else {
    strategy = 'rebuild';
  }

  // Adjust risk tolerance and value premium based on strategy
  const strategySettings: Record<FAStrategy, { risk: number; premium: number; maxYears: number }> =
    {
      aggressive: { risk: 0.7, premium: 1.15, maxYears: 5 },
      balanced: { risk: 0.5, premium: 1.0, maxYears: 4 },
      value: { risk: 0.3, premium: 0.9, maxYears: 3 },
      rebuild: { risk: 0.6, premium: 0.85, maxYears: 2 },
      contend: { risk: 0.8, premium: 1.25, maxYears: 4 },
    };

  const settings = strategySettings[strategy];

  return {
    teamId,
    strategy,
    riskTolerance: settings.risk,
    valuePremium: settings.premium,
    maxContractYears: settings.maxYears,
    preferredAgeTiers: getPreferredAgeTiers(strategy),
    positionValueMultipliers: new Map(),
  };
}

/**
 * Gets preferred age tiers based on strategy
 */
function getPreferredAgeTiers(
  strategy: FAStrategy
): Array<{ minAge: number; maxAge: number; preference: number }> {
  switch (strategy) {
    case 'contend':
      return [
        { minAge: 25, maxAge: 30, preference: 1.0 },
        { minAge: 30, maxAge: 33, preference: 0.9 },
        { minAge: 22, maxAge: 25, preference: 0.7 },
      ];
    case 'rebuild':
      return [
        { minAge: 22, maxAge: 26, preference: 1.0 },
        { minAge: 26, maxAge: 28, preference: 0.7 },
        { minAge: 28, maxAge: 32, preference: 0.3 },
      ];
    case 'aggressive':
      return [
        { minAge: 24, maxAge: 29, preference: 1.0 },
        { minAge: 29, maxAge: 32, preference: 0.8 },
      ];
    case 'value':
      return [
        { minAge: 28, maxAge: 32, preference: 1.0 }, // Experienced but cheaper
        { minAge: 25, maxAge: 28, preference: 0.8 },
      ];
    default:
      return [
        { minAge: 24, maxAge: 30, preference: 1.0 },
        { minAge: 30, maxAge: 33, preference: 0.7 },
      ];
  }
}

/**
 * Analyzes team roster composition
 */
export function analyzeRosterComposition(
  teamId: string,
  players: Array<{ position: Position; overallRating: number; age: number; isStarter: boolean }>
): RosterComposition {
  const positionCounts = new Map<Position, number>();
  const starterQuality = new Map<Position, number>();
  const depthQuality = new Map<Position, number>();
  const averageAge = new Map<Position, number>();

  // Group players by position
  const byPosition = new Map<Position, typeof players>();
  for (const player of players) {
    const existing = byPosition.get(player.position) || [];
    existing.push(player);
    byPosition.set(player.position, existing);
  }

  for (const [position, posPlayers] of byPosition) {
    positionCounts.set(position, posPlayers.length);

    const starters = posPlayers.filter((p) => p.isStarter);
    const backups = posPlayers.filter((p) => !p.isStarter);

    if (starters.length > 0) {
      const avgStarterRating =
        starters.reduce((sum, p) => sum + p.overallRating, 0) / starters.length;
      starterQuality.set(position, avgStarterRating);
    }

    if (backups.length > 0) {
      const avgBackupRating = backups.reduce((sum, p) => sum + p.overallRating, 0) / backups.length;
      depthQuality.set(position, avgBackupRating);
    }

    const avgPosAge = posPlayers.reduce((sum, p) => sum + p.age, 0) / posPlayers.length;
    averageAge.set(position, avgPosAge);
  }

  return {
    teamId,
    positionCounts,
    starterQuality,
    depthQuality,
    averageAge,
  };
}

/**
 * Assesses team needs
 */
export function assessTeamNeeds(
  composition: RosterComposition,
  capSpace: number,
  salaryCap: number
): TeamNeedsAssessment {
  const needs = new Map<Position, NeedLevel>();
  const priorityPositions: Position[] = [];
  let totalNeedScore = 0;
  const weakestPositions: Position[] = [];

  // All positions to evaluate
  const allPositions = [...OFFENSIVE_POSITIONS, ...DEFENSIVE_POSITIONS];

  for (const position of allPositions) {
    const count = composition.positionCounts.get(position) || 0;
    const minRequired = MIN_ROSTER_BY_POSITION[position] || 2;
    const starterRating = composition.starterQuality.get(position) || 0;
    const idealRating = IDEAL_STARTER_QUALITY[position] || 70;

    let needLevel: NeedLevel = 'none';
    let needScore = 0;

    // Check roster count
    if (count < minRequired) {
      needLevel = 'critical';
      needScore = 10;
    } else if (count === minRequired) {
      needLevel = 'moderate';
      needScore = 5;
    }

    // Check starter quality
    if (starterRating < idealRating - 15) {
      if (needLevel !== 'critical') {
        needLevel = 'critical';
        needScore = 8;
      }
    } else if (starterRating < idealRating - 5) {
      if (needLevel === 'none') {
        needLevel = 'moderate';
        needScore = 4;
      }
    }

    // At least depth need for all positions with low count
    if (count <= minRequired && needLevel === 'none') {
      needLevel = 'depth';
      needScore = 2;
    }

    needs.set(position, needLevel);
    totalNeedScore += needScore;

    if (needLevel === 'critical') {
      priorityPositions.push(position);
      weakestPositions.push(position);
    } else if (needLevel === 'moderate' && priorityPositions.length < 5) {
      priorityPositions.push(position);
    }
  }

  // Determine cap situation
  const capPercentage = capSpace / salaryCap;
  let capSituation: TeamNeedsAssessment['capSituation'];
  if (capPercentage >= 0.3) {
    capSituation = 'excellent';
  } else if (capPercentage >= 0.2) {
    capSituation = 'good';
  } else if (capPercentage >= 0.1) {
    capSituation = 'moderate';
  } else if (capPercentage >= 0.02) {
    capSituation = 'limited';
  } else {
    capSituation = 'critical';
  }

  return {
    teamId: composition.teamId,
    needs,
    priorityPositions,
    totalNeedScore,
    weakestPositions,
    capSituation,
  };
}

/**
 * Allocates free agency budget
 */
export function allocateFABudget(
  totalCapSpace: number,
  needs: TeamNeedsAssessment,
  strategy: FAStrategy
): TeamFABudget {
  // Reserve some cap for in-season moves
  const reservePercentages: Record<FAStrategy, number> = {
    aggressive: 0.1,
    balanced: 0.15,
    value: 0.2,
    rebuild: 0.25,
    contend: 0.1,
  };

  const reservePercent = reservePercentages[strategy];
  const totalBudget = Math.round(totalCapSpace * (1 - reservePercent));

  const needsLevel = new Map<Position, NeedLevel>();
  for (const [pos, need] of needs.needs) {
    needsLevel.set(pos, need);
  }

  return {
    teamId: needs.teamId,
    totalBudget,
    spent: 0,
    remaining: totalBudget,
    priorityPositions: needs.priorityPositions,
    needsLevel,
  };
}

/**
 * Evaluates a free agent for AI interest
 */
export function evaluateFreeAgent(
  freeAgent: FreeAgent,
  marketValue: MarketValueResult,
  needs: TeamNeedsAssessment,
  profile: TeamAIProfile,
  budget: TeamFABudget
): AIOfferDecision {
  // Check if position is a need
  const positionNeed = needs.needs.get(freeAgent.position) || 'none';

  if (positionNeed === 'none') {
    return {
      shouldMakeOffer: false,
      offer: null,
      reasoning: 'Position not a team need',
      priority: 'low',
      competitionAwareness: false,
    };
  }

  // Check age preference
  let agePreference = 0.5;
  for (const tier of profile.preferredAgeTiers) {
    if (freeAgent.age >= tier.minAge && freeAgent.age <= tier.maxAge) {
      agePreference = tier.preference;
      break;
    }
  }

  if (agePreference < 0.3) {
    return {
      shouldMakeOffer: false,
      offer: null,
      reasoning: 'Player age outside preferred range',
      priority: 'low',
      competitionAwareness: false,
    };
  }

  // Check budget
  const projectedAAV = marketValue.projectedAAV * profile.valuePremium;
  if (projectedAAV > budget.remaining) {
    return {
      shouldMakeOffer: false,
      offer: null,
      reasoning: 'Insufficient budget',
      priority: 'low',
      competitionAwareness: false,
    };
  }

  // Determine offer parameters
  const positionMultiplier = profile.positionValueMultipliers.get(freeAgent.position) || 1.0;
  const needMultiplier =
    positionNeed === 'critical' ? 1.1 : positionNeed === 'moderate' ? 1.0 : 0.9;

  const offerAAV = Math.round(
    marketValue.projectedAAV * profile.valuePremium * positionMultiplier * needMultiplier
  );
  const years = Math.min(marketValue.projectedYears, profile.maxContractYears);
  const totalValue = offerAAV * years;
  const guaranteedMoney = Math.round(totalValue * (profile.riskTolerance * 0.4 + 0.2));

  const offer: ContractOffer = {
    years,
    totalValue,
    guaranteedMoney,
    signingBonus: Math.round(guaranteedMoney * 0.3),
    firstYearSalary: offerAAV,
    annualEscalation: 0.03,
    noTradeClause: marketValue.tier === 'elite' && profile.strategy === 'contend',
    voidYears: 0,
  };

  // Determine priority
  let priority: AIOfferDecision['priority'] = 'medium';
  if (
    (positionNeed === 'critical' && marketValue.tier === 'starter') ||
    marketValue.tier === 'pro_bowl'
  ) {
    priority = 'high';
  } else if (positionNeed === 'depth' || marketValue.tier === 'depth') {
    priority = 'low';
  }

  return {
    shouldMakeOffer: true,
    offer,
    reasoning: `Position need: ${positionNeed}, Tier: ${marketValue.tier}`,
    priority,
    competitionAwareness: freeAgent.interest.length > 2,
  };
}

/**
 * Generates AI targets for the day
 */
export function generateDailyTargets(
  freeAgents: FreeAgent[],
  marketValues: Map<string, MarketValueResult>,
  needs: TeamNeedsAssessment,
  profile: TeamAIProfile,
  budget: TeamFABudget,
  maxTargets: number = 5
): AISigningTarget[] {
  const targets: AISigningTarget[] = [];

  // Filter to available free agents
  const available = freeAgents.filter((fa) => fa.status === 'available');

  // Evaluate each free agent
  for (const fa of available) {
    const marketValue = marketValues.get(fa.playerId);
    if (!marketValue) continue;

    const decision = evaluateFreeAgent(fa, marketValue, needs, profile, budget);
    if (!decision.shouldMakeOffer || !decision.offer) continue;

    const offer = decision.offer;
    const offerAAV = offer.totalValue / offer.years;

    const willingness =
      decision.priority === 'high' ? 0.9 : decision.priority === 'medium' ? 0.6 : 0.3;

    // Find alternative players at same position
    const alternatives = available
      .filter(
        (other) =>
          other.id !== fa.id &&
          other.position === fa.position &&
          (marketValues.get(other.playerId)?.projectedAAV || 0) < offerAAV
      )
      .slice(0, 3)
      .map((a) => a.id);

    targets.push({
      freeAgentId: fa.id,
      priority: decision.priority === 'high' ? 10 : decision.priority === 'medium' ? 6 : 3,
      maxOffer: decision.offer,
      willingness,
      alternativePlayers: alternatives,
    });
  }

  // Sort by priority and return top targets
  targets.sort((a, b) => b.priority - a.priority);
  return targets.slice(0, maxTargets);
}

/**
 * Adjusts offer based on competition
 */
export function adjustOfferForCompetition(
  baseOffer: ContractOffer,
  competingOfferCount: number,
  profile: TeamAIProfile,
  budget: TeamFABudget
): ContractOffer | null {
  if (competingOfferCount === 0) {
    return baseOffer;
  }

  // Calculate escalation based on competition
  const escalation = Math.min(0.2, competingOfferCount * 0.05);
  const newAAV = Math.round((baseOffer.totalValue / baseOffer.years) * (1 + escalation));

  // Check budget
  if (newAAV > budget.remaining) {
    return null; // Can't afford escalated offer
  }

  // Check if escalation is too much based on risk tolerance
  if (escalation > profile.riskTolerance * 0.3) {
    return null; // Too risky
  }

  return {
    ...baseOffer,
    totalValue: newAAV * baseOffer.years,
    guaranteedMoney: Math.round(baseOffer.guaranteedMoney * (1 + escalation * 0.5)),
    firstYearSalary: newAAV,
  };
}

/**
 * Simulates AI team's free agency actions for a day
 */
export function simulateTeamFADay(
  teamId: string,
  faState: FreeAgencyState,
  marketValues: Map<string, MarketValueResult>,
  profile: TeamAIProfile,
  composition: RosterComposition
): Array<{ type: 'offer' | 'interest'; targetId: string; data: unknown }> {
  const actions: Array<{ type: 'offer' | 'interest'; targetId: string; data: unknown }> = [];

  const budget = faState.teamBudgets.get(teamId);
  if (!budget || budget.remaining <= 0) {
    return actions;
  }

  const needs = assessTeamNeeds(composition, budget.remaining, budget.totalBudget);
  const targets = generateDailyTargets(
    Array.from(faState.freeAgents.values()),
    marketValues,
    needs,
    profile,
    budget,
    3
  );

  for (const target of targets) {
    const fa = faState.freeAgents.get(target.freeAgentId);
    if (!fa) continue;

    // Check for competition
    const pendingOffers = Array.from(faState.offers.values()).filter(
      (o) => o.freeAgentId === target.freeAgentId && o.status === 'pending'
    );

    const adjustedOffer = adjustOfferForCompetition(
      target.maxOffer,
      pendingOffers.length,
      profile,
      budget
    );

    if (adjustedOffer) {
      actions.push({
        type: 'offer',
        targetId: target.freeAgentId,
        data: adjustedOffer,
      });
    } else {
      // Can't afford or too risky, just show interest
      actions.push({
        type: 'interest',
        targetId: target.freeAgentId,
        data: { level: 'medium' },
      });
    }
  }

  return actions;
}

/**
 * Gets AI decision summary (general, not specific - brand guidelines)
 */
export interface AIDecisionSummary {
  teamId: string;
  strategy: string;
  primaryNeeds: string[];
  budgetStatus: string;
  signingPace: 'aggressive' | 'measured' | 'patient';
}

export function getAIDecisionSummary(
  profile: TeamAIProfile,
  budget: TeamFABudget,
  needs: TeamNeedsAssessment
): AIDecisionSummary {
  const strategyDescriptions: Record<FAStrategy, string> = {
    aggressive: 'Aggressively pursuing upgrades',
    balanced: 'Taking balanced approach',
    value: 'Seeking value opportunities',
    rebuild: 'Building for the future',
    contend: 'Making win-now moves',
  };

  const primaryNeeds = needs.priorityPositions.slice(0, 3).map((p) => p.toString());

  const budgetUsedPercent = (budget.spent / budget.totalBudget) * 100;
  let budgetStatus: string;
  if (budgetUsedPercent < 30) {
    budgetStatus = 'Plenty of room to spend';
  } else if (budgetUsedPercent < 60) {
    budgetStatus = 'Moderate spending capacity';
  } else if (budgetUsedPercent < 85) {
    budgetStatus = 'Limited remaining budget';
  } else {
    budgetStatus = 'Nearly tapped out';
  }

  let signingPace: AIDecisionSummary['signingPace'] = 'measured';
  if (profile.strategy === 'aggressive' || profile.strategy === 'contend') {
    signingPace = 'aggressive';
  } else if (profile.strategy === 'value' || profile.strategy === 'rebuild') {
    signingPace = 'patient';
  }

  return {
    teamId: profile.teamId,
    strategy: strategyDescriptions[profile.strategy],
    primaryNeeds,
    budgetStatus,
    signingPace,
  };
}

/**
 * Validates AI profile
 */
export function validateTeamAIProfile(profile: TeamAIProfile): boolean {
  if (!profile.teamId || typeof profile.teamId !== 'string') return false;
  if (typeof profile.riskTolerance !== 'number') return false;
  if (profile.riskTolerance < 0 || profile.riskTolerance > 1) return false;
  if (typeof profile.valuePremium !== 'number') return false;
  if (profile.valuePremium < 0.5 || profile.valuePremium > 2) return false;
  if (typeof profile.maxContractYears !== 'number') return false;
  if (profile.maxContractYears < 1 || profile.maxContractYears > 7) return false;

  return true;
}

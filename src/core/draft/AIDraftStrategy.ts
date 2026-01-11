/**
 * AI Draft Strategy
 * Handles AI team draft philosophies, player evaluation, and decision making.
 * BRAND GUIDELINE: AI logic is hidden from the user.
 */

import { Position } from '../models/player/Position';
import { Prospect } from './Prospect';
import { DraftPick } from '../models/league/DraftPick';
import { _calculatePickValue, wouldAIAcceptTrade, TradeProposal } from './TradeValueCalculator';

/**
 * AI Draft Philosophy types
 */
export enum DraftPhilosophy {
  /** Best Player Available - Pure talent evaluation */
  BPA = 'BPA',
  /** Needs-Based - Prioritizes team roster holes */
  NEEDS_BASED = 'NEEDS_BASED',
  /** Trade-Happy - Actively seeks trade opportunities */
  TRADE_HAPPY = 'TRADE_HAPPY',
  /** Balanced - Mix of BPA and needs */
  BALANCED = 'BALANCED',
}

/**
 * Position needs rating (internal)
 */
export type NeedLevel = 'critical' | 'high' | 'moderate' | 'low' | 'none';

/**
 * Team roster needs assessment
 */
export interface TeamNeeds {
  teamId: string;
  positionNeeds: Map<Position, NeedLevel>;
  /** Positions that are critical (must address) */
  criticalPositions: Position[];
  /** Positions with high need */
  highNeedPositions: Position[];
}

/**
 * AI team draft profile
 */
export interface AIDraftProfile {
  teamId: string;
  philosophy: DraftPhilosophy;
  /** Aggressiveness in trading (0-1) */
  tradeAggressiveness: number;
  /** How much they weight need vs talent (0 = pure BPA, 1 = pure needs) */
  needsWeight: number;
  /** Risk tolerance for boom/bust prospects (0-1) */
  riskTolerance: number;
  /** Current roster needs */
  needs: TeamNeeds;
}

/**
 * Internal prospect evaluation (HIDDEN from user)
 */
interface ProspectEvaluation {
  prospect: Prospect;
  /** Raw talent score 0-100 (HIDDEN) */
  _talentScore: number;
  /** Needs fit score 0-100 (HIDDEN) */
  _needsScore: number;
  /** Combined score based on philosophy (HIDDEN) */
  _totalScore: number;
  /** Flag for boom/bust potential */
  _isRisky: boolean;
}

/**
 * Trade offer from AI
 */
export interface AITradeOffer {
  /** Team making the offer */
  offeringTeamId: string;
  /** Team receiving the offer */
  targetTeamId: string;
  /** Picks being offered */
  picksOffered: DraftPick[];
  /** Picks being requested */
  picksRequested: DraftPick[];
  /** Target pick they want to move up to */
  targetPick: DraftPick;
  /** Prospect they're targeting (HIDDEN) */
  _targetProspect: Prospect | null;
}

/**
 * Creates needs assessment for a team based on roster
 */
export function assessTeamNeeds(
  teamId: string,
  rosterPositionCounts: Map<Position, number>,
  idealPositionCounts: Map<Position, number>
): TeamNeeds {
  const positionNeeds = new Map<Position, NeedLevel>();
  const criticalPositions: Position[] = [];
  const highNeedPositions: Position[] = [];

  for (const [position, ideal] of idealPositionCounts) {
    const current = rosterPositionCounts.get(position) || 0;
    const deficit = ideal - current;

    let needLevel: NeedLevel;
    if (deficit >= 2) {
      needLevel = 'critical';
      criticalPositions.push(position);
    } else if (deficit === 1) {
      needLevel = 'high';
      highNeedPositions.push(position);
    } else if (deficit === 0) {
      needLevel = 'moderate';
    } else if (deficit === -1) {
      needLevel = 'low';
    } else {
      needLevel = 'none';
    }

    positionNeeds.set(position, needLevel);
  }

  return {
    teamId,
    positionNeeds,
    criticalPositions,
    highNeedPositions,
  };
}

/**
 * Creates an AI draft profile for a team
 */
export function createAIDraftProfile(
  teamId: string,
  needs: TeamNeeds,
  philosophy: DraftPhilosophy = DraftPhilosophy.BALANCED
): AIDraftProfile {
  // Set profile parameters based on philosophy
  let tradeAggressiveness: number;
  let needsWeight: number;
  let riskTolerance: number;

  switch (philosophy) {
    case DraftPhilosophy.BPA:
      tradeAggressiveness = 0.2;
      needsWeight = 0.1;
      riskTolerance = 0.5;
      break;
    case DraftPhilosophy.NEEDS_BASED:
      tradeAggressiveness = 0.3;
      needsWeight = 0.8;
      riskTolerance = 0.3;
      break;
    case DraftPhilosophy.TRADE_HAPPY:
      tradeAggressiveness = 0.8;
      needsWeight = 0.4;
      riskTolerance = 0.6;
      break;
    case DraftPhilosophy.BALANCED:
    default:
      tradeAggressiveness = 0.4;
      needsWeight = 0.5;
      riskTolerance = 0.4;
      break;
  }

  return {
    teamId,
    philosophy,
    tradeAggressiveness,
    needsWeight,
    riskTolerance,
    needs,
  };
}

/**
 * Generates a random draft philosophy for a team
 */
export function generateRandomPhilosophy(): DraftPhilosophy {
  const rand = Math.random();
  if (rand < 0.35) return DraftPhilosophy.BALANCED;
  if (rand < 0.55) return DraftPhilosophy.BPA;
  if (rand < 0.75) return DraftPhilosophy.NEEDS_BASED;
  return DraftPhilosophy.TRADE_HAPPY;
}

/**
 * Evaluates a prospect based on team's profile (HIDDEN logic)
 * @internal
 */
function evaluateProspect(prospect: Prospect, profile: AIDraftProfile): ProspectEvaluation {
  // Calculate talent score based on player ceiling and attributes
  const ceilingScores: Record<string, number> = {
    franchiseCornerstone: 95,
    highEndStarter: 85,
    solidStarter: 75,
    qualityRotational: 60,
    specialist: 50,
    depth: 35,
    practiceSquad: 20,
  };

  const talentScore = ceilingScores[prospect.player.roleFit.ceiling] || 50;

  // Calculate needs score
  const position = prospect.player.position;
  const needLevel = profile.needs.positionNeeds.get(position) || 'moderate';
  const needScores: Record<NeedLevel, number> = {
    critical: 100,
    high: 80,
    moderate: 50,
    low: 25,
    none: 10,
  };
  const needsScore = needScores[needLevel];

  // Combine scores based on philosophy weight
  const totalScore = talentScore * (1 - profile.needsWeight) + needsScore * profile.needsWeight;

  // Flag risky prospects based on role effectiveness (lower = more uncertainty)
  const isRisky = prospect.player.roleFit.roleEffectiveness < 70;

  return {
    prospect,
    _talentScore: talentScore,
    _needsScore: needsScore,
    _totalScore: totalScore,
    _isRisky: isRisky,
  };
}

/**
 * Ranks available prospects for an AI team (HIDDEN from user)
 */
export function rankProspectsForTeam(
  availableProspects: Prospect[],
  profile: AIDraftProfile
): Prospect[] {
  const evaluations = availableProspects.map((p) => evaluateProspect(p, profile));

  // Apply risk tolerance adjustment
  for (const evaluation of evaluations) {
    if (evaluation._isRisky) {
      // Risk-tolerant teams boost risky players, risk-averse teams penalize
      const riskAdjustment = (profile.riskTolerance - 0.5) * 10;
      evaluation._totalScore += riskAdjustment;
    }
  }

  // Sort by total score (highest first)
  evaluations.sort((a, b) => b._totalScore - a._totalScore);

  return evaluations.map((e) => e.prospect);
}

/**
 * Gets the AI's top pick from available prospects
 */
export function getAITopPick(
  availableProspects: Prospect[],
  profile: AIDraftProfile
): Prospect | null {
  if (availableProspects.length === 0) return null;

  const ranked = rankProspectsForTeam(availableProspects, profile);
  return ranked[0] || null;
}

/**
 * Determines if AI should consider trading up
 */
export function shouldConsiderTradeUp(
  profile: AIDraftProfile,
  currentPickValue: number,
  availableProspects: Prospect[]
): boolean {
  // Check if there's a high-value prospect that fits needs
  if (availableProspects.length === 0) return false;

  const topChoice = getAITopPick(availableProspects, profile);
  if (!topChoice) return false;

  // Check if top choice is a critical need
  const position = topChoice.player.position;
  const isCriticalNeed = profile.needs.criticalPositions.includes(position);

  // Trade-happy teams always consider, others only for critical needs + good prospects
  if (profile.philosophy === DraftPhilosophy.TRADE_HAPPY) {
    return Math.random() < profile.tradeAggressiveness;
  }

  if (isCriticalNeed && topChoice.player.roleFit.ceiling === 'franchiseCornerstone') {
    return Math.random() < profile.tradeAggressiveness * 2;
  }

  return false;
}

/**
 * Determines if AI should consider trading down
 */
export function shouldConsiderTradeDown(
  profile: AIDraftProfile,
  currentPick: DraftPick,
  availableProspects: Prospect[]
): boolean {
  // Trade-happy teams frequently consider trading down
  if (profile.philosophy === DraftPhilosophy.TRADE_HAPPY) {
    return Math.random() < profile.tradeAggressiveness;
  }

  // Check if top prospects don't fit needs
  const ranked = rankProspectsForTeam(availableProspects.slice(0, 5), profile);
  if (ranked.length === 0) return true;

  const topPick = ranked[0];
  const position = topPick.player.position;
  const needLevel = profile.needs.positionNeeds.get(position) || 'moderate';

  // If top available doesn't fit a need, consider trading down
  if (needLevel === 'none' || needLevel === 'low') {
    return Math.random() < 0.5;
  }

  return false;
}

/**
 * Generates a trade offer from AI (HIDDEN decision logic)
 */
export function generateTradeOffer(
  offeringProfile: AIDraftProfile,
  targetPick: DraftPick,
  availablePicks: DraftPick[],
  availableProspects: Prospect[],
  currentYear: number
): AITradeOffer | null {
  // Determine target prospect
  const targetProspect = getAITopPick(availableProspects, offeringProfile);

  // Find picks to offer
  const offeredPicks: DraftPick[] = [];
  const targetValue = _calculatePickValue(targetPick, currentYear);
  let offeredValue = 0;

  // Sort available picks by value
  const sortedPicks = [...availablePicks].sort(
    (a, b) => _calculatePickValue(b, currentYear) - _calculatePickValue(a, currentYear)
  );

  // Add picks until we meet or exceed target value
  for (const pick of sortedPicks) {
    if (offeredValue >= targetValue * 1.1) break; // Slight overpay acceptable

    const pickValue = _calculatePickValue(pick, currentYear);
    if (pickValue < targetValue) {
      // Only add smaller value picks
      offeredPicks.push(pick);
      offeredValue += pickValue;
    }
  }

  // Check if we have a reasonable offer
  if (offeredValue < targetValue * 0.9 || offeredPicks.length === 0) {
    return null;
  }

  return {
    offeringTeamId: offeringProfile.teamId,
    targetTeamId: targetPick.currentTeamId,
    picksOffered: offeredPicks,
    picksRequested: [targetPick],
    targetPick,
    _targetProspect: targetProspect,
  };
}

/**
 * Evaluates whether AI should accept a trade offer
 */
export function evaluateTradeOffer(
  receivingProfile: AIDraftProfile,
  offer: AITradeOffer,
  currentYear: number
): { accept: boolean; reason: string } {
  const proposal: TradeProposal = {
    picksOffered: offer.picksRequested, // We're receiving, so flip perspective
    picksRequested: offer.picksOffered,
    currentYear,
  };

  // Use base trade value check
  const wouldAccept = wouldAIAcceptTrade(proposal, 1 / receivingProfile.tradeAggressiveness);

  if (!wouldAccept) {
    return { accept: false, reason: 'Insufficient value offered' };
  }

  // Additional checks based on philosophy
  if (receivingProfile.philosophy === DraftPhilosophy.TRADE_HAPPY) {
    // Trade-happy teams more likely to accept
    return { accept: true, reason: 'Acceptable trade value' };
  }

  // Check if we're giving up a pick we need
  const pickToGive = offer.picksRequested[0];
  if (pickToGive.round === 1 && receivingProfile.philosophy === DraftPhilosophy.NEEDS_BASED) {
    // Needs-based teams reluctant to trade first rounders
    return { accept: Math.random() < 0.3, reason: 'Reluctant to trade first rounder' };
  }

  return { accept: true, reason: 'Fair trade value' };
}

/**
 * Gets AI decision for current pick
 */
export interface AIPickDecision {
  type: 'select' | 'trade_up' | 'trade_down' | 'select_default';
  selectedProspect?: Prospect;
  tradeOffer?: AITradeOffer;
}

/**
 * Makes AI pick decision
 */
export function makeAIPickDecision(
  profile: AIDraftProfile,
  currentPick: DraftPick,
  availableProspects: Prospect[],
  _availablePicks: DraftPick[],
  _currentYear: number
): AIPickDecision {
  // Check for trade opportunities
  if (shouldConsiderTradeDown(profile, currentPick, availableProspects)) {
    // Would need to implement trade target finding
    // For now, default to selecting
  }

  // Get top pick
  const topPick = getAITopPick(availableProspects, profile);

  if (topPick) {
    return {
      type: 'select',
      selectedProspect: topPick,
    };
  }

  return {
    type: 'select_default',
  };
}

/**
 * Validates an AI draft profile
 */
export function validateAIDraftProfile(profile: AIDraftProfile): boolean {
  if (!profile.teamId || typeof profile.teamId !== 'string') return false;

  const validPhilosophies = Object.values(DraftPhilosophy);
  if (!validPhilosophies.includes(profile.philosophy)) return false;

  if (profile.tradeAggressiveness < 0 || profile.tradeAggressiveness > 1) return false;
  if (profile.needsWeight < 0 || profile.needsWeight > 1) return false;
  if (profile.riskTolerance < 0 || profile.riskTolerance > 1) return false;

  if (!profile.needs || typeof profile.needs !== 'object') return false;

  return true;
}

/**
 * Validates team needs
 */
export function validateTeamNeeds(needs: TeamNeeds): boolean {
  if (!needs.teamId || typeof needs.teamId !== 'string') return false;
  if (!(needs.positionNeeds instanceof Map)) return false;
  if (!Array.isArray(needs.criticalPositions)) return false;
  if (!Array.isArray(needs.highNeedPositions)) return false;

  return true;
}

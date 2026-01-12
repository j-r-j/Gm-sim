/**
 * Free Agency Phase (Phase 5)
 * Coordinates with FreeAgencyManager for FA signings
 */

import {
  OffSeasonState,
  addEvent,
  addSigning,
  completeTask,
  PlayerSigning,
} from '../OffSeasonPhaseManager';

/**
 * Free agency sub-phases
 */
export type FASubPhase =
  | 'legal_tampering'
  | 'day1_frenzy'
  | 'day2_frenzy'
  | 'trickle'
  | 'complete';

/**
 * Free agent summary
 */
export interface FreeAgentSummary {
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  overallRating: number;
  previousTeam: string;
  marketValue: number;
  type: 'UFA' | 'RFA' | 'ERFA';
  interest: 'high' | 'medium' | 'low';
  fitsNeed: boolean;
}

/**
 * Team free agency situation
 */
export interface TeamFASituation {
  teamId: string;
  capSpace: number;
  needs: string[];
  priorityPositions: string[];
  targetFreeAgents: FreeAgentSummary[];
  maxBudget: number;
}

/**
 * Free agency offer
 */
export interface FAOffer {
  freeAgentId: string;
  freeAgentName: string;
  position: string;
  teamId: string;
  years: number;
  totalValue: number;
  guaranteed: number;
  signingBonus: number;
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
}

/**
 * Free agency signing result
 */
export interface FASigningResult {
  freeAgent: FreeAgentSummary;
  contract: {
    years: number;
    totalValue: number;
    guaranteed: number;
    signingBonus: number;
    aav: number;
  };
  teamId: string;
  subPhase: FASubPhase;
}

/**
 * Calculates offer competitiveness
 */
export function calculateOfferCompetitiveness(
  offer: FAOffer,
  marketValue: number,
  yearsDesired: number
): number {
  // Score from 0-100
  const aav = offer.totalValue / offer.years;
  const valueScore = Math.min(100, (aav / marketValue) * 100);
  const guaranteeScore = Math.min(100, (offer.guaranteed / offer.totalValue) * 100);
  const yearsScore = offer.years >= yearsDesired ? 100 : (offer.years / yearsDesired) * 100;

  // Weight factors
  return valueScore * 0.5 + guaranteeScore * 0.3 + yearsScore * 0.2;
}

/**
 * Determines if a free agent would accept an offer
 */
export function wouldAcceptOffer(
  offer: FAOffer,
  marketValue: number,
  yearsDesired: number,
  competingOffers: FAOffer[]
): boolean {
  const offerScore = calculateOfferCompetitiveness(offer, marketValue, yearsDesired);

  // Compare to competing offers
  for (const competing of competingOffers) {
    const competingScore = calculateOfferCompetitiveness(competing, marketValue, yearsDesired);
    if (competingScore > offerScore + 10) {
      return false; // Better offer exists
    }
  }

  // Accept if offer is at least 85% of market value
  return offerScore >= 85;
}

/**
 * Submits an offer to a free agent
 */
export function submitOffer(
  state: OffSeasonState,
  offer: FAOffer
): OffSeasonState {
  return addEvent(
    state,
    'contract',
    `Submitted offer to ${offer.freeAgentName}: ${offer.years}yr/$${offer.totalValue}K`,
    { offer }
  );
}

/**
 * Signs a free agent
 */
export function signFreeAgent(
  state: OffSeasonState,
  result: FASigningResult
): OffSeasonState {
  const signing: PlayerSigning = {
    playerId: result.freeAgent.playerId,
    playerName: result.freeAgent.playerName,
    position: result.freeAgent.position,
    teamId: result.teamId,
    contractYears: result.contract.years,
    contractValue: result.contract.totalValue,
    signingType: 'free_agent',
    phase: 'free_agency',
  };

  let newState = addSigning(state, signing);
  newState = completeTask(newState, 'sign_players');

  return newState;
}

/**
 * Processes free agency phase
 */
export function processFreeAgency(
  state: OffSeasonState,
  situation: TeamFASituation,
  signings: FASigningResult[]
): OffSeasonState {
  let newState = addEvent(
    state,
    'phase_start',
    `Free Agency begins with $${situation.capSpace}K in cap space`,
    { situation }
  );

  for (const signing of signings) {
    newState = signFreeAgent(newState, signing);
  }

  newState = completeTask(newState, 'review_market');
  if (signings.length > 0) {
    newState = completeTask(newState, 'make_offers');
  }

  return newState;
}

/**
 * Gets top available free agents
 */
export function getTopAvailableFreeAgents(
  freeAgents: FreeAgentSummary[],
  limit: number = 25
): FreeAgentSummary[] {
  return [...freeAgents]
    .sort((a, b) => b.marketValue - a.marketValue)
    .slice(0, limit);
}

/**
 * Gets position-specific free agents
 */
export function getFreeAgentsByPosition(
  freeAgents: FreeAgentSummary[],
  position: string
): FreeAgentSummary[] {
  return freeAgents.filter((fa) => fa.position === position);
}

/**
 * Gets team needs from free agency
 */
export function identifyTeamNeeds(
  currentRoster: Array<{ position: string; overallRating: number }>,
  idealPositionCounts: Record<string, number>
): string[] {
  const needs: string[] = [];
  const positionCounts = new Map<string, number>();
  const positionRatings = new Map<string, number[]>();

  // Count current roster
  for (const player of currentRoster) {
    positionCounts.set(player.position, (positionCounts.get(player.position) || 0) + 1);
    const ratings = positionRatings.get(player.position) || [];
    ratings.push(player.overallRating);
    positionRatings.set(player.position, ratings);
  }

  // Identify needs
  for (const [position, idealCount] of Object.entries(idealPositionCounts)) {
    const currentCount = positionCounts.get(position) || 0;
    const ratings = positionRatings.get(position) || [];
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    // Need if: under-staffed or low quality
    if (currentCount < idealCount || avgRating < 70) {
      needs.push(position);
    }
  }

  return needs;
}

/**
 * Gets free agency summary text
 */
export function getFASummaryText(situation: TeamFASituation): string {
  return `Free Agency Summary

Cap Space: $${situation.capSpace}K
Max FA Budget: $${situation.maxBudget}K

Priority Needs: ${situation.priorityPositions.join(', ')}

Top Targets:
${situation.targetFreeAgents
  .slice(0, 5)
  .map((fa) => `- ${fa.playerName} (${fa.position}): $${fa.marketValue}K market value`)
  .join('\n')}`;
}

/**
 * Gets signing summary text
 */
export function getSigningSummaryText(result: FASigningResult): string {
  return `SIGNED: ${result.freeAgent.playerName} (${result.freeAgent.position})
Contract: ${result.contract.years} years, $${result.contract.totalValue}K total
AAV: $${result.contract.aav}K
Guaranteed: $${result.contract.guaranteed}K
Signing Bonus: $${result.contract.signingBonus}K`;
}

/**
 * Calculates contract offer based on market value
 */
export function calculateContractOffer(
  marketValue: number,
  years: number,
  offerPercentage: number = 100
): {
  totalValue: number;
  guaranteed: number;
  signingBonus: number;
  aav: number;
} {
  const aav = Math.round(marketValue * (offerPercentage / 100));
  const totalValue = aav * years;
  const guaranteed = Math.round(totalValue * 0.5); // 50% guaranteed
  const signingBonus = Math.round(guaranteed * 0.3); // 30% of guaranteed as signing bonus

  return { totalValue, guaranteed, signingBonus, aav };
}

/**
 * Determines sub-phase based on day
 */
export function determineSubPhase(day: number): FASubPhase {
  if (day <= 2) return 'legal_tampering';
  if (day <= 4) return 'day1_frenzy';
  if (day <= 6) return 'day2_frenzy';
  if (day <= 30) return 'trickle';
  return 'complete';
}

/**
 * Gets sub-phase description
 */
export function getSubPhaseDescription(subPhase: FASubPhase): string {
  const descriptions: Record<FASubPhase, string> = {
    legal_tampering: 'Legal Tampering - Negotiations begin, no signings yet',
    day1_frenzy: 'Day 1 Frenzy - Top players signing quickly',
    day2_frenzy: 'Day 2 - Strong market continues',
    trickle: 'Trickle Period - Bargain hunting time',
    complete: 'Free Agency Complete',
  };
  return descriptions[subPhase];
}

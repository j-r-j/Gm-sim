/**
 * Legal Tampering Phase
 * Handles the negotiation period before free agency officially opens
 * Teams can negotiate but cannot sign players
 */

import { ContractOffer } from '../contracts/Contract';
import { FreeAgencyState, FreeAgent, submitOffer } from './FreeAgencyManager';
import { MarketValueResult } from './MarketValueCalculator';

/**
 * Tampering negotiation status
 */
export type TamperingStatus = 'not_started' | 'in_progress' | 'verbal_agreement' | 'no_deal';

/**
 * Verbal agreement (pending until free agency opens)
 */
export interface VerbalAgreement {
  id: string;
  freeAgentId: string;
  teamId: string;
  offer: ContractOffer;
  timestamp: number;
  priority: number; // Order of agreement (1 = first to agree)
}

/**
 * Legal tampering state
 */
export interface LegalTamperingState {
  isActive: boolean;
  startDay: number;
  endDay: number;
  currentDay: number;
  verbalAgreements: VerbalAgreement[];
  negotiationsInProgress: Map<string, TamperingNegotiation>;
  teamTamperingActivity: Map<string, number>; // Track team engagement
}

/**
 * Active negotiation during tampering
 */
export interface TamperingNegotiation {
  freeAgentId: string;
  teamId: string;
  offerHistory: ContractOffer[];
  currentStatus: TamperingStatus;
  meetingCount: number;
  closeness: number; // 0-1, how close to deal
  lastActivity: number;
}

/**
 * Creates initial legal tampering state
 */
export function createLegalTamperingState(startDay: number, endDay: number): LegalTamperingState {
  return {
    isActive: false,
    startDay,
    endDay,
    currentDay: startDay,
    verbalAgreements: [],
    negotiationsInProgress: new Map(),
    teamTamperingActivity: new Map(),
  };
}

/**
 * Starts the legal tampering period
 */
export function startLegalTampering(state: LegalTamperingState): LegalTamperingState {
  return {
    ...state,
    isActive: true,
    currentDay: state.startDay,
  };
}

/**
 * Ends the legal tampering period
 */
export function endLegalTampering(state: LegalTamperingState): LegalTamperingState {
  return {
    ...state,
    isActive: false,
  };
}

/**
 * Initiates a negotiation with a free agent
 */
export function initiateNegotiation(
  state: LegalTamperingState,
  freeAgentId: string,
  teamId: string,
  initialOffer: ContractOffer
): LegalTamperingState {
  const negotiationKey = `${teamId}-${freeAgentId}`;

  const negotiation: TamperingNegotiation = {
    freeAgentId,
    teamId,
    offerHistory: [initialOffer],
    currentStatus: 'in_progress',
    meetingCount: 1,
    closeness: 0,
    lastActivity: Date.now(),
  };

  const newNegotiations = new Map(state.negotiationsInProgress);
  newNegotiations.set(negotiationKey, negotiation);

  // Track team activity
  const newActivity = new Map(state.teamTamperingActivity);
  const currentActivity = newActivity.get(teamId) || 0;
  newActivity.set(teamId, currentActivity + 1);

  return {
    ...state,
    negotiationsInProgress: newNegotiations,
    teamTamperingActivity: newActivity,
  };
}

/**
 * Updates an ongoing negotiation with a new offer
 */
export function updateNegotiation(
  state: LegalTamperingState,
  teamId: string,
  freeAgentId: string,
  newOffer: ContractOffer,
  closeness: number
): LegalTamperingState {
  const negotiationKey = `${teamId}-${freeAgentId}`;
  const existing = state.negotiationsInProgress.get(negotiationKey);

  if (!existing) {
    return initiateNegotiation(state, freeAgentId, teamId, newOffer);
  }

  const updated: TamperingNegotiation = {
    ...existing,
    offerHistory: [...existing.offerHistory, newOffer],
    meetingCount: existing.meetingCount + 1,
    closeness,
    lastActivity: Date.now(),
  };

  const newNegotiations = new Map(state.negotiationsInProgress);
  newNegotiations.set(negotiationKey, updated);

  return {
    ...state,
    negotiationsInProgress: newNegotiations,
  };
}

/**
 * Records a verbal agreement
 */
export function recordVerbalAgreement(
  state: LegalTamperingState,
  freeAgentId: string,
  teamId: string,
  offer: ContractOffer
): LegalTamperingState {
  const negotiationKey = `${teamId}-${freeAgentId}`;

  // Update negotiation status
  const existing = state.negotiationsInProgress.get(negotiationKey);
  if (existing) {
    const updated: TamperingNegotiation = {
      ...existing,
      currentStatus: 'verbal_agreement',
      closeness: 1.0,
    };
    const newNegotiations = new Map(state.negotiationsInProgress);
    newNegotiations.set(negotiationKey, updated);
    state = { ...state, negotiationsInProgress: newNegotiations };
  }

  const agreement: VerbalAgreement = {
    id: `verbal-${teamId}-${freeAgentId}-${Date.now()}`,
    freeAgentId,
    teamId,
    offer,
    timestamp: Date.now(),
    priority: state.verbalAgreements.length + 1,
  };

  return {
    ...state,
    verbalAgreements: [...state.verbalAgreements, agreement],
  };
}

/**
 * Gets all verbal agreements for a team
 */
export function getTeamVerbalAgreements(
  state: LegalTamperingState,
  teamId: string
): VerbalAgreement[] {
  return state.verbalAgreements.filter((va) => va.teamId === teamId);
}

/**
 * Gets all verbal agreements for a free agent
 */
export function getFreeAgentVerbalAgreements(
  state: LegalTamperingState,
  freeAgentId: string
): VerbalAgreement[] {
  return state.verbalAgreements.filter((va) => va.freeAgentId === freeAgentId);
}

/**
 * Checks if a free agent has a verbal agreement
 */
export function hasVerbalAgreement(state: LegalTamperingState, freeAgentId: string): boolean {
  return state.verbalAgreements.some((va) => va.freeAgentId === freeAgentId);
}

/**
 * Gets the highest priority verbal agreement for a free agent
 */
export function getPrimaryVerbalAgreement(
  state: LegalTamperingState,
  freeAgentId: string
): VerbalAgreement | null {
  const agreements = getFreeAgentVerbalAgreements(state, freeAgentId);
  if (agreements.length === 0) return null;

  // Sort by priority (lower is first to agree)
  agreements.sort((a, b) => a.priority - b.priority);
  return agreements[0];
}

/**
 * Gets ongoing negotiations for a team
 */
export function getTeamNegotiations(
  state: LegalTamperingState,
  teamId: string
): TamperingNegotiation[] {
  return Array.from(state.negotiationsInProgress.values()).filter((n) => n.teamId === teamId);
}

/**
 * Gets negotiations for a free agent
 */
export function getFreeAgentNegotiations(
  state: LegalTamperingState,
  freeAgentId: string
): TamperingNegotiation[] {
  return Array.from(state.negotiationsInProgress.values()).filter(
    (n) => n.freeAgentId === freeAgentId
  );
}

/**
 * Simulates player decision on offers during tampering
 * Returns the best offer they would accept if FA opens
 */
export function evaluateTamperingOffers(
  freeAgent: FreeAgent,
  negotiations: TamperingNegotiation[],
  marketValue: MarketValueResult
): { bestTeamId: string; bestOffer: ContractOffer } | null {
  if (negotiations.length === 0) return null;

  let bestTeamId: string | null = null;
  let bestOffer: ContractOffer | null = null;
  let bestScore = 0;

  for (const negotiation of negotiations) {
    if (negotiation.offerHistory.length === 0) continue;

    const latestOffer = negotiation.offerHistory[negotiation.offerHistory.length - 1];
    const offerAAV = latestOffer.totalValue / latestOffer.years;

    // Score based on how close to market value and guarantees
    const aavScore = Math.min(1.2, offerAAV / marketValue.projectedAAV);
    const guaranteeScore = latestOffer.guaranteedMoney / (latestOffer.totalValue * 0.5);
    const yearsScore = latestOffer.years >= marketValue.projectedYears ? 1.0 : 0.8;

    const totalScore = aavScore * 0.5 + guaranteeScore * 0.3 + yearsScore * 0.2;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestTeamId = negotiation.teamId;
      bestOffer = latestOffer;
    }
  }

  // Player won't accept if score is too low
  if (bestScore < 0.85 || !bestTeamId || !bestOffer) {
    return null;
  }

  return { bestTeamId, bestOffer };
}

/**
 * Advances tampering by one day
 */
export function advanceTamperingDay(state: LegalTamperingState): LegalTamperingState {
  const newDay = state.currentDay + 1;

  // End tampering if past end day
  if (newDay > state.endDay) {
    return endLegalTampering(state);
  }

  return {
    ...state,
    currentDay: newDay,
  };
}

/**
 * Gets tampering summary for display
 */
export interface TamperingSummary {
  isActive: boolean;
  daysRemaining: number;
  totalNegotiations: number;
  totalVerbalAgreements: number;
  topTeamActivity: Array<{ teamId: string; activityCount: number }>;
  recentAgreements: Array<{ playerName: string; teamId: string }>;
}

export function getTamperingSummary(
  state: LegalTamperingState,
  freeAgents: Map<string, FreeAgent>
): TamperingSummary {
  const daysRemaining = state.isActive ? state.endDay - state.currentDay : 0;

  // Get top team activity
  const teamActivity = Array.from(state.teamTamperingActivity.entries())
    .map(([teamId, activityCount]) => ({ teamId, activityCount }))
    .sort((a, b) => b.activityCount - a.activityCount)
    .slice(0, 5);

  // Get recent agreements
  const recentAgreements = state.verbalAgreements
    .slice(-5)
    .map((va) => {
      const fa = freeAgents.get(va.freeAgentId);
      return {
        playerName: fa?.playerName || 'Unknown',
        teamId: va.teamId,
      };
    })
    .reverse();

  return {
    isActive: state.isActive,
    daysRemaining,
    totalNegotiations: state.negotiationsInProgress.size,
    totalVerbalAgreements: state.verbalAgreements.length,
    topTeamActivity: teamActivity,
    recentAgreements,
  };
}

/**
 * Converts verbal agreements to formal offers when FA opens
 */
export function convertVerbalAgreementsToOffers(
  tamperingState: LegalTamperingState,
  faState: FreeAgencyState
): FreeAgencyState {
  let updatedState = faState;

  // Sort by priority to process first agreements first
  const sortedAgreements = [...tamperingState.verbalAgreements].sort(
    (a, b) => a.priority - b.priority
  );

  for (const agreement of sortedAgreements) {
    const freeAgent = updatedState.freeAgents.get(agreement.freeAgentId);
    if (!freeAgent || freeAgent.status !== 'available') {
      continue;
    }

    // Submit the offer formally
    updatedState = submitOffer(
      updatedState,
      agreement.teamId,
      agreement.freeAgentId,
      agreement.offer,
      false
    );
  }

  return updatedState;
}

/**
 * Validates legal tampering state
 */
export function validateLegalTamperingState(state: LegalTamperingState): boolean {
  if (typeof state.isActive !== 'boolean') return false;
  if (typeof state.startDay !== 'number') return false;
  if (typeof state.endDay !== 'number') return false;
  if (typeof state.currentDay !== 'number') return false;
  if (state.startDay > state.endDay) return false;
  if (state.currentDay < state.startDay) return false;

  if (!Array.isArray(state.verbalAgreements)) return false;
  if (!(state.negotiationsInProgress instanceof Map)) return false;
  if (!(state.teamTamperingActivity instanceof Map)) return false;

  return true;
}

/**
 * Draft Room Simulator
 * Orchestrates the draft flow, user/AI picks, trade offers, and clock management.
 */

import { DraftPick, recordSelection } from '../models/league/DraftPick';
import { Prospect } from './Prospect';
import { DraftClass } from './DraftClassGenerator';
import {
  DraftOrderState,
  getDraftOrder,
  getNextPick,
  executeTrade,
  getTeamPicks,
} from './DraftOrderManager';
import {
  AIDraftProfile,
  makeAIPickDecision,
  AITradeOffer,
  evaluateTradeOffer,
  generateTradeOffer,
} from './AIDraftStrategy';
import { evaluateTrade, TradeProposal, TradeEvaluation } from './TradeValueCalculator';

/**
 * Draft timer configuration
 */
export interface DraftTimerConfig {
  /** Time per pick in seconds for rounds 1-2 */
  roundsOneTwo: number;
  /** Time per pick in seconds for rounds 3-4 */
  roundsThreeFour: number;
  /** Time per pick in seconds for rounds 5-7 */
  roundsFiveToSeven: number;
  /** Whether timer is enabled */
  enabled: boolean;
}

/**
 * Default timer configuration
 */
export const DEFAULT_TIMER_CONFIG: DraftTimerConfig = {
  roundsOneTwo: 600, // 10 minutes
  roundsThreeFour: 420, // 7 minutes
  roundsFiveToSeven: 300, // 5 minutes
  enabled: true,
};

/**
 * Draft pick result
 */
export interface DraftPickResult {
  pick: DraftPick;
  prospect: Prospect;
  teamId: string;
  timestamp: number;
}

/**
 * Trade result
 */
export interface TradeResult {
  tradeId: string;
  timestamp: number;
  team1Id: string;
  team2Id: string;
  team1Receives: DraftPick[];
  team2Receives: DraftPick[];
}

/**
 * Draft round status
 */
export interface RoundStatus {
  round: number;
  picksCompleted: number;
  totalPicks: number;
  isComplete: boolean;
}

/**
 * Draft status
 */
export enum DraftStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  ROUND_COMPLETE = 'ROUND_COMPLETE',
  COMPLETED = 'COMPLETED',
}

/**
 * Current pick state
 */
export interface CurrentPickState {
  pick: DraftPick;
  teamId: string;
  isUserPick: boolean;
  timeRemaining: number | null;
  round: number;
  overallPick: number;
}

/**
 * Pending trade offer state
 */
export interface PendingTradeOffer {
  offer: AITradeOffer;
  evaluation: TradeEvaluation;
  expiresAt: number;
}

/**
 * Draft room state
 */
export interface DraftRoomState {
  /** Draft year */
  year: number;
  /** Current status */
  status: DraftStatus;
  /** Draft order state */
  orderState: DraftOrderState;
  /** Draft class */
  draftClass: DraftClass;
  /** AI team profiles */
  aiProfiles: Map<string, AIDraftProfile>;
  /** User's team ID */
  userTeamId: string;
  /** Timer configuration */
  timerConfig: DraftTimerConfig;
  /** Completed picks */
  picks: DraftPickResult[];
  /** Completed trades */
  trades: TradeResult[];
  /** Currently available prospects */
  availableProspects: Prospect[];
  /** Current pick being made (if any) */
  currentPick: CurrentPickState | null;
  /** Pending trade offers to user */
  pendingTradeOffers: PendingTradeOffer[];
  /** Current round */
  currentRound: number;
}

/**
 * Creates initial draft room state
 */
export function createDraftRoomState(
  year: number,
  orderState: DraftOrderState,
  draftClass: DraftClass,
  aiProfiles: Map<string, AIDraftProfile>,
  userTeamId: string,
  timerConfig: DraftTimerConfig = DEFAULT_TIMER_CONFIG
): DraftRoomState {
  return {
    year,
    status: DraftStatus.NOT_STARTED,
    orderState,
    draftClass,
    aiProfiles,
    userTeamId,
    timerConfig,
    picks: [],
    trades: [],
    availableProspects: [...draftClass.prospects],
    currentPick: null,
    pendingTradeOffers: [],
    currentRound: 1,
  };
}

/**
 * Starts the draft
 */
export function startDraft(state: DraftRoomState): DraftRoomState {
  if (state.status !== DraftStatus.NOT_STARTED) {
    throw new Error('Draft has already started');
  }

  const nextPick = getNextPick(state.orderState, state.year);
  if (!nextPick) {
    throw new Error('No picks available');
  }

  return {
    ...state,
    status: DraftStatus.IN_PROGRESS,
    currentPick: createCurrentPickState(nextPick, state.userTeamId, state.timerConfig),
  };
}

/**
 * Creates current pick state
 */
function createCurrentPickState(
  pick: DraftPick,
  userTeamId: string,
  timerConfig: DraftTimerConfig
): CurrentPickState {
  const isUserPick = pick.currentTeamId === userTeamId;
  let timeRemaining: number | null = null;

  if (timerConfig.enabled && isUserPick) {
    if (pick.round <= 2) {
      timeRemaining = timerConfig.roundsOneTwo;
    } else if (pick.round <= 4) {
      timeRemaining = timerConfig.roundsThreeFour;
    } else {
      timeRemaining = timerConfig.roundsFiveToSeven;
    }
  }

  return {
    pick,
    teamId: pick.currentTeamId,
    isUserPick,
    timeRemaining,
    round: pick.round,
    overallPick: pick.overallPick || 0,
  };
}

/**
 * Gets time allowed for a pick
 */
export function getTimeForPick(round: number, config: DraftTimerConfig): number {
  if (round <= 2) return config.roundsOneTwo;
  if (round <= 4) return config.roundsThreeFour;
  return config.roundsFiveToSeven;
}

/**
 * Makes a user pick
 */
export function makeUserPick(
  state: DraftRoomState,
  prospectId: string
): DraftRoomState {
  if (state.status !== DraftStatus.IN_PROGRESS) {
    throw new Error('Draft is not in progress');
  }

  if (!state.currentPick) {
    throw new Error('No current pick');
  }

  if (!state.currentPick.isUserPick) {
    throw new Error('Not user\'s pick');
  }

  const prospect = state.availableProspects.find((p) => p.id === prospectId);
  if (!prospect) {
    throw new Error('Prospect not available');
  }

  return recordPick(state, prospect);
}

/**
 * Processes AI pick
 */
export function processAIPick(state: DraftRoomState): DraftRoomState {
  if (state.status !== DraftStatus.IN_PROGRESS) {
    throw new Error('Draft is not in progress');
  }

  if (!state.currentPick) {
    throw new Error('No current pick');
  }

  if (state.currentPick.isUserPick) {
    throw new Error('Current pick belongs to user');
  }

  const aiProfile = state.aiProfiles.get(state.currentPick.teamId);
  if (!aiProfile) {
    // Default behavior if no profile - pick BPA
    const topProspect = state.availableProspects[0];
    if (topProspect) {
      return recordPick(state, topProspect);
    }
    throw new Error('No prospects available');
  }

  // Get AI decision
  const availablePicks = getTeamPicks(state.orderState, state.currentPick.teamId, state.year);
  const decision = makeAIPickDecision(
    aiProfile,
    state.currentPick.pick,
    state.availableProspects,
    availablePicks as DraftPick[],
    state.year
  );

  if (decision.selectedProspect) {
    return recordPick(state, decision.selectedProspect);
  }

  // Fallback to top available
  const fallbackProspect = state.availableProspects[0];
  if (fallbackProspect) {
    return recordPick(state, fallbackProspect);
  }

  throw new Error('No prospects available for AI pick');
}

/**
 * Records a pick and advances state
 */
function recordPick(state: DraftRoomState, prospect: Prospect): DraftRoomState {
  if (!state.currentPick) {
    throw new Error('No current pick');
  }

  // Record the selection
  const updatedPick = recordSelection(state.currentPick.pick, prospect.id);

  // Update order state
  const yearState = state.orderState.draftYears.get(state.year);
  if (!yearState) {
    throw new Error('Draft year not found');
  }

  const pickIndex = yearState.picks.findIndex((p) => p.id === updatedPick.id);
  const updatedPicks = [...yearState.picks];
  if (pickIndex !== -1) {
    updatedPicks[pickIndex] = updatedPick;
  }

  const newYearState = {
    ...yearState,
    picks: updatedPicks,
  };

  const newDraftYears = new Map(state.orderState.draftYears);
  newDraftYears.set(state.year, newYearState);

  const newOrderState: DraftOrderState = {
    ...state.orderState,
    draftYears: newDraftYears,
  };

  // Create pick result
  const pickResult: DraftPickResult = {
    pick: updatedPick,
    prospect,
    teamId: state.currentPick.teamId,
    timestamp: Date.now(),
  };

  // Remove prospect from available
  const newAvailableProspects = state.availableProspects.filter((p) => p.id !== prospect.id);

  // Advance to next pick
  const nextPick = getNextPick(newOrderState, state.year);
  let newStatus = state.status;
  let newCurrentPick: CurrentPickState | null = null;
  let newCurrentRound = state.currentRound;

  if (nextPick) {
    newCurrentPick = createCurrentPickState(nextPick, state.userTeamId, state.timerConfig);
    newCurrentRound = nextPick.round;

    // Check for round change
    if (nextPick.round !== state.currentRound) {
      newStatus = DraftStatus.ROUND_COMPLETE;
    }
  } else {
    // Draft complete
    newStatus = DraftStatus.COMPLETED;
  }

  return {
    ...state,
    orderState: newOrderState,
    picks: [...state.picks, pickResult],
    availableProspects: newAvailableProspects,
    currentPick: newCurrentPick,
    status: newStatus,
    currentRound: newCurrentRound,
  };
}

/**
 * Continues draft after round break
 */
export function continueAfterRoundBreak(state: DraftRoomState): DraftRoomState {
  if (state.status !== DraftStatus.ROUND_COMPLETE) {
    throw new Error('Draft is not at round break');
  }

  return {
    ...state,
    status: DraftStatus.IN_PROGRESS,
  };
}

/**
 * Pauses the draft
 */
export function pauseDraft(state: DraftRoomState): DraftRoomState {
  if (state.status !== DraftStatus.IN_PROGRESS) {
    throw new Error('Draft is not in progress');
  }

  return {
    ...state,
    status: DraftStatus.PAUSED,
  };
}

/**
 * Resumes the draft
 */
export function resumeDraft(state: DraftRoomState): DraftRoomState {
  if (state.status !== DraftStatus.PAUSED) {
    throw new Error('Draft is not paused');
  }

  return {
    ...state,
    status: DraftStatus.IN_PROGRESS,
  };
}

/**
 * Proposes a trade to an AI team
 */
export function proposeTradeToAI(
  state: DraftRoomState,
  picksOffered: DraftPick[],
  picksRequested: DraftPick[]
): { accepted: boolean; newState: DraftRoomState; reason: string } {
  if (picksRequested.length === 0) {
    return { accepted: false, newState: state, reason: 'No picks requested' };
  }

  const targetTeamId = picksRequested[0].currentTeamId;
  const aiProfile = state.aiProfiles.get(targetTeamId);

  if (!aiProfile) {
    return { accepted: false, newState: state, reason: 'Invalid target team' };
  }

  const offer: AITradeOffer = {
    offeringTeamId: state.userTeamId,
    targetTeamId,
    picksOffered,
    picksRequested,
    targetPick: picksRequested[0],
    _targetProspect: null,
  };

  const result = evaluateTradeOffer(aiProfile, offer, state.year);

  if (!result.accept) {
    return { accepted: false, newState: state, reason: result.reason };
  }

  // Execute the trade
  const newState = executeDraftTrade(state, picksOffered, picksRequested);
  return { accepted: true, newState, reason: 'Trade accepted' };
}

/**
 * Handles incoming AI trade offer
 */
export function receiveAITradeOffer(
  state: DraftRoomState,
  offer: AITradeOffer
): DraftRoomState {
  const proposal: TradeProposal = {
    picksOffered: offer.picksRequested, // From user perspective
    picksRequested: offer.picksOffered,
    currentYear: state.year,
  };

  const evaluation = evaluateTrade(proposal);

  const pendingOffer: PendingTradeOffer = {
    offer,
    evaluation,
    expiresAt: Date.now() + 60000, // 1 minute to respond
  };

  return {
    ...state,
    pendingTradeOffers: [...state.pendingTradeOffers, pendingOffer],
  };
}

/**
 * Accepts a pending trade offer
 */
export function acceptTradeOffer(
  state: DraftRoomState,
  offerId: number
): DraftRoomState {
  const offer = state.pendingTradeOffers[offerId];
  if (!offer) {
    throw new Error('Trade offer not found');
  }

  // Execute the trade
  const newState = executeDraftTrade(
    state,
    offer.offer.picksRequested, // User receives
    offer.offer.picksOffered // User gives
  );

  // Remove the accepted offer
  const newPendingOffers = state.pendingTradeOffers.filter((_, i) => i !== offerId);

  return {
    ...newState,
    pendingTradeOffers: newPendingOffers,
  };
}

/**
 * Rejects a pending trade offer
 */
export function rejectTradeOffer(
  state: DraftRoomState,
  offerId: number
): DraftRoomState {
  const newPendingOffers = state.pendingTradeOffers.filter((_, i) => i !== offerId);

  return {
    ...state,
    pendingTradeOffers: newPendingOffers,
  };
}

/**
 * Executes a draft trade
 */
function executeDraftTrade(
  state: DraftRoomState,
  userReceives: DraftPick[],
  userGives: DraftPick[]
): DraftRoomState {
  const tradeId = `trade-${state.year}-${Date.now()}`;
  let newOrderState = state.orderState;

  // Execute trades for picks user receives
  for (const pick of userReceives) {
    newOrderState = executeTrade(
      newOrderState,
      pick.id,
      pick.year,
      state.userTeamId,
      tradeId,
      0 // Week 0 = draft day
    );
  }

  // Execute trades for picks user gives
  const otherTeamId = userGives[0]?.currentTeamId || userReceives[0]?.currentTeamId;
  if (otherTeamId) {
    for (const pick of userGives) {
      newOrderState = executeTrade(
        newOrderState,
        pick.id,
        pick.year,
        otherTeamId,
        tradeId,
        0
      );
    }
  }

  const tradeResult: TradeResult = {
    tradeId,
    timestamp: Date.now(),
    team1Id: state.userTeamId,
    team2Id: otherTeamId || '',
    team1Receives: userReceives,
    team2Receives: userGives,
  };

  return {
    ...state,
    orderState: newOrderState,
    trades: [...state.trades, tradeResult],
  };
}

/**
 * Updates timer (called each second during user's pick)
 */
export function updateTimer(state: DraftRoomState): DraftRoomState {
  if (!state.currentPick || !state.currentPick.isUserPick) {
    return state;
  }

  if (state.currentPick.timeRemaining === null) {
    return state;
  }

  const newTimeRemaining = state.currentPick.timeRemaining - 1;

  if (newTimeRemaining <= 0) {
    // Auto-pick best available
    const topProspect = state.availableProspects[0];
    if (topProspect) {
      return recordPick(state, topProspect);
    }
  }

  return {
    ...state,
    currentPick: {
      ...state.currentPick,
      timeRemaining: newTimeRemaining,
    },
  };
}

/**
 * Gets round status
 */
export function getRoundStatus(state: DraftRoomState, round: number): RoundStatus {
  const allPicks = getDraftOrder(state.orderState, state.year);
  const roundPicks = allPicks.filter((p) => p.round === round);
  const completedPicks = roundPicks.filter((p) => p.selectedPlayerId !== null);

  return {
    round,
    picksCompleted: completedPicks.length,
    totalPicks: roundPicks.length,
    isComplete: completedPicks.length === roundPicks.length,
  };
}

/**
 * Gets all round statuses
 */
export function getAllRoundStatuses(state: DraftRoomState): RoundStatus[] {
  const statuses: RoundStatus[] = [];
  for (let round = 1; round <= 7; round++) {
    statuses.push(getRoundStatus(state, round));
  }
  return statuses;
}

/**
 * Gets draft summary
 */
export interface DraftSummary {
  totalPicks: number;
  picksCompleted: number;
  tradesCompleted: number;
  userPicks: DraftPickResult[];
  currentRound: number;
  status: DraftStatus;
}

/**
 * Gets draft summary
 */
export function getDraftSummary(state: DraftRoomState): DraftSummary {
  const allPicks = getDraftOrder(state.orderState, state.year);

  return {
    totalPicks: allPicks.length,
    picksCompleted: state.picks.length,
    tradesCompleted: state.trades.length,
    userPicks: state.picks.filter((p) => p.teamId === state.userTeamId),
    currentRound: state.currentRound,
    status: state.status,
  };
}

/**
 * Generates AI trade offers during user's pick
 */
export function generatePotentialTradeOffers(state: DraftRoomState): AITradeOffer[] {
  if (!state.currentPick || !state.currentPick.isUserPick) {
    return [];
  }

  const offers: AITradeOffer[] = [];

  // Check each AI team for potential interest
  for (const [teamId, profile] of state.aiProfiles) {
    if (teamId === state.userTeamId) continue;

    const teamPicks = getTeamPicks(state.orderState, teamId, state.year) as DraftPick[];

    // Generate potential offer if AI is interested
    const offer = generateTradeOffer(
      profile,
      state.currentPick.pick,
      teamPicks,
      state.availableProspects,
      state.year
    );

    if (offer) {
      offers.push(offer);
    }
  }

  return offers;
}

/**
 * Clears expired trade offers
 */
export function clearExpiredOffers(state: DraftRoomState): DraftRoomState {
  const now = Date.now();
  const validOffers = state.pendingTradeOffers.filter((o) => o.expiresAt > now);

  if (validOffers.length === state.pendingTradeOffers.length) {
    return state;
  }

  return {
    ...state,
    pendingTradeOffers: validOffers,
  };
}

/**
 * Validates draft room state
 */
export function validateDraftRoomState(state: DraftRoomState): boolean {
  if (typeof state.year !== 'number') return false;
  if (state.year < 2000 || state.year > 2100) return false;

  const validStatuses = Object.values(DraftStatus);
  if (!validStatuses.includes(state.status)) return false;

  if (!state.orderState) return false;
  if (!state.draftClass) return false;
  if (!(state.aiProfiles instanceof Map)) return false;
  if (!state.userTeamId || typeof state.userTeamId !== 'string') return false;

  if (!Array.isArray(state.picks)) return false;
  if (!Array.isArray(state.trades)) return false;
  if (!Array.isArray(state.availableProspects)) return false;
  if (!Array.isArray(state.pendingTradeOffers)) return false;

  return true;
}

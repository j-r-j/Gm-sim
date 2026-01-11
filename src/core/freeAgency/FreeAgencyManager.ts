/**
 * Free Agency Manager
 * Tracks UFA, RFA, ERFA players and manages free agency phases
 */

import { Position } from '../models/player/Position';
import { PlayerContract, ContractOffer, createPlayerContract, ContractType } from '../contracts/Contract';

/**
 * Free agent classification
 */
export type FreeAgentType = 'UFA' | 'RFA' | 'ERFA';

/**
 * Free agency phase
 */
export type FreeAgencyPhase =
  | 'pre_free_agency'
  | 'legal_tampering'
  | 'day1_frenzy'
  | 'day2_frenzy'
  | 'trickle'
  | 'training_camp'
  | 'closed';

/**
 * Free agent player record
 */
export interface FreeAgent {
  id: string;
  playerId: string;
  playerName: string;
  position: Position;
  age: number;
  experience: number;
  overallRating: number;
  previousTeamId: string;
  previousContractAAV: number;
  type: FreeAgentType;
  marketValue: number;
  interest: FreeAgentInterest[];
  offers: FreeAgentOffer[];
  status: 'available' | 'negotiating' | 'signed' | 'retired';
  signedTeamId: string | null;
  signedContractId: string | null;
}

/**
 * Team interest in a free agent (general, not specific - brand guidelines)
 */
export interface FreeAgentInterest {
  teamId: string;
  interestLevel: 'high' | 'medium' | 'low';
  fitsNeed: boolean;
  canAfford: boolean;
}

/**
 * Contract offer from a team
 */
export interface FreeAgentOffer {
  id: string;
  teamId: string;
  freeAgentId: string;
  offer: ContractOffer;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'withdrawn';
  isUserOffer: boolean;
}

/**
 * Free agency event
 */
export interface FreeAgencyEvent {
  id: string;
  type: 'signing' | 'offer' | 'interest' | 'phase_change' | 'tender' | 'match';
  timestamp: number;
  playerId: string;
  playerName: string;
  teamId: string | null;
  description: string;
  details: Record<string, unknown>;
}

/**
 * Free agency state
 */
export interface FreeAgencyState {
  currentYear: number;
  phase: FreeAgencyPhase;
  phaseDay: number;
  freeAgents: Map<string, FreeAgent>;
  offers: Map<string, FreeAgentOffer>;
  events: FreeAgencyEvent[];
  signedContracts: PlayerContract[];
  deadlines: FreeAgencyDeadlines;
  teamBudgets: Map<string, TeamFABudget>;
}

/**
 * Important free agency deadlines
 */
export interface FreeAgencyDeadlines {
  legalTamperingStart: number;
  freeAgencyStart: number;
  rfaTenderDeadline: number;
  rfaOfferSheetDeadline: number;
  rfaMatchDeadline: number;
  trainingCampStart: number;
}

/**
 * Team's free agency budget and priorities
 */
export interface TeamFABudget {
  teamId: string;
  totalBudget: number;
  spent: number;
  remaining: number;
  priorityPositions: Position[];
  needsLevel: Map<Position, 'critical' | 'moderate' | 'depth' | 'none'>;
}

/**
 * Creates initial free agency state
 */
export function createFreeAgencyState(
  currentYear: number,
  teamIds: string[]
): FreeAgencyState {
  const teamBudgets = new Map<string, TeamFABudget>();

  for (const teamId of teamIds) {
    teamBudgets.set(teamId, createDefaultTeamBudget(teamId));
  }

  return {
    currentYear,
    phase: 'pre_free_agency',
    phaseDay: 0,
    freeAgents: new Map(),
    offers: new Map(),
    events: [],
    signedContracts: [],
    deadlines: createDefaultDeadlines(currentYear),
    teamBudgets,
  };
}

/**
 * Creates default team FA budget
 */
export function createDefaultTeamBudget(teamId: string): TeamFABudget {
  return {
    teamId,
    totalBudget: 50000, // $50M default FA budget
    spent: 0,
    remaining: 50000,
    priorityPositions: [],
    needsLevel: new Map(),
  };
}

/**
 * Creates default free agency deadlines
 */
export function createDefaultDeadlines(_year: number): FreeAgencyDeadlines {
  // NFL calendar approximations (days from year start)
  return {
    legalTamperingStart: 68,  // ~March 9
    freeAgencyStart: 70,       // ~March 11 (league year)
    rfaTenderDeadline: 60,     // Before FA starts
    rfaOfferSheetDeadline: 130, // ~May 10
    rfaMatchDeadline: 137,      // 7 days after offer sheet
    trainingCampStart: 200,     // ~July 19
  };
}

/**
 * Adds a free agent to the pool
 */
export function addFreeAgent(
  state: FreeAgencyState,
  player: {
    playerId: string;
    playerName: string;
    position: Position;
    age: number;
    experience: number;
    overallRating: number;
    previousTeamId: string;
    previousContractAAV: number;
  },
  type: FreeAgentType,
  marketValue: number
): FreeAgencyState {
  const freeAgent: FreeAgent = {
    id: `fa-${player.playerId}-${state.currentYear}`,
    playerId: player.playerId,
    playerName: player.playerName,
    position: player.position,
    age: player.age,
    experience: player.experience,
    overallRating: player.overallRating,
    previousTeamId: player.previousTeamId,
    previousContractAAV: player.previousContractAAV,
    type,
    marketValue,
    interest: [],
    offers: [],
    status: 'available',
    signedTeamId: null,
    signedContractId: null,
  };

  const newFreeAgents = new Map(state.freeAgents);
  newFreeAgents.set(freeAgent.id, freeAgent);

  return {
    ...state,
    freeAgents: newFreeAgents,
  };
}

/**
 * Removes a free agent from the pool
 */
export function removeFreeAgent(state: FreeAgencyState, freeAgentId: string): FreeAgencyState {
  const newFreeAgents = new Map(state.freeAgents);
  newFreeAgents.delete(freeAgentId);

  return {
    ...state,
    freeAgents: newFreeAgents,
  };
}

/**
 * Gets all free agents of a specific type
 */
export function getFreeAgentsByType(state: FreeAgencyState, type: FreeAgentType): FreeAgent[] {
  return Array.from(state.freeAgents.values()).filter(fa => fa.type === type);
}

/**
 * Gets all free agents at a specific position
 */
export function getFreeAgentsByPosition(state: FreeAgencyState, position: Position): FreeAgent[] {
  return Array.from(state.freeAgents.values()).filter(fa => fa.position === position);
}

/**
 * Gets available free agents (not signed)
 */
export function getAvailableFreeAgents(state: FreeAgencyState): FreeAgent[] {
  return Array.from(state.freeAgents.values()).filter(fa => fa.status === 'available');
}

/**
 * Gets top free agents by market value
 */
export function getTopFreeAgents(state: FreeAgencyState, limit: number = 25): FreeAgent[] {
  return Array.from(state.freeAgents.values())
    .filter(fa => fa.status === 'available')
    .sort((a, b) => b.marketValue - a.marketValue)
    .slice(0, limit);
}

/**
 * Transitions to the next phase
 */
export function advancePhase(state: FreeAgencyState): FreeAgencyState {
  const phaseOrder: FreeAgencyPhase[] = [
    'pre_free_agency',
    'legal_tampering',
    'day1_frenzy',
    'day2_frenzy',
    'trickle',
    'training_camp',
    'closed',
  ];

  const currentIndex = phaseOrder.indexOf(state.phase);
  if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
    return state;
  }

  const nextPhase = phaseOrder[currentIndex + 1];

  const event: FreeAgencyEvent = {
    id: `event-${Date.now()}`,
    type: 'phase_change',
    timestamp: Date.now(),
    playerId: '',
    playerName: '',
    teamId: null,
    description: `Free agency transitions to ${nextPhase.replace('_', ' ')}`,
    details: { fromPhase: state.phase, toPhase: nextPhase },
  };

  return {
    ...state,
    phase: nextPhase,
    phaseDay: 0,
    events: [...state.events, event],
  };
}

/**
 * Advances by one day within a phase
 */
export function advanceDay(state: FreeAgencyState): FreeAgencyState {
  return {
    ...state,
    phaseDay: state.phaseDay + 1,
  };
}

/**
 * Submits an offer to a free agent
 */
export function submitOffer(
  state: FreeAgencyState,
  teamId: string,
  freeAgentId: string,
  offer: ContractOffer,
  isUserOffer: boolean = false
): FreeAgencyState {
  const freeAgent = state.freeAgents.get(freeAgentId);
  if (!freeAgent || freeAgent.status !== 'available') {
    return state;
  }

  // Can only make offers in appropriate phases
  if (state.phase === 'pre_free_agency' || state.phase === 'closed') {
    return state;
  }

  // In legal tampering, can negotiate but not sign (handled later)
  const faOffer: FreeAgentOffer = {
    id: `offer-${teamId}-${freeAgentId}-${Date.now()}`,
    teamId,
    freeAgentId,
    offer,
    timestamp: Date.now(),
    status: 'pending',
    isUserOffer,
  };

  const newOffers = new Map(state.offers);
  newOffers.set(faOffer.id, faOffer);

  // Update free agent's offers
  const updatedFreeAgent: FreeAgent = {
    ...freeAgent,
    offers: [...freeAgent.offers, faOffer],
    status: 'negotiating',
  };

  const newFreeAgents = new Map(state.freeAgents);
  newFreeAgents.set(freeAgentId, updatedFreeAgent);

  const event: FreeAgencyEvent = {
    id: `event-${Date.now()}`,
    type: 'offer',
    timestamp: Date.now(),
    playerId: freeAgent.playerId,
    playerName: freeAgent.playerName,
    teamId,
    description: `${freeAgent.playerName} receives contract offer`,
    details: { offerId: faOffer.id, aav: Math.round(offer.totalValue / offer.years) },
  };

  return {
    ...state,
    freeAgents: newFreeAgents,
    offers: newOffers,
    events: [...state.events, event],
  };
}

/**
 * Accepts an offer and signs the player
 */
export function acceptOffer(
  state: FreeAgencyState,
  offerId: string
): FreeAgencyState {
  const offer = state.offers.get(offerId);
  if (!offer || offer.status !== 'pending') {
    return state;
  }

  const freeAgent = state.freeAgents.get(offer.freeAgentId);
  if (!freeAgent || freeAgent.status === 'signed') {
    return state;
  }

  // Cannot sign during legal tampering
  if (state.phase === 'legal_tampering') {
    return state;
  }

  // Create the contract
  const contract = createPlayerContract(
    freeAgent.playerId,
    freeAgent.playerName,
    offer.teamId,
    freeAgent.position,
    offer.offer,
    state.currentYear,
    'veteran' as ContractType
  );

  // Update offer status
  const newOffers = new Map(state.offers);
  newOffers.set(offerId, { ...offer, status: 'accepted' });

  // Expire all other offers for this player
  for (const [id, o] of newOffers) {
    if (o.freeAgentId === freeAgent.id && o.id !== offerId && o.status === 'pending') {
      newOffers.set(id, { ...o, status: 'expired' });
    }
  }

  // Update free agent status
  const updatedFreeAgent: FreeAgent = {
    ...freeAgent,
    status: 'signed',
    signedTeamId: offer.teamId,
    signedContractId: contract.id,
  };

  const newFreeAgents = new Map(state.freeAgents);
  newFreeAgents.set(freeAgent.id, updatedFreeAgent);

  // Update team budget
  const teamBudget = state.teamBudgets.get(offer.teamId);
  let newTeamBudgets = state.teamBudgets;
  if (teamBudget) {
    const contractAAV = Math.round(offer.offer.totalValue / offer.offer.years);
    const newBudget: TeamFABudget = {
      ...teamBudget,
      spent: teamBudget.spent + contractAAV,
      remaining: teamBudget.remaining - contractAAV,
    };
    newTeamBudgets = new Map(state.teamBudgets);
    newTeamBudgets.set(offer.teamId, newBudget);
  }

  const event: FreeAgencyEvent = {
    id: `event-${Date.now()}`,
    type: 'signing',
    timestamp: Date.now(),
    playerId: freeAgent.playerId,
    playerName: freeAgent.playerName,
    teamId: offer.teamId,
    description: `${freeAgent.playerName} signs with team`,
    details: {
      contractId: contract.id,
      years: offer.offer.years,
      totalValue: offer.offer.totalValue,
    },
  };

  return {
    ...state,
    freeAgents: newFreeAgents,
    offers: newOffers,
    signedContracts: [...state.signedContracts, contract],
    teamBudgets: newTeamBudgets,
    events: [...state.events, event],
  };
}

/**
 * Rejects an offer
 */
export function rejectOffer(state: FreeAgencyState, offerId: string): FreeAgencyState {
  const offer = state.offers.get(offerId);
  if (!offer || offer.status !== 'pending') {
    return state;
  }

  const newOffers = new Map(state.offers);
  newOffers.set(offerId, { ...offer, status: 'rejected' });

  // Check if player has any remaining pending offers
  const freeAgent = state.freeAgents.get(offer.freeAgentId);
  if (freeAgent) {
    const hasPendingOffers = Array.from(newOffers.values())
      .some(o => o.freeAgentId === freeAgent.id && o.status === 'pending');

    if (!hasPendingOffers) {
      const updatedFreeAgent: FreeAgent = {
        ...freeAgent,
        status: 'available',
      };
      const newFreeAgents = new Map(state.freeAgents);
      newFreeAgents.set(freeAgent.id, updatedFreeAgent);

      return {
        ...state,
        freeAgents: newFreeAgents,
        offers: newOffers,
      };
    }
  }

  return {
    ...state,
    offers: newOffers,
  };
}

/**
 * Withdraws an offer
 */
export function withdrawOffer(state: FreeAgencyState, offerId: string): FreeAgencyState {
  const offer = state.offers.get(offerId);
  if (!offer || offer.status !== 'pending') {
    return state;
  }

  const newOffers = new Map(state.offers);
  newOffers.set(offerId, { ...offer, status: 'withdrawn' });

  return {
    ...state,
    offers: newOffers,
  };
}

/**
 * Sets team interest in a free agent
 */
export function setTeamInterest(
  state: FreeAgencyState,
  teamId: string,
  freeAgentId: string,
  interestLevel: 'high' | 'medium' | 'low',
  fitsNeed: boolean,
  canAfford: boolean
): FreeAgencyState {
  const freeAgent = state.freeAgents.get(freeAgentId);
  if (!freeAgent) {
    return state;
  }

  const interest: FreeAgentInterest = {
    teamId,
    interestLevel,
    fitsNeed,
    canAfford,
  };

  // Remove existing interest from this team
  const filteredInterest = freeAgent.interest.filter(i => i.teamId !== teamId);

  const updatedFreeAgent: FreeAgent = {
    ...freeAgent,
    interest: [...filteredInterest, interest],
  };

  const newFreeAgents = new Map(state.freeAgents);
  newFreeAgents.set(freeAgentId, updatedFreeAgent);

  const event: FreeAgencyEvent = {
    id: `event-${Date.now()}`,
    type: 'interest',
    timestamp: Date.now(),
    playerId: freeAgent.playerId,
    playerName: freeAgent.playerName,
    teamId,
    description: `Team shows ${interestLevel} interest in ${freeAgent.playerName}`,
    details: { interestLevel, fitsNeed, canAfford },
  };

  return {
    ...state,
    freeAgents: newFreeAgents,
    events: [...state.events, event],
  };
}

/**
 * Updates team's FA budget
 */
export function updateTeamBudget(
  state: FreeAgencyState,
  teamId: string,
  budget: Partial<TeamFABudget>
): FreeAgencyState {
  const existingBudget = state.teamBudgets.get(teamId);
  if (!existingBudget) {
    return state;
  }

  const newBudget: TeamFABudget = {
    ...existingBudget,
    ...budget,
    teamId, // Ensure teamId cannot be overwritten
  };

  const newTeamBudgets = new Map(state.teamBudgets);
  newTeamBudgets.set(teamId, newBudget);

  return {
    ...state,
    teamBudgets: newTeamBudgets,
  };
}

/**
 * Gets team's pending offers
 */
export function getTeamOffers(state: FreeAgencyState, teamId: string): FreeAgentOffer[] {
  return Array.from(state.offers.values())
    .filter(offer => offer.teamId === teamId);
}

/**
 * Gets pending offers for a free agent
 */
export function getFreeAgentOffers(state: FreeAgencyState, freeAgentId: string): FreeAgentOffer[] {
  return Array.from(state.offers.values())
    .filter(offer => offer.freeAgentId === freeAgentId && offer.status === 'pending');
}

/**
 * Gets recent events
 */
export function getRecentEvents(state: FreeAgencyState, limit: number = 50): FreeAgencyEvent[] {
  return state.events
    .slice(-limit)
    .reverse();
}

/**
 * Gets signings for a team
 */
export function getTeamSignings(state: FreeAgencyState, teamId: string): FreeAgent[] {
  return Array.from(state.freeAgents.values())
    .filter(fa => fa.signedTeamId === teamId);
}

/**
 * Classifies a player's free agent type based on experience
 */
export function classifyFreeAgentType(
  experience: number,
  wasDrafted: boolean
): FreeAgentType {
  // ERFA: Less than 3 accrued seasons
  if (experience < 3 && wasDrafted) {
    return 'ERFA';
  }

  // RFA: 3 accrued seasons
  if (experience === 3 && wasDrafted) {
    return 'RFA';
  }

  // UFA: 4+ accrued seasons or undrafted with 3+
  return 'UFA';
}

/**
 * Checks if free agency is currently active
 */
export function isFreeAgencyActive(state: FreeAgencyState): boolean {
  return state.phase !== 'pre_free_agency' && state.phase !== 'closed';
}

/**
 * Checks if signings are allowed in current phase
 */
export function canSignPlayers(state: FreeAgencyState): boolean {
  return ['day1_frenzy', 'day2_frenzy', 'trickle', 'training_camp'].includes(state.phase);
}

/**
 * Gets phase description for display
 */
export function getPhaseDescription(phase: FreeAgencyPhase): string {
  const descriptions: Record<FreeAgencyPhase, string> = {
    pre_free_agency: 'Pre-Free Agency: Teams evaluating needs',
    legal_tampering: 'Legal Tampering: Negotiations allowed, no signings',
    day1_frenzy: 'Day 1 Frenzy: Free agency opens, rapid signings',
    day2_frenzy: 'Day 2: Top players still moving quickly',
    trickle: 'Trickle Period: Slower pace, bargain hunting',
    training_camp: 'Training Camp: Final roster decisions',
    closed: 'Free Agency Closed',
  };

  return descriptions[phase];
}

/**
 * Validates free agency state
 */
export function validateFreeAgencyState(state: FreeAgencyState): boolean {
  if (typeof state.currentYear !== 'number') return false;
  if (state.currentYear < 2000 || state.currentYear > 2100) return false;

  if (!(state.freeAgents instanceof Map)) return false;
  if (!(state.offers instanceof Map)) return false;
  if (!(state.teamBudgets instanceof Map)) return false;

  if (!Array.isArray(state.events)) return false;
  if (!Array.isArray(state.signedContracts)) return false;

  return true;
}

/**
 * Gets free agency summary for display
 */
export interface FreeAgencySummary {
  phase: string;
  phaseDescription: string;
  totalFreeAgents: number;
  availableFreeAgents: number;
  signedPlayers: number;
  pendingOffers: number;
  topAvailablePlayers: Array<{ name: string; position: string; marketValue: string }>;
}

export function getFreeAgencySummary(state: FreeAgencyState): FreeAgencySummary {
  const formatMoney = (value: number): string => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}M`;
    }
    return `$${value}K`;
  };

  const allFreeAgents = Array.from(state.freeAgents.values());
  const available = allFreeAgents.filter(fa => fa.status === 'available');
  const signed = allFreeAgents.filter(fa => fa.status === 'signed');
  const pendingOffers = Array.from(state.offers.values()).filter(o => o.status === 'pending');

  const topAvailable = available
    .sort((a, b) => b.marketValue - a.marketValue)
    .slice(0, 5)
    .map(fa => ({
      name: fa.playerName,
      position: fa.position,
      marketValue: formatMoney(fa.marketValue),
    }));

  return {
    phase: state.phase,
    phaseDescription: getPhaseDescription(state.phase),
    totalFreeAgents: allFreeAgents.length,
    availableFreeAgents: available.length,
    signedPlayers: signed.length,
    pendingOffers: pendingOffers.length,
    topAvailablePlayers: topAvailable,
  };
}

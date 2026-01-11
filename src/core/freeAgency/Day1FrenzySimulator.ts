/**
 * Day 1 Frenzy Simulator
 * Handles the rapid signings, bidding wars, and chaos of free agency opening
 */

import { Position } from '../models/player/Position';
import { ContractOffer } from '../contracts/Contract';
import { FreeAgencyState, FreeAgent, TeamFABudget } from './FreeAgencyManager';
import { MarketValueResult } from './MarketValueCalculator';
import { LegalTamperingState, convertVerbalAgreementsToOffers } from './LegalTamperingPhase';

/**
 * Frenzy intensity level
 */
export type FrenzyIntensity = 'extreme' | 'high' | 'moderate' | 'calm';

/**
 * Bidding war state
 */
export interface BiddingWar {
  id: string;
  freeAgentId: string;
  participatingTeams: string[];
  currentHighBid: ContractOffer;
  currentHighBidder: string;
  roundsElapsed: number;
  maxRounds: number;
  isActive: boolean;
  escalationRate: number; // How much bids increase each round
}

/**
 * Frenzy signing event
 */
export interface FrenzySigningEvent {
  timestamp: number;
  playerId: string;
  playerName: string;
  position: Position;
  teamId: string;
  contractValue: number;
  contractYears: number;
  wasBiddingWar: boolean;
  marketPercentage: number;
}

/**
 * Day 1 frenzy state
 */
export interface Day1FrenzyState {
  isActive: boolean;
  startTime: number;
  elapsedMinutes: number;
  intensity: FrenzyIntensity;
  biddingWars: Map<string, BiddingWar>;
  signings: FrenzySigningEvent[];
  teamActivity: Map<string, number>;
  playersSigned: Set<string>;
  processedVerbalAgreements: boolean;
}

/**
 * Frenzy simulation configuration
 */
export interface FrenzyConfig {
  initialIntensity: FrenzyIntensity;
  signingsPerMinute: number;
  biddingWarProbability: number;
  escalationRate: number;
  maxBiddingRounds: number;
}

/**
 * Creates initial frenzy state
 */
export function createDay1FrenzyState(): Day1FrenzyState {
  return {
    isActive: false,
    startTime: 0,
    elapsedMinutes: 0,
    intensity: 'extreme',
    biddingWars: new Map(),
    signings: [],
    teamActivity: new Map(),
    playersSigned: new Set(),
    processedVerbalAgreements: false,
  };
}

/**
 * Gets default frenzy configuration
 */
export function getDefaultFrenzyConfig(): FrenzyConfig {
  return {
    initialIntensity: 'extreme',
    signingsPerMinute: 2,
    biddingWarProbability: 0.3,
    escalationRate: 0.05, // 5% increase per round
    maxBiddingRounds: 5,
  };
}

/**
 * Starts the Day 1 frenzy
 */
export function startFrenzy(state: Day1FrenzyState): Day1FrenzyState {
  return {
    ...state,
    isActive: true,
    startTime: Date.now(),
    elapsedMinutes: 0,
    intensity: 'extreme',
  };
}

/**
 * Ends the frenzy
 */
export function endFrenzy(state: Day1FrenzyState): Day1FrenzyState {
  // End all bidding wars
  const updatedWars = new Map<string, BiddingWar>();
  for (const [id, war] of state.biddingWars) {
    updatedWars.set(id, { ...war, isActive: false });
  }

  return {
    ...state,
    isActive: false,
    biddingWars: updatedWars,
  };
}

/**
 * Updates frenzy intensity based on remaining top free agents
 */
export function updateIntensity(
  state: Day1FrenzyState,
  remainingTopPlayers: number
): Day1FrenzyState {
  let intensity: FrenzyIntensity;

  if (remainingTopPlayers > 20) {
    intensity = 'extreme';
  } else if (remainingTopPlayers > 10) {
    intensity = 'high';
  } else if (remainingTopPlayers > 5) {
    intensity = 'moderate';
  } else {
    intensity = 'calm';
  }

  return {
    ...state,
    intensity,
  };
}

/**
 * Initiates a bidding war for a player
 */
export function initiateBiddingWar(
  state: Day1FrenzyState,
  freeAgentId: string,
  participatingTeams: string[],
  initialOffer: ContractOffer,
  initialBidder: string,
  config: FrenzyConfig
): Day1FrenzyState {
  if (participatingTeams.length < 2) {
    return state; // Need at least 2 teams for a bidding war
  }

  const war: BiddingWar = {
    id: `war-${freeAgentId}-${Date.now()}`,
    freeAgentId,
    participatingTeams,
    currentHighBid: initialOffer,
    currentHighBidder: initialBidder,
    roundsElapsed: 0,
    maxRounds: config.maxBiddingRounds,
    isActive: true,
    escalationRate: config.escalationRate,
  };

  const newWars = new Map(state.biddingWars);
  newWars.set(war.id, war);

  return {
    ...state,
    biddingWars: newWars,
  };
}

/**
 * Processes a round of a bidding war
 */
export function processBiddingWarRound(
  state: Day1FrenzyState,
  warId: string,
  newBid: ContractOffer,
  bidderId: string
): Day1FrenzyState {
  const war = state.biddingWars.get(warId);
  if (!war || !war.isActive) {
    return state;
  }

  const updatedWar: BiddingWar = {
    ...war,
    currentHighBid: newBid,
    currentHighBidder: bidderId,
    roundsElapsed: war.roundsElapsed + 1,
    isActive: war.roundsElapsed + 1 < war.maxRounds,
  };

  const newWars = new Map(state.biddingWars);
  newWars.set(warId, updatedWar);

  return {
    ...state,
    biddingWars: newWars,
  };
}

/**
 * Ends a bidding war and returns the winner
 */
export function endBiddingWar(
  state: Day1FrenzyState,
  warId: string
): { state: Day1FrenzyState; winner: string; winningBid: ContractOffer } | null {
  const war = state.biddingWars.get(warId);
  if (!war) {
    return null;
  }

  const updatedWar: BiddingWar = {
    ...war,
    isActive: false,
  };

  const newWars = new Map(state.biddingWars);
  newWars.set(warId, updatedWar);

  return {
    state: { ...state, biddingWars: newWars },
    winner: war.currentHighBidder,
    winningBid: war.currentHighBid,
  };
}

/**
 * Records a signing during the frenzy
 */
export function recordFrenzySigning(
  state: Day1FrenzyState,
  freeAgent: FreeAgent,
  teamId: string,
  offer: ContractOffer,
  marketValue: number,
  wasBiddingWar: boolean
): Day1FrenzyState {
  const event: FrenzySigningEvent = {
    timestamp: Date.now(),
    playerId: freeAgent.playerId,
    playerName: freeAgent.playerName,
    position: freeAgent.position,
    teamId,
    contractValue: offer.totalValue,
    contractYears: offer.years,
    wasBiddingWar,
    marketPercentage: (offer.totalValue / offer.years / marketValue) * 100,
  };

  // Track team activity
  const newActivity = new Map(state.teamActivity);
  const currentActivity = newActivity.get(teamId) || 0;
  newActivity.set(teamId, currentActivity + 1);

  // Mark player as signed
  const newPlayersSigned = new Set(state.playersSigned);
  newPlayersSigned.add(freeAgent.playerId);

  return {
    ...state,
    signings: [...state.signings, event],
    teamActivity: newActivity,
    playersSigned: newPlayersSigned,
  };
}

/**
 * Generates an escalated bid for bidding war
 */
export function generateEscalatedBid(
  currentBid: ContractOffer,
  escalationRate: number
): ContractOffer {
  const multiplier = 1 + escalationRate;

  return {
    ...currentBid,
    totalValue: Math.round(currentBid.totalValue * multiplier),
    guaranteedMoney: Math.round(currentBid.guaranteedMoney * multiplier),
    signingBonus: Math.round(currentBid.signingBonus * multiplier),
    firstYearSalary: Math.round(currentBid.firstYearSalary * multiplier),
  };
}

/**
 * Determines if a team will continue bidding
 */
export function willContinueBidding(
  teamBudget: TeamFABudget,
  currentBid: ContractOffer,
  escalatedBid: ContractOffer,
  freeAgent: FreeAgent
): boolean {
  const escalatedAAV = escalatedBid.totalValue / escalatedBid.years;

  // Check if team can afford
  if (escalatedAAV > teamBudget.remaining) {
    return false;
  }

  // Check if this position is a priority
  if (!teamBudget.priorityPositions.includes(freeAgent.position)) {
    // Non-priority - more likely to drop out
    return Math.random() > 0.6;
  }

  // Check if the escalation is too steep
  const escalationPct = (escalatedBid.totalValue - currentBid.totalValue) / currentBid.totalValue;
  if (escalationPct > 0.15) {
    return Math.random() > 0.4;
  }

  return Math.random() > 0.2;
}

/**
 * Simulates AI team bidding behavior
 */
export function simulateTeamBid(
  freeAgent: FreeAgent,
  marketValue: MarketValueResult,
  teamBudget: TeamFABudget,
  competingOffers: number
): ContractOffer | null {
  // Check if team can afford
  if (teamBudget.remaining < marketValue.projectedAAV) {
    return null;
  }

  // Check if position is a need
  const needLevel = teamBudget.needsLevel.get(freeAgent.position);
  if (!needLevel || needLevel === 'none') {
    return null;
  }

  // Calculate bid premium based on competition and need
  let premium = 1.0;

  if (competingOffers > 3) {
    premium += 0.15;
  } else if (competingOffers > 1) {
    premium += 0.08;
  }

  if (needLevel === 'critical') {
    premium += 0.1;
  } else if (needLevel === 'moderate') {
    premium += 0.05;
  }

  // Some randomness
  premium += (Math.random() - 0.5) * 0.1;

  const adjustedAAV = Math.round(marketValue.projectedAAV * premium);

  // Cap at remaining budget
  const cappedAAV = Math.min(adjustedAAV, teamBudget.remaining);

  return {
    years: marketValue.projectedYears,
    totalValue: cappedAAV * marketValue.projectedYears,
    guaranteedMoney: Math.round(cappedAAV * marketValue.projectedYears * 0.5),
    signingBonus: Math.round(cappedAAV * marketValue.projectedYears * 0.2),
    firstYearSalary: cappedAAV,
    annualEscalation: 0.03,
    noTradeClause: marketValue.tier === 'elite',
    voidYears: 0,
  };
}

/**
 * Advances the frenzy by specified minutes
 */
export function advanceFrenzyTime(state: Day1FrenzyState, minutes: number): Day1FrenzyState {
  return {
    ...state,
    elapsedMinutes: state.elapsedMinutes + minutes,
  };
}

/**
 * Gets active bidding wars
 */
export function getActiveBiddingWars(state: Day1FrenzyState): BiddingWar[] {
  return Array.from(state.biddingWars.values()).filter((w) => w.isActive);
}

/**
 * Gets team's frenzy activity
 */
export function getTeamFrenzyActivity(
  state: Day1FrenzyState,
  teamId: string
): {
  signings: number;
  activeBidding: number;
  totalSpent: number;
} {
  const signings = state.signings.filter((s) => s.teamId === teamId);
  const activeBidding = getActiveBiddingWars(state).filter((w) =>
    w.participatingTeams.includes(teamId)
  ).length;
  const totalSpent = signings.reduce((sum, s) => sum + s.contractValue / s.contractYears, 0);

  return {
    signings: signings.length,
    activeBidding,
    totalSpent,
  };
}

/**
 * Gets frenzy summary for display
 */
export interface FrenzySummary {
  isActive: boolean;
  intensity: string;
  elapsedTime: string;
  totalSignings: number;
  activeBiddingWars: number;
  recentSignings: Array<{
    playerName: string;
    position: string;
    teamId: string;
    value: string;
    aboveMarket: boolean;
  }>;
  mostActiveTeams: Array<{ teamId: string; signings: number }>;
}

export function getFrenzySummary(state: Day1FrenzyState): FrenzySummary {
  const formatMoney = (value: number): string => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}M`;
    }
    return `$${value}K`;
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Recent signings
  const recentSignings = state.signings
    .slice(-10)
    .reverse()
    .map((s) => ({
      playerName: s.playerName,
      position: s.position,
      teamId: s.teamId,
      value: formatMoney(s.contractValue / s.contractYears),
      aboveMarket: s.marketPercentage > 105,
    }));

  // Most active teams
  const teamSignings = new Map<string, number>();
  for (const signing of state.signings) {
    const count = teamSignings.get(signing.teamId) || 0;
    teamSignings.set(signing.teamId, count + 1);
  }

  const mostActiveTeams = Array.from(teamSignings.entries())
    .map(([teamId, signings]) => ({ teamId, signings }))
    .sort((a, b) => b.signings - a.signings)
    .slice(0, 5);

  return {
    isActive: state.isActive,
    intensity: state.intensity,
    elapsedTime: formatTime(state.elapsedMinutes),
    totalSignings: state.signings.length,
    activeBiddingWars: getActiveBiddingWars(state).length,
    recentSignings,
    mostActiveTeams,
  };
}

/**
 * Processes verbal agreements when frenzy starts
 */
export function processVerbalAgreements(
  frenzyState: Day1FrenzyState,
  faState: FreeAgencyState,
  tamperingState: LegalTamperingState
): { frenzyState: Day1FrenzyState; faState: FreeAgencyState } {
  if (frenzyState.processedVerbalAgreements) {
    return { frenzyState, faState };
  }

  // Convert verbal agreements to formal offers
  const updatedFaState = convertVerbalAgreementsToOffers(tamperingState, faState);

  return {
    frenzyState: { ...frenzyState, processedVerbalAgreements: true },
    faState: updatedFaState,
  };
}

/**
 * Determines signing speed based on intensity
 */
export function getSigningRate(intensity: FrenzyIntensity): number {
  const rates: Record<FrenzyIntensity, number> = {
    extreme: 3,
    high: 2,
    moderate: 1,
    calm: 0.5,
  };
  return rates[intensity];
}

/**
 * Validates frenzy state
 */
export function validateDay1FrenzyState(state: Day1FrenzyState): boolean {
  if (typeof state.isActive !== 'boolean') return false;
  if (typeof state.elapsedMinutes !== 'number') return false;
  if (state.elapsedMinutes < 0) return false;

  if (!(state.biddingWars instanceof Map)) return false;
  if (!(state.teamActivity instanceof Map)) return false;
  if (!(state.playersSigned instanceof Set)) return false;
  if (!Array.isArray(state.signings)) return false;

  return true;
}

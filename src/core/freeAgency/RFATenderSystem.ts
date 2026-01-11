/**
 * RFA Tender System
 * Handles Restricted Free Agent tenders, offer sheets, and matching periods
 */

import { Position } from '../models/player/Position';
import {
  ContractOffer,
  createPlayerContract,
  PlayerContract,
  ContractType,
} from '../contracts/Contract';

/**
 * RFA tender level
 */
export type TenderLevel =
  | 'first_round'
  | 'second_round'
  | 'original_round'
  | 'right_of_first_refusal';

/**
 * ERFA tender level (exclusive rights)
 */
export type ERFATenderLevel = 'exclusive_rights';

/**
 * Tender offer
 */
export interface TenderOffer {
  id: string;
  playerId: string;
  playerName: string;
  teamId: string;
  level: TenderLevel | ERFATenderLevel;
  salaryAmount: number;
  draftCompensation: string | null; // e.g., "1st round", "2nd round", "original draft round"
  year: number;
  status: 'active' | 'matched' | 'not_matched' | 'signed' | 'expired';
}

/**
 * Offer sheet from another team
 */
export interface OfferSheet {
  id: string;
  rfaPlayerId: string;
  offeringTeamId: string;
  originalTeamId: string;
  offer: ContractOffer;
  submittedDate: number;
  matchDeadline: number;
  status: 'pending' | 'matched' | 'not_matched' | 'withdrawn';
  matchingPeriodDays: number;
}

/**
 * RFA system state
 */
export interface RFASystemState {
  currentYear: number;
  tenders: Map<string, TenderOffer>;
  offerSheets: Map<string, OfferSheet>;
  matchedPlayers: Set<string>;
  signedToOfferSheets: Set<string>;
  deadlines: RFADeadlines;
}

/**
 * Important RFA deadlines
 */
export interface RFADeadlines {
  tenderDeadline: number; // Day of year
  offerSheetDeadline: number;
  matchingPeriodDays: number;
}

/**
 * Tender value percentages relative to cap
 */
const TENDER_PERCENTAGES: Record<TenderLevel, number> = {
  first_round: 0.085, // ~$20M on $255M cap
  second_round: 0.05, // ~$12M
  original_round: 0.03, // ~$8M
  right_of_first_refusal: 0.02, // ~$5M
};

/**
 * Creates initial RFA system state
 */
export function createRFASystemState(currentYear: number): RFASystemState {
  return {
    currentYear,
    tenders: new Map(),
    offerSheets: new Map(),
    matchedPlayers: new Set(),
    signedToOfferSheets: new Set(),
    deadlines: createDefaultRFADeadlines(),
  };
}

/**
 * Creates default RFA deadlines
 */
export function createDefaultRFADeadlines(): RFADeadlines {
  return {
    tenderDeadline: 60, // ~March 1
    offerSheetDeadline: 130, // ~May 10
    matchingPeriodDays: 7, // 7 days to match
  };
}

/**
 * Calculates tender value for a level
 */
export function calculateTenderValue(level: TenderLevel, salaryCap: number): number {
  const percentage = TENDER_PERCENTAGES[level];
  return Math.round(salaryCap * percentage);
}

/**
 * Gets draft compensation for a tender level
 */
export function getTenderDraftCompensation(level: TenderLevel): string | null {
  switch (level) {
    case 'first_round':
      return '1st round pick';
    case 'second_round':
      return '2nd round pick';
    case 'original_round':
      return 'Original draft round pick';
    case 'right_of_first_refusal':
      return null; // No compensation
  }
}

/**
 * Determines appropriate tender level for a player
 */
export function recommendTenderLevel(
  overallRating: number,
  position: Position,
  draftRound: number
): TenderLevel {
  // Elite players get first round tenders
  if (overallRating >= 85) {
    return 'first_round';
  }

  // Good starters get second round
  if (overallRating >= 75) {
    return 'second_round';
  }

  // Decent players - protect with original round if worth it
  if (overallRating >= 65) {
    if (draftRound <= 3) {
      return 'original_round';
    }
    return 'right_of_first_refusal';
  }

  // Depth players - minimum protection
  return 'right_of_first_refusal';
}

/**
 * Submits a tender for an RFA
 */
export function submitTender(
  state: RFASystemState,
  playerId: string,
  playerName: string,
  teamId: string,
  level: TenderLevel | ERFATenderLevel,
  salaryCap: number
): RFASystemState {
  const isERFA = level === 'exclusive_rights';
  const salaryAmount = isERFA
    ? 795 // ERFA minimum
    : calculateTenderValue(level as TenderLevel, salaryCap);

  const draftCompensation = isERFA ? null : getTenderDraftCompensation(level as TenderLevel);

  const tender: TenderOffer = {
    id: `tender-${playerId}-${state.currentYear}`,
    playerId,
    playerName,
    teamId,
    level,
    salaryAmount,
    draftCompensation,
    year: state.currentYear,
    status: 'active',
  };

  const newTenders = new Map(state.tenders);
  newTenders.set(tender.id, tender);

  return {
    ...state,
    tenders: newTenders,
  };
}

/**
 * Withdraws a tender
 */
export function withdrawTender(state: RFASystemState, tenderId: string): RFASystemState {
  const tender = state.tenders.get(tenderId);
  if (!tender || tender.status !== 'active') {
    return state;
  }

  const newTenders = new Map(state.tenders);
  newTenders.set(tenderId, { ...tender, status: 'expired' });

  return {
    ...state,
    tenders: newTenders,
  };
}

/**
 * Gets player's tender
 */
export function getPlayerTender(state: RFASystemState, playerId: string): TenderOffer | null {
  for (const tender of state.tenders.values()) {
    if (tender.playerId === playerId && tender.status === 'active') {
      return tender;
    }
  }
  return null;
}

/**
 * Gets all active tenders for a team
 */
export function getTeamTenders(state: RFASystemState, teamId: string): TenderOffer[] {
  return Array.from(state.tenders.values()).filter(
    (t) => t.teamId === teamId && t.status === 'active'
  );
}

/**
 * Submits an offer sheet to an RFA
 */
export function submitOfferSheet(
  state: RFASystemState,
  rfaPlayerId: string,
  offeringTeamId: string,
  originalTeamId: string,
  offer: ContractOffer
): RFASystemState {
  const tender = getPlayerTender(state, rfaPlayerId);
  if (!tender) {
    return state; // Player must be tendered
  }

  // ERFA cannot receive offer sheets
  if (tender.level === 'exclusive_rights') {
    return state;
  }

  const offerSheet: OfferSheet = {
    id: `offersheet-${rfaPlayerId}-${offeringTeamId}-${Date.now()}`,
    rfaPlayerId,
    offeringTeamId,
    originalTeamId,
    offer,
    submittedDate: Date.now(),
    matchDeadline: Date.now() + state.deadlines.matchingPeriodDays * 24 * 60 * 60 * 1000,
    status: 'pending',
    matchingPeriodDays: state.deadlines.matchingPeriodDays,
  };

  const newOfferSheets = new Map(state.offerSheets);
  newOfferSheets.set(offerSheet.id, offerSheet);

  return {
    ...state,
    offerSheets: newOfferSheets,
  };
}

/**
 * Original team matches an offer sheet
 */
export function matchOfferSheet(state: RFASystemState, offerSheetId: string): RFASystemState {
  const offerSheet = state.offerSheets.get(offerSheetId);
  if (!offerSheet || offerSheet.status !== 'pending') {
    return state;
  }

  // Update offer sheet status
  const newOfferSheets = new Map(state.offerSheets);
  newOfferSheets.set(offerSheetId, { ...offerSheet, status: 'matched' });

  // Update tender status
  const tender = getPlayerTender(state, offerSheet.rfaPlayerId);
  const newTenders = new Map(state.tenders);
  if (tender) {
    newTenders.set(tender.id, { ...tender, status: 'matched' });
  }

  // Add to matched players
  const newMatched = new Set(state.matchedPlayers);
  newMatched.add(offerSheet.rfaPlayerId);

  return {
    ...state,
    offerSheets: newOfferSheets,
    tenders: newTenders,
    matchedPlayers: newMatched,
  };
}

/**
 * Original team declines to match (player signs with offering team)
 */
export function declineToMatch(
  state: RFASystemState,
  offerSheetId: string
): {
  state: RFASystemState;
  draftCompensation: string | null;
} {
  const offerSheet = state.offerSheets.get(offerSheetId);
  if (!offerSheet || offerSheet.status !== 'pending') {
    return { state, draftCompensation: null };
  }

  // Get draft compensation from tender
  const tender = getPlayerTender(state, offerSheet.rfaPlayerId);
  const draftCompensation = tender?.draftCompensation || null;

  // Update offer sheet status
  const newOfferSheets = new Map(state.offerSheets);
  newOfferSheets.set(offerSheetId, { ...offerSheet, status: 'not_matched' });

  // Update tender status
  const newTenders = new Map(state.tenders);
  if (tender) {
    newTenders.set(tender.id, { ...tender, status: 'not_matched' });
  }

  // Add to signed players
  const newSigned = new Set(state.signedToOfferSheets);
  newSigned.add(offerSheet.rfaPlayerId);

  return {
    state: {
      ...state,
      offerSheets: newOfferSheets,
      tenders: newTenders,
      signedToOfferSheets: newSigned,
    },
    draftCompensation,
  };
}

/**
 * Gets pending offer sheets for a team's RFAs
 */
export function getPendingOfferSheetsForTeam(state: RFASystemState, teamId: string): OfferSheet[] {
  return Array.from(state.offerSheets.values()).filter(
    (os) => os.originalTeamId === teamId && os.status === 'pending'
  );
}

/**
 * Gets offer sheets submitted by a team
 */
export function getOfferSheetsSubmittedByTeam(state: RFASystemState, teamId: string): OfferSheet[] {
  return Array.from(state.offerSheets.values()).filter((os) => os.offeringTeamId === teamId);
}

/**
 * Checks if offer sheet deadline has passed
 */
export function isOfferSheetDeadlinePassed(state: RFASystemState, currentDay: number): boolean {
  return currentDay > state.deadlines.offerSheetDeadline;
}

/**
 * Checks if matching period has expired
 */
export function isMatchingPeriodExpired(offerSheet: OfferSheet): boolean {
  return Date.now() > offerSheet.matchDeadline;
}

/**
 * Expires all unresolved offer sheets past deadline
 */
export function expireUnresolvedOfferSheets(state: RFASystemState): RFASystemState {
  const newOfferSheets = new Map(state.offerSheets);
  const newSigned = new Set(state.signedToOfferSheets);

  for (const [id, os] of state.offerSheets) {
    if (os.status === 'pending' && isMatchingPeriodExpired(os)) {
      // Team failed to match, player signs with offering team
      newOfferSheets.set(id, { ...os, status: 'not_matched' });
      newSigned.add(os.rfaPlayerId);
    }
  }

  return {
    ...state,
    offerSheets: newOfferSheets,
    signedToOfferSheets: newSigned,
  };
}

/**
 * Creates contract from matched offer sheet
 */
export function createContractFromOfferSheet(
  offerSheet: OfferSheet,
  player: { playerId: string; playerName: string; position: Position },
  matchingTeam: boolean
): PlayerContract {
  const teamId = matchingTeam ? offerSheet.originalTeamId : offerSheet.offeringTeamId;

  return createPlayerContract(
    player.playerId,
    player.playerName,
    teamId,
    player.position,
    offerSheet.offer,
    new Date().getFullYear(),
    'veteran' as ContractType
  );
}

/**
 * Calculates "poison pill" contract structure
 * Front-loaded or back-loaded to make matching difficult
 */
export function createPoisonPillOffer(
  baseAAV: number,
  years: number,
  type: 'front_loaded' | 'back_loaded'
): ContractOffer {
  const totalValue = baseAAV * years;

  let firstYearSalary: number;
  let escalation: number;

  if (type === 'front_loaded') {
    // Heavy cap hit in early years
    firstYearSalary = Math.round(baseAAV * 1.5);
    escalation = -0.1; // Decreasing
  } else {
    // Heavy cap hit in later years (poison pill for matching team)
    firstYearSalary = Math.round(baseAAV * 0.6);
    escalation = 0.15; // Steep escalation
  }

  // Heavy guarantees
  const guaranteedMoney = Math.round(totalValue * 0.65);
  const signingBonus = Math.round(totalValue * 0.25);

  return {
    years,
    totalValue,
    guaranteedMoney,
    signingBonus,
    firstYearSalary,
    annualEscalation: escalation,
    noTradeClause: false,
    voidYears: 0,
  };
}

/**
 * Analyzes if matching an offer sheet is advisable
 */
export interface MatchAnalysis {
  shouldMatch: boolean;
  totalCost: number;
  capImpactYear1: number;
  guaranteedExposure: number;
  alternativeCost: number; // Cost of replacement + draft pick value
  reasoning: string;
}

export function analyzeOfferSheetMatch(
  offerSheet: OfferSheet,
  tender: TenderOffer,
  playerOverallRating: number,
  teamCapSpace: number
): MatchAnalysis {
  const offer = offerSheet.offer;
  const year1CapHit = Math.round(offer.totalValue / offer.years);

  // Estimate replacement cost
  const replacementAAV = Math.round(year1CapHit * 0.7);

  // Estimate draft pick value (rough)
  const draftPickValues: Record<string, number> = {
    '1st round pick': 20000,
    '2nd round pick': 10000,
    'Original draft round pick': 5000,
  };
  const pickValue = tender.draftCompensation ? draftPickValues[tender.draftCompensation] || 0 : 0;

  const alternativeCost = replacementAAV + pickValue;

  // Decision factors
  const canAfford = teamCapSpace >= year1CapHit;
  const isOverpay = year1CapHit > tender.salaryAmount * 1.5;
  const isValuablePlayer = playerOverallRating >= 75;

  let shouldMatch = false;
  let reasoning: string;

  if (!canAfford) {
    reasoning = 'Cannot afford the cap hit';
  } else if (isValuablePlayer && !isOverpay) {
    shouldMatch = true;
    reasoning = 'Worth matching for a quality player at reasonable price';
  } else if (isValuablePlayer && isOverpay) {
    // Still might match if player is really good
    if (playerOverallRating >= 85) {
      shouldMatch = true;
      reasoning = 'Elite player worth the premium';
    } else {
      reasoning = 'Good player but significant overpay';
    }
  } else {
    reasoning = 'Better to take compensation and find replacement';
  }

  return {
    shouldMatch,
    totalCost: offer.totalValue,
    capImpactYear1: year1CapHit,
    guaranteedExposure: offer.guaranteedMoney,
    alternativeCost,
    reasoning,
  };
}

/**
 * Gets RFA system summary for display
 */
export interface RFASummary {
  activeTenders: number;
  pendingOfferSheets: number;
  matchedPlayers: number;
  signedToOtherTeams: number;
  tendersByLevel: Record<string, number>;
  upcomingDeadlines: string[];
}

export function getRFASummary(state: RFASystemState): RFASummary {
  const activeTenders = Array.from(state.tenders.values()).filter((t) => t.status === 'active');

  const pendingOfferSheets = Array.from(state.offerSheets.values()).filter(
    (os) => os.status === 'pending'
  );

  // Count tenders by level
  const tendersByLevel: Record<string, number> = {};
  for (const tender of activeTenders) {
    tendersByLevel[tender.level] = (tendersByLevel[tender.level] || 0) + 1;
  }

  // Upcoming deadlines
  const upcomingDeadlines: string[] = [];
  for (const os of pendingOfferSheets) {
    const daysLeft = Math.ceil((os.matchDeadline - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysLeft <= 3) {
      upcomingDeadlines.push(`Match deadline in ${daysLeft} days`);
    }
  }

  return {
    activeTenders: activeTenders.length,
    pendingOfferSheets: pendingOfferSheets.length,
    matchedPlayers: state.matchedPlayers.size,
    signedToOtherTeams: state.signedToOfferSheets.size,
    tendersByLevel,
    upcomingDeadlines,
  };
}

/**
 * Validates RFA system state
 */
export function validateRFASystemState(state: RFASystemState): boolean {
  if (typeof state.currentYear !== 'number') return false;
  if (state.currentYear < 2000 || state.currentYear > 2100) return false;

  if (!(state.tenders instanceof Map)) return false;
  if (!(state.offerSheets instanceof Map)) return false;
  if (!(state.matchedPlayers instanceof Set)) return false;
  if (!(state.signedToOfferSheets instanceof Set)) return false;

  return true;
}

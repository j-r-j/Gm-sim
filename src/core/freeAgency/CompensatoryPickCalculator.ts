/**
 * Compensatory Pick Calculator
 * Calculates compensatory draft picks based on net free agent losses vs gains
 * Comp picks are awarded in rounds 3-7
 */

import { Position } from '../models/player/Position';
import { CompensatoryRound } from '../models/league/DraftPick';

/**
 * Free agent departure record
 */
export interface FADeparture {
  id: string;
  playerId: string;
  playerName: string;
  position: Position;
  previousTeamId: string;
  newTeamId: string;
  contractAAV: number;
  contractYears: number;
  contractTotal: number;
  age: number;
  overallRating: number;
  year: number;
  qualifyingContract: boolean;
}

/**
 * Free agent acquisition record
 */
export interface FAAcquisition {
  id: string;
  playerId: string;
  playerName: string;
  position: Position;
  newTeamId: string;
  previousTeamId: string;
  contractAAV: number;
  contractYears: number;
  contractTotal: number;
  age: number;
  overallRating: number;
  year: number;
  qualifyingContract: boolean;
}

/**
 * Comp pick calculation result for a single loss
 */
export interface CompPickEntitlement {
  teamId: string;
  lostPlayerId: string;
  lostPlayerName: string;
  lostPlayerAAV: number;
  matchedWithGain: boolean;
  matchedGainPlayerId: string | null;
  netValue: number;
  projectedRound: CompensatoryRound | null;
  reasoning: string;
}

/**
 * Team's comp pick summary
 */
export interface TeamCompPickSummary {
  teamId: string;
  year: number;
  totalLosses: number;
  totalGains: number;
  netLossValue: number;
  qualifyingLosses: FADeparture[];
  qualifyingGains: FAAcquisition[];
  entitlements: CompPickEntitlement[];
  awardedPicks: CompensatoryPickAward[];
}

/**
 * Final awarded compensatory pick
 */
export interface CompensatoryPickAward {
  teamId: string;
  round: CompensatoryRound;
  reason: string;
  associatedLossPlayerId: string;
  associatedLossPlayerName: string;
  netValue: number;
  year: number;
}

/**
 * Comp pick calculator state
 */
export interface CompPickCalculatorState {
  year: number;
  departures: FADeparture[];
  acquisitions: FAAcquisition[];
  teamSummaries: Map<string, TeamCompPickSummary>;
  awardedPicks: CompensatoryPickAward[];
  isCalculated: boolean;
}

/**
 * AAV thresholds for comp pick rounds (in thousands)
 */
const COMP_PICK_THRESHOLDS: Record<CompensatoryRound, { min: number; max: number }> = {
  3: { min: 18000, max: Infinity },
  4: { min: 12000, max: 17999 },
  5: { min: 8000, max: 11999 },
  6: { min: 4000, max: 7999 },
  7: { min: 1500, max: 3999 },
};

/**
 * Maximum comp picks per team per year
 */
export const MAX_COMP_PICKS_PER_TEAM = 4;

/**
 * Maximum comp picks league-wide per year
 */
export const MAX_COMP_PICKS_LEAGUE = 32;

/**
 * Creates initial comp pick calculator state
 */
export function createCompPickCalculatorState(year: number): CompPickCalculatorState {
  return {
    year,
    departures: [],
    acquisitions: [],
    teamSummaries: new Map(),
    awardedPicks: [],
    isCalculated: false,
  };
}

/**
 * Determines if a contract qualifies for comp pick consideration
 */
export function isQualifyingContract(
  contractAAV: number,
  age: number,
  wasOnPracticeSquad: boolean = false
): boolean {
  // Minimum contract value threshold
  if (contractAAV < 1500) {
    return false;
  }

  // Practice squad players don't qualify
  if (wasOnPracticeSquad) {
    return false;
  }

  // Very old players (35+) may not qualify
  if (age >= 35 && contractAAV < 5000) {
    return false;
  }

  return true;
}

/**
 * Records a free agent departure
 */
export function recordDeparture(
  state: CompPickCalculatorState,
  departure: Omit<FADeparture, 'id' | 'qualifyingContract'>
): CompPickCalculatorState {
  const qualifyingContract = isQualifyingContract(departure.contractAAV, departure.age);

  const faDeparture: FADeparture = {
    ...departure,
    id: `departure-${departure.playerId}-${state.year}`,
    qualifyingContract,
  };

  return {
    ...state,
    departures: [...state.departures, faDeparture],
    isCalculated: false,
  };
}

/**
 * Records a free agent acquisition
 */
export function recordAcquisition(
  state: CompPickCalculatorState,
  acquisition: Omit<FAAcquisition, 'id' | 'qualifyingContract'>
): CompPickCalculatorState {
  const qualifyingContract = isQualifyingContract(acquisition.contractAAV, acquisition.age);

  const faAcquisition: FAAcquisition = {
    ...acquisition,
    id: `acquisition-${acquisition.playerId}-${state.year}`,
    qualifyingContract,
  };

  return {
    ...state,
    acquisitions: [...state.acquisitions, faAcquisition],
    isCalculated: false,
  };
}

/**
 * Determines compensatory pick round based on AAV
 */
export function determineCompPickRound(aav: number): CompensatoryRound | null {
  for (const [round, threshold] of Object.entries(COMP_PICK_THRESHOLDS)) {
    if (aav >= threshold.min && aav <= threshold.max) {
      return parseInt(round) as CompensatoryRound;
    }
  }
  return null;
}

/**
 * Calculates net value for comp pick consideration
 * Factors in AAV, age, and production
 */
export function calculateCompValue(
  aav: number,
  age: number,
  overallRating: number
): number {
  let value = aav;

  // Age adjustments
  if (age >= 32) {
    value *= 0.8;
  } else if (age >= 30) {
    value *= 0.9;
  }

  // Production adjustments
  if (overallRating >= 85) {
    value *= 1.15;
  } else if (overallRating >= 75) {
    value *= 1.0;
  } else if (overallRating >= 65) {
    value *= 0.85;
  } else {
    value *= 0.7;
  }

  return Math.round(value);
}

/**
 * Gets qualifying departures for a team
 */
export function getTeamQualifyingDepartures(
  state: CompPickCalculatorState,
  teamId: string
): FADeparture[] {
  return state.departures.filter(
    d => d.previousTeamId === teamId && d.qualifyingContract
  );
}

/**
 * Gets qualifying acquisitions for a team
 */
export function getTeamQualifyingAcquisitions(
  state: CompPickCalculatorState,
  teamId: string
): FAAcquisition[] {
  return state.acquisitions.filter(
    a => a.newTeamId === teamId && a.qualifyingContract
  );
}

/**
 * Calculates comp pick entitlements for a team
 */
export function calculateTeamEntitlements(
  state: CompPickCalculatorState,
  teamId: string
): CompPickEntitlement[] {
  const departures = getTeamQualifyingDepartures(state, teamId);
  const acquisitions = getTeamQualifyingAcquisitions(state, teamId);

  // Sort both by value (highest first)
  departures.sort((a, b) =>
    calculateCompValue(b.contractAAV, b.age, b.overallRating) -
    calculateCompValue(a.contractAAV, a.age, a.overallRating)
  );

  acquisitions.sort((a, b) =>
    calculateCompValue(b.contractAAV, b.age, b.overallRating) -
    calculateCompValue(a.contractAAV, a.age, a.overallRating)
  );

  const entitlements: CompPickEntitlement[] = [];
  const usedAcquisitions = new Set<string>();

  for (const departure of departures) {
    const departureValue = calculateCompValue(
      departure.contractAAV,
      departure.age,
      departure.overallRating
    );

    // Try to find a matching acquisition to offset
    let matchedAcquisition: FAAcquisition | null = null;

    for (const acquisition of acquisitions) {
      if (usedAcquisitions.has(acquisition.id)) continue;

      const acquisitionValue = calculateCompValue(
        acquisition.contractAAV,
        acquisition.age,
        acquisition.overallRating
      );

      // Acquisition offsets if it's at least 80% of departure value
      if (acquisitionValue >= departureValue * 0.8) {
        matchedAcquisition = acquisition;
        usedAcquisitions.add(acquisition.id);
        break;
      }
    }

    if (matchedAcquisition) {
      // Departure is offset, no comp pick
      entitlements.push({
        teamId,
        lostPlayerId: departure.playerId,
        lostPlayerName: departure.playerName,
        lostPlayerAAV: departure.contractAAV,
        matchedWithGain: true,
        matchedGainPlayerId: matchedAcquisition.playerId,
        netValue: 0,
        projectedRound: null,
        reasoning: `Offset by acquisition of similar value`,
      });
    } else {
      // Unmatched loss, eligible for comp pick
      const projectedRound = determineCompPickRound(departureValue);

      entitlements.push({
        teamId,
        lostPlayerId: departure.playerId,
        lostPlayerName: departure.playerName,
        lostPlayerAAV: departure.contractAAV,
        matchedWithGain: false,
        matchedGainPlayerId: null,
        netValue: departureValue,
        projectedRound,
        reasoning: projectedRound
          ? `Uncompensated loss worth round ${projectedRound} pick`
          : 'Value below comp pick threshold',
      });
    }
  }

  return entitlements;
}

/**
 * Calculates team summary
 */
export function calculateTeamSummary(
  state: CompPickCalculatorState,
  teamId: string
): TeamCompPickSummary {
  const departures = getTeamQualifyingDepartures(state, teamId);
  const acquisitions = getTeamQualifyingAcquisitions(state, teamId);
  const entitlements = calculateTeamEntitlements(state, teamId);

  const totalLossValue = departures.reduce(
    (sum, d) => sum + calculateCompValue(d.contractAAV, d.age, d.overallRating),
    0
  );
  const totalGainValue = acquisitions.reduce(
    (sum, a) => sum + calculateCompValue(a.contractAAV, a.age, a.overallRating),
    0
  );

  return {
    teamId,
    year: state.year,
    totalLosses: departures.length,
    totalGains: acquisitions.length,
    netLossValue: totalLossValue - totalGainValue,
    qualifyingLosses: departures,
    qualifyingGains: acquisitions,
    entitlements,
    awardedPicks: [], // Filled in during final calculation
  };
}

/**
 * Calculates all comp picks for all teams
 */
export function calculateAllCompPicks(
  state: CompPickCalculatorState,
  teamIds: string[]
): CompPickCalculatorState {
  const teamSummaries = new Map<string, TeamCompPickSummary>();
  const allEntitlements: CompPickEntitlement[] = [];

  // Calculate summaries for all teams
  for (const teamId of teamIds) {
    const summary = calculateTeamSummary(state, teamId);
    teamSummaries.set(teamId, summary);

    // Collect all valid entitlements
    for (const entitlement of summary.entitlements) {
      if (!entitlement.matchedWithGain && entitlement.projectedRound) {
        allEntitlements.push(entitlement);
      }
    }
  }

  // Sort by net value (highest first)
  allEntitlements.sort((a, b) => b.netValue - a.netValue);

  // Award picks, respecting limits
  const awardedPicks: CompensatoryPickAward[] = [];
  const teamPickCounts = new Map<string, number>();

  for (const entitlement of allEntitlements) {
    // Check league limit
    if (awardedPicks.length >= MAX_COMP_PICKS_LEAGUE) break;

    // Check team limit
    const teamCount = teamPickCounts.get(entitlement.teamId) || 0;
    if (teamCount >= MAX_COMP_PICKS_PER_TEAM) continue;

    // Check round is valid
    if (!entitlement.projectedRound) continue;

    // Award the pick
    const award: CompensatoryPickAward = {
      teamId: entitlement.teamId,
      round: entitlement.projectedRound,
      reason: `Compensatory: Lost ${entitlement.lostPlayerName}`,
      associatedLossPlayerId: entitlement.lostPlayerId,
      associatedLossPlayerName: entitlement.lostPlayerName,
      netValue: entitlement.netValue,
      year: state.year + 1, // Comp picks awarded following year
    };

    awardedPicks.push(award);
    teamPickCounts.set(entitlement.teamId, teamCount + 1);

    // Update team summary
    const summary = teamSummaries.get(entitlement.teamId);
    if (summary) {
      summary.awardedPicks = [...summary.awardedPicks, award];
      teamSummaries.set(entitlement.teamId, summary);
    }
  }

  return {
    ...state,
    teamSummaries,
    awardedPicks,
    isCalculated: true,
  };
}

/**
 * Gets comp picks awarded to a team
 */
export function getTeamAwardedPicks(
  state: CompPickCalculatorState,
  teamId: string
): CompensatoryPickAward[] {
  return state.awardedPicks.filter(p => p.teamId === teamId);
}

/**
 * Gets comp picks by round
 */
export function getPicksByRound(
  state: CompPickCalculatorState,
  round: CompensatoryRound
): CompensatoryPickAward[] {
  return state.awardedPicks.filter(p => p.round === round);
}

/**
 * Estimates comp pick value based on current departures (pre-calculation)
 */
export function estimateCompPicksForDeparture(
  departure: FADeparture
): { round: CompensatoryRound | null; likelihood: 'likely' | 'possible' | 'unlikely' } {
  const value = calculateCompValue(
    departure.contractAAV,
    departure.age,
    departure.overallRating
  );

  const round = determineCompPickRound(value);

  if (!round) {
    return { round: null, likelihood: 'unlikely' };
  }

  // Higher value = more likely to not be offset
  if (value >= 15000) {
    return { round, likelihood: 'likely' };
  } else if (value >= 8000) {
    return { round, likelihood: 'possible' };
  } else {
    return { round, likelihood: 'unlikely' };
  }
}

/**
 * Gets comp pick summary for display
 */
export interface CompPickSummary {
  year: number;
  totalDepartures: number;
  totalAcquisitions: number;
  totalPicksAwarded: number;
  picksByRound: Record<number, number>;
  topLosses: Array<{
    playerName: string;
    teamId: string;
    aav: string;
    round: number | null;
  }>;
}

export function getCompPickSummary(state: CompPickCalculatorState): CompPickSummary {
  const formatMoney = (value: number): string => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}M`;
    }
    return `$${value}K`;
  };

  const picksByRound: Record<number, number> = { 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  for (const pick of state.awardedPicks) {
    picksByRound[pick.round] = (picksByRound[pick.round] || 0) + 1;
  }

  // Top losses
  const qualifyingDepartures = state.departures
    .filter(d => d.qualifyingContract)
    .sort((a, b) => b.contractAAV - a.contractAAV)
    .slice(0, 10);

  const topLosses = qualifyingDepartures.map(d => {
    const entitlement = Array.from(state.teamSummaries.values())
      .flatMap(s => s.entitlements)
      .find(e => e.lostPlayerId === d.playerId);

    return {
      playerName: d.playerName,
      teamId: d.previousTeamId,
      aav: formatMoney(d.contractAAV),
      round: entitlement?.projectedRound || null,
    };
  });

  return {
    year: state.year,
    totalDepartures: state.departures.filter(d => d.qualifyingContract).length,
    totalAcquisitions: state.acquisitions.filter(a => a.qualifyingContract).length,
    totalPicksAwarded: state.awardedPicks.length,
    picksByRound,
    topLosses,
  };
}

/**
 * Validates comp pick calculator state
 */
export function validateCompPickCalculatorState(state: CompPickCalculatorState): boolean {
  if (typeof state.year !== 'number') return false;
  if (state.year < 2000 || state.year > 2100) return false;

  if (!Array.isArray(state.departures)) return false;
  if (!Array.isArray(state.acquisitions)) return false;
  if (!Array.isArray(state.awardedPicks)) return false;
  if (!(state.teamSummaries instanceof Map)) return false;

  return true;
}

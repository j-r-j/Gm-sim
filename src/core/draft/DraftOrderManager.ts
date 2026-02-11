/**
 * Draft Order Manager
 * Tracks all picks (regular + compensatory), handles trades up to 3 years out,
 * and calculates compensatory picks based on free agent losses/gains.
 */

import {
  DraftPick,
  CompensatoryPick,
  CompensatoryRound,
  createDraftPick,
  createCompensatoryPick,
  tradePick,
  assignOverallPick,
  validateDraftPick,
  validateCompensatoryPick,
  DRAFT_ROUNDS,
} from '../models/league/DraftPick';
import {
  SeasonCalendar,
  isTradeDeadlinePassed,
  TRADE_DEADLINE_WEEK,
} from '../models/league/League';

/**
 * Maximum years into the future picks can be traded
 */
export const MAX_FUTURE_TRADE_YEARS = 3;

/**
 * Maximum compensatory picks per team per round
 */
export const MAX_COMP_PICKS_PER_ROUND = 4;

/**
 * Total maximum compensatory picks per year
 */
export const MAX_COMP_PICKS_TOTAL = 32;

/**
 * Free agent transaction type for comp pick calculation
 */
export type FATransactionType = 'loss' | 'gain';

/**
 * Free agent transaction record for compensatory pick calculation
 */
export interface FATransaction {
  id: string;
  playerId: string;
  playerName: string;
  teamId: string;
  type: FATransactionType;
  /** Contract value in thousands per year */
  contractValue: number;
  /** Projected draft round value (1-7) */
  projectedRound: number;
  year: number;
}

/**
 * Compensatory pick formula result
 */
export interface CompPickCalculation {
  teamId: string;
  round: CompensatoryRound;
  reason: string;
  netValue: number;
}

/**
 * Draft order state for a single year
 */
export interface DraftYearState {
  year: number;
  picks: DraftPick[];
  compensatoryPicks: CompensatoryPick[];
  isFinalized: boolean;
}

/**
 * Complete draft order manager state
 */
export interface DraftOrderState {
  /** Current year */
  currentYear: number;
  /** Draft states by year */
  draftYears: Map<number, DraftYearState>;
  /** Free agent transactions for comp pick calculation */
  faTransactions: FATransaction[];
  /** All team IDs in the league */
  teamIds: string[];
}

/**
 * Creates initial draft order state
 */
export function createDraftOrderState(
  currentYear: number,
  teamIds: string[],
  yearsToGenerate: number = 3
): DraftOrderState {
  const draftYears = new Map<number, DraftYearState>();

  for (let i = 0; i <= yearsToGenerate; i++) {
    const year = currentYear + i;
    draftYears.set(year, createDraftYearState(year, teamIds));
  }

  return {
    currentYear,
    draftYears,
    faTransactions: [],
    teamIds,
  };
}

/**
 * Creates draft picks for a single year
 */
export function createDraftYearState(year: number, teamIds: string[]): DraftYearState {
  const picks: DraftPick[] = [];

  for (let round = 1; round <= DRAFT_ROUNDS; round++) {
    for (const teamId of teamIds) {
      const pickId = `pick-${year}-R${round}-${teamId}`;
      picks.push(createDraftPick(pickId, year, round, teamId));
    }
  }

  return {
    year,
    picks,
    compensatoryPicks: [],
    isFinalized: false,
  };
}

/**
 * Gets all picks for a team in a given year
 */
export function getTeamPicks(
  state: DraftOrderState,
  teamId: string,
  year: number
): (DraftPick | CompensatoryPick)[] {
  const yearState = state.draftYears.get(year);
  if (!yearState) return [];

  const regularPicks = yearState.picks.filter((p) => p.currentTeamId === teamId);
  const compPicks = yearState.compensatoryPicks.filter((p) => p.currentTeamId === teamId);

  return [...regularPicks, ...compPicks];
}

/**
 * Gets all picks for a specific round
 */
export function getPicksByRound(
  state: DraftOrderState,
  year: number,
  round: number
): (DraftPick | CompensatoryPick)[] {
  const yearState = state.draftYears.get(year);
  if (!yearState) return [];

  const regularPicks = yearState.picks.filter((p) => p.round === round);
  const compPicks = yearState.compensatoryPicks.filter((p) => p.round === round);

  return [...regularPicks, ...compPicks];
}

/**
 * Trades a pick to another team
 * @param calendar - Optional season calendar for trade deadline enforcement
 */
export function executeTrade(
  state: DraftOrderState,
  pickId: string,
  pickYear: number,
  toTeamId: string,
  tradeId: string,
  week: number,
  calendar?: SeasonCalendar
): DraftOrderState {
  // Check trade deadline if calendar is provided
  if (calendar && isTradeDeadlinePassed(calendar)) {
    throw new Error(
      `Trade deadline has passed (Week ${TRADE_DEADLINE_WEEK}). Trades are no longer allowed this season.`
    );
  }

  const yearState = state.draftYears.get(pickYear);
  if (!yearState) {
    throw new Error(`Draft year ${pickYear} not found`);
  }

  // Check if this is within tradeable years
  if (pickYear - state.currentYear > MAX_FUTURE_TRADE_YEARS) {
    throw new Error(`Cannot trade picks more than ${MAX_FUTURE_TRADE_YEARS} years in the future`);
  }

  // Find and update the pick
  const pickIndex = yearState.picks.findIndex((p) => p.id === pickId);
  const compPickIndex = yearState.compensatoryPicks.findIndex((p) => p.id === pickId);

  if (pickIndex === -1 && compPickIndex === -1) {
    throw new Error(`Pick ${pickId} not found in year ${pickYear}`);
  }

  let updatedPicks = [...yearState.picks];
  let updatedCompPicks = [...yearState.compensatoryPicks];

  if (pickIndex !== -1) {
    updatedPicks[pickIndex] = tradePick(
      yearState.picks[pickIndex],
      toTeamId,
      tradeId,
      week,
      state.currentYear
    );
  } else {
    updatedCompPicks[compPickIndex] = {
      ...tradePick(
        yearState.compensatoryPicks[compPickIndex],
        toTeamId,
        tradeId,
        week,
        state.currentYear
      ),
      compensatoryReason: yearState.compensatoryPicks[compPickIndex].compensatoryReason,
    } as CompensatoryPick;
  }

  const newYearState: DraftYearState = {
    ...yearState,
    picks: updatedPicks,
    compensatoryPicks: updatedCompPicks,
  };

  const newDraftYears = new Map(state.draftYears);
  newDraftYears.set(pickYear, newYearState);

  return {
    ...state,
    draftYears: newDraftYears,
  };
}

/**
 * Records a free agent transaction for comp pick calculation
 */
export function recordFATransaction(
  state: DraftOrderState,
  transaction: FATransaction
): DraftOrderState {
  return {
    ...state,
    faTransactions: [...state.faTransactions, transaction],
  };
}

/**
 * Calculates compensatory picks based on free agent transactions
 * Comp picks are awarded for rounds 3-7 only
 */
export function calculateCompensatoryPicks(
  state: DraftOrderState,
  forYear: number
): CompPickCalculation[] {
  // Get transactions from previous year (comp picks awarded year after FA period)
  const relevantTransactions = state.faTransactions.filter((t) => t.year === forYear - 1);

  // Group by team
  const teamTransactions = new Map<string, FATransaction[]>();
  for (const teamId of state.teamIds) {
    teamTransactions.set(teamId, []);
  }

  for (const transaction of relevantTransactions) {
    const list = teamTransactions.get(transaction.teamId) || [];
    list.push(transaction);
    teamTransactions.set(transaction.teamId, list);
  }

  const calculations: CompPickCalculation[] = [];

  for (const [teamId, transactions] of teamTransactions) {
    const losses = transactions.filter((t) => t.type === 'loss');
    const gains = transactions.filter((t) => t.type === 'gain');

    // Sort losses by value (highest first)
    losses.sort((a, b) => b.contractValue - a.contractValue);

    // Sort gains by value for matching
    gains.sort((a, b) => b.contractValue - a.contractValue);

    // Match losses with gains
    const unmatchedLosses: FATransaction[] = [];
    const usedGains = new Set<string>();

    for (const loss of losses) {
      // Find a gain to offset this loss
      const matchingGain = gains.find(
        (g) => !usedGains.has(g.id) && g.contractValue >= loss.contractValue * 0.8
      );

      if (matchingGain) {
        usedGains.add(matchingGain.id);
      } else {
        unmatchedLosses.push(loss);
      }
    }

    // Generate comp picks for unmatched losses
    for (const loss of unmatchedLosses) {
      // Only rounds 3-7 get comp picks
      const compRound = Math.max(3, Math.min(7, loss.projectedRound)) as CompensatoryRound;

      calculations.push({
        teamId,
        round: compRound,
        reason: `Lost FA: ${loss.playerName}`,
        netValue: loss.contractValue,
      });
    }
  }

  // Sort by value and limit to max total
  calculations.sort((a, b) => b.netValue - a.netValue);
  return calculations.slice(0, MAX_COMP_PICKS_TOTAL);
}

/**
 * Awards compensatory picks to teams
 */
export function awardCompensatoryPicks(state: DraftOrderState, forYear: number): DraftOrderState {
  const yearState = state.draftYears.get(forYear);
  if (!yearState) {
    throw new Error(`Draft year ${forYear} not found`);
  }

  const calculations = calculateCompensatoryPicks(state, forYear);
  const newCompPicks: CompensatoryPick[] = [];

  // Track picks per team per round to enforce limits
  const picksPerTeamRound = new Map<string, number>();

  for (let i = 0; i < calculations.length; i++) {
    const calc = calculations[i];
    const key = `${calc.teamId}-${calc.round}`;
    const currentCount = picksPerTeamRound.get(key) || 0;

    if (currentCount >= MAX_COMP_PICKS_PER_ROUND) {
      continue;
    }

    const pickId = `comp-${forYear}-R${calc.round}-${calc.teamId}-${i}`;
    const compPick = createCompensatoryPick(pickId, forYear, calc.round, calc.teamId, calc.reason);
    newCompPicks.push(compPick);

    picksPerTeamRound.set(key, currentCount + 1);
  }

  const newYearState: DraftYearState = {
    ...yearState,
    compensatoryPicks: [...yearState.compensatoryPicks, ...newCompPicks],
  };

  const newDraftYears = new Map(state.draftYears);
  newDraftYears.set(forYear, newYearState);

  return {
    ...state,
    draftYears: newDraftYears,
  };
}

/**
 * Sets draft order based on team standings (reverse order of finish)
 * @param teamStandings Array of team IDs in order of finish (best to worst)
 */
export function setDraftOrderFromStandings(
  state: DraftOrderState,
  year: number,
  teamStandings: string[]
): DraftOrderState {
  const yearState = state.draftYears.get(year);
  if (!yearState) {
    throw new Error(`Draft year ${year} not found`);
  }

  // Reverse order: worst team picks first
  const draftOrder = [...teamStandings].reverse();

  let overallPick = 1;
  const updatedPicks: DraftPick[] = [];

  for (let round = 1; round <= DRAFT_ROUNDS; round++) {
    // Get picks for this round
    const roundPicks = yearState.picks.filter((p) => p.round === round);

    // Assign overall pick numbers based on original team order
    for (const draftTeamId of draftOrder) {
      const pick = roundPicks.find((p) => p.originalTeamId === draftTeamId);
      if (pick) {
        updatedPicks.push(assignOverallPick(pick, overallPick));
        overallPick++;
      }
    }
  }

  // Assign overall picks to compensatory picks (after regular picks in each round)
  const updatedCompPicks: CompensatoryPick[] = [];
  for (let round = 3; round <= DRAFT_ROUNDS; round++) {
    const compPicksInRound = yearState.compensatoryPicks.filter((p) => p.round === round);
    // Sort comp picks by original team's draft position
    compPicksInRound.sort((a, b) => {
      const aIndex = draftOrder.indexOf(a.originalTeamId);
      const bIndex = draftOrder.indexOf(b.originalTeamId);
      return aIndex - bIndex;
    });

    for (const compPick of compPicksInRound) {
      updatedCompPicks.push({
        ...assignOverallPick(compPick, overallPick),
        compensatoryReason: compPick.compensatoryReason,
      } as CompensatoryPick);
      overallPick++;
    }
  }

  const newYearState: DraftYearState = {
    ...yearState,
    picks: updatedPicks,
    compensatoryPicks: updatedCompPicks,
  };

  const newDraftYears = new Map(state.draftYears);
  newDraftYears.set(year, newYearState);

  return {
    ...state,
    draftYears: newDraftYears,
  };
}

/**
 * Gets the complete draft order for a year
 */
export function getDraftOrder(
  state: DraftOrderState,
  year: number
): (DraftPick | CompensatoryPick)[] {
  const yearState = state.draftYears.get(year);
  if (!yearState) return [];

  const allPicks: (DraftPick | CompensatoryPick)[] = [
    ...yearState.picks,
    ...yearState.compensatoryPicks,
  ];

  // Sort by overall pick number
  return allPicks.sort((a, b) => {
    if (a.overallPick === null && b.overallPick === null) {
      // Both unassigned - sort by round, then original team
      if (a.round !== b.round) return a.round - b.round;
      return a.originalTeamId.localeCompare(b.originalTeamId);
    }
    if (a.overallPick === null) return 1;
    if (b.overallPick === null) return -1;
    return a.overallPick - b.overallPick;
  });
}

/**
 * Gets the next pick in the draft
 */
export function getNextPick(
  state: DraftOrderState,
  year: number
): DraftPick | CompensatoryPick | null {
  const order = getDraftOrder(state, year);
  return order.find((p) => p.selectedPlayerId === null) || null;
}

/**
 * Checks if a team can trade a pick
 * @param calendar - Optional season calendar for trade deadline enforcement
 */
export function canTradePick(
  state: DraftOrderState,
  pickId: string,
  pickYear: number,
  teamId: string,
  calendar?: SeasonCalendar
): { canTrade: boolean; reason?: string } {
  // Check trade deadline if calendar is provided
  if (calendar && isTradeDeadlinePassed(calendar)) {
    return {
      canTrade: false,
      reason: `Trade deadline has passed (Week ${TRADE_DEADLINE_WEEK}). Trades are no longer allowed this season.`,
    };
  }

  const yearState = state.draftYears.get(pickYear);
  if (!yearState) {
    return { canTrade: false, reason: 'Draft year not found' };
  }

  // Check future year limit
  if (pickYear - state.currentYear > MAX_FUTURE_TRADE_YEARS) {
    return {
      canTrade: false,
      reason: `Cannot trade picks more than ${MAX_FUTURE_TRADE_YEARS} years out`,
    };
  }

  // Find the pick
  const pick =
    yearState.picks.find((p) => p.id === pickId) ||
    yearState.compensatoryPicks.find((p) => p.id === pickId);

  if (!pick) {
    return { canTrade: false, reason: 'Pick not found' };
  }

  // Check ownership
  if (pick.currentTeamId !== teamId) {
    return { canTrade: false, reason: 'Team does not own this pick' };
  }

  // Check if already used
  if (pick.selectedPlayerId !== null) {
    return { canTrade: false, reason: 'Pick has already been used' };
  }

  return { canTrade: true };
}

/**
 * Finalizes a draft year (prevents further changes)
 */
export function finalizeDraftYear(state: DraftOrderState, year: number): DraftOrderState {
  const yearState = state.draftYears.get(year);
  if (!yearState) {
    throw new Error(`Draft year ${year} not found`);
  }

  const newYearState: DraftYearState = {
    ...yearState,
    isFinalized: true,
  };

  const newDraftYears = new Map(state.draftYears);
  newDraftYears.set(year, newYearState);

  return {
    ...state,
    draftYears: newDraftYears,
  };
}

/**
 * Advances to the next year
 */
export function advanceYear(state: DraftOrderState): DraftOrderState {
  const newCurrentYear = state.currentYear + 1;
  const newDraftYears = new Map(state.draftYears);

  // Add new future year
  const furthestYear = newCurrentYear + MAX_FUTURE_TRADE_YEARS;
  if (!newDraftYears.has(furthestYear)) {
    newDraftYears.set(furthestYear, createDraftYearState(furthestYear, state.teamIds));
  }

  return {
    ...state,
    currentYear: newCurrentYear,
    draftYears: newDraftYears,
  };
}

/**
 * Gets total number of picks for a year
 */
export function getTotalPicksForYear(state: DraftOrderState, year: number): number {
  const yearState = state.draftYears.get(year);
  if (!yearState) return 0;
  return yearState.picks.length + yearState.compensatoryPicks.length;
}

/**
 * Validates draft order state
 */
export function validateDraftOrderState(state: DraftOrderState): boolean {
  if (typeof state.currentYear !== 'number') return false;
  if (state.currentYear < 2000 || state.currentYear > 2100) return false;

  if (!Array.isArray(state.teamIds)) return false;
  if (state.teamIds.length < 1) return false;

  if (!(state.draftYears instanceof Map)) return false;

  for (const [year, yearState] of state.draftYears) {
    if (typeof year !== 'number') return false;
    if (!validateDraftYearState(yearState)) return false;
  }

  return true;
}

/**
 * Validates a draft year state
 */
export function validateDraftYearState(yearState: DraftYearState): boolean {
  if (typeof yearState.year !== 'number') return false;
  if (yearState.year < 2000 || yearState.year > 2100) return false;

  if (!Array.isArray(yearState.picks)) return false;
  for (const pick of yearState.picks) {
    if (!validateDraftPick(pick)) return false;
  }

  if (!Array.isArray(yearState.compensatoryPicks)) return false;
  for (const compPick of yearState.compensatoryPicks) {
    if (!validateCompensatoryPick(compPick)) return false;
  }

  if (typeof yearState.isFinalized !== 'boolean') return false;

  return true;
}

/**
 * Creates a summary of team's draft capital
 */
export interface DraftCapitalSummary {
  teamId: string;
  year: number;
  totalPicks: number;
  picksByRound: Record<number, number>;
  hasFirstRounder: boolean;
  hasSecondRounder: boolean;
  tradedAwayCount: number;
  acquiredCount: number;
}

/**
 * Gets draft capital summary for a team
 */
export function getTeamDraftCapitalSummary(
  state: DraftOrderState,
  teamId: string,
  year: number
): DraftCapitalSummary {
  const picks = getTeamPicks(state, teamId, year);

  const picksByRound: Record<number, number> = {};
  for (let r = 1; r <= DRAFT_ROUNDS; r++) {
    picksByRound[r] = 0;
  }

  let tradedAwayCount = 0;
  let acquiredCount = 0;

  const yearState = state.draftYears.get(year);
  if (yearState) {
    // Count traded away (original team is this team, but current owner is different)
    tradedAwayCount = yearState.picks.filter(
      (p) => p.originalTeamId === teamId && p.currentTeamId !== teamId
    ).length;

    // Count acquired (original team is different, but current owner is this team)
    acquiredCount = yearState.picks.filter(
      (p) => p.originalTeamId !== teamId && p.currentTeamId === teamId
    ).length;
  }

  for (const pick of picks) {
    picksByRound[pick.round] = (picksByRound[pick.round] || 0) + 1;
  }

  return {
    teamId,
    year,
    totalPicks: picks.length,
    picksByRound,
    hasFirstRounder: picksByRound[1] > 0,
    hasSecondRounder: picksByRound[2] > 0,
    tradedAwayCount,
    acquiredCount,
  };
}

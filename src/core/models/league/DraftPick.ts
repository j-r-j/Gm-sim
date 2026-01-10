/**
 * Draft Pick Model
 * Tracks draft picks and their trade history
 */

/**
 * Trade record for a pick
 */
export interface PickTrade {
  fromTeamId: string;
  toTeamId: string;
  tradeId: string;
  week: number;
  year: number;
}

/**
 * Draft pick entity
 */
export interface DraftPick {
  id: string;
  year: number;
  round: number;
  originalTeamId: string; // Who originally owned it
  currentTeamId: string; // Who owns it now

  // After draft
  overallPick: number | null; // Assigned during draft
  selectedPlayerId: string | null;

  // Trade tracking
  tradeHistory: PickTrade[];
}

/**
 * Compensatory pick rounds (3-7 only)
 */
export type CompensatoryRound = 3 | 4 | 5 | 6 | 7;

/**
 * Compensatory pick tracking
 */
export interface CompensatoryPick extends DraftPick {
  compensatoryReason: string; // "Lost FA: Player Name"
  round: CompensatoryRound; // Comp picks only in rounds 3-7
}

/**
 * Number of rounds in the draft
 */
export const DRAFT_ROUNDS = 7;

/**
 * Picks per round (before compensatory)
 */
export const PICKS_PER_ROUND = 32;

/**
 * Validates a pick trade
 */
export function validatePickTrade(trade: PickTrade): boolean {
  if (!trade.fromTeamId || typeof trade.fromTeamId !== 'string') return false;
  if (!trade.toTeamId || typeof trade.toTeamId !== 'string') return false;
  if (!trade.tradeId || typeof trade.tradeId !== 'string') return false;
  if (typeof trade.week !== 'number' || trade.week < 0) return false;
  if (typeof trade.year !== 'number' || trade.year < 2000 || trade.year > 2100) return false;
  if (trade.fromTeamId === trade.toTeamId) return false;

  return true;
}

/**
 * Validates a draft pick
 */
export function validateDraftPick(pick: DraftPick): boolean {
  if (!pick.id || typeof pick.id !== 'string') return false;
  if (typeof pick.year !== 'number' || pick.year < 2000 || pick.year > 2100) return false;
  if (typeof pick.round !== 'number' || pick.round < 1 || pick.round > 7) return false;
  if (!pick.originalTeamId || typeof pick.originalTeamId !== 'string') return false;
  if (!pick.currentTeamId || typeof pick.currentTeamId !== 'string') return false;

  // Overall pick validation
  if (pick.overallPick !== null) {
    if (typeof pick.overallPick !== 'number' || pick.overallPick < 1 || pick.overallPick > 300) {
      return false;
    }
  }

  // Selected player validation
  if (pick.selectedPlayerId !== null && typeof pick.selectedPlayerId !== 'string') {
    return false;
  }

  // Trade history validation
  if (!Array.isArray(pick.tradeHistory)) return false;
  for (const trade of pick.tradeHistory) {
    if (!validatePickTrade(trade)) return false;
  }

  return true;
}

/**
 * Validates a compensatory pick
 */
export function validateCompensatoryPick(pick: CompensatoryPick): boolean {
  if (!validateDraftPick(pick)) return false;
  if (!pick.compensatoryReason || typeof pick.compensatoryReason !== 'string') return false;
  if (![3, 4, 5, 6, 7].includes(pick.round)) return false;

  return true;
}

/**
 * Creates a draft pick
 */
export function createDraftPick(
  id: string,
  year: number,
  round: number,
  teamId: string
): DraftPick {
  return {
    id,
    year,
    round,
    originalTeamId: teamId,
    currentTeamId: teamId,
    overallPick: null,
    selectedPlayerId: null,
    tradeHistory: [],
  };
}

/**
 * Creates a compensatory pick
 */
export function createCompensatoryPick(
  id: string,
  year: number,
  round: CompensatoryRound,
  teamId: string,
  reason: string
): CompensatoryPick {
  return {
    ...createDraftPick(id, year, round, teamId),
    compensatoryReason: reason,
    round,
  };
}

/**
 * Trades a pick to another team
 */
export function tradePick(
  pick: DraftPick,
  toTeamId: string,
  tradeId: string,
  week: number,
  year: number
): DraftPick {
  const trade: PickTrade = {
    fromTeamId: pick.currentTeamId,
    toTeamId,
    tradeId,
    week,
    year,
  };

  return {
    ...pick,
    currentTeamId: toTeamId,
    tradeHistory: [...pick.tradeHistory, trade],
  };
}

/**
 * Checks if a pick has been traded
 */
export function hasBeenTraded(pick: DraftPick): boolean {
  return pick.originalTeamId !== pick.currentTeamId;
}

/**
 * Gets the number of times a pick has been traded
 */
export function getTradeCount(pick: DraftPick): number {
  return pick.tradeHistory.length;
}

/**
 * Assigns the overall pick number after draft order is set
 */
export function assignOverallPick(pick: DraftPick, overallPick: number): DraftPick {
  return {
    ...pick,
    overallPick,
  };
}

/**
 * Records the player selected with this pick
 */
export function recordSelection(pick: DraftPick, playerId: string): DraftPick {
  return {
    ...pick,
    selectedPlayerId: playerId,
  };
}

/**
 * Checks if pick has been used
 */
export function isPicked(pick: DraftPick): boolean {
  return pick.selectedPlayerId !== null;
}

/**
 * Gets pick display string (e.g., "Round 1, Pick 15")
 */
export function getPickDisplayString(pick: DraftPick): string {
  if (pick.overallPick !== null) {
    return `Round ${pick.round}, Pick ${pick.overallPick}`;
  }
  return `${pick.year} Round ${pick.round}`;
}

/**
 * Gets pick short display (e.g., "1.15" or "2025 R1")
 */
export function getPickShortDisplay(pick: DraftPick): string {
  if (pick.overallPick !== null) {
    return `${pick.round}.${pick.overallPick}`;
  }
  return `${pick.year} R${pick.round}`;
}

/**
 * Calculates approximate pick value (higher for earlier picks)
 * Uses a simplified draft value chart
 */
export function calculatePickValue(round: number, overallPick: number | null): number {
  // Simplified value chart
  // First round picks are most valuable, declining exponentially
  const baseValues: Record<number, number> = {
    1: 1000,
    2: 500,
    3: 250,
    4: 120,
    5: 60,
    6: 30,
    7: 15,
  };

  const baseValue = baseValues[round] || 0;

  // Adjust within round if overall pick is known
  if (overallPick !== null) {
    const pickInRound = ((overallPick - 1) % 32) + 1;
    const modifier = 1 - (pickInRound - 1) * 0.02; // 2% decrease per pick in round
    return Math.round(baseValue * modifier);
  }

  return baseValue;
}

/**
 * Generates draft picks for all teams for a given year
 */
export function generateDraftPicksForYear(
  year: number,
  teamIds: string[],
  idPrefix: string
): DraftPick[] {
  const picks: DraftPick[] = [];

  for (let round = 1; round <= DRAFT_ROUNDS; round++) {
    for (const teamId of teamIds) {
      const id = `${idPrefix}-${year}-R${round}-${teamId}`;
      picks.push(createDraftPick(id, year, round, teamId));
    }
  }

  return picks;
}

/**
 * Gets all picks owned by a team for a given year
 */
export function getTeamPicksForYear(picks: DraftPick[], teamId: string, year: number): DraftPick[] {
  return picks.filter((pick) => pick.currentTeamId === teamId && pick.year === year);
}

/**
 * Gets all picks for a given round
 */
export function getPicksByRound(picks: DraftPick[], year: number, round: number): DraftPick[] {
  return picks.filter((pick) => pick.year === year && pick.round === round);
}

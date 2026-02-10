/**
 * Player History Tracker
 * Stores career history for every player in the league.
 * Tracked separately from the Player entity to avoid bloating the core model.
 *
 * Stored in GameState as `playerHistory: Record<string, PlayerCareerHistory>`
 *
 * Tracks:
 * - Season-by-season stats (approximate for history sim, detailed for live play)
 * - Transaction history (drafted, signed, traded, cut, retired)
 * - Injury history
 * - Awards and accolades
 */

import { Position } from '../models/player/Position';
import { InjuryType } from '../models/player/InjuryStatus';

// ============================================================================
// TRANSACTION HISTORY
// ============================================================================

export type TransactionType =
  | 'drafted'
  | 'signed'
  | 'traded'
  | 'cut'
  | 'retired'
  | 'free_agent_signed'
  | 'contract_expired'
  | 'udfa_signed';

export interface PlayerTransaction {
  year: number;
  type: TransactionType;
  teamId: string;
  /** For trades: the other team involved */
  otherTeamId?: string;
  /** Short description (e.g., "Drafted 1st round, 5th overall") */
  description: string;
}

// ============================================================================
// SEASON STATS LOG
// ============================================================================

/**
 * Simplified season stats for a player in a given year.
 * For history simulation, these are generated approximations based on
 * player skill and team performance. For live gameplay, they come from
 * actual game simulation.
 */
export interface PlayerSeasonLog {
  year: number;
  teamId: string;
  age: number;
  gamesPlayed: number;
  gamesStarted: number;

  // Passing (QB)
  passAttempts: number;
  passCompletions: number;
  passYards: number;
  passTDs: number;
  passINTs: number;
  passerRating: number;

  // Rushing (RB, QB)
  rushAttempts: number;
  rushYards: number;
  rushTDs: number;

  // Receiving (WR, TE, RB)
  receptions: number;
  receivingYards: number;
  receivingTDs: number;

  // Defense
  tackles: number;
  sacks: number;
  interceptions: number;
  forcedFumbles: number;

  // Kicking
  fieldGoalsMade: number;
  fieldGoalAttempts: number;

  // Team context
  teamWins: number;
  teamLosses: number;
  madePlayoffs: boolean;
  wonChampionship: boolean;
}

// ============================================================================
// INJURY HISTORY
// ============================================================================

export interface PlayerInjuryRecord {
  year: number;
  week: number;
  type: InjuryType;
  weeksMissed: number;
  teamId: string;
}

// ============================================================================
// AWARDS
// ============================================================================

export type AwardType =
  | 'mvp'
  | 'opoy' // Offensive Player of the Year
  | 'dpoy' // Defensive Player of the Year
  | 'oroy' // Offensive Rookie of the Year
  | 'droy' // Defensive Rookie of the Year
  | 'first_team_all_pro'
  | 'second_team_all_pro'
  | 'pro_bowl';

export interface PlayerAward {
  year: number;
  type: AwardType;
  teamId: string;
}

// ============================================================================
// CAREER HISTORY (main container)
// ============================================================================

export interface PlayerCareerHistory {
  playerId: string;
  playerName: string;
  position: Position;
  /** Year entered the league */
  rookieYear: number;
  /** Draft info */
  draftRound: number;
  draftPick: number;
  draftTeamId: string;
  collegeId: string;

  /** Season-by-season stats */
  seasonLogs: PlayerSeasonLog[];
  /** Transaction log */
  transactions: PlayerTransaction[];
  /** Injury history */
  injuries: PlayerInjuryRecord[];
  /** Awards and accolades */
  awards: PlayerAward[];

  /** Whether the player has retired */
  isRetired: boolean;
  retirementYear: number | null;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create an empty career history for a new player
 */
export function createPlayerCareerHistory(
  playerId: string,
  playerName: string,
  position: Position,
  rookieYear: number,
  draftRound: number,
  draftPick: number,
  draftTeamId: string,
  collegeId: string
): PlayerCareerHistory {
  return {
    playerId,
    playerName,
    position,
    rookieYear,
    draftRound,
    draftPick,
    draftTeamId,
    collegeId,
    seasonLogs: [],
    transactions: [],
    injuries: [],
    awards: [],
    isRetired: false,
    retirementYear: null,
  };
}

/**
 * Create an empty season log for a player
 */
export function createEmptySeasonLog(year: number, teamId: string, age: number): PlayerSeasonLog {
  return {
    year,
    teamId,
    age,
    gamesPlayed: 0,
    gamesStarted: 0,
    passAttempts: 0,
    passCompletions: 0,
    passYards: 0,
    passTDs: 0,
    passINTs: 0,
    passerRating: 0,
    rushAttempts: 0,
    rushYards: 0,
    rushTDs: 0,
    receptions: 0,
    receivingYards: 0,
    receivingTDs: 0,
    tackles: 0,
    sacks: 0,
    interceptions: 0,
    forcedFumbles: 0,
    fieldGoalsMade: 0,
    fieldGoalAttempts: 0,
    teamWins: 0,
    teamLosses: 0,
    madePlayoffs: false,
    wonChampionship: false,
  };
}

/**
 * Add a transaction to a player's career history
 */
export function addTransaction(
  history: PlayerCareerHistory,
  transaction: PlayerTransaction
): PlayerCareerHistory {
  return {
    ...history,
    transactions: [...history.transactions, transaction],
  };
}

/**
 * Add a season log to a player's career history
 */
export function addSeasonLog(
  history: PlayerCareerHistory,
  seasonLog: PlayerSeasonLog
): PlayerCareerHistory {
  return {
    ...history,
    seasonLogs: [...history.seasonLogs, seasonLog],
  };
}

/**
 * Add an injury record to a player's career history
 */
export function addInjuryRecord(
  history: PlayerCareerHistory,
  injury: PlayerInjuryRecord
): PlayerCareerHistory {
  return {
    ...history,
    injuries: [...history.injuries, injury],
  };
}

/**
 * Add an award to a player's career history
 */
export function addAward(history: PlayerCareerHistory, award: PlayerAward): PlayerCareerHistory {
  return {
    ...history,
    awards: [...history.awards, award],
  };
}

/**
 * Mark a player as retired
 */
export function markRetired(history: PlayerCareerHistory, year: number): PlayerCareerHistory {
  return {
    ...history,
    isRetired: true,
    retirementYear: year,
    transactions: [
      ...history.transactions,
      {
        year,
        type: 'retired' as TransactionType,
        teamId:
          history.seasonLogs.length > 0
            ? history.seasonLogs[history.seasonLogs.length - 1].teamId
            : history.draftTeamId,
        description: `Retired after ${history.seasonLogs.length} seasons`,
      },
    ],
  };
}

/**
 * Get career totals from season logs
 */
export function getCareerTotals(history: PlayerCareerHistory): {
  seasons: number;
  gamesPlayed: number;
  passYards: number;
  passTDs: number;
  rushYards: number;
  rushTDs: number;
  receptions: number;
  receivingYards: number;
  receivingTDs: number;
  sacks: number;
  interceptions: number;
  tackles: number;
  awards: number;
  proBowls: number;
  allPros: number;
} {
  const logs = history.seasonLogs;
  return {
    seasons: logs.length,
    gamesPlayed: logs.reduce((sum, s) => sum + s.gamesPlayed, 0),
    passYards: logs.reduce((sum, s) => sum + s.passYards, 0),
    passTDs: logs.reduce((sum, s) => sum + s.passTDs, 0),
    rushYards: logs.reduce((sum, s) => sum + s.rushYards, 0),
    rushTDs: logs.reduce((sum, s) => sum + s.rushTDs, 0),
    receptions: logs.reduce((sum, s) => sum + s.receptions, 0),
    receivingYards: logs.reduce((sum, s) => sum + s.receivingYards, 0),
    receivingTDs: logs.reduce((sum, s) => sum + s.receivingTDs, 0),
    sacks: logs.reduce((sum, s) => sum + s.sacks, 0),
    interceptions: logs.reduce((sum, s) => sum + s.interceptions, 0),
    tackles: logs.reduce((sum, s) => sum + s.tackles, 0),
    awards: history.awards.length,
    proBowls: history.awards.filter((a) => a.type === 'pro_bowl').length,
    allPros: history.awards.filter(
      (a) => a.type === 'first_team_all_pro' || a.type === 'second_team_all_pro'
    ).length,
  };
}

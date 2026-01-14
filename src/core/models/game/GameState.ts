/**
 * Game State Model
 * Master state for a save file containing all game entities
 */

import { League, validateLeague } from '../league/League';
import { Team, validateTeam } from '../team/Team';
import { Player, validatePlayer } from '../player/Player';
import { Coach, validateCoach } from '../staff/Coach';
import { Scout, validateScout } from '../staff/Scout';
import { Owner, validateOwner } from '../owner/Owner';
import { DraftPick, validateDraftPick } from '../league/DraftPick';
import { Prospect as DraftProspect, validateProspect } from '../../draft/Prospect';

/**
 * Save slot options (3 slots supported)
 */
export type SaveSlot = 0 | 1 | 2;

/**
 * All save slots
 */
export const ALL_SAVE_SLOTS: SaveSlot[] = [0, 1, 2];

/**
 * Simulation speed options
 */
export type SimulationSpeed = 'fast' | 'normal' | 'detailed';

/**
 * All simulation speeds
 */
export const ALL_SIMULATION_SPEEDS: SimulationSpeed[] = ['fast', 'normal', 'detailed'];

/**
 * Career team history entry
 */
export interface CareerTeamEntry {
  teamId: string;
  teamName: string;
  yearsStart: number;
  yearsEnd: number | null; // null if current
  record: { wins: number; losses: number };
  championships: number;
  firedOrQuit: 'fired' | 'quit' | 'current';
}

/**
 * Career statistics
 */
export interface CareerStats {
  seasonsCompleted: number;
  totalWins: number;
  totalLosses: number;
  playoffAppearances: number;
  championships: number;
  teamHistory: CareerTeamEntry[];
}

/**
 * Game settings
 */
export interface GameSettings {
  autoSaveEnabled: boolean;
  simulationSpeed: SimulationSpeed;
  notificationsEnabled: boolean;
}

/**
 * Re-export Prospect type from draft system
 */
export type Prospect = DraftProspect;

/**
 * The master state for a save file
 */
export interface GameState {
  saveSlot: SaveSlot;
  createdAt: string;
  lastSavedAt: string;

  // Your identity
  userTeamId: string;
  userName: string;

  // Core entities
  league: League;
  teams: Record<string, Team>;
  players: Record<string, Player>;
  coaches: Record<string, Coach>;
  scouts: Record<string, Scout>;
  owners: Record<string, Owner>;

  // Draft picks
  draftPicks: Record<string, DraftPick>;

  // Prospects (pre-draft players)
  prospects: Record<string, Prospect>;

  // Career stats
  careerStats: CareerStats;

  // Settings
  gameSettings: GameSettings;

  // News tracking (deprecated - use newsFeed instead)
  newsReadStatus: Record<string, boolean>;

  // News feed state (optional for backward compatibility)
  newsFeed?: import('../../news/NewsFeedManager').NewsFeedState;
}

/**
 * Default game settings
 */
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  autoSaveEnabled: true,
  simulationSpeed: 'normal',
  notificationsEnabled: true,
};

/**
 * Creates default career stats
 */
export function createDefaultCareerStats(): CareerStats {
  return {
    seasonsCompleted: 0,
    totalWins: 0,
    totalLosses: 0,
    playoffAppearances: 0,
    championships: 0,
    teamHistory: [],
  };
}

/**
 * Validates a career team entry
 */
export function validateCareerTeamEntry(entry: CareerTeamEntry): boolean {
  if (!entry.teamId || typeof entry.teamId !== 'string') return false;
  if (!entry.teamName || typeof entry.teamName !== 'string') return false;
  if (typeof entry.yearsStart !== 'number' || entry.yearsStart < 2000) return false;
  if (entry.yearsEnd !== null && typeof entry.yearsEnd !== 'number') return false;
  if (entry.yearsEnd !== null && entry.yearsEnd < entry.yearsStart) return false;
  if (typeof entry.record.wins !== 'number' || entry.record.wins < 0) return false;
  if (typeof entry.record.losses !== 'number' || entry.record.losses < 0) return false;
  if (typeof entry.championships !== 'number' || entry.championships < 0) return false;
  if (!['fired', 'quit', 'current'].includes(entry.firedOrQuit)) return false;

  return true;
}

/**
 * Validates career stats
 */
export function validateCareerStats(stats: CareerStats): boolean {
  if (typeof stats.seasonsCompleted !== 'number' || stats.seasonsCompleted < 0) return false;
  if (typeof stats.totalWins !== 'number' || stats.totalWins < 0) return false;
  if (typeof stats.totalLosses !== 'number' || stats.totalLosses < 0) return false;
  if (typeof stats.playoffAppearances !== 'number' || stats.playoffAppearances < 0) return false;
  if (typeof stats.championships !== 'number' || stats.championships < 0) return false;
  if (!Array.isArray(stats.teamHistory)) return false;

  for (const entry of stats.teamHistory) {
    if (!validateCareerTeamEntry(entry)) return false;
  }

  return true;
}

/**
 * Validates game settings
 */
export function validateGameSettings(settings: GameSettings): boolean {
  if (typeof settings.autoSaveEnabled !== 'boolean') return false;
  if (!ALL_SIMULATION_SPEEDS.includes(settings.simulationSpeed)) return false;
  if (typeof settings.notificationsEnabled !== 'boolean') return false;

  return true;
}

/**
 * Validates that a save slot is valid
 */
export function validateSaveSlot(slot: number): slot is SaveSlot {
  return ALL_SAVE_SLOTS.includes(slot as SaveSlot);
}

/**
 * Validates a complete GameState
 */
export function validateGameState(state: GameState): boolean {
  // Save slot validation
  if (!validateSaveSlot(state.saveSlot)) return false;

  // Timestamps
  if (!state.createdAt || typeof state.createdAt !== 'string') return false;
  if (!state.lastSavedAt || typeof state.lastSavedAt !== 'string') return false;

  // User identity
  if (!state.userTeamId || typeof state.userTeamId !== 'string') return false;
  if (!state.userName || typeof state.userName !== 'string') return false;

  // League validation
  if (!validateLeague(state.league)) return false;

  // Teams validation
  if (typeof state.teams !== 'object' || state.teams === null) return false;
  for (const team of Object.values(state.teams)) {
    if (!validateTeam(team)) return false;
  }

  // Must have 32 teams
  if (Object.keys(state.teams).length !== 32) return false;

  // Players validation
  if (typeof state.players !== 'object' || state.players === null) return false;
  for (const player of Object.values(state.players)) {
    if (!validatePlayer(player)) return false;
  }

  // Coaches validation
  if (typeof state.coaches !== 'object' || state.coaches === null) return false;
  for (const coach of Object.values(state.coaches)) {
    if (!validateCoach(coach)) return false;
  }

  // Scouts validation
  if (typeof state.scouts !== 'object' || state.scouts === null) return false;
  for (const scout of Object.values(state.scouts)) {
    if (!validateScout(scout)) return false;
  }

  // Owners validation
  if (typeof state.owners !== 'object' || state.owners === null) return false;
  for (const owner of Object.values(state.owners)) {
    if (!validateOwner(owner)) return false;
  }

  // Draft picks validation
  if (typeof state.draftPicks !== 'object' || state.draftPicks === null) return false;
  for (const pick of Object.values(state.draftPicks)) {
    if (!validateDraftPick(pick)) return false;
  }

  // Prospects validation
  if (typeof state.prospects !== 'object' || state.prospects === null) return false;
  for (const prospect of Object.values(state.prospects)) {
    if (!validateProspect(prospect)) return false;
  }

  // Career stats validation
  if (!validateCareerStats(state.careerStats)) return false;

  // Game settings validation
  if (!validateGameSettings(state.gameSettings)) return false;

  // Validate user team exists
  if (!state.teams[state.userTeamId]) return false;

  return true;
}

/**
 * Creates a new game state skeleton
 * Full initialization requires creating all entities (teams, players, etc.)
 */
export function createGameStateSkeleton(
  saveSlot: SaveSlot,
  userName: string,
  userTeamId: string
): Partial<GameState> {
  const now = new Date().toISOString();

  return {
    saveSlot,
    createdAt: now,
    lastSavedAt: now,
    userTeamId,
    userName,
    teams: {},
    players: {},
    coaches: {},
    scouts: {},
    owners: {},
    draftPicks: {},
    prospects: {},
    careerStats: createDefaultCareerStats(),
    gameSettings: { ...DEFAULT_GAME_SETTINGS },
  };
}

/**
 * Updates the last saved timestamp
 */
export function updateLastSaved(state: GameState): GameState {
  return {
    ...state,
    lastSavedAt: new Date().toISOString(),
  };
}

/**
 * Adds a career team entry when taking a new job
 */
export function addCareerTeamEntry(
  stats: CareerStats,
  teamId: string,
  teamName: string,
  year: number
): CareerStats {
  const newEntry: CareerTeamEntry = {
    teamId,
    teamName,
    yearsStart: year,
    yearsEnd: null,
    record: { wins: 0, losses: 0 },
    championships: 0,
    firedOrQuit: 'current',
  };

  // Close out previous current entry if exists
  const updatedHistory = stats.teamHistory.map((entry) => {
    if (entry.firedOrQuit === 'current') {
      return {
        ...entry,
        yearsEnd: year - 1,
        firedOrQuit: 'quit' as const,
      };
    }
    return entry;
  });

  return {
    ...stats,
    teamHistory: [...updatedHistory, newEntry],
  };
}

/**
 * Ends a career team entry when fired or quitting
 */
export function endCareerTeamEntry(
  stats: CareerStats,
  year: number,
  reason: 'fired' | 'quit'
): CareerStats {
  const updatedHistory = stats.teamHistory.map((entry) => {
    if (entry.firedOrQuit === 'current') {
      return {
        ...entry,
        yearsEnd: year,
        firedOrQuit: reason,
      };
    }
    return entry;
  });

  return {
    ...stats,
    teamHistory: updatedHistory,
  };
}

/**
 * Updates career stats after completing a season
 */
export function updateCareerStatsAfterSeason(
  stats: CareerStats,
  wins: number,
  losses: number,
  madePlayoffs: boolean,
  wonChampionship: boolean
): CareerStats {
  // Update current team entry record
  const updatedHistory = stats.teamHistory.map((entry) => {
    if (entry.firedOrQuit === 'current') {
      return {
        ...entry,
        record: {
          wins: entry.record.wins + wins,
          losses: entry.record.losses + losses,
        },
        championships: entry.championships + (wonChampionship ? 1 : 0),
      };
    }
    return entry;
  });

  return {
    seasonsCompleted: stats.seasonsCompleted + 1,
    totalWins: stats.totalWins + wins,
    totalLosses: stats.totalLosses + losses,
    playoffAppearances: stats.playoffAppearances + (madePlayoffs ? 1 : 0),
    championships: stats.championships + (wonChampionship ? 1 : 0),
    teamHistory: updatedHistory,
  };
}

/**
 * Gets the current team from career stats
 */
export function getCurrentTeamEntry(stats: CareerStats): CareerTeamEntry | null {
  return stats.teamHistory.find((entry) => entry.firedOrQuit === 'current') || null;
}

/**
 * Gets career winning percentage for GM career stats
 */
export function getCareerStatsWinningPercentage(stats: CareerStats): number {
  const totalGames = stats.totalWins + stats.totalLosses;
  if (totalGames === 0) return 0;
  return stats.totalWins / totalGames;
}

/**
 * Serializes game state to JSON string
 */
export function serializeGameState(state: GameState): string {
  return JSON.stringify(state);
}

/**
 * Deserializes JSON string to game state
 */
export function deserializeGameState(json: string): GameState {
  return JSON.parse(json) as GameState;
}

/**
 * Gets a summary of the game state for display
 */
export function getGameStateSummary(state: GameState): {
  userName: string;
  teamName: string;
  year: number;
  week: number;
  phase: string;
  record: string;
  seasonsPlayed: number;
  championships: number;
} {
  const team = state.teams[state.userTeamId];
  const { calendar } = state.league;

  return {
    userName: state.userName,
    teamName: team ? `${team.city} ${team.nickname}` : 'Unknown',
    year: calendar.currentYear,
    week: calendar.currentWeek,
    phase: calendar.currentPhase,
    record: team ? `${team.currentRecord.wins}-${team.currentRecord.losses}` : '0-0',
    seasonsPlayed: state.careerStats.seasonsCompleted,
    championships: state.careerStats.championships,
  };
}

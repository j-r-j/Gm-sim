/**
 * Team Entity Model
 * Complete team entity with roster, finances, and facilities
 */

import { Stadium, createDefaultStadium, validateStadium } from './Stadium';
import { TeamFinances, createDefaultTeamFinances, validateTeamFinances } from './TeamFinances';
import { Conference, Division, FakeCity, MarketSize } from './FakeCities';
import {
  StaffHierarchy,
  createEmptyStaffHierarchy,
  validateStaffHierarchy,
} from '../staff/StaffHierarchy';

/**
 * Team record for a season
 */
export interface TeamRecord {
  wins: number;
  losses: number;
  ties: number;
  divisionWins: number;
  divisionLosses: number;
  conferenceWins: number;
  conferenceLosses: number;
  pointsFor: number;
  pointsAgainst: number;
  streak: number; // Positive = wins, negative = losses
}

/**
 * All-time record
 */
export interface AllTimeRecord {
  wins: number;
  losses: number;
  ties: number;
}

/**
 * Maximum roster sizes
 */
export const MAX_ACTIVE_ROSTER_SIZE = 53;
export const MAX_PRACTICE_SQUAD_SIZE = 16;
export const MAX_IR_SIZE = 20;

/**
 * Complete team entity
 */
export interface Team {
  id: string;
  city: string; // Fake city name
  nickname: string; // Team name
  abbreviation: string; // 3 letters

  // League position
  conference: Conference;
  division: Division;

  // Facilities
  stadium: Stadium;

  // Finances
  finances: TeamFinances;

  // Staff
  staffHierarchy: StaffHierarchy;
  ownerId: string;
  gmId: string | null; // You, if this is your team

  // Roster references
  rosterPlayerIds: string[];
  practiceSquadIds: string[];
  injuredReserveIds: string[];

  // Current season
  currentRecord: TeamRecord;
  playoffSeed: number | null;
  isEliminated: boolean;

  // History
  allTimeRecord: AllTimeRecord;
  championships: number;
  lastChampionshipYear: number | null;

  // Prestige/market
  marketSize: MarketSize;
  prestige: number; // 1-100, affects FA interest
  fanbasePassion: number; // 1-100, affects home field
}

/**
 * Creates an empty team record
 */
export function createEmptyTeamRecord(): TeamRecord {
  return {
    wins: 0,
    losses: 0,
    ties: 0,
    divisionWins: 0,
    divisionLosses: 0,
    conferenceWins: 0,
    conferenceLosses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    streak: 0,
  };
}

/**
 * Validates a team record
 */
export function validateTeamRecord(record: TeamRecord): boolean {
  if (record.wins < 0 || record.wins > 20) return false;
  if (record.losses < 0 || record.losses > 20) return false;
  if (record.ties < 0 || record.ties > 10) return false;
  if (record.divisionWins < 0 || record.divisionWins > 6) return false;
  if (record.divisionLosses < 0 || record.divisionLosses > 6) return false;
  if (record.conferenceWins < 0 || record.conferenceWins > 17) return false;
  if (record.conferenceLosses < 0 || record.conferenceLosses > 17) return false;
  if (record.pointsFor < 0) return false;
  if (record.pointsAgainst < 0) return false;
  if (Math.abs(record.streak) > 17) return false;

  return true;
}

/**
 * Validates a complete team entity
 */
export function validateTeam(team: Team): boolean {
  // Basic field validation
  if (!team.id || typeof team.id !== 'string') return false;
  if (!team.city || typeof team.city !== 'string') return false;
  if (!team.nickname || typeof team.nickname !== 'string') return false;
  if (!team.abbreviation || team.abbreviation.length !== 3) return false;

  // League position
  if (team.conference !== 'AFC' && team.conference !== 'NFC') return false;
  if (!['North', 'South', 'East', 'West'].includes(team.division)) return false;

  // Sub-entity validation
  if (!validateStadium(team.stadium)) return false;
  if (!validateTeamFinances(team.finances)) return false;
  if (!validateStaffHierarchy(team.staffHierarchy)) return false;

  // Owner/GM
  if (!team.ownerId || typeof team.ownerId !== 'string') return false;
  if (team.gmId !== null && typeof team.gmId !== 'string') return false;

  // Roster validation
  if (!Array.isArray(team.rosterPlayerIds)) return false;
  if (!Array.isArray(team.practiceSquadIds)) return false;
  if (!Array.isArray(team.injuredReserveIds)) return false;
  if (team.rosterPlayerIds.length > MAX_ACTIVE_ROSTER_SIZE) return false;
  if (team.practiceSquadIds.length > MAX_PRACTICE_SQUAD_SIZE) return false;
  if (team.injuredReserveIds.length > MAX_IR_SIZE) return false;

  // Season validation
  if (!validateTeamRecord(team.currentRecord)) return false;
  if (team.playoffSeed !== null && (team.playoffSeed < 1 || team.playoffSeed > 7)) return false;
  if (typeof team.isEliminated !== 'boolean') return false;

  // History validation
  if (team.allTimeRecord.wins < 0) return false;
  if (team.allTimeRecord.losses < 0) return false;
  if (team.allTimeRecord.ties < 0) return false;
  if (team.championships < 0) return false;
  if (team.lastChampionshipYear !== null && team.lastChampionshipYear < 1920) return false;

  // Market validation
  if (!['small', 'medium', 'large'].includes(team.marketSize)) return false;
  if (team.prestige < 1 || team.prestige > 100) return false;
  if (team.fanbasePassion < 1 || team.fanbasePassion > 100) return false;

  return true;
}

/**
 * Creates a team from a FakeCity configuration
 */
export function createTeamFromCity(
  id: string,
  city: FakeCity,
  ownerId: string,
  salaryCap: number
): Team {
  const stadiumId = `stadium-${id}`;

  return {
    id,
    city: city.city,
    nickname: city.nickname,
    abbreviation: city.abbreviation,
    conference: city.conference,
    division: city.division,

    stadium: {
      ...createDefaultStadium(stadiumId, id, city.city),
      type: city.stadiumType,
      latitude: city.latitude,
    },

    finances: createDefaultTeamFinances(id, salaryCap),

    staffHierarchy: createEmptyStaffHierarchy(id, 30000),
    ownerId,
    gmId: null,

    rosterPlayerIds: [],
    practiceSquadIds: [],
    injuredReserveIds: [],

    currentRecord: createEmptyTeamRecord(),
    playoffSeed: null,
    isEliminated: false,

    allTimeRecord: { wins: 0, losses: 0, ties: 0 },
    championships: 0,
    lastChampionshipYear: null,

    marketSize: city.marketSize,
    prestige: 50,
    fanbasePassion: 50,
  };
}

/**
 * Gets the full team name
 */
export function getTeamFullName(team: Team): string {
  return `${team.city} ${team.nickname}`;
}

/**
 * Gets the team's winning percentage for current season
 */
export function getWinningPercentage(team: Team): number {
  const { wins, losses, ties } = team.currentRecord;
  const totalGames = wins + losses + ties;
  if (totalGames === 0) return 0;
  return (wins + ties * 0.5) / totalGames;
}

/**
 * Gets the team's point differential
 */
export function getPointDifferential(team: Team): number {
  return team.currentRecord.pointsFor - team.currentRecord.pointsAgainst;
}

/**
 * Updates the team's streak after a game
 */
export function updateStreak(record: TeamRecord, won: boolean): TeamRecord {
  let newStreak: number;
  if (won) {
    newStreak = record.streak > 0 ? record.streak + 1 : 1;
  } else {
    newStreak = record.streak < 0 ? record.streak - 1 : -1;
  }

  return {
    ...record,
    streak: newStreak,
  };
}

/**
 * Adds a player to the roster
 */
export function addPlayerToRoster(team: Team, playerId: string): Team {
  if (team.rosterPlayerIds.length >= MAX_ACTIVE_ROSTER_SIZE) {
    throw new Error('Roster is full');
  }
  if (team.rosterPlayerIds.includes(playerId)) {
    throw new Error('Player already on roster');
  }

  return {
    ...team,
    rosterPlayerIds: [...team.rosterPlayerIds, playerId],
  };
}

/**
 * Removes a player from the roster
 */
export function removePlayerFromRoster(team: Team, playerId: string): Team {
  return {
    ...team,
    rosterPlayerIds: team.rosterPlayerIds.filter((id) => id !== playerId),
  };
}

/**
 * Moves a player to injured reserve
 */
export function moveToInjuredReserve(team: Team, playerId: string): Team {
  if (!team.rosterPlayerIds.includes(playerId)) {
    throw new Error('Player not on roster');
  }
  if (team.injuredReserveIds.length >= MAX_IR_SIZE) {
    throw new Error('IR is full');
  }

  return {
    ...team,
    rosterPlayerIds: team.rosterPlayerIds.filter((id) => id !== playerId),
    injuredReserveIds: [...team.injuredReserveIds, playerId],
  };
}

/**
 * Returns a player from injured reserve
 */
export function returnFromInjuredReserve(team: Team, playerId: string): Team {
  if (!team.injuredReserveIds.includes(playerId)) {
    throw new Error('Player not on IR');
  }
  if (team.rosterPlayerIds.length >= MAX_ACTIVE_ROSTER_SIZE) {
    throw new Error('Roster is full');
  }

  return {
    ...team,
    injuredReserveIds: team.injuredReserveIds.filter((id) => id !== playerId),
    rosterPlayerIds: [...team.rosterPlayerIds, playerId],
  };
}

/**
 * Gets total roster count including practice squad
 */
export function getTotalRosterCount(team: Team): number {
  return team.rosterPlayerIds.length + team.practiceSquadIds.length;
}

/**
 * Checks if team has space on active roster
 */
export function hasRosterSpace(team: Team): boolean {
  return team.rosterPlayerIds.length < MAX_ACTIVE_ROSTER_SIZE;
}

/**
 * Checks if team has space on practice squad
 */
export function hasPracticeSquadSpace(team: Team): boolean {
  return team.practiceSquadIds.length < MAX_PRACTICE_SQUAD_SIZE;
}

/**
 * Gets record display string (e.g., "10-5-1")
 */
export function getRecordString(record: TeamRecord): string {
  if (record.ties > 0) {
    return `${record.wins}-${record.losses}-${record.ties}`;
  }
  return `${record.wins}-${record.losses}`;
}

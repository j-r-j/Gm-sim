/**
 * Team Game State
 * Represents the state of a team during a game, including active players,
 * coaches, schemes, and in-game state like fatigue and timeouts.
 */

import { Player } from '../models/player/Player';
import { Coach } from '../models/staff/Coach';
import { OffensiveScheme, DefensiveScheme } from '../models/player/SchemeFit';
import { OffensiveTendencies, DefensiveTendencies } from '../models/staff/CoordinatorTendencies';

/**
 * Offensive personnel grouping
 */
export interface OffensivePersonnel {
  qb: Player;
  rb: Player[];
  wr: Player[];
  te: Player[];
  ol: Player[]; // LT, LG, C, RG, RT (5 players)
}

/**
 * Defensive personnel grouping
 */
export interface DefensivePersonnel {
  dl: Player[];
  lb: Player[];
  db: Player[];
}

/**
 * Special teams personnel
 */
export interface SpecialTeamsPersonnel {
  k: Player;
  p: Player;
  returner: Player;
}

/**
 * Coaching staff for game
 */
export interface GameCoachingStaff {
  headCoach?: Coach; // Optional - may have game management tendencies
  offensiveCoordinator: Coach;
  defensiveCoordinator: Coach;
  positionCoaches: Map<string, Coach>;
}

/**
 * Team game state - complete state for a team during a game
 */
export interface TeamGameState {
  teamId: string;
  teamName: string;

  // Active players by position
  offense: OffensivePersonnel;
  defense: DefensivePersonnel;
  specialTeams: SpecialTeamsPersonnel;

  // All players on roster (for substitutions)
  allPlayers: Map<string, Player>;

  // Coaches
  coaches: GameCoachingStaff;

  // Schemes
  offensiveScheme: OffensiveScheme;
  defensiveScheme: DefensiveScheme;

  // Tendencies
  offensiveTendencies: OffensiveTendencies;
  defensiveTendencies: DefensiveTendencies;

  // In-game state
  timeoutsRemaining: number;
  fatigueLevels: Map<string, number>; // playerId -> fatigue 0-100
  snapCounts: Map<string, number>; // playerId -> snap count

  // Pre-calculated weekly variances
  weeklyVariances: Map<string, number>;
}

/**
 * Create empty offensive personnel
 */
export function createEmptyOffensivePersonnel(): OffensivePersonnel {
  return {
    qb: {} as Player,
    rb: [],
    wr: [],
    te: [],
    ol: [],
  };
}

/**
 * Create empty defensive personnel
 */
export function createEmptyDefensivePersonnel(): DefensivePersonnel {
  return {
    dl: [],
    lb: [],
    db: [],
  };
}

/**
 * Create empty special teams personnel
 */
export function createEmptySpecialTeamsPersonnel(): SpecialTeamsPersonnel {
  return {
    k: {} as Player,
    p: {} as Player,
    returner: {} as Player,
  };
}

/**
 * Get all active offensive players as an array
 */
export function getActiveOffensivePlayers(personnel: OffensivePersonnel): Player[] {
  return [personnel.qb, ...personnel.rb, ...personnel.wr, ...personnel.te, ...personnel.ol];
}

/**
 * Get all active defensive players as an array
 */
export function getActiveDefensivePlayers(personnel: DefensivePersonnel): Player[] {
  return [...personnel.dl, ...personnel.lb, ...personnel.db];
}

/**
 * Get player by position from personnel
 */
export function getPlayerByPosition(state: TeamGameState, position: string): Player | null {
  // Check offense
  if (position === 'QB') return state.offense.qb;
  if (position === 'RB' || position.startsWith('RB')) {
    const index = parseInt(position.slice(2)) - 1 || 0;
    return state.offense.rb[index] || null;
  }
  if (position.startsWith('WR')) {
    const index = parseInt(position.slice(2)) - 1 || 0;
    return state.offense.wr[index] || null;
  }
  if (position === 'TE' || position.startsWith('TE')) {
    const index = parseInt(position.slice(2)) - 1 || 0;
    return state.offense.te[index] || null;
  }

  // Check OL positions
  const olPositions = ['LT', 'LG', 'C', 'RG', 'RT'];
  const olIndex = olPositions.indexOf(position);
  if (olIndex >= 0) {
    return state.offense.ol[olIndex] || null;
  }

  // Check defense
  if (position.startsWith('DL')) {
    const index = parseInt(position.slice(2)) - 1 || 0;
    return state.defense.dl[index] || null;
  }
  if (position.startsWith('LB')) {
    const index = parseInt(position.slice(2)) - 1 || 0;
    return state.defense.lb[index] || null;
  }
  if (position.startsWith('DB') || position === 'CB' || position === 'S') {
    const index = parseInt(position.slice(2)) - 1 || 0;
    return state.defense.db[index] || null;
  }

  // Check special teams
  if (position === 'K') return state.specialTeams.k;
  if (position === 'P') return state.specialTeams.p;
  if (position === 'KR' || position === 'PR') return state.specialTeams.returner;

  return null;
}

/**
 * Get weekly variance for a player
 */
export function getPlayerWeeklyVariance(state: TeamGameState, playerId: string): number {
  return state.weeklyVariances.get(playerId) ?? 0;
}

/**
 * Get player's current fatigue level
 */
export function getPlayerFatigue(state: TeamGameState, playerId: string): number {
  return state.fatigueLevels.get(playerId) ?? 0;
}

/**
 * Update player fatigue level
 */
export function updatePlayerFatigue(state: TeamGameState, playerId: string, fatigue: number): void {
  state.fatigueLevels.set(playerId, Math.max(0, Math.min(100, fatigue)));
}

/**
 * Increment snap count for a player
 */
export function incrementSnapCount(state: TeamGameState, playerId: string): void {
  const current = state.snapCounts.get(playerId) ?? 0;
  state.snapCounts.set(playerId, current + 1);
}

/**
 * Get snap count for a player
 */
export function getSnapCount(state: TeamGameState, playerId: string): number {
  return state.snapCounts.get(playerId) ?? 0;
}

/**
 * Use a timeout
 * Returns true if timeout was used, false if none remaining
 */
export function useTimeout(state: TeamGameState): boolean {
  if (state.timeoutsRemaining <= 0) return false;
  state.timeoutsRemaining--;
  return true;
}

/**
 * Reset timeouts (for halftime)
 */
export function resetTimeouts(state: TeamGameState): void {
  state.timeoutsRemaining = 3;
}

/**
 * Get the position coach for a specific position
 */
export function getPositionCoach(state: TeamGameState, position: string): Coach | null {
  // Map position to coach role
  const positionToCoach: Record<string, string> = {
    QB: 'qbCoach',
    RB: 'rbCoach',
    WR: 'wrCoach',
    TE: 'teCoach',
    LT: 'olCoach',
    LG: 'olCoach',
    C: 'olCoach',
    RG: 'olCoach',
    RT: 'olCoach',
    DE: 'dlCoach',
    DT: 'dlCoach',
    OLB: 'lbCoach',
    ILB: 'lbCoach',
    CB: 'dbCoach',
    FS: 'dbCoach',
    SS: 'dbCoach',
    K: 'stCoach',
    P: 'stCoach',
  };

  const coachRole = positionToCoach[position];
  if (!coachRole) return null;

  return state.coaches.positionCoaches.get(coachRole) ?? null;
}

/**
 * Validate team game state has minimum required players
 */
export function validateTeamGameState(state: TeamGameState): boolean {
  // Check offense
  if (!state.offense.qb || !state.offense.qb.id) return false;
  if (state.offense.rb.length < 1) return false;
  if (state.offense.wr.length < 2) return false;
  if (state.offense.te.length < 1) return false;
  if (state.offense.ol.length < 5) return false;

  // Check defense (minimum 11 players)
  const defenseCount = state.defense.dl.length + state.defense.lb.length + state.defense.db.length;
  if (defenseCount < 11) return false;

  // Check special teams
  if (!state.specialTeams.k || !state.specialTeams.k.id) return false;
  if (!state.specialTeams.p || !state.specialTeams.p.id) return false;

  return true;
}

/**
 * Get all players involved in a play by type
 */
export function getPlayersForPlayType(
  state: TeamGameState,
  isOffense: boolean,
  playType: string
): Player[] {
  if (isOffense) {
    if (playType.startsWith('run') || playType === 'qb_sneak') {
      return [state.offense.qb, state.offense.rb[0], ...state.offense.ol];
    }
    if (playType.includes('pass') || playType.includes('action')) {
      return [
        state.offense.qb,
        ...state.offense.wr,
        state.offense.te[0],
        ...state.offense.ol,
      ].filter(Boolean);
    }
    if (playType === 'field_goal') {
      return [state.specialTeams.k];
    }
    if (playType === 'punt') {
      return [state.specialTeams.p];
    }
    // Default - all offensive players
    return getActiveOffensivePlayers(state.offense);
  }

  // Defense - return all active defensive players
  return getActiveDefensivePlayers(state.defense);
}

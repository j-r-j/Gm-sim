/**
 * Waiver Wire Manager
 *
 * Manages the weekly waiver wire system where the user can:
 * - Claim players cut by other teams
 * - Promote practice squad players for game day
 * - Make IR designations with return windows
 * - Juggle the 53-man roster
 */

import { GameState } from '../models/game/GameState';
import { Player } from '../models/player/Player';
import { SkillValue } from '../models/player/TechnicalSkills';

/**
 * A player available on the waiver wire
 */
export interface WaiverPlayer {
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  experience: number;
  overallRating: number;
  /** Team that released them (null if was a free agent) */
  formerTeamId: string | null;
  formerTeamName: string | null;
  /** Why they were released */
  releaseReason: string;
  /** Waiver priority (lower = higher priority claim) */
  waiverOrder: number;
  /** Week they became available */
  availableWeek: number;
}

/**
 * A pending waiver claim
 */
export interface WaiverClaim {
  playerId: string;
  playerName: string;
  position: string;
  /** Player to cut to make room (required if roster is full) */
  dropPlayerId: string | null;
  dropPlayerName: string | null;
  /** Whether this claim was successful */
  status: 'pending' | 'awarded' | 'outbid' | 'cancelled';
}

/**
 * Practice squad elevation for game day
 */
export interface PracticeSquadElevation {
  playerId: string;
  playerName: string;
  position: string;
  /** Number of times elevated this season (max 3 before requiring signing) */
  elevationCount: number;
}

/**
 * Complete waiver wire state
 */
export interface WaiverWireState {
  /** Players available on waivers */
  availablePlayers: WaiverPlayer[];
  /** User's pending claims */
  pendingClaims: WaiverClaim[];
  /** Practice squad elevations this week */
  elevations: PracticeSquadElevation[];
  /** Season elevation counts per player */
  seasonElevationCounts: Record<string, number>;
  /** User's waiver priority (1-32, 1 = highest) */
  userWaiverPriority: number;
  /** Last processed week */
  lastProcessedWeek: number;
}

/**
 * Create initial waiver wire state
 */
export function createWaiverWireState(): WaiverWireState {
  return {
    availablePlayers: [],
    pendingClaims: [],
    elevations: [],
    seasonElevationCounts: {},
    userWaiverPriority: 16,
    lastProcessedWeek: 0,
  };
}

/**
 * Generate waiver wire players for a given week
 * AI teams "cut" players each week, making them available
 */
export function generateWaiverPlayers(gameState: GameState, week: number): WaiverPlayer[] {
  const waiverPlayers: WaiverPlayer[] = [];
  const aiTeams = Object.values(gameState.teams).filter((t) => t.id !== gameState.userTeamId);

  // Each AI team has a small chance of cutting a player each week
  for (const team of aiTeams) {
    // 15% chance per team per week
    if (Math.random() > 0.15) continue;

    // Find their worst players
    const teamPlayers = team.rosterPlayerIds
      .map((id) => gameState.players[id])
      .filter((p): p is Player => p != null)
      .sort((a, b) => estimateRating(a) - estimateRating(b));

    if (teamPlayers.length <= 45) continue; // Don't cut if roster is thin

    // Cut one of their bottom 10 players
    const cutIndex = Math.floor(Math.random() * Math.min(10, teamPlayers.length));
    const cutPlayer = teamPlayers[cutIndex];

    if (cutPlayer) {
      const reasons = [
        'Failed to make final roster',
        'Released for cap space',
        'Performance-based release',
        'Released after trade acquisition',
        'Cut to make room for new signing',
      ];

      waiverPlayers.push({
        playerId: cutPlayer.id,
        playerName: `${cutPlayer.firstName} ${cutPlayer.lastName}`,
        position: cutPlayer.position,
        age: cutPlayer.age,
        experience: cutPlayer.experience,
        overallRating: estimateRating(cutPlayer),
        formerTeamId: team.id,
        formerTeamName: `${team.city} ${team.nickname}`,
        releaseReason: reasons[Math.floor(Math.random() * reasons.length)],
        waiverOrder: 0,
        availableWeek: week,
      });
    }
  }

  return waiverPlayers;
}

/**
 * Submit a waiver claim
 */
export function submitWaiverClaim(
  state: WaiverWireState,
  playerId: string,
  playerName: string,
  position: string,
  dropPlayerId: string | null,
  dropPlayerName: string | null
): WaiverWireState {
  // Check if already claiming this player
  if (state.pendingClaims.some((c) => c.playerId === playerId)) {
    return state;
  }

  const claim: WaiverClaim = {
    playerId,
    playerName,
    position,
    dropPlayerId,
    dropPlayerName,
    status: 'pending',
  };

  return {
    ...state,
    pendingClaims: [...state.pendingClaims, claim],
  };
}

/**
 * Cancel a waiver claim
 */
export function cancelWaiverClaim(state: WaiverWireState, playerId: string): WaiverWireState {
  return {
    ...state,
    pendingClaims: state.pendingClaims.filter((c) => c.playerId !== playerId),
  };
}

/**
 * Process waiver claims (called on week advance)
 * User claims succeed based on waiver priority (lower = better)
 */
export function processWaiverClaims(
  gameState: GameState,
  waiverState: WaiverWireState
): { updatedGameState: GameState; updatedWaiverState: WaiverWireState; results: WaiverClaim[] } {
  const results: WaiverClaim[] = [];
  let updatedTeams = { ...gameState.teams };
  const userTeam = updatedTeams[gameState.userTeamId];

  if (!userTeam) {
    return {
      updatedGameState: gameState,
      updatedWaiverState: waiverState,
      results,
    };
  }

  let userRoster = [...userTeam.rosterPlayerIds];

  for (const claim of waiverState.pendingClaims) {
    // 70% chance of winning the claim (based on priority)
    const chanceToWin = waiverState.userWaiverPriority <= 16 ? 0.75 : 0.55;
    const won = Math.random() < chanceToWin;

    if (won) {
      // Drop player if specified
      if (claim.dropPlayerId) {
        userRoster = userRoster.filter((id) => id !== claim.dropPlayerId);
      }

      // Add claimed player
      userRoster.push(claim.playerId);

      // Remove from former team's roster
      const waiverPlayer = waiverState.availablePlayers.find((p) => p.playerId === claim.playerId);
      if (waiverPlayer?.formerTeamId) {
        const formerTeam = updatedTeams[waiverPlayer.formerTeamId];
        if (formerTeam) {
          updatedTeams[waiverPlayer.formerTeamId] = {
            ...formerTeam,
            rosterPlayerIds: formerTeam.rosterPlayerIds.filter((id) => id !== claim.playerId),
          };
        }
      }

      results.push({ ...claim, status: 'awarded' });
    } else {
      results.push({ ...claim, status: 'outbid' });
    }
  }

  updatedTeams = {
    ...updatedTeams,
    [gameState.userTeamId]: { ...userTeam, rosterPlayerIds: userRoster },
  };

  // Move waiver priority to the back after successful claims
  const successfulClaims = results.filter((r) => r.status === 'awarded');
  const newPriority =
    successfulClaims.length > 0
      ? Math.min(32, waiverState.userWaiverPriority + 5)
      : Math.max(1, waiverState.userWaiverPriority - 1);

  const updatedWaiverState: WaiverWireState = {
    ...waiverState,
    pendingClaims: [],
    availablePlayers: waiverState.availablePlayers.filter(
      (p) => !results.some((r) => r.playerId === p.playerId && r.status === 'awarded')
    ),
    userWaiverPriority: newPriority,
  };

  return {
    updatedGameState: { ...gameState, teams: updatedTeams },
    updatedWaiverState,
    results,
  };
}

/**
 * Elevate a practice squad player for game day
 */
export function elevatePracticeSquadPlayer(
  state: WaiverWireState,
  playerId: string,
  playerName: string,
  position: string
): WaiverWireState {
  const currentCount = state.seasonElevationCounts[playerId] || 0;

  // Max 3 elevations per player per season
  if (currentCount >= 3) return state;

  return {
    ...state,
    elevations: [
      ...state.elevations,
      { playerId, playerName, position, elevationCount: currentCount + 1 },
    ],
    seasonElevationCounts: {
      ...state.seasonElevationCounts,
      [playerId]: currentCount + 1,
    },
  };
}

/**
 * Cancel a practice squad elevation
 */
export function cancelElevation(state: WaiverWireState, playerId: string): WaiverWireState {
  const elevation = state.elevations.find((e) => e.playerId === playerId);
  if (!elevation) return state;

  return {
    ...state,
    elevations: state.elevations.filter((e) => e.playerId !== playerId),
    seasonElevationCounts: {
      ...state.seasonElevationCounts,
      [playerId]: Math.max(0, (state.seasonElevationCounts[playerId] || 1) - 1),
    },
  };
}

/**
 * Process weekly waiver wire - generate new players and handle claims
 */
export function processWeeklyWaiverWire(
  gameState: GameState,
  week: number
): { updatedGameState: GameState; updatedWaiverState: WaiverWireState } {
  const currentState =
    (gameState as GameState & { waiverWire?: WaiverWireState }).waiverWire ||
    createWaiverWireState();

  // Generate new waiver players
  const newPlayers = generateWaiverPlayers(gameState, week);

  // Keep recent players (last 2 weeks) + new ones
  const recentPlayers = currentState.availablePlayers.filter((p) => p.availableWeek >= week - 2);

  // Process any pending claims
  const { updatedGameState, updatedWaiverState } = processWaiverClaims(gameState, currentState);

  const finalState: WaiverWireState = {
    ...updatedWaiverState,
    availablePlayers: [...recentPlayers, ...newPlayers],
    elevations: [], // Reset weekly elevations
    lastProcessedWeek: week,
  };

  return {
    updatedGameState: {
      ...updatedGameState,
      waiverWire: finalState,
    } as GameState,
    updatedWaiverState: finalState,
  };
}

/**
 * Estimate player rating
 */
function estimateRating(player: Player): number {
  const skills = Object.values(player.skills || {});
  const skillValues = skills
    .filter((s): s is SkillValue => s != null && typeof s === 'object' && 'trueValue' in s)
    .map((s) => s.trueValue);
  if (skillValues.length === 0) return 50;
  return Math.round(skillValues.reduce((a, b) => a + b, 0) / skillValues.length);
}

/**
 * Start/Sit Decision Manager
 *
 * Manages questionable player start/sit decisions each week.
 * Players with 'questionable' injury status require a decision
 * from the user: play them (risk re-injury) or sit them (lose production).
 */

import { GameState } from '../models/game/GameState';
import { Player } from '../models/player/Player';
import { SkillValue } from '../models/player/TechnicalSkills';
import { Team } from '../models/team/Team';

/**
 * A start/sit decision for a questionable player
 */
export interface StartSitDecision {
  playerId: string;
  playerName: string;
  position: string;
  injuryType: string;
  /** Risk level of playing (low, medium, high) */
  reInjuryRisk: 'low' | 'medium' | 'high';
  /** Performance impact if they play (percentage of normal) */
  expectedPerformance: number;
  /** The backup player who would replace them */
  backupId: string | null;
  backupName: string | null;
  backupRating: number;
  /** User's decision */
  decision: 'start' | 'sit' | 'undecided';
}

/**
 * Weekly start/sit state
 */
export interface StartSitState {
  /** Week these decisions are for */
  week: number;
  /** Decisions to be made */
  decisions: StartSitDecision[];
  /** Whether all decisions have been made */
  allDecided: boolean;
}

/**
 * Re-injury probability by risk level
 */
const RE_INJURY_CHANCE: Record<string, number> = {
  low: 0.1,
  medium: 0.25,
  high: 0.45,
};

/**
 * Find questionable players on the user's team and generate decisions
 */
export function generateStartSitDecisions(gameState: GameState): StartSitState {
  const week = gameState.league.calendar.currentWeek;
  const userTeam = gameState.teams[gameState.userTeamId];

  if (!userTeam) {
    return { week, decisions: [], allDecided: true };
  }

  const decisions: StartSitDecision[] = [];

  for (const playerId of userTeam.rosterPlayerIds) {
    const player = gameState.players[playerId];
    if (!player) continue;

    // Only questionable players need a decision
    if (player.injuryStatus.severity !== 'questionable') continue;

    // Determine risk and performance impact based on weeks remaining
    let reInjuryRisk: 'low' | 'medium' | 'high';
    let expectedPerformance: number;

    if (player.injuryStatus.weeksRemaining <= 0) {
      reInjuryRisk = 'low';
      expectedPerformance = 90;
    } else if (player.injuryStatus.weeksRemaining === 1) {
      reInjuryRisk = 'medium';
      expectedPerformance = 75;
    } else {
      reInjuryRisk = 'high';
      expectedPerformance = 60;
    }

    // Find backup player at same position
    const backup = findBackup(player.position, playerId, userTeam, gameState.players);

    decisions.push({
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      injuryType: player.injuryStatus.type,
      reInjuryRisk,
      expectedPerformance,
      backupId: backup?.id || null,
      backupName: backup ? `${backup.firstName} ${backup.lastName}` : null,
      backupRating: backup ? estimateRating(backup) : 0,
      decision: 'undecided',
    });
  }

  return {
    week,
    decisions,
    allDecided: decisions.length === 0,
  };
}

/**
 * Find the backup for a given position
 */
function findBackup(
  position: string,
  excludePlayerId: string,
  team: Team,
  players: Record<string, Player>
): Player | null {
  const candidates = team.rosterPlayerIds
    .filter((id) => id !== excludePlayerId)
    .map((id) => players[id])
    .filter((p): p is Player => p != null && p.position === position)
    .sort((a, b) => estimateRating(b) - estimateRating(a));

  return candidates[0] || null;
}

/**
 * Estimate a player's overall rating
 */
function estimateRating(player: Player): number {
  const skills = Object.values(player.skills || {});
  const skillValues = skills
    .filter((s): s is SkillValue => s != null && typeof s === 'object' && 'trueValue' in s)
    .map((s) => s.trueValue);
  if (skillValues.length === 0) return 50;
  return Math.round(skillValues.reduce((a, b) => a + b, 0) / skillValues.length);
}

/**
 * Make a start/sit decision for a player
 */
export function makeStartSitDecision(
  state: StartSitState,
  playerId: string,
  decision: 'start' | 'sit'
): StartSitState {
  const updatedDecisions = state.decisions.map((d) =>
    d.playerId === playerId ? { ...d, decision } : d
  );

  return {
    ...state,
    decisions: updatedDecisions,
    allDecided: updatedDecisions.every((d) => d.decision !== 'undecided'),
  };
}

/**
 * Apply start/sit decisions to game state
 * - Players who "sit" get faster recovery
 * - Players who "start" risk re-injury during the game
 */
export function applyStartSitDecisions(gameState: GameState, state: StartSitState): GameState {
  const updatedPlayers = { ...gameState.players };

  for (const decision of state.decisions) {
    const player = updatedPlayers[decision.playerId];
    if (!player) continue;

    if (decision.decision === 'sit') {
      // Sitting accelerates recovery
      updatedPlayers[decision.playerId] = {
        ...player,
        injuryStatus: {
          ...player.injuryStatus,
          weeksRemaining: Math.max(0, player.injuryStatus.weeksRemaining - 1),
        },
      };
    }
    // If 'start', no change to injury state - re-injury checked during simulation
  }

  return {
    ...gameState,
    players: updatedPlayers,
    startSitDecisions: state,
  } as GameState;
}

/**
 * Check for re-injury during game for started questionable players
 * Called after game simulation
 */
export function checkReInjuries(
  gameState: GameState,
  startSitState: StartSitState
): { updatedPlayers: Record<string, Player>; reInjuredNames: string[] } {
  const updatedPlayers = { ...gameState.players };
  const reInjuredNames: string[] = [];

  for (const decision of startSitState.decisions) {
    if (decision.decision !== 'start') continue;

    const chance = RE_INJURY_CHANCE[decision.reInjuryRisk] || 0.1;

    if (Math.random() < chance) {
      const player = updatedPlayers[decision.playerId];
      if (player) {
        // Re-injury: extended time out
        const additionalWeeks =
          decision.reInjuryRisk === 'high' ? 4 : decision.reInjuryRisk === 'medium' ? 2 : 1;
        updatedPlayers[decision.playerId] = {
          ...player,
          injuryStatus: {
            ...player.injuryStatus,
            severity: additionalWeeks > 3 ? 'ir' : 'out',
            weeksRemaining: player.injuryStatus.weeksRemaining + additionalWeeks,
          },
        };
        reInjuredNames.push(`${player.firstName} ${player.lastName}`);
      }
    }
  }

  return { updatedPlayers, reInjuredNames };
}

/**
 * Get the risk color for display
 */
export function getRiskColor(risk: 'low' | 'medium' | 'high'): string {
  switch (risk) {
    case 'low':
      return '#4CAF50';
    case 'medium':
      return '#FF9800';
    case 'high':
      return '#F44336';
  }
}

/**
 * Get risk description text
 */
export function getRiskDescription(risk: 'low' | 'medium' | 'high'): string {
  switch (risk) {
    case 'low':
      return 'Low re-injury risk (~10%). Should be close to full strength.';
    case 'medium':
      return 'Moderate re-injury risk (~25%). May not be at full speed.';
    case 'high':
      return 'High re-injury risk (~45%). Playing through pain, limited effectiveness.';
  }
}

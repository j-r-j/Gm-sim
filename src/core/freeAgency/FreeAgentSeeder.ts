/**
 * Free Agent Seeder
 * Seeds the initial free agent pool and manages annual refresh.
 */

import { Player } from '../models/player/Player';
import {
  Position,
  OFFENSIVE_POSITIONS,
  DEFENSIVE_POSITIONS,
  SPECIAL_TEAMS_POSITIONS,
} from '../models/player/Position';
import { generatePlayer } from '../generators/player/PlayerGenerator';
import { generateUUID, randomInt } from '../generators/utils/RandomUtils';
import { Prospect } from '../draft/Prospect';
import { GameState } from '../models/game/GameState';

/**
 * Default free agent pool size
 */
export const DEFAULT_FA_POOL_SIZE = 250;

/**
 * Maximum age for free agents (older players "retire")
 */
export const MAX_FA_AGE = 36;

/**
 * Position weights for free agent pool distribution.
 * Higher weight = more players at that position.
 */
export const FA_POSITION_WEIGHTS: Record<Position, number> = {
  // Offense - skill positions more available
  [Position.QB]: 5,
  [Position.RB]: 18,
  [Position.WR]: 22,
  [Position.TE]: 12,
  [Position.LT]: 6,
  [Position.LG]: 10,
  [Position.C]: 8,
  [Position.RG]: 10,
  [Position.RT]: 8,
  // Defense
  [Position.DE]: 15,
  [Position.DT]: 14,
  [Position.OLB]: 16,
  [Position.ILB]: 14,
  [Position.CB]: 18,
  [Position.FS]: 10,
  [Position.SS]: 10,
  // Special Teams - very few
  [Position.K]: 2,
  [Position.P]: 2,
};

/**
 * Minimum free agents per position to ensure coverage
 */
export const MINIMUM_FA_BY_POSITION: Record<Position, number> = {
  [Position.QB]: 5,
  [Position.RB]: 15,
  [Position.WR]: 20,
  [Position.TE]: 10,
  [Position.LT]: 5,
  [Position.LG]: 8,
  [Position.C]: 6,
  [Position.RG]: 8,
  [Position.RT]: 6,
  [Position.DE]: 12,
  [Position.DT]: 10,
  [Position.OLB]: 12,
  [Position.ILB]: 10,
  [Position.CB]: 15,
  [Position.FS]: 8,
  [Position.SS]: 8,
  [Position.K]: 2,
  [Position.P]: 2,
};

/**
 * Skill tier distribution for depth/fringe free agents (90% of pool)
 */
const DEPTH_SKILL_DISTRIBUTION = {
  elite: 0.0,
  starter: 0.0,
  backup: 0.35,
  fringe: 0.65,
};

/**
 * Skill tier distribution for quality free agents (10% of pool)
 */
const QUALITY_SKILL_DISTRIBUTION = {
  elite: 0.02,
  starter: 0.38,
  backup: 0.4,
  fringe: 0.2,
};

/**
 * Gets a weighted random position for free agent generation
 */
function getWeightedRandomPosition(): Position {
  const allPositions = [...OFFENSIVE_POSITIONS, ...DEFENSIVE_POSITIONS, ...SPECIAL_TEAMS_POSITIONS];
  const totalWeight = allPositions.reduce((sum, pos) => sum + FA_POSITION_WEIGHTS[pos], 0);

  let random = Math.random() * totalWeight;

  for (const position of allPositions) {
    random -= FA_POSITION_WEIGHTS[position];
    if (random <= 0) {
      return position;
    }
  }

  // Fallback
  return allPositions[0];
}

/**
 * Gets a skill tier from a distribution
 */
function getSkillTierFromDistribution(distribution: {
  elite: number;
  starter: number;
  backup: number;
  fringe: number;
}): 'elite' | 'starter' | 'backup' | 'fringe' {
  const roll = Math.random();
  let cumulative = 0;

  if (roll < (cumulative += distribution.elite)) return 'elite';
  if (roll < (cumulative += distribution.starter)) return 'starter';
  if (roll < (cumulative += distribution.backup)) return 'backup';
  return 'fringe';
}

/**
 * Generates age for a free agent with realistic distribution.
 * Free agents tend to be:
 * - Older veterans who were cut (28-35) - 60%
 * - Failed young prospects (24-27) - 40%
 */
function generateFreeAgentAge(): number {
  // 60% chance older veteran, 40% chance younger failed prospect
  if (Math.random() < 0.6) {
    return randomInt(28, MAX_FA_AGE);
  }
  return randomInt(24, 27);
}

/**
 * Generates a single free agent player
 */
function generateFreeAgentPlayer(
  position: Position,
  skillTier: 'elite' | 'starter' | 'backup' | 'fringe',
  age: number,
  year: number
): Player {
  const player = generatePlayer({
    position,
    skillTier,
    ageRange: { min: age, max: age },
    forDraft: false,
  });

  // Calculate experience based on age (assume entered league at 22)
  const experience = Math.max(0, age - 22);

  // Calculate draft year
  const draftYear = year - experience;

  return {
    ...player,
    age,
    experience,
    draftYear,
    contractId: null, // Unsigned free agent
  };
}

/**
 * Counts players by position
 */
function countByPosition(players: Player[]): Map<Position, number> {
  const counts = new Map<Position, number>();

  for (const player of players) {
    const current = counts.get(player.position) || 0;
    counts.set(player.position, current + 1);
  }

  return counts;
}

/**
 * Ensures minimum position coverage in free agent pool
 */
function ensureFreeAgentPositionCoverage(
  freeAgents: Player[],
  year: number
): Player[] {
  const positionCounts = countByPosition(freeAgents);
  const additional: Player[] = [];

  for (const [positionKey, minimum] of Object.entries(MINIMUM_FA_BY_POSITION)) {
    const position = positionKey as Position;
    const current = positionCounts.get(position) || 0;

    if (current < minimum) {
      for (let i = 0; i < minimum - current; i++) {
        additional.push(
          generateFreeAgentPlayer(
            position,
            getSkillTierFromDistribution(DEPTH_SKILL_DISTRIBUTION),
            generateFreeAgentAge(),
            year
          )
        );
      }
    }
  }

  return [...freeAgents, ...additional];
}

/**
 * Seeds the initial free agent pool for a new game.
 *
 * @param year - Current game year
 * @param poolSize - Target size of the pool (default 250)
 * @returns Array of generated free agent players
 */
export function seedInitialFreeAgentPool(
  year: number,
  poolSize: number = DEFAULT_FA_POOL_SIZE
): Player[] {
  const freeAgents: Player[] = [];

  // Calculate quality vs depth distribution (90% depth, 10% quality)
  const qualityCount = Math.floor(poolSize * 0.1);
  const depthCount = poolSize - qualityCount;

  // Generate depth/fringe players (90%)
  for (let i = 0; i < depthCount; i++) {
    const player = generateFreeAgentPlayer(
      getWeightedRandomPosition(),
      getSkillTierFromDistribution(DEPTH_SKILL_DISTRIBUTION),
      generateFreeAgentAge(),
      year
    );
    freeAgents.push(player);
  }

  // Generate quality players (10%)
  for (let i = 0; i < qualityCount; i++) {
    const player = generateFreeAgentPlayer(
      getWeightedRandomPosition(),
      getSkillTierFromDistribution(QUALITY_SKILL_DISTRIBUTION),
      generateFreeAgentAge(),
      year
    );
    freeAgents.push(player);
  }

  // Ensure minimum position coverage
  return ensureFreeAgentPositionCoverage(freeAgents, year);
}

/**
 * Calculates a simple player value for sorting.
 * Based on role ceiling and age.
 */
function calculatePlayerValue(player: Player): number {
  const ceilingValues: Record<string, number> = {
    franchiseCornerstone: 100,
    highEndStarter: 85,
    solidStarter: 70,
    qualityRotational: 55,
    specialist: 40,
    depth: 25,
    practiceSquad: 10,
  };

  const baseValue = ceilingValues[player.roleFit.ceiling] || 25;

  // Age penalty: players over 30 lose value
  const agePenalty = player.age > 30 ? (player.age - 30) * 3 : 0;

  return Math.max(0, baseValue - agePenalty);
}

/**
 * Converts an unsigned UDFA prospect to a Player.
 */
function convertProspectToPlayer(prospect: Prospect, year: number): Player {
  return {
    ...prospect.player,
    experience: 0,
    draftYear: year,
    draftRound: 0, // Undrafted
    draftPick: 0,
    contractId: null,
  };
}

/**
 * Refreshes the free agent pool at end of UDFA signing period.
 * Combines unsigned UDFAs with existing free agents and maintains target size.
 *
 * @param currentFreeAgents - Currently unsigned free agents
 * @param unsignedUDFAs - UDFAs that didn't get signed by any team
 * @param year - Current game year
 * @param targetSize - Target pool size (default 250)
 * @returns Updated free agent pool
 */
export function refreshFreeAgentPool(
  currentFreeAgents: Player[],
  unsignedUDFAs: Prospect[],
  year: number,
  targetSize: number = DEFAULT_FA_POOL_SIZE
): Player[] {
  // Convert unsigned UDFAs to players
  const udfaPlayers = unsignedUDFAs.map((udfa) => convertProspectToPlayer(udfa, year));

  // Age up existing free agents and filter out retired (age > MAX_FA_AGE)
  const agedFreeAgents = currentFreeAgents
    .map((fa) => ({ ...fa, age: fa.age + 1 }))
    .filter((fa) => fa.age <= MAX_FA_AGE);

  // Combine and sort by quality
  const combinedPool = [...agedFreeAgents, ...udfaPlayers].sort(
    (a, b) => calculatePlayerValue(b) - calculatePlayerValue(a)
  );

  // If pool is too large, keep the best players up to target
  if (combinedPool.length > targetSize) {
    return combinedPool.slice(0, targetSize);
  }

  // If pool is too small, generate additional free agents
  if (combinedPool.length < targetSize) {
    const needed = targetSize - combinedPool.length;
    const additional = seedInitialFreeAgentPool(year, needed);
    return [...combinedPool, ...additional];
  }

  return combinedPool;
}

/**
 * Gets all free agent players from game state.
 * Free agents are players not on any team's roster with null contractId.
 *
 * @param state - The game state
 * @returns Array of free agent players
 */
export function getFreeAgentPlayers(state: GameState): Player[] {
  // Collect all player IDs that are on team rosters
  const teamPlayerIds = new Set<string>();

  for (const team of Object.values(state.teams)) {
    for (const playerId of team.rosterPlayerIds) {
      teamPlayerIds.add(playerId);
    }
    // Also check practice squad and IR if they exist
    if (team.practiceSquadIds) {
      for (const playerId of team.practiceSquadIds) {
        teamPlayerIds.add(playerId);
      }
    }
    if (team.injuredReserveIds) {
      for (const playerId of team.injuredReserveIds) {
        teamPlayerIds.add(playerId);
      }
    }
  }

  // Filter players not on any roster and without a contract
  return Object.values(state.players).filter(
    (player) => !teamPlayerIds.has(player.id) && player.contractId === null
  );
}

/**
 * Gets free agents by position from game state
 */
export function getFreeAgentPlayersByPosition(
  state: GameState,
  position: Position
): Player[] {
  return getFreeAgentPlayers(state).filter((player) => player.position === position);
}

/**
 * Gets top free agents sorted by value
 */
export function getTopFreeAgentPlayers(state: GameState, limit: number = 50): Player[] {
  return getFreeAgentPlayers(state)
    .sort((a, b) => calculatePlayerValue(b) - calculatePlayerValue(a))
    .slice(0, limit);
}

/**
 * Finalizes the UDFA phase and refreshes the free agent pool.
 * Called after UDFA signing period completes.
 *
 * @param state - Current game state
 * @param unsignedUDFAs - Array of prospects that weren't signed during UDFA period
 * @returns Updated game state with refreshed free agent pool
 */
export function finalizeUDFAPhaseAndRefreshPool(
  state: GameState,
  unsignedUDFAs: Prospect[]
): GameState {
  const currentYear = state.league.calendar.currentYear;

  // Get current free agents from state
  const currentFreeAgents = getFreeAgentPlayers(state);

  // Refresh the pool with UDFAs
  const newFreeAgentPool = refreshFreeAgentPool(
    currentFreeAgents,
    unsignedUDFAs,
    currentYear
  );

  // Build new players record
  const updatedPlayers = { ...state.players };

  // Track which players are on rosters (should not be removed)
  const teamPlayerIds = new Set<string>();
  for (const team of Object.values(state.teams)) {
    for (const playerId of team.rosterPlayerIds) {
      teamPlayerIds.add(playerId);
    }
    if (team.practiceSquadIds) {
      for (const playerId of team.practiceSquadIds) {
        teamPlayerIds.add(playerId);
      }
    }
    if (team.injuredReserveIds) {
      for (const playerId of team.injuredReserveIds) {
        teamPlayerIds.add(playerId);
      }
    }
  }

  // Remove old free agents that are no longer in the pool
  const newPoolIds = new Set(newFreeAgentPool.map((p) => p.id));
  for (const fa of currentFreeAgents) {
    if (!newPoolIds.has(fa.id) && !teamPlayerIds.has(fa.id)) {
      delete updatedPlayers[fa.id];
    }
  }

  // Add new free agents to players record
  for (const fa of newFreeAgentPool) {
    updatedPlayers[fa.id] = fa;
  }

  return {
    ...state,
    players: updatedPlayers,
  };
}

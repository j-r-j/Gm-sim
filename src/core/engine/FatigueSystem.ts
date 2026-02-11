/**
 * Fatigue System
 * Handles fatigue accumulation and recovery during gameplay.
 * Fatigue affects player performance and injury risk.
 */

import { Player } from '../models/player/Player';
import { hasTrait } from '../models/player/HiddenTraits';
import { WeatherCondition } from './EffectiveRatingCalculator';

/**
 * Play intensity levels
 */
export type PlayIntensity = 'low' | 'normal' | 'high';

/**
 * Parameters for fatigue calculation
 */
export interface FatigueParams {
  player: Player;
  currentFatigue: number; // 0-100
  snapCount: number; // Snaps this game
  weather: WeatherCondition;
  playIntensity: PlayIntensity;
}

/**
 * Base fatigue increase per play by intensity
 */
const BASE_FATIGUE_INCREASE: Record<PlayIntensity, number> = {
  low: 1,
  normal: 2,
  high: 3.5,
};

/**
 * Position fatigue multipliers
 * Some positions accumulate fatigue faster
 */
const POSITION_FATIGUE_MULTIPLIERS: Record<string, number> = {
  QB: 0.8,
  RB: 1.3,
  WR: 1.1,
  TE: 1.15,
  LT: 1.0,
  LG: 1.0,
  C: 1.0,
  RG: 1.0,
  RT: 1.0,
  DE: 1.2,
  DT: 1.25,
  OLB: 1.2,
  ILB: 1.15,
  CB: 1.1,
  FS: 1.05,
  SS: 1.1,
  K: 0.3,
  P: 0.3,
};

/**
 * Calculate fatigue increase from a play
 *
 * @param params - Fatigue calculation parameters
 * @returns Amount of fatigue to add (0-10 typical range)
 */
export function calculateFatigueIncrease(params: FatigueParams): number {
  const { player, currentFatigue, snapCount, weather, playIntensity } = params;

  // Base fatigue from play intensity
  let fatigueIncrease = BASE_FATIGUE_INCREASE[playIntensity];

  // Position multiplier
  const positionMult = POSITION_FATIGUE_MULTIPLIERS[player.position] ?? 1.0;
  fatigueIncrease *= positionMult;

  // Age affects fatigue accumulation
  if (player.age >= 34) {
    fatigueIncrease *= 1.4;
  } else if (player.age >= 32) {
    fatigueIncrease *= 1.25;
  } else if (player.age >= 30) {
    fatigueIncrease *= 1.1;
  } else if (player.age <= 24) {
    fatigueIncrease *= 0.9;
  }

  // Snap count affects fatigue accumulation (gets worse as game goes on)
  if (snapCount > 60) {
    fatigueIncrease *= 1.3;
  } else if (snapCount > 45) {
    fatigueIncrease *= 1.2;
  } else if (snapCount > 30) {
    fatigueIncrease *= 1.1;
  }

  // Current fatigue affects rate (harder to push when already tired)
  if (currentFatigue > 80) {
    fatigueIncrease *= 1.25;
  } else if (currentFatigue > 60) {
    fatigueIncrease *= 1.1;
  }

  // Weather effects
  if (!weather.isDome) {
    // Hot weather increases fatigue
    if (weather.temperature > 85) {
      fatigueIncrease *= 1.3;
    } else if (weather.temperature > 80) {
      fatigueIncrease *= 1.15;
    }

    // Humidity would affect this too in real life
    // Cold weather slightly reduces fatigue
    if (weather.temperature < 40) {
      fatigueIncrease *= 0.95;
    }
  }

  // Trait effects
  if (hasTrait(player.hiddenTraits, 'motor')) {
    fatigueIncrease *= 0.85; // Motor players manage fatigue better
  }
  if (hasTrait(player.hiddenTraits, 'lazy')) {
    fatigueIncrease *= 1.1; // Lazy players fatigue faster
  }
  if (hasTrait(player.hiddenTraits, 'ironMan')) {
    fatigueIncrease *= 0.8; // Iron Man players are more durable
  }

  return Math.max(0, fatigueIncrease);
}

/**
 * Get performance penalty from fatigue
 * Returns a value to subtract from effective rating
 *
 * @param fatigue - Current fatigue level (0-100)
 * @returns Performance penalty (0-20 range)
 */
export function getFatiguePenalty(fatigue: number): number {
  // No penalty below 30 fatigue
  if (fatigue < 30) return 0;

  // Gradual penalty from 30-60
  if (fatigue < 60) {
    return (fatigue - 30) / 10; // 0-3 range
  }

  // Steeper penalty from 60-80
  if (fatigue < 80) {
    return 3 + (fatigue - 60) / 5; // 3-7 range
  }

  // Severe penalty above 80
  return 7 + (fatigue - 80) / 3; // 7-13.67 range

  // At 100 fatigue, penalty would be ~13.67
}

/**
 * Calculate fatigue recovery between plays
 *
 * @param currentFatigue - Current fatigue level
 * @param playsSinceLastSnap - Number of plays since player was on field
 * @param playerCondition - Player's physical condition (from attributes, 1-100)
 * @returns New fatigue level after recovery
 */
export function calculateFatigueRecovery(
  currentFatigue: number,
  playsSinceLastSnap: number,
  playerCondition: number
): number {
  if (currentFatigue <= 0) return 0;

  // Base recovery per play off field
  const baseRecovery = 3;

  // Condition affects recovery rate
  const conditionMultiplier = 0.7 + (playerCondition / 100) * 0.6; // 0.7 to 1.3

  // Recovery per play
  const recoveryPerPlay = baseRecovery * conditionMultiplier;

  // Total recovery
  const totalRecovery = recoveryPerPlay * playsSinceLastSnap;

  // Higher fatigue has slightly faster recovery (body prioritizes it)
  const fatigueBonus = currentFatigue > 70 ? 0.5 * playsSinceLastSnap : 0;

  return Math.max(0, currentFatigue - totalRecovery - fatigueBonus);
}

/**
 * Calculate halftime fatigue recovery
 * Significant recovery during halftime
 *
 * @param currentFatigue - Current fatigue level
 * @param playerCondition - Player's physical condition
 * @returns New fatigue level after halftime
 */
export function calculateHalftimeRecovery(currentFatigue: number, playerCondition: number): number {
  // Base recovery of 40%
  const baseRecoveryPercent = 0.4;

  // Condition affects recovery
  const conditionBonus = (playerCondition / 100) * 0.2; // Up to 20% more

  const totalRecoveryPercent = baseRecoveryPercent + conditionBonus;

  return Math.max(0, currentFatigue * (1 - totalRecoveryPercent));
}

/**
 * Calculate between-play recovery for active player
 * Minimal recovery while staying on field
 *
 * @param currentFatigue - Current fatigue level
 * @returns New fatigue level
 */
export function calculateBetweenPlayRecovery(currentFatigue: number): number {
  // Very small recovery between plays (about 0.5-1 point)
  const recovery = 0.5 + Math.random() * 0.5;
  return Math.max(0, currentFatigue - recovery);
}

/**
 * Determine play intensity based on play type and outcome
 *
 * @param playType - Type of play
 * @param outcome - Outcome of the play
 * @returns Play intensity level
 */
export function determinePlayIntensity(playType: string, outcome: string): PlayIntensity {
  // High intensity plays
  if (
    outcome === 'big_gain' ||
    outcome === 'touchdown' ||
    outcome === 'big_loss' ||
    outcome === 'sack' ||
    outcome === 'fumble' ||
    outcome === 'fumble_lost'
  ) {
    return 'high';
  }

  // Low intensity plays
  if (
    outcome === 'incomplete' ||
    outcome === 'penalty_offense' ||
    outcome === 'penalty_defense' ||
    playType === 'field_goal' ||
    playType === 'punt'
  ) {
    return 'low';
  }

  // Normal intensity for everything else
  return 'normal';
}

/**
 * Check if a player should be subbed due to fatigue
 *
 * @param fatigue - Current fatigue level
 * @param position - Player's position
 * @returns True if player should be subbed
 */
export function shouldSubForFatigue(fatigue: number, position: string): boolean {
  // QBs rarely sub for fatigue
  if (position === 'QB') {
    return fatigue > 90;
  }

  // Kickers and punters basically never sub for fatigue
  if (position === 'K' || position === 'P') {
    return false;
  }

  // D-linemen rotate more frequently
  if (position === 'DE' || position === 'DT') {
    return fatigue > 65;
  }

  // RBs often rotate
  if (position === 'RB') {
    return fatigue > 70;
  }

  // Default threshold
  return fatigue > 75;
}

/**
 * Select a substitute player when a player is too fatigued.
 * Searches the full roster for a same-position player not currently active
 * with the lowest fatigue.
 *
 * @param allPlayers - Map of all players on the roster
 * @param activePlayerIds - IDs of currently active players on the field
 * @param fatiguedPlayer - The player who may need to be subbed out
 * @returns A substitute player, or null if none available
 */
export function selectFatigueSubstitute(
  allPlayers: Map<string, Player>,
  activePlayerIds: string[],
  fatiguedPlayer: Player
): Player | null {
  if (!shouldSubForFatigue(fatiguedPlayer.fatigue, fatiguedPlayer.position)) {
    return null;
  }

  const activeSet = new Set(activePlayerIds);
  let bestSub: Player | null = null;
  let bestFatigue = Infinity;

  for (const [id, player] of allPlayers) {
    if (
      id !== fatiguedPlayer.id &&
      !activeSet.has(id) &&
      player.position === fatiguedPlayer.position &&
      player.fatigue < bestFatigue
    ) {
      bestSub = player;
      bestFatigue = player.fatigue;
    }
  }

  return bestSub;
}

/**
 * Get fatigue level description (for debugging, not UI)
 */
export function getFatigueDescription(fatigue: number): string {
  if (fatigue < 20) return 'Fresh';
  if (fatigue < 40) return 'Good';
  if (fatigue < 60) return 'Normal';
  if (fatigue < 75) return 'Tired';
  if (fatigue < 90) return 'Very Tired';
  return 'Exhausted';
}

/**
 * Reset fatigue for a team (new game)
 *
 * @param fatigueLevels - Map of player fatigue levels
 */
export function resetTeamFatigue(fatigueLevels: Map<string, number>): void {
  fatigueLevels.clear();
}

/**
 * Initialize fatigue map with all players at 0
 *
 * @param playerIds - Array of player IDs
 * @returns Map of player fatigue levels
 */
export function initializeFatigueLevels(playerIds: string[]): Map<string, number> {
  const fatigueLevels = new Map<string, number>();
  for (const playerId of playerIds) {
    fatigueLevels.set(playerId, 0);
  }
  return fatigueLevels;
}

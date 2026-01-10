/**
 * Weekly Variance Calculator
 * Pre-calculates performance variance for players based on consistency tier.
 * This system handles hot/cold streaks and week-to-week variation.
 * All calculations are hidden from the user.
 */

import { Player } from '../models/player/Player';
import {
  ConsistencyProfile,
  ConsistencyTier,
  StreakState,
  CONSISTENCY_VARIANCE,
  STREAK_MODIFIERS,
} from '../models/player/Consistency';

/**
 * Variance ranges for each consistency tier
 * Re-exported for convenience
 */
export const VARIANCE_RANGES: Record<ConsistencyTier, { min: number; max: number }> =
  CONSISTENCY_VARIANCE;

/**
 * Result of calculating weekly variance
 */
export interface WeeklyVarianceResult {
  /** The variance value to apply to effective rating */
  variance: number;
  /** New streak state after this calculation */
  newStreakState: StreakState;
  /** Games remaining in current streak */
  streakGamesRemaining: number;
}

/**
 * Generate a random value within a range using normal distribution
 * Biased toward the center of the range
 */
function normalRandom(min: number, max: number): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  // Scale to range with center bias
  const mean = (min + max) / 2;
  const stdDev = (max - min) / 4; // 2 standard deviations cover most of range

  const value = mean + z * stdDev;
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate the probability of starting a streak based on tier
 */
function getStreakProbability(tier: ConsistencyTier): number {
  switch (tier) {
    case 'metronome':
      return 0.02; // Rarely streaks
    case 'steady':
      return 0.05;
    case 'average':
      return 0.1;
    case 'streaky':
      return 0.25; // Most likely to streak
    case 'volatile':
      return 0.2;
    case 'chaotic':
      return 0.15;
    default:
      return 0.1;
  }
}

/**
 * Calculate the length of a new streak
 */
function getStreakLength(tier: ConsistencyTier): number {
  switch (tier) {
    case 'metronome':
      return 1; // Very short streaks
    case 'steady':
      return Math.floor(Math.random() * 2) + 1; // 1-2 games
    case 'average':
      return Math.floor(Math.random() * 3) + 1; // 1-3 games
    case 'streaky':
      return Math.floor(Math.random() * 4) + 2; // 2-5 games (longer streaks)
    case 'volatile':
      return Math.floor(Math.random() * 3) + 1; // 1-3 games
    case 'chaotic':
      return Math.floor(Math.random() * 2) + 1; // 1-2 games (unpredictable)
    default:
      return 1;
  }
}

/**
 * Calculate weekly variance for a player
 *
 * @param consistency - Player's consistency profile
 * @param previousWeekVariance - Optional variance from previous week (for streak detection)
 * @returns Variance result with new streak state
 */
export function calculateWeeklyVariance(
  consistency: ConsistencyProfile,
  previousWeekVariance?: number
): WeeklyVarianceResult {
  const { tier, currentStreak, streakGamesRemaining } = consistency;
  const range = VARIANCE_RANGES[tier];

  // Check if currently in a streak
  if (streakGamesRemaining > 0) {
    // Continue the streak
    const streakMod = STREAK_MODIFIERS[currentStreak];
    let baseVariance: number;

    if (currentStreak === 'hot') {
      // Hot streak: bias toward positive variance
      baseVariance = normalRandom(range.max * 0.5, range.max);
    } else if (currentStreak === 'cold') {
      // Cold streak: bias toward negative variance
      baseVariance = normalRandom(range.min, range.min * 0.5);
    } else {
      // Neutral: normal distribution
      baseVariance = normalRandom(range.min, range.max);
    }

    const variance = baseVariance + streakMod;

    return {
      variance: Math.max(range.min - 5, Math.min(range.max + 5, variance)),
      newStreakState: currentStreak,
      streakGamesRemaining: streakGamesRemaining - 1,
    };
  }

  // Not in a streak - check if one should start
  const streakChance = getStreakProbability(tier);

  if (Math.random() < streakChance) {
    // Start a new streak
    // Determine hot or cold based on previous week and randomness
    let newStreakState: StreakState;

    if (previousWeekVariance !== undefined) {
      // Tend to continue in same direction as previous week
      if (previousWeekVariance > 3) {
        newStreakState = Math.random() < 0.7 ? 'hot' : 'cold';
      } else if (previousWeekVariance < -3) {
        newStreakState = Math.random() < 0.7 ? 'cold' : 'hot';
      } else {
        newStreakState = Math.random() < 0.5 ? 'hot' : 'cold';
      }
    } else {
      newStreakState = Math.random() < 0.5 ? 'hot' : 'cold';
    }

    const newStreakLength = getStreakLength(tier);
    const streakMod = STREAK_MODIFIERS[newStreakState];

    let baseVariance: number;
    if (newStreakState === 'hot') {
      baseVariance = normalRandom(range.max * 0.3, range.max);
    } else {
      baseVariance = normalRandom(range.min, range.min * 0.3);
    }

    const variance = baseVariance + streakMod;

    return {
      variance: Math.max(range.min - 5, Math.min(range.max + 5, variance)),
      newStreakState,
      streakGamesRemaining: newStreakLength - 1, // -1 because this game counts
    };
  }

  // No streak - normal variance
  const baseVariance = normalRandom(range.min, range.max);

  return {
    variance: baseVariance,
    newStreakState: 'neutral',
    streakGamesRemaining: 0,
  };
}

/**
 * Pre-calculate weekly variances for all players on a team
 * Call this once at the start of each game week
 *
 * @param players - Array of players to calculate variances for
 * @returns Map of playerId to variance value
 */
export function calculateTeamWeeklyVariances(players: Player[]): Map<string, number> {
  const variances = new Map<string, number>();

  for (const player of players) {
    const result = calculateWeeklyVariance(player.consistency);
    variances.set(player.id, result.variance);
  }

  return variances;
}

/**
 * Calculate weekly variances for multiple teams
 *
 * @param teams - Array of team player arrays
 * @returns Map of playerId to variance value
 */
export function calculateLeagueWeeklyVariances(teams: Player[][]): Map<string, number> {
  const variances = new Map<string, number>();

  for (const team of teams) {
    const teamVariances = calculateTeamWeeklyVariances(team);
    teamVariances.forEach((variance, playerId) => {
      variances.set(playerId, variance);
    });
  }

  return variances;
}

/**
 * Update a player's consistency profile after a game
 *
 * @param player - The player to update
 * @param gameVariance - The variance that was applied this game
 * @param result - The variance result from calculateWeeklyVariance
 * @returns Updated consistency profile
 */
export function updatePlayerConsistencyAfterGame(
  player: Player,
  _gameVariance: number,
  result: WeeklyVarianceResult
): ConsistencyProfile {
  return {
    tier: player.consistency.tier,
    currentStreak: result.newStreakState,
    streakGamesRemaining: result.streakGamesRemaining,
  };
}

/**
 * Get a description of variance tier for debugging (NOT for UI)
 */
export function getVarianceDescription(variance: number): string {
  if (variance >= 10) return 'significantly above normal';
  if (variance >= 5) return 'above normal';
  if (variance >= 2) return 'slightly above normal';
  if (variance >= -2) return 'normal';
  if (variance >= -5) return 'slightly below normal';
  if (variance >= -10) return 'below normal';
  return 'significantly below normal';
}

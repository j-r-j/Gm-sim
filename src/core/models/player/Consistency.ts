/**
 * Consistency tier determines weekly performance variance.
 * This is hidden from the user - they only see the results.
 */
export type ConsistencyTier =
  | 'metronome' // ±2 variance - extremely consistent
  | 'steady' // ±4 variance - reliable performer
  | 'average' // ±7 variance - normal variation
  | 'streaky' // -10 to +12 variance - hot/cold streaks
  | 'volatile' // ±15 variance - unpredictable
  | 'chaotic'; // ±20 variance - completely unpredictable

/**
 * Current streak state
 */
export type StreakState = 'hot' | 'cold' | 'neutral';

/**
 * Consistency profile for a player.
 * Determines how much their performance varies week to week.
 */
export interface ConsistencyProfile {
  /** The player's consistency tier (hidden from user) */
  tier: ConsistencyTier;

  /** Current streak state */
  currentStreak: StreakState;

  /** Number of games remaining in the current streak */
  streakGamesRemaining: number;
}

/**
 * Variance ranges for each consistency tier
 */
export const CONSISTENCY_VARIANCE: Record<
  ConsistencyTier,
  { min: number; max: number }
> = {
  metronome: { min: -2, max: 2 },
  steady: { min: -4, max: 4 },
  average: { min: -7, max: 7 },
  streaky: { min: -10, max: 12 },
  volatile: { min: -15, max: 15 },
  chaotic: { min: -20, max: 20 },
};

/**
 * Streak modifiers applied to variance
 */
export const STREAK_MODIFIERS: Record<StreakState, number> = {
  hot: 5, // Add to positive variance
  cold: -5, // Add to negative variance
  neutral: 0, // No modification
};

/**
 * Creates a default consistency profile
 */
export function createDefaultConsistencyProfile(): ConsistencyProfile {
  return {
    tier: 'average',
    currentStreak: 'neutral',
    streakGamesRemaining: 0,
  };
}

/**
 * Validates a consistency profile
 */
export function validateConsistencyProfile(
  profile: ConsistencyProfile
): boolean {
  const validTiers: ConsistencyTier[] = [
    'metronome',
    'steady',
    'average',
    'streaky',
    'volatile',
    'chaotic',
  ];
  const validStreaks: StreakState[] = ['hot', 'cold', 'neutral'];

  return (
    validTiers.includes(profile.tier) &&
    validStreaks.includes(profile.currentStreak) &&
    profile.streakGamesRemaining >= 0
  );
}

/**
 * Calculates the performance variance for a given consistency profile.
 * FOR ENGINE USE ONLY.
 * Returns a value to add/subtract from base performance.
 */
export function calculatePerformanceVariance(
  profile: ConsistencyProfile
): number {
  const variance = CONSISTENCY_VARIANCE[profile.tier];
  const streakMod = STREAK_MODIFIERS[profile.currentStreak];

  // Random variance within the tier's range
  const baseVariance =
    Math.random() * (variance.max - variance.min) + variance.min;

  return baseVariance + streakMod;
}

/**
 * Updates the streak state after a game.
 * FOR ENGINE USE ONLY.
 */
export function updateStreakState(
  profile: ConsistencyProfile,
  performanceRating: number
): ConsistencyProfile {
  const newProfile = { ...profile };

  // Decrement remaining games
  if (newProfile.streakGamesRemaining > 0) {
    newProfile.streakGamesRemaining--;
  }

  // Check if streak should end or change
  if (newProfile.streakGamesRemaining === 0) {
    // Determine new streak based on recent performance
    if (performanceRating >= 80) {
      newProfile.currentStreak = 'hot';
      newProfile.streakGamesRemaining = Math.floor(Math.random() * 3) + 1;
    } else if (performanceRating <= 40) {
      newProfile.currentStreak = 'cold';
      newProfile.streakGamesRemaining = Math.floor(Math.random() * 3) + 1;
    } else {
      newProfile.currentStreak = 'neutral';
      newProfile.streakGamesRemaining = 0;
    }
  }

  return newProfile;
}

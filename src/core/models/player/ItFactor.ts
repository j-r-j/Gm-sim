/**
 * The "It" Factor - the unmeasurable core of a player.
 * This is a hidden 1-100 scale that is NEVER displayed to the user.
 * It represents intangible qualities that separate good players from great ones.
 */
export interface ItFactor {
  /** The "It" factor value (1-100). NEVER exposed to UI. */
  value: number;
}

/**
 * Descriptive tiers for the "It" factor.
 * These are for engine calculations only, never shown to the user.
 */
export type ItFactorTier =
  | 'transcendent' // 90-100: Hall of Fame potential, game-changing presence
  | 'winner' // 75-89: Elevates play in crucial moments
  | 'solid' // 60-74: Reliable when it matters
  | 'average' // 40-59: Neither helps nor hurts in big moments
  | 'soft' // 20-39: Struggles under pressure
  | 'liability'; // 1-19: Actively hurts team in crucial situations

/**
 * Gets the tier description for an "It" factor value.
 * FOR ENGINE USE ONLY - never expose to UI.
 */
export function getItFactorTier(value: number): ItFactorTier {
  if (value >= 90) return 'transcendent';
  if (value >= 75) return 'winner';
  if (value >= 60) return 'solid';
  if (value >= 40) return 'average';
  if (value >= 20) return 'soft';
  return 'liability';
}

/**
 * Validates that an "It" factor value is within valid range
 */
export function validateItFactor(itFactor: ItFactor): boolean {
  return itFactor.value >= 1 && itFactor.value <= 100;
}

/**
 * Creates an "It" factor with the given value
 */
export function createItFactor(value: number): ItFactor {
  if (value < 1 || value > 100) {
    throw new Error('ItFactor value must be between 1 and 100');
  }
  return { value };
}

/**
 * Calculates clutch performance modifier based on "It" factor.
 * FOR ENGINE USE ONLY.
 * Returns a multiplier to apply to performance in high-pressure situations.
 */
export function getClutchModifier(itFactor: ItFactor): number {
  // Transcendent players get up to +15% boost
  // Liability players get up to -15% penalty
  const normalized = (itFactor.value - 50) / 50; // -1 to 1
  return 1 + normalized * 0.15;
}

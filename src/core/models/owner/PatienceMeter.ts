/**
 * Patience Meter System
 * Tracks owner patience and job security thresholds
 */

/**
 * Modifier for patience meter changes
 */
export interface PatienceModifier {
  event: string;
  minImpact: number;
  maxImpact: number;
}

/**
 * Positive events that increase patience
 */
export const PATIENCE_POSITIVE: PatienceModifier[] = [
  { event: 'superBowlWin', minImpact: 30, maxImpact: 50 },
  { event: 'playoffWin', minImpact: 15, maxImpact: 25 },
  { event: 'playoffAppearance', minImpact: 10, maxImpact: 20 },
  { event: 'winningSeason', minImpact: 5, maxImpact: 15 },
  { event: 'exceededExpectations', minImpact: 10, maxImpact: 20 },
  { event: 'majorFASigningWorks', minImpact: 5, maxImpact: 10 },
  { event: 'draftPickBecomesStar', minImpact: 5, maxImpact: 15 },
];

/**
 * Negative events that decrease patience
 */
export const PATIENCE_NEGATIVE: PatienceModifier[] = [
  { event: 'losingSeason', minImpact: -25, maxImpact: -10 },
  { event: 'missedExpectedPlayoffs', minImpact: -25, maxImpact: -15 },
  { event: 'badPR', minImpact: -20, maxImpact: -5 },
  { event: 'defiedOwner', minImpact: -25, maxImpact: -10 },
  { event: 'majorFASigningBusts', minImpact: -15, maxImpact: -5 },
  { event: 'topDraftPickBusts', minImpact: -20, maxImpact: -10 },
  { event: 'losingStreak5Plus', minImpact: -15, maxImpact: -5 },
  { event: 'blowoutLoss', minImpact: -5, maxImpact: -2 },
];

/**
 * All patience modifiers combined
 */
export const ALL_PATIENCE_MODIFIERS: PatienceModifier[] = [
  ...PATIENCE_POSITIVE,
  ...PATIENCE_NEGATIVE,
];

/**
 * Job security level
 */
export type JobSecurityLevel = 'secure' | 'stable' | 'warmSeat' | 'hotSeat' | 'fired';

/**
 * Threshold definitions for patience levels
 */
export interface PatienceThreshold {
  level: JobSecurityLevel;
  min: number;
  max: number;
}

/**
 * Patience thresholds mapping patience value to job security
 */
export const PATIENCE_THRESHOLDS: PatienceThreshold[] = [
  { level: 'secure', min: 70, max: 100 },
  { level: 'stable', min: 50, max: 69 },
  { level: 'warmSeat', min: 35, max: 49 },
  { level: 'hotSeat', min: 20, max: 34 },
  { level: 'fired', min: 0, max: 19 },
];

/**
 * Gets the job security level from a patience value
 */
export function getJobSecurityLevel(patienceValue: number): JobSecurityLevel {
  for (const threshold of PATIENCE_THRESHOLDS) {
    if (patienceValue >= threshold.min && patienceValue <= threshold.max) {
      return threshold.level;
    }
  }
  return 'fired'; // Default if somehow out of range
}

/**
 * Gets a user-friendly job security status description
 */
export function getJobSecurityStatus(
  patienceValue: number
): 'secure' | 'stable' | 'warm seat' | 'hot seat' | 'danger' {
  const level = getJobSecurityLevel(patienceValue);

  const statusMap: Record<JobSecurityLevel, 'secure' | 'stable' | 'warm seat' | 'hot seat' | 'danger'> = {
    secure: 'secure',
    stable: 'stable',
    warmSeat: 'warm seat',
    hotSeat: 'hot seat',
    fired: 'danger',
  };

  return statusMap[level];
}

/**
 * Finds a patience modifier by event name
 */
export function findPatienceModifier(eventName: string): PatienceModifier | undefined {
  return ALL_PATIENCE_MODIFIERS.find((m) => m.event === eventName);
}

/**
 * Calculates the patience impact for an event, factoring in owner personality
 * @param eventName The event that occurred
 * @param ownerPatience Owner's patience trait (1-100)
 * @param randomFactor Random value between 0 and 1
 * @returns The impact on patience meter
 */
export function calculatePatienceImpact(
  eventName: string,
  ownerPatience: number,
  randomFactor: number
): number {
  const modifier = findPatienceModifier(eventName);
  if (!modifier) return 0;

  // Calculate base impact using random factor
  const range = modifier.maxImpact - modifier.minImpact;
  let impact = modifier.minImpact + range * randomFactor;

  // Owner patience affects impact magnitude
  // Patient owners (high patience) reduce negative impacts and increase positive impacts
  // Impatient owners (low patience) do the opposite
  const patienceModifier = (ownerPatience - 50) / 100; // -0.49 to +0.50

  if (impact > 0) {
    // Positive event: patient owners give more credit
    impact = impact * (1 + patienceModifier * 0.3);
  } else {
    // Negative event: patient owners are more forgiving
    impact = impact * (1 - patienceModifier * 0.3);
  }

  return Math.round(impact);
}

/**
 * Applies a patience change and clamps to valid range
 */
export function applyPatienceChange(currentPatience: number, change: number): number {
  const newValue = currentPatience + change;
  return Math.max(0, Math.min(100, newValue));
}

/**
 * Checks if the GM would be fired at this patience level
 */
export function wouldBeFired(patienceValue: number): boolean {
  return getJobSecurityLevel(patienceValue) === 'fired';
}

/**
 * Gets the threshold for the next worse job security level
 */
export function getNextDangerThreshold(currentPatience: number): number | null {
  const currentLevel = getJobSecurityLevel(currentPatience);

  const levelIndex = PATIENCE_THRESHOLDS.findIndex((t) => t.level === currentLevel);
  if (levelIndex === -1 || levelIndex === PATIENCE_THRESHOLDS.length - 1) {
    return null; // Already at worst level
  }

  const nextWorseLevel = PATIENCE_THRESHOLDS[levelIndex + 1];
  return nextWorseLevel.max;
}

/**
 * Validates a patience value
 */
export function validatePatienceValue(value: number): boolean {
  return value >= 0 && value <= 100;
}

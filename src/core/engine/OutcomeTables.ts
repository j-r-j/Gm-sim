/**
 * Outcome Tables
 * Strat-O-Matic style outcome tables - COMPLETELY HIDDEN from users.
 * Generates probability distributions for play outcomes based on matchup quality.
 */

/**
 * Types of plays that can be called
 */
export type PlayType =
  | 'run_inside'
  | 'run_outside'
  | 'run_draw'
  | 'run_sweep'
  | 'pass_short'
  | 'pass_medium'
  | 'pass_deep'
  | 'pass_screen'
  | 'play_action_short'
  | 'play_action_deep'
  | 'qb_scramble'
  | 'qb_sneak'
  | 'field_goal'
  | 'punt'
  | 'kickoff';

/**
 * Possible outcomes of a play
 */
export type PlayOutcome =
  | 'touchdown'
  | 'big_gain'
  | 'good_gain'
  | 'moderate_gain'
  | 'short_gain'
  | 'no_gain'
  | 'loss'
  | 'big_loss'
  | 'sack'
  | 'incomplete'
  | 'interception'
  | 'fumble'
  | 'fumble_lost'
  | 'penalty_offense'
  | 'penalty_defense'
  | 'field_goal_made'
  | 'field_goal_missed';

/**
 * Secondary effects that can occur on a play
 */
export type SecondaryEffect = 'injury_check' | 'fatigue_high' | 'big_hit' | 'highlight_play';

/**
 * Single entry in an outcome table
 */
export interface OutcomeTableEntry {
  outcome: PlayOutcome;
  probability: number; // 0-1, all entries sum to 1
  yardsRange: { min: number; max: number };
  secondaryEffects?: SecondaryEffect[];
}

/**
 * Down and distance situation
 */
export interface DownAndDistance {
  down: 1 | 2 | 3 | 4;
  yardsToGo: number;
  yardsToEndzone: number;
}

/**
 * Base outcome probabilities by play type (neutral matchup)
 * These get modified based on advantage
 */
const BASE_RUN_OUTCOMES: Partial<Record<PlayOutcome, number>> = {
  touchdown: 0.02,
  big_gain: 0.08,
  good_gain: 0.15,
  moderate_gain: 0.2,
  short_gain: 0.25,
  no_gain: 0.15,
  loss: 0.08,
  big_loss: 0.02,
  fumble: 0.02,
  fumble_lost: 0.01,
  penalty_offense: 0.01,
  penalty_defense: 0.01,
};

const BASE_PASS_OUTCOMES: Partial<Record<PlayOutcome, number>> = {
  touchdown: 0.03,
  big_gain: 0.1,
  good_gain: 0.12,
  moderate_gain: 0.15,
  short_gain: 0.08,
  incomplete: 0.3,
  sack: 0.06,
  interception: 0.025,
  fumble: 0.01,
  fumble_lost: 0.005,
  penalty_offense: 0.02,
  penalty_defense: 0.02,
};

const BASE_DEEP_PASS_OUTCOMES: Partial<Record<PlayOutcome, number>> = {
  touchdown: 0.08,
  big_gain: 0.12,
  good_gain: 0.05,
  moderate_gain: 0.03,
  short_gain: 0.02,
  incomplete: 0.45,
  sack: 0.08,
  interception: 0.04,
  fumble: 0.01,
  fumble_lost: 0.005,
  penalty_offense: 0.02,
  penalty_defense: 0.025,
};

const BASE_SCREEN_OUTCOMES: Partial<Record<PlayOutcome, number>> = {
  touchdown: 0.03,
  big_gain: 0.12,
  good_gain: 0.18,
  moderate_gain: 0.15,
  short_gain: 0.15,
  no_gain: 0.08,
  loss: 0.1,
  big_loss: 0.08,
  incomplete: 0.05,
  sack: 0.02,
  fumble: 0.015,
  fumble_lost: 0.005,
  penalty_offense: 0.01,
  penalty_defense: 0.01,
};

/**
 * Yard ranges for each outcome by play type category
 */
const RUN_YARD_RANGES: Record<PlayOutcome, { min: number; max: number }> = {
  touchdown: { min: 0, max: 0 }, // Special case - touchdown
  big_gain: { min: 15, max: 40 },
  good_gain: { min: 8, max: 14 },
  moderate_gain: { min: 5, max: 7 },
  short_gain: { min: 2, max: 4 },
  no_gain: { min: 0, max: 1 },
  loss: { min: -3, max: -1 },
  big_loss: { min: -8, max: -4 },
  sack: { min: -10, max: -3 },
  incomplete: { min: 0, max: 0 },
  interception: { min: 0, max: 0 },
  fumble: { min: -2, max: 5 },
  fumble_lost: { min: -2, max: 5 },
  penalty_offense: { min: -10, max: -5 },
  penalty_defense: { min: 5, max: 15 },
  field_goal_made: { min: 0, max: 0 },
  field_goal_missed: { min: 0, max: 0 },
};

const SHORT_PASS_YARD_RANGES: Record<PlayOutcome, { min: number; max: number }> = {
  touchdown: { min: 0, max: 0 },
  big_gain: { min: 15, max: 30 },
  good_gain: { min: 10, max: 14 },
  moderate_gain: { min: 6, max: 9 },
  short_gain: { min: 2, max: 5 },
  no_gain: { min: 0, max: 1 },
  loss: { min: -2, max: -1 },
  big_loss: { min: -5, max: -3 },
  sack: { min: -12, max: -4 },
  incomplete: { min: 0, max: 0 },
  interception: { min: 0, max: 0 },
  fumble: { min: -2, max: 10 },
  fumble_lost: { min: -2, max: 10 },
  penalty_offense: { min: -10, max: -5 },
  penalty_defense: { min: 5, max: 15 },
  field_goal_made: { min: 0, max: 0 },
  field_goal_missed: { min: 0, max: 0 },
};

const DEEP_PASS_YARD_RANGES: Record<PlayOutcome, { min: number; max: number }> = {
  touchdown: { min: 0, max: 0 },
  big_gain: { min: 30, max: 60 },
  good_gain: { min: 20, max: 29 },
  moderate_gain: { min: 15, max: 19 },
  short_gain: { min: 10, max: 14 },
  no_gain: { min: 0, max: 0 },
  loss: { min: 0, max: 0 },
  big_loss: { min: 0, max: 0 },
  sack: { min: -15, max: -5 },
  incomplete: { min: 0, max: 0 },
  interception: { min: 0, max: 0 },
  fumble: { min: 0, max: 30 },
  fumble_lost: { min: 0, max: 30 },
  penalty_offense: { min: -10, max: -5 },
  penalty_defense: { min: 15, max: 40 },
  field_goal_made: { min: 0, max: 0 },
  field_goal_missed: { min: 0, max: 0 },
};

/**
 * Get yard ranges for a play type
 */
function getYardRanges(playType: PlayType): Record<PlayOutcome, { min: number; max: number }> {
  if (playType.startsWith('run') || playType === 'qb_sneak' || playType === 'qb_scramble') {
    return RUN_YARD_RANGES;
  }
  if (playType === 'pass_deep' || playType === 'play_action_deep') {
    return DEEP_PASS_YARD_RANGES;
  }
  return SHORT_PASS_YARD_RANGES;
}

/**
 * Get base outcomes for a play type
 */
function getBaseOutcomes(playType: PlayType): Partial<Record<PlayOutcome, number>> {
  switch (playType) {
    case 'run_inside':
    case 'run_outside':
    case 'run_draw':
    case 'run_sweep':
    case 'qb_sneak':
    case 'qb_scramble':
      return BASE_RUN_OUTCOMES;

    case 'pass_deep':
    case 'play_action_deep':
      return BASE_DEEP_PASS_OUTCOMES;

    case 'pass_screen':
      return BASE_SCREEN_OUTCOMES;

    case 'pass_short':
    case 'pass_medium':
    case 'play_action_short':
    default:
      return BASE_PASS_OUTCOMES;
  }
}

/**
 * Apply advantage modifier to outcome probabilities
 * Positive advantage favors offense (more big gains, fewer turnovers)
 * Negative advantage favors defense (more sacks, turnovers)
 */
function applyAdvantageModifier(
  outcomes: Partial<Record<PlayOutcome, number>>,
  advantage: number,
  isPassPlay: boolean
): Partial<Record<PlayOutcome, number>> {
  const modified = { ...outcomes };

  // Advantage ranges from roughly -40 to +40
  // Convert to a modifier (-1 to +1)
  const modifier = Math.max(-1, Math.min(1, advantage / 40));

  // Positive outcomes get boosted with positive advantage
  const positiveOutcomes: PlayOutcome[] = ['touchdown', 'big_gain', 'good_gain', 'moderate_gain'];

  // Negative outcomes get boosted with negative advantage
  const negativeOutcomes: PlayOutcome[] = isPassPlay
    ? ['sack', 'interception', 'fumble', 'fumble_lost', 'incomplete']
    : ['loss', 'big_loss', 'fumble', 'fumble_lost', 'no_gain'];

  // Apply modifiers
  for (const outcome of positiveOutcomes) {
    if (modified[outcome] !== undefined) {
      modified[outcome] = modified[outcome]! * (1 + modifier * 0.5);
    }
  }

  for (const outcome of negativeOutcomes) {
    if (modified[outcome] !== undefined) {
      modified[outcome] = modified[outcome]! * (1 - modifier * 0.5);
    }
  }

  return modified;
}

/**
 * Apply situational modifiers based on down and distance
 */
function applySituationalModifier(
  outcomes: Partial<Record<PlayOutcome, number>>,
  situation: DownAndDistance,
  _playType: PlayType
): Partial<Record<PlayOutcome, number>> {
  const modified = { ...outcomes };

  // Third and long increases incompletion/sack risk
  if (situation.down === 3 && situation.yardsToGo > 7) {
    if (modified.incomplete) modified.incomplete *= 1.1;
    if (modified.sack) modified.sack *= 1.15;
  }

  // Red zone increases touchdown probability, decreases big gain probability
  if (situation.yardsToEndzone <= 20) {
    if (modified.touchdown) modified.touchdown *= 1.3;
    if (modified.big_gain) modified.big_gain *= 0.7;
  }

  // Goal line (inside 5) greatly increases touchdown/short gain probability
  if (situation.yardsToEndzone <= 5) {
    if (modified.touchdown) modified.touchdown *= 1.8;
    if (modified.short_gain) modified.short_gain = (modified.short_gain ?? 0) * 1.3;
    if (modified.no_gain) modified.no_gain = (modified.no_gain ?? 0) * 1.2;
  }

  // Fourth down pressure increases turnover risk slightly
  if (situation.down === 4) {
    if (modified.fumble) modified.fumble *= 1.1;
    if (modified.interception) modified.interception *= 1.1;
  }

  return modified;
}

/**
 * Apply field position modifier
 * Deep in own territory = more conservative outcomes
 * Opponent territory = more aggressive outcomes
 */
function applyFieldPositionModifier(
  outcomes: Partial<Record<PlayOutcome, number>>,
  fieldPosition: number
): Partial<Record<PlayOutcome, number>> {
  const modified = { ...outcomes };

  // fieldPosition is yards from own end zone (0-100)
  // Inside own 10 = very conservative, higher risk of safety
  if (fieldPosition < 10) {
    if (modified.big_loss) modified.big_loss *= 1.3;
    if (modified.fumble) modified.fumble *= 1.1;
    // Reduce big play probability
    if (modified.big_gain) modified.big_gain *= 0.8;
    if (modified.touchdown) modified.touchdown *= 0.7;
  }

  // Backed up (inside own 20)
  if (fieldPosition < 20) {
    if (modified.loss) modified.loss = (modified.loss ?? 0) * 1.1;
  }

  return modified;
}

/**
 * Normalize probabilities to sum to 1.0
 */
function normalizeProbabilities(
  outcomes: Partial<Record<PlayOutcome, number>>
): OutcomeTableEntry[] {
  const entries = Object.entries(outcomes) as [PlayOutcome, number][];
  const sum = entries.reduce((acc, [, prob]) => acc + prob, 0);

  if (sum === 0) {
    // Default to incomplete if somehow everything is 0
    return [
      {
        outcome: 'incomplete',
        probability: 1,
        yardsRange: { min: 0, max: 0 },
      },
    ];
  }

  // Normalize and create entries
  return entries.map(([outcome, prob]) => ({
    outcome,
    probability: prob / sum,
    yardsRange: { min: 0, max: 0 }, // Will be filled in later
  }));
}

/**
 * Add yard ranges and secondary effects to entries
 */
function addYardRangesAndEffects(
  entries: OutcomeTableEntry[],
  playType: PlayType,
  yardsToEndzone: number
): OutcomeTableEntry[] {
  const yardRanges = getYardRanges(playType);

  return entries.map((entry) => {
    const baseRange = yardRanges[entry.outcome];

    // Adjust for yards to endzone
    let adjustedRange = { ...baseRange };

    // Cap yards at endzone for positive gains
    if (adjustedRange.max > yardsToEndzone && adjustedRange.max > 0) {
      adjustedRange = {
        min: Math.min(adjustedRange.min, yardsToEndzone),
        max: yardsToEndzone,
      };
    }

    // Add secondary effects based on outcome
    const secondaryEffects: SecondaryEffect[] = [];

    if (entry.outcome === 'big_gain' || entry.outcome === 'touchdown') {
      secondaryEffects.push('highlight_play');
    }

    if (entry.outcome === 'sack' || entry.outcome === 'big_loss') {
      secondaryEffects.push('big_hit');
      secondaryEffects.push('injury_check');
    }

    if (
      entry.outcome === 'fumble' ||
      entry.outcome === 'fumble_lost' ||
      entry.outcome === 'big_gain'
    ) {
      secondaryEffects.push('fatigue_high');
    }

    // Any contact play has small injury check chance
    if (
      Math.random() < 0.05 &&
      !secondaryEffects.includes('injury_check') &&
      entry.outcome !== 'incomplete'
    ) {
      secondaryEffects.push('injury_check');
    }

    return {
      ...entry,
      yardsRange: adjustedRange,
      secondaryEffects: secondaryEffects.length > 0 ? secondaryEffects : undefined,
    };
  });
}

/**
 * Generate outcome table based on matchup quality
 * This is the core Strat-O-Matic mechanic
 *
 * @param offensiveEffectiveRating - Offensive player/unit effective rating
 * @param defensiveEffectiveRating - Defensive player/unit effective rating
 * @param playType - Type of play being run
 * @param situation - Down and distance
 * @param fieldPosition - Yards from own end zone (0-100)
 * @returns Array of outcome table entries (probabilities sum to 1.0)
 */
export function generateOutcomeTable(
  offensiveEffectiveRating: number,
  defensiveEffectiveRating: number,
  playType: PlayType,
  situation: DownAndDistance,
  fieldPosition: number
): OutcomeTableEntry[] {
  // Calculate advantage (-40 to +40 range typically)
  const advantage = offensiveEffectiveRating - defensiveEffectiveRating;

  // Get base outcomes for this play type
  const baseOutcomes = getBaseOutcomes(playType);

  // Determine if it's a pass play
  const isPassPlay = playType.includes('pass') || playType.includes('action');

  // Apply all modifiers
  let outcomes = applyAdvantageModifier(baseOutcomes, advantage, isPassPlay);
  outcomes = applySituationalModifier(outcomes, situation, playType);
  outcomes = applyFieldPositionModifier(outcomes, fieldPosition);

  // Normalize to sum to 1.0
  let entries = normalizeProbabilities(outcomes);

  // Add yard ranges and secondary effects
  entries = addYardRangesAndEffects(entries, playType, situation.yardsToEndzone);

  // Sort by probability for consistent ordering
  entries.sort((a, b) => b.probability - a.probability);

  return entries;
}

/**
 * Truncated Gaussian distribution for more realistic yard outcomes
 * Uses Box-Muller transform with truncation and skew
 */
function truncatedGaussian(
  mean: number,
  stdDev: number,
  min: number,
  max: number,
  skew: number = 0
): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  let z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  // Apply skew (positive skew = more likely to be above mean)
  if (skew !== 0) {
    z = z + skew * Math.abs(z) * (z > 0 ? 1 : -1);
  }

  let value = mean + z * stdDev;

  // Truncate to range
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Calculate yards using position-based Gaussian distribution
 * Different play types have different expected distributions
 */
function calculateYardsGaussian(
  min: number,
  max: number,
  outcome: PlayOutcome,
  matchupAdvantage: number
): number {
  if (min === max) return min;

  // Base mean and standard deviation
  let mean = (min + max) / 2;
  let stdDev = (max - min) / 4;
  let skew = 0;

  // Adjust based on outcome type - some outcomes cluster differently
  switch (outcome) {
    case 'big_gain':
      // Big gains cluster toward the lower end with occasional explosives
      mean = min + (max - min) * 0.35;
      stdDev = (max - min) / 3;
      skew = 0.3; // Right skew for occasional big plays
      break;

    case 'good_gain':
      // Good gains are fairly normally distributed
      mean = (min + max) / 2;
      stdDev = (max - min) / 4;
      break;

    case 'moderate_gain':
    case 'short_gain':
      // Short gains cluster toward expected value
      mean = (min + max) / 2;
      stdDev = (max - min) / 5; // Tighter distribution
      break;

    case 'loss':
    case 'big_loss':
      // Losses cluster toward smaller losses
      mean = max - (max - min) * 0.3; // Closer to max (smaller loss)
      stdDev = (max - min) / 3;
      skew = -0.2; // Left skew for occasional big losses
      break;

    case 'sack':
      // Sacks cluster around -6 to -8 yards
      mean = min + (max - min) * 0.4;
      stdDev = (max - min) / 4;
      break;

    default:
      break;
  }

  // Matchup advantage shifts the distribution
  // Positive advantage = offense winning = better outcomes
  const advantageShift = (matchupAdvantage / 40) * (max - min) * 0.2;
  mean += advantageShift;

  return truncatedGaussian(mean, stdDev, min, max, skew);
}

/**
 * Roll against outcome table and return result
 *
 * @param table - Outcome table to roll against
 * @param matchupAdvantage - Optional matchup advantage for yard calculation (-40 to +40)
 * @returns The selected outcome with yards and effects
 */
export function rollOutcome(
  table: OutcomeTableEntry[],
  matchupAdvantage: number = 0
): {
  outcome: PlayOutcome;
  yards: number;
  secondaryEffects: SecondaryEffect[];
} {
  // Generate random roll (0-1)
  const roll = Math.random();

  // Walk through table accumulating probability
  let accumulated = 0;
  let selectedEntry: OutcomeTableEntry | null = null;

  for (const entry of table) {
    accumulated += entry.probability;
    if (roll <= accumulated) {
      selectedEntry = entry;
      break;
    }
  }

  // Fallback to last entry if somehow none selected
  if (!selectedEntry) {
    selectedEntry = table[table.length - 1];
  }

  // Calculate yards using enhanced Gaussian distribution
  const { min, max } = selectedEntry.yardsRange;
  const yards = calculateYardsGaussian(min, max, selectedEntry.outcome, matchupAdvantage);

  return {
    outcome: selectedEntry.outcome,
    yards,
    secondaryEffects: selectedEntry.secondaryEffects ?? [],
  };
}

/**
 * Generate field goal outcome table
 *
 * @param kickerRating - Kicker's effective rating
 * @param distance - Distance of the kick in yards
 * @param weather - Weather conditions modifier (-10 to +5)
 * @returns Outcome table for field goal
 */
export function generateFieldGoalTable(
  kickerRating: number,
  distance: number,
  weatherModifier: number
): OutcomeTableEntry[] {
  // Base probability based on distance
  let baseProbability: number;

  if (distance <= 30) {
    baseProbability = 0.95;
  } else if (distance <= 40) {
    baseProbability = 0.85;
  } else if (distance <= 50) {
    baseProbability = 0.7;
  } else if (distance <= 55) {
    baseProbability = 0.55;
  } else {
    baseProbability = 0.35;
  }

  // Apply kicker rating modifier
  // Rating 80+ improves, rating < 60 decreases
  const ratingModifier = (kickerRating - 70) / 100;
  baseProbability += ratingModifier;

  // Apply weather modifier
  baseProbability += weatherModifier / 100;

  // Clamp probability
  baseProbability = Math.max(0.1, Math.min(0.99, baseProbability));

  return [
    {
      outcome: 'field_goal_made',
      probability: baseProbability,
      yardsRange: { min: 0, max: 0 },
    },
    {
      outcome: 'field_goal_missed',
      probability: 1 - baseProbability,
      yardsRange: { min: 0, max: 0 },
    },
  ];
}

/**
 * Check if an outcome is a turnover
 */
export function isTurnover(outcome: PlayOutcome): boolean {
  return outcome === 'interception' || outcome === 'fumble_lost';
}

/**
 * Check if an outcome is positive for the offense
 */
export function isPositiveOutcome(outcome: PlayOutcome): boolean {
  return ['touchdown', 'big_gain', 'good_gain', 'moderate_gain', 'short_gain'].includes(outcome);
}

/**
 * Check if an outcome is negative for the offense
 */
export function isNegativeOutcome(outcome: PlayOutcome): boolean {
  return [
    'loss',
    'big_loss',
    'sack',
    'interception',
    'fumble',
    'fumble_lost',
    'penalty_offense',
  ].includes(outcome);
}

/**
 * Play Caller
 * Selects plays based on coordinator tendencies and game situation.
 * User never sees this - it just happens based on their OC/DC.
 */

import { OffensiveTendencies, DefensiveTendencies } from '../models/staff/CoordinatorTendencies';
import { PlayType } from './OutcomeTables';
import { WeatherCondition } from './EffectiveRatingCalculator';

/**
 * Context for making play call decisions
 */
export interface PlayCallContext {
  down: number;
  distance: number;
  fieldPosition: number; // Yards from own end zone
  timeRemaining: number; // Seconds remaining in game
  quarter: 1 | 2 | 3 | 4 | 'OT';
  scoreDifferential: number; // Positive = winning
  weather: WeatherCondition;
  isRedZone: boolean;
  isTwoMinuteWarning: boolean;
}

/**
 * Offensive formation types
 */
export type OffensiveFormation =
  | 'singleback'
  | 'i_formation'
  | 'shotgun'
  | 'pistol'
  | 'empty'
  | 'goal_line'
  | 'jumbo';

/**
 * Result of offensive play selection
 */
export interface OffensivePlayCall {
  playType: PlayType;
  targetPosition: string; // WR1, RB, TE, etc.
  formation: OffensiveFormation;
}

/**
 * Result of defensive play selection
 */
export interface DefensivePlayCall {
  coverage: string;
  blitz: boolean;
  pressRate: number;
}

/**
 * Calculate run probability based on tendencies and situation
 */
function calculateRunProbability(
  tendencies: OffensiveTendencies,
  context: PlayCallContext
): number {
  let baseProbability = tendencies.runPassSplit.run / 100;

  // Apply situational modifiers
  const { situational } = tendencies;

  // Score differential adjustments
  if (context.scoreDifferential >= 14) {
    baseProbability += situational.aheadBy14Plus.runModifier / 100;
  } else if (context.scoreDifferential <= -14) {
    baseProbability += situational.behindBy14Plus.runModifier / 100;
  }

  // Bad weather increases run probability
  if (context.weather.precipitation !== 'none' || context.weather.wind > 15) {
    baseProbability += situational.badWeather.runModifier / 100;
  }

  // Down and distance adjustments
  if (context.down === 1) {
    // First down - slightly more likely to run
    baseProbability += 0.05;
  } else if (context.down === 2 && context.distance <= 3) {
    // Short yardage - much more likely to run
    baseProbability += 0.2;
  } else if (context.down === 3) {
    if (context.distance <= 2) {
      // Third and short
      if (situational.thirdAndShort === 'run') {
        baseProbability += 0.3;
      } else if (situational.thirdAndShort === 'pass') {
        baseProbability -= 0.15;
      }
    } else if (context.distance > 7) {
      // Third and long - much less likely to run
      baseProbability -= 0.25;
    }
  } else if (context.down === 4) {
    // Fourth down - depends on distance
    if (context.distance <= 1) {
      baseProbability += 0.35; // QB sneak or run
    } else {
      baseProbability -= 0.3; // Need to pass
    }
  }

  // Red zone adjustments
  if (context.isRedZone) {
    if (situational.redZone === 'run') {
      baseProbability += 0.15;
    } else if (situational.redZone === 'pass') {
      baseProbability -= 0.1;
    }
  }

  // Goal line - increase run probability
  if (context.fieldPosition >= 97) {
    baseProbability += 0.25;
  }

  // Two minute warning - decrease run probability (unless winning big)
  if (context.isTwoMinuteWarning && context.scoreDifferential < 14) {
    baseProbability -= 0.3;
  }

  // Time pressure adjustments
  const isEndOfHalf = context.quarter === 2 || context.quarter === 4 || context.quarter === 'OT';
  if (isEndOfHalf && context.timeRemaining < 120 && context.scoreDifferential < 0) {
    baseProbability -= 0.35;
  }

  return Math.max(0.05, Math.min(0.9, baseProbability));
}

/**
 * Select run play type based on situation
 */
function selectRunPlayType(context: PlayCallContext): PlayType {
  // Goal line or short yardage - QB sneak or inside run
  if (context.distance <= 1 && context.down >= 3) {
    return Math.random() < 0.4 ? 'qb_sneak' : 'run_inside';
  }

  // Inside own 5 - no sweeps (risk of safety)
  if (context.fieldPosition < 5) {
    return Math.random() < 0.7 ? 'run_inside' : 'run_draw';
  }

  // Normal selection with weights
  const weights = [
    { type: 'run_inside' as PlayType, weight: 0.4 },
    { type: 'run_outside' as PlayType, weight: 0.25 },
    { type: 'run_draw' as PlayType, weight: 0.2 },
    { type: 'run_sweep' as PlayType, weight: 0.15 },
  ];

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;

  for (const { type, weight } of weights) {
    random -= weight;
    if (random <= 0) return type;
  }

  return 'run_inside';
}

/**
 * Select pass play type based on tendencies and situation
 */
function selectPassPlayType(tendencies: OffensiveTendencies, context: PlayCallContext): PlayType {
  // Determine if this should be play action
  const usePlayAction = Math.random() < tendencies.playActionRate / 100;

  // Determine depth
  let deepChance = tendencies.deepShotRate / 100;

  // Adjust for situation
  if (context.distance > 15) {
    // Long distance - more deep shots
    deepChance *= 1.5;
  } else if (context.distance <= 3) {
    // Short distance - fewer deep shots
    deepChance *= 0.5;
  }

  // Two minute drill - mix of short and medium
  if (context.isTwoMinuteWarning) {
    deepChance *= 0.7;
  }

  // Bad weather reduces deep passes
  if (context.weather.wind > 15 || context.weather.precipitation !== 'none') {
    deepChance *= 0.5;
  }

  // Red zone reduces deep passes
  if (context.isRedZone) {
    deepChance *= 0.3;
  }

  // Determine the depth
  const roll = Math.random();

  if (roll < deepChance) {
    // Deep pass
    return usePlayAction ? 'play_action_deep' : 'pass_deep';
  } else if (roll < deepChance + 0.35) {
    // Medium pass
    return 'pass_medium';
  } else if (roll < deepChance + 0.55) {
    // Short pass
    return usePlayAction ? 'play_action_short' : 'pass_short';
  } else {
    // Screen
    return 'pass_screen';
  }
}

/**
 * Select formation based on play type and situation
 */
function selectFormation(playType: PlayType, context: PlayCallContext): OffensiveFormation {
  // Goal line formations
  if (context.fieldPosition >= 98 || (context.distance <= 1 && context.down >= 3)) {
    if (playType.startsWith('run') || playType === 'qb_sneak') {
      return Math.random() < 0.6 ? 'goal_line' : 'jumbo';
    }
  }

  // Based on play type
  if (playType.startsWith('run') || playType === 'qb_sneak') {
    const roll = Math.random();
    if (roll < 0.35) return 'singleback';
    if (roll < 0.6) return 'i_formation';
    if (roll < 0.8) return 'pistol';
    return 'shotgun';
  }

  if (playType === 'pass_deep' || playType === 'play_action_deep') {
    return Math.random() < 0.6 ? 'shotgun' : 'pistol';
  }

  if (playType === 'pass_screen') {
    return Math.random() < 0.5 ? 'shotgun' : 'singleback';
  }

  // Default passing formation
  const roll = Math.random();
  if (roll < 0.45) return 'shotgun';
  if (roll < 0.65) return 'singleback';
  if (roll < 0.8) return 'pistol';
  return 'empty';
}

/**
 * Select target position based on play type
 */
function selectTargetPosition(playType: PlayType): string {
  if (playType.startsWith('run') || playType === 'qb_sneak' || playType === 'qb_scramble') {
    return playType === 'qb_sneak' || playType === 'qb_scramble' ? 'QB' : 'RB';
  }

  if (playType === 'pass_screen') {
    const roll = Math.random();
    if (roll < 0.5) return 'RB';
    if (roll < 0.8) return 'WR1';
    return 'TE';
  }

  if (playType === 'pass_deep' || playType === 'play_action_deep') {
    const roll = Math.random();
    if (roll < 0.6) return 'WR1';
    if (roll < 0.85) return 'WR2';
    return 'TE';
  }

  // Short/medium passes
  const roll = Math.random();
  if (roll < 0.35) return 'WR1';
  if (roll < 0.55) return 'WR2';
  if (roll < 0.7) return 'TE';
  if (roll < 0.85) return 'RB';
  return 'WR3';
}

/**
 * Select play based on coordinator tendencies and situation
 * User never sees this - it just happens based on their OC
 */
export function selectOffensivePlay(
  tendencies: OffensiveTendencies,
  context: PlayCallContext
): OffensivePlayCall {
  // Special case: QB scramble (rare, usually on broken plays)
  if (Math.random() < 0.02) {
    return {
      playType: 'qb_scramble',
      targetPosition: 'QB',
      formation: selectFormation('qb_scramble', context),
    };
  }

  // Calculate whether to run or pass
  const runProbability = calculateRunProbability(tendencies, context);
  const shouldRun = Math.random() < runProbability;

  let playType: PlayType;

  if (shouldRun) {
    playType = selectRunPlayType(context);
  } else {
    playType = selectPassPlayType(tendencies, context);
  }

  const formation = selectFormation(playType, context);
  const targetPosition = selectTargetPosition(playType);

  return {
    playType,
    targetPosition,
    formation,
  };
}

/**
 * Select defensive play based on tendencies and situation
 */
export function selectDefensivePlay(
  tendencies: DefensiveTendencies,
  context: PlayCallContext,
  offensiveFormation: OffensiveFormation
): DefensivePlayCall {
  let blitzRate = tendencies.blitzRate / 100;
  let manCoverageRate = tendencies.manCoverageRate / 100;
  let pressRate = tendencies.pressRate / 100;

  // Situational adjustments
  const { situational } = tendencies;

  // Red zone adjustments
  if (context.isRedZone) {
    if (situational.redZone === 'aggressive') {
      blitzRate += 0.15;
      pressRate += 0.1;
    } else {
      blitzRate -= 0.1;
    }
  }

  // Two minute drill adjustments
  if (context.isTwoMinuteWarning) {
    if (situational.twoMinuteDrill === 'prevent') {
      blitzRate -= 0.2;
      manCoverageRate -= 0.3;
    } else if (situational.twoMinuteDrill === 'blitz') {
      blitzRate += 0.2;
    }
  }

  // Third and long adjustments
  if (context.down === 3 && context.distance > 7) {
    if (situational.thirdAndLong === 'blitz') {
      blitzRate += 0.2;
    } else if (situational.thirdAndLong === 'coverage') {
      blitzRate -= 0.15;
      manCoverageRate -= 0.1;
    }
  }

  // Formation-based adjustments
  if (offensiveFormation === 'empty') {
    // More blitzing against empty sets
    blitzRate += 0.1;
    manCoverageRate += 0.1;
  } else if (offensiveFormation === 'i_formation' || offensiveFormation === 'goal_line') {
    // Less blitzing against heavy run formations
    blitzRate -= 0.1;
  }

  // Score-based adjustments
  if (context.scoreDifferential >= 14) {
    // Winning big - play conservative
    blitzRate -= 0.15;
  } else if (context.scoreDifferential <= -14) {
    // Losing big - more aggressive
    blitzRate += 0.1;
  }

  // Clamp values
  blitzRate = Math.max(0.05, Math.min(0.6, blitzRate));
  manCoverageRate = Math.max(0.1, Math.min(0.9, manCoverageRate));
  pressRate = Math.max(0.1, Math.min(0.9, pressRate));

  // Determine coverage type
  const blitz = Math.random() < blitzRate;
  const coverage = Math.random() < manCoverageRate ? 'man' : 'zone';

  // Adjust press rate if not in man coverage
  if (coverage === 'zone') {
    pressRate *= 0.3; // Much less pressing in zone
  }

  // If blitzing, usually use man coverage
  if (blitz && Math.random() < 0.7) {
    return {
      coverage: 'man',
      blitz: true,
      pressRate: Math.min(0.8, pressRate + 0.2),
    };
  }

  return {
    coverage,
    blitz,
    pressRate,
  };
}

/**
 * Should attempt field goal based on situation
 */
export function shouldAttemptFieldGoal(context: PlayCallContext, kickerRange: number): boolean {
  // Can't kick if not in range
  const kickDistance = 100 - context.fieldPosition + 17; // Add 17 for endzone + snap
  if (kickDistance > kickerRange) return false;

  // Fourth down only (or end of half)
  if (context.down !== 4) {
    // Check if end of half with time running out
    const isEndOfHalf = context.quarter === 2 || context.quarter === 4;
    if (!isEndOfHalf || context.timeRemaining > 5) return false;
  }

  // Distance considerations
  if (kickDistance <= 35) {
    return true; // Almost always kick short FGs
  }

  if (kickDistance <= 45) {
    // Medium range - kick unless it's 4th and short and close
    return context.distance > 2 || context.fieldPosition < 60;
  }

  // Long range - only kick if losing or tied
  return context.scoreDifferential <= 0;
}

/**
 * Should punt based on situation
 */
export function shouldPunt(context: PlayCallContext, aggressiveness: string): boolean {
  if (context.down !== 4) return false;

  // Never punt in opponent territory if aggressive
  if (context.fieldPosition >= 60 && aggressiveness === 'aggressive') {
    return false;
  }

  // Always punt deep in own territory
  if (context.fieldPosition < 35) {
    return true;
  }

  // Middle field - depends on distance and aggressiveness
  if (context.distance <= 2) {
    return aggressiveness === 'conservative';
  }

  if (context.distance <= 5) {
    return aggressiveness !== 'aggressive';
  }

  // Long distance - usually punt unless very aggressive
  return aggressiveness !== 'aggressive' || context.fieldPosition < 50;
}

/**
 * Create default play call context
 */
export function createDefaultPlayCallContext(): PlayCallContext {
  return {
    down: 1,
    distance: 10,
    fieldPosition: 25,
    timeRemaining: 900, // 15 minutes
    quarter: 1,
    scoreDifferential: 0,
    weather: {
      temperature: 70,
      precipitation: 'none',
      wind: 5,
      isDome: false,
    },
    isRedZone: false,
    isTwoMinuteWarning: false,
  };
}

/**
 * Stat Distribution System
 * Handles realistic distribution of targets, carries, and tackles.
 * Implements weighted random selection inspired by ZenGM's approach.
 *
 * This is COMPLETELY HIDDEN from users - they only see results.
 */

import { Player } from '../models/player/Player';
import { PlayType } from './OutcomeTables';
import { getPlayerFatigue, TeamGameState } from './TeamGameState';

// ============================================
// WEIGHTED RANDOM SELECTION
// ============================================

/**
 * Weighted random choice - core algorithm from ZenGM
 * Uses cumulative sums for efficient selection
 */
export function weightedRandomChoice<T>(items: T[], weights: number[]): T | null {
  if (items.length === 0 || weights.length === 0) return null;
  if (items.length !== weights.length) return null;

  // Filter out zero/negative weights
  const validItems: T[] = [];
  const validWeights: number[] = [];

  for (let i = 0; i < items.length; i++) {
    if (weights[i] > 0) {
      validItems.push(items[i]);
      validWeights.push(weights[i]);
    }
  }

  if (validItems.length === 0) return null;

  // Build cumulative sums
  const cumsums: number[] = [];
  let total = 0;
  for (const weight of validWeights) {
    total += weight;
    cumsums.push(total);
  }

  // Random selection
  const rand = Math.random() * total;
  for (let i = 0; i < cumsums.length; i++) {
    if (rand <= cumsums[i]) {
      return validItems[i];
    }
  }

  return validItems[validItems.length - 1];
}

// ============================================
// TARGET DISTRIBUTION
// ============================================

/**
 * Base target weights by position and depth
 * These represent the relative probability of being targeted
 */
const BASE_TARGET_WEIGHTS: Record<string, number> = {
  WR1: 1.0,
  WR2: 0.75,
  WR3: 0.5,
  SLOT: 0.55,
  TE: 0.5,
  TE2: 0.2,
  RB: 0.4,
  RB2: 0.15,
};

/**
 * Play type modifiers for target distribution
 * Adjusts weights based on the type of pass play called
 */
const PLAY_TYPE_TARGET_MODIFIERS: Record<PlayType, Partial<Record<string, number>>> = {
  pass_short: {
    WR1: 0.9,
    WR2: 1.0,
    WR3: 1.1,
    SLOT: 1.2,
    TE: 1.1,
    RB: 1.3,
  },
  pass_medium: {
    WR1: 1.1,
    WR2: 1.0,
    WR3: 0.9,
    SLOT: 0.95,
    TE: 1.0,
    RB: 0.8,
  },
  pass_deep: {
    WR1: 1.4,
    WR2: 1.1,
    WR3: 0.6,
    SLOT: 0.5,
    TE: 0.7,
    RB: 0.3,
  },
  pass_screen: {
    WR1: 0.7,
    WR2: 0.5,
    WR3: 0.4,
    SLOT: 0.5,
    TE: 0.6,
    RB: 2.0,
  },
  play_action_short: {
    WR1: 1.0,
    WR2: 0.95,
    WR3: 0.85,
    TE: 1.2,
    RB: 0.6,
  },
  play_action_deep: {
    WR1: 1.3,
    WR2: 1.1,
    WR3: 0.6,
    TE: 1.0,
    RB: 0.4,
  },
  // Non-pass plays shouldn't use this
  run_inside: {},
  run_outside: {},
  run_draw: {},
  run_sweep: {},
  qb_scramble: {},
  qb_sneak: {},
  field_goal: {},
  punt: {},
  kickoff: {},
};

/**
 * Situational modifiers for target distribution
 */
export interface TargetSituationContext {
  down: number;
  distance: number;
  isRedZone: boolean;
  isTwoMinuteDrill: boolean;
  scoreDifferential: number;
}

/**
 * Get situational modifier for a position
 */
function getSituationalTargetModifier(
  positionKey: string,
  context: TargetSituationContext
): number {
  let modifier = 1.0;

  // Red zone - TEs and possession receivers get more looks
  if (context.isRedZone) {
    if (positionKey === 'TE' || positionKey === 'TE2') {
      modifier *= 1.3;
    }
    if (positionKey === 'WR1') {
      modifier *= 1.15;
    }
    // Deep threats less useful in red zone
    if (positionKey === 'WR3') {
      modifier *= 0.8;
    }
  }

  // Two minute drill - sideline routes, reliable hands
  if (context.isTwoMinuteDrill) {
    if (positionKey === 'WR1' || positionKey === 'WR2') {
      modifier *= 1.2;
    }
    if (positionKey === 'RB') {
      modifier *= 0.7; // Less check-downs when hurrying
    }
  }

  // Third and short - RBs and TEs get more looks
  if (context.down === 3 && context.distance <= 3) {
    if (positionKey === 'RB') {
      modifier *= 1.4;
    }
    if (positionKey === 'TE') {
      modifier *= 1.2;
    }
  }

  // Third and long - WR1 and deep threats more likely
  if (context.down === 3 && context.distance >= 8) {
    if (positionKey === 'WR1') {
      modifier *= 1.3;
    }
    if (positionKey === 'RB') {
      modifier *= 0.6;
    }
  }

  // Down big - more deep shots to WR1
  if (context.scoreDifferential <= -14) {
    if (positionKey === 'WR1') {
      modifier *= 1.2;
    }
    if (positionKey === 'RB') {
      modifier *= 0.7;
    }
  }

  // Up big - more conservative, spread the ball
  if (context.scoreDifferential >= 14) {
    if (positionKey === 'WR1') {
      modifier *= 0.85;
    }
    if (positionKey === 'WR2' || positionKey === 'WR3') {
      modifier *= 1.1;
    }
    if (positionKey === 'RB') {
      modifier *= 1.2;
    }
  }

  return modifier;
}

/**
 * Receiver target candidate with weight calculation
 */
export interface TargetCandidate {
  player: Player;
  positionKey: string;
  weight: number;
}

/**
 * Select pass target using weighted distribution
 * This is the key fix for WR1 getting all targets
 */
export function selectPassTarget(
  receivers: Player[],
  playType: PlayType,
  situation: TargetSituationContext,
  teamState: TeamGameState
): Player | null {
  if (receivers.length === 0) return null;

  // Build candidates with position keys
  const candidates: TargetCandidate[] = [];
  const wrCount: Record<number, number> = {};
  const teCount: Record<number, number> = {};
  const rbCount: Record<number, number> = {};

  for (const player of receivers) {
    let positionKey: string;

    if (player.position === 'WR') {
      const wrIndex = (wrCount[0] ?? 0) + 1;
      wrCount[0] = wrIndex;
      positionKey = wrIndex <= 2 ? `WR${wrIndex}` : 'WR3';
      // WR3 could also be SLOT if it's the third receiver
      if (wrIndex === 3) {
        positionKey = 'SLOT';
      }
    } else if (player.position === 'TE') {
      const teIndex = (teCount[0] ?? 0) + 1;
      teCount[0] = teIndex;
      positionKey = teIndex === 1 ? 'TE' : 'TE2';
    } else if (player.position === 'RB') {
      const rbIndex = (rbCount[0] ?? 0) + 1;
      rbCount[0] = rbIndex;
      positionKey = rbIndex === 1 ? 'RB' : 'RB2';
    } else {
      continue; // Skip non-eligible receivers
    }

    // Calculate base weight
    let weight = BASE_TARGET_WEIGHTS[positionKey] ?? 0.3;

    // Apply play type modifier
    const playModifiers = PLAY_TYPE_TARGET_MODIFIERS[playType];
    if (playModifiers && playModifiers[positionKey]) {
      weight *= playModifiers[positionKey]!;
    }

    // Apply situational modifier
    weight *= getSituationalTargetModifier(positionKey, situation);

    // Apply fatigue modifier (tired players less effective at getting open)
    const fatigue = getPlayerFatigue(teamState, player.id);
    const fatigueMultiplier = Math.max(0.5, 1 - fatigue / 150); // 0.5-1.0 range
    weight *= fatigueMultiplier;

    // Apply player skill bonus (route running / catching)
    const routeRunning = player.skills.routeRunning
      ? (player.skills.routeRunning.perceivedMin + player.skills.routeRunning.perceivedMax) / 2
      : 50;
    const catching = player.skills.catching
      ? (player.skills.catching.perceivedMin + player.skills.catching.perceivedMax) / 2
      : 50;

    // Blend route running (80%) and catching (20%) like ZenGM
    const skillScore = routeRunning * 0.8 + catching * 0.2;
    const skillMultiplier = 0.7 + (skillScore / 100) * 0.6; // 0.7-1.3 range
    weight *= skillMultiplier;

    candidates.push({ player, positionKey, weight });
  }

  if (candidates.length === 0) return null;

  // Use weighted random selection
  return weightedRandomChoice(
    candidates.map((c) => c.player),
    candidates.map((c) => c.weight)
  );
}

// ============================================
// RB ROTATION
// ============================================

/**
 * RB rotation context
 */
export interface RBRotationContext {
  currentGameCarries: number;
  currentGameSnaps: number;
  down: number;
  distance: number;
  isRedZone: boolean;
  isGoalLine: boolean; // Inside 5 yard line
  isTwoMinuteDrill: boolean;
}

/**
 * RB role types that affect usage
 */
export type RBRole = 'bellcow' | 'committee' | 'thirdDown' | 'shortYardage' | 'speedBack';

/**
 * Base carry distribution by depth
 */
const RB_DEPTH_WEIGHTS: Record<number, number> = {
  1: 1.0, // RB1
  2: 0.35, // RB2
  3: 0.15, // RB3
};

/**
 * Select running back based on fatigue and situation
 * This fixes the RB1-only issue
 */
export function selectRunningBack(
  runningBacks: Player[],
  teamState: TeamGameState,
  context: RBRotationContext
): Player | null {
  if (runningBacks.length === 0) return null;
  if (runningBacks.length === 1) return runningBacks[0];

  const weights: number[] = [];

  for (let i = 0; i < runningBacks.length; i++) {
    const rb = runningBacks[i];
    const depthPosition = i + 1;

    // Base weight from depth
    let weight = RB_DEPTH_WEIGHTS[depthPosition] ?? 0.1;

    // Fatigue adjustment - THIS IS THE KEY FIX
    const fatigue = getPlayerFatigue(teamState, rb.id);

    // Heavy fatigue penalty for RB1 forces rotation
    if (fatigue > 70) {
      weight *= 0.3;
    } else if (fatigue > 50) {
      weight *= 0.6;
    } else if (fatigue > 30) {
      weight *= 0.85;
    }

    // Carries-based fatigue (RB1 with 15+ carries this game starts to tire)
    if (depthPosition === 1 && context.currentGameCarries >= 15) {
      weight *= 0.7;
    }
    if (depthPosition === 1 && context.currentGameCarries >= 20) {
      weight *= 0.6; // Stacks with above
    }

    // Situational adjustments
    // Short yardage - prefer power backs (typically RB1)
    if (context.distance <= 2 && context.down >= 3) {
      if (depthPosition === 1) {
        weight *= 1.4;
      }
    }

    // Goal line - short yardage specialist or RB1
    if (context.isGoalLine) {
      if (depthPosition === 1) {
        weight *= 1.5;
      }
    }

    // Third down / passing situations - pass-catching backs
    // RB2 often fills this role
    if (context.down === 3 && context.distance >= 5) {
      if (depthPosition === 2) {
        weight *= 1.4;
      }
    }

    // Two minute drill - pass catching back
    if (context.isTwoMinuteDrill) {
      if (depthPosition === 2) {
        weight *= 1.3;
      }
    }

    // Player skills affect weight
    const vision = rb.skills.vision
      ? (rb.skills.vision.perceivedMin + rb.skills.vision.perceivedMax) / 2
      : 50;
    const power = rb.skills.power
      ? (rb.skills.power.perceivedMin + rb.skills.power.perceivedMax) / 2
      : 50;

    const skillScore = (vision + power) / 2;
    const skillMultiplier = 0.8 + (skillScore / 100) * 0.4; // 0.8-1.2 range
    weight *= skillMultiplier;

    weights.push(Math.max(0.05, weight));
  }

  return weightedRandomChoice(runningBacks, weights);
}

// ============================================
// DEFENSIVE TACKLE ATTRIBUTION
// ============================================

/**
 * Position-based tackle rates (per play where they could be involved)
 * Based on NFL averages
 */
const POSITION_TACKLE_WEIGHTS: Record<string, { run: number; pass: number }> = {
  // Defensive Line - more run tackles, fewer pass tackles
  DE: { run: 0.8, pass: 0.3 },
  DT: { run: 0.7, pass: 0.2 },
  // Linebackers - most tackles overall
  ILB: { run: 1.0, pass: 0.7 },
  OLB: { run: 0.85, pass: 0.5 },
  // Secondary - fewer run tackles, more pass tackles
  SS: { run: 0.6, pass: 0.8 },
  FS: { run: 0.5, pass: 0.7 },
  CB: { run: 0.4, pass: 0.9 },
};

/**
 * Yards gained affects which positions make the tackle
 */
function getTackleWeightByYards(
  position: string,
  yardsGained: number,
  isPassPlay: boolean
): number {
  const baseWeights = POSITION_TACKLE_WEIGHTS[position];
  if (!baseWeights) return 0.3;

  const baseWeight = isPassPlay ? baseWeights.pass : baseWeights.run;

  // Short gains (behind LOS or 0-2 yards) - DL and LBs dominate
  if (yardsGained <= 2) {
    if (['DE', 'DT', 'ILB'].includes(position)) {
      return baseWeight * 1.5;
    }
    if (['CB', 'FS'].includes(position)) {
      return baseWeight * 0.4;
    }
  }

  // Medium gains (3-7 yards) - LBs and safeties
  if (yardsGained >= 3 && yardsGained <= 7) {
    if (['ILB', 'OLB', 'SS'].includes(position)) {
      return baseWeight * 1.3;
    }
    if (['DE', 'DT'].includes(position)) {
      return baseWeight * 0.7;
    }
  }

  // Longer gains (8+ yards) - secondary cleans up
  if (yardsGained >= 8) {
    if (['CB', 'FS', 'SS'].includes(position)) {
      return baseWeight * 1.4;
    }
    if (['DE', 'DT'].includes(position)) {
      return baseWeight * 0.3;
    }
    if (['ILB', 'OLB'].includes(position)) {
      return baseWeight * 0.8;
    }
  }

  return baseWeight;
}

/**
 * Tackle attribution context
 */
export interface TackleContext {
  playType: PlayType;
  yardsGained: number;
  outcome: string;
}

/**
 * Select primary tackler using weighted distribution
 * This fixes the DE-only tackle issue
 */
export function selectPrimaryTackler(
  defenders: Player[],
  context: TackleContext,
  teamState: TeamGameState
): Player | null {
  if (defenders.length === 0) return null;

  const isPassPlay = context.playType.includes('pass') || context.playType.includes('action');
  const weights: number[] = [];

  for (const defender of defenders) {
    const position = defender.position;

    // Base weight from position and yards gained
    let weight = getTackleWeightByYards(position, context.yardsGained, isPassPlay);

    // Sacks are primarily DL and blitzing LBs
    if (context.outcome === 'sack') {
      if (['DE', 'DT'].includes(position)) {
        weight *= 2.5;
      } else if (['OLB', 'ILB'].includes(position)) {
        weight *= 1.5;
      } else {
        weight *= 0.3;
      }
    }

    // Interceptions - secondary makes the play
    if (context.outcome === 'interception') {
      if (['CB', 'FS', 'SS'].includes(position)) {
        weight *= 2.0;
      } else if (['ILB', 'OLB'].includes(position)) {
        weight *= 1.2;
      } else {
        weight *= 0.2;
      }
    }

    // Apply player tackling skill
    const tackling = defender.skills.tackling
      ? (defender.skills.tackling.perceivedMin + defender.skills.tackling.perceivedMax) / 2
      : 50;
    const skillMultiplier = 0.7 + (tackling / 100) * 0.6;
    weight *= skillMultiplier;

    // Fatigue penalty
    const fatigue = getPlayerFatigue(teamState, defender.id);
    const fatigueMultiplier = Math.max(0.5, 1 - fatigue / 150);
    weight *= fatigueMultiplier;

    weights.push(Math.max(0.05, weight));
  }

  return weightedRandomChoice(defenders, weights);
}

/**
 * Determine if there should be an assist tackle (25% chance like ZenGM)
 */
export function shouldHaveAssistTackle(): boolean {
  return Math.random() < 0.25;
}

/**
 * Select assist tackler (different from primary)
 */
export function selectAssistTackler(
  defenders: Player[],
  primaryTacklerId: string,
  context: TackleContext,
  teamState: TeamGameState
): Player | null {
  // Filter out the primary tackler
  const eligibleDefenders = defenders.filter((d) => d.id !== primaryTacklerId);
  if (eligibleDefenders.length === 0) return null;

  // Use same logic but with reduced weights for LOS positions on long gains
  return selectPrimaryTackler(eligibleDefenders, context, teamState);
}

// ============================================
// COMPLETION PERCENTAGE ADJUSTMENTS
// ============================================

/**
 * Pressure level from pass rush
 */
export type PressureLevel = 'clean' | 'hurried' | 'pressured' | 'hit';

/**
 * Calculate pressure level based on OL vs DL matchup
 */
export function calculatePressureLevel(
  olRating: number,
  dlRating: number,
  isBlitz: boolean
): PressureLevel {
  const advantage = olRating - dlRating;

  // Blitz increases pressure chance
  const blitzModifier = isBlitz ? -10 : 0;
  const adjustedAdvantage = advantage + blitzModifier;

  const roll = Math.random() * 100;

  // Clean pocket when OL clearly winning
  if (adjustedAdvantage >= 10) {
    if (roll < 70) return 'clean';
    if (roll < 90) return 'hurried';
    return 'pressured';
  }

  // Neutral matchup
  if (adjustedAdvantage >= -5) {
    if (roll < 50) return 'clean';
    if (roll < 75) return 'hurried';
    if (roll < 95) return 'pressured';
    return 'hit';
  }

  // DL winning
  if (adjustedAdvantage >= -15) {
    if (roll < 30) return 'clean';
    if (roll < 55) return 'hurried';
    if (roll < 85) return 'pressured';
    return 'hit';
  }

  // DL dominating
  if (roll < 15) return 'clean';
  if (roll < 40) return 'hurried';
  if (roll < 75) return 'pressured';
  return 'hit';
}

/**
 * Pressure modifiers for completion probability
 * These are subtracted from base completion chance
 */
export const PRESSURE_COMPLETION_MODIFIERS: Record<PressureLevel, number> = {
  clean: 0,
  hurried: 0.08, // -8% completion
  pressured: 0.18, // -18% completion
  hit: 0.3, // -30% completion
};

/**
 * Pass distance modifiers
 */
export const DISTANCE_COMPLETION_MODIFIERS: Record<string, number> = {
  screen: 0.1, // +10% (easier)
  short: 0.03, // +3%
  medium: 0, // baseline
  deep: -0.18, // -18%
  bomb: -0.3, // -30%
};

/**
 * Coverage quality modifiers
 */
export type CoverageQuality = 'wide_open' | 'open' | 'contested' | 'tight' | 'double_covered';

export const COVERAGE_COMPLETION_MODIFIERS: Record<CoverageQuality, number> = {
  wide_open: 0.12, // +12%
  open: 0.05, // +5%
  contested: -0.08, // -8%
  tight: -0.15, // -15%
  double_covered: -0.25, // -25%
};

/**
 * Calculate coverage quality based on receiver vs defender matchup
 */
export function calculateCoverageQuality(
  receiverRating: number,
  defenderRating: number,
  isManCoverage: boolean
): CoverageQuality {
  const advantage = receiverRating - defenderRating;

  // Man coverage is tighter
  const coverageModifier = isManCoverage ? -5 : 5;
  const adjustedAdvantage = advantage + coverageModifier;

  const roll = Math.random() * 30 - 15; // -15 to +15 variance

  const finalAdvantage = adjustedAdvantage + roll;

  if (finalAdvantage >= 20) return 'wide_open';
  if (finalAdvantage >= 8) return 'open';
  if (finalAdvantage >= -5) return 'contested';
  if (finalAdvantage >= -15) return 'tight';
  return 'double_covered';
}

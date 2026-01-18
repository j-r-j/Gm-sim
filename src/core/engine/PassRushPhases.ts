/**
 * Pass Rush Phases
 * Multi-phase pass rush resolution that models pocket collapse timing.
 * Different phases emphasize different matchups and enable scramble mechanics.
 */

import { Player } from '../models/player/Player';
import { UnitRating } from './TeamCompositeRatings';

/**
 * Pass rush phase
 */
export type PassRushPhase = 'quick' | 'standard' | 'extended';

/**
 * Phase timing thresholds (in conceptual time units)
 */
export const PHASE_TIMING = {
  quick: { start: 0, end: 2 }, // 0-2 seconds - quick passes
  standard: { start: 2, end: 3.5 }, // 2-3.5 seconds - standard drops
  extended: { start: 3.5, end: 6 }, // 3.5+ seconds - extended plays
};

/**
 * Positional importance by phase
 */
export const PHASE_WEIGHTS: Record<PassRushPhase, Record<string, number>> = {
  quick: {
    // Interior pressure most important for quick passes
    DT: 1.5,
    C: 1.4,
    LG: 1.3,
    RG: 1.3,
    DE: 0.8,
    LT: 0.7,
    RT: 0.7,
    OLB: 0.6,
  },
  standard: {
    // Balanced - edge and interior both matter
    LT: 1.4,
    RT: 1.2,
    DE: 1.3,
    DT: 1.1,
    C: 1.0,
    LG: 1.0,
    RG: 1.0,
    OLB: 1.1,
  },
  extended: {
    // Edge rushers dominate, secondary rush matters
    LT: 1.5,
    RT: 1.3,
    DE: 1.5,
    OLB: 1.3,
    DT: 0.9,
    C: 0.8,
    LG: 0.8,
    RG: 0.8,
    ILB: 0.7, // Delayed blitzers
  },
};

/**
 * Pass rush phase result
 */
export interface PhaseResult {
  phase: PassRushPhase;
  /** Whether pressure reached the QB */
  pressureReached: boolean;
  /** Type of pressure (clean pocket, pressure, hurry, hit, sack) */
  pressureType: 'clean' | 'pressure' | 'hurry' | 'hit' | 'sack';
  /** Position that generated pressure (if any) */
  pressureSource: string | null;
  /** Modifier to pass completion (-20 to +10) */
  completionModifier: number;
  /** Modifier to sack probability */
  sackModifier: number;
  /** Whether QB can scramble */
  canScramble: boolean;
  /** Scramble direction if applicable */
  scrambleDirection: 'left' | 'right' | 'middle' | null;
}

/**
 * OL player with phase-specific rating
 */
interface OLPlayer {
  position: string;
  passBlockRating: number;
  player: Player;
}

/**
 * DL/LB player with phase-specific rating
 */
interface RusherPlayer {
  position: string;
  passRushRating: number;
  player: Player;
}

/**
 * Determine pass rush phase based on play type
 */
export function determinePassRushPhase(
  playType: string,
  isPlayAction: boolean,
  isScreen: boolean
): PassRushPhase {
  // Screens are released immediately
  if (isScreen) return 'quick';

  // Play action takes longer to develop
  if (isPlayAction) return 'extended';

  // Deep passes need more time
  if (playType === 'pass_deep' || playType === 'play_action_deep') {
    return 'extended';
  }

  // Short passes are quick
  if (playType === 'pass_short') {
    return 'quick';
  }

  // Medium passes are standard
  return 'standard';
}

/**
 * Calculate phase-adjusted matchup
 */
function calculatePhaseMatchup(
  olPlayers: OLPlayer[],
  rushers: RusherPlayer[],
  phase: PassRushPhase
): { advantage: number; weakLink: { position: string; deficit: number } | null } {
  const weights = PHASE_WEIGHTS[phase];

  // OL side: weighted average with weak link detection
  let olWeightedSum = 0;
  let olTotalWeight = 0;
  let olWeakest = { position: '', rating: 100, weightedRating: 100 };

  for (const ol of olPlayers) {
    const weight = weights[ol.position] || 1.0;
    olWeightedSum += ol.passBlockRating * weight;
    olTotalWeight += weight;

    const weightedRating = ol.passBlockRating * weight;
    if (weightedRating < olWeakest.weightedRating) {
      olWeakest = { position: ol.position, rating: ol.passBlockRating, weightedRating };
    }
  }
  const olAverage = olTotalWeight > 0 ? olWeightedSum / olTotalWeight : 50;

  // Rush side: weighted average
  let rushWeightedSum = 0;
  let rushTotalWeight = 0;
  let rushStrongest = { position: '', rating: 0 };

  for (const rusher of rushers) {
    const weight = weights[rusher.position] || 1.0;
    rushWeightedSum += rusher.passRushRating * weight;
    rushTotalWeight += weight;

    if (rusher.passRushRating > rushStrongest.rating) {
      rushStrongest = { position: rusher.position, rating: rusher.passRushRating };
    }
  }
  const rushAverage = rushTotalWeight > 0 ? rushWeightedSum / rushTotalWeight : 50;

  // Calculate advantage (positive = OL winning)
  const advantage = olAverage - rushAverage;

  // Check for weak link exploitation
  const weakLinkDeficit = olWeakest.rating - rushStrongest.rating;
  const weakLink =
    weakLinkDeficit < -15
      ? { position: olWeakest.position, deficit: Math.abs(weakLinkDeficit) }
      : null;

  return { advantage, weakLink };
}

/**
 * Resolve pass rush for a specific phase
 */
export function resolvePassRushPhase(
  passProtection: UnitRating,
  passRush: UnitRating,
  phase: PassRushPhase,
  qbMobility: number,
  isBlitz: boolean
): PhaseResult {
  // Base matchup from unit ratings
  let advantage = passProtection.effective - passRush.effective;

  // Phase-specific adjustments
  if (phase === 'quick') {
    // Quick passes favor offense - rush doesn't have time to develop
    advantage += 10;
  } else if (phase === 'extended') {
    // Extended plays favor rush - more time for pressure
    advantage -= 10;
  }

  // Blitz adjustment
  if (isBlitz) {
    // Blitz brings more rushers but leaves coverage holes
    advantage -= 8;
  }

  // Weak link consideration
  const weakLinkPenalty = passProtection.weakLinkPenalty;
  if (weakLinkPenalty > 10 && phase !== 'quick') {
    // Weak links get exposed over time
    advantage -= weakLinkPenalty * (phase === 'extended' ? 0.8 : 0.5);
  }

  // Add randomness
  const randomFactor = (Math.random() - 0.5) * 15;
  advantage += randomFactor;

  // Determine pressure result
  let pressureReached = false;
  let pressureType: PhaseResult['pressureType'] = 'clean';
  let completionModifier = 0;
  let sackModifier = 0;
  let canScramble = false;
  let scrambleDirection: PhaseResult['scrambleDirection'] = null;

  if (advantage >= 15) {
    // OL dominating - clean pocket
    pressureType = 'clean';
    completionModifier = 5;
    sackModifier = -0.5;
  } else if (advantage >= 5) {
    // OL winning - minor pressure
    pressureType = 'pressure';
    pressureReached = true;
    completionModifier = 0;
    sackModifier = 0;
  } else if (advantage >= -5) {
    // Even - QB hurried
    pressureType = 'hurry';
    pressureReached = true;
    completionModifier = -5;
    sackModifier = 0.3;

    // Mobile QBs can escape
    if (qbMobility >= 70) {
      canScramble = true;
      scrambleDirection = determineScrambleDirection(passProtection.weakLinkPosition);
    }
  } else if (advantage >= -15) {
    // Rush winning - QB hit
    pressureType = 'hit';
    pressureReached = true;
    completionModifier = -12;
    sackModifier = 0.6;

    // Very mobile QBs can still escape
    if (qbMobility >= 80) {
      canScramble = true;
      scrambleDirection = determineScrambleDirection(passProtection.weakLinkPosition);
    }
  } else {
    // Rush dominating - likely sack
    pressureType = 'sack';
    pressureReached = true;
    completionModifier = -20;
    sackModifier = 1.5;

    // Elite mobile QBs have a chance
    if (qbMobility >= 90 && Math.random() < 0.4) {
      canScramble = true;
      scrambleDirection = determineScrambleDirection(passProtection.weakLinkPosition);
    }
  }

  return {
    phase,
    pressureReached,
    pressureType,
    pressureSource: passRush.weakLinkPosition || null, // Best rusher
    completionModifier,
    sackModifier,
    canScramble,
    scrambleDirection,
  };
}

/**
 * Determine scramble direction based on where pressure is coming from
 */
function determineScrambleDirection(
  pressurePosition: string
): 'left' | 'right' | 'middle' {
  // QB escapes away from pressure
  if (pressurePosition === 'LT' || pressurePosition === 'LG') {
    return 'right'; // Pressure from left, escape right
  }
  if (pressurePosition === 'RT' || pressurePosition === 'RG') {
    return 'left'; // Pressure from right, escape left
  }
  // Interior pressure - escape up middle or random side
  return Math.random() < 0.5 ? 'left' : 'right';
}

/**
 * Calculate scramble outcome
 */
export function calculateScrambleOutcome(
  qbMobility: number,
  qbSpeed: number,
  defenseContainment: number,
  phase: PassRushPhase
): { yards: number; firstDown: boolean; outOfBounds: boolean } {
  // Base yards from mobility
  const baseMobility = (qbMobility - 50) / 10; // -5 to +5 based on mobility
  const baseSpeed = (qbSpeed - 50) / 15; // -3.3 to +3.3 based on speed

  // Extended plays = less room to run (defense recovering)
  const phaseModifier = phase === 'quick' ? 1.2 : phase === 'standard' ? 1.0 : 0.8;

  // Calculate expected yards (0-15 typical range)
  const expectedYards = Math.max(
    -3,
    (4 + baseMobility + baseSpeed) * phaseModifier + (Math.random() - 0.3) * 8
  );

  // Containment reduces yards
  const containmentFactor = 1 - (defenseContainment - 50) / 200;
  const actualYards = Math.round(expectedYards * containmentFactor);

  // Smart QBs slide/go out of bounds
  const outOfBounds = qbMobility >= 75 && Math.random() < 0.4;

  return {
    yards: actualYards,
    firstDown: actualYards >= 10, // Simplified - would need actual distance
    outOfBounds,
  };
}

/**
 * Get overall pass rush result combining all phases
 */
export function getOverallPassRushResult(
  passProtection: UnitRating,
  passRush: UnitRating,
  playType: string,
  qbMobility: number,
  isBlitz: boolean
): PhaseResult {
  const isPlayAction = playType.includes('action');
  const isScreen = playType === 'pass_screen';
  const phase = determinePassRushPhase(playType, isPlayAction, isScreen);

  return resolvePassRushPhase(passProtection, passRush, phase, qbMobility, isBlitz);
}

/**
 * Calculate protection time in conceptual seconds
 */
export function calculateProtectionTime(
  passProtection: UnitRating,
  passRush: UnitRating,
  isBlitz: boolean
): number {
  // Base time of 3 seconds
  let time = 3.0;

  // Advantage adds/subtracts time
  const advantage = passProtection.effective - passRush.effective;
  time += advantage / 30; // ±1.5 seconds based on 45-point swing

  // Blitz reduces time
  if (isBlitz) {
    time -= 0.5;
  }

  // Weak link reduces time
  if (passProtection.weakLinkPenalty > 10) {
    time -= passProtection.weakLinkPenalty / 30;
  }

  // Clamp to reasonable range
  return Math.max(1.5, Math.min(5.0, time));
}

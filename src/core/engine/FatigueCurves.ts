/**
 * Non-Linear Fatigue Curves
 * Position-specific fatigue curves that reflect real NFL usage patterns.
 * RBs degrade sharply after 20 touches, DL need heavy rotation, etc.
 */

import { Player } from '../models/player/Player';
import { hasTrait } from '../models/player/HiddenTraits';

/**
 * Fatigue curve type
 */
export type FatigueCurveType =
  | 'quarterback' // Gradual decline, can play full game
  | 'runningBack' // Sharp decline after 20+ touches
  | 'receiver' // High snap count tolerance, route quality degrades
  | 'offensiveLine' // Minimal degradation, injury risk increases
  | 'defensiveLine' // Heavy rotation needed, optimal 60-70% snap share
  | 'linebacker' // Moderate rotation, coverage degrades first
  | 'defensiveBack' // High snap tolerance, speed degrades late
  | 'specialist'; // Minimal fatigue

/**
 * Fatigue curve parameters
 */
export interface FatigueCurveParams {
  /** Touches/snaps at which degradation begins */
  degradationThreshold: number;
  /** Touches/snaps at which sharp decline begins */
  sharpDeclineThreshold: number;
  /** Effectiveness multiplier at degradation threshold */
  degradationMultiplier: number;
  /** Effectiveness multiplier at sharp decline */
  sharpDeclineMultiplier: number;
  /** Minimum effectiveness (floor) */
  minimumEffectiveness: number;
  /** Optimal snap share percentage (0-100) */
  optimalSnapShare: number;
  /** Whether this position should be heavily rotated */
  needsRotation: boolean;
}

/**
 * Fatigue curves by position type
 */
const FATIGUE_CURVES: Record<FatigueCurveType, FatigueCurveParams> = {
  quarterback: {
    degradationThreshold: 50, // QB can take 50 dropbacks before fatigue
    sharpDeclineThreshold: 70,
    degradationMultiplier: 0.98,
    sharpDeclineMultiplier: 0.93,
    minimumEffectiveness: 0.85,
    optimalSnapShare: 100, // QBs play every snap
    needsRotation: false,
  },
  runningBack: {
    degradationThreshold: 15, // RBs start fading after 15 touches
    sharpDeclineThreshold: 22, // Sharp drop after 22 touches
    degradationMultiplier: 0.95,
    sharpDeclineMultiplier: 0.82,
    minimumEffectiveness: 0.65,
    optimalSnapShare: 60, // Split backfield is optimal
    needsRotation: true,
  },
  receiver: {
    degradationThreshold: 35, // WRs can handle high snap counts
    sharpDeclineThreshold: 50,
    degradationMultiplier: 0.97,
    sharpDeclineMultiplier: 0.90,
    minimumEffectiveness: 0.80,
    optimalSnapShare: 85,
    needsRotation: false,
  },
  offensiveLine: {
    degradationThreshold: 55, // OL built for endurance
    sharpDeclineThreshold: 70,
    degradationMultiplier: 0.98,
    sharpDeclineMultiplier: 0.95,
    minimumEffectiveness: 0.88,
    optimalSnapShare: 100, // OL plays every snap
    needsRotation: false,
  },
  defensiveLine: {
    degradationThreshold: 25, // DL need rotation
    sharpDeclineThreshold: 35,
    degradationMultiplier: 0.92,
    sharpDeclineMultiplier: 0.78,
    minimumEffectiveness: 0.60,
    optimalSnapShare: 65, // Optimal snap share
    needsRotation: true,
  },
  linebacker: {
    degradationThreshold: 40,
    sharpDeclineThreshold: 55,
    degradationMultiplier: 0.95,
    sharpDeclineMultiplier: 0.85,
    minimumEffectiveness: 0.75,
    optimalSnapShare: 80,
    needsRotation: false, // Situational rotation
  },
  defensiveBack: {
    degradationThreshold: 45,
    sharpDeclineThreshold: 60,
    degradationMultiplier: 0.96,
    sharpDeclineMultiplier: 0.88,
    minimumEffectiveness: 0.78,
    optimalSnapShare: 90,
    needsRotation: false,
  },
  specialist: {
    degradationThreshold: 100, // Specialists don't fatigue from plays
    sharpDeclineThreshold: 150,
    degradationMultiplier: 1.0,
    sharpDeclineMultiplier: 0.98,
    minimumEffectiveness: 0.95,
    optimalSnapShare: 100,
    needsRotation: false,
  },
};

/**
 * Map position to fatigue curve type
 */
export function getPositionFatigueCurve(position: string): FatigueCurveType {
  switch (position) {
    case 'QB':
      return 'quarterback';
    case 'RB':
      return 'runningBack';
    case 'WR':
    case 'TE':
      return 'receiver';
    case 'LT':
    case 'LG':
    case 'C':
    case 'RG':
    case 'RT':
      return 'offensiveLine';
    case 'DE':
    case 'DT':
      return 'defensiveLine';
    case 'OLB':
    case 'ILB':
      return 'linebacker';
    case 'CB':
    case 'FS':
    case 'SS':
      return 'defensiveBack';
    case 'K':
    case 'P':
      return 'specialist';
    default:
      return 'linebacker'; // Default
  }
}

/**
 * Calculate effectiveness multiplier based on usage
 */
export function calculateFatigueEffectiveness(
  position: string,
  snapCount: number,
  touches: number, // For RBs - rushes + receptions
  player: Player
): number {
  const curveType = getPositionFatigueCurve(position);
  const curve = FATIGUE_CURVES[curveType];

  // Use touches for RBs, snap count for everyone else
  const usage = position === 'RB' ? touches : snapCount;

  let effectiveness = 1.0;

  if (usage <= curve.degradationThreshold) {
    // Below threshold - full effectiveness
    effectiveness = 1.0;
  } else if (usage <= curve.sharpDeclineThreshold) {
    // Gradual decline zone
    const degradationProgress =
      (usage - curve.degradationThreshold) /
      (curve.sharpDeclineThreshold - curve.degradationThreshold);
    effectiveness =
      1.0 - degradationProgress * (1.0 - curve.degradationMultiplier);
  } else {
    // Sharp decline zone
    const sharpProgress =
      (usage - curve.sharpDeclineThreshold) / (curve.sharpDeclineThreshold * 0.5);
    const baseDecline = curve.degradationMultiplier;
    const targetDecline = curve.sharpDeclineMultiplier;
    effectiveness = baseDecline - sharpProgress * (baseDecline - targetDecline);
  }

  // Apply trait modifiers
  if (hasTrait(player.hiddenTraits, 'ironMan')) {
    effectiveness = Math.min(1.0, effectiveness * 1.08);
  }
  if (hasTrait(player.hiddenTraits, 'motor')) {
    effectiveness = Math.min(1.0, effectiveness * 1.05);
  }
  if (hasTrait(player.hiddenTraits, 'lazy')) {
    effectiveness *= 0.95;
  }

  // Age modifier - older players fatigue faster
  const ageModifier = getAgeFatigueModifier(player.age);
  effectiveness *= ageModifier;

  // Clamp to minimum
  return Math.max(curve.minimumEffectiveness, Math.min(1.0, effectiveness));
}

/**
 * Get age-based fatigue modifier
 */
function getAgeFatigueModifier(age: number): number {
  if (age <= 25) return 1.02; // Young players recover better
  if (age <= 28) return 1.0; // Prime
  if (age <= 30) return 0.98;
  if (age <= 32) return 0.95;
  if (age <= 34) return 0.90;
  return 0.85; // 35+ significant decline
}

/**
 * Check if a player should be substituted based on fatigue
 */
export function shouldSubstituteForFatigue(
  position: string,
  snapCount: number,
  touches: number,
  currentFatigue: number
): { shouldSub: boolean; urgency: 'low' | 'medium' | 'high'; reason: string } {
  const curveType = getPositionFatigueCurve(position);
  const curve = FATIGUE_CURVES[curveType];

  if (!curve.needsRotation) {
    // Position doesn't need rotation unless extremely fatigued
    if (currentFatigue > 85) {
      return {
        shouldSub: true,
        urgency: 'high',
        reason: `${position} extremely fatigued`,
      };
    }
    return { shouldSub: false, urgency: 'low', reason: 'No substitution needed' };
  }

  const usage = position === 'RB' ? touches : snapCount;

  // Past sharp decline threshold - high urgency substitution
  if (usage > curve.sharpDeclineThreshold) {
    return {
      shouldSub: true,
      urgency: 'high',
      reason: `${position} past optimal usage (${usage} plays)`,
    };
  }

  // Past degradation threshold - medium urgency
  if (usage > curve.degradationThreshold) {
    return {
      shouldSub: true,
      urgency: 'medium',
      reason: `${position} approaching fatigue threshold`,
    };
  }

  // High fatigue level regardless of snap count
  if (currentFatigue > 75) {
    return {
      shouldSub: true,
      urgency: 'medium',
      reason: `${position} fatigue level high (${currentFatigue})`,
    };
  }

  return { shouldSub: false, urgency: 'low', reason: 'Player still fresh' };
}

/**
 * Calculate RB effectiveness based on touches this game
 */
export function calculateRBTouchEffectiveness(touches: number): {
  effectiveness: number;
  description: string;
} {
  if (touches <= 12) {
    return { effectiveness: 1.0, description: 'Fresh - full burst available' };
  }
  if (touches <= 15) {
    return { effectiveness: 0.98, description: 'Slightly winded but strong' };
  }
  if (touches <= 18) {
    return { effectiveness: 0.95, description: 'Starting to feel the load' };
  }
  if (touches <= 22) {
    return { effectiveness: 0.88, description: 'Heavy workload - losing burst' };
  }
  if (touches <= 25) {
    return { effectiveness: 0.78, description: 'Gassed - needs rest' };
  }
  if (touches <= 30) {
    return { effectiveness: 0.68, description: 'Running on fumes' };
  }
  return { effectiveness: 0.55, description: 'Completely exhausted - injury risk' };
}

/**
 * Calculate DL snap share effectiveness
 */
export function calculateDLSnapShareEffectiveness(
  snapsPlayed: number,
  totalTeamDefensiveSnaps: number
): { effectiveness: number; description: string } {
  const snapShare = totalTeamDefensiveSnaps > 0 ? snapsPlayed / totalTeamDefensiveSnaps : 0;

  if (snapShare <= 0.5) {
    return { effectiveness: 1.02, description: 'Fresh - high motor plays' };
  }
  if (snapShare <= 0.65) {
    return { effectiveness: 1.0, description: 'Optimal rotation - peak performance' };
  }
  if (snapShare <= 0.75) {
    return { effectiveness: 0.95, description: 'Slightly overused' };
  }
  if (snapShare <= 0.85) {
    return { effectiveness: 0.88, description: 'High snap count - losing pass rush' };
  }
  return { effectiveness: 0.78, description: 'No rotation - significantly diminished' };
}

/**
 * Get optimal rest plays before returning
 */
export function getOptimalRestPlays(position: string, currentFatigue: number): number {
  const curveType = getPositionFatigueCurve(position);

  // Base rest needs by position
  const baseRest: Record<FatigueCurveType, number> = {
    quarterback: 0, // QBs don't rotate
    runningBack: 3,
    receiver: 2,
    offensiveLine: 0,
    defensiveLine: 4, // DL need more rest
    linebacker: 3,
    defensiveBack: 2,
    specialist: 0,
  };

  let restPlays = baseRest[curveType];

  // Add more rest if very fatigued
  if (currentFatigue > 80) {
    restPlays += 3;
  } else if (currentFatigue > 60) {
    restPlays += 1;
  }

  return restPlays;
}

/**
 * Estimate injury risk multiplier based on fatigue
 */
export function getFatigueInjuryRiskMultiplier(
  position: string,
  snapCount: number,
  currentFatigue: number
): number {
  const curveType = getPositionFatigueCurve(position);
  const curve = FATIGUE_CURVES[curveType];

  let multiplier = 1.0;

  // Usage-based risk
  if (snapCount > curve.sharpDeclineThreshold) {
    multiplier += 0.5; // 50% higher injury risk
  } else if (snapCount > curve.degradationThreshold) {
    multiplier += 0.2;
  }

  // Fatigue-based risk
  if (currentFatigue > 80) {
    multiplier += 0.4;
  } else if (currentFatigue > 60) {
    multiplier += 0.15;
  }

  return multiplier;
}

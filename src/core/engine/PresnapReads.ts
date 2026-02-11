/**
 * Presnap Reads and Audibles
 * Models how QB intelligence affects play execution through presnap reads.
 * High IQ QBs can identify blitzes, change protections, and audible to better plays.
 */

import { Player } from '../models/player/Player';
import { PlayType } from './OutcomeTables';
import { DefensivePlayCall } from './PlayCaller';

/**
 * Helper functions for PlayType checking
 */
const RUN_PLAY_TYPES: PlayType[] = [
  'run_inside',
  'run_outside',
  'run_draw',
  'run_sweep',
  'qb_sneak',
];
const PASS_PLAY_TYPES: PlayType[] = [
  'pass_short',
  'pass_medium',
  'pass_deep',
  'pass_screen',
  'play_action_short',
  'play_action_deep',
];

function isRunPlayType(playType: PlayType): boolean {
  return RUN_PLAY_TYPES.indexOf(playType) !== -1;
}

function isPassPlayType(playType: PlayType): boolean {
  return PASS_PLAY_TYPES.indexOf(playType) !== -1;
}

/**
 * Presnap read result
 */
export interface PresnapReadResult {
  /** Whether QB identified the blitz */
  identifiedBlitz: boolean;
  /** Whether QB changed the protection */
  changedProtection: boolean;
  /** Whether QB audibled to a different play */
  audibled: boolean;
  /** New play type if audibled */
  newPlayType: PlayType | null;
  /** Modifier to play effectiveness */
  effectivenessModifier: number;
  /** Description of what happened presnap */
  description: string;
}

/**
 * QB mental attributes relevant to presnap reads
 */
export interface QBMentalAttributes {
  /** Decision making ability (1-100) */
  decisionMaking: number;
  /** Awareness/vision (1-100) */
  awareness: number;
  /** Football IQ (derived from experience and decision making) */
  footballIQ: number;
  /** Years of experience */
  experience: number;
}

/**
 * Get QB mental attributes from player
 */
export function getQBMentalAttributes(qb: Player): QBMentalAttributes {
  const decisionMaking = qb.skills.decisionMaking?.trueValue || 50;
  const awareness = qb.skills.awareness?.trueValue || 50;
  const experience = Math.min(15, Math.max(0, qb.age - 22)); // 0-15 years

  // Football IQ combines decision making, awareness, and experience
  const footballIQ = Math.round(
    decisionMaking * 0.4 + awareness * 0.3 + (50 + experience * 3) * 0.3
  );

  return {
    decisionMaking,
    awareness,
    footballIQ,
    experience,
  };
}

/**
 * Check if QB identifies an incoming blitz
 */
function checkBlitzIdentification(
  qbAttributes: QBMentalAttributes,
  isBlitzing: boolean,
  blitzRate: number
): boolean {
  if (!isBlitzing) return false;

  // Base identification chance from decision making
  let identifyChance = qbAttributes.decisionMaking / 100;

  // Awareness helps spot disguised blitzes
  identifyChance += (qbAttributes.awareness - 50) / 200;

  // Experience helps read defenses
  identifyChance += qbAttributes.experience * 0.02;

  // Obvious blitz packages are easier to identify
  if (blitzRate > 0.4) {
    identifyChance += 0.15; // Aggressive defense is more predictable
  }

  // Cap at 95% - even elite QBs can be fooled
  identifyChance = Math.min(0.95, identifyChance);

  return Math.random() < identifyChance;
}

/**
 * Determine if QB should change protection
 */
function shouldChangeProtection(
  qbAttributes: QBMentalAttributes,
  identifiedBlitz: boolean,
  weakLinkPosition: string | null
): boolean {
  if (!identifiedBlitz && !weakLinkPosition) return false;

  // Awareness threshold for changing protection
  const threshold = 70;

  if (qbAttributes.awareness >= threshold) {
    // High awareness QB will adjust protection
    if (identifiedBlitz) {
      return Math.random() < 0.8; // 80% chance to call protection change
    }
    if (weakLinkPosition) {
      return Math.random() < 0.5; // 50% chance to slide protection
    }
  }

  return false;
}

/**
 * Determine optimal audible based on defensive look
 */
function determineAudible(
  qbAttributes: QBMentalAttributes,
  originalPlay: PlayType,
  defensiveCall: DefensivePlayCall,
  boxCount: number // Number of defenders in the box (5-9)
): { shouldAudible: boolean; newPlay: PlayType | null; reason: string } {
  // Need high football IQ to audible effectively
  if (qbAttributes.footballIQ < 75) {
    return { shouldAudible: false, newPlay: null, reason: 'QB football IQ too low to audible' };
  }

  const isRun = isRunPlayType(originalPlay);
  const isPass = isPassPlayType(originalPlay);

  // Light box (5-6 defenders) - audible to run
  if (boxCount <= 6 && isPass && qbAttributes.footballIQ >= 80) {
    if (Math.random() < 0.6) {
      return {
        shouldAudible: true,
        newPlay: 'run_inside',
        reason: 'Light box detected - QB audibled to run',
      };
    }
  }

  // Heavy box (8-9 defenders) - audible to pass
  if (boxCount >= 8 && isRun && qbAttributes.footballIQ >= 80) {
    if (Math.random() < 0.6) {
      return {
        shouldAudible: true,
        newPlay: 'pass_short',
        reason: 'Stacked box detected - QB audibled to quick pass',
      };
    }
  }

  // Blitz detected - audible to hot route or screen
  if (defensiveCall.blitz && qbAttributes.footballIQ >= 85) {
    if (originalPlay === 'pass_deep' || originalPlay === 'play_action_deep') {
      if (Math.random() < 0.7) {
        return {
          shouldAudible: true,
          newPlay: Math.random() < 0.5 ? 'pass_short' : 'pass_screen',
          reason: 'Blitz detected - QB audibled to hot route/screen',
        };
      }
    }
  }

  // Man coverage vs zone - adjust route concepts
  if (defensiveCall.coverage === 'man' && qbAttributes.footballIQ >= 85) {
    // Man coverage is better attacked with motion and crossing routes
    // This doesn't change play type but affects execution
    if (originalPlay === 'pass_medium' && Math.random() < 0.3) {
      return {
        shouldAudible: true,
        newPlay: 'pass_deep',
        reason: 'Man coverage - QB called deep shot',
      };
    }
  }

  return { shouldAudible: false, newPlay: null, reason: 'No audible needed' };
}

/**
 * Calculate box count from defensive alignment
 */
export function estimateBoxCount(defensiveCall: DefensivePlayCall, fieldPosition: number): number {
  // Base box count
  let boxCount = 6;

  // Coverage affects box count
  if (defensiveCall.coverage === 'man') {
    boxCount -= 1; // Man coverage = fewer in box
  }

  // Blitz affects box count
  if (defensiveCall.blitz) {
    boxCount += 2;
  }

  // Press rate indicates aggressive front
  if (defensiveCall.pressRate > 0.7) {
    boxCount += 1;
  }

  // Field position adjustments
  if (fieldPosition >= 90) {
    boxCount += 1; // Goal line = more in box
  } else if (fieldPosition <= 20) {
    boxCount -= 1; // Deep in own territory = less aggressive
  }

  return Math.max(5, Math.min(9, boxCount));
}

/**
 * Execute presnap read and audible logic
 */
export function executePresnapRead(
  qb: Player,
  originalPlay: PlayType,
  defensiveCall: DefensivePlayCall,
  fieldPosition: number,
  weakLinkPosition: string | null
): PresnapReadResult {
  const qbAttributes = getQBMentalAttributes(qb);
  const boxCount = estimateBoxCount(defensiveCall, fieldPosition);

  // Check blitz identification
  const identifiedBlitz = checkBlitzIdentification(
    qbAttributes,
    defensiveCall.blitz,
    defensiveCall.pressRate
  );

  // Check protection change
  const changedProtection = shouldChangeProtection(qbAttributes, identifiedBlitz, weakLinkPosition);

  // Check audible
  const audibleResult = determineAudible(qbAttributes, originalPlay, defensiveCall, boxCount);

  // Calculate effectiveness modifier
  let effectivenessModifier = 0;
  const descriptions: string[] = [];

  // Identifying blitz helps
  if (identifiedBlitz) {
    effectivenessModifier += 8;
    descriptions.push('QB identified blitz presnap');

    // Hot route bonus
    if (audibleResult.shouldAudible && audibleResult.newPlay === 'pass_screen') {
      effectivenessModifier += 5;
    }
  } else if (defensiveCall.blitz) {
    // Failed to identify blitz - penalty
    effectivenessModifier -= 5;
    descriptions.push('QB missed blitz read');
  }

  // Protection change helps vs pressure
  if (changedProtection) {
    effectivenessModifier += 5;
    descriptions.push('QB adjusted protection');
  }

  // Good audibles help
  if (audibleResult.shouldAudible) {
    effectivenessModifier += 6;
    descriptions.push(audibleResult.reason);
  }

  // Build description
  const description =
    descriptions.length > 0 ? descriptions.join('. ') : 'Standard presnap execution';

  return {
    identifiedBlitz,
    changedProtection,
    audibled: audibleResult.shouldAudible,
    newPlayType: audibleResult.newPlay,
    effectivenessModifier,
    description,
  };
}

/**
 * Get hot route bonus when blitz is identified
 */
export function getHotRouteBonus(
  identifiedBlitz: boolean,
  qbDecisionMaking: number
): { completionBonus: number; yardsBonus: number } {
  if (!identifiedBlitz) {
    return { completionBonus: 0, yardsBonus: 0 };
  }

  // Hot routes vs blitz are high percentage plays
  const completionBonus = 10 + (qbDecisionMaking - 50) / 5;
  const yardsBonus = 3 + (qbDecisionMaking - 50) / 10;

  return {
    completionBonus: Math.max(0, Math.min(20, completionBonus)),
    yardsBonus: Math.max(0, Math.min(10, yardsBonus)),
  };
}

/**
 * Calculate protection change effectiveness
 */
export function getProtectionChangeBonus(
  changedProtection: boolean,
  wasBlitz: boolean,
  qbAwareness: number
): number {
  if (!changedProtection) return 0;

  if (wasBlitz) {
    // Correct protection call vs blitz is very effective
    return 10 + (qbAwareness - 50) / 10;
  }

  // Sliding protection when not necessary is slightly negative
  return -2;
}

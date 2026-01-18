/**
 * Situational Modifiers
 * Enhanced situational performance modifiers with granular awareness.
 * Different situations affect different player traits differently.
 */

import { Player } from '../models/player/Player';
import { hasTrait } from '../models/player/HiddenTraits';
import { GameStakes } from './EffectiveRatingCalculator';

/**
 * Specific game situations
 */
export type GameSituation =
  | 'normal'
  | 'thirdDownLong'
  | 'thirdDownShort'
  | 'fourthDown'
  | 'redZone'
  | 'goalLine'
  | 'twoMinuteDrill'
  | 'fourthQuarterComeback'
  | 'blowoutWinning'
  | 'blowoutLosing'
  | 'overtimePossession';

/**
 * Situation context for modifier calculation
 */
export interface SituationContext {
  down: number;
  distance: number;
  fieldPosition: number;
  quarter: number | 'OT';
  timeRemaining: number; // Seconds remaining in game
  scoreDifferential: number; // Positive = winning
  stakes: GameStakes;
}

/**
 * Modifier result for a situation
 */
export interface SituationalModifier {
  situation: GameSituation;
  /** Base modifier to all performance (-10 to +10) */
  baseModifier: number;
  /** Trait-specific modifiers */
  traitModifiers: Record<string, number>;
  /** Skill-specific modifiers */
  skillModifiers: Record<string, number>;
  /** Description of the situation */
  description: string;
}

/**
 * Determine the current game situation
 */
export function determineSituation(context: SituationContext): GameSituation {
  const { down, distance, fieldPosition, quarter, timeRemaining, scoreDifferential } = context;

  // Overtime
  if (quarter === 'OT') {
    return 'overtimePossession';
  }

  // Fourth quarter comeback situation
  if (
    quarter === 4 &&
    scoreDifferential < 0 &&
    scoreDifferential >= -16 &&
    timeRemaining <= 300 // 5 minutes or less
  ) {
    return 'fourthQuarterComeback';
  }

  // Two minute drill
  if ((quarter === 2 || quarter === 4) && timeRemaining <= 120 && scoreDifferential <= 7) {
    return 'twoMinuteDrill';
  }

  // Blowout situations
  if (scoreDifferential >= 21) {
    return 'blowoutWinning';
  }
  if (scoreDifferential <= -21) {
    return 'blowoutLosing';
  }

  // Goal line
  if (fieldPosition >= 97) {
    return 'goalLine';
  }

  // Red zone
  if (fieldPosition >= 80) {
    return 'redZone';
  }

  // Fourth down
  if (down === 4) {
    return 'fourthDown';
  }

  // Third down situations
  if (down === 3) {
    if (distance >= 8) {
      return 'thirdDownLong';
    }
    if (distance <= 2) {
      return 'thirdDownShort';
    }
  }

  return 'normal';
}

/**
 * Get situational modifier for a situation
 */
export function getSituationalModifier(situation: GameSituation): SituationalModifier {
  switch (situation) {
    case 'thirdDownLong':
      return {
        situation,
        baseModifier: 0,
        traitModifiers: {
          clutch: 8,
          chokes: -10,
          coolUnderPressure: 5,
          hotHead: -3,
        },
        skillModifiers: {
          accuracy: 3, // Need precise throws
          routeRunning: 5, // Need to get open
          decisionMaking: 5, // Need to make right read
        },
        description: 'Third and long - pressure situation for passing game',
      };

    case 'thirdDownShort':
      return {
        situation,
        baseModifier: 0,
        traitModifiers: {
          clutch: 5,
          chokes: -5,
          motor: 5, // Extra effort for short yardage
          lazy: -5,
        },
        skillModifiers: {
          power: 5, // Running through tackles
          runBlock: 5, // Short yardage blocking
          vision: 3, // Finding the hole
        },
        description: 'Third and short - physical short yardage situation',
      };

    case 'fourthDown':
      return {
        situation,
        baseModifier: -2, // Baseline pressure
        traitModifiers: {
          clutch: 10,
          chokes: -12,
          coolUnderPressure: 8,
          hotHead: -5,
          leader: 3,
        },
        skillModifiers: {
          decisionMaking: 8,
          awareness: 5,
        },
        description: 'Fourth down - must convert or give up possession',
      };

    case 'redZone':
      return {
        situation,
        baseModifier: 2, // Slightly elevated performance
        traitModifiers: {
          clutch: 6,
          chokes: -6,
          disappears: -8, // Bad trait shows up
        },
        skillModifiers: {
          accuracy: 4, // Tight windows
          contested: 6, // Jump balls matter
          manCoverage: 4, // Defenders are tighter
        },
        description: 'Red zone - condensed field, need to score',
      };

    case 'goalLine':
      return {
        situation,
        baseModifier: 3,
        traitModifiers: {
          clutch: 8,
          chokes: -8,
          motor: 6,
          lazy: -6,
          brickWall: 8, // OL trait matters
        },
        skillModifiers: {
          power: 10, // Physical battle
          runBlock: 8,
          runDefense: 8,
          strength: 5,
        },
        description: 'Goal line - maximum intensity short yardage',
      };

    case 'twoMinuteDrill':
      return {
        situation,
        baseModifier: 0,
        traitModifiers: {
          clutch: 10,
          chokes: -12,
          coolUnderPressure: 10,
          hotHead: -8,
          leader: 5,
        },
        skillModifiers: {
          decisionMaking: 10, // Clock management
          accuracy: 5, // Need completions
          routeRunning: 5, // Getting out of bounds
          mobility: 5, // Scrambling for yards
        },
        description: 'Two minute drill - race against the clock',
      };

    case 'fourthQuarterComeback':
      return {
        situation,
        baseModifier: 0,
        traitModifiers: {
          clutch: 12,
          chokes: -15,
          coolUnderPressure: 10,
          leader: 8,
          teamFirst: 5,
          diva: -5,
          disappears: -12,
        },
        skillModifiers: {
          decisionMaking: 8,
          awareness: 5,
          accuracy: 3,
        },
        description: 'Fourth quarter comeback - ultimate clutch situation',
      };

    case 'blowoutWinning':
      return {
        situation,
        baseModifier: -3, // Let off the gas
        traitModifiers: {
          motor: -5, // Even motor players coast
          lazy: -8, // Lazy players really coast
          teamFirst: -2, // Less urgent
        },
        skillModifiers: {},
        description: 'Blowout win - running out the clock',
      };

    case 'blowoutLosing':
      return {
        situation,
        baseModifier: -5, // Morale impact
        traitModifiers: {
          motor: 8, // Motor players still try
          lazy: -10, // Lazy players give up
          teamFirst: 5, // Team players keep fighting
          diva: -8, // Divas check out
          lockerRoomCancer: -10, // Negative impact amplified
        },
        skillModifiers: {},
        description: 'Blowout loss - fighting through adversity',
      };

    case 'overtimePossession':
      return {
        situation,
        baseModifier: 2, // Heightened focus
        traitModifiers: {
          clutch: 15,
          chokes: -18,
          coolUnderPressure: 12,
          leader: 8,
        },
        skillModifiers: {
          decisionMaking: 10,
          accuracy: 5,
          kickAccuracy: 10, // Kickers in OT
        },
        description: 'Overtime - next score could win it',
      };

    case 'normal':
    default:
      return {
        situation: 'normal',
        baseModifier: 0,
        traitModifiers: {},
        skillModifiers: {},
        description: 'Normal game situation',
      };
  }
}

/**
 * Calculate total situational modifier for a player
 */
export function calculatePlayerSituationalModifier(
  player: Player,
  context: SituationContext,
  relevantSkill: string
): number {
  const situation = determineSituation(context);
  const modifier = getSituationalModifier(situation);

  let totalModifier = modifier.baseModifier;

  // Apply trait modifiers
  for (const [trait, value] of Object.entries(modifier.traitModifiers)) {
    if (hasTrait(player.hiddenTraits, trait)) {
      totalModifier += value;
    }
  }

  // Apply skill modifiers if relevant
  const skillMod = modifier.skillModifiers[relevantSkill];
  if (skillMod) {
    totalModifier += skillMod;
  }

  // Stakes multiplier
  const stakesMultiplier = getStakesMultiplier(context.stakes);
  totalModifier *= stakesMultiplier;

  // Clamp to reasonable range
  return Math.max(-25, Math.min(25, totalModifier));
}

/**
 * Get stakes multiplier
 */
function getStakesMultiplier(stakes: GameStakes): number {
  switch (stakes) {
    case 'preseason':
      return 0.3;
    case 'regular':
      return 1.0;
    case 'rivalry':
      return 1.2;
    case 'playoff':
      return 1.5;
    case 'championship':
      return 2.0;
    default:
      return 1.0;
  }
}

/**
 * Get team-wide situational modifier
 */
export function getTeamSituationalModifier(context: SituationContext): number {
  const situation = determineSituation(context);
  const modifier = getSituationalModifier(situation);

  // Base modifier applies to whole team
  let teamModifier = modifier.baseModifier;

  // Stakes affect team motivation
  const stakesMultiplier = getStakesMultiplier(context.stakes);
  teamModifier *= stakesMultiplier;

  return teamModifier;
}

/**
 * Check if current situation is a "clutch" situation
 */
export function isClutchSituation(context: SituationContext): boolean {
  const situation = determineSituation(context);
  return [
    'fourthQuarterComeback',
    'overtimePossession',
    'fourthDown',
    'twoMinuteDrill',
  ].includes(situation);
}

/**
 * Check if current situation is a pressure situation
 */
export function isPressureSituation(context: SituationContext): boolean {
  const situation = determineSituation(context);
  return situation !== 'normal' && situation !== 'blowoutWinning' && situation !== 'blowoutLosing';
}

/**
 * Get situational play calling adjustment
 */
export function getSituationalPlayCallingAdjustment(
  context: SituationContext
): { runAdjustment: number; passAdjustment: number; aggressiveness: number } {
  const situation = determineSituation(context);

  switch (situation) {
    case 'thirdDownLong':
      return { runAdjustment: -20, passAdjustment: 20, aggressiveness: 0 };
    case 'thirdDownShort':
      return { runAdjustment: 25, passAdjustment: -10, aggressiveness: 10 };
    case 'goalLine':
      return { runAdjustment: 30, passAdjustment: -15, aggressiveness: 20 };
    case 'twoMinuteDrill':
      return { runAdjustment: -30, passAdjustment: 30, aggressiveness: 15 };
    case 'fourthQuarterComeback':
      return { runAdjustment: -15, passAdjustment: 15, aggressiveness: 10 };
    case 'blowoutWinning':
      return { runAdjustment: 20, passAdjustment: -20, aggressiveness: -20 };
    case 'blowoutLosing':
      return { runAdjustment: -10, passAdjustment: 10, aggressiveness: 5 };
    default:
      return { runAdjustment: 0, passAdjustment: 0, aggressiveness: 0 };
  }
}

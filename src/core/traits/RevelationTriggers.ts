/**
 * Revelation Triggers - defines when hidden traits can be revealed.
 *
 * Traits are NEVER shown as labels until confirmed through these triggers.
 * Each trigger defines the event type and conditions that can reveal a trait.
 */

import { PositiveTrait, NegativeTrait, Trait } from '../models/player/HiddenTraits';

/**
 * Types of game events that can trigger trait revelations
 */
export type GameEventType =
  | 'gameWinningPlay' // Game-winning play in final moments
  | 'playoffTouchdown' // Scored TD in playoff game
  | 'crucialDrop' // Dropped important pass
  | 'practiceAltercation' // Fight or incident at practice
  | 'penaltyEjection' // Ejected from game for penalty
  | 'fullSeasonPlayed' // Played every game in a season
  | 'injuryOccurred' // Player got injured
  | 'returnedFromInjury' // Came back from injury quickly
  | 'bigGamePerformance' // Outstanding performance in big game
  | 'bigGameDisappearance' // Poor performance in big game
  | 'mediaIncident' // Negative media attention
  | 'leadershipMoment' // Demonstrated leadership
  | 'filmStudyReport' // Coach reports on film study habits
  | 'practiceEffort' // Effort level in practice
  | 'schemeChange' // Team changed scheme
  | 'contractNegotiation' // Contract talks behavior
  | 'teamMeetingBehavior' // Behavior in team meetings
  | 'fumbleEvent' // Fumbled the ball
  | 'dropEvent'; // Dropped a pass

/**
 * Context information for a game event
 */
export interface GameEventContext {
  /** Type of event that occurred */
  eventType: GameEventType;

  /** Is this a playoff game? */
  isPlayoff: boolean;

  /** Quarter of the game (1-4, 5+ for overtime) */
  quarter?: number;

  /** Time remaining in the quarter (seconds) */
  timeRemaining?: number;

  /** Point differential at time of event (positive = winning) */
  scoreDifferential?: number;

  /** Is this a primetime game? */
  isPrimetime?: boolean;

  /** Current season number */
  season: number;

  /** Week number in the season */
  week: number;

  /** Games missed this season due to injury */
  gamesMissedThisSeason?: number;

  /** Consecutive seasons played every game */
  consecutiveFullSeasons?: number;

  /** Seasons with 4+ games missed */
  seasonsWithMajorInjuries?: number;

  /** Additional context data */
  metadata?: Record<string, unknown>;
}

/**
 * A trigger condition that can reveal a trait
 */
export interface RevelationTrigger {
  /** The trait this trigger can reveal */
  trait: Trait;

  /** Event types that can activate this trigger */
  eventTypes: GameEventType[];

  /** Base probability of revelation when trigger fires (0-1) */
  baseProbability: number;

  /** Description of what triggers this revelation */
  description: string;

  /** Check if the event context meets the trigger conditions */
  checkCondition: (context: GameEventContext) => boolean;

  /** Calculate the actual revelation probability based on context */
  calculateProbability: (context: GameEventContext) => number;
}

/**
 * Confidence level for a trait revelation
 */
export type ConfidenceLevel =
  | 'confirmed' // Trait is definitively revealed
  | 'strong' // Very likely has this trait (80%+)
  | 'moderate' // Likely has this trait (60-79%)
  | 'suspected' // May have this trait (40-59%)
  | 'hint'; // Slight indication of trait (20-39%)

/**
 * Gets a confidence level from a probability value
 */
export function getConfidenceLevel(probability: number): ConfidenceLevel {
  if (probability >= 1.0) return 'confirmed';
  if (probability >= 0.8) return 'strong';
  if (probability >= 0.6) return 'moderate';
  if (probability >= 0.4) return 'suspected';
  return 'hint';
}

/**
 * Check if event is in clutch time (4th quarter/OT, close game, <2 min)
 */
function isClutchTime(context: GameEventContext): boolean {
  const quarter = context.quarter ?? 0;
  const timeRemaining = context.timeRemaining ?? 900;
  const scoreDiff = Math.abs(context.scoreDifferential ?? 0);

  return quarter >= 4 && timeRemaining <= 120 && scoreDiff <= 8;
}

/**
 * Check if event is in a high-pressure situation
 */
function isHighPressure(context: GameEventContext): boolean {
  return context.isPlayoff || context.isPrimetime || isClutchTime(context);
}

// ============================================================================
// POSITIVE TRAIT TRIGGERS
// ============================================================================

/**
 * Clutch trait trigger - revealed through game-winning performances
 */
export const CLUTCH_TRIGGER: RevelationTrigger = {
  trait: 'clutch' as PositiveTrait,
  eventTypes: ['gameWinningPlay', 'playoffTouchdown', 'bigGamePerformance'],
  baseProbability: 0.6,
  description: 'Game-winning play in playoff or clutch situation',

  checkCondition: (context: GameEventContext): boolean => {
    if (context.eventType === 'gameWinningPlay') {
      return isClutchTime(context);
    }
    if (context.eventType === 'playoffTouchdown') {
      return context.isPlayoff;
    }
    if (context.eventType === 'bigGamePerformance') {
      return isHighPressure(context);
    }
    return false;
  },

  calculateProbability: (context: GameEventContext): number => {
    let probability = CLUTCH_TRIGGER.baseProbability;

    // Playoff bonus
    if (context.isPlayoff) probability += 0.2;

    // Late game bonus
    if (context.quarter && context.quarter >= 4) probability += 0.1;

    // Close game bonus
    if (context.scoreDifferential !== undefined && Math.abs(context.scoreDifferential) <= 3) {
      probability += 0.1;
    }

    return Math.min(probability, 1.0);
  },
};

/**
 * Iron Man trait trigger - revealed through durability over seasons
 */
export const IRON_MAN_TRIGGER: RevelationTrigger = {
  trait: 'ironMan' as PositiveTrait,
  eventTypes: ['fullSeasonPlayed', 'returnedFromInjury'],
  baseProbability: 0.5,
  description: 'Plays every game for 3+ consecutive seasons',

  checkCondition: (context: GameEventContext): boolean => {
    if (context.eventType === 'fullSeasonPlayed') {
      return (context.consecutiveFullSeasons ?? 0) >= 3;
    }
    if (context.eventType === 'returnedFromInjury') {
      // Quick recovery from minor injury
      return (context.gamesMissedThisSeason ?? 0) <= 1;
    }
    return false;
  },

  calculateProbability: (context: GameEventContext): number => {
    let probability = IRON_MAN_TRIGGER.baseProbability;

    // More consecutive seasons = higher probability
    const fullSeasons = context.consecutiveFullSeasons ?? 0;
    if (fullSeasons >= 5) probability += 0.4;
    else if (fullSeasons >= 4) probability += 0.3;
    else if (fullSeasons >= 3) probability += 0.2;

    return Math.min(probability, 1.0);
  },
};

/**
 * Leader trait trigger - revealed through leadership moments
 */
export const LEADER_TRIGGER: RevelationTrigger = {
  trait: 'leader' as PositiveTrait,
  eventTypes: ['leadershipMoment', 'teamMeetingBehavior'],
  baseProbability: 0.4,
  description: 'Demonstrated leadership in team settings',

  checkCondition: (context: GameEventContext): boolean => {
    return context.eventType === 'leadershipMoment' || context.eventType === 'teamMeetingBehavior';
  },

  calculateProbability: (context: GameEventContext): number => {
    let probability = LEADER_TRIGGER.baseProbability;

    // Veteran experience increases revelation chance
    if (context.season >= 5) probability += 0.2;
    else if (context.season >= 3) probability += 0.1;

    return Math.min(probability, 1.0);
  },
};

/**
 * Film Junkie trait trigger - revealed through preparation reports
 */
export const FILM_JUNKIE_TRIGGER: RevelationTrigger = {
  trait: 'filmJunkie' as PositiveTrait,
  eventTypes: ['filmStudyReport'],
  baseProbability: 0.35,
  description: 'Coach reports exceptional film study habits',

  checkCondition: (context: GameEventContext): boolean => {
    return context.eventType === 'filmStudyReport';
  },

  calculateProbability: (_context: GameEventContext): number => {
    return FILM_JUNKIE_TRIGGER.baseProbability;
  },
};

/**
 * Cool Under Pressure trait trigger - revealed through composure
 */
export const COOL_UNDER_PRESSURE_TRIGGER: RevelationTrigger = {
  trait: 'coolUnderPressure' as PositiveTrait,
  eventTypes: ['bigGamePerformance', 'gameWinningPlay'],
  baseProbability: 0.45,
  description: 'Maintained composure in high-pressure situations',

  checkCondition: (context: GameEventContext): boolean => {
    return isHighPressure(context);
  },

  calculateProbability: (context: GameEventContext): number => {
    let probability = COOL_UNDER_PRESSURE_TRIGGER.baseProbability;

    if (context.isPlayoff) probability += 0.25;
    if (isClutchTime(context)) probability += 0.15;

    return Math.min(probability, 1.0);
  },
};

/**
 * Motor trait trigger - revealed through consistent effort
 */
export const MOTOR_TRIGGER: RevelationTrigger = {
  trait: 'motor' as PositiveTrait,
  eventTypes: ['practiceEffort', 'bigGamePerformance'],
  baseProbability: 0.3,
  description: 'Consistently gives maximum effort',

  checkCondition: (context: GameEventContext): boolean => {
    return context.eventType === 'practiceEffort' || context.eventType === 'bigGamePerformance';
  },

  calculateProbability: (_context: GameEventContext): number => {
    return MOTOR_TRIGGER.baseProbability;
  },
};

/**
 * Team First trait trigger - revealed through selfless behavior
 */
export const TEAM_FIRST_TRIGGER: RevelationTrigger = {
  trait: 'teamFirst' as PositiveTrait,
  eventTypes: ['contractNegotiation', 'teamMeetingBehavior'],
  baseProbability: 0.35,
  description: 'Puts team success above personal stats/money',

  checkCondition: (context: GameEventContext): boolean => {
    return (
      context.eventType === 'contractNegotiation' || context.eventType === 'teamMeetingBehavior'
    );
  },

  calculateProbability: (_context: GameEventContext): number => {
    return TEAM_FIRST_TRIGGER.baseProbability;
  },
};

/**
 * Scheme Versatile trait trigger - revealed through scheme adaptation
 */
export const SCHEME_VERSATILE_TRIGGER: RevelationTrigger = {
  trait: 'schemeVersatile' as PositiveTrait,
  eventTypes: ['schemeChange', 'bigGamePerformance'],
  baseProbability: 0.4,
  description: 'Adapts well to different offensive/defensive schemes',

  checkCondition: (context: GameEventContext): boolean => {
    return context.eventType === 'schemeChange';
  },

  calculateProbability: (_context: GameEventContext): number => {
    return SCHEME_VERSATILE_TRIGGER.baseProbability;
  },
};

// ============================================================================
// NEGATIVE TRAIT TRIGGERS
// ============================================================================

/**
 * Chokes trait trigger - revealed through poor clutch performance
 */
export const CHOKES_TRIGGER: RevelationTrigger = {
  trait: 'chokes' as NegativeTrait,
  eventTypes: ['crucialDrop', 'bigGameDisappearance'],
  baseProbability: 0.5,
  description: 'Drops crucial pass or disappears in big moments',

  checkCondition: (context: GameEventContext): boolean => {
    if (context.eventType === 'crucialDrop') {
      return isClutchTime(context);
    }
    if (context.eventType === 'bigGameDisappearance') {
      return isHighPressure(context);
    }
    return false;
  },

  calculateProbability: (context: GameEventContext): number => {
    let probability = CHOKES_TRIGGER.baseProbability;

    // Playoff failure is more damning
    if (context.isPlayoff) probability += 0.25;

    // Clutch time failure
    if (isClutchTime(context)) probability += 0.15;

    return Math.min(probability, 1.0);
  },
};

/**
 * Injury Prone trait trigger - revealed through repeated injuries
 */
export const INJURY_PRONE_TRIGGER: RevelationTrigger = {
  trait: 'injuryProne' as NegativeTrait,
  eventTypes: ['injuryOccurred'],
  baseProbability: 0.4,
  description: 'Misses 4+ games in multiple seasons',

  checkCondition: (context: GameEventContext): boolean => {
    if (context.eventType !== 'injuryOccurred') return false;

    // Single season with 4+ games missed
    const gamesMissed = context.gamesMissedThisSeason ?? 0;
    const multiSeasonInjuries = context.seasonsWithMajorInjuries ?? 0;

    return gamesMissed >= 4 || multiSeasonInjuries >= 2;
  },

  calculateProbability: (context: GameEventContext): number => {
    let probability = INJURY_PRONE_TRIGGER.baseProbability;

    const multiSeasonInjuries = context.seasonsWithMajorInjuries ?? 0;

    // Multiple injury-plagued seasons
    if (multiSeasonInjuries >= 3) probability += 0.4;
    else if (multiSeasonInjuries >= 2) probability += 0.25;

    return Math.min(probability, 1.0);
  },
};

/**
 * Hot Head trait trigger - revealed through disciplinary issues
 */
export const HOT_HEAD_TRIGGER: RevelationTrigger = {
  trait: 'hotHead' as NegativeTrait,
  eventTypes: ['practiceAltercation', 'penaltyEjection'],
  baseProbability: 0.6,
  description: 'Fight at practice or ejected from game',

  checkCondition: (context: GameEventContext): boolean => {
    return context.eventType === 'practiceAltercation' || context.eventType === 'penaltyEjection';
  },

  calculateProbability: (context: GameEventContext): number => {
    let probability = HOT_HEAD_TRIGGER.baseProbability;

    // Practice fight is more telling
    if (context.eventType === 'practiceAltercation') {
      probability += 0.2;
    }

    return Math.min(probability, 1.0);
  },
};

/**
 * Lazy trait trigger - revealed through effort issues
 */
export const LAZY_TRIGGER: RevelationTrigger = {
  trait: 'lazy' as NegativeTrait,
  eventTypes: ['practiceEffort', 'filmStudyReport'],
  baseProbability: 0.35,
  description: "Doesn't give full effort in practice or film study",

  checkCondition: (context: GameEventContext): boolean => {
    return context.eventType === 'practiceEffort' || context.eventType === 'filmStudyReport';
  },

  calculateProbability: (_context: GameEventContext): number => {
    return LAZY_TRIGGER.baseProbability;
  },
};

/**
 * Locker Room Cancer trait trigger - revealed through team chemistry issues
 */
export const LOCKER_ROOM_CANCER_TRIGGER: RevelationTrigger = {
  trait: 'lockerRoomCancer' as NegativeTrait,
  eventTypes: ['teamMeetingBehavior', 'mediaIncident', 'practiceAltercation'],
  baseProbability: 0.4,
  description: 'Hurts team chemistry through behavior',

  checkCondition: (context: GameEventContext): boolean => {
    return (
      context.eventType === 'teamMeetingBehavior' ||
      context.eventType === 'mediaIncident' ||
      context.eventType === 'practiceAltercation'
    );
  },

  calculateProbability: (_context: GameEventContext): number => {
    return LOCKER_ROOM_CANCER_TRIGGER.baseProbability;
  },
};

/**
 * Glass Hands trait trigger - revealed through drops/fumbles
 */
export const GLASS_HANDS_TRIGGER: RevelationTrigger = {
  trait: 'glassHands' as NegativeTrait,
  eventTypes: ['fumbleEvent', 'dropEvent', 'crucialDrop'],
  baseProbability: 0.35,
  description: 'High fumble/drop rate',

  checkCondition: (context: GameEventContext): boolean => {
    return (
      context.eventType === 'fumbleEvent' ||
      context.eventType === 'dropEvent' ||
      context.eventType === 'crucialDrop'
    );
  },

  calculateProbability: (context: GameEventContext): number => {
    let probability = GLASS_HANDS_TRIGGER.baseProbability;

    // Crucial drops are more revealing
    if (context.eventType === 'crucialDrop') {
      probability += 0.15;
    }

    return Math.min(probability, 1.0);
  },
};

/**
 * Disappears trait trigger - revealed through inconsistent big game effort
 */
export const DISAPPEARS_TRIGGER: RevelationTrigger = {
  trait: 'disappears' as NegativeTrait,
  eventTypes: ['bigGameDisappearance'],
  baseProbability: 0.45,
  description: 'Inconsistent effort in big games',

  checkCondition: (context: GameEventContext): boolean => {
    return context.eventType === 'bigGameDisappearance' && isHighPressure(context);
  },

  calculateProbability: (context: GameEventContext): number => {
    let probability = DISAPPEARS_TRIGGER.baseProbability;

    if (context.isPlayoff) probability += 0.25;

    return Math.min(probability, 1.0);
  },
};

/**
 * System Dependent trait trigger - revealed through scheme struggles
 */
export const SYSTEM_DEPENDENT_TRIGGER: RevelationTrigger = {
  trait: 'systemDependent' as NegativeTrait,
  eventTypes: ['schemeChange'],
  baseProbability: 0.4,
  description: 'Only succeeds in specific schemes',

  checkCondition: (context: GameEventContext): boolean => {
    return context.eventType === 'schemeChange';
  },

  calculateProbability: (_context: GameEventContext): number => {
    return SYSTEM_DEPENDENT_TRIGGER.baseProbability;
  },
};

/**
 * Diva trait trigger - revealed through attention-seeking behavior
 */
export const DIVA_TRIGGER: RevelationTrigger = {
  trait: 'diva' as NegativeTrait,
  eventTypes: ['mediaIncident', 'contractNegotiation', 'teamMeetingBehavior'],
  baseProbability: 0.45,
  description: 'Demands attention and creates drama',

  checkCondition: (context: GameEventContext): boolean => {
    return (
      context.eventType === 'mediaIncident' ||
      context.eventType === 'contractNegotiation' ||
      context.eventType === 'teamMeetingBehavior'
    );
  },

  calculateProbability: (context: GameEventContext): number => {
    let probability = DIVA_TRIGGER.baseProbability;

    // Media incidents are very telling
    if (context.eventType === 'mediaIncident') {
      probability += 0.2;
    }

    return Math.min(probability, 1.0);
  },
};

// ============================================================================
// TRIGGER COLLECTIONS
// ============================================================================

/**
 * All positive trait triggers
 */
export const POSITIVE_TRIGGERS: RevelationTrigger[] = [
  CLUTCH_TRIGGER,
  IRON_MAN_TRIGGER,
  LEADER_TRIGGER,
  FILM_JUNKIE_TRIGGER,
  COOL_UNDER_PRESSURE_TRIGGER,
  MOTOR_TRIGGER,
  TEAM_FIRST_TRIGGER,
  SCHEME_VERSATILE_TRIGGER,
];

/**
 * All negative trait triggers
 */
export const NEGATIVE_TRIGGERS: RevelationTrigger[] = [
  CHOKES_TRIGGER,
  INJURY_PRONE_TRIGGER,
  HOT_HEAD_TRIGGER,
  LAZY_TRIGGER,
  LOCKER_ROOM_CANCER_TRIGGER,
  GLASS_HANDS_TRIGGER,
  DISAPPEARS_TRIGGER,
  SYSTEM_DEPENDENT_TRIGGER,
  DIVA_TRIGGER,
];

/**
 * All trait triggers
 */
export const ALL_TRIGGERS: RevelationTrigger[] = [...POSITIVE_TRIGGERS, ...NEGATIVE_TRIGGERS];

/**
 * Get triggers for a specific event type
 */
export function getTriggersForEvent(eventType: GameEventType): RevelationTrigger[] {
  return ALL_TRIGGERS.filter((trigger) => trigger.eventTypes.includes(eventType));
}

/**
 * Get the trigger for a specific trait
 */
export function getTriggerForTrait(trait: Trait): RevelationTrigger | undefined {
  return ALL_TRIGGERS.find((trigger) => trigger.trait === trait);
}

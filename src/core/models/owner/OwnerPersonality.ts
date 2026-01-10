/**
 * Owner Personality Model
 * Defines owner personality traits and intervention thresholds
 */

/**
 * Primary traits on a spectrum (1-100)
 */
export interface OwnerTraits {
  /** 1=impatient, 100=patient */
  patience: number;
  /** 1=cheap, 100=big spender */
  spending: number;
  /** 1=hands-off, 100=meddler */
  control: number;
  /** 1=ruthless, 100=loyal */
  loyalty: number;
  /** 1=humble, 100=egotistical - affects decision overrides */
  ego: number;
}

/**
 * Secondary trait flags that provide additional personality characteristics
 */
export type SecondaryTrait =
  | 'analyticsBeliever'
  | 'oldSchool'
  | 'winNow'
  | 'longTermThinker'
  | 'prObsessed'
  | 'playersOwner'
  | 'championshipOrBust';

/**
 * All possible secondary traits
 */
export const ALL_SECONDARY_TRAITS: SecondaryTrait[] = [
  'analyticsBeliever',
  'oldSchool',
  'winNow',
  'longTermThinker',
  'prObsessed',
  'playersOwner',
  'championshipOrBust',
];

/**
 * Intervention triggers - when owner steps in
 */
export interface InterventionTriggers {
  /** Number of games in a losing streak before owner calls */
  losingStreakLength: number;
  /** Fan approval percentage below which owner meddles */
  fanApprovalFloor: number;
  /** PR crisis sensitivity (1-100, lower = more sensitive) */
  mediaScrutinyThreshold: number;
}

/**
 * Complete owner personality profile
 */
export interface OwnerPersonality {
  traits: OwnerTraits;
  secondaryTraits: SecondaryTrait[];
  interventionTriggers: InterventionTriggers;
}

/**
 * Validates owner traits are within valid range
 */
export function validateOwnerTraits(traits: OwnerTraits): boolean {
  const { patience, spending, control, loyalty, ego } = traits;

  if (patience < 1 || patience > 100) return false;
  if (spending < 1 || spending > 100) return false;
  if (control < 1 || control > 100) return false;
  if (loyalty < 1 || loyalty > 100) return false;
  if (ego < 1 || ego > 100) return false;

  return true;
}

/**
 * Validates intervention triggers
 */
export function validateInterventionTriggers(triggers: InterventionTriggers): boolean {
  const { losingStreakLength, fanApprovalFloor, mediaScrutinyThreshold } = triggers;

  if (losingStreakLength < 1 || losingStreakLength > 17) return false;
  if (fanApprovalFloor < 0 || fanApprovalFloor > 100) return false;
  if (mediaScrutinyThreshold < 1 || mediaScrutinyThreshold > 100) return false;

  return true;
}

/**
 * Validates complete owner personality
 */
export function validateOwnerPersonality(personality: OwnerPersonality): boolean {
  if (!validateOwnerTraits(personality.traits)) return false;
  if (!validateInterventionTriggers(personality.interventionTriggers)) return false;

  // Validate secondary traits
  for (const trait of personality.secondaryTraits) {
    if (!ALL_SECONDARY_TRAITS.includes(trait)) return false;
  }

  // Check for conflicting traits
  const hasWinNow = personality.secondaryTraits.includes('winNow');
  const hasLongTerm = personality.secondaryTraits.includes('longTermThinker');
  if (hasWinNow && hasLongTerm) return false; // Conflicting traits

  const hasAnalytics = personality.secondaryTraits.includes('analyticsBeliever');
  const hasOldSchool = personality.secondaryTraits.includes('oldSchool');
  if (hasAnalytics && hasOldSchool) return false; // Conflicting traits

  return true;
}

/**
 * Creates a default owner personality
 */
export function createDefaultOwnerPersonality(): OwnerPersonality {
  return {
    traits: {
      patience: 50,
      spending: 50,
      control: 50,
      loyalty: 50,
      ego: 50,
    },
    secondaryTraits: [],
    interventionTriggers: {
      losingStreakLength: 4,
      fanApprovalFloor: 40,
      mediaScrutinyThreshold: 50,
    },
  };
}

/**
 * Gets a human-readable description for a secondary trait
 */
export function getSecondaryTraitDescription(trait: SecondaryTrait): string {
  const descriptions: Record<SecondaryTrait, string> = {
    analyticsBeliever: 'Trusts advanced metrics and data-driven decisions',
    oldSchool: 'Prefers traditional football philosophy',
    winNow: 'Focused on immediate results at any cost',
    longTermThinker: 'Willing to sacrifice short-term for future success',
    prObsessed: 'Highly concerned with public image and media perception',
    playersOwner: 'Values player relationships and loyalty',
    championshipOrBust: 'Only considers seasons successful with a championship',
  };

  return descriptions[trait];
}

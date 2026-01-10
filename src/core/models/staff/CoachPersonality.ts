/**
 * Coach Personality Model
 * Defines personality types and interaction rules for coaches
 */

/**
 * Personality types for coaches
 */
export type PersonalityType =
  | 'analytical'
  | 'aggressive'
  | 'conservative'
  | 'innovative'
  | 'oldSchool'
  | 'playersCoach';

/**
 * Coach personality profile
 */
export interface CoachPersonality {
  primary: PersonalityType;
  secondary: PersonalityType | null;
  ego: number; // 1-100 scale (hidden from UI)
  adaptability: number; // 1-100 scale (hidden from UI)

  // How they interact with others
  conflictsWith: PersonalityType[];
  synergizesWith: PersonalityType[];
}

/**
 * Personality conflict rules (FOR ENGINE USE ONLY)
 * Maps each personality type to types it conflicts with
 */
export const PERSONALITY_CONFLICTS: Record<PersonalityType, PersonalityType[]> = {
  analytical: ['aggressive'],
  aggressive: ['conservative', 'analytical'],
  conservative: ['aggressive', 'innovative'],
  innovative: ['oldSchool', 'conservative'],
  oldSchool: ['innovative'],
  playersCoach: [],
};

/**
 * Personality synergy rules (FOR ENGINE USE ONLY)
 * Maps each personality type to types it synergizes with
 */
export const PERSONALITY_SYNERGIES: Record<PersonalityType, PersonalityType[]> = {
  analytical: ['innovative', 'conservative'],
  aggressive: ['playersCoach'],
  conservative: ['analytical', 'oldSchool'],
  innovative: ['analytical', 'playersCoach'],
  oldSchool: ['conservative'],
  playersCoach: ['aggressive', 'innovative'],
};

/**
 * All valid personality types
 */
export const ALL_PERSONALITY_TYPES: PersonalityType[] = [
  'analytical',
  'aggressive',
  'conservative',
  'innovative',
  'oldSchool',
  'playersCoach',
];

/**
 * Checks if two personality types conflict (FOR ENGINE USE ONLY)
 */
export function hasPersonalityConflict(type1: PersonalityType, type2: PersonalityType): boolean {
  return (
    PERSONALITY_CONFLICTS[type1].includes(type2) || PERSONALITY_CONFLICTS[type2].includes(type1)
  );
}

/**
 * Checks if two personality types synergize (FOR ENGINE USE ONLY)
 */
export function hasPersonalitySynergy(type1: PersonalityType, type2: PersonalityType): boolean {
  return (
    PERSONALITY_SYNERGIES[type1].includes(type2) || PERSONALITY_SYNERGIES[type2].includes(type1)
  );
}

/**
 * Calculates personality chemistry between two coaches (FOR ENGINE USE ONLY)
 * Returns a value from -10 to +10
 */
export function calculatePersonalityChemistry(
  personality1: CoachPersonality,
  personality2: CoachPersonality
): number {
  let chemistry = 0;

  // Check primary vs primary
  if (hasPersonalityConflict(personality1.primary, personality2.primary)) {
    chemistry -= 5;
  }
  if (hasPersonalitySynergy(personality1.primary, personality2.primary)) {
    chemistry += 5;
  }

  // Check secondary interactions if present
  if (personality1.secondary) {
    if (hasPersonalityConflict(personality1.secondary, personality2.primary)) {
      chemistry -= 2;
    }
    if (hasPersonalitySynergy(personality1.secondary, personality2.primary)) {
      chemistry += 2;
    }
  }

  if (personality2.secondary) {
    if (hasPersonalityConflict(personality1.primary, personality2.secondary)) {
      chemistry -= 2;
    }
    if (hasPersonalitySynergy(personality1.primary, personality2.secondary)) {
      chemistry += 2;
    }
  }

  // Ego clash - high ego coaches conflict more
  if (personality1.ego > 80 && personality2.ego > 80) {
    chemistry -= 3;
  }

  // Clamp to -10 to +10
  return Math.max(-10, Math.min(10, chemistry));
}

/**
 * Creates a default coach personality
 */
export function createDefaultPersonality(
  primary: PersonalityType = 'analytical'
): CoachPersonality {
  return {
    primary,
    secondary: null,
    ego: 50,
    adaptability: 50,
    conflictsWith: PERSONALITY_CONFLICTS[primary],
    synergizesWith: PERSONALITY_SYNERGIES[primary],
  };
}

/**
 * Validates a coach personality structure
 */
export function validatePersonality(personality: CoachPersonality): boolean {
  if (!ALL_PERSONALITY_TYPES.includes(personality.primary)) {
    return false;
  }

  if (personality.secondary !== null && !ALL_PERSONALITY_TYPES.includes(personality.secondary)) {
    return false;
  }

  if (personality.ego < 1 || personality.ego > 100) {
    return false;
  }

  if (personality.adaptability < 1 || personality.adaptability > 100) {
    return false;
  }

  return true;
}

/**
 * Gets a display-safe description of personality type for UI
 */
export function getPersonalityDescription(type: PersonalityType): string {
  const descriptions: Record<PersonalityType, string> = {
    analytical: 'Methodical and data-driven approach',
    aggressive: 'Bold and risk-taking style',
    conservative: 'Careful and traditional methods',
    innovative: 'Creative and forward-thinking',
    oldSchool: 'Time-tested fundamentals',
    playersCoach: 'Strong player relationships',
  };

  return descriptions[type];
}

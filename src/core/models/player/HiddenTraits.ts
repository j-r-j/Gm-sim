/**
 * Positive hidden traits that benefit a player.
 * These are NEVER shown directly to the user, only revealed through in-game events.
 */
export type PositiveTrait =
  | 'clutch' // Performs better in high-pressure situations
  | 'filmJunkie' // Studies film extensively, better preparation
  | 'ironMan' // Rarely gets injured, quick recovery
  | 'leader' // Improves teammates' performance
  | 'coolUnderPressure' // Maintains composure in tough situations
  | 'motor' // Always gives maximum effort
  | 'routeTechnician' // Exceptional route running precision
  | 'brickWall' // Exceptional at holding ground (OL/DL)
  | 'schemeVersatile' // Adapts well to different schemes
  | 'teamFirst'; // Puts team success above personal stats

/**
 * Negative hidden traits that harm a player.
 * These are NEVER shown directly to the user, only revealed through in-game events.
 */
export type NegativeTrait =
  | 'chokes' // Performs worse in high-pressure situations
  | 'lazy' // Doesn't give full effort in practice/games
  | 'injuryProne' // Gets injured more frequently
  | 'lockerRoomCancer' // Hurts team chemistry
  | 'hotHead' // Prone to penalties and ejections
  | 'glassHands' // High fumble/drop rate
  | 'disappears' // Inconsistent effort in big games
  | 'systemDependent' // Only succeeds in specific schemes
  | 'diva'; // Demands attention, creates drama

/**
 * All trait types combined
 */
export type Trait = PositiveTrait | NegativeTrait;

/**
 * Hidden traits container for a player.
 * The actual traits are hidden from the user until revealed through gameplay.
 */
export interface HiddenTraits {
  /** Positive traits the player has (hidden from user) */
  positive: PositiveTrait[];

  /** Negative traits the player has (hidden from user) */
  negative: NegativeTrait[];

  /** Traits that have been discovered/revealed to the user */
  revealedToUser: string[];
}

/**
 * All possible positive traits
 */
export const ALL_POSITIVE_TRAITS: PositiveTrait[] = [
  'clutch',
  'filmJunkie',
  'ironMan',
  'leader',
  'coolUnderPressure',
  'motor',
  'routeTechnician',
  'brickWall',
  'schemeVersatile',
  'teamFirst',
];

/**
 * All possible negative traits
 */
export const ALL_NEGATIVE_TRAITS: NegativeTrait[] = [
  'chokes',
  'lazy',
  'injuryProne',
  'lockerRoomCancer',
  'hotHead',
  'glassHands',
  'disappears',
  'systemDependent',
  'diva',
];

/**
 * Creates an empty hidden traits object
 */
export function createEmptyHiddenTraits(): HiddenTraits {
  return {
    positive: [],
    negative: [],
    revealedToUser: [],
  };
}

/**
 * Checks if a specific trait has been revealed to the user
 */
export function isTraitRevealed(traits: HiddenTraits, trait: Trait): boolean {
  return traits.revealedToUser.includes(trait);
}

/**
 * Reveals a trait to the user (mutates the traits object)
 */
export function revealTrait(traits: HiddenTraits, trait: Trait): void {
  if (!traits.revealedToUser.includes(trait)) {
    traits.revealedToUser.push(trait);
  }
}

/**
 * Gets only the traits that have been revealed to the user
 */
export function getRevealedTraits(traits: HiddenTraits): string[] {
  return [...traits.revealedToUser];
}

/**
 * Checks if a player has a specific trait (for engine use only)
 */
export function hasTrait(traits: HiddenTraits, trait: Trait): boolean {
  return (
    traits.positive.includes(trait as PositiveTrait) ||
    traits.negative.includes(trait as NegativeTrait)
  );
}

/**
 * Offensive scheme types
 */
export type OffensiveScheme =
  | 'westCoast' // Short, quick passes with YAC emphasis
  | 'airRaid' // Spread formations, high-volume passing
  | 'spreadOption' // Read-option, QB run threat
  | 'powerRun' // Gap scheme, physical running
  | 'zoneRun' // Zone blocking, one-cut runners
  | 'playAction'; // Heavy play-action, vertical passing

/**
 * Defensive scheme types
 */
export type DefensiveScheme =
  | 'fourThreeUnder' // 4-3 Under, strong side emphasis
  | 'threeFour' // 3-4, versatile front
  | 'coverThree' // Cover 3, single high safety
  | 'coverTwo' // Cover 2, two deep safeties
  | 'manPress' // Man coverage with press
  | 'blitzHeavy'; // Aggressive blitzing

/**
 * How well a player fits a particular scheme
 */
export type FitLevel =
  | 'perfect' // +15% effectiveness
  | 'good' // +7% effectiveness
  | 'neutral' // No modifier
  | 'poor' // -7% effectiveness
  | 'terrible'; // -15% effectiveness

/**
 * Scheme fits for a player.
 * Hidden scores that determine how well a player performs in different systems.
 */
export interface SchemeFits {
  /** Fit levels for each offensive scheme */
  offensive: Record<OffensiveScheme, FitLevel>;

  /** Fit levels for each defensive scheme */
  defensive: Record<DefensiveScheme, FitLevel>;
}

/**
 * All offensive schemes
 */
export const ALL_OFFENSIVE_SCHEMES: OffensiveScheme[] = [
  'westCoast',
  'airRaid',
  'spreadOption',
  'powerRun',
  'zoneRun',
  'playAction',
];

/**
 * All defensive schemes
 */
export const ALL_DEFENSIVE_SCHEMES: DefensiveScheme[] = [
  'fourThreeUnder',
  'threeFour',
  'coverThree',
  'coverTwo',
  'manPress',
  'blitzHeavy',
];

/**
 * Effectiveness modifiers for each fit level (FOR ENGINE USE ONLY)
 */
export const FIT_LEVEL_MODIFIERS: Record<FitLevel, number> = {
  perfect: 0.15,
  good: 0.07,
  neutral: 0,
  poor: -0.07,
  terrible: -0.15,
};

/**
 * Creates default scheme fits (all neutral)
 */
export function createDefaultSchemeFits(): SchemeFits {
  const offensive = {} as Record<OffensiveScheme, FitLevel>;
  const defensive = {} as Record<DefensiveScheme, FitLevel>;

  for (const scheme of ALL_OFFENSIVE_SCHEMES) {
    offensive[scheme] = 'neutral';
  }

  for (const scheme of ALL_DEFENSIVE_SCHEMES) {
    defensive[scheme] = 'neutral';
  }

  return { offensive, defensive };
}

/**
 * Gets the effectiveness modifier for a player in a specific scheme.
 * FOR ENGINE USE ONLY.
 */
export function getSchemeModifier(
  fits: SchemeFits,
  scheme: OffensiveScheme | DefensiveScheme
): number {
  if (ALL_OFFENSIVE_SCHEMES.includes(scheme as OffensiveScheme)) {
    return FIT_LEVEL_MODIFIERS[fits.offensive[scheme as OffensiveScheme]];
  }
  return FIT_LEVEL_MODIFIERS[fits.defensive[scheme as DefensiveScheme]];
}

/**
 * Gets a qualitative description of scheme fit for UI display.
 * Does NOT reveal the actual fit level, just a vague description.
 */
export function getSchemeFitDescription(
  fits: SchemeFits,
  scheme: OffensiveScheme | DefensiveScheme
): string {
  let fitLevel: FitLevel;

  if (ALL_OFFENSIVE_SCHEMES.includes(scheme as OffensiveScheme)) {
    fitLevel = fits.offensive[scheme as OffensiveScheme];
  } else {
    fitLevel = fits.defensive[scheme as DefensiveScheme];
  }

  // Return vague descriptions, not exact fit levels
  switch (fitLevel) {
    case 'perfect':
    case 'good':
      return 'Good fit';
    case 'neutral':
      return 'Average fit';
    case 'poor':
    case 'terrible':
      return 'Poor fit';
  }
}

/**
 * Validates scheme fits structure
 */
export function validateSchemeFits(fits: SchemeFits): boolean {
  const validFitLevels: FitLevel[] = ['perfect', 'good', 'neutral', 'poor', 'terrible'];

  for (const scheme of ALL_OFFENSIVE_SCHEMES) {
    if (!validFitLevels.includes(fits.offensive[scheme])) {
      return false;
    }
  }

  for (const scheme of ALL_DEFENSIVE_SCHEMES) {
    if (!validFitLevels.includes(fits.defensive[scheme])) {
      return false;
    }
  }

  return true;
}

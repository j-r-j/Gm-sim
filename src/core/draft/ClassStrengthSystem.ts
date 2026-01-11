/**
 * Class Strength System
 * Determines the overall quality of a draft class, affecting the distribution
 * of elite prospects and skill ceilings.
 */

import { weightedRandom, randomInt, clampedNormal } from '../generators/utils/RandomUtils';

/**
 * Draft class strength levels
 */
export enum ClassStrength {
  HISTORIC = 'HISTORIC', // Generational class (e.g., 1983 QB class)
  STRONG = 'STRONG', // Above average class
  AVERAGE = 'AVERAGE', // Normal distribution
  WEAK = 'WEAK', // Below average class
  POOR = 'POOR', // Very weak class
}

/**
 * Class strength descriptions for UI
 */
export const CLASS_STRENGTH_DESCRIPTIONS: Record<ClassStrength, string> = {
  [ClassStrength.HISTORIC]:
    'A once-in-a-decade draft class with exceptional talent at multiple positions',
  [ClassStrength.STRONG]:
    'A talent-rich class with above-average depth and several potential stars',
  [ClassStrength.AVERAGE]: 'A typical draft class with normal talent distribution',
  [ClassStrength.WEAK]: 'A below-average class with limited high-end talent',
  [ClassStrength.POOR]: 'A historically weak class with very few impact players',
};

/**
 * Configuration for how class strength affects prospect generation
 */
export interface ClassStrengthModifiers {
  /** Multiplier for elite prospect count (1.0 = normal) */
  eliteMultiplier: number;
  /** Multiplier for starter-quality prospect count */
  starterMultiplier: number;
  /** Modifier to skill ceiling distribution (added to base) */
  ceilingModifier: number;
  /** Modifier to skill floor distribution (added to base) */
  floorModifier: number;
  /** Percentage of prospects with higher "it factor" */
  itFactorBoost: number;
  /** Percentage chance a prospect develops faster than expected */
  fastDeveloperChance: number;
}

/**
 * Modifiers for each class strength level
 */
export const CLASS_STRENGTH_MODIFIERS: Record<ClassStrength, ClassStrengthModifiers> = {
  [ClassStrength.HISTORIC]: {
    eliteMultiplier: 2.0,
    starterMultiplier: 1.5,
    ceilingModifier: 8,
    floorModifier: 5,
    itFactorBoost: 0.3,
    fastDeveloperChance: 0.2,
  },
  [ClassStrength.STRONG]: {
    eliteMultiplier: 1.4,
    starterMultiplier: 1.2,
    ceilingModifier: 4,
    floorModifier: 2,
    itFactorBoost: 0.15,
    fastDeveloperChance: 0.12,
  },
  [ClassStrength.AVERAGE]: {
    eliteMultiplier: 1.0,
    starterMultiplier: 1.0,
    ceilingModifier: 0,
    floorModifier: 0,
    itFactorBoost: 0.0,
    fastDeveloperChance: 0.08,
  },
  [ClassStrength.WEAK]: {
    eliteMultiplier: 0.6,
    starterMultiplier: 0.8,
    ceilingModifier: -4,
    floorModifier: -3,
    itFactorBoost: -0.1,
    fastDeveloperChance: 0.05,
  },
  [ClassStrength.POOR]: {
    eliteMultiplier: 0.3,
    starterMultiplier: 0.6,
    ceilingModifier: -8,
    floorModifier: -6,
    itFactorBoost: -0.2,
    fastDeveloperChance: 0.02,
  },
};

/**
 * Tier distribution for a draft class (percentage at each tier)
 */
export interface TierDistribution {
  elite: number;
  starter: number;
  backup: number;
  fringe: number;
}

/**
 * Base tier distribution for an average class
 */
export const BASE_TIER_DISTRIBUTION: TierDistribution = {
  elite: 0.05, // 5%
  starter: 0.2, // 20%
  backup: 0.35, // 35%
  fringe: 0.4, // 40%
};

/**
 * Position-specific class strength modifiers
 * Some classes are strong at specific positions
 */
export interface PositionStrengthModifiers {
  /** Which positions are particularly strong this class */
  strongPositions: string[];
  /** Which positions are particularly weak this class */
  weakPositions: string[];
  /** Modifier applied to strong positions */
  strongModifier: number;
  /** Modifier applied to weak positions */
  weakModifier: number;
}

/**
 * Generates random class strength with weighted probabilities
 */
export function generateClassStrength(): ClassStrength {
  return weightedRandom([
    { value: ClassStrength.HISTORIC, weight: 0.05 }, // 5% - rare
    { value: ClassStrength.STRONG, weight: 0.2 }, // 20%
    { value: ClassStrength.AVERAGE, weight: 0.5 }, // 50% - most common
    { value: ClassStrength.WEAK, weight: 0.2 }, // 20%
    { value: ClassStrength.POOR, weight: 0.05 }, // 5% - rare
  ]);
}

/**
 * Generates class strength with year-based seeding for consistency
 * @param year - Draft year
 */
export function generateClassStrengthForYear(year: number): ClassStrength {
  // Use year to create some determinism while still being random
  // This ensures the same year always generates the same strength
  const yearSeed = year % 100;

  // Cycle through strengths in a pseudo-random pattern
  if (yearSeed % 20 === 3) return ClassStrength.HISTORIC;
  if (yearSeed % 5 === 0) return ClassStrength.STRONG;
  if (yearSeed % 5 === 4) return ClassStrength.WEAK;
  if (yearSeed % 20 === 17) return ClassStrength.POOR;

  return ClassStrength.AVERAGE;
}

/**
 * Gets the modifiers for a class strength level
 */
export function getClassStrengthModifiers(strength: ClassStrength): ClassStrengthModifiers {
  return CLASS_STRENGTH_MODIFIERS[strength];
}

/**
 * Calculates adjusted tier distribution based on class strength
 */
export function calculateTierDistribution(strength: ClassStrength): TierDistribution {
  const modifiers = CLASS_STRENGTH_MODIFIERS[strength];

  const elite = Math.min(
    0.15,
    Math.max(0.01, BASE_TIER_DISTRIBUTION.elite * modifiers.eliteMultiplier)
  );
  const starter = Math.min(
    0.35,
    Math.max(0.1, BASE_TIER_DISTRIBUTION.starter * modifiers.starterMultiplier)
  );

  // Adjust backup and fringe to maintain 100% total
  const remaining = 1.0 - elite - starter;
  const backupRatio =
    BASE_TIER_DISTRIBUTION.backup / (BASE_TIER_DISTRIBUTION.backup + BASE_TIER_DISTRIBUTION.fringe);

  return {
    elite,
    starter,
    backup: remaining * backupRatio,
    fringe: remaining * (1 - backupRatio),
  };
}

/**
 * Gets a weighted tier for a prospect based on class strength
 */
export function getProspectTier(
  strength: ClassStrength
): 'elite' | 'starter' | 'backup' | 'fringe' {
  const distribution = calculateTierDistribution(strength);

  return weightedRandom([
    { value: 'elite' as const, weight: distribution.elite },
    { value: 'starter' as const, weight: distribution.starter },
    { value: 'backup' as const, weight: distribution.backup },
    { value: 'fringe' as const, weight: distribution.fringe },
  ]);
}

/**
 * Applies class strength modifier to a skill value
 */
export function applySkillModifier(
  baseValue: number,
  strength: ClassStrength,
  isCeiling: boolean
): number {
  const modifiers = CLASS_STRENGTH_MODIFIERS[strength];
  const modifier = isCeiling ? modifiers.ceilingModifier : modifiers.floorModifier;

  return Math.max(1, Math.min(100, baseValue + modifier));
}

/**
 * Generates position-specific strength modifiers for a class
 * This creates variation in which positions are strong/weak each year
 */
export function generatePositionStrengthModifiers(
  allPositions: string[]
): PositionStrengthModifiers {
  // Select 2-4 strong positions
  const numStrong = randomInt(2, 4);
  const shuffled = [...allPositions].sort(() => Math.random() - 0.5);
  const strongPositions = shuffled.slice(0, numStrong);

  // Select 2-4 weak positions (not overlapping with strong)
  const numWeak = randomInt(2, 4);
  const remaining = shuffled.slice(numStrong);
  const weakPositions = remaining.slice(0, numWeak);

  return {
    strongPositions,
    weakPositions,
    strongModifier: clampedNormal(1.2, 0.15, 1.05, 1.5),
    weakModifier: clampedNormal(0.8, 0.15, 0.5, 0.95),
  };
}

/**
 * Gets the position modifier for a specific position
 */
export function getPositionModifier(
  position: string,
  positionModifiers: PositionStrengthModifiers
): number {
  if (positionModifiers.strongPositions.includes(position)) {
    return positionModifiers.strongModifier;
  }
  if (positionModifiers.weakPositions.includes(position)) {
    return positionModifiers.weakModifier;
  }
  return 1.0;
}

/**
 * Draft class metadata including strength and modifiers
 */
export interface DraftClassMeta {
  /** Draft year */
  year: number;
  /** Overall class strength */
  strength: ClassStrength;
  /** Class strength description */
  description: string;
  /** Modifiers for this class strength */
  modifiers: ClassStrengthModifiers;
  /** Position-specific modifiers */
  positionModifiers: PositionStrengthModifiers;
  /** Tier distribution for this class */
  tierDistribution: TierDistribution;
}

/**
 * Creates draft class metadata for a given year
 */
export function createDraftClassMeta(year: number, positions: string[]): DraftClassMeta {
  const strength = generateClassStrength();

  return {
    year,
    strength,
    description: CLASS_STRENGTH_DESCRIPTIONS[strength],
    modifiers: CLASS_STRENGTH_MODIFIERS[strength],
    positionModifiers: generatePositionStrengthModifiers(positions),
    tierDistribution: calculateTierDistribution(strength),
  };
}

/**
 * Creates draft class metadata with specified strength
 */
export function createDraftClassMetaWithStrength(
  year: number,
  positions: string[],
  strength: ClassStrength
): DraftClassMeta {
  return {
    year,
    strength,
    description: CLASS_STRENGTH_DESCRIPTIONS[strength],
    modifiers: CLASS_STRENGTH_MODIFIERS[strength],
    positionModifiers: generatePositionStrengthModifiers(positions),
    tierDistribution: calculateTierDistribution(strength),
  };
}

/**
 * Validates draft class metadata
 */
export function validateDraftClassMeta(meta: DraftClassMeta): boolean {
  if (!meta.year || meta.year < 2000 || meta.year > 2100) return false;
  if (!Object.values(ClassStrength).includes(meta.strength)) return false;
  if (!meta.description || typeof meta.description !== 'string') return false;
  if (!meta.modifiers || typeof meta.modifiers !== 'object') return false;
  if (!meta.positionModifiers || typeof meta.positionModifiers !== 'object') return false;
  if (!meta.tierDistribution || typeof meta.tierDistribution !== 'object') return false;

  // Validate tier distribution sums to ~1.0
  const sum =
    meta.tierDistribution.elite +
    meta.tierDistribution.starter +
    meta.tierDistribution.backup +
    meta.tierDistribution.fringe;
  if (Math.abs(sum - 1.0) > 0.01) return false;

  return true;
}

/**
 * Calculates expected elite count for a class size
 */
export function getExpectedEliteCount(strength: ClassStrength, classSize: number): number {
  const distribution = calculateTierDistribution(strength);
  return Math.round(classSize * distribution.elite);
}

/**
 * Calculates expected starter count for a class size
 */
export function getExpectedStarterCount(strength: ClassStrength, classSize: number): number {
  const distribution = calculateTierDistribution(strength);
  return Math.round(classSize * distribution.starter);
}

/**
 * Gets readable class quality for UI display
 */
export function getClassQualityLabel(strength: ClassStrength): string {
  switch (strength) {
    case ClassStrength.HISTORIC:
      return 'Historic';
    case ClassStrength.STRONG:
      return 'Strong';
    case ClassStrength.AVERAGE:
      return 'Average';
    case ClassStrength.WEAK:
      return 'Weak';
    case ClassStrength.POOR:
      return 'Poor';
  }
}

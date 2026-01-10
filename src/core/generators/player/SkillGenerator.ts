import { Position } from '../../models/player/Position';
import {
  TechnicalSkills,
  SkillValue,
  SKILL_NAMES_BY_POSITION,
} from '../../models/player/TechnicalSkills';
import { clampedNormal, normalRandom } from '../utils/RandomUtils';
import { getRandomMaturityAge } from './MaturityConstants';

/**
 * Skill distribution parameters for a position.
 */
export interface SkillDistribution {
  mean: number;
  stdDev: number;
  correlatedWith?: string[];
}

/**
 * Position-specific skill set configuration.
 */
export interface PositionSkillSet {
  requiredSkills: string[];
  skillDistributions: Record<string, SkillDistribution>;
}

/**
 * Maps position groups to their skill configuration key.
 */
function getSkillGroupKey(position: Position): keyof typeof SKILL_NAMES_BY_POSITION {
  switch (position) {
    case Position.QB:
      return 'QB';
    case Position.RB:
      return 'RB';
    case Position.WR:
      return 'WR';
    case Position.TE:
      return 'TE';
    case Position.LT:
    case Position.LG:
    case Position.C:
    case Position.RG:
    case Position.RT:
      return 'OL';
    case Position.DE:
    case Position.DT:
      return 'DL';
    case Position.OLB:
    case Position.ILB:
      return 'LB';
    case Position.CB:
    case Position.FS:
    case Position.SS:
      return 'DB';
    case Position.K:
      return 'K';
    case Position.P:
      return 'P';
    default:
      return 'QB';
  }
}

/**
 * Position-specific skill sets with distributions.
 */
export const POSITION_SKILL_SETS: Record<keyof typeof SKILL_NAMES_BY_POSITION, PositionSkillSet> = {
  QB: {
    requiredSkills: SKILL_NAMES_BY_POSITION.QB as unknown as string[],
    skillDistributions: {
      armStrength: { mean: 60, stdDev: 15 },
      accuracy: { mean: 55, stdDev: 15, correlatedWith: ['decisionMaking'] },
      decisionMaking: { mean: 50, stdDev: 15, correlatedWith: ['accuracy', 'pocketPresence'] },
      pocketPresence: { mean: 50, stdDev: 15, correlatedWith: ['decisionMaking'] },
      playAction: { mean: 55, stdDev: 15 },
      mobility: { mean: 50, stdDev: 18 },
      leadership: { mean: 55, stdDev: 15 },
      presnap: { mean: 50, stdDev: 15, correlatedWith: ['decisionMaking'] },
    },
  },
  RB: {
    requiredSkills: SKILL_NAMES_BY_POSITION.RB as unknown as string[],
    skillDistributions: {
      vision: { mean: 55, stdDev: 15, correlatedWith: ['cutAbility'] },
      cutAbility: { mean: 55, stdDev: 15, correlatedWith: ['vision'] },
      power: { mean: 55, stdDev: 15 },
      breakaway: { mean: 50, stdDev: 18 },
      catching: { mean: 50, stdDev: 18 },
      passProtection: { mean: 45, stdDev: 15 },
      fumbleProtection: { mean: 55, stdDev: 15 },
    },
  },
  WR: {
    requiredSkills: SKILL_NAMES_BY_POSITION.WR as unknown as string[],
    skillDistributions: {
      routeRunning: { mean: 55, stdDev: 15, correlatedWith: ['separation'] },
      catching: { mean: 55, stdDev: 15, correlatedWith: ['contested', 'tracking'] },
      separation: { mean: 55, stdDev: 15, correlatedWith: ['routeRunning'] },
      yac: { mean: 50, stdDev: 18 },
      blocking: { mean: 40, stdDev: 15 },
      contested: { mean: 50, stdDev: 15, correlatedWith: ['catching'] },
      tracking: { mean: 55, stdDev: 15, correlatedWith: ['catching'] },
    },
  },
  TE: {
    requiredSkills: SKILL_NAMES_BY_POSITION.TE as unknown as string[],
    skillDistributions: {
      blocking: { mean: 55, stdDev: 15 },
      routeRunning: { mean: 50, stdDev: 15 },
      catching: { mean: 55, stdDev: 15, correlatedWith: ['contested'] },
      yac: { mean: 50, stdDev: 18 },
      contested: { mean: 55, stdDev: 15, correlatedWith: ['catching'] },
      sealing: { mean: 55, stdDev: 15, correlatedWith: ['blocking'] },
    },
  },
  OL: {
    requiredSkills: SKILL_NAMES_BY_POSITION.OL as unknown as string[],
    skillDistributions: {
      passBlock: { mean: 55, stdDev: 15, correlatedWith: ['footwork'] },
      runBlock: { mean: 55, stdDev: 15, correlatedWith: ['power'] },
      awareness: { mean: 50, stdDev: 15 },
      footwork: { mean: 55, stdDev: 15, correlatedWith: ['passBlock'] },
      power: { mean: 55, stdDev: 15, correlatedWith: ['runBlock', 'sustain'] },
      sustain: { mean: 55, stdDev: 15, correlatedWith: ['power'] },
      pullAbility: { mean: 50, stdDev: 18 },
    },
  },
  DL: {
    requiredSkills: SKILL_NAMES_BY_POSITION.DL as unknown as string[],
    skillDistributions: {
      passRush: { mean: 55, stdDev: 15, correlatedWith: ['finesse'] },
      runDefense: { mean: 55, stdDev: 15, correlatedWith: ['power'] },
      power: { mean: 55, stdDev: 15, correlatedWith: ['runDefense'] },
      finesse: { mean: 50, stdDev: 18, correlatedWith: ['passRush'] },
      awareness: { mean: 50, stdDev: 15 },
      stamina: { mean: 55, stdDev: 15 },
      pursuit: { mean: 55, stdDev: 15 },
    },
  },
  LB: {
    requiredSkills: SKILL_NAMES_BY_POSITION.LB as unknown as string[],
    skillDistributions: {
      tackling: { mean: 55, stdDev: 15, correlatedWith: ['shedBlocks'] },
      coverage: { mean: 50, stdDev: 18, correlatedWith: ['zoneCoverage'] },
      blitzing: { mean: 50, stdDev: 18 },
      pursuit: { mean: 55, stdDev: 15 },
      awareness: { mean: 55, stdDev: 15 },
      shedBlocks: { mean: 55, stdDev: 15, correlatedWith: ['tackling'] },
      zoneCoverage: { mean: 50, stdDev: 18, correlatedWith: ['coverage'] },
    },
  },
  DB: {
    requiredSkills: SKILL_NAMES_BY_POSITION.DB as unknown as string[],
    skillDistributions: {
      manCoverage: { mean: 55, stdDev: 15, correlatedWith: ['press'] },
      zoneCoverage: { mean: 55, stdDev: 15, correlatedWith: ['awareness'] },
      tackling: { mean: 50, stdDev: 15 },
      ballSkills: { mean: 55, stdDev: 15 },
      awareness: { mean: 55, stdDev: 15, correlatedWith: ['zoneCoverage'] },
      closing: { mean: 55, stdDev: 15 },
      press: { mean: 50, stdDev: 18, correlatedWith: ['manCoverage'] },
    },
  },
  K: {
    requiredSkills: SKILL_NAMES_BY_POSITION.K as unknown as string[],
    skillDistributions: {
      kickPower: { mean: 60, stdDev: 15 },
      kickAccuracy: { mean: 55, stdDev: 15 },
      clutch: { mean: 50, stdDev: 20 },
    },
  },
  P: {
    requiredSkills: SKILL_NAMES_BY_POSITION.P as unknown as string[],
    skillDistributions: {
      puntPower: { mean: 55, stdDev: 15, correlatedWith: ['hangTime'] },
      puntAccuracy: { mean: 55, stdDev: 15, correlatedWith: ['directional'] },
      hangTime: { mean: 55, stdDev: 15, correlatedWith: ['puntPower'] },
      directional: { mean: 50, stdDev: 18, correlatedWith: ['puntAccuracy'] },
    },
  },
};

/**
 * Calculates the perceived range width based on years until maturity.
 * Younger players = wider range (more uncertainty).
 * At maturity = range collapses to 0 (true value revealed).
 * @param yearsUntilMaturity - Years until the player reaches maturity
 * @returns The width of the perceived range
 */
export function calculateRangeWidth(yearsUntilMaturity: number): number {
  // At maturity (0 years): range = 0 (shows true value)
  // At rookie (4-5 years): range = 12-16
  // Linear interpolation, capped at 16
  return Math.min(16, Math.max(0, yearsUntilMaturity * 3));
}

/**
 * Creates a perceived range around a true value.
 * The range should usually contain the true value, but scouts can be wrong.
 * @param trueValue - The player's actual skill value
 * @param rangeWidth - The width of the perceived range
 * @returns The perceived min and max values
 */
export function createPerceivedRange(
  trueValue: number,
  rangeWidth: number
): { perceivedMin: number; perceivedMax: number } {
  if (rangeWidth === 0) {
    // At maturity, perceived matches true
    return {
      perceivedMin: trueValue,
      perceivedMax: trueValue,
    };
  }

  // Scout error - range center may not exactly match true value
  const scoutError = normalRandom(0, rangeWidth * 0.1);
  const centerPoint = trueValue + scoutError;

  // Calculate min/max from center
  const halfWidth = rangeWidth / 2;
  const perceivedMin = Math.max(1, Math.round(centerPoint - halfWidth));
  const perceivedMax = Math.min(100, Math.round(centerPoint + halfWidth));

  // Ensure min <= max
  return {
    perceivedMin: Math.min(perceivedMin, perceivedMax),
    perceivedMax: Math.max(perceivedMin, perceivedMax),
  };
}

/**
 * Generates a single skill value with true value and perceived range.
 * @param distribution - The skill distribution parameters
 * @param playerAge - The player's current age
 * @param maturityAge - The age when the skill becomes fully known
 * @param correlatedValue - Optional correlated skill value to bias toward
 * @returns A SkillValue with true and perceived values
 */
export function generateSkillValue(
  distribution: SkillDistribution,
  playerAge: number,
  maturityAge: number,
  correlatedValue?: number
): SkillValue {
  // 1. Generate true value from distribution
  let mean = distribution.mean;

  // If there's a correlated value, bias toward it
  if (correlatedValue !== undefined) {
    // Blend the mean with the correlated value (50% influence)
    mean = mean * 0.5 + correlatedValue * 0.5;
  }

  const trueValue = Math.round(clampedNormal(mean, distribution.stdDev, 1, 100));

  // 2. Calculate perceived range based on age vs maturity
  const yearsUntilMaturity = Math.max(0, maturityAge - playerAge);
  const rangeWidth = calculateRangeWidth(yearsUntilMaturity);

  // 3. Create perceived range
  const { perceivedMin, perceivedMax } = createPerceivedRange(trueValue, rangeWidth);

  return {
    trueValue,
    perceivedMin,
    perceivedMax,
    maturityAge,
  };
}

/**
 * Generates all skills for a position.
 * @param position - The player's position
 * @param playerAge - The player's current age
 * @param skillTier - Optional tier to bias skill generation
 * @returns A TechnicalSkills object with all position-relevant skills
 */
export function generateSkillsForPosition(
  position: Position,
  playerAge: number,
  skillTier?: 'elite' | 'starter' | 'backup' | 'fringe' | 'random'
): TechnicalSkills {
  const groupKey = getSkillGroupKey(position);
  const skillSet = POSITION_SKILL_SETS[groupKey];
  const maturityAge = getRandomMaturityAge(position);

  // Skill tier modifiers
  const tierModifiers: Record<string, number> = {
    elite: 25,
    starter: 12,
    backup: 0,
    fringe: -12,
    random: 0,
  };

  const tierModifier = skillTier ? tierModifiers[skillTier] : 0;

  const skills: TechnicalSkills = {};
  const generatedValues: Record<string, number> = {};

  // Generate skills in order, handling correlations
  for (const skillName of skillSet.requiredSkills) {
    const distribution = skillSet.skillDistributions[skillName];

    if (!distribution) {
      // Fallback distribution if not defined
      const skillValue = generateSkillValue(
        { mean: 50 + tierModifier, stdDev: 15 },
        playerAge,
        maturityAge
      );
      skills[skillName] = skillValue;
      generatedValues[skillName] = skillValue.trueValue;
      continue;
    }

    // Check for correlated skills and get their average value
    let correlatedValue: number | undefined;
    if (distribution.correlatedWith) {
      const correlatedSkills = distribution.correlatedWith.filter(
        (s) => generatedValues[s] !== undefined
      );
      if (correlatedSkills.length > 0) {
        correlatedValue =
          correlatedSkills.reduce((sum, s) => sum + generatedValues[s], 0) /
          correlatedSkills.length;
      }
    }

    // Apply tier modifier to mean
    const modifiedDistribution: SkillDistribution = {
      ...distribution,
      mean: Math.max(1, Math.min(100, distribution.mean + tierModifier)),
    };

    const skillValue = generateSkillValue(
      modifiedDistribution,
      playerAge,
      maturityAge,
      correlatedValue
    );
    skills[skillName] = skillValue;
    generatedValues[skillName] = skillValue.trueValue;
  }

  return skills;
}

/**
 * Gets the average true value of all skills (for engine calculations only).
 * @param skills - The player's technical skills
 * @returns The average true value across all skills
 */
export function getAverageTrueSkillValue(skills: TechnicalSkills): number {
  const values = Object.values(skills).map((s) => s.trueValue);
  if (values.length === 0) return 50;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Coach Generator
 * Generates coaches with varied, realistic attributes
 */

import { Coach, createDefaultCoach } from '../models/staff/Coach';
import { CoachAttributes, ReputationTier } from '../models/staff/CoachAttributes';
import {
  CoachingTree,
  TreeName,
  TreeGeneration,
  RiskTolerance,
  ALL_TREE_NAMES,
} from '../models/staff/CoachingTree';
import {
  CoachPersonality,
  PersonalityType,
  ALL_PERSONALITY_TYPES,
  PERSONALITY_CONFLICTS,
  PERSONALITY_SYNERGIES,
} from '../models/staff/CoachPersonality';
import { CoachRole, COACH_SALARY_RANGES } from '../models/staff/StaffSalary';
import { createCoachContract } from '../models/staff/CoachContract';
import {
  OffensiveScheme,
  DefensiveScheme,
  ALL_OFFENSIVE_SCHEMES,
  ALL_DEFENSIVE_SCHEMES,
} from '../models/player/SchemeFit';
import { generateUUID, randomInt } from '../generators/utils/RandomUtils';
import { generateFullName } from '../generators/player/NameGenerator';

/**
 * Configuration for coach generation
 */
export interface CoachGenerationConfig {
  /** Target reputation tier (affects attribute floors/ceilings) */
  reputationTier?: ReputationTier;
  /** Specific scheme to assign (otherwise random) */
  scheme?: OffensiveScheme | DefensiveScheme;
  /** Specific coaching tree (otherwise random) */
  treeName?: TreeName;
  /** Specific personality (otherwise random) */
  personality?: PersonalityType;
  /** Age range */
  minAge?: number;
  maxAge?: number;
  /** Experience range */
  minExperience?: number;
  maxExperience?: number;
  /** If true, randomize years remaining on contract (for initial game generation) */
  randomizeContractYears?: boolean;
}

/**
 * Attribute ranges based on reputation tier
 */
const TIER_ATTRIBUTE_RANGES: Record<ReputationTier, { min: number; max: number }> = {
  legendary: { min: 80, max: 98 },
  elite: { min: 70, max: 90 },
  established: { min: 55, max: 75 },
  rising: { min: 40, max: 65 },
  unknown: { min: 30, max: 55 },
};

/**
 * Reputation score ranges for each tier
 */
const TIER_REPUTATION_RANGES: Record<ReputationTier, { min: number; max: number }> = {
  legendary: { min: 90, max: 99 },
  elite: { min: 75, max: 89 },
  established: { min: 50, max: 74 },
  rising: { min: 25, max: 49 },
  unknown: { min: 10, max: 24 },
};

/**
 * Experience ranges for each tier
 */
const TIER_EXPERIENCE_RANGES: Record<ReputationTier, { min: number; max: number }> = {
  legendary: { min: 20, max: 35 },
  elite: { min: 15, max: 25 },
  established: { min: 8, max: 18 },
  rising: { min: 3, max: 10 },
  unknown: { min: 1, max: 5 },
};

/**
 * Generates a random value within a range
 */
function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random reputation tier with weighted distribution
 */
export function generateRandomReputationTier(): ReputationTier {
  const roll = Math.random();
  if (roll < 0.05) return 'legendary'; // 5%
  if (roll < 0.2) return 'elite'; // 15%
  if (roll < 0.5) return 'established'; // 30%
  if (roll < 0.8) return 'rising'; // 30%
  return 'unknown'; // 20%
}

/**
 * Generates coach attributes based on reputation tier and experience
 */
export function generateCoachAttributes(
  tier: ReputationTier,
  experience?: number,
  age?: number
): CoachAttributes {
  const attrRange = TIER_ATTRIBUTE_RANGES[tier];
  const repRange = TIER_REPUTATION_RANGES[tier];
  const expRange = TIER_EXPERIENCE_RANGES[tier];

  // Use provided experience or generate based on tier
  const yearsExperience = experience ?? randomInRange(expRange.min, expRange.max);

  // Age should be at least 30 + experience, with some variance
  const minAge = Math.max(30, 28 + yearsExperience);
  const maxAge = Math.min(70, 40 + yearsExperience + 10);
  const coachAge = age ?? randomInRange(minAge, maxAge);

  // Generate base attribute with some variance
  const generateAttribute = (): number => {
    const base = randomInRange(attrRange.min, attrRange.max);
    // Add small variance (-5 to +5)
    const variance = randomInRange(-5, 5);
    return Math.max(1, Math.min(99, base + variance));
  };

  return {
    development: generateAttribute(),
    gameDayIQ: generateAttribute(),
    schemeTeaching: generateAttribute(),
    playerEvaluation: generateAttribute(),
    talentID: generateAttribute(),
    motivation: generateAttribute(),
    reputation: randomInRange(repRange.min, repRange.max),
    yearsExperience,
    age: coachAge,
  };
}

/**
 * Generates a random coaching tree
 */
export function generateCoachingTree(treeName?: TreeName): CoachingTree {
  const name = treeName ?? ALL_TREE_NAMES[Math.floor(Math.random() * ALL_TREE_NAMES.length)];
  const generation = (Math.floor(Math.random() * 4) + 1) as TreeGeneration;

  const riskOptions: RiskTolerance[] = ['conservative', 'balanced', 'aggressive'];
  const riskTolerance = riskOptions[Math.floor(Math.random() * riskOptions.length)];

  // Generate offensive/defensive tendencies based on tree
  const offensiveTendencies: Record<TreeName, string> = {
    walsh: 'short passing, ball control',
    parcells: 'power running, play action',
    belichick: 'versatile, matchup-based',
    shanahan: 'zone running, bootlegs',
    reid: 'creative passing, RPOs',
    coughlin: 'balanced, disciplined',
    dungy: 'ball control, low turnovers',
    holmgren: 'west coast principles',
    gruden: 'aggressive passing',
    payton: 'innovative, high tempo',
  };

  const defensiveTendencies: Record<TreeName, string> = {
    walsh: 'zone coverage',
    parcells: 'aggressive front seven',
    belichick: 'adaptable, situational',
    shanahan: 'zone blitz',
    reid: 'multiple looks',
    coughlin: 'fundamentally sound',
    dungy: 'tampa 2, coverage first',
    holmgren: 'balanced approach',
    gruden: 'pressure-oriented',
    payton: 'opportunistic, turnovers',
  };

  return {
    treeName: name,
    generation,
    mentorId: null,
    philosophy: {
      offensiveTendency: offensiveTendencies[name],
      defensiveTendency: defensiveTendencies[name],
      riskTolerance,
    },
  };
}

/**
 * Generates a random coach personality
 */
export function generateCoachPersonality(primaryType?: PersonalityType): CoachPersonality {
  const primary =
    primaryType ?? ALL_PERSONALITY_TYPES[Math.floor(Math.random() * ALL_PERSONALITY_TYPES.length)];

  // 50% chance of having a secondary personality
  const hasSecondary = Math.random() > 0.5;
  let secondary: PersonalityType | null = null;

  if (hasSecondary) {
    // Pick a secondary that doesn't conflict with primary
    const nonConflicting = ALL_PERSONALITY_TYPES.filter(
      (p) => p !== primary && !PERSONALITY_CONFLICTS[primary].includes(p)
    );
    if (nonConflicting.length > 0) {
      secondary = nonConflicting[Math.floor(Math.random() * nonConflicting.length)];
    }
  }

  return {
    primary,
    secondary,
    ego: randomInRange(20, 90),
    adaptability: randomInRange(30, 85),
    conflictsWith: PERSONALITY_CONFLICTS[primary],
    synergizesWith: PERSONALITY_SYNERGIES[primary],
  };
}

/**
 * Gets an appropriate scheme for a coach role
 */
export function getSchemeForRole(
  role: CoachRole,
  specificScheme?: OffensiveScheme | DefensiveScheme
): OffensiveScheme | DefensiveScheme | null {
  if (specificScheme) {
    return specificScheme;
  }

  if (role === 'headCoach' || role === 'offensiveCoordinator') {
    return ALL_OFFENSIVE_SCHEMES[Math.floor(Math.random() * ALL_OFFENSIVE_SCHEMES.length)];
  }

  if (role === 'defensiveCoordinator') {
    return ALL_DEFENSIVE_SCHEMES[Math.floor(Math.random() * ALL_DEFENSIVE_SCHEMES.length)];
  }

  return null;
}

/**
 * Generates a complete coach with realistic, varied attributes
 */
export function generateCoach(
  role: CoachRole,
  teamId: string | null,
  startYear: number,
  config: CoachGenerationConfig = {}
): Coach {
  const { firstName, lastName } = generateFullName();
  const coachId = generateUUID();

  // Determine reputation tier
  const tier = config.reputationTier ?? generateRandomReputationTier();

  // Generate attributes based on tier
  const attributes = generateCoachAttributes(
    tier,
    config.minExperience !== undefined || config.maxExperience !== undefined
      ? randomInRange(config.minExperience ?? 1, config.maxExperience ?? 35)
      : undefined,
    config.minAge !== undefined || config.maxAge !== undefined
      ? randomInRange(config.minAge ?? 30, config.maxAge ?? 70)
      : undefined
  );

  // Generate coaching tree
  const tree = generateCoachingTree(config.treeName);

  // Generate personality
  const personality = generateCoachPersonality(config.personality);

  // Get scheme
  const scheme = getSchemeForRole(role, config.scheme);

  // Generate contract
  const salaryRange = COACH_SALARY_RANGES[role];
  // Higher tier coaches get higher salaries
  const salaryMultiplier =
    tier === 'legendary'
      ? 0.85
      : tier === 'elite'
        ? 0.7
        : tier === 'established'
          ? 0.5
          : tier === 'rising'
            ? 0.3
            : 0.15;

  const salaryPerYear = Math.round(
    salaryRange.min +
      (salaryRange.max - salaryRange.min) * salaryMultiplier +
      randomInt(-500000, 500000)
  );

  const yearsTotal = randomInRange(2, 5);
  const clampedSalary = Math.max(salaryRange.min, Math.min(salaryRange.max, salaryPerYear));
  const guaranteedMoney = Math.round(clampedSalary * yearsTotal * 0.4);

  // For initial game generation, randomize how far into the contract the coach is
  const shouldRandomizeYears = config.randomizeContractYears === true;
  const yearsElapsed = shouldRandomizeYears ? randomInRange(0, yearsTotal - 1) : 0;
  const adjustedStartYear = startYear - yearsElapsed;

  let contract = teamId
    ? createCoachContract({
        id: generateUUID(),
        coachId,
        teamId,
        yearsTotal,
        salaryPerYear: clampedSalary,
        guaranteedMoney,
        startYear: adjustedStartYear,
        isInterim: false,
        canBePoached: role !== 'headCoach',
      })
    : null;

  // Adjust yearsRemaining and deadMoney for mid-contract coaches
  if (contract && yearsElapsed > 0) {
    const adjustedYearsRemaining = yearsTotal - yearsElapsed;
    contract = {
      ...contract,
      yearsRemaining: adjustedYearsRemaining,
      deadMoneyIfFired: Math.round((guaranteedMoney / yearsTotal) * adjustedYearsRemaining),
    };
  }

  // Create base coach
  const baseCoach = createDefaultCoach(coachId, firstName, lastName, role);

  return {
    ...baseCoach,
    teamId,
    scheme,
    tree,
    personality,
    attributes,
    contract,
    isAvailable: teamId === null,
    careerHistory: generateCareerHistory(role, attributes.yearsExperience, startYear),
  };
}

/**
 * Generates plausible career history for a coach
 */
function generateCareerHistory(
  currentRole: CoachRole,
  yearsExperience: number,
  currentYear: number
): Coach['careerHistory'] {
  if (yearsExperience < 3) {
    return []; // New coaches have no history
  }

  const history: Coach['careerHistory'] = [];
  let remainingYears = yearsExperience;
  let year = currentYear - yearsExperience;

  // Generate 1-3 previous positions
  const numPositions = Math.min(3, Math.floor(yearsExperience / 4) + 1);

  for (let i = 0; i < numPositions && remainingYears > 0; i++) {
    const tenureLength = Math.min(remainingYears, randomInRange(2, Math.min(8, remainingYears)));

    // Earlier positions tend to be lower roles
    let role: CoachRole;
    if (i === numPositions - 1) {
      role = currentRole;
    } else if (currentRole === 'headCoach') {
      role = Math.random() > 0.5 ? 'offensiveCoordinator' : 'defensiveCoordinator';
    } else {
      role = currentRole;
    }

    const wins = randomInRange(tenureLength * 4, tenureLength * 12);
    const losses = randomInRange(tenureLength * 4, tenureLength * 12);

    history.push({
      teamId: `prev-team-${i}`,
      teamName: `Previous Team ${i + 1}`,
      role,
      yearStart: year,
      yearEnd: year + tenureLength - 1,
      wins,
      losses,
      playoffAppearances: Math.floor(Math.random() * Math.ceil(tenureLength / 3)),
      championships: Math.random() > 0.92 ? 1 : 0,
      achievements: [],
    });

    year += tenureLength;
    remainingYears -= tenureLength;
  }

  return history;
}

/**
 * Generates a set of coaches for a team (HC, OC, DC)
 */
export function generateCoachingStaff(
  teamId: string,
  startYear: number
): { headCoach: Coach; offensiveCoordinator: Coach; defensiveCoordinator: Coach } {
  const headCoach = generateCoach('headCoach', teamId, startYear);
  const offensiveCoordinator = generateCoach('offensiveCoordinator', teamId, startYear);
  const defensiveCoordinator = generateCoach('defensiveCoordinator', teamId, startYear);

  return {
    headCoach,
    offensiveCoordinator,
    defensiveCoordinator,
  };
}

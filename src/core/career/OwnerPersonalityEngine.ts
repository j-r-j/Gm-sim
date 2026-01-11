/**
 * Owner Personality Engine
 * Generates owner personalities based on team/market characteristics
 */

import {
  OwnerPersonality,
  OwnerTraits,
  SecondaryTrait,
  InterventionTriggers,
  ALL_SECONDARY_TRAITS,
} from '../models/owner/OwnerPersonality';
import { Owner, NetWorth, ALL_NET_WORTH_LEVELS } from '../models/owner/Owner';

/**
 * Market size categories that influence owner personality generation
 */
export type MarketSize = 'small' | 'medium' | 'large' | 'mega';

/**
 * Team context for personality generation
 */
export interface TeamContext {
  teamId: string;
  marketSize: MarketSize;
  historicalSuccess: 'dynasty' | 'contender' | 'rebuilding' | 'perennial_loser';
  recentPerformance: 'excellent' | 'good' | 'average' | 'poor' | 'terrible';
  fanbasePassion: 'rabid' | 'passionate' | 'moderate' | 'apathetic';
  mediaMarket: 'national_spotlight' | 'regional' | 'local';
}

/**
 * Personality archetype for generation
 */
export type PersonalityArchetype =
  | 'patient_builder'
  | 'win_now_spender'
  | 'meddling_micromanager'
  | 'hands_off_owner'
  | 'analytics_believer'
  | 'old_school_traditionalist'
  | 'penny_pincher'
  | 'balanced';

/**
 * Owner generation options
 */
export interface OwnerGenerationOptions {
  teamContext: TeamContext;
  archetype?: PersonalityArchetype;
  randomSeed?: number;
}

/**
 * Description types for user-visible personality summary
 */
export type OwnerPersonalitySummary = {
  primaryStyle: string;
  keyTraits: string[];
  workingRelationship: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'extreme';
};

/**
 * Archetype trait ranges
 */
const ARCHETYPE_RANGES: Record<
  PersonalityArchetype,
  {
    patience: [number, number];
    spending: [number, number];
    control: [number, number];
    loyalty: [number, number];
    ego: [number, number];
    preferredSecondary: SecondaryTrait[];
  }
> = {
  patient_builder: {
    patience: [70, 95],
    spending: [40, 60],
    control: [20, 45],
    loyalty: [60, 85],
    ego: [20, 50],
    preferredSecondary: ['longTermThinker', 'analyticsBeliever'],
  },
  win_now_spender: {
    patience: [15, 40],
    spending: [75, 100],
    control: [50, 75],
    loyalty: [30, 55],
    ego: [60, 90],
    preferredSecondary: ['winNow', 'championshipOrBust'],
  },
  meddling_micromanager: {
    patience: [25, 50],
    spending: [40, 70],
    control: [75, 100],
    loyalty: [25, 50],
    ego: [70, 95],
    preferredSecondary: ['winNow', 'prObsessed'],
  },
  hands_off_owner: {
    patience: [60, 85],
    spending: [45, 70],
    control: [1, 30],
    loyalty: [55, 80],
    ego: [20, 45],
    preferredSecondary: ['longTermThinker', 'playersOwner'],
  },
  analytics_believer: {
    patience: [55, 80],
    spending: [50, 75],
    control: [35, 60],
    loyalty: [50, 70],
    ego: [30, 55],
    preferredSecondary: ['analyticsBeliever', 'longTermThinker'],
  },
  old_school_traditionalist: {
    patience: [40, 65],
    spending: [35, 60],
    control: [50, 75],
    loyalty: [55, 80],
    ego: [45, 70],
    preferredSecondary: ['oldSchool', 'playersOwner'],
  },
  penny_pincher: {
    patience: [30, 55],
    spending: [1, 30],
    control: [40, 65],
    loyalty: [35, 55],
    ego: [35, 60],
    preferredSecondary: ['longTermThinker'],
  },
  balanced: {
    patience: [40, 60],
    spending: [40, 60],
    control: [40, 60],
    loyalty: [40, 60],
    ego: [40, 60],
    preferredSecondary: [],
  },
};

/**
 * Market size influence on personality generation
 */
const MARKET_INFLUENCE: Record<
  MarketSize,
  {
    patienceModifier: number;
    spendingModifier: number;
    controlModifier: number;
    egoModifier: number;
  }
> = {
  small: { patienceModifier: 10, spendingModifier: -15, controlModifier: -5, egoModifier: -10 },
  medium: { patienceModifier: 5, spendingModifier: 0, controlModifier: 0, egoModifier: 0 },
  large: { patienceModifier: -5, spendingModifier: 10, controlModifier: 5, egoModifier: 10 },
  mega: { patienceModifier: -15, spendingModifier: 15, controlModifier: 10, egoModifier: 15 },
};

/**
 * Generates a random number in range using optional seed
 */
function randomInRange(min: number, max: number, seed?: number): number {
  const random = seed !== undefined ? seededRandom(seed) : Math.random();
  return Math.floor(min + random * (max - min + 1));
}

/**
 * Simple seeded random number generator
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Clamps a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Selects a random archetype based on team context
 */
export function selectArchetypeFromContext(
  context: TeamContext,
  randomValue: number
): PersonalityArchetype {
  const archetypeWeights: Record<PersonalityArchetype, number> = {
    patient_builder: 15,
    win_now_spender: 15,
    meddling_micromanager: 10,
    hands_off_owner: 15,
    analytics_believer: 15,
    old_school_traditionalist: 10,
    penny_pincher: 10,
    balanced: 10,
  };

  // Adjust weights based on context
  if (context.historicalSuccess === 'dynasty') {
    archetypeWeights.patient_builder += 10;
    archetypeWeights.hands_off_owner += 10;
  } else if (context.historicalSuccess === 'perennial_loser') {
    archetypeWeights.win_now_spender += 15;
    archetypeWeights.meddling_micromanager += 10;
  }

  if (context.fanbasePassion === 'rabid') {
    archetypeWeights.win_now_spender += 10;
    archetypeWeights.meddling_micromanager += 5;
  }

  if (context.marketSize === 'small') {
    archetypeWeights.penny_pincher += 10;
    archetypeWeights.patient_builder += 5;
  } else if (context.marketSize === 'mega') {
    archetypeWeights.win_now_spender += 10;
  }

  if (context.mediaMarket === 'national_spotlight') {
    archetypeWeights.meddling_micromanager += 5;
  }

  // Calculate total weight and select
  const totalWeight = Object.values(archetypeWeights).reduce((a, b) => a + b, 0);
  let target = randomValue * totalWeight;

  for (const [archetype, weight] of Object.entries(archetypeWeights)) {
    target -= weight;
    if (target <= 0) {
      return archetype as PersonalityArchetype;
    }
  }

  return 'balanced';
}

/**
 * Generates owner traits based on archetype and market
 */
export function generateOwnerTraits(
  archetype: PersonalityArchetype,
  marketSize: MarketSize,
  seed?: number
): OwnerTraits {
  const ranges = ARCHETYPE_RANGES[archetype];
  const marketMod = MARKET_INFLUENCE[marketSize];

  const baseSeed = seed ?? Math.random() * 10000;

  const patience = clamp(
    randomInRange(ranges.patience[0], ranges.patience[1], baseSeed) + marketMod.patienceModifier,
    1,
    100
  );

  const spending = clamp(
    randomInRange(ranges.spending[0], ranges.spending[1], baseSeed + 1) +
      marketMod.spendingModifier,
    1,
    100
  );

  const control = clamp(
    randomInRange(ranges.control[0], ranges.control[1], baseSeed + 2) + marketMod.controlModifier,
    1,
    100
  );

  const loyalty = clamp(randomInRange(ranges.loyalty[0], ranges.loyalty[1], baseSeed + 3), 1, 100);

  const ego = clamp(
    randomInRange(ranges.ego[0], ranges.ego[1], baseSeed + 4) + marketMod.egoModifier,
    1,
    100
  );

  return { patience, spending, control, loyalty, ego };
}

/**
 * Generates secondary traits based on archetype
 */
export function generateSecondaryTraits(
  archetype: PersonalityArchetype,
  seed?: number
): SecondaryTrait[] {
  const preferred = ARCHETYPE_RANGES[archetype].preferredSecondary;
  const traits: SecondaryTrait[] = [];
  const baseSeed = seed ?? Math.random() * 10000;

  // Always include preferred traits (each trait has its own 70% chance)
  for (let i = 0; i < preferred.length; i++) {
    const traitRandom = seed !== undefined ? seededRandom(baseSeed + i) : Math.random();
    // If only one preferred trait, always include it; otherwise 70% chance each
    if (preferred.length === 1 || traitRandom < 0.7) {
      traits.push(preferred[i]);
    }
  }

  // Small chance for additional non-conflicting trait
  const extraRandom = seed !== undefined ? seededRandom(baseSeed + 10) : Math.random();
  if (extraRandom > 0.7) {
    const available = ALL_SECONDARY_TRAITS.filter(
      (t) => !traits.includes(t) && !hasTraitConflict(t, traits) && !preferred.includes(t)
    );
    if (available.length > 0) {
      const index = Math.floor(extraRandom * available.length);
      traits.push(available[index]);
    }
  }

  return traits;
}

/**
 * Checks if a trait conflicts with existing traits
 */
function hasTraitConflict(newTrait: SecondaryTrait, existing: SecondaryTrait[]): boolean {
  const conflicts: Record<SecondaryTrait, SecondaryTrait[]> = {
    winNow: ['longTermThinker'],
    longTermThinker: ['winNow'],
    analyticsBeliever: ['oldSchool'],
    oldSchool: ['analyticsBeliever'],
    prObsessed: [],
    playersOwner: [],
    championshipOrBust: [],
  };

  return existing.some((t) => conflicts[newTrait]?.includes(t));
}

/**
 * Generates intervention triggers based on traits
 */
export function generateInterventionTriggers(
  traits: OwnerTraits,
  fanbasePassion: 'rabid' | 'passionate' | 'moderate' | 'apathetic'
): InterventionTriggers {
  // Impatient owners intervene sooner
  const baseLosing = Math.round(2 + (traits.patience / 100) * 5);
  const losingStreakLength = clamp(baseLosing, 2, 8);

  // Controlling owners care more about fan approval
  const baseFanFloor = 50 - (traits.control - 50) / 2;
  const fanModifier =
    fanbasePassion === 'rabid'
      ? 10
      : fanbasePassion === 'passionate'
        ? 5
        : fanbasePassion === 'apathetic'
          ? -10
          : 0;
  const fanApprovalFloor = clamp(Math.round(baseFanFloor + fanModifier), 20, 70);

  // Ego-driven owners are more sensitive to media
  const mediaScrutinyThreshold = clamp(Math.round(100 - traits.ego), 20, 80);

  return {
    losingStreakLength,
    fanApprovalFloor,
    mediaScrutinyThreshold,
  };
}

/**
 * Generates a complete owner personality
 */
export function generateOwnerPersonality(options: OwnerGenerationOptions): OwnerPersonality {
  const { teamContext, randomSeed } = options;
  const seed = randomSeed ?? Math.random() * 10000;

  // Determine archetype
  const archetype =
    options.archetype ?? selectArchetypeFromContext(teamContext, seededRandom(seed));

  // Generate components
  const traits = generateOwnerTraits(archetype, teamContext.marketSize, seed);
  const secondaryTraits = generateSecondaryTraits(archetype, seed);
  const interventionTriggers = generateInterventionTriggers(traits, teamContext.fanbasePassion);

  return {
    traits,
    secondaryTraits,
    interventionTriggers,
  };
}

/**
 * Generates net worth based on market size
 */
export function generateNetWorth(marketSize: MarketSize, seed?: number): NetWorth {
  const random = seed !== undefined ? seededRandom(seed + 20) : Math.random();

  const weights: Record<MarketSize, Record<NetWorth, number>> = {
    small: { modest: 40, wealthy: 40, billionaire: 15, oligarch: 5 },
    medium: { modest: 20, wealthy: 45, billionaire: 25, oligarch: 10 },
    large: { modest: 10, wealthy: 30, billionaire: 40, oligarch: 20 },
    mega: { modest: 5, wealthy: 20, billionaire: 40, oligarch: 35 },
  };

  const marketWeights = weights[marketSize];
  const total = Object.values(marketWeights).reduce((a, b) => a + b, 0);
  let target = random * total;

  for (const level of ALL_NET_WORTH_LEVELS) {
    target -= marketWeights[level];
    if (target <= 0) {
      return level;
    }
  }

  return 'wealthy';
}

/**
 * Generates owner history based on context
 */
export function generateOwnerHistory(
  context: TeamContext,
  personality: OwnerPersonality,
  seed?: number
): { yearsAsOwner: number; previousGMsFired: number; championshipsWon: number } {
  const random = seed !== undefined ? seededRandom(seed + 30) : Math.random();

  // Years as owner (3-40)
  const yearsAsOwner = Math.floor(3 + random * 37);

  // GMs fired based on patience and years
  const baseGMsFired = Math.floor(yearsAsOwner / 5);
  const patienceModifier =
    personality.traits.patience < 40 ? 2 : personality.traits.patience > 70 ? -1 : 0;
  const previousGMsFired = Math.max(0, baseGMsFired + patienceModifier);

  // Championships based on historical success
  let championshipsWon = 0;
  if (context.historicalSuccess === 'dynasty') {
    championshipsWon = Math.floor(random * 4) + 1;
  } else if (context.historicalSuccess === 'contender') {
    championshipsWon = random > 0.6 ? 1 : 0;
  }

  return { yearsAsOwner, previousGMsFired, championshipsWon };
}

/**
 * Creates a complete owner for a team
 */
export function generateOwner(
  ownerId: string,
  teamId: string,
  firstName: string,
  lastName: string,
  options: OwnerGenerationOptions
): Owner {
  const { teamContext } = options;
  const seed = options.randomSeed ?? Math.random() * 10000;

  const personality = generateOwnerPersonality(options);
  const netWorth = generateNetWorth(teamContext.marketSize, seed);
  const history = generateOwnerHistory(teamContext, personality, seed);

  // Initial patience based on recent performance
  const initialPatience =
    teamContext.recentPerformance === 'excellent'
      ? 80
      : teamContext.recentPerformance === 'good'
        ? 65
        : teamContext.recentPerformance === 'average'
          ? 50
          : teamContext.recentPerformance === 'poor'
            ? 40
            : 30;

  // Initial trust based on historical success
  const initialTrust =
    teamContext.historicalSuccess === 'dynasty'
      ? 60
      : teamContext.historicalSuccess === 'contender'
        ? 55
        : teamContext.historicalSuccess === 'rebuilding'
          ? 45
          : 40;

  return {
    id: ownerId,
    firstName,
    lastName,
    teamId,
    personality,
    patienceMeter: initialPatience,
    trustLevel: initialTrust,
    activeDemands: [],
    yearsAsOwner: history.yearsAsOwner,
    previousGMsFired: history.previousGMsFired,
    championshipsWon: history.championshipsWon,
    netWorth,
  };
}

/**
 * Gets a user-visible personality summary (no raw numbers)
 */
export function getOwnerPersonalitySummary(owner: Owner): OwnerPersonalitySummary {
  const { traits, secondaryTraits } = owner.personality;

  // Determine primary style
  let primaryStyle: string;
  if (traits.control >= 70) {
    primaryStyle = 'Hands-on owner who likes to be involved in decisions';
  } else if (traits.control <= 30) {
    primaryStyle = 'Hands-off owner who trusts the front office';
  } else if (traits.patience >= 70) {
    primaryStyle = 'Patient owner willing to build for the future';
  } else if (traits.patience <= 30) {
    primaryStyle = 'Impatient owner demanding immediate results';
  } else if (traits.spending >= 70) {
    primaryStyle = 'Big spender willing to pay for top talent';
  } else if (traits.spending <= 30) {
    primaryStyle = 'Frugal owner focused on efficiency';
  } else {
    primaryStyle = 'Balanced owner with moderate expectations';
  }

  // Key traits descriptions
  const keyTraits: string[] = [];

  if (traits.patience <= 30) keyTraits.push('Demands quick results');
  else if (traits.patience >= 70) keyTraits.push('Willing to wait for success');

  if (traits.spending <= 30) keyTraits.push('Budget-conscious');
  else if (traits.spending >= 70) keyTraits.push('Opens the checkbook');

  if (traits.loyalty <= 30) keyTraits.push('Quick to make changes');
  else if (traits.loyalty >= 70) keyTraits.push('Values loyalty');

  if (traits.ego >= 70) keyTraits.push('Strong personality');

  // Add secondary trait descriptions
  for (const trait of secondaryTraits) {
    if (trait === 'analyticsBeliever') keyTraits.push('Trusts the numbers');
    if (trait === 'oldSchool') keyTraits.push('Traditional approach');
    if (trait === 'winNow') keyTraits.push('Win-now mentality');
    if (trait === 'prObsessed') keyTraits.push('Image-conscious');
    if (trait === 'championshipOrBust') keyTraits.push('Championship or bust');
  }

  // Working relationship description
  let workingRelationship: string;
  if (traits.control <= 30 && traits.loyalty >= 60) {
    workingRelationship = 'Gives you full autonomy and supports your decisions';
  } else if (traits.control >= 70 && traits.patience <= 40) {
    workingRelationship = 'Expects frequent updates and may override decisions';
  } else if (traits.loyalty >= 70) {
    workingRelationship = 'Supportive but expects open communication';
  } else {
    workingRelationship = 'Professional relationship based on results';
  }

  // Risk level
  let riskLevel: 'low' | 'moderate' | 'high' | 'extreme';
  const riskScore =
    (100 - traits.patience) / 100 +
    (100 - traits.loyalty) / 100 +
    traits.control / 100 +
    (owner.previousGMsFired > 3 ? 0.5 : 0);

  if (riskScore < 1) riskLevel = 'low';
  else if (riskScore < 1.5) riskLevel = 'moderate';
  else if (riskScore < 2) riskLevel = 'high';
  else riskLevel = 'extreme';

  return {
    primaryStyle,
    keyTraits: keyTraits.slice(0, 5), // Max 5 traits shown
    workingRelationship,
    riskLevel,
  };
}

/**
 * Gets archetype description for debug/testing
 */
export function getArchetypeDescription(archetype: PersonalityArchetype): string {
  const descriptions: Record<PersonalityArchetype, string> = {
    patient_builder: 'A patient owner focused on building sustainable success',
    win_now_spender: 'An aggressive owner willing to spend big for immediate wins',
    meddling_micromanager: 'A controlling owner who likes to be involved in all decisions',
    hands_off_owner: 'A trusting owner who empowers the front office',
    analytics_believer: 'A modern owner who values data-driven decision making',
    old_school_traditionalist: 'A traditional owner who values experience and gut instincts',
    penny_pincher: 'A frugal owner focused on keeping costs down',
    balanced: 'A well-rounded owner with moderate expectations',
  };

  return descriptions[archetype];
}

// Player generation system
// This module provides complete player generation including:
// - Name generation
// - Physical attribute generation
// - Technical skill generation with perceived ranges
// - Hidden trait generation
// - "It" factor generation
// - Consistency profile generation
// - Scheme fit calculation
// - Role fit determination

// Main player generator
export {
  generatePlayer,
  generateRoster,
  generateLeaguePlayers,
  generateSimpleDraftClass,
  type PlayerGenerationOptions,
} from './PlayerGenerator';

// Name generation
export {
  generateFirstName,
  generateLastName,
  generateFullName,
  createNameGenerator,
  FIRST_NAMES,
  LAST_NAMES,
  type NameGenerator,
} from './NameGenerator';

// Physical attribute generation
export {
  generatePhysicalAttributes,
  POSITION_PHYSICAL_PROFILES,
  type PositionPhysicalProfile,
  type AttributeDistribution,
} from './PhysicalGenerator';

// Skill generation
export {
  generateSkillValue,
  generateSkillsForPosition,
  calculateRangeWidth,
  createPerceivedRange,
  getAverageTrueSkillValue,
  POSITION_SKILL_SETS,
  type PositionSkillSet,
  type SkillDistribution,
} from './SkillGenerator';

// Trait generation
export {
  generateHiddenTraits,
  getPositiveTraitCount,
  getNegativeTraitCount,
  TRAIT_PROBABILITIES,
  TRAIT_CORRELATIONS,
  POSITION_TRAIT_MODIFIERS,
} from './TraitGenerator';

// "It" factor generation
export {
  generateItFactor,
  generateItFactorForSkillTier,
  getItFactorTierName,
  IT_FACTOR_DISTRIBUTION,
} from './ItFactorGenerator';

// Consistency generation
export {
  generateConsistencyProfile,
  getConsistencyScore,
  POSITION_CONSISTENCY_WEIGHTS,
} from './ConsistencyGenerator';

// Scheme fit generation
export {
  generateSchemeFits,
  getBestSchemeFit,
  OFFENSIVE_SCHEME_PROFILES,
  DEFENSIVE_SCHEME_PROFILES,
} from './SchemeFitGenerator';

// Role fit generation
export { generateRoleFit, generateRoleFitForTier } from './RoleFitGenerator';

// Maturity constants
export {
  POSITION_MATURITY,
  getRandomMaturityAge,
  getCareerPhase,
  getTypicalDraftAge,
  type PositionMaturityProfile,
} from './MaturityConstants';

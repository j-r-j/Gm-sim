/**
 * Staff Models Index
 * Exports all staff-related models, types, and utilities
 */

// Coaching Tree
export {
  TreeName,
  TreeGeneration,
  RiskTolerance,
  TreePhilosophy,
  CoachingTree,
  ChemistryRange,
  TreeChemistry,
  DEFAULT_TREE_CHEMISTRY,
  COMPATIBLE_TREES,
  CONFLICTING_TREES,
  ALL_TREE_NAMES,
  calculateTreeChemistry,
  createDefaultCoachingTree,
  validateCoachingTree,
} from './CoachingTree';

// Coach Personality
export {
  PersonalityType,
  CoachPersonality,
  PERSONALITY_CONFLICTS,
  PERSONALITY_SYNERGIES,
  ALL_PERSONALITY_TYPES,
  hasPersonalityConflict,
  hasPersonalitySynergy,
  calculatePersonalityChemistry,
  createDefaultPersonality,
  validatePersonality,
  getPersonalityDescription,
} from './CoachPersonality';

// Coordinator Tendencies
export {
  FourthDownAggressiveness,
  TempoPreference,
  SituationalPreference,
  RedZoneDefense,
  TwoMinuteApproach,
  ThirdAndLongApproach,
  BaseFormation,
  SplitModifier,
  OffensiveSituational,
  DefensiveSituational,
  OffensiveTendencies,
  DefensiveTendencies,
  CoordinatorTendencies,
  isOffensiveTendencies,
  isDefensiveTendencies,
  validateOffensiveTendencies,
  validateDefensiveTendencies,
  createDefaultOffensiveTendencies,
  createDefaultDefensiveTendencies,
  getTendenciesDescription,
} from './CoordinatorTendencies';

// Coach Attributes
export {
  ReputationTier,
  CoachAttributes,
  CoachAttributesViewModel,
  getReputationTier,
  createAttributesViewModel,
  createDefaultAttributes,
  validateAttributes,
  calculateOverallRating,
} from './CoachAttributes';

// Staff Salary
export {
  CoachRole,
  ScoutRole,
  SalaryRange,
  COACH_SALARY_RANGES,
  SCOUT_SALARY_RANGES,
  BudgetTier,
  StaffBudget,
  STAFF_BUDGET_TIERS,
  ALL_COACH_ROLES,
  ALL_SCOUT_ROLES,
  getCoachSalaryRange,
  getScoutSalaryRange,
  isValidCoachSalary,
  isValidScoutSalary,
  getBudgetTier,
  createStaffBudget,
  getCoachRoleDisplayName,
  getScoutRoleDisplayName,
} from './StaffSalary';

// Coach Contract
export {
  CoachContract,
  createCoachContract,
  calculateDeadMoney,
  advanceContractYear,
  validateContract,
  getRemainingContractValue,
  getTotalContractValue,
  isContractExpiring,
  getContractSummary,
} from './CoachContract';

// Coach Entity
export {
  SchemeType,
  CareerHistoryEntry,
  Coach,
  CoachViewModel,
  createCoachViewModel,
  createDefaultCoach,
  validateCoach,
  getCoachFullName,
  isCoordinator,
  isHeadCoach,
  getCareerWinningPercentage,
} from './Coach';

// Scout Attributes
export {
  ScoutRegion,
  ScoutAttributes,
  ALL_SCOUT_REGIONS,
  createDefaultScoutAttributes,
  validateScoutAttributes,
  getPositionSpecialtyBonus,
  getRegionKnowledgeBonus,
  getProspectsPerWeek,
  getRegionDisplayName,
  getRegionCoverage,
} from './ScoutAttributes';

// Scout Track Record
export {
  ScoutEvaluation,
  ScoutTrackRecord,
  MIN_EVALUATIONS_FOR_RELIABILITY,
  MIN_YEARS_FOR_TENDENCIES,
  createEmptyTrackRecord,
  calculateWasHit,
  updateEvaluationResults,
  calculateOverallHitRate,
  calculatePositionAccuracy,
  determineStrengths,
  determineWeaknesses,
  updateTrackRecord,
  addEvaluation,
  validateEvaluation,
} from './ScoutTrackRecord';

// Scout Entity
export {
  ScoutContract,
  MAX_FOCUS_PROSPECTS,
  MIN_FOCUS_PROSPECTS,
  Scout,
  ScoutViewModel,
  createScoutViewModel,
  createDefaultScout,
  validateScout,
  getScoutFullName,
  addFocusProspect,
  removeFocusProspect,
  createScoutContract,
  advanceScoutContractYear,
  validateScoutContract,
  getScoutSummary,
} from './Scout';

// Staff Hierarchy
export {
  StaffHierarchy,
  COACHING_REPORTS_TO,
  SCOUTING_REPORTS_TO,
  COACHING_POSITIONS_COUNT,
  SCOUTING_POSITIONS_COUNT,
  TOTAL_STAFF_POSITIONS,
  createEmptyStaffHierarchy,
  getCoachHierarchyKey,
  getCoachingPositionKeys,
  getScoutingPositionKeys,
  countFilledCoachingPositions,
  countFilledScoutingPositions,
  getVacantCoachingPositions,
  getVacantScoutingPositions,
  updateBudget,
  validateStaffHierarchy,
  getDirectReports,
  hasMinimumStaff,
  getStaffHierarchySummary,
} from './StaffHierarchy';

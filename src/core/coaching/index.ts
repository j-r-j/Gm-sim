/**
 * Coaching Module Index
 * Exports all coaching-related types, interfaces, and functions
 */

// Scheme Definitions
export {
  // Types
  SkillRequirement,
  PositionRequirements,
  PlayCallDistribution,
  OffensiveSchemeDefinition,
  DefensivePlayCallDistribution,
  DefensiveSchemeDefinition,
  // Constants
  WEST_COAST_OFFENSE,
  AIR_RAID_OFFENSE,
  SPREAD_OPTION_OFFENSE,
  POWER_RUN_OFFENSE,
  ZONE_RUN_OFFENSE,
  PLAY_ACTION_OFFENSE,
  FOUR_THREE_UNDER_DEFENSE,
  THREE_FOUR_DEFENSE,
  COVER_THREE_DEFENSE,
  COVER_TWO_DEFENSE,
  MAN_PRESS_DEFENSE,
  BLITZ_HEAVY_DEFENSE,
  OFFENSIVE_SCHEME_DEFINITIONS,
  DEFENSIVE_SCHEME_DEFINITIONS,
  // Functions
  getOffensiveSchemeDefinition,
  getDefensiveSchemeDefinition,
  isOffensiveScheme,
  isDefensiveScheme,
  getSchemeDisplayName,
  getSchemeDescription,
  getOffensiveSchemeCounters,
  getDefensiveSchemeCounters,
  getSchemeStrengths,
  getSchemeWeaknesses,
  validatePlayCallDistribution,
  validateDefensivePlayCallDistribution,
} from './SchemeDefinitions';

// Scheme Fit Calculator
export {
  // Types
  SchemeFitScore,
  SchemeFitViewModel,
  PlayerSchemeHistory,
  // Constants
  SCHEME_TRANSITION_PENALTIES,
  FIT_LEVEL_THRESHOLDS,
  // Functions
  calculateRawSchemeFitScore,
  scoreToFitLevel,
  calculateTransitionPenalty,
  calculateDeterministicTransitionPenalty,
  calculateSchemeFitScore,
  createSchemeFitViewModel,
  calculateAllSchemeFits,
  getBestSchemeFit,
  getWorstSchemeFit,
  compareSchemeFits,
  createPlayerSchemeHistory,
  advanceSchemeHistory,
  changeScheme,
  validateSchemeFitScore,
  getSchemeFitModifier,
  getTeamSchemeFitSummary,
} from './SchemeFitCalculator';

// Coaching Staff Manager
export {
  // Types
  StaffChemistryResult,
  ChemistryPairing,
  StaffChemistryViewModel,
  VacancyInfo,
  InterimAssignment,
  CoachingTreeRelationship,
  CoachingStaffState,
  // Functions
  createCoachingStaffState,
  getStaffCoaches,
  getCoachByRole,
  getVacancies,
  hireCoach,
  fireCoach,
  assignInterim,
  removeInterim,
  getInterimForRole,
  calculateStaffChemistry,
  createStaffChemistryViewModel,
  advanceStaffYear,
  buildCoachingTreeRelationships,
  getSameTreeCoaches,
  hasMinimumCoachingStaff,
  getStaffCompleteness,
  validateCoachingStaffState,
  getCoachingStaffSummary,
} from './CoachingStaffManager';

// Coach Evaluation System
export {
  // Types
  DevelopmentImpact,
  DevelopmentImpactViewModel,
  SchemeTeachingResult,
  SchemeTeachingViewModel,
  PlayerCoachChemistry,
  ChemistrySource,
  // Functions
  coachAffectsPlayer,
  calculateDevelopmentImpact,
  createDevelopmentImpactViewModel,
  calculateSchemeTeaching,
  createSchemeTeachingViewModel,
  calculatePlayerCoachChemistry,
  getGameDayCoachModifier,
  getMotivationModifier,
  evaluateCoachOverall,
  getCoachQualityTier,
  generateCoachEvaluationSummary,
  calculateCombinedStaffDevelopmentBonus,
} from './CoachEvaluationSystem';

// Staff Budget Manager
export {
  // Types
  BudgetStatus,
  DeadMoneyEntry,
  ContractNegotiationParams,
  ContractCounterOffer,
  BudgetProjection,
  StaffBudgetState,
  // Functions
  createStaffBudgetState,
  getBudgetStatus,
  calculateFiringDeadMoney,
  recordDeadMoney,
  getTotalDeadMoney,
  advanceDeadMoneyYear,
  isValidSalaryOffer,
  generateCounterOffer,
  createContractFromNegotiation,
  updateBudgetAfterHiring,
  updateBudgetAfterFiring,
  projectBudget,
  getExpiringContracts,
  advanceContractsYear,
  calculateTotalCoachingSalary,
  getBudgetTierDescription,
  canAffordContract,
  getMaxAffordableSalary,
  validateBudgetState,
  getBudgetSummary,
} from './StaffBudgetManager';

/**
 * Scouting System
 * Core scouting department, auto-scouting, focus scouting, accuracy tracking, and pro scouting
 */

// Scouting Department Manager
export {
  ScoutingPosition,
  TOTAL_SCOUTING_POSITIONS,
  SCOUTING_DEPARTMENT_STRUCTURE,
  RegionalAssignment,
  ScoutingDepartmentState,
  ScoutingVacancy,
  ScoutingDepartmentSummary,
  createScoutingDepartmentState,
  getDepartmentScouts,
  getScoutsByRole,
  getScoutingDirector,
  getScoutsForRegion,
  getPrimaryScoutForRegion,
  getScoutingVacancies,
  hireScout,
  fireScout,
  assignScoutToRegion,
  removeScoutFromRegion,
  updateScoutingBudget,
  advanceScoutingYear,
  getScoutingDepartmentSummary,
  hasMinimumScoutingStaff,
  getTotalDepartmentSalary,
  validateScoutingDepartmentState,
  renewScoutContract,
} from './ScoutingDepartmentManager';

// Auto-Scouting System
export {
  SkillRange,
  TraitVisibility,
  AutoScoutingReport,
  AutoScoutingConfig,
  DEFAULT_AUTO_SCOUTING_CONFIG,
  ProspectData,
  WeeklyScoutingResult,
  calculateAutoScoutSkillRange,
  calculateAutoScoutRoundRange,
  getVisibleTraitsForAutoScouting,
  generateAutoScoutingReport,
  processWeeklyAutoScouting,
  aggregateAutoScoutingReports,
  validateAutoScoutingReport,
  getAutoScoutReportQuality,
} from './AutoScoutingSystem';

// Focus Player System
export {
  CharacterAssessment,
  MedicalAssessment,
  SchemeFitAnalysis,
  InterviewInsights,
  FocusScoutingReport,
  FocusScoutingConfig,
  DEFAULT_FOCUS_SCOUTING_CONFIG,
  ExtendedProspectData,
  FocusScoutingProgress,
  getMaxFocusProspects,
  calculateFocusSkillRange,
  calculateFocusRoundRange,
  generateCharacterAssessment,
  generateMedicalAssessment,
  generateSchemeFitAnalysis,
  generateInterviewInsights,
  generateFocusScoutingReport,
  crossReferenceFocusReports,
  canAssignFocusPlayer,
  validateFocusScoutingReport,
} from './FocusPlayerSystem';

// Scout Accuracy System
export {
  AccuracyRevelationState,
  ScoutAccuracyViewModel,
  EvaluationResult,
  HitClassification,
  AccuracyBreakdown,
  createAccuracyRevelationState,
  recordScoutEvaluation,
  updateEvaluationsWithResults,
  advanceAccuracyYear,
  classifyEvaluation,
  getAccuracyBreakdown,
  getPositionAccuracy,
  hasStrengthAtPosition,
  hasWeaknessAtPosition,
  createScoutAccuracyViewModel,
  compareScoutAccuracy,
  getScoutsByAccuracy,
  getYearsUntilRevelation,
  hasPositionAccuracyData,
  getEvaluatedPositions,
  getScoutPositionTendencies,
} from './ScoutAccuracySystem';

// Pro Scouting System
export {
  PlayerStatus,
  VisibilityLevel,
  ContractInfo,
  PerformanceTrend,
  TradeValueAssessment,
  ProPlayerData,
  ProScoutingReport,
  ProScoutingConfig,
  DEFAULT_PRO_SCOUTING_CONFIG,
  getPlayerVisibility,
  calculateProScoutSkillRange,
  getVisibleProTraits,
  analyzePerformanceTrend,
  calculateTradeValue,
  generateProScoutingReport,
  compareProReports,
  identifyScoutingTargets,
  validateProScoutingReport,
} from './ProScoutingSystem';

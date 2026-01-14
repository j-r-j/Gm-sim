/**
 * Off-Season Module
 * Provides 12-phase off-season management from Season End to Season Start
 */

// ============================================
// Off-Season Phase Manager
// ============================================
export {
  // Types
  type OffSeasonPhaseType,
  type TaskActionType,
  type TaskTargetScreen,
  type TaskCompletionCondition,
  type OffSeasonTask,
  type PhaseTaskStatus,
  type OffSeasonEventType,
  type OffSeasonEvent,
  type SeasonRecap,
  type OffSeasonState,
  type RosterChange,
  type PlayerSigning,
  type PlayerRelease,
  type OffSeasonProgress,
  type OffSeasonSummary,

  // Constants
  PHASE_ORDER,
  PHASE_NUMBERS,
  PHASE_NAMES,
  PHASE_DESCRIPTIONS,

  // State creation
  createOffSeasonState,

  // Phase info
  getCurrentPhaseNumber,
  getCurrentPhaseName,
  getCurrentPhaseDescription,

  // Task management
  getCurrentPhaseTasks,
  getRequiredTasks,
  getOptionalTasks,
  areRequiredTasksComplete,
  areAllTasksComplete,
  completeTask,

  // Phase transitions
  canAdvancePhase,
  getNextPhase,
  advancePhase,
  advanceDay,
  skipToNextPhase,
  autoCompletePhase,
  simulateRemainingOffSeason,
  resetPhase,

  // State updates
  setSeasonRecap,
  setDraftOrder,
  addRosterChange,
  addSigning,
  addRelease,
  addEvent,

  // Queries
  getRecentEvents,
  getPhaseEvents,
  getProgress,
  getSummary,

  // Validation
  validateOffSeasonState,
} from './OffSeasonPhaseManager';

// ============================================
// Phase 1: Season End
// ============================================
export {
  type PlayerGrade,
  type AwardType,
  type PlayerSeasonGrade,
  type AwardWinner,
  calculatePlayerGrade,
  gradeToNumber,
  generateSeasonRecap,
  calculateDraftOrderFromStandings,
  getPlayoffResultDescription,
  processSeasonEnd,
  getSeasonSummaryText,
  getAwardDisplayText,
  evaluateSeasonSuccess,
} from './phases/SeasonEndPhase';

// ============================================
// Phase 2: Coaching Decisions
// ============================================
export {
  type CoachEvaluation,
  type CoachCandidate,
  type CoachingChange,
  evaluateCoach,
  generateCoachCandidates,
  fireCoach as fireCoachOffseason,
  hireCoach as hireCoachOffseason,
  promoteCoach,
  processCoachingDecisions,
  getEvaluationSummaryText,
  getCandidateSummaryText,
} from './phases/CoachingDecisionsPhase';

// ============================================
// Phase 3: Contract Management
// ============================================
export {
  type ContractDecision,
  type PlayerContractInfo,
  type TeamCapSituation,
  type RestructureResult,
  type FranchiseTagResult,
  calculateCapSituation,
  calculateRestructureOption,
  applyFranchiseTag,
  cutPlayer as cutPlayerForCap,
  restructureContract,
  processContractManagement,
  getCapSummaryText,
  getContractDecisionSummary,
  calculateMinimumCapNeeded,
  getCutPriority,
  identifyCapCasualties,
} from './phases/ContractManagementPhase';

// ============================================
// Phase 4: Combine
// ============================================
export {
  type CombineDrill,
  type CombineResult,
  type ProDayResult,
  type CombineSummary,
  calculateDrillScore,
  calculateAthleticScore,
  determineStockChange,
  processCombineResults,
  processProDay,
  getCombineSummary,
  getCombineResultText,
  filterProspectsByPosition,
  getTopAthleticProspects,
} from './phases/CombinePhase';

// ============================================
// Phase 5: Free Agency
// ============================================
export {
  type FASubPhase,
  type FreeAgentSummary,
  type TeamFASituation,
  type FAOffer,
  type FASigningResult,
  calculateOfferCompetitiveness,
  wouldAcceptOffer as wouldAcceptFAOffer,
  submitOffer as submitFAOffer,
  signFreeAgent,
  processFreeAgency,
  getTopAvailableFreeAgents,
  getFreeAgentsByPosition,
  identifyTeamNeeds,
  getFASummaryText,
  getSigningSummaryText,
  calculateContractOffer,
  determineSubPhase,
  getSubPhaseDescription,
} from './phases/FreeAgencyPhase';

// ============================================
// Phase 6: Draft
// ============================================
export {
  type DraftPick as OffSeasonDraftPick,
  type DraftProspect,
  type DraftTradeOffer,
  type DraftSelection,
  type DraftSummary,
  getPickValue,
  calculateRookieContract as calculateOffseasonRookieContract,
  makeDraftSelection,
  evaluateTradeOffer,
  executeDraftTrade,
  processDraft,
  getDraftSummary,
  getPickSummaryText,
  getBestAvailable,
  getRecommendations as getDraftRecommendations,
} from './phases/DraftPhase';

// ============================================
// Phase 7: UDFA
// ============================================
export {
  type UDFAProspect,
  type UDFAOffer,
  type UDFASigningResult,
  type TeamUDFAPriorities,
  calculateUDFAOffer,
  wouldAcceptOffer as wouldAcceptUDFAOffer,
  signUDFA,
  processUDFA,
  getAvailableUDFAs,
  getUDFAsByPosition,
  getRecommendedUDFAs,
  createUDFAContract,
  getUDFASummaryText,
  getUDFASigningSummaryText,
  calculateUDFAPriorities,
  updatePrioritiesAfterSigning,
  canSignMoreUDFAs,
} from './phases/UDFAPhase';

// ============================================
// Phase 8: OTAs
// ============================================
export {
  type OTAReport,
  type PositionBattlePreview,
  type RookieIntegrationReport,
  type OTASummary,
  generateOTAReport,
  generatePositionBattlePreview,
  generateRookieIntegrationReport,
  processOTAs,
  getOTASummary,
  getOTAReportText,
  getRookieReportText,
} from './phases/OTAsPhase';

// ============================================
// Phase 9: Training Camp
// ============================================
export {
  type PositionBattle,
  type PositionBattleCompetitor,
  type DevelopmentReveal,
  type CampInjury,
  type TrainingCampSummary,
  updatePositionBattle,
  createPositionBattle,
  generateDevelopmentReveal,
  generateCampInjury,
  processTrainingCamp,
  getTrainingCampSummary,
  getPositionBattleText,
  getCampInjuryReportText,
} from './phases/TrainingCampPhase';

// ============================================
// Phase 10: Preseason
// ============================================
export {
  type PreseasonGame,
  type PreseasonPlayerPerformance,
  type PreseasonInjury,
  type PreseasonEvaluation,
  type PreseasonSummary,
  simulatePreseasonGame,
  createPreseasonEvaluation,
  processPreseason,
  getPreseasonSummary,
  getPreseasonGameText,
  getEvaluationText,
} from './phases/PreseasonPhase';

// ============================================
// Phase 11: Final Cuts
// ============================================
export {
  type CutEvaluationPlayer,
  type RosterStatus,
  type WaiverClaim,
  type FinalCutsSummary,
  isPracticeSquadEligible,
  calculateCutPriority as calculatePlayerCutPriority,
  evaluateRosterForCuts,
  cutPlayer as cutPlayerFromRoster,
  signToPracticeSquad,
  placeOnIR,
  processWaiverClaim,
  processFinalCuts,
  getRosterStatus,
  getFinalCutsSummary,
  getCutSummaryText,
  getRosterBreakdownText,
} from './phases/FinalCutsPhase';

// ============================================
// Phase 12: Season Start
// ============================================
export {
  type ExpectationLevel,
  type OwnerExpectations,
  type MediaProjection,
  type SeasonGoal,
  type SeasonStartSummary,
  calculateOwnerExpectations,
  generateMediaProjections,
  generateSeasonGoals,
  processSeasonStart,
  getSeasonStartSummary,
  getExpectationsText,
  getMediaProjectionsText,
  getGoalsText,
} from './phases/SeasonStartPhase';

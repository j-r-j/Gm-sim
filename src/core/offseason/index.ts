/**
 * Off-Season Module
 * Provides 12-phase off-season management from Season End to Season Start
 */

// ============================================
// Offseason Orchestrator (NEW - Phase A)
// ============================================
export {
  // Main orchestrator functions
  initializeOffseason,
  enterPhase,
  processPhaseAction,
  advanceToNextPhase,
  isOffseasonComplete,
  getCurrentPhase,
  getOffseasonProgress,
  getOffseasonSummary,

  // Types
  type PhaseProcessResult,
  type PhaseAction,
} from './OffseasonOrchestrator';

// ============================================
// Offseason Persistent Data (NEW - Phase A)
// ============================================
export {
  // Types
  type OffseasonPersistentData,
  type OwnerExpectations as PersistentOwnerExpectations,
  type MediaProjection as PersistentMediaProjection,
  type SeasonGoal as PersistentSeasonGoal,
  type AwardWinner as PersistentAwardWinner,
  type WaiverPlayer,
  type CoachEvaluationResult,
  type CoachingChangeRecord,
  type ContractDecisionRecord,
  type DraftSelectionRecord,
  type FreeAgentSigningRecord,
  type UDFASigningRecord,

  // Functions
  createEmptyOffseasonData,
  validateOffseasonData,
  mergeOffseasonData,
} from './OffseasonPersistentData';

// ============================================
// Phase State Mappers (NEW - Phase A)
// ============================================
export {
  // Functions
  applyCoachingChanges,
  applyContractDecisions,
  applyDraftSelections,
  applyFreeAgencySignings,
  applyUDFASignings,
  applyInjuries,
  applyRosterMoves,
  applyDevelopmentChanges,

  // Types
  type PhaseApplicationResult,
} from './PhaseStateMappers';

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
  getSeasonSummaryText,
  getAwardDisplayText,
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
  getCapSummaryText,
  getContractDecisionSummary,
  calculateMinimumCapNeeded,
  getCutPriority,
  identifyCapCasualties,
} from './phases/ContractManagementPhase';

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
  type TrainingCampProgressionResult,
  updatePositionBattle,
  createPositionBattle,
  generateDevelopmentReveal,
  generateCampInjury,
  getTrainingCampSummary,
  getPositionBattleText,
  getCampInjuryReportText,
  processTrainingCampProgression,
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
  getSeasonStartSummary,
  getExpectationsText,
  getMediaProjectionsText,
  getGoalsText,
} from './phases/SeasonStartPhase';

// ============================================
// Bridge Modules (Phase B - System Consolidation)
// ============================================
export {
  // Combine Bridge
  runCombineSimulation,
  integrateCombineIntoOffseasonState,
  getProspectCombineResults,
  getCombineRisers,
  getCombineFallers,
  // UDFA Bridge
  initializeUDFAPool,
  processUserUDFASigning,
  runAIUDFASignings,
  convertToUDFASigningRecords,
  integrateUDFAIntoOffseasonState,
  getTopAvailableUDFAs,
  getUserBudget,
  getUserUDFAs,
  canUserSignMore,
  getUDFAPhaseSummary,
  // Phase Data Flow (OTA→Camp→Preseason→FinalCuts)
  otaToTrainingCampInput,
  trainingCampToPreseasonInput,
  preseasonToFinalCutsInput,
  calculateRosterNeeds,
  summarizePhaseDataFlow,
  // Phase Generators (auto-generate phase data from GameState)
  generateSeasonAwards,
  generateCoachEvaluations,
  generateOTAReports,
  generateRookieIntegrationReports,
  generatePositionBattles,
  generateDevelopmentReveals,
  generateCampInjuries,
  generatePreseasonGames,
  generatePreseasonEvaluations,
  generateSeasonStartData,
} from './bridges';

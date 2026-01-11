/**
 * Free Agency System
 * Complete free agency with legal tampering, Day 1 frenzy, trickle phases, RFA, and compensatory picks.
 */

// ============================================
// Free Agency Manager
// ============================================
export {
  // Types
  FreeAgentType,
  FreeAgencyPhase,
  FreeAgent,
  FreeAgentInterest,
  FreeAgentOffer,
  FreeAgencyEvent,
  FreeAgencyState,
  FreeAgencyDeadlines,
  TeamFABudget,
  FreeAgencySummary,
  // Functions
  createFreeAgencyState,
  createDefaultTeamBudget,
  createDefaultDeadlines,
  addFreeAgent,
  removeFreeAgent,
  getFreeAgentsByType,
  getFreeAgentsByPosition,
  getAvailableFreeAgents,
  getTopFreeAgents,
  advancePhase,
  advanceDay,
  submitOffer,
  acceptOffer,
  rejectOffer,
  withdrawOffer,
  setTeamInterest,
  updateTeamBudget,
  getTeamOffers,
  getFreeAgentOffers,
  getRecentEvents,
  getTeamSignings,
  classifyFreeAgentType,
  isFreeAgencyActive,
  canSignPlayers,
  getPhaseDescription,
  validateFreeAgencyState,
  getFreeAgencySummary,
} from './FreeAgencyManager';

// ============================================
// Market Value Calculator
// ============================================
export {
  // Types
  MarketDemand,
  ProductionTier,
  MarketConditions,
  PlayerProduction,
  MarketValueResult,
  MarketValueSummary,
  OfferComparison,
  // Functions
  createDefaultMarketConditions,
  updateMarketConditions,
  determineProductionTier,
  calculateAgeAdjustment,
  calculateDemandAdjustment,
  calculatePrimeYearsRemaining,
  determineTrajectory,
  calculateMarketValue,
  calculateMarketValues,
  rankByMarketValue,
  getMarketValueSummary,
  compareOfferToMarket,
  validatePlayerProduction,
} from './MarketValueCalculator';

// ============================================
// Legal Tampering Phase
// ============================================
export {
  // Types
  TamperingStatus,
  VerbalAgreement,
  LegalTamperingState,
  TamperingNegotiation,
  TamperingSummary,
  // Functions
  createLegalTamperingState,
  startLegalTampering,
  endLegalTampering,
  initiateNegotiation,
  updateNegotiation,
  recordVerbalAgreement,
  getTeamVerbalAgreements,
  getFreeAgentVerbalAgreements,
  hasVerbalAgreement,
  getPrimaryVerbalAgreement,
  getTeamNegotiations,
  getFreeAgentNegotiations,
  evaluateTamperingOffers,
  advanceTamperingDay,
  getTamperingSummary,
  convertVerbalAgreementsToOffers,
  validateLegalTamperingState,
} from './LegalTamperingPhase';

// ============================================
// Day 1 Frenzy Simulator
// ============================================
export {
  // Types
  FrenzyIntensity,
  BiddingWar,
  FrenzySigningEvent,
  Day1FrenzyState,
  FrenzyConfig,
  FrenzySummary,
  // Functions
  createDay1FrenzyState,
  getDefaultFrenzyConfig,
  startFrenzy,
  endFrenzy,
  updateIntensity,
  initiateBiddingWar,
  processBiddingWarRound,
  endBiddingWar,
  recordFrenzySigning,
  generateEscalatedBid,
  willContinueBidding,
  simulateTeamBid,
  advanceFrenzyTime,
  getActiveBiddingWars,
  getTeamFrenzyActivity,
  getFrenzySummary,
  processVerbalAgreements,
  getSigningRate,
  validateDay1FrenzyState,
} from './Day1FrenzySimulator';

// ============================================
// Trickle Phase Manager
// ============================================
export {
  // Types
  TrickleSubPhase,
  MarketAdjustment,
  BargainOpportunity,
  TricklePhaseState,
  TricklePhaseSummary,
  // Functions
  createTricklePhaseState,
  startTricklePhase,
  endTricklePhase,
  advanceTrickleDay,
  calculateTimeAdjustment,
  updateMarketAdjustment,
  identifyBargainOpportunities,
  generateMinimumOffer,
  generateBargainOffer,
  recordVisit,
  getPlayerVisitors,
  recordMinimumSigning,
  willPlayerAcceptTrickleOffer,
  getBargainsByPosition,
  getRemainingQualityPlayers,
  simulateTeamTrickleActivity,
  getTricklePhaseSummary,
  validateTricklePhaseState,
} from './TricklePhaseManager';

// ============================================
// RFA Tender System
// ============================================
export {
  // Types
  TenderLevel,
  ERFATenderLevel,
  TenderOffer,
  OfferSheet,
  RFASystemState,
  RFADeadlines,
  MatchAnalysis,
  RFASummary,
  // Functions
  createRFASystemState,
  createDefaultRFADeadlines,
  calculateTenderValue,
  getTenderDraftCompensation,
  recommendTenderLevel,
  submitTender,
  withdrawTender,
  getPlayerTender,
  getTeamTenders,
  submitOfferSheet,
  matchOfferSheet,
  declineToMatch,
  getPendingOfferSheetsForTeam,
  getOfferSheetsSubmittedByTeam,
  isOfferSheetDeadlinePassed,
  isMatchingPeriodExpired,
  expireUnresolvedOfferSheets,
  createContractFromOfferSheet,
  createPoisonPillOffer,
  analyzeOfferSheetMatch,
  getRFASummary,
  validateRFASystemState,
} from './RFATenderSystem';

// ============================================
// Compensatory Pick Calculator
// ============================================
export {
  // Types
  FADeparture,
  FAAcquisition,
  CompPickEntitlement,
  TeamCompPickSummary,
  CompensatoryPickAward,
  CompPickCalculatorState,
  CompPickSummary,
  // Constants
  MAX_COMP_PICKS_PER_TEAM,
  MAX_COMP_PICKS_LEAGUE,
  // Functions
  createCompPickCalculatorState,
  isQualifyingContract,
  recordDeparture,
  recordAcquisition,
  determineCompPickRound,
  calculateCompValue,
  getTeamQualifyingDepartures,
  getTeamQualifyingAcquisitions,
  calculateTeamEntitlements,
  calculateTeamSummary,
  calculateAllCompPicks,
  getTeamAwardedPicks,
  getPicksByRound,
  estimateCompPicksForDeparture,
  getCompPickSummary,
  validateCompPickCalculatorState,
} from './CompensatoryPickCalculator';

// ============================================
// AI Free Agency Logic
// ============================================
export {
  // Types
  NeedLevel,
  RosterComposition,
  TeamNeedsAssessment,
  FAStrategy,
  TeamAIProfile,
  AIOfferDecision,
  AISigningTarget,
  AIDecisionSummary,
  // Functions
  createDefaultAIProfile,
  analyzeRosterComposition,
  assessTeamNeeds,
  allocateFABudget,
  evaluateFreeAgent,
  generateDailyTargets,
  adjustOfferForCompetition,
  simulateTeamFADay,
  getAIDecisionSummary,
  validateTeamAIProfile,
} from './AIFreeAgencyLogic';

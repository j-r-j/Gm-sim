/**
 * Simulation Engine
 * Strat-O-Matic inspired probability-based simulation engine.
 *
 * CRITICAL: This is a "black box" - users NEVER see:
 * - Probability tables
 * - Dice roll values
 * - Effective ratings
 * - Internal calculations
 *
 * Users only see:
 * - Play descriptions
 * - Final statistics
 * - Game outcomes
 */

// Effective Rating Calculator
export {
  calculateEffectiveRating,
  calculateAverageEffectiveRating,
  calculateSchemeFitModifier,
  calculateRoleFitModifier,
  calculateCoachChemistryModifier,
  calculateWeatherModifier,
  calculateStakesModifier,
  createDefaultWeather,
  createDomeWeather,
  type EffectiveRatingParams,
  type GameStakes,
  type WeatherCondition,
} from './EffectiveRatingCalculator';

// Weekly Variance Calculator
export {
  calculateWeeklyVariance,
  calculateTeamWeeklyVariances,
  calculateLeagueWeeklyVariances,
  updatePlayerConsistencyAfterGame,
  getVarianceDescription,
  VARIANCE_RANGES,
  type WeeklyVarianceResult,
} from './WeeklyVarianceCalculator';

// Outcome Tables
export {
  generateOutcomeTable,
  rollOutcome,
  generateFieldGoalTable,
  isTurnover,
  isPositiveOutcome,
  isNegativeOutcome,
  type PlayType,
  type PlayOutcome,
  type SecondaryEffect,
  type OutcomeTableEntry,
  type DownAndDistance,
} from './OutcomeTables';

// Play Caller
export {
  selectOffensivePlay,
  selectDefensivePlay,
  shouldAttemptFieldGoal,
  shouldPunt,
  createDefaultPlayCallContext,
  type PlayCallContext,
  type OffensiveFormation,
  type OffensivePlayCall,
  type DefensivePlayCall,
} from './PlayCaller';

// Matchup Resolver
export {
  resolveMatchup,
  resolvePlayMatchup,
  calculateGroupEffectiveRating,
  resolveSimpleMatchup,
  type MatchupResult,
  type PlayerWithEffective,
  type PlayMatchupResult,
} from './MatchupResolver';

// Play Resolver
export {
  resolvePlay,
  resolveSpecialTeamsPlay,
  type PlayResult,
  type PenaltyDetails,
} from './PlayResolver';

// Team Game State
export {
  getActiveOffensivePlayers,
  getActiveDefensivePlayers,
  getPlayerByPosition,
  getPlayerWeeklyVariance,
  getPlayerFatigue,
  updatePlayerFatigue,
  incrementSnapCount,
  getSnapCount,
  useTimeout,
  resetTimeouts,
  getPositionCoach,
  validateTeamGameState,
  getPlayersForPlayType,
  createEmptyOffensivePersonnel,
  createEmptyDefensivePersonnel,
  createEmptySpecialTeamsPersonnel,
  type TeamGameState,
  type OffensivePersonnel,
  type DefensivePersonnel,
  type SpecialTeamsPersonnel,
  type GameCoachingStaff,
} from './TeamGameState';

// Game State Machine
export {
  GameStateMachine,
  createGame,
  createDefaultGameConfig,
  type LiveGameState,
  type GameClock,
  type FieldState,
  type ScoreState,
  type GameConfig,
  type DriveResultWithPlays,
  type OvertimeState,
} from './GameStateMachine';

// Injury Processor
export {
  checkForInjury,
  createNoInjuryResult,
  getInjurySeverityDisplay,
  getInjuryTypeDisplay,
  type InjuryCheckParams,
  type InjuryResult,
  type GameplayInjuryType,
  type GameplayInjurySeverity,
  type PermanentInjuryEffect,
} from './InjuryProcessor';

// Fatigue System
export {
  calculateFatigueIncrease,
  getFatiguePenalty,
  calculateFatigueRecovery,
  calculateHalftimeRecovery,
  calculateBetweenPlayRecovery,
  determinePlayIntensity,
  shouldSubForFatigue,
  getFatigueDescription,
  resetTeamFatigue,
  initializeFatigueLevels,
  type FatigueParams,
  type PlayIntensity,
} from './FatigueSystem';

// Play Description Generator
export {
  generatePlayDescription,
  generateDriveSummary,
  generateQuarterSummary,
  generateGameSummary,
  generateScoringPlayDescription,
  type DriveResult,
  type PlayResultForDescription,
} from './PlayDescriptionGenerator';

// ============================================
// ENHANCED SIMULATION SYSTEMS
// ============================================

// Team Composite Ratings (with weak link detection)
export {
  calculateTeamCompositeRatings,
  calculatePassProtectionRating,
  calculateRunBlockingRating,
  calculateReceivingRating,
  calculateRushingRating,
  calculatePassRushRating,
  calculateRunStoppingRating,
  calculatePassCoverageRating,
  getMatchupAdvantage,
  PASS_PROTECTION_WEIGHTS,
  RUN_BLOCKING_WEIGHTS,
  RUN_LEFT_WEIGHTS,
  RUN_RIGHT_WEIGHTS,
  type UnitRating,
  type TeamCompositeRatings,
  type CompositeRatingParams,
} from './TeamCompositeRatings';

// Personnel Packages
export {
  selectOffensivePersonnel,
  selectDefensivePersonnel,
  calculatePersonnelMismatch,
  getPersonnelTendencyAdjustment,
  OFFENSIVE_PERSONNEL,
  DEFENSIVE_PERSONNEL,
  type OffensivePersonnelPackage,
  type DefensivePersonnelPackage,
  type PersonnelInfo,
  type DefensivePersonnelInfo,
  type PersonnelMismatch,
} from './PersonnelPackages';

// Scheme Matchup Effects
export {
  getSchemeMatchupEffects,
  getPlayTypeEffects,
  applySchemeEffects,
  getRunSuccessModifier,
  getPassSuccessModifier,
  type PlayTypeEffects,
  type SchemeMatchupEffect,
} from './SchemeMatchupEffects';

// Play-Action Effectiveness
export {
  RunGameTracker,
  calculatePlayActionEffectiveness,
  getPlayActionModifier,
  adjustSackProbability,
  shouldUsePlayAction,
  createRunGameTracker,
  type RunGameStats,
  type PlayActionEffectiveness,
} from './PlayActionEffectiveness';

// Pass Rush Phases
export {
  resolvePassRushPhase,
  determinePassRushPhase,
  calculateScrambleOutcome,
  getOverallPassRushResult,
  calculateProtectionTime,
  calculatePhaseMatchup,
  PHASE_TIMING,
  PHASE_WEIGHTS,
  type PassRushPhase,
  type PhaseResult,
  type PhaseMatchupResult,
  type OLPlayer,
  type RusherPlayer,
} from './PassRushPhases';

// Presnap Reads
export {
  executePresnapRead,
  getQBMentalAttributes,
  estimateBoxCount,
  getHotRouteBonus,
  getProtectionChangeBonus,
  type PresnapReadResult,
  type QBMentalAttributes,
} from './PresnapReads';

// Situational Modifiers
export {
  determineSituation,
  getSituationalModifier,
  calculatePlayerSituationalModifier,
  getTeamSituationalModifier,
  isClutchSituation,
  isPressureSituation,
  getSituationalPlayCallingAdjustment,
  type GameSituation,
  type SituationContext,
  type SituationalModifier,
} from './SituationalModifiers';

// Fatigue Curves (Non-linear)
export {
  calculateFatigueEffectiveness,
  getPositionFatigueCurve,
  shouldSubstituteForFatigue,
  calculateRBTouchEffectiveness,
  calculateDLSnapShareEffectiveness,
  getOptimalRestPlays,
  getFatigueInjuryRiskMultiplier,
  type FatigueCurveType,
  type FatigueCurveParams,
} from './FatigueCurves';

// Enhanced Play Resolver
export {
  resolveEnhancedPlay,
  createEnhancedGameState,
  type EnhancedPlayResult,
  type EnhancedGameState,
} from './EnhancedPlayResolver';

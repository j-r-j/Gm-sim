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

/**
 * Season Module
 *
 * Provides complete season simulation including:
 * - Schedule generation (17-game regular season)
 * - Standings calculation with NFL tiebreakers
 * - Week-by-week simulation
 * - Playoff bracket generation and advancement
 * - Draft order calculation
 */

// Bye Week Management
export {
  BYE_WEEK_START,
  BYE_WEEK_END,
  TOTAL_BYE_WEEKS,
  assignByeWeeks,
  isOnBye,
  getTeamsOnBye,
  getByeWeekDistribution,
  validateByeWeeks,
  getAvailableTeams,
  getTeamByeWeek,
  type TeamByeWeek,
} from './ByeWeekManager';

// Schedule Generation
export {
  generateSeasonSchedule,
  getWeekGames,
  getTeamSchedule,
  getTeamRemainingSchedule,
  getTeamCompletedGames,
  updateGameResult,
  getMatchup,
  getCompletedGameCount,
  isRegularSeasonComplete,
  createDefaultStandings,
  // Rotation lookup functions
  getIntraconfOpponentDivision,
  getInterconfOpponentDivision,
  get17thGameOpponentDivision,
  get17thGameHomeConference,
  // Validation gates
  validateSchedule,
  validateGate1GameCountPerTeam,
  validateGate2TotalLeagueGames,
  validateGate3HomeAwayBalance,
  validateGate4DivisionalGames,
  validateGate5IntraconfRotation,
  validateGate6InterconfRotation,
  validateGate7StandingsIntraconf,
  validateGate8SeventeenthGame,
  validateGate9NoDuplicates,
  validateGate10BucketSizes,
  validateGate11Symmetry,
  validateGate12SeventeenthGameDivisionSeparation,
  validateGate13RotationAdvancement,
  validateGate14HomeConferenceAlternation,
  type TimeSlot,
  type GameComponent,
  type ScheduledGame,
  type SeasonSchedule,
  type PreviousYearStandings,
  type ValidationResult,
} from './ScheduleGenerator';

// Standings Calculation
export {
  calculateStandings,
  determinePlayoffTeams,
  getPlayoffSeeds,
  getTeamStanding,
  formatStandingRecord,
  getPlayoffPicture,
  resolveWildcardTiebreaker,
  type HeadToHeadRecord,
  type TeamStanding,
  type ConferenceStandingsList,
  type DetailedDivisionStandings,
  type PlayoffTeams,
} from './StandingsCalculator';

// Week Simulation
export {
  simulateWeek,
  simulateUserTeamGame,
  advanceWeek,
  getUserTeamGame,
  isUserOnBye,
  getWeekSummary,
  type SimulatedGameResult,
  type PlayoffImplicationType,
  type PlayoffImplication,
  type InjuryReportEntry,
  type NewsHeadline,
  type WeekResults,
  type WeekAdvancementResult,
} from './WeekSimulator';

// Playoff Generation
export {
  generatePlayoffBracket,
  advancePlayoffRound,
  simulatePlayoffGame,
  simulatePlayoffRound,
  getCurrentPlayoffRound,
  arePlayoffsComplete,
  getTeamsAlive,
  getTeamEliminationRound,
  getTeamPlayoffSeed,
  createEmptyPlayoffSchedule,
  type PlayoffRound,
  type PlayoffMatchup,
  type PlayoffSchedule,
} from './PlayoffGenerator';

// Draft Order
export {
  calculateDraftOrder,
  getTeamDraftPosition,
  calculatePreliminaryDraftOrder,
  formatDraftOrder,
  getPickRangeForRound,
  explainDraftPosition,
  resolveDraftTiebreaker,
} from './DraftOrderCalculator';

// Season Management
export {
  SeasonManager,
  createSeasonManager,
  type SeasonPhase,
  type SeasonState,
  type SeasonSummary,
} from './SeasonManager';

/**
 * Game Module
 * Complete game resolution system including statistics tracking,
 * box score generation, and post-game processing.
 *
 * This module builds on the engine to provide the full game experience.
 */

// Statistics Tracker
export {
  StatisticsTracker,
  calculatePasserRating,
  createEmptyPassingStats,
  createEmptyRushingStats,
  createEmptyReceivingStats,
  createEmptyDefensiveStats,
  createEmptyKickingStats,
  createEmptyPlayerGameStats,
  createEmptyTeamGameStats,
  type PassingStats,
  type RushingStats,
  type ReceivingStats,
  type DefensiveStats,
  type KickingStats,
  type PlayerGameStats,
  type TeamGameStats,
} from './StatisticsTracker';

// Box Score Generator
export {
  generateBoxScore,
  createEmptyBoxScore,
  getBoxScoreWinner,
  formatBoxScoreSummary,
  type BoxScore,
  type ScoringPlay,
  type PlayerStatLine,
  type TeamComparisonCategory,
  type TeamInfo,
  type PlayerInfo,
  type GameInfo,
} from './BoxScoreGenerator';

// Game Setup
export {
  setupGame,
  quickSetup,
  generateWeather,
  calculateHomeFieldAdvantage,
  determineGameStakes,
  selectStartingLineup,
  type GameConfig,
  type StartingLineup,
  type GameSetupResult,
} from './GameSetup';

// Game Runner
export {
  GameRunner,
  runGame,
  runQuickGame,
  createGameRunner,
  type GameResult,
  type GameRunnerOptions,
  type GameInjury,
  type NotableEvent,
} from './GameRunner';

// Post-Game Processor
export {
  processGameResult,
  generateGameNews,
  checkMilestones,
  applyPlayerUpdates,
  createEmptyCareerStats,
  updateCareerStats,
  type PostGameUpdates,
  type PlayerUpdate,
  type TeamUpdate,
  type StandingsUpdate,
  type InjuryUpdate,
  type NewsEvent,
  type PlayerCareerStats,
} from './PostGameProcessor';

// Season Stats Aggregator
export {
  aggregatePlayerStats,
  aggregateTeamStats,
  calculateLeagueRankings,
  applyRankingsToTeamStats,
  getLeagueLeaders,
  getPasserRatingLeaders,
  getYardsPerCarryLeaders,
  getYardsPerReceptionLeaders,
  getFantasyLeaders,
  getApproximateValueLeaders,
  createEmptyPlayerSeasonStats,
  createEmptyTeamSeasonStats,
  type PlayerSeasonStats,
  type TeamSeasonStats,
  type TeamRankings,
} from './SeasonStatsAggregator';

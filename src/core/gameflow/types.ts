/**
 * Game Flow Types
 *
 * Comprehensive type definitions for the game and week flow system.
 * Follows NFL game flow patterns with clear state transitions.
 */

import { Team } from '../models/team/Team';
import { GameResult } from '../game/GameRunner';
import { ScheduledGame } from '../season/ScheduleGenerator';
import { WeatherCondition, GameStakes } from '../engine/EffectiveRatingCalculator';

// ============================================================================
// GAME DAY FLOW TYPES
// ============================================================================

/**
 * Game day phases - the user's journey through a game
 */
export type GameDayPhase =
  | 'idle' // No game in progress
  | 'pre_game' // Viewing matchup, predictions, injury report
  | 'coin_toss' // Brief coin toss animation
  | 'simulating' // Game simulation in progress
  | 'halftime' // Halftime summary
  | 'post_game' // Viewing final result and box score
  | 'saving'; // Saving game result

/**
 * Simulation speed options
 */
export type SimulationSpeed = 'slow' | 'normal' | 'fast' | 'instant';

/**
 * Simulation speed delays in milliseconds
 */
export const SIMULATION_DELAYS: Record<SimulationSpeed, number> = {
  slow: 1500,
  normal: 800,
  fast: 300,
  instant: 0,
};

/**
 * User prediction for the game outcome
 */
export type GamePrediction = 'win' | 'loss' | null;

/**
 * Pre-game information displayed to user
 */
export interface PreGameInfo {
  /** The scheduled game */
  game: ScheduledGame;

  /** User's team */
  userTeam: Team;

  /** Opponent team */
  opponent: Team;

  /** Whether user is home team */
  isUserHome: boolean;

  /** Weather conditions */
  weather: WeatherCondition;

  /** Game stakes */
  stakes: GameStakes;

  /** Week number */
  week: number;

  /** Key matchup description */
  keyMatchup: string;

  /** User team injuries */
  userInjuries: InjuryStatus[];

  /** Opponent injuries */
  opponentInjuries: InjuryStatus[];

  /** Recent form (last 3 games) */
  userForm: GameOutcome[];
  opponentForm: GameOutcome[];
}

/**
 * Injury status for pre-game display
 */
export interface InjuryStatus {
  playerId: string;
  playerName: string;
  position: string;
  injury: string;
  status: 'out' | 'doubtful' | 'questionable' | 'probable';
}

/**
 * Recent game outcome for form display
 */
export interface GameOutcome {
  result: 'W' | 'L' | 'T';
  opponentAbbr: string;
  score: string;
}

/**
 * Live game state for UI display
 */
export interface LiveGameDisplay {
  /** Game ID */
  gameId: string;

  /** Score */
  homeScore: number;
  awayScore: number;

  /** Clock */
  quarter: 1 | 2 | 3 | 4 | 'OT' | 'Final';
  timeRemaining: number;
  isClockRunning: boolean;

  /** Field position */
  possession: 'home' | 'away';
  ballPosition: number; // Yards from home endzone
  down: 1 | 2 | 3 | 4;
  yardsToGo: number;

  /** Team info */
  homeTeam: {
    id: string;
    name: string;
    abbr: string;
    timeoutsRemaining: number;
  };
  awayTeam: {
    id: string;
    name: string;
    abbr: string;
    timeoutsRemaining: number;
  };

  /** Current drive info */
  currentDrive: {
    plays: number;
    yards: number;
    timeOfPossession: number;
  };

  /** Recent plays for display */
  recentPlays: PlayDisplay[];

  /** Is game complete */
  isComplete: boolean;
}

/**
 * Play result formatted for display
 */
export interface PlayDisplay {
  id: string;
  quarter: number;
  time: string;
  offenseTeam: string;
  description: string;
  yardsGained: number;
  isScoring: boolean;
  isTurnover: boolean;
  isBigPlay: boolean;
  score: string;
}

/**
 * Halftime summary
 */
export interface HalftimeInfo {
  homeScore: number;
  awayScore: number;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  homeFirstHalfStats: HalfStats;
  awayFirstHalfStats: HalfStats;
  keyPlays: PlayDisplay[];
}

/**
 * Half stats summary
 */
export interface HalfStats {
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  turnovers: number;
  timeOfPossession: number;
}

/**
 * Post-game result for display
 */
export interface PostGameInfo {
  /** The final game result */
  result: GameResult;

  /** User's team */
  userTeam: Team;

  /** Opponent team */
  opponent: Team;

  /** Did user win */
  userWon: boolean;

  /** Was this an upset */
  wasUpset: boolean;

  /** User's prediction vs result */
  predictionCorrect: boolean | null;

  /** Updated user record */
  newUserRecord: string;

  /** Key plays */
  keyPlays: PlayDisplay[];

  /** MVP candidate */
  mvp: {
    playerId: string;
    playerName: string;
    position: string;
    statLine: string;
  } | null;

  /** Injuries that occurred */
  newInjuries: InjuryStatus[];

  /** Playoff implications */
  playoffImplication: string | null;
}

// ============================================================================
// WEEK FLOW TYPES
// ============================================================================

/**
 * Week flow phases - the user's journey through a week
 */
export type WeekFlowPhase =
  | 'week_start' // Start of a new week, show schedule
  | 'pre_game' // User viewing their upcoming game
  | 'game_day' // Game simulation in any phase
  | 'post_game' // Viewing game results
  | 'other_games' // Simulating rest of league
  | 'week_summary' // Viewing week summary, standings
  | 'ready_to_advance'; // Ready to advance to next week

/**
 * Season phase
 */
export type SeasonPhase = 'preseason' | 'regularSeason' | 'playoffs' | 'offseason';

/**
 * Week flow state
 */
export interface WeekFlowState {
  /** Current phase */
  phase: WeekFlowPhase;

  /** Current week number */
  weekNumber: number;

  /** Season phase */
  seasonPhase: SeasonPhase;

  /** Is user on bye this week */
  isUserOnBye: boolean;

  /** User's game for this week (null if bye) */
  userGame: ScheduledGame | null;

  /** Has user's game been completed */
  userGameCompleted: boolean;

  /** User's game result (if completed) */
  userGameResult: GameResult | null;

  /** Other games this week */
  otherGames: ScheduledGame[];

  /** Completed other games count */
  otherGamesCompleted: number;

  /** Completion gates */
  gates: {
    gameResultViewed: boolean;
    weekSummaryViewed: boolean;
  };
}

/**
 * Week summary information
 */
export interface WeekSummary {
  /** Week number */
  week: number;

  /** User's result */
  userResult: {
    won: boolean;
    score: string;
    opponent: string;
    newRecord: string;
  } | null;

  /** All game results */
  gameResults: GameSummary[];

  /** Division standings after this week */
  standings: DivisionStandingSummary[];

  /** Playoff implications */
  playoffImplications: PlayoffImplication[];

  /** Notable events */
  headlines: Headline[];

  /** Injury updates */
  injuryUpdates: InjuryUpdate[];
}

/**
 * Game summary for week summary
 */
export interface GameSummary {
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  homeScore: number;
  awayScore: number;
  isUserGame: boolean;
}

/**
 * Division standings for summary
 */
export interface DivisionStandingSummary {
  conference: 'AFC' | 'NFC';
  division: 'North' | 'South' | 'East' | 'West';
  teams: {
    name: string;
    abbr: string;
    wins: number;
    losses: number;
    ties: number;
    divisionRank: number;
    isUserTeam: boolean;
  }[];
}

/**
 * Playoff implication
 */
export interface PlayoffImplication {
  teamId: string;
  teamName: string;
  type: 'clinched_division' | 'clinched_playoff' | 'eliminated' | 'controls_destiny';
  description: string;
}

/**
 * News headline
 */
export interface Headline {
  text: string;
  importance: 'major' | 'notable' | 'minor';
  teamIds: string[];
}

/**
 * Injury update
 */
export interface InjuryUpdate {
  playerId: string;
  playerName: string;
  teamId: string;
  teamAbbr: string;
  type: 'new_injury' | 'recovered' | 'status_change';
  description: string;
}

// ============================================================================
// GAME FLOW MANAGER TYPES
// ============================================================================

/**
 * Overall game flow state combining week and game day states
 */
export interface GameFlowState {
  /** Week flow state */
  weekFlow: WeekFlowState;

  /** Game day flow state (null if not on game day) */
  gameDayFlow: GameDayFlowState | null;

  /** Is loading */
  isLoading: boolean;

  /** Error message */
  error: string | null;
}

/**
 * Game day flow state
 */
export interface GameDayFlowState {
  /** Current phase */
  phase: GameDayPhase;

  /** Pre-game info */
  preGameInfo: PreGameInfo | null;

  /** Live game display */
  liveGame: LiveGameDisplay | null;

  /** Current simulation speed */
  simulationSpeed: SimulationSpeed;

  /** Is simulation paused */
  isPaused: boolean;

  /** User's prediction */
  prediction: GamePrediction;

  /** Halftime info (if reached) */
  halftimeInfo: HalftimeInfo | null;

  /** Post-game info (if complete) */
  postGameInfo: PostGameInfo | null;
}

/**
 * Action types for game flow state machine
 */
export type GameFlowAction =
  // Week flow actions
  | { type: 'START_WEEK'; weekNumber: number; seasonPhase: SeasonPhase }
  | { type: 'VIEW_PRE_GAME' }
  | { type: 'START_GAME_DAY' }
  | { type: 'COMPLETE_USER_GAME'; result: GameResult }
  | { type: 'VIEW_POST_GAME' }
  | { type: 'MARK_RESULT_VIEWED' }
  | { type: 'SIM_OTHER_GAMES' }
  | { type: 'VIEW_WEEK_SUMMARY' }
  | { type: 'MARK_SUMMARY_VIEWED' }
  | { type: 'ADVANCE_WEEK' }

  // Game day flow actions
  | { type: 'SET_PREDICTION'; prediction: GamePrediction }
  | { type: 'START_SIMULATION' }
  | { type: 'PAUSE_SIMULATION' }
  | { type: 'RESUME_SIMULATION' }
  | { type: 'SET_SPEED'; speed: SimulationSpeed }
  | { type: 'SKIP_TO_END' }
  | { type: 'UPDATE_LIVE_GAME'; game: LiveGameDisplay }
  | { type: 'REACH_HALFTIME'; info: HalftimeInfo }
  | { type: 'COMPLETE_GAME'; info: PostGameInfo }

  // General actions
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'RESET' };

/**
 * Callback functions for game flow events
 */
export interface GameFlowCallbacks {
  onWeekStart?: (week: number) => void;
  onGameStart?: (preGameInfo: PreGameInfo) => void;
  onPlayComplete?: (play: PlayDisplay) => void;
  onScoreChange?: (homeScore: number, awayScore: number) => void;
  onQuarterEnd?: (quarter: number) => void;
  onHalftime?: (info: HalftimeInfo) => void;
  onGameComplete?: (result: GameResult) => void;
  onWeekComplete?: (summary: WeekSummary) => void;
  onInjury?: (injury: InjuryStatus) => void;
  onTurnover?: (play: PlayDisplay) => void;
  onTouchdown?: (play: PlayDisplay) => void;
}

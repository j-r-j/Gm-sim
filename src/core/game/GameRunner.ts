/**
 * Game Runner
 * Orchestrates complete game simulation, combining the engine with statistics
 * tracking and box score generation. Supports both instant and play-by-play modes.
 */

import {
  GameStateMachine,
  LiveGameState,
  createDefaultGameConfig,
} from '../engine/GameStateMachine';
import { PlayResult } from '../engine/PlayResolver';
import { TeamGameState } from '../engine/TeamGameState';
import { StatisticsTracker, TeamGameStats } from './StatisticsTracker';
import {
  BoxScore,
  ScoringPlay,
  generateBoxScore,
  TeamInfo,
  PlayerInfo,
  GameInfo,
} from './BoxScoreGenerator';
import { GameConfig, setupGame, GameSetupResult, quickSetup } from './GameSetup';
import { Team } from '../models/team/Team';
import { Player } from '../models/player/Player';
import { Coach } from '../models/staff/Coach';

/**
 * Injury that occurred during the game
 */
export interface GameInjury {
  playerId: string;
  playerName: string;
  team: string;
  injuryType: string;
  severity: string;
  weeksOut: number;
}

/**
 * Notable event during the game
 */
export interface NotableEvent {
  type: 'milestone' | 'record' | 'highlight' | 'lowlight';
  playerId: string | null;
  description: string;
  quarter: number;
  time: string;
}

/**
 * Complete result of a game
 */
export interface GameResult {
  gameId: string;
  week: number;

  // Outcome
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  winnerId: string;
  loserId: string;
  isTie: boolean;

  // Stats
  homeStats: TeamGameStats;
  awayStats: TeamGameStats;
  boxScore: BoxScore;

  // Injuries that occurred
  injuries: GameInjury[];

  // Notable events
  notableEvents: NotableEvent[];

  // Key plays (condensed play-by-play)
  keyPlays: PlayResult[];
}

/**
 * Options for game runner
 */
export interface GameRunnerOptions {
  mode: 'instant' | 'playByPlay';
  onPlayComplete?: (play: PlayResult, state: LiveGameState) => void;
  onQuarterComplete?: (quarter: number, state: LiveGameState) => void;
  onScoreChange?: (state: LiveGameState) => void;
}

/**
 * Default game runner options
 */
function createDefaultOptions(): GameRunnerOptions {
  return {
    mode: 'instant',
  };
}

/**
 * Format time remaining as MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Check if a play is a "key play" (significant)
 */
function isKeyPlay(play: PlayResult): boolean {
  // Touchdowns
  if (play.touchdown) return true;

  // Turnovers
  if (play.turnover) return true;

  // Big plays (20+ yards)
  if (play.yardsGained >= 20) return true;

  // Sacks and big losses
  if (play.yardsGained <= -5) return true;

  // Injuries
  if (play.injuryOccurred) return true;

  // Field goals
  if (play.playType === 'field_goal') return true;

  return false;
}

/**
 * Generate scoring play description
 */
function generateScoringDescription(play: PlayResult): string {
  if (play.touchdown) {
    if (play.playType.includes('pass') || play.playType.includes('action')) {
      return `${play.yardsGained} yard touchdown pass`;
    } else if (play.playType.startsWith('run') || play.playType === 'qb_sneak') {
      return `${play.yardsGained} yard touchdown run`;
    }
    return 'Touchdown';
  }

  if (play.outcome === 'field_goal_made') {
    return 'Field goal';
  }

  return play.description;
}

/**
 * Game Runner class
 * Manages game simulation with statistics tracking
 */
export class GameRunner {
  private machine: GameStateMachine;
  private tracker: StatisticsTracker;
  private options: GameRunnerOptions;
  private setup: GameSetupResult;

  private scoringPlays: ScoringPlay[] = [];
  private injuries: GameInjury[] = [];
  private notableEvents: NotableEvent[] = [];
  private keyPlays: PlayResult[] = [];
  private previousScore: { home: number; away: number } = { home: 0, away: 0 };
  private lastQuarter: number = 1;
  private playerInfo: Map<string, PlayerInfo> = new Map();
  private homeTeamInfo: TeamInfo;
  private awayTeamInfo: TeamInfo;
  private gameInfo: GameInfo;

  constructor(
    setup: GameSetupResult,
    options: Partial<GameRunnerOptions> = {},
    gameInfo?: Partial<GameInfo>
  ) {
    this.setup = setup;
    this.options = { ...createDefaultOptions(), ...options };

    // Create game state machine
    const config = createDefaultGameConfig(`game-${Date.now()}`);
    config.weather = setup.weather;
    config.stakes = setup.stakes;

    this.machine = new GameStateMachine(setup.homeTeamState, setup.awayTeamState, config);

    // Create statistics tracker
    this.tracker = new StatisticsTracker(setup.homeTeamState.teamId, setup.awayTeamState.teamId);

    // Build player info map
    this.buildPlayerInfo(setup.homeTeamState);
    this.buildPlayerInfo(setup.awayTeamState);

    // Set up team info
    this.homeTeamInfo = {
      id: setup.homeTeamState.teamId,
      name: setup.homeTeamState.teamName,
      abbreviation: setup.homeTeamState.teamName.substring(0, 3).toUpperCase(),
    };

    this.awayTeamInfo = {
      id: setup.awayTeamState.teamId,
      name: setup.awayTeamState.teamName,
      abbreviation: setup.awayTeamState.teamName.substring(0, 3).toUpperCase(),
    };

    this.gameInfo = {
      gameId: gameInfo?.gameId || config.gameId,
      week: gameInfo?.week || 1,
      date: gameInfo?.date || new Date().toISOString().split('T')[0],
    };
  }

  /**
   * Build player info map from team state
   */
  private buildPlayerInfo(teamState: TeamGameState): void {
    for (const [playerId, player] of teamState.allPlayers) {
      this.playerInfo.set(playerId, {
        id: playerId,
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position,
      });
    }
  }

  /**
   * Process a play and update all tracking
   */
  private processPlay(play: PlayResult): void {
    const state = this.machine.getState();
    const offenseTeamId =
      state.field.possession === 'home' ? state.homeTeam.teamId : state.awayTeam.teamId;

    // Calculate time elapsed (estimate)
    const timeElapsed = Math.floor(Math.random() * 10) + 5;

    // Record in statistics tracker
    this.tracker.recordPlay(play, offenseTeamId, {
      down: state.field.down,
      distance: state.field.yardsToGo,
      fieldPosition: state.field.ballPosition,
      timeElapsed,
    });

    // Track quarter changes
    const currentQuarter = typeof state.clock.quarter === 'number' ? state.clock.quarter : 5;
    if (currentQuarter !== this.lastQuarter) {
      this.tracker.setQuarter(currentQuarter);
      this.lastQuarter = currentQuarter;

      if (this.options.onQuarterComplete) {
        this.options.onQuarterComplete(currentQuarter - 1, state);
      }
    }

    // Track scoring plays
    if (
      state.score.home !== this.previousScore.home ||
      state.score.away !== this.previousScore.away
    ) {
      this.recordScoringPlay(play, state);

      if (this.options.onScoreChange) {
        this.options.onScoreChange(state);
      }
    }

    // Track injuries
    if (play.injuryOccurred && play.injuredPlayerId) {
      this.recordInjury(play, state);
    }

    // Track key plays
    if (isKeyPlay(play)) {
      this.keyPlays.push(play);
    }

    // Callback
    if (this.options.onPlayComplete) {
      this.options.onPlayComplete(play, state);
    }
  }

  /**
   * Record a scoring play
   */
  private recordScoringPlay(play: PlayResult, state: LiveGameState): void {
    const scoreDiff = {
      home: state.score.home - this.previousScore.home,
      away: state.score.away - this.previousScore.away,
    };

    const scoringTeam = scoreDiff.home > 0 ? 'home' : 'away';
    const teamInfo = scoringTeam === 'home' ? this.homeTeamInfo : this.awayTeamInfo;

    this.scoringPlays.push({
      quarter: typeof state.clock.quarter === 'number' ? state.clock.quarter : 5,
      time: formatTime(state.clock.timeRemaining),
      team: teamInfo.name,
      teamId: teamInfo.id,
      description: generateScoringDescription(play),
      homeScore: state.score.home,
      awayScore: state.score.away,
    });

    this.previousScore = { ...state.score };
  }

  /**
   * Record an injury
   */
  private recordInjury(play: PlayResult, state: LiveGameState): void {
    if (!play.injuredPlayerId) return;

    const playerInfo = this.playerInfo.get(play.injuredPlayerId);
    const isHomePlayer = state.homeTeam.allPlayers.has(play.injuredPlayerId);
    const teamName = isHomePlayer ? state.homeTeam.teamName : state.awayTeam.teamName;

    this.injuries.push({
      playerId: play.injuredPlayerId,
      playerName: playerInfo ? `${playerInfo.firstName} ${playerInfo.lastName}` : 'Unknown Player',
      team: teamName,
      injuryType: 'Unknown', // Would come from InjuryProcessor in full implementation
      severity: 'Unknown',
      weeksOut: 0,
    });

    // Add as notable event
    this.notableEvents.push({
      type: 'lowlight',
      playerId: play.injuredPlayerId,
      description: `${playerInfo?.firstName} ${playerInfo?.lastName} injured on the play`,
      quarter: typeof state.clock.quarter === 'number' ? state.clock.quarter : 5,
      time: formatTime(state.clock.timeRemaining),
    });
  }

  /**
   * Run game to completion (instant mode)
   */
  runToCompletion(): GameResult {
    while (!this.machine.isGameOver()) {
      const play = this.machine.executePlay();
      this.processPlay(play);

      // Safety check
      if (this.machine.getState().plays.length > 300) {
        break;
      }
    }

    return this.generateResult();
  }

  /**
   * Run a single play (play-by-play mode)
   */
  runNextPlay(): { play: PlayResult; state: LiveGameState; isComplete: boolean } {
    const play = this.machine.executePlay();
    this.processPlay(play);

    return {
      play,
      state: this.machine.getState(),
      isComplete: this.machine.isGameOver(),
    };
  }

  /**
   * Run a complete drive
   */
  runDrive(): { plays: PlayResult[]; state: LiveGameState; isComplete: boolean } {
    const driveResult = this.machine.simulateDrive();

    for (const play of driveResult.plays) {
      this.processPlay(play);
    }

    return {
      plays: driveResult.plays,
      state: this.machine.getState(),
      isComplete: this.machine.isGameOver(),
    };
  }

  /**
   * Run a complete quarter
   */
  runQuarter(): { plays: PlayResult[]; state: LiveGameState; isComplete: boolean } {
    const startPlays = this.machine.getState().plays.length;
    this.machine.simulateQuarter();
    const state = this.machine.getState();
    const newPlays = state.plays.slice(startPlays);

    for (const play of newPlays) {
      this.processPlay(play);
    }

    return {
      plays: newPlays,
      state,
      isComplete: this.machine.isGameOver(),
    };
  }

  /**
   * Get current game state
   */
  getCurrentState(): LiveGameState {
    return this.machine.getState();
  }

  /**
   * Get current box score
   */
  getBoxScore(): BoxScore {
    this.tracker.finalizeStats();

    return generateBoxScore(
      this.tracker.getHomeStats(),
      this.tracker.getAwayStats(),
      this.scoringPlays,
      this.gameInfo,
      this.homeTeamInfo,
      this.awayTeamInfo,
      this.playerInfo
    );
  }

  /**
   * Get current game result (can be called at any time, including when game is complete)
   */
  getResult(): GameResult {
    return this.generateResult();
  }

  /**
   * Generate final game result
   */
  private generateResult(): GameResult {
    this.tracker.finalizeStats();

    const homeStats = this.tracker.getHomeStats();
    const awayStats = this.tracker.getAwayStats();

    const isTie = homeStats.score === awayStats.score;
    const homeWins = homeStats.score > awayStats.score;

    const boxScore = generateBoxScore(
      homeStats,
      awayStats,
      this.scoringPlays,
      this.gameInfo,
      this.homeTeamInfo,
      this.awayTeamInfo,
      this.playerInfo
    );

    return {
      gameId: this.gameInfo.gameId,
      week: this.gameInfo.week,

      homeTeamId: this.homeTeamInfo.id,
      awayTeamId: this.awayTeamInfo.id,
      homeScore: homeStats.score,
      awayScore: awayStats.score,

      winnerId: isTie ? '' : homeWins ? this.homeTeamInfo.id : this.awayTeamInfo.id,
      loserId: isTie ? '' : homeWins ? this.awayTeamInfo.id : this.homeTeamInfo.id,
      isTie,

      homeStats,
      awayStats,
      boxScore,

      injuries: this.injuries,
      notableEvents: this.notableEvents,
      keyPlays: this.keyPlays,
    };
  }
}

/**
 * Run a complete game with full setup
 */
export function runGame(
  config: GameConfig,
  teams: Map<string, Team>,
  players: Map<string, Player>,
  coaches: Map<string, Coach>
): GameResult {
  const setup = setupGame(config, teams, players, coaches);

  const runner = new GameRunner(
    setup,
    { mode: 'instant' },
    {
      week: config.week,
      date: new Date().toISOString().split('T')[0],
    }
  );

  return runner.runToCompletion();
}

/**
 * Run a quick game with pre-built team states (for testing)
 */
export function runQuickGame(
  homeTeamState: TeamGameState,
  awayTeamState: TeamGameState,
  options?: { week?: number; isPlayoff?: boolean }
): GameResult {
  const setup = quickSetup(homeTeamState, awayTeamState, options);

  const runner = new GameRunner(
    setup,
    { mode: 'instant' },
    {
      week: options?.week || 1,
      date: new Date().toISOString().split('T')[0],
    }
  );

  return runner.runToCompletion();
}

/**
 * Create a game runner for play-by-play simulation
 */
export function createGameRunner(
  setup: GameSetupResult,
  options: Partial<GameRunnerOptions> = {},
  gameInfo?: Partial<GameInfo>
): GameRunner {
  return new GameRunner(setup, options, gameInfo);
}

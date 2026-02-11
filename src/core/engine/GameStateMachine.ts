/**
 * Game State Machine
 * Manages the complete state of a game and provides methods to advance
 * the game through plays, drives, and quarters.
 */

import { TeamGameState } from './TeamGameState';
import { PlayResult, resolvePlay, resolveSpecialTeamsPlay, HomeFieldContext } from './PlayResolver';
import { PlayCallContext, shouldAttemptFieldGoal, shouldPunt } from './PlayCaller';
import { WeatherCondition, GameStakes } from './EffectiveRatingCalculator';
import { DriveResult } from './PlayDescriptionGenerator';
// Import sophisticated play calling that uses coordinator tendencies and scheme adjustments
import {
  selectOffensivePlayWithTendencies,
  selectDefensivePlayWithTendencies,
  PlayCallingDecisionContext,
} from '../coaching/PlayCallingIntegration';

/**
 * Game clock state
 */
export interface GameClock {
  quarter: 1 | 2 | 3 | 4 | 'OT';
  timeRemaining: number; // Seconds in quarter
  playClock: number;
  isRunning: boolean;
}

/**
 * Field position state
 */
export interface FieldState {
  ballPosition: number; // Yards from home team end zone
  possession: 'home' | 'away';
  down: 1 | 2 | 3 | 4;
  yardsToGo: number;
  yardsToEndzone: number;
}

/**
 * Score state
 */
export interface ScoreState {
  home: number;
  away: number;
}

/**
 * Complete game state
 */
export interface LiveGameState {
  gameId: string;
  homeTeam: TeamGameState;
  awayTeam: TeamGameState;

  clock: GameClock;
  field: FieldState;
  score: ScoreState;

  // Game situation
  weather: WeatherCondition;
  stakes: GameStakes;
  homeFieldAdvantage: number;

  // History (for stats, play-by-play)
  plays: PlayResult[];

  // State
  isComplete: boolean;
  inProgress: boolean;

  // Kickoff state
  needsKickoff: boolean;
  kickoffTeam: 'home' | 'away';
}

/**
 * Game configuration options
 */
export interface GameConfig {
  gameId: string;
  weather: WeatherCondition;
  stakes: GameStakes;
  quarterLength: number; // Seconds (default 900 = 15 min)
  homeFieldAdvantage: number; // Points equivalent (typically 2.5-3.5)
}

/**
 * Drive result with plays
 */
export interface DriveResultWithPlays {
  plays: PlayResult[];
  result: DriveResult;
  startingPosition: number;
  endingPosition: number;
  yardsGained: number;
}

/**
 * Default game configuration
 */
export function createDefaultGameConfig(gameId: string): GameConfig {
  return {
    gameId,
    weather: {
      temperature: 70,
      precipitation: 'none',
      wind: 5,
      isDome: false,
    },
    stakes: 'regular',
    quarterLength: 900,
    homeFieldAdvantage: 2.5,
  };
}

/**
 * Game State Machine class
 * Manages game simulation and state transitions
 */
export class GameStateMachine {
  private state: LiveGameState;
  private quarterLength: number;

  constructor(homeTeam: TeamGameState, awayTeam: TeamGameState, config: GameConfig) {
    this.quarterLength = config.quarterLength;

    this.state = {
      gameId: config.gameId,
      homeTeam,
      awayTeam,

      clock: {
        quarter: 1,
        timeRemaining: config.quarterLength,
        playClock: 40,
        isRunning: false,
      },

      field: {
        ballPosition: 25,
        possession: 'home',
        down: 1,
        yardsToGo: 10,
        yardsToEndzone: 75,
      },

      score: {
        home: 0,
        away: 0,
      },

      weather: config.weather,
      stakes: config.stakes,
      homeFieldAdvantage: config.homeFieldAdvantage,

      plays: [],

      isComplete: false,
      inProgress: false,

      needsKickoff: true,
      kickoffTeam: 'away', // Away team kicks off to start
    };
  }

  /**
   * Get the current play call context
   */
  getCurrentContext(): PlayCallContext {
    const { clock, field, score, weather } = this.state;

    const scoreDiff =
      field.possession === 'home' ? score.home - score.away : score.away - score.home;

    const isTwoMinute = (clock.quarter === 2 || clock.quarter === 4) && clock.timeRemaining <= 120;

    // Calculate remaining time in game (for urgency calculations)
    let remainingGameTime = clock.timeRemaining;
    if (typeof clock.quarter === 'number' && clock.quarter < 4) {
      remainingGameTime += (4 - clock.quarter) * this.quarterLength;
    }

    return {
      down: field.down,
      distance: field.yardsToGo,
      fieldPosition: field.possession === 'home' ? field.ballPosition : 100 - field.ballPosition,
      timeRemaining: remainingGameTime,
      quarter: clock.quarter,
      scoreDifferential: scoreDiff,
      weather,
      isRedZone: field.yardsToEndzone <= 20,
      isTwoMinuteWarning: isTwoMinute,
    };
  }

  /**
   * Get the current game state
   */
  getState(): LiveGameState {
    return { ...this.state };
  }

  /**
   * Check if the game is over
   */
  isGameOver(): boolean {
    return this.state.isComplete;
  }

  /**
   * Handle kickoff
   */
  handleKickoff(): PlayResult {
    const { field, homeTeam, awayTeam, kickoffTeam } = this.state;

    const kickingTeam = kickoffTeam === 'home' ? homeTeam : awayTeam;
    const receivingTeam = kickoffTeam === 'home' ? awayTeam : homeTeam;

    const context = this.getCurrentContext();
    const result = resolveSpecialTeamsPlay(kickingTeam, receivingTeam, 'kickoff', context);

    // Update state
    this.state.field = {
      ...field,
      ballPosition:
        kickoffTeam === 'home' ? 100 - result.newFieldPosition : result.newFieldPosition,
      possession: kickoffTeam === 'home' ? 'away' : 'home',
      down: 1,
      yardsToGo: 10,
      yardsToEndzone:
        kickoffTeam === 'home' ? result.newFieldPosition : 100 - result.newFieldPosition,
    };

    this.state.needsKickoff = false;
    this.state.plays.push(result);

    // Advance clock
    this.advanceClock(5);

    return result;
  }

  /**
   * Handle punt
   */
  handlePunt(): PlayResult {
    const { field, homeTeam, awayTeam } = this.state;

    const puntingTeam = field.possession === 'home' ? homeTeam : awayTeam;
    const receivingTeam = field.possession === 'home' ? awayTeam : homeTeam;

    const context = this.getCurrentContext();
    const result = resolveSpecialTeamsPlay(puntingTeam, receivingTeam, 'punt', context);

    // Update state - flip possession
    const newPossession = field.possession === 'home' ? 'away' : 'home';
    this.state.field = {
      ...field,
      ballPosition: result.newFieldPosition,
      possession: newPossession,
      down: 1,
      yardsToGo: 10,
      yardsToEndzone:
        newPossession === 'home' ? 100 - result.newFieldPosition : result.newFieldPosition,
    };

    this.state.plays.push(result);

    // Advance clock
    this.advanceClock(6);

    return result;
  }

  /**
   * Handle field goal attempt
   */
  handleFieldGoal(): PlayResult {
    const { field, homeTeam, awayTeam, score } = this.state;

    const kickingTeam = field.possession === 'home' ? homeTeam : awayTeam;
    const defendingTeam = field.possession === 'home' ? awayTeam : homeTeam;

    const context = this.getCurrentContext();
    const result = resolveSpecialTeamsPlay(kickingTeam, defendingTeam, 'field_goal', context);

    if (result.outcome === 'field_goal_made') {
      // Add 3 points
      if (field.possession === 'home') {
        this.state.score = { ...score, home: score.home + 3 };
      } else {
        this.state.score = { ...score, away: score.away + 3 };
      }

      // Set up for kickoff
      this.state.needsKickoff = true;
      this.state.kickoffTeam = field.possession;
    } else {
      // Miss - other team gets ball at spot of kick (or 20)
      const newPossession = field.possession === 'home' ? 'away' : 'home';
      const spotPosition = Math.max(20, context.fieldPosition - 7);

      this.state.field = {
        ...field,
        ballPosition: 100 - spotPosition,
        possession: newPossession,
        down: 1,
        yardsToGo: 10,
        yardsToEndzone: spotPosition,
      };
    }

    this.state.plays.push(result);

    // Advance clock
    this.advanceClock(5);

    return result;
  }

  /**
   * Handle extra point attempt
   */
  handleExtraPoint(): PlayResult {
    const { field, homeTeam, awayTeam, score } = this.state;

    const kickingTeam = field.possession === 'home' ? homeTeam : awayTeam;
    const defendingTeam = field.possession === 'home' ? awayTeam : homeTeam;

    // Extra point is like a 33-yard field goal (from 15 yard line)
    const context = { ...this.getCurrentContext(), fieldPosition: 85 };
    const result = resolveSpecialTeamsPlay(kickingTeam, defendingTeam, 'field_goal', context);

    if (result.outcome === 'field_goal_made') {
      if (field.possession === 'home') {
        this.state.score = { ...score, home: score.home + 1 };
      } else {
        this.state.score = { ...score, away: score.away + 1 };
      }
    }

    // Set up for kickoff
    this.state.needsKickoff = true;
    this.state.kickoffTeam = field.possession;

    result.description =
      result.outcome === 'field_goal_made' ? 'Extra point is GOOD' : 'Extra point NO GOOD';
    this.state.plays.push(result);

    return result;
  }

  /**
   * Handle two-point conversion attempt
   */
  handleTwoPointConversion(): PlayResult {
    const { field, homeTeam, awayTeam, score } = this.state;

    const offensiveTeam = field.possession === 'home' ? homeTeam : awayTeam;
    const defensiveTeam = field.possession === 'home' ? awayTeam : homeTeam;

    // Set up 2pt conversion from 2 yard line
    const context = {
      ...this.getCurrentContext(),
      fieldPosition: 98,
      down: 1,
      distance: 2,
    };

    // Create play calling decision context with coaching info for offense
    const offensivePlayCallingContext: PlayCallingDecisionContext = {
      offensiveCoordinator: offensiveTeam.coaches.offensiveCoordinator,
      defensiveCoordinator: null,
      headCoach: offensiveTeam.coaches.headCoach ?? null,
      gameContext: context,
      isHometeam: field.possession === 'home',
    };

    // Create play calling decision context with coaching info for defense
    const defensivePlayCallingContext: PlayCallingDecisionContext = {
      offensiveCoordinator: null,
      defensiveCoordinator: defensiveTeam.coaches.defensiveCoordinator,
      headCoach: defensiveTeam.coaches.headCoach ?? null,
      gameContext: context,
      isHometeam: field.possession !== 'home',
    };

    // Select plays using sophisticated tendency-based play calling
    const offensiveResult = selectOffensivePlayWithTendencies(offensivePlayCallingContext);
    const defensiveResult = selectDefensivePlayWithTendencies(
      defensivePlayCallingContext,
      offensiveResult.playCall.formation
    );

    // Create home field context
    const homeFieldContext: HomeFieldContext = {
      isOffenseHome: field.possession === 'home',
      homeFieldAdvantage: this.state.homeFieldAdvantage,
    };

    const result = resolvePlay(
      offensiveTeam,
      defensiveTeam,
      {
        offensive: offensiveResult.playCall,
        defensive: defensiveResult.playCall,
      },
      context,
      homeFieldContext
    );

    if (result.touchdown) {
      if (field.possession === 'home') {
        this.state.score = { ...score, home: score.home + 2 };
      } else {
        this.state.score = { ...score, away: score.away + 2 };
      }
      result.description = '2-Point Conversion is GOOD!';
    } else {
      result.description = '2-Point Conversion FAILED';
    }

    // Set up for kickoff
    this.state.needsKickoff = true;
    this.state.kickoffTeam = field.possession;

    this.state.plays.push(result);

    return result;
  }

  /**
   * Execute a single play
   */
  executePlay(): PlayResult {
    this.state.inProgress = true;

    // Handle kickoff if needed
    if (this.state.needsKickoff) {
      return this.handleKickoff();
    }

    const { field, homeTeam, awayTeam } = this.state;
    const context = this.getCurrentContext();

    const offensiveTeam = field.possession === 'home' ? homeTeam : awayTeam;
    const defensiveTeam = field.possession === 'home' ? awayTeam : homeTeam;

    // Check for fourth down decisions
    if (field.down === 4) {
      // Check field goal range (roughly 55 yards)
      if (shouldAttemptFieldGoal(context, 55)) {
        return this.handleFieldGoal();
      }

      // Check if should punt
      if (shouldPunt(context, offensiveTeam.offensiveTendencies.fourthDownAggressiveness)) {
        return this.handlePunt();
      }
    }

    // Create play calling decision context with coaching info for offense
    const offensivePlayCallingContext: PlayCallingDecisionContext = {
      offensiveCoordinator: offensiveTeam.coaches.offensiveCoordinator,
      defensiveCoordinator: null,
      headCoach: offensiveTeam.coaches.headCoach ?? null,
      gameContext: context,
      isHometeam: field.possession === 'home',
    };

    // Create play calling decision context with coaching info for defense
    const defensivePlayCallingContext: PlayCallingDecisionContext = {
      offensiveCoordinator: null,
      defensiveCoordinator: defensiveTeam.coaches.defensiveCoordinator,
      headCoach: defensiveTeam.coaches.headCoach ?? null,
      gameContext: context,
      isHometeam: field.possession !== 'home',
    };

    // Select plays using sophisticated tendency-based play calling
    const offensiveResult = selectOffensivePlayWithTendencies(offensivePlayCallingContext);
    const defensiveResult = selectDefensivePlayWithTendencies(
      defensivePlayCallingContext,
      offensiveResult.playCall.formation
    );

    // Create home field context
    const homeFieldContext: HomeFieldContext = {
      isOffenseHome: field.possession === 'home',
      homeFieldAdvantage: this.state.homeFieldAdvantage,
    };

    // Resolve the play
    const result = resolvePlay(
      offensiveTeam,
      defensiveTeam,
      { offensive: offensiveResult.playCall, defensive: defensiveResult.playCall },
      context,
      homeFieldContext
    );

    // Update game state
    this.updateStateFromResult(result);

    return result;
  }

  /**
   * Update game state from play result
   */
  private updateStateFromResult(result: PlayResult): void {
    const { field, score } = this.state;

    // Handle touchdown
    if (result.touchdown) {
      if (field.possession === 'home') {
        this.state.score = { ...score, home: score.home + 6 };
      } else {
        this.state.score = { ...score, away: score.away + 6 };
      }

      // After TD, we need to handle PAT/2PT then kickoff
      // For simplicity, auto-kick extra point
      this.handleExtraPoint();
      return;
    }

    // Handle turnover
    if (result.turnover) {
      const newPossession = field.possession === 'home' ? 'away' : 'home';
      this.state.field = {
        ballPosition: result.newFieldPosition,
        possession: newPossession,
        down: 1,
        yardsToGo: 10,
        yardsToEndzone:
          newPossession === 'home' ? 100 - result.newFieldPosition : result.newFieldPosition,
      };
    } else {
      // Normal play update
      this.state.field = {
        ...field,
        ballPosition:
          field.possession === 'home' ? result.newFieldPosition : 100 - result.newFieldPosition,
        down: result.newDown as 1 | 2 | 3 | 4,
        yardsToGo: result.newDistance,
        yardsToEndzone:
          field.possession === 'home' ? 100 - result.newFieldPosition : result.newFieldPosition,
      };
    }

    // Record play
    this.state.plays.push(result);

    // Advance clock
    const clockTime = this.calculateClockTime(result);
    this.advanceClock(clockTime);
  }

  /**
   * Calculate how much time a play takes off the clock
   * NFL plays typically take 25-40 seconds including huddle and play clock
   */
  private calculateClockTime(result: PlayResult): number {
    // Base time per play: 25-40 seconds (realistic NFL timing)
    let time = 25 + Math.floor(Math.random() * 16); // 25-40 seconds

    // Incomplete passes stop the clock (only count the play itself, ~5-8 seconds)
    if (result.outcome === 'incomplete') {
      time = 5 + Math.floor(Math.random() * 4); // 5-8 seconds
    }

    // Out of bounds stops clock (play time only, ~6-10 seconds)
    if (result.yardsGained > 10 && Math.random() < 0.3) {
      time = 6 + Math.floor(Math.random() * 5); // 6-10 seconds
    }

    // Touchdowns and turnovers have variable time
    if (
      result.outcome === 'touchdown' ||
      result.outcome === 'interception' ||
      result.outcome === 'fumble'
    ) {
      time = 8 + Math.floor(Math.random() * 8); // 8-15 seconds
    }

    return time;
  }

  /**
   * Advance the game clock
   */
  advanceClock(seconds: number): void {
    let { clock } = this.state;
    clock = { ...clock };

    clock.timeRemaining -= seconds;

    // Check for quarter end
    if (clock.timeRemaining <= 0) {
      if (clock.quarter === 4 || clock.quarter === 'OT') {
        // Check for overtime or end of game
        if (this.state.score.home === this.state.score.away && clock.quarter === 4) {
          // Go to overtime
          clock.quarter = 'OT';
          clock.timeRemaining = 600; // 10 minute OT
        } else {
          // Game over
          this.state.isComplete = true;
          this.state.inProgress = false;
          clock.timeRemaining = 0;
        }
      } else if (clock.quarter === 2) {
        // Halftime
        clock.quarter = 3;
        clock.timeRemaining = this.quarterLength;
        this.state.needsKickoff = true;
        // Home team receives second half
        this.state.kickoffTeam = 'away';
      } else {
        // End of quarter
        clock.quarter = ((clock.quarter as number) + 1) as 1 | 2 | 3 | 4;
        clock.timeRemaining = this.quarterLength;
      }
    }

    this.state.clock = clock;
  }

  /**
   * Call timeout for a team
   */
  callTimeout(team: 'home' | 'away'): boolean {
    const teamState = team === 'home' ? this.state.homeTeam : this.state.awayTeam;

    if (teamState.timeoutsRemaining <= 0) {
      return false;
    }

    teamState.timeoutsRemaining--;
    this.state.clock.isRunning = false;

    return true;
  }

  /**
   * Simulate a complete drive
   */
  simulateDrive(): DriveResultWithPlays {
    const startingPosition = this.getCurrentContext().fieldPosition;
    const plays: PlayResult[] = [];
    let driveResult: DriveResult = 'punt';

    // Handle kickoff if needed
    if (this.state.needsKickoff) {
      const kickoff = this.handleKickoff();
      plays.push(kickoff);
    }

    const startingPossession = this.state.field.possession;

    // Run plays until drive ends
    while (!this.isGameOver()) {
      const result = this.executePlay();
      plays.push(result);

      // Check for drive ending conditions
      if (result.touchdown) {
        driveResult = 'touchdown';
        break;
      }

      if (result.outcome === 'field_goal_made') {
        driveResult = 'field_goal';
        break;
      }

      if (result.turnover) {
        driveResult = 'turnover';
        break;
      }

      // Check for possession change (punt, turnover on downs)
      if (this.state.field.possession !== startingPossession) {
        if (result.playType === 'punt') {
          driveResult = 'punt';
        } else {
          driveResult = 'turnover_on_downs';
        }
        break;
      }

      // Check for end of half
      if (this.state.clock.timeRemaining <= 0) {
        if (this.state.clock.quarter === 2 || this.isGameOver()) {
          driveResult = 'end_of_half';
          break;
        }
      }

      // Safety check - prevent infinite loops
      if (plays.length > 25) {
        driveResult = 'punt';
        break;
      }
    }

    const endingPosition = this.getCurrentContext().fieldPosition;
    const yardsGained = endingPosition - startingPosition;

    return {
      plays,
      result: driveResult,
      startingPosition,
      endingPosition,
      yardsGained,
    };
  }

  /**
   * Simulate a complete quarter
   */
  simulateQuarter(): LiveGameState {
    const targetQuarter = this.state.clock.quarter;

    while (!this.isGameOver() && this.state.clock.quarter === targetQuarter) {
      this.executePlay();
    }

    return this.getState();
  }

  /**
   * Simulate to end of game
   */
  simulateToEnd(): LiveGameState {
    while (!this.isGameOver()) {
      this.executePlay();

      // Safety check - prevent runaway simulations
      if (this.state.plays.length > 300) {
        this.state.isComplete = true;
        break;
      }
    }

    this.state.inProgress = false;
    return this.getState();
  }
}

/**
 * Create a new game between two teams
 */
export function createGame(
  homeTeam: TeamGameState,
  awayTeam: TeamGameState,
  config?: Partial<GameConfig>
): GameStateMachine {
  const fullConfig: GameConfig = {
    gameId: config?.gameId || `game-${Date.now()}`,
    weather: config?.weather || {
      temperature: 70,
      precipitation: 'none',
      wind: 5,
      isDome: false,
    },
    stakes: config?.stakes || 'regular',
    quarterLength: config?.quarterLength || 900,
    homeFieldAdvantage: config?.homeFieldAdvantage ?? 2.5,
  };

  return new GameStateMachine(homeTeam, awayTeam, fullConfig);
}

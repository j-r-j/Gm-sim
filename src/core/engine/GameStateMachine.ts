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
 * Overtime tracking state
 */
export interface OvertimeState {
  firstPossessionTeam: 'home' | 'away';
  possessionsCompleted: number; // 0, 1, or 2
  firstPossessionResult: 'none' | 'touchdown' | 'field_goal' | 'no_score';
  isSuddenDeath: boolean;
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

  // Overtime state
  overtime: OvertimeState | null;
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

      overtime: null,
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

    // Build context from kicking team's perspective for onside kick decisions
    const context = this.getCurrentContext();
    const kickingTeamScore = kickoffTeam === 'home' ? this.state.score.home : this.state.score.away;
    const receivingTeamScore =
      kickoffTeam === 'home' ? this.state.score.away : this.state.score.home;
    const kickoffContext = {
      ...context,
      scoreDifferential: kickingTeamScore - receivingTeamScore,
    };
    const result = resolveSpecialTeamsPlay(kickingTeam, receivingTeam, 'kickoff', kickoffContext);

    // Update state - check if onside kick was recovered (turnover=false means kicking team kept it)
    const newPossession = result.turnover
      ? kickoffTeam === 'home'
        ? 'away'
        : 'home'
      : kickoffTeam;

    this.state.field = {
      ...field,
      ballPosition:
        newPossession === 'home' ? result.newFieldPosition : 100 - result.newFieldPosition,
      possession: newPossession,
      down: 1,
      yardsToGo: 10,
      yardsToEndzone:
        newPossession === 'home' ? 100 - result.newFieldPosition : result.newFieldPosition,
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

    // AI strategic timeout usage
    this.checkStrategicTimeout(result);

    return result;
  }

  /**
   * AI strategic timeout logic.
   * Called after each play in the last 2 minutes of each half.
   */
  private checkStrategicTimeout(result: PlayResult): void {
    const { clock, field, score } = this.state;

    // Only in last 2 minutes of a half (Q2 or Q4)
    const isEndOfHalf = (clock.quarter === 2 || clock.quarter === 4) && clock.timeRemaining <= 120;
    if (!isEndOfHalf) return;

    const offensiveSide: 'home' | 'away' = field.possession === 'home' ? 'home' : 'away';
    const defensiveSide: 'home' | 'away' = offensiveSide === 'home' ? 'away' : 'home';

    const defensiveScore = defensiveSide === 'home' ? score.home : score.away;
    const offensiveScore = offensiveSide === 'home' ? score.home : score.away;

    const defTeamState = defensiveSide === 'home' ? this.state.homeTeam : this.state.awayTeam;

    // Defensive timeout: if trailing and offense ran the ball (clock running)
    const isRunPlay =
      result.playType.startsWith('run') ||
      result.playType === 'qb_sneak' ||
      result.playType === 'qb_scramble';
    const clockShouldBeRunning =
      isRunPlay && result.outcome !== 'fumble' && result.outcome !== 'fumble_lost';

    if (clockShouldBeRunning && defensiveScore < offensiveScore) {
      // Defense is trailing and clock is running - use timeout
      if (defTeamState.timeoutsRemaining > 0) {
        // Use gameDayIQ to modulate timeout usage (higher IQ = smarter about timing)
        const headCoach = defTeamState.coaches.headCoach;
        const gameDayIQ = headCoach?.attributes.gameDayIQ ?? 50;
        // Higher IQ coaches are more likely to use timeouts strategically
        const useTimeout = Math.random() * 100 < gameDayIQ + 30;
        if (useTimeout) {
          this.callTimeout(defensiveSide);
        }
      }
    }

    // Offensive timeout: final minute, before critical plays
    if (clock.timeRemaining <= 60 && offensiveScore <= defensiveScore) {
      const offTeamState = offensiveSide === 'home' ? this.state.homeTeam : this.state.awayTeam;
      if (offTeamState.timeoutsRemaining > 0 && field.down >= 3) {
        const headCoach = offTeamState.coaches.headCoach;
        const gameDayIQ = headCoach?.attributes.gameDayIQ ?? 50;
        const useTimeout = Math.random() * 100 < gameDayIQ;
        if (useTimeout) {
          this.callTimeout(offensiveSide);
        }
      }
    }
  }

  /**
   * Update game state from play result
   */
  private updateStateFromResult(result: PlayResult): void {
    const { field, score } = this.state;

    // Handle safety: check if a sack or loss pushed the offense into their own end zone
    if (result.safety) {
      // 2 points to the defensive team
      const defensiveTeam = field.possession === 'home' ? 'away' : 'home';
      if (defensiveTeam === 'home') {
        this.state.score = { ...score, home: score.home + 2 };
      } else {
        this.state.score = { ...score, away: score.away + 2 };
      }

      // After safety: team that gave up safety kicks off from their own 20
      this.state.needsKickoff = true;
      this.state.kickoffTeam = field.possession;
      this.state.plays.push(result);
      this.advanceClock(this.calculateClockTime(result));

      if (this.state.overtime) {
        this.checkOvertimeResult('no_score');
      }
      return;
    }

    // Handle touchdown
    if (result.touchdown) {
      if (field.possession === 'home') {
        this.state.score = { ...score, home: score.home + 6 };
      } else {
        this.state.score = { ...score, away: score.away + 6 };
      }

      // Decide between PAT and 2-point conversion
      if (this.shouldGoForTwo()) {
        this.handleTwoPointConversion();
      } else {
        this.handleExtraPoint();
      }
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

          // Coin toss: away team gets first OT possession (simplified)
          const firstPossession = Math.random() < 0.5 ? 'home' : 'away';
          this.state.overtime = {
            firstPossessionTeam: firstPossession,
            possessionsCompleted: 0,
            firstPossessionResult: 'none',
            isSuddenDeath: false,
          };
          this.state.needsKickoff = true;
          this.state.kickoffTeam = firstPossession === 'home' ? 'away' : 'home';
        } else if (clock.quarter === 'OT') {
          // OT time expired
          if (this.state.stakes === 'playoff' || this.state.stakes === 'championship') {
            // Playoff games continue until there is a winner
            clock.timeRemaining = 600; // Reset OT clock
            if (this.state.overtime) {
              this.state.overtime.isSuddenDeath = true;
            }
          } else {
            // Regular season ends in tie
            this.state.isComplete = true;
            this.state.inProgress = false;
            clock.timeRemaining = 0;
          }
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
   * Decide whether to go for a 2-point conversion after a touchdown.
   * Score differential is calculated AFTER the TD (6 points already added).
   */
  private shouldGoForTwo(): boolean {
    const { score, field, clock } = this.state;
    const scoringTeam = field.possession;

    // Deficit from scoring team's perspective (after TD, before extra point)
    const deficit = scoringTeam === 'home' ? score.away - score.home : score.home - score.away;

    // Trailing by 2: go for 2 to tie
    if (deficit === 2) return true;

    // Trailing by 5: go for 2 to be within a FG
    if (deficit === 5) return true;

    // 4th quarter or OT, trailing by 8+: go for 2 (need to maximize points)
    if ((clock.quarter === 4 || clock.quarter === 'OT') && deficit >= 8) return true;

    return false;
  }

  /**
   * Check overtime rules after a scoring play or possession change.
   * Returns true if the game should end.
   */
  private checkOvertimeResult(driveResult: 'touchdown' | 'field_goal' | 'no_score'): boolean {
    const ot = this.state.overtime;
    if (!ot || this.state.clock.quarter !== 'OT') return false;

    if (ot.isSuddenDeath) {
      // In sudden death, any score wins
      if (driveResult === 'touchdown' || driveResult === 'field_goal') {
        this.state.isComplete = true;
        this.state.inProgress = false;
        return true;
      }
      return false;
    }

    if (ot.possessionsCompleted === 0) {
      // First possession just ended - record result, other team always gets a chance
      ot.firstPossessionResult =
        driveResult === 'touchdown'
          ? 'touchdown'
          : driveResult === 'field_goal'
            ? 'field_goal'
            : 'no_score';
      ot.possessionsCompleted = 1;
      return false;
    }

    if (ot.possessionsCompleted === 1) {
      // Second possession just ended
      ot.possessionsCompleted = 2;

      if (ot.firstPossessionResult === 'touchdown') {
        // First team scored TD
        if (driveResult === 'touchdown') {
          // Second team also scored TD: sudden death (tied again)
          ot.isSuddenDeath = true;
          return false;
        }
        // Second team failed to match TD: first team wins
        this.state.isComplete = true;
        this.state.inProgress = false;
        return true;
      }

      if (ot.firstPossessionResult === 'field_goal') {
        // First team kicked FG
        if (driveResult === 'touchdown') {
          // Second team scored TD: they win
          this.state.isComplete = true;
          this.state.inProgress = false;
          return true;
        }
        if (driveResult === 'no_score') {
          // Second team failed to score: first team wins
          this.state.isComplete = true;
          this.state.inProgress = false;
          return true;
        }
        // Both kicked FG: sudden death
        ot.isSuddenDeath = true;
        return false;
      }

      if (ot.firstPossessionResult === 'no_score') {
        // First team didn't score
        if (driveResult === 'touchdown' || driveResult === 'field_goal') {
          // Second team scored: they win
          this.state.isComplete = true;
          this.state.inProgress = false;
          return true;
        }
        // Neither scored: sudden death
        ot.isSuddenDeath = true;
        return false;
      }
    }

    // After both initial possessions, it's sudden death
    ot.isSuddenDeath = true;
    if (driveResult === 'touchdown' || driveResult === 'field_goal') {
      this.state.isComplete = true;
      this.state.inProgress = false;
      return true;
    }
    return false;
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
        if (this.state.overtime) {
          this.checkOvertimeResult('touchdown');
        }
        break;
      }

      if (result.outcome === 'field_goal_made') {
        driveResult = 'field_goal';
        if (this.state.overtime) {
          this.checkOvertimeResult('field_goal');
        }
        break;
      }

      if (result.turnover) {
        driveResult = 'turnover';
        if (this.state.overtime) {
          this.checkOvertimeResult('no_score');
        }
        break;
      }

      // Check for possession change (punt, turnover on downs)
      if (this.state.field.possession !== startingPossession) {
        if (result.playType === 'punt') {
          driveResult = 'punt';
        } else {
          driveResult = 'turnover_on_downs';
        }
        if (this.state.overtime) {
          this.checkOvertimeResult('no_score');
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

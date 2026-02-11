/**
 * Game Simulation Engine
 *
 * Event-driven game simulation engine following best practices
 * for American football simulation games.
 *
 * Features:
 * - Event emission for all significant game moments
 * - Configurable simulation speeds
 * - Pause/resume capability
 * - Drive and quarter tracking
 * - Realistic NFL game flow
 */

import { GameRunner, GameResult } from '../game/GameRunner';
import { GameSetupResult, setupGame, GameConfig } from '../game/GameSetup';
import { LiveGameState } from '../engine/GameStateMachine';
import { PlayResult } from '../engine/PlayResolver';
import { Team } from '../models/team/Team';
import { Player } from '../models/player/Player';
import { Coach } from '../models/staff/Coach';
import {
  LiveGameDisplay,
  PlayDisplay,
  HalftimeInfo,
  HalfStats,
  SimulationSpeed,
  SIMULATION_DELAYS,
} from './types';
import {
  GameFlowEventBus,
  gameFlowEventBus,
  createPlayCompleteEvent,
  createScoreChangeEvent,
  checkLeadChange,
} from './events';

/**
 * Engine configuration options
 */
export interface EngineConfig {
  /** Default simulation speed */
  defaultSpeed: SimulationSpeed;
  /** Event bus to use (defaults to global) */
  eventBus?: GameFlowEventBus;
  /** Whether to emit events */
  emitEvents: boolean;
  /** Maximum plays safety limit */
  maxPlays: number;
}

/**
 * Default engine configuration
 */
const DEFAULT_CONFIG: EngineConfig = {
  defaultSpeed: 'normal',
  emitEvents: true,
  maxPlays: 350,
};

/**
 * Drive tracking state
 */
interface DriveState {
  startingPosition: number;
  plays: number;
  yards: number;
  startTime: number;
  startQuarter: number;
}

/**
 * Game Simulation Engine
 *
 * Manages the execution of a football game simulation with
 * event emission for UI updates and analytics.
 */
export class GameSimulationEngine {
  private runner: GameRunner | null = null;
  private config: EngineConfig;
  private eventBus: GameFlowEventBus;

  // Simulation state
  private isRunning = false;
  private isPaused = false;
  private currentSpeed: SimulationSpeed;
  private shouldStop = false;

  // Game tracking
  private playCount = 0;
  private previousScore = { home: 0, away: 0 };
  private currentQuarter = 1;
  private recentPlays: PlayDisplay[] = [];
  private currentDrive: DriveState | null = null;
  private firstHalfStats: { home: HalfStats; away: HalfStats } | null = null;
  private hasReachedHalftime = false;

  // Callbacks
  private onStateUpdate: ((state: LiveGameDisplay) => void) | null = null;
  private onComplete: ((result: GameResult) => void) | null = null;

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = config.eventBus || gameFlowEventBus;
    this.currentSpeed = this.config.defaultSpeed;
  }

  /**
   * Initialize game with setup result
   */
  initializeFromSetup(
    setup: GameSetupResult,
    gameInfo: { gameId?: string; week?: number; date?: string } = {}
  ): void {
    this.runner = new GameRunner(
      setup,
      { mode: 'playByPlay' },
      {
        gameId: gameInfo.gameId,
        week: gameInfo.week || 1,
        date: gameInfo.date || new Date().toISOString().split('T')[0],
      }
    );

    this.resetState();

    // Emit game start event
    if (this.config.emitEvents) {
      this.eventBus.emit({
        type: 'GAME_START',
        payload: {
          gameId: gameInfo.gameId || `game-${Date.now()}`,
          homeTeamId: setup.homeTeamState.teamId,
          awayTeamId: setup.awayTeamState.teamId,
          homeTeamName: setup.homeTeamState.teamName,
          awayTeamName: setup.awayTeamState.teamName,
          week: gameInfo.week || 1,
        },
      });
    }
  }

  /**
   * Initialize game from full config
   */
  initialize(
    gameConfig: GameConfig,
    teams: Map<string, Team>,
    players: Map<string, Player>,
    coaches: Map<string, Coach>
  ): void {
    const setup = setupGame(gameConfig, teams, players, coaches);
    this.initializeFromSetup(setup, { week: gameConfig.week });
  }

  /**
   * Reset internal state
   */
  private resetState(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.shouldStop = false;
    this.playCount = 0;
    this.previousScore = { home: 0, away: 0 };
    this.currentQuarter = 1;
    this.recentPlays = [];
    this.currentDrive = null;
    this.firstHalfStats = null;
    this.hasReachedHalftime = false;
  }

  /**
   * Set state update callback
   */
  setOnStateUpdate(callback: (state: LiveGameDisplay) => void): void {
    this.onStateUpdate = callback;
  }

  /**
   * Set completion callback
   */
  setOnComplete(callback: (result: GameResult) => void): void {
    this.onComplete = callback;
  }

  /**
   * Set simulation speed
   */
  setSpeed(speed: SimulationSpeed): void {
    const previousSpeed = this.currentSpeed;
    this.currentSpeed = speed;

    if (this.config.emitEvents) {
      this.eventBus.emit({
        type: 'SIMULATION_SPEED_CHANGED',
        payload: { previousSpeed, newSpeed: speed },
      });
    }
  }

  /**
   * Get current speed
   */
  getSpeed(): SimulationSpeed {
    return this.currentSpeed;
  }

  /**
   * Pause simulation
   */
  pause(): void {
    if (this.isRunning && !this.isPaused) {
      this.isPaused = true;

      if (this.config.emitEvents && this.runner) {
        const state = this.runner.getCurrentState();
        this.eventBus.emit({
          type: 'SIMULATION_PAUSED',
          payload: {
            gameId: state.gameId,
            currentQuarter: typeof state.clock.quarter === 'number' ? state.clock.quarter : 5,
            timeRemaining: state.clock.timeRemaining,
            homeScore: state.score.home,
            awayScore: state.score.away,
          },
        });
      }
    }
  }

  /**
   * Resume simulation
   */
  resume(): void {
    if (this.isRunning && this.isPaused) {
      this.isPaused = false;

      if (this.config.emitEvents && this.runner) {
        const state = this.runner.getCurrentState();
        this.eventBus.emit({
          type: 'SIMULATION_RESUMED',
          payload: {
            gameId: state.gameId,
            currentQuarter: typeof state.clock.quarter === 'number' ? state.clock.quarter : 5,
            timeRemaining: state.clock.timeRemaining,
            homeScore: state.score.home,
            awayScore: state.score.away,
          },
        });
      }
    }
  }

  /**
   * Stop simulation
   */
  stop(): void {
    this.shouldStop = true;
    this.isPaused = false;
  }

  /**
   * Check if running
   */
  isSimulating(): boolean {
    return this.isRunning;
  }

  /**
   * Check if paused
   */
  isSimulationPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Run a single play
   */
  async runSinglePlay(): Promise<{
    play: PlayDisplay;
    state: LiveGameDisplay;
    isComplete: boolean;
  } | null> {
    if (!this.runner) {
      // eslint-disable-next-line no-console
      console.error('Engine not initialized');
      return null;
    }

    if (this.runner.getCurrentState().isComplete) {
      return null;
    }

    const { play, state, isComplete } = this.runner.runNextPlay();
    this.playCount++;

    const playDisplay = this.processPlay(play, state);
    const gameDisplay = this.createGameDisplay(state);

    // Call state update callback
    if (this.onStateUpdate) {
      this.onStateUpdate(gameDisplay);
    }

    // Check for halftime
    this.checkHalftime(state);

    // Check for completion
    if (isComplete) {
      this.handleGameComplete();
    }

    return { play: playDisplay, state: gameDisplay, isComplete };
  }

  /**
   * Run simulation continuously until complete or stopped
   */
  async runToCompletion(includeDelays: boolean = true): Promise<GameResult | null> {
    if (!this.runner) {
      // eslint-disable-next-line no-console
      console.error('Engine not initialized');
      return null;
    }

    this.isRunning = true;
    this.shouldStop = false;

    try {
      while (!this.runner.getCurrentState().isComplete && !this.shouldStop) {
        // Check for pause
        while (this.isPaused && !this.shouldStop) {
          await this.delay(100);
        }

        if (this.shouldStop) break;

        // Run next play
        const { play, state, isComplete } = this.runner.runNextPlay();
        this.playCount++;

        // Process and emit
        this.processPlay(play, state);
        const gameDisplay = this.createGameDisplay(state);

        if (this.onStateUpdate) {
          this.onStateUpdate(gameDisplay);
        }

        // Check for halftime
        this.checkHalftime(state);

        // Check safety limit
        if (this.playCount >= this.config.maxPlays) {
          // eslint-disable-next-line no-console
          console.warn('Max plays reached, ending simulation');
          break;
        }

        // Check completion
        if (isComplete) {
          break;
        }

        // Delay based on speed
        if (includeDelays && this.currentSpeed !== 'instant') {
          await this.delay(SIMULATION_DELAYS[this.currentSpeed]);
        }
      }

      return this.handleGameComplete();
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Skip to end instantly
   */
  async skipToEnd(): Promise<GameResult | null> {
    return this.runToCompletion(false);
  }

  /**
   * Get current game display state
   */
  getCurrentState(): LiveGameDisplay | null {
    if (!this.runner) return null;
    return this.createGameDisplay(this.runner.getCurrentState());
  }

  /**
   * Get current game result (if complete)
   */
  getResult(): GameResult | null {
    if (!this.runner) return null;
    return this.runner.getResult();
  }

  /**
   * Process a play result and emit events
   */
  private processPlay(play: PlayResult, state: LiveGameState): PlayDisplay {
    const quarter = typeof state.clock.quarter === 'number' ? state.clock.quarter : 5;
    const timeStr = this.formatTime(state.clock.timeRemaining);
    const offenseTeam =
      state.field.possession === 'home'
        ? state.homeTeam.teamName.substring(0, 3).toUpperCase()
        : state.awayTeam.teamName.substring(0, 3).toUpperCase();

    const playDisplay: PlayDisplay = {
      id: `play-${this.playCount}`,
      quarter,
      time: timeStr,
      offenseTeam,
      description: play.description,
      yardsGained: play.yardsGained,
      isScoring: play.touchdown || play.outcome === 'field_goal_made',
      isTurnover: play.turnover,
      isBigPlay: play.yardsGained >= 20,
      score: `${state.score.home}-${state.score.away}`,
    };

    // Add to recent plays (keep last 10)
    this.recentPlays.push(playDisplay);
    if (this.recentPlays.length > 10) {
      this.recentPlays.shift();
    }

    // Track drive
    this.updateDriveTracking(play, state);

    // Emit events
    if (this.config.emitEvents) {
      // Play complete event
      const playEvent = createPlayCompleteEvent(
        playDisplay,
        state.score.home,
        state.score.away,
        quarter,
        state.clock.timeRemaining
      );
      this.eventBus.emit(playEvent);

      // Score change events
      if (
        state.score.home !== this.previousScore.home ||
        state.score.away !== this.previousScore.away
      ) {
        const scoreEvent = createScoreChangeEvent(
          state.score.home,
          state.score.away,
          this.previousScore.home,
          this.previousScore.away,
          play.description
        );
        this.eventBus.emit(scoreEvent);

        // Check for lead change
        const leadChange = checkLeadChange(
          this.previousScore.home,
          this.previousScore.away,
          state.score.home,
          state.score.away
        );
        if (leadChange) {
          this.eventBus.emit({ type: 'LEAD_CHANGE', payload: leadChange });
        }

        this.previousScore = { home: state.score.home, away: state.score.away };
      }

      // Quarter change events
      const newQuarter = typeof state.clock.quarter === 'number' ? state.clock.quarter : 5;
      if (newQuarter !== this.currentQuarter) {
        this.eventBus.emit({
          type: 'QUARTER_END',
          payload: {
            quarter: this.currentQuarter,
            homeScore: state.score.home,
            awayScore: state.score.away,
          },
        });

        this.eventBus.emit({
          type: 'QUARTER_START',
          payload: {
            quarter: newQuarter,
            homeScore: state.score.home,
            awayScore: state.score.away,
          },
        });

        this.currentQuarter = newQuarter;
      }

      // Injury event
      if (play.injuryOccurred && play.injuredPlayerId) {
        this.eventBus.emit({
          type: 'INJURY_OCCURRED',
          payload: {
            playerId: play.injuredPlayerId,
            playerName: 'Unknown', // Would need player lookup
            position: 'Unknown',
            injury: 'Unknown',
            status: 'out',
          },
        });
      }
    }

    return playDisplay;
  }

  /**
   * Track drive progress
   */
  private updateDriveTracking(play: PlayResult, state: LiveGameState): void {
    // Start new drive on possession change or start
    if (!this.currentDrive || play.turnover || play.touchdown) {
      this.currentDrive = {
        startingPosition: state.field.ballPosition,
        plays: 0,
        yards: 0,
        startTime: state.clock.timeRemaining,
        startQuarter: typeof state.clock.quarter === 'number' ? state.clock.quarter : 1,
      };
    }

    this.currentDrive.plays++;
    this.currentDrive.yards += play.yardsGained;
  }

  /**
   * Check for halftime and capture stats
   */
  private checkHalftime(state: LiveGameState): void {
    if (this.hasReachedHalftime) return;

    const quarter = typeof state.clock.quarter === 'number' ? state.clock.quarter : 0;
    if (quarter >= 3 && !this.hasReachedHalftime) {
      this.hasReachedHalftime = true;

      // Capture first half stats
      this.firstHalfStats = {
        home: this.calculateHalfStats('home', state),
        away: this.calculateHalfStats('away', state),
      };

      if (this.config.emitEvents) {
        const halftimeInfo: HalftimeInfo = {
          homeScore: state.score.home,
          awayScore: state.score.away,
          homeTeamAbbr: state.homeTeam.teamName.substring(0, 3).toUpperCase(),
          awayTeamAbbr: state.awayTeam.teamName.substring(0, 3).toUpperCase(),
          homeFirstHalfStats: this.firstHalfStats.home,
          awayFirstHalfStats: this.firstHalfStats.away,
          keyPlays: this.recentPlays.filter((p) => p.isScoring || p.isBigPlay),
        };

        this.eventBus.emit({
          type: 'HALFTIME',
          payload: halftimeInfo,
        });
      }
    }
  }

  /**
   * Calculate half stats (simplified)
   */
  private calculateHalfStats(_team: 'home' | 'away', _state: LiveGameState): HalfStats {
    // Simplified - would need full stat tracking
    return {
      totalYards: 0,
      passingYards: 0,
      rushingYards: 0,
      turnovers: 0,
      timeOfPossession: 0,
    };
  }

  /**
   * Handle game completion
   */
  private handleGameComplete(): GameResult | null {
    if (!this.runner) return null;

    const result = this.runner.getResult();

    if (this.config.emitEvents) {
      this.eventBus.emit({
        type: 'GAME_END',
        payload: result,
      });
    }

    if (this.onComplete) {
      this.onComplete(result);
    }

    return result;
  }

  /**
   * Create game display from state
   */
  private createGameDisplay(state: LiveGameState): LiveGameDisplay {
    // Determine quarter display - 'Final' takes priority when game is complete
    let quarter: LiveGameDisplay['quarter'];
    if (state.isComplete) {
      quarter = 'Final';
    } else if (typeof state.clock.quarter === 'number') {
      quarter = state.clock.quarter;
    } else {
      quarter = 'OT';
    }

    return {
      gameId: state.gameId,
      homeScore: state.score.home,
      awayScore: state.score.away,
      quarter: quarter as LiveGameDisplay['quarter'],
      timeRemaining: state.clock.timeRemaining,
      isClockRunning: state.clock.isRunning,
      possession: state.field.possession,
      ballPosition: state.field.ballPosition,
      down: state.field.down,
      yardsToGo: state.field.yardsToGo,
      homeTeam: {
        id: state.homeTeam.teamId,
        name: state.homeTeam.teamName,
        abbr: state.homeTeam.teamName.substring(0, 3).toUpperCase(),
        timeoutsRemaining: state.homeTeam.timeoutsRemaining,
      },
      awayTeam: {
        id: state.awayTeam.teamId,
        name: state.awayTeam.teamName,
        abbr: state.awayTeam.teamName.substring(0, 3).toUpperCase(),
        timeoutsRemaining: state.awayTeam.timeoutsRemaining,
      },
      currentDrive: this.currentDrive
        ? {
            plays: this.currentDrive.plays,
            yards: this.currentDrive.yards,
            timeOfPossession: this.currentDrive.startTime - state.clock.timeRemaining,
          }
        : { plays: 0, yards: 0, timeOfPossession: 0 },
      recentPlays: [...this.recentPlays],
      isComplete: state.isComplete,
    };
  }

  /**
   * Format time as MM:SS
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a new game simulation engine
 */
export function createGameEngine(config: Partial<EngineConfig> = {}): GameSimulationEngine {
  return new GameSimulationEngine(config);
}

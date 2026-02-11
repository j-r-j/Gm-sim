/**
 * Game Flow Manager
 *
 * Central state machine for managing the complete game flow including
 * week progression, game days, and season transitions.
 *
 * This is the primary interface for UI components to interact with
 * the game simulation system.
 */

import { GameState } from '../models/game/GameState';
import { SeasonSchedule } from '../season/ScheduleGenerator';
import { GameDayFlow, createGameDayFlow } from './GameDayFlow';
import {
  WeekProgressionService,
  createWeekProgressionService,
  WeekAdvancementResult,
} from './WeekProgressionService';
import {
  GameFlowState,
  GameFlowAction,
  WeekFlowState,
  GameDayFlowState,
  WeekSummary,
  PreGameInfo,
  LiveGameDisplay,
  SimulationSpeed,
  GamePrediction,
  SeasonPhase,
  GameFlowCallbacks,
} from './types';
import { GameFlowEventBus, gameFlowEventBus } from './events';

/**
 * Configuration for game flow manager
 */
export interface GameFlowManagerConfig {
  /** Event bus for emitting events */
  eventBus?: GameFlowEventBus;
  /** Whether to emit events */
  emitEvents: boolean;
}

const DEFAULT_CONFIG: GameFlowManagerConfig = {
  emitEvents: true,
};

/**
 * Game Flow Manager
 *
 * Coordinates all game flow components and provides a unified
 * interface for the UI layer.
 */
export class GameFlowManager {
  private config: GameFlowManagerConfig;
  private eventBus: GameFlowEventBus;

  // Services
  private gameDayFlow: GameDayFlow;
  private weekService: WeekProgressionService;

  // State
  private state: GameFlowState;
  private gameState: GameState | null = null;
  private schedule: SeasonSchedule | null = null;
  private userTeamId: string = '';

  // Callbacks
  private callbacks: GameFlowCallbacks = {};
  private onStateChange: ((state: GameFlowState) => void) | null = null;

  constructor(config: Partial<GameFlowManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = config.eventBus || gameFlowEventBus;

    // Initialize services
    this.gameDayFlow = createGameDayFlow({ eventBus: this.eventBus });
    this.weekService = createWeekProgressionService({ eventBus: this.eventBus });

    // Initialize state
    this.state = this.createInitialState();

    // Wire up internal callbacks
    this.setupInternalCallbacks();
  }

  /**
   * Create initial state
   */
  private createInitialState(): GameFlowState {
    return {
      weekFlow: {
        phase: 'week_start',
        weekNumber: 1,
        seasonPhase: 'regularSeason',
        isUserOnBye: false,
        userGame: null,
        userGameCompleted: false,
        userGameResult: null,
        otherGames: [],
        otherGamesCompleted: 0,
        gates: {
          gameResultViewed: false,
          weekSummaryViewed: false,
        },
      },
      gameDayFlow: null,
      isLoading: false,
      error: null,
    };
  }

  /**
   * Setup internal callbacks
   */
  private setupInternalCallbacks(): void {
    // Wire game day flow updates to state
    this.gameDayFlow.setOnStateChange((gameDayState) => {
      this.state = {
        ...this.state,
        gameDayFlow: gameDayState,
      };
      this.notifyStateChange();
    });

    // Wire live game updates
    this.gameDayFlow.setOnLiveGameUpdate((liveGame) => {
      if (this.callbacks.onPlayComplete && liveGame.recentPlays.length > 0) {
        const latestPlay = liveGame.recentPlays[liveGame.recentPlays.length - 1];
        this.callbacks.onPlayComplete(latestPlay);
      }
    });
  }

  /**
   * Set callbacks for game events
   */
  setCallbacks(callbacks: GameFlowCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Set state change callback
   */
  setOnStateChange(callback: (state: GameFlowState) => void): void {
    this.onStateChange = callback;
  }

  /**
   * Get current state
   */
  getState(): GameFlowState {
    return { ...this.state };
  }

  /**
   * Get week flow state
   */
  getWeekFlowState(): WeekFlowState {
    return { ...this.state.weekFlow };
  }

  /**
   * Get game day flow state
   */
  getGameDayFlowState(): GameDayFlowState | null {
    return this.state.gameDayFlow ? { ...this.state.gameDayFlow } : null;
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the manager with game state and schedule
   */
  initialize(
    gameState: GameState,
    schedule: SeasonSchedule,
    userTeamId: string,
    currentWeek: number,
    seasonPhase: SeasonPhase
  ): void {
    this.gameState = gameState;
    this.schedule = schedule;
    this.userTeamId = userTeamId;

    // Create week flow state
    const weekFlow = this.weekService.createWeekFlowState(
      currentWeek,
      seasonPhase,
      userTeamId,
      schedule
    );

    this.state = {
      weekFlow,
      gameDayFlow: null,
      isLoading: false,
      error: null,
    };

    this.notifyStateChange();

    if (this.callbacks.onWeekStart) {
      this.callbacks.onWeekStart(currentWeek);
    }
  }

  // ==========================================================================
  // WEEK FLOW ACTIONS
  // ==========================================================================

  /**
   * Start a new week
   */
  startWeek(weekNumber: number, seasonPhase: SeasonPhase): void {
    if (!this.schedule) {
      this.setError('No schedule loaded');
      return;
    }

    const weekFlow = this.weekService.createWeekFlowState(
      weekNumber,
      seasonPhase,
      this.userTeamId,
      this.schedule
    );

    this.state = {
      ...this.state,
      weekFlow,
      gameDayFlow: null,
    };

    this.notifyStateChange();

    if (this.callbacks.onWeekStart) {
      this.callbacks.onWeekStart(weekNumber);
    }
  }

  /**
   * View pre-game information
   */
  viewPreGame(): PreGameInfo | null {
    if (!this.gameState || !this.state.weekFlow.userGame) {
      this.setError('No game scheduled');
      return null;
    }

    const preGameInfo = this.gameDayFlow.initializeGameDay(
      this.state.weekFlow.userGame,
      this.gameState,
      this.userTeamId
    );

    this.state = {
      ...this.state,
      weekFlow: {
        ...this.state.weekFlow,
        phase: 'pre_game',
      },
      gameDayFlow: this.gameDayFlow.getState(),
    };

    this.notifyStateChange();

    if (this.callbacks.onGameStart) {
      this.callbacks.onGameStart(preGameInfo);
    }

    return preGameInfo;
  }

  /**
   * Set user's game prediction
   */
  setPrediction(prediction: GamePrediction): void {
    this.gameDayFlow.setPrediction(prediction);
  }

  /**
   * Start game simulation
   */
  startGameSimulation(): void {
    this.gameDayFlow.startGame();

    this.state = {
      ...this.state,
      weekFlow: {
        ...this.state.weekFlow,
        phase: 'game_day',
      },
    };

    this.notifyStateChange();
  }

  /**
   * Set simulation speed
   */
  setSimulationSpeed(speed: SimulationSpeed): void {
    this.gameDayFlow.setSpeed(speed);
  }

  /**
   * Pause simulation
   */
  pauseSimulation(): void {
    this.gameDayFlow.pause();
  }

  /**
   * Resume simulation
   */
  resumeSimulation(): void {
    this.gameDayFlow.resume();
  }

  /**
   * Run next play
   */
  async runNextPlay(): Promise<void> {
    const result = await this.gameDayFlow.runNextPlay();
    if (result?.isComplete) {
      this.handleUserGameComplete();
    }
  }

  /**
   * Run simulation continuously
   */
  async runContinuousSimulation(): Promise<void> {
    const result = await this.gameDayFlow.runContinuous();
    if (result) {
      this.handleUserGameComplete();
    }
  }

  /**
   * Skip to end of game
   */
  async skipToEnd(): Promise<void> {
    this.setLoading(true);
    try {
      const result = await this.gameDayFlow.skipToEnd();
      if (result) {
        this.handleUserGameComplete();
      }
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Handle user game completion
   */
  private handleUserGameComplete(): void {
    const result = this.gameDayFlow.getGameResult();
    if (!result || !this.gameState) return;

    // Record result
    const { updatedWeekFlow, updatedGameState } = this.weekService.recordUserGameResult(
      this.state.weekFlow,
      result,
      this.gameState,
      this.userTeamId
    );

    this.gameState = updatedGameState;

    this.state = {
      ...this.state,
      weekFlow: updatedWeekFlow,
    };

    this.notifyStateChange();

    if (this.callbacks.onGameComplete) {
      this.callbacks.onGameComplete(result);
    }
  }

  /**
   * Mark game result as viewed
   */
  markGameResultViewed(): void {
    this.state = {
      ...this.state,
      weekFlow: {
        ...this.state.weekFlow,
        gates: {
          ...this.state.weekFlow.gates,
          gameResultViewed: true,
        },
        phase: 'other_games',
      },
    };

    this.notifyStateChange();
  }

  /**
   * Simulate other games in the week
   */
  simulateOtherGames(): void {
    if (!this.gameState) {
      this.setError('No game state');
      return;
    }

    this.setLoading(true);

    try {
      const { updatedWeekFlow, updatedGameState } = this.weekService.simulateOtherGames(
        this.state.weekFlow,
        this.gameState,
        this.userTeamId
      );

      this.gameState = updatedGameState;

      this.state = {
        ...this.state,
        weekFlow: updatedWeekFlow,
      };

      this.notifyStateChange();
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * View week summary
   */
  viewWeekSummary(): WeekSummary | null {
    if (!this.gameState) {
      this.setError('No game state');
      return null;
    }

    const summary = this.weekService.generateWeekSummary(
      this.state.weekFlow,
      this.gameState,
      this.userTeamId
    );

    this.state = {
      ...this.state,
      weekFlow: {
        ...this.state.weekFlow,
        phase: 'week_summary',
      },
    };

    this.notifyStateChange();

    return summary;
  }

  /**
   * Mark week summary as viewed
   */
  markWeekSummaryViewed(): void {
    this.state = {
      ...this.state,
      weekFlow: {
        ...this.state.weekFlow,
        gates: {
          ...this.state.weekFlow.gates,
          weekSummaryViewed: true,
        },
        phase: 'ready_to_advance',
      },
    };

    this.notifyStateChange();
  }

  /**
   * Check if week can be advanced
   */
  canAdvanceWeek(): { canAdvance: boolean; reason?: string } {
    return this.weekService.canAdvanceWeek(this.state.weekFlow);
  }

  /**
   * Advance to next week
   */
  advanceWeek(): WeekAdvancementResult | null {
    if (!this.gameState) {
      this.setError('No game state');
      return null;
    }

    const { canAdvance, reason } = this.canAdvanceWeek();
    if (!canAdvance) {
      this.setError(reason || 'Cannot advance week');
      return null;
    }

    const { result, updatedGameState } = this.weekService.advanceWeek(
      this.state.weekFlow.weekNumber,
      this.state.weekFlow.seasonPhase,
      this.gameState
    );

    this.gameState = updatedGameState;

    // Start new week
    this.startWeek(result.newWeek, result.seasonPhase);

    if (this.callbacks.onWeekComplete) {
      const summary = this.weekService.generateWeekSummary(
        this.state.weekFlow,
        this.gameState,
        this.userTeamId
      );
      this.callbacks.onWeekComplete(summary);
    }

    return result;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get updated game state
   */
  getGameState(): GameState | null {
    return this.gameState;
  }

  /**
   * Get current live game display
   */
  getLiveGame(): LiveGameDisplay | null {
    return this.state.gameDayFlow?.liveGame || null;
  }

  /**
   * Set loading state
   */
  private setLoading(isLoading: boolean): void {
    this.state = {
      ...this.state,
      isLoading,
    };
    this.notifyStateChange();
  }

  /**
   * Set error
   */
  private setError(error: string | null): void {
    this.state = {
      ...this.state,
      error,
    };
    this.notifyStateChange();
  }

  /**
   * Clear error
   */
  clearError(): void {
    this.setError(null);
  }

  /**
   * Notify state change
   */
  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  /**
   * Reset manager
   */
  reset(): void {
    this.gameDayFlow.reset();
    this.state = this.createInitialState();
    this.gameState = null;
    this.schedule = null;
    this.userTeamId = '';
    this.notifyStateChange();
  }

  /**
   * Dispatch action (alternative interface for state updates)
   */
  dispatch(action: GameFlowAction): void {
    switch (action.type) {
      case 'START_WEEK':
        this.startWeek(action.weekNumber, action.seasonPhase);
        break;

      case 'VIEW_PRE_GAME':
        this.viewPreGame();
        break;

      case 'START_GAME_DAY':
        this.startGameSimulation();
        break;

      case 'SET_PREDICTION':
        this.setPrediction(action.prediction);
        break;

      case 'SET_SPEED':
        this.setSimulationSpeed(action.speed);
        break;

      case 'PAUSE_SIMULATION':
        this.pauseSimulation();
        break;

      case 'RESUME_SIMULATION':
        this.resumeSimulation();
        break;

      case 'SKIP_TO_END':
        this.skipToEnd();
        break;

      case 'MARK_RESULT_VIEWED':
        this.markGameResultViewed();
        break;

      case 'SIM_OTHER_GAMES':
        this.simulateOtherGames();
        break;

      case 'VIEW_WEEK_SUMMARY':
        this.viewWeekSummary();
        break;

      case 'MARK_SUMMARY_VIEWED':
        this.markWeekSummaryViewed();
        break;

      case 'ADVANCE_WEEK':
        this.advanceWeek();
        break;

      case 'SET_LOADING':
        this.setLoading(action.isLoading);
        break;

      case 'SET_ERROR':
        this.setError(action.error);
        break;

      case 'RESET':
        this.reset();
        break;

      default:
        // eslint-disable-next-line no-console
        console.warn('Unknown action:', action);
    }
  }
}

/**
 * Create a new game flow manager
 */
export function createGameFlowManager(
  config: Partial<GameFlowManagerConfig> = {}
): GameFlowManager {
  return new GameFlowManager(config);
}

/**
 * Singleton instance for app-wide use
 */
let globalManager: GameFlowManager | null = null;

/**
 * Get or create global game flow manager
 */
export function getGameFlowManager(): GameFlowManager {
  if (!globalManager) {
    globalManager = createGameFlowManager();
  }
  return globalManager;
}

/**
 * Reset global manager (for testing)
 */
export function resetGameFlowManager(): void {
  if (globalManager) {
    globalManager.reset();
    globalManager = null;
  }
}

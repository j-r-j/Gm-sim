/**
 * Game Flow Events
 *
 * Event-driven architecture for game simulation.
 * Allows decoupled components to react to game events.
 */

import { PlayDisplay, InjuryStatus, HalftimeInfo } from './types';
import { GameResult } from '../game/GameRunner';
import { WeekSummary } from './types';

// Re-export types used in event payloads for convenience
export { PlayDisplay };

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * All possible game flow events
 */
export type GameFlowEvent =
  | PlayEvent
  | ScoreEvent
  | QuarterEvent
  | GameStateEvent
  | WeekEvent
  | InjuryEvent;

/**
 * Play-related events
 */
export type PlayEvent =
  | { type: 'PLAY_COMPLETE'; payload: PlayComplete }
  | { type: 'TOUCHDOWN'; payload: PlayComplete }
  | { type: 'TURNOVER'; payload: PlayComplete }
  | { type: 'BIG_PLAY'; payload: PlayComplete }
  | { type: 'FIELD_GOAL'; payload: FieldGoalPayload }
  | { type: 'SAFETY'; payload: PlayComplete };

export interface PlayComplete {
  play: PlayDisplay;
  homeScore: number;
  awayScore: number;
  quarter: number;
  timeRemaining: number;
}

export interface FieldGoalPayload extends PlayComplete {
  made: boolean;
  distance: number;
}

/**
 * Score-related events
 */
export type ScoreEvent =
  | { type: 'SCORE_CHANGE'; payload: ScoreChange }
  | { type: 'LEAD_CHANGE'; payload: LeadChange };

export interface ScoreChange {
  homeScore: number;
  awayScore: number;
  scoringTeam: 'home' | 'away';
  points: number;
  description: string;
}

export interface LeadChange {
  newLeader: 'home' | 'away' | 'tied';
  homeScore: number;
  awayScore: number;
}

/**
 * Quarter-related events
 */
export type QuarterEvent =
  | { type: 'QUARTER_START'; payload: QuarterPayload }
  | { type: 'QUARTER_END'; payload: QuarterPayload }
  | { type: 'HALFTIME'; payload: HalftimeInfo }
  | { type: 'TWO_MINUTE_WARNING'; payload: QuarterPayload }
  | { type: 'OVERTIME_START'; payload: { homeScore: number; awayScore: number } };

export interface QuarterPayload {
  quarter: number;
  homeScore: number;
  awayScore: number;
}

/**
 * Game state events
 */
export type GameStateEvent =
  | { type: 'GAME_START'; payload: GameStartPayload }
  | { type: 'GAME_END'; payload: GameResult }
  | { type: 'SIMULATION_PAUSED'; payload: SimulationStatePayload }
  | { type: 'SIMULATION_RESUMED'; payload: SimulationStatePayload }
  | { type: 'SIMULATION_SPEED_CHANGED'; payload: SpeedChangePayload };

export interface GameStartPayload {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  week: number;
}

export interface SimulationStatePayload {
  gameId: string;
  currentQuarter: number;
  timeRemaining: number;
  homeScore: number;
  awayScore: number;
}

export interface SpeedChangePayload {
  previousSpeed: string;
  newSpeed: string;
}

/**
 * Week-related events
 */
export type WeekEvent =
  | { type: 'WEEK_START'; payload: WeekStartPayload }
  | { type: 'WEEK_END'; payload: WeekSummary }
  | { type: 'OTHER_GAMES_COMPLETE'; payload: OtherGamesPayload }
  | { type: 'SEASON_PHASE_CHANGE'; payload: SeasonPhasePayload };

export interface WeekStartPayload {
  weekNumber: number;
  seasonPhase: string;
  isUserOnBye: boolean;
}

export interface OtherGamesPayload {
  completedGames: number;
  totalGames: number;
}

export interface SeasonPhasePayload {
  previousPhase: string;
  newPhase: string;
}

/**
 * Injury-related events
 */
export type InjuryEvent =
  | { type: 'INJURY_OCCURRED'; payload: InjuryStatus }
  | { type: 'PLAYER_RECOVERED'; payload: RecoveryPayload };

export interface RecoveryPayload {
  playerId: string;
  playerName: string;
  teamId: string;
}

// ============================================================================
// EVENT BUS
// ============================================================================

/**
 * Event listener callback type
 */
type EventListener<T extends GameFlowEvent = GameFlowEvent> = (event: T) => void;

/**
 * Event subscription handle
 */
export interface EventSubscription {
  unsubscribe: () => void;
}

/**
 * Game Flow Event Bus
 *
 * Simple pub/sub implementation for game events.
 * Allows components to subscribe to specific event types.
 */
export class GameFlowEventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();
  private allListeners: Set<EventListener<GameFlowEvent>> = new Set();
  private eventHistory: GameFlowEvent[] = [];
  private maxHistorySize = 100;

  /**
   * Subscribe to a specific event type
   */
  subscribe<T extends GameFlowEvent['type']>(
    eventType: T,
    listener: EventListener<Extract<GameFlowEvent, { type: T }>>
  ): EventSubscription {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener as EventListener);

    return {
      unsubscribe: () => {
        this.listeners.get(eventType)?.delete(listener as EventListener);
      },
    };
  }

  /**
   * Subscribe to all events
   */
  subscribeAll(listener: EventListener<GameFlowEvent>): EventSubscription {
    this.allListeners.add(listener);

    return {
      unsubscribe: () => {
        this.allListeners.delete(listener);
      },
    };
  }

  /**
   * Emit an event to all subscribers
   */
  emit(event: GameFlowEvent): void {
    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify specific listeners
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${event.type}:`, error);
        }
      });
    }

    // Notify all listeners
    this.allListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in all-events listener:`, error);
      }
    });
  }

  /**
   * Get recent event history
   */
  getHistory(limit?: number): GameFlowEvent[] {
    const count = limit || this.eventHistory.length;
    return this.eventHistory.slice(-count);
  }

  /**
   * Get events of a specific type from history
   */
  getEventsByType<T extends GameFlowEvent['type']>(
    eventType: T,
    limit?: number
  ): Extract<GameFlowEvent, { type: T }>[] {
    const events = this.eventHistory.filter(
      (e) => e.type === eventType
    ) as Extract<GameFlowEvent, { type: T }>[];
    return limit ? events.slice(-limit) : events;
  }

  /**
   * Clear all subscriptions and history
   */
  reset(): void {
    this.listeners.clear();
    this.allListeners.clear();
    this.eventHistory = [];
  }

  /**
   * Get subscriber count for debugging
   */
  getSubscriberCount(eventType?: string): number {
    if (eventType) {
      return this.listeners.get(eventType)?.size || 0;
    }
    let total = this.allListeners.size;
    this.listeners.forEach((set) => {
      total += set.size;
    });
    return total;
  }
}

/**
 * Global event bus instance
 */
export const gameFlowEventBus = new GameFlowEventBus();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a play complete event
 */
export function createPlayCompleteEvent(
  play: PlayDisplay,
  homeScore: number,
  awayScore: number,
  quarter: number,
  timeRemaining: number
): PlayEvent {
  const payload: PlayComplete = {
    play,
    homeScore,
    awayScore,
    quarter,
    timeRemaining,
  };

  // Determine specific event type based on play
  if (play.isScoring && play.description.toLowerCase().includes('touchdown')) {
    return { type: 'TOUCHDOWN', payload };
  }

  if (play.isTurnover) {
    return { type: 'TURNOVER', payload };
  }

  if (play.isBigPlay) {
    return { type: 'BIG_PLAY', payload };
  }

  return { type: 'PLAY_COMPLETE', payload };
}

/**
 * Create a score change event
 */
export function createScoreChangeEvent(
  homeScore: number,
  awayScore: number,
  previousHomeScore: number,
  previousAwayScore: number,
  description: string
): ScoreEvent {
  const scoringTeam = homeScore !== previousHomeScore ? 'home' : 'away';
  const points =
    scoringTeam === 'home'
      ? homeScore - previousHomeScore
      : awayScore - previousAwayScore;

  return {
    type: 'SCORE_CHANGE',
    payload: {
      homeScore,
      awayScore,
      scoringTeam,
      points,
      description,
    },
  };
}

/**
 * Check if there was a lead change
 */
export function checkLeadChange(
  previousHome: number,
  previousAway: number,
  currentHome: number,
  currentAway: number
): LeadChange | null {
  const previousLeader =
    previousHome > previousAway ? 'home' : previousAway > previousHome ? 'away' : 'tied';
  const currentLeader =
    currentHome > currentAway ? 'home' : currentAway > currentHome ? 'away' : 'tied';

  if (previousLeader !== currentLeader) {
    return {
      newLeader: currentLeader,
      homeScore: currentHome,
      awayScore: currentAway,
    };
  }

  return null;
}

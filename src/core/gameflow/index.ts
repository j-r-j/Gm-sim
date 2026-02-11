/**
 * Game Flow Module
 *
 * Centralized game and week flow management following best practices
 * for American football simulation games.
 *
 * Architecture:
 * - GameFlowManager: Central state machine for week/game progression
 * - GameDayFlow: Orchestrates pre-game → game → post-game transitions
 * - WeekProgressionService: Handles week advancement, injuries, fatigue reset
 * - GameSimulationEngine: Event-driven game simulation
 */

export * from './types';
export * from './GameFlowManager';
export * from './GameDayFlow';
export * from './WeekProgressionService';
export * from './GameSimulationEngine';
export * from './events';

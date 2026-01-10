/**
 * Game Models Index
 * Exports all game-related models, types, and utilities
 */

export {
  SaveSlot,
  ALL_SAVE_SLOTS,
  SimulationSpeed,
  ALL_SIMULATION_SPEEDS,
  CareerTeamEntry,
  CareerStats,
  GameSettings,
  Prospect,
  GameState,
  DEFAULT_GAME_SETTINGS,
  createDefaultCareerStats,
  validateCareerTeamEntry,
  validateCareerStats,
  validateGameSettings,
  validateSaveSlot,
  validateGameState,
  createGameStateSkeleton,
  updateLastSaved,
  addCareerTeamEntry,
  endCareerTeamEntry,
  updateCareerStatsAfterSeason,
  getCurrentTeamEntry,
  getCareerWinningPercentage,
  serializeGameState,
  deserializeGameState,
  getGameStateSummary,
} from './GameState';

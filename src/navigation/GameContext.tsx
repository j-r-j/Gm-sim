/**
 * GameContext
 * Provides game state to all screens via React Context
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { GameState, updateLastSaved } from '../core/models/game/GameState';
import { gameStorage } from '../services/storage/GameStorage';
import { FiringRecord } from '../core/career/FiringMechanics';

/**
 * Game context value interface
 */
export interface GameContextValue {
  // State
  gameState: GameState | null;
  isLoading: boolean;
  firingRecord: FiringRecord | null;

  // Draft state (kept here for persistence across navigation)
  draftCurrentPick: number;
  draftedProspects: Record<string, string>;
  autoPickEnabled: boolean;
  draftPaused: boolean;

  // Actions
  setGameState: (state: GameState | null) => void;
  saveGame: () => Promise<void>;
  saveGameState: (state: GameState) => Promise<void>;
  setIsLoading: (loading: boolean) => void;
  setFiringRecord: (record: FiringRecord | null) => void;

  // Draft actions
  setDraftCurrentPick: (pick: number) => void;
  setDraftedProspects: (prospects: Record<string, string>) => void;
  setAutoPickEnabled: (enabled: boolean) => void;
  setDraftPaused: (paused: boolean) => void;
  resetDraftState: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

/**
 * Hook to access game context
 * Throws if used outside GameProvider
 */
export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

/**
 * Hook to access game state (convenience)
 * Returns null if no game loaded
 */
export function useGameState(): GameState | null {
  const { gameState } = useGame();
  return gameState;
}

/**
 * Hook to access game state with assertion
 * Throws if no game loaded - use in screens that require game state
 */
export function useRequiredGameState(): GameState {
  const { gameState } = useGame();
  if (!gameState) {
    throw new Error('Game state required but not loaded');
  }
  return gameState;
}

interface GameProviderProps {
  children: React.ReactNode;
}

/**
 * GameProvider component
 * Wraps the app to provide game state context
 */
export function GameProvider({ children }: GameProviderProps): React.JSX.Element {
  // Core state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [firingRecord, setFiringRecord] = useState<FiringRecord | null>(null);

  // Draft state
  const [draftCurrentPick, setDraftCurrentPick] = useState(1);
  const [draftedProspects, setDraftedProspects] = useState<Record<string, string>>({});
  const [autoPickEnabled, setAutoPickEnabled] = useState(false);
  const [draftPaused, setDraftPaused] = useState(false);

  // Save game state to storage
  const saveGameState = useCallback(async (updatedState: GameState) => {
    try {
      await gameStorage.save(updatedState.saveSlot, updatedState);
    } catch (error) {
      console.error('Error auto-saving game:', error);
    }
  }, []);

  // Save with UI feedback
  const saveGame = useCallback(async () => {
    if (!gameState) return;

    setIsLoading(true);
    try {
      const updatedState = updateLastSaved(gameState);
      await gameStorage.save(gameState.saveSlot, updatedState);
      setGameState(updatedState);
      Alert.alert('Success', 'Game saved successfully!');
    } catch (error) {
      console.error('Error saving game:', error);
      Alert.alert('Error', 'Failed to save game.');
    } finally {
      setIsLoading(false);
    }
  }, [gameState]);

  // Reset draft state
  const resetDraftState = useCallback(() => {
    setDraftCurrentPick(1);
    setDraftedProspects({});
    setAutoPickEnabled(false);
    setDraftPaused(false);
  }, []);

  // Memoize context value
  const value = useMemo<GameContextValue>(
    () => ({
      gameState,
      isLoading,
      firingRecord,
      draftCurrentPick,
      draftedProspects,
      autoPickEnabled,
      draftPaused,
      setGameState,
      saveGame,
      saveGameState,
      setIsLoading,
      setFiringRecord,
      setDraftCurrentPick,
      setDraftedProspects,
      setAutoPickEnabled,
      setDraftPaused,
      resetDraftState,
    }),
    [
      gameState,
      isLoading,
      firingRecord,
      draftCurrentPick,
      draftedProspects,
      autoPickEnabled,
      draftPaused,
      saveGame,
      saveGameState,
      resetDraftState,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export default GameContext;

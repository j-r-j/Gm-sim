/**
 * GameContext
 * Provides game state to all screens via React Context
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { GameState, updateLastSaved } from '../core/models/game/GameState';
import { gameStorage } from '../services/storage/GameStorage';
import { FiringRecord } from '../core/career/FiringMechanics';
import { GameResult } from '../core/game/GameRunner';
import { BoxScore } from '../core/game/BoxScoreGenerator';

/**
 * Simulated game result for other games (non-user games)
 */
export interface OtherGameResult {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  winnerId: string;
  boxScore?: BoxScore;
}

/**
 * Game context value interface
 */
export interface GameContextValue {
  // State
  gameState: GameState | null;
  isLoading: boolean;
  firingRecord: FiringRecord | null;

  // New game setup state (persists during team selection -> staff decision -> hiring flow)
  pendingNewGame: GameState | null;

  // Draft state (kept here for persistence across navigation)
  draftCurrentPick: number;
  draftedProspects: Record<string, string>;
  autoPickEnabled: boolean;
  draftPaused: boolean;

  // Week results state (persists game result data for post-game summary)
  lastGameResult: GameResult | null;
  otherGamesResults: OtherGameResult[];

  // Actions
  setGameState: (state: GameState | null) => void;
  saveGame: () => Promise<void>;
  saveGameState: (state: GameState) => Promise<void>;
  setIsLoading: (loading: boolean) => void;
  setFiringRecord: (record: FiringRecord | null) => void;

  // New game setup actions
  setPendingNewGame: (state: GameState | null) => void;
  clearPendingNewGame: () => void;

  // Draft actions
  setDraftCurrentPick: (pick: number) => void;
  setDraftedProspects: (prospects: Record<string, string>) => void;
  setAutoPickEnabled: (enabled: boolean) => void;
  setDraftPaused: (paused: boolean) => void;
  resetDraftState: () => void;

  // Week results actions
  setLastGameResult: (result: GameResult | null) => void;
  setOtherGamesResults: (results: OtherGameResult[]) => void;
  clearWeekResults: () => void;
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

  // New game setup state (persists during staff decision/hiring flow)
  const [pendingNewGame, setPendingNewGame] = useState<GameState | null>(null);

  // Clear pending new game
  const clearPendingNewGame = useCallback(() => {
    setPendingNewGame(null);
  }, []);

  // Draft state
  const [draftCurrentPick, setDraftCurrentPick] = useState(1);
  const [draftedProspects, setDraftedProspects] = useState<Record<string, string>>({});
  const [autoPickEnabled, setAutoPickEnabled] = useState(false);
  const [draftPaused, setDraftPaused] = useState(false);

  // Week results state (stores game result data for post-game summary)
  const [lastGameResult, setLastGameResult] = useState<GameResult | null>(null);
  const [otherGamesResults, setOtherGamesResults] = useState<OtherGameResult[]>([]);

  // Clear week results
  const clearWeekResults = useCallback(() => {
    setLastGameResult(null);
    setOtherGamesResults([]);
  }, []);

  // Save game state to storage
  const saveGameState = useCallback(async (updatedState: GameState) => {
    try {
      await gameStorage.save(updatedState.saveSlot, updatedState);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error auto-saving game:', error);
    }
  }, []);

  // Keep a ref to the latest gameState to avoid stale closures in AppState listener
  const gameStateRef = useRef<GameState | null>(gameState);
  gameStateRef.current = gameState;

  // Track lastSavedAt to avoid unnecessary periodic saves when nothing changed
  const lastAutoSaveRef = useRef<string | null>(null);

  // Auto-save when app goes to background/inactive
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if ((nextAppState === 'background' || nextAppState === 'inactive') && gameStateRef.current) {
        saveGameState(gameStateRef.current);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [saveGameState]);

  // Periodic auto-save every 60 seconds when autoSaveEnabled
  useEffect(() => {
    if (!gameState?.gameSettings?.autoSaveEnabled) return;

    const intervalId = setInterval(() => {
      const current = gameStateRef.current;
      if (current && current.lastSavedAt !== lastAutoSaveRef.current) {
        lastAutoSaveRef.current = current.lastSavedAt;
        saveGameState(current);
      }
    }, 60_000);

    return () => {
      clearInterval(intervalId);
    };
  }, [gameState?.gameSettings?.autoSaveEnabled, saveGameState]);

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
      // eslint-disable-next-line no-console
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
      pendingNewGame,
      draftCurrentPick,
      draftedProspects,
      autoPickEnabled,
      draftPaused,
      lastGameResult,
      otherGamesResults,
      setGameState,
      saveGame,
      saveGameState,
      setIsLoading,
      setFiringRecord,
      setPendingNewGame,
      clearPendingNewGame,
      setDraftCurrentPick,
      setDraftedProspects,
      setAutoPickEnabled,
      setDraftPaused,
      resetDraftState,
      setLastGameResult,
      setOtherGamesResults,
      clearWeekResults,
    }),
    [
      gameState,
      isLoading,
      firingRecord,
      pendingNewGame,
      draftCurrentPick,
      draftedProspects,
      autoPickEnabled,
      draftPaused,
      lastGameResult,
      otherGamesResults,
      saveGame,
      saveGameState,
      clearPendingNewGame,
      resetDraftState,
      clearWeekResults,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export default GameContext;

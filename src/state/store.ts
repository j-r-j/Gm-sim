import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SaveSlot = 0 | 1 | 2;

interface GameMetaState {
  currentSaveSlot: SaveSlot | null;
  lastSaved: string | null;
  setCurrentSaveSlot: (slot: SaveSlot | null) => void;
  setLastSaved: (date: string | null) => void;
}

export const useGameMetaStore = create<GameMetaState>()(
  persist(
    (set) => ({
      currentSaveSlot: null,
      lastSaved: null,
      setCurrentSaveSlot: (slot: SaveSlot | null) => set({ currentSaveSlot: slot }),
      setLastSaved: (date: string | null) => set({ lastSaved: date }),
    }),
    {
      name: 'nfl-gm-sim-meta',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

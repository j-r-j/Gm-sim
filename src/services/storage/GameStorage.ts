import AsyncStorage from '@react-native-async-storage/async-storage';
import { SaveSlot } from '../../core/models/game/GameState';

export type { SaveSlot };

const SAVE_KEY_PREFIX = 'save_';

export class GameStorage {
  private getKey(slot: SaveSlot): string {
    return `${SAVE_KEY_PREFIX}${slot}`;
  }

  async save<T>(slot: SaveSlot, data: T): Promise<void> {
    const key = this.getKey(slot);
    await AsyncStorage.setItem(key, JSON.stringify(data));
  }

  async load<T>(slot: SaveSlot): Promise<T | null> {
    const key = this.getKey(slot);
    const data = await AsyncStorage.getItem(key);
    return data ? (JSON.parse(data) as T) : null;
  }

  async delete(slot: SaveSlot): Promise<void> {
    const key = this.getKey(slot);
    await AsyncStorage.removeItem(key);
  }

  async listSlots(): Promise<SaveSlot[]> {
    const slots: SaveSlot[] = [];
    for (const slot of [0, 1, 2] as SaveSlot[]) {
      const data = await AsyncStorage.getItem(this.getKey(slot));
      if (data !== null) {
        slots.push(slot);
      }
    }
    return slots;
  }

  async slotExists(slot: SaveSlot): Promise<boolean> {
    const data = await AsyncStorage.getItem(this.getKey(slot));
    return data !== null;
  }
}

export const gameStorage = new GameStorage();

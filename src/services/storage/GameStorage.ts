import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  compressToUTF16,
  decompressFromUTF16,
} from 'lz-string';
import { SaveSlot } from '../../core/models/game/GameState';

export type { SaveSlot };

const SAVE_KEY_PREFIX = 'save_';

/**
 * Prefix marker for compressed saves.
 * Uncompressed saves start with '{' (raw JSON), so we can distinguish them.
 */
const COMPRESSED_PREFIX = 'LZ:';

export class GameStorage {
  private getKey(slot: SaveSlot): string {
    return `${SAVE_KEY_PREFIX}${slot}`;
  }

  async save<T>(slot: SaveSlot, data: T): Promise<void> {
    const key = this.getKey(slot);
    const json = JSON.stringify(data);
    const compressed = COMPRESSED_PREFIX + compressToUTF16(json);
    // eslint-disable-next-line no-console
    console.log(
      `[GameStorage] save slot ${slot}: JSON ${json.length} chars -> compressed ${compressed.length} chars (${Math.round((compressed.length / json.length) * 100)}%)`
    );
    await AsyncStorage.setItem(key, compressed);
  }

  async load<T>(slot: SaveSlot): Promise<T | null> {
    const key = this.getKey(slot);
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;

    // Support both compressed (prefixed) and legacy uncompressed saves
    let json: string;
    if (raw.startsWith(COMPRESSED_PREFIX)) {
      const decompressed = decompressFromUTF16(raw.slice(COMPRESSED_PREFIX.length));
      if (decompressed === null) {
        throw new Error(`Failed to decompress save data for slot ${slot}`);
      }
      json = decompressed;
    } else {
      // Legacy uncompressed JSON
      json = raw;
    }

    return JSON.parse(json) as T;
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

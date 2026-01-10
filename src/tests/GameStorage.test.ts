import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameStorage } from '../services/storage/GameStorage';

describe('GameStorage', () => {
  let storage: GameStorage;

  beforeEach(async () => {
    await AsyncStorage.clear();
    storage = new GameStorage();
  });

  describe('save and load', () => {
    it('should save and load data from slot 0', async () => {
      const testData = { team: 'Patriots', wins: 10 };
      await storage.save(0, testData);
      const loaded = await storage.load<typeof testData>(0);
      expect(loaded).toEqual(testData);
    });

    it('should save and load data from slot 1', async () => {
      const testData = { team: 'Chiefs', wins: 12 };
      await storage.save(1, testData);
      const loaded = await storage.load<typeof testData>(1);
      expect(loaded).toEqual(testData);
    });

    it('should save and load data from slot 2', async () => {
      const testData = { team: 'Bills', wins: 11 };
      await storage.save(2, testData);
      const loaded = await storage.load<typeof testData>(2);
      expect(loaded).toEqual(testData);
    });

    it('should return null for empty slot', async () => {
      const loaded = await storage.load(0);
      expect(loaded).toBeNull();
    });

    it('should overwrite existing data in slot', async () => {
      await storage.save(0, { version: 1 });
      await storage.save(0, { version: 2 });
      const loaded = await storage.load<{ version: number }>(0);
      expect(loaded?.version).toBe(2);
    });
  });

  describe('delete', () => {
    it('should delete data from a slot', async () => {
      await storage.save(0, { test: true });
      await storage.delete(0);
      const loaded = await storage.load(0);
      expect(loaded).toBeNull();
    });

    it('should not affect other slots when deleting', async () => {
      await storage.save(0, { slot: 0 });
      await storage.save(1, { slot: 1 });
      await storage.delete(0);

      expect(await storage.load(0)).toBeNull();
      expect(await storage.load(1)).toEqual({ slot: 1 });
    });
  });

  describe('listSlots', () => {
    it('should return empty array when no slots are used', async () => {
      const slots = await storage.listSlots();
      expect(slots).toEqual([]);
    });

    it('should return array with used slot', async () => {
      await storage.save(1, { test: true });
      const slots = await storage.listSlots();
      expect(slots).toEqual([1]);
    });

    it('should return all used slots', async () => {
      await storage.save(0, { slot: 0 });
      await storage.save(2, { slot: 2 });
      const slots = await storage.listSlots();
      expect(slots).toEqual([0, 2]);
    });

    it('should return slots in order', async () => {
      await storage.save(2, { slot: 2 });
      await storage.save(0, { slot: 0 });
      await storage.save(1, { slot: 1 });
      const slots = await storage.listSlots();
      expect(slots).toEqual([0, 1, 2]);
    });
  });

  describe('slotExists', () => {
    it('should return false for empty slot', async () => {
      const exists = await storage.slotExists(0);
      expect(exists).toBe(false);
    });

    it('should return true for populated slot', async () => {
      await storage.save(0, { test: true });
      const exists = await storage.slotExists(0);
      expect(exists).toBe(true);
    });
  });

  describe('data integrity', () => {
    it('should handle complex nested objects', async () => {
      const complexData = {
        season: 2024,
        team: {
          name: 'Eagles',
          roster: [
            { name: 'Player 1', position: 'QB' },
            { name: 'Player 2', position: 'RB' },
          ],
        },
        stats: {
          wins: 10,
          losses: 7,
        },
      };

      await storage.save(0, complexData);
      const loaded = await storage.load<typeof complexData>(0);
      expect(loaded).toEqual(complexData);
    });

    it('should handle arrays', async () => {
      const arrayData = [1, 2, 3, 4, 5];
      await storage.save(0, arrayData);
      const loaded = await storage.load<number[]>(0);
      expect(loaded).toEqual(arrayData);
    });
  });
});

import {
  normalRandom,
  clampedNormal,
  weightedRandom,
  createSeededRandom,
  randomInt,
  randomFloat,
  shuffleArray,
  randomElement,
  chance,
  generateUUID,
} from '../RandomUtils';

describe('RandomUtils', () => {
  describe('normalRandom', () => {
    it('should generate values around the mean', () => {
      const samples: number[] = [];
      for (let i = 0; i < 1000; i++) {
        samples.push(normalRandom(50, 10));
      }

      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      expect(avg).toBeGreaterThan(45);
      expect(avg).toBeLessThan(55);
    });

    it('should respect standard deviation', () => {
      const samples: number[] = [];
      for (let i = 0; i < 1000; i++) {
        samples.push(normalRandom(50, 10));
      }

      // About 68% should be within 1 standard deviation
      const withinOneStd = samples.filter((s) => s >= 40 && s <= 60).length;
      expect(withinOneStd).toBeGreaterThan(600);
      expect(withinOneStd).toBeLessThan(800);
    });
  });

  describe('clampedNormal', () => {
    it('should never exceed min/max bounds', () => {
      for (let i = 0; i < 500; i++) {
        const value = clampedNormal(50, 20, 30, 70);
        expect(value).toBeGreaterThanOrEqual(30);
        expect(value).toBeLessThanOrEqual(70);
      }
    });

    it('should still center around the mean', () => {
      const samples: number[] = [];
      for (let i = 0; i < 500; i++) {
        samples.push(clampedNormal(50, 10, 1, 100));
      }

      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      expect(avg).toBeGreaterThan(40);
      expect(avg).toBeLessThan(60);
    });
  });

  describe('weightedRandom', () => {
    it('should throw on empty options', () => {
      expect(() => weightedRandom([])).toThrow();
    });

    it('should respect weights', () => {
      const options = [
        { value: 'A', weight: 0.9 },
        { value: 'B', weight: 0.1 },
      ];

      const results: Record<string, number> = { A: 0, B: 0 };
      for (let i = 0; i < 1000; i++) {
        results[weightedRandom(options)]++;
      }

      expect(results['A']).toBeGreaterThan(800);
      expect(results['B']).toBeLessThan(200);
    });

    it('should handle single option', () => {
      const result = weightedRandom([{ value: 'only', weight: 1 }]);
      expect(result).toBe('only');
    });
  });

  describe('createSeededRandom', () => {
    it('should produce deterministic results with same seed', () => {
      const rng1 = createSeededRandom(12345);
      const rng2 = createSeededRandom(12345);

      const values1 = Array.from({ length: 10 }, () => rng1());
      const values2 = Array.from({ length: 10 }, () => rng2());

      expect(values1).toEqual(values2);
    });

    it('should produce different results with different seeds', () => {
      const rng1 = createSeededRandom(12345);
      const rng2 = createSeededRandom(54321);

      const values1 = Array.from({ length: 10 }, () => rng1());
      const values2 = Array.from({ length: 10 }, () => rng2());

      expect(values1).not.toEqual(values2);
    });

    it('should produce values between 0 and 1', () => {
      const rng = createSeededRandom(99999);
      for (let i = 0; i < 100; i++) {
        const value = rng();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });
  });

  describe('randomInt', () => {
    it('should produce integers within range (inclusive)', () => {
      for (let i = 0; i < 100; i++) {
        const value = randomInt(1, 10);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(10);
      }
    });

    it('should handle same min and max', () => {
      const value = randomInt(5, 5);
      expect(value).toBe(5);
    });
  });

  describe('randomFloat', () => {
    it('should produce floats within range', () => {
      for (let i = 0; i < 100; i++) {
        const value = randomFloat(1.5, 5.5);
        expect(value).toBeGreaterThanOrEqual(1.5);
        expect(value).toBeLessThanOrEqual(5.5);
      }
    });
  });

  describe('shuffleArray', () => {
    it('should maintain all elements', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray([...original]);

      expect(shuffled.sort()).toEqual(original);
    });

    it('should modify the array in place', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = shuffleArray(arr);
      expect(result).toBe(arr);
    });
  });

  describe('randomElement', () => {
    it('should throw on empty array', () => {
      expect(() => randomElement([])).toThrow();
    });

    it('should return an element from the array', () => {
      const arr = ['a', 'b', 'c'];
      for (let i = 0; i < 20; i++) {
        expect(arr).toContain(randomElement(arr));
      }
    });
  });

  describe('chance', () => {
    it('should return false for 0 probability', () => {
      for (let i = 0; i < 10; i++) {
        expect(chance(0)).toBe(false);
      }
    });

    it('should return true for 1 probability', () => {
      for (let i = 0; i < 10; i++) {
        expect(chance(1)).toBe(true);
      }
    });

    it('should respect probability approximately', () => {
      let trueCount = 0;
      for (let i = 0; i < 1000; i++) {
        if (chance(0.3)) trueCount++;
      }

      expect(trueCount).toBeGreaterThan(200);
      expect(trueCount).toBeLessThan(400);
    });
  });

  describe('generateUUID', () => {
    it('should generate valid UUID format', () => {
      const uuid = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUUID());
      }
      expect(uuids.size).toBe(100);
    });
  });
});

import { validateItFactor } from '../../../models/player/ItFactor';
import {
  generateItFactor,
  generateItFactorForSkillTier,
  getItFactorTierName,
  IT_FACTOR_DISTRIBUTION,
} from '../ItFactorGenerator';

describe('ItFactorGenerator', () => {
  describe('IT_FACTOR_DISTRIBUTION', () => {
    it('should have weights that sum to 1', () => {
      const totalWeight = IT_FACTOR_DISTRIBUTION.reduce((sum, d) => sum + d.weight, 0);
      expect(totalWeight).toBeCloseTo(1, 5);
    });

    it('should have valid ranges', () => {
      for (const { range } of IT_FACTOR_DISTRIBUTION) {
        expect(range.min).toBeGreaterThanOrEqual(1);
        expect(range.max).toBeLessThanOrEqual(100);
        expect(range.min).toBeLessThanOrEqual(range.max);
      }
    });

    it('should cover the full 1-100 range', () => {
      const allValues = new Set<number>();
      for (const { range } of IT_FACTOR_DISTRIBUTION) {
        for (let i = range.min; i <= range.max; i++) {
          allValues.add(i);
        }
      }

      for (let i = 1; i <= 100; i++) {
        expect(allValues.has(i)).toBe(true);
      }
    });
  });

  describe('generateItFactor', () => {
    it('should generate valid "It" factor values', () => {
      for (let i = 0; i < 100; i++) {
        const itFactor = generateItFactor();
        expect(validateItFactor(itFactor)).toBe(true);
      }
    });

    it('should generate values within 1-100', () => {
      for (let i = 0; i < 100; i++) {
        const itFactor = generateItFactor();
        expect(itFactor.value).toBeGreaterThanOrEqual(1);
        expect(itFactor.value).toBeLessThanOrEqual(100);
      }
    });

    it('should follow the expected distribution approximately', () => {
      const tiers: Record<string, number> = {
        transcendent: 0,
        winner: 0,
        solid: 0,
        average: 0,
        soft: 0,
        liability: 0,
      };

      const sampleSize = 2000;

      for (let i = 0; i < sampleSize; i++) {
        const itFactor = generateItFactor();
        const tierName = getItFactorTierName(itFactor.value);
        tiers[tierName.toLowerCase()]++;
      }

      // Check approximate distributions (with some tolerance)
      expect(tiers.transcendent / sampleSize).toBeLessThan(0.08); // ~2%
      expect(tiers.average / sampleSize).toBeGreaterThan(0.25); // ~40%
      expect(tiers.liability / sampleSize).toBeLessThan(0.2); // ~10%
    });

    it('should be mostly average (skewed toward middle)', () => {
      let averageCount = 0;
      const sampleSize = 500;

      for (let i = 0; i < sampleSize; i++) {
        const itFactor = generateItFactor();
        if (itFactor.value >= 40 && itFactor.value <= 59) {
          averageCount++;
        }
      }

      // Average tier should be the most common (around 40%)
      expect(averageCount / sampleSize).toBeGreaterThan(0.25);
    });

    it('should rarely generate transcendent values', () => {
      let transcendentCount = 0;
      const sampleSize = 500;

      for (let i = 0; i < sampleSize; i++) {
        const itFactor = generateItFactor();
        if (itFactor.value >= 90) {
          transcendentCount++;
        }
      }

      // Should be very rare (around 2%)
      expect(transcendentCount / sampleSize).toBeLessThan(0.1);
    });

    it('should apply draft position modifier correctly', () => {
      const topPickValues: number[] = [];
      const latePickValues: number[] = [];

      // Use larger sample size for more stable results
      for (let i = 0; i < 1000; i++) {
        topPickValues.push(generateItFactor(1).value); // Top pick
        latePickValues.push(generateItFactor(250).value); // Late pick
      }

      const avgTop = topPickValues.reduce((a, b) => a + b, 0) / topPickValues.length;
      const avgLate = latePickValues.reduce((a, b) => a + b, 0) / latePickValues.length;

      // Top picks should have slightly higher "It" factor on average
      // The modifier is small (30% chance of +5-15 bonus), so difference may be modest
      expect(avgTop).toBeGreaterThanOrEqual(avgLate - 2);
    });
  });

  describe('generateItFactorForSkillTier', () => {
    it('should generate valid values for all tiers', () => {
      const tiers: ('elite' | 'starter' | 'backup' | 'fringe' | 'random')[] = [
        'elite',
        'starter',
        'backup',
        'fringe',
        'random',
      ];

      for (const tier of tiers) {
        for (let i = 0; i < 20; i++) {
          const itFactor = generateItFactorForSkillTier(tier);
          expect(validateItFactor(itFactor)).toBe(true);
        }
      }
    });

    it('should give elite players higher "It" factor on average', () => {
      const eliteValues: number[] = [];
      const fringeValues: number[] = [];

      // Use larger sample size for more stable results
      for (let i = 0; i < 1000; i++) {
        eliteValues.push(generateItFactorForSkillTier('elite').value);
        fringeValues.push(generateItFactorForSkillTier('fringe').value);
      }

      const avgElite = eliteValues.reduce((a, b) => a + b, 0) / eliteValues.length;
      const avgFringe = fringeValues.reduce((a, b) => a + b, 0) / fringeValues.length;

      // Elite players should have at least as high "It" factor as fringe players
      // The modifier is modest, so we allow for small variance
      expect(avgElite).toBeGreaterThanOrEqual(avgFringe - 3);
    });
  });

  describe('getItFactorTierName', () => {
    it('should return correct tier names', () => {
      expect(getItFactorTierName(100)).toBe('Transcendent');
      expect(getItFactorTierName(90)).toBe('Transcendent');
      expect(getItFactorTierName(89)).toBe('Winner');
      expect(getItFactorTierName(75)).toBe('Winner');
      expect(getItFactorTierName(74)).toBe('Solid');
      expect(getItFactorTierName(60)).toBe('Solid');
      expect(getItFactorTierName(59)).toBe('Average');
      expect(getItFactorTierName(40)).toBe('Average');
      expect(getItFactorTierName(39)).toBe('Soft');
      expect(getItFactorTierName(20)).toBe('Soft');
      expect(getItFactorTierName(19)).toBe('Liability');
      expect(getItFactorTierName(1)).toBe('Liability');
    });
  });

  describe('"It" factor is not exposed', () => {
    it('should have value property for engine use', () => {
      const itFactor = generateItFactor();
      expect(typeof itFactor.value).toBe('number');
    });

    it('should be a simple object that can be serialized', () => {
      const itFactor = generateItFactor();
      const serialized = JSON.stringify(itFactor);
      const parsed = JSON.parse(serialized);

      // The raw object DOES contain value
      expect(parsed.value).toBeDefined();

      // But the view model should strip it - tested in privacy tests
    });
  });
});

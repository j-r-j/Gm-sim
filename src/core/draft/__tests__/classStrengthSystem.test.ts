import {
  ClassStrength,
  generateClassStrength,
  generateClassStrengthForYear,
  getClassStrengthModifiers,
  calculateTierDistribution,
  getProspectTier,
  applySkillModifier,
  generatePositionStrengthModifiers,
  getPositionModifier,
  createDraftClassMeta,
  createDraftClassMetaWithStrength,
  validateDraftClassMeta,
  getExpectedEliteCount,
  getExpectedStarterCount,
  getClassQualityLabel,
  CLASS_STRENGTH_MODIFIERS,
} from '../ClassStrengthSystem';

describe('ClassStrengthSystem', () => {
  describe('generateClassStrength', () => {
    it('should return a valid class strength', () => {
      const strengths = new Set<ClassStrength>();

      // Generate many to cover distribution
      for (let i = 0; i < 100; i++) {
        const strength = generateClassStrength();
        expect(Object.values(ClassStrength)).toContain(strength);
        strengths.add(strength);
      }

      // Should generate variety
      expect(strengths.size).toBeGreaterThan(1);
    });

    it('should favor average strength', () => {
      const counts: Record<ClassStrength, number> = {
        [ClassStrength.HISTORIC]: 0,
        [ClassStrength.STRONG]: 0,
        [ClassStrength.AVERAGE]: 0,
        [ClassStrength.WEAK]: 0,
        [ClassStrength.POOR]: 0,
      };

      for (let i = 0; i < 1000; i++) {
        counts[generateClassStrength()]++;
      }

      // Average should be most common
      expect(counts[ClassStrength.AVERAGE]).toBeGreaterThan(counts[ClassStrength.HISTORIC]);
      expect(counts[ClassStrength.AVERAGE]).toBeGreaterThan(counts[ClassStrength.POOR]);
    });
  });

  describe('generateClassStrengthForYear', () => {
    it('should return consistent results for same year', () => {
      const strength1 = generateClassStrengthForYear(2025);
      const strength2 = generateClassStrengthForYear(2025);

      expect(strength1).toBe(strength2);
    });

    it('should return valid class strengths', () => {
      for (let year = 2020; year <= 2030; year++) {
        const strength = generateClassStrengthForYear(year);
        expect(Object.values(ClassStrength)).toContain(strength);
      }
    });
  });

  describe('getClassStrengthModifiers', () => {
    it('should return modifiers for each strength level', () => {
      for (const strength of Object.values(ClassStrength)) {
        const modifiers = getClassStrengthModifiers(strength);

        expect(modifiers.eliteMultiplier).toBeDefined();
        expect(modifiers.starterMultiplier).toBeDefined();
        expect(modifiers.ceilingModifier).toBeDefined();
        expect(modifiers.floorModifier).toBeDefined();
        expect(modifiers.itFactorBoost).toBeDefined();
        expect(modifiers.fastDeveloperChance).toBeDefined();
      }
    });

    it('should have higher multipliers for stronger classes', () => {
      const historicMods = getClassStrengthModifiers(ClassStrength.HISTORIC);
      const averageMods = getClassStrengthModifiers(ClassStrength.AVERAGE);
      const poorMods = getClassStrengthModifiers(ClassStrength.POOR);

      expect(historicMods.eliteMultiplier).toBeGreaterThan(averageMods.eliteMultiplier);
      expect(averageMods.eliteMultiplier).toBeGreaterThan(poorMods.eliteMultiplier);
    });
  });

  describe('calculateTierDistribution', () => {
    it('should return distribution that sums to 1.0', () => {
      for (const strength of Object.values(ClassStrength)) {
        const dist = calculateTierDistribution(strength);
        const sum = dist.elite + dist.starter + dist.backup + dist.fringe;

        expect(Math.abs(sum - 1.0)).toBeLessThan(0.01);
      }
    });

    it('should have more elite prospects in historic classes', () => {
      const historicDist = calculateTierDistribution(ClassStrength.HISTORIC);
      const averageDist = calculateTierDistribution(ClassStrength.AVERAGE);
      const poorDist = calculateTierDistribution(ClassStrength.POOR);

      expect(historicDist.elite).toBeGreaterThan(averageDist.elite);
      expect(averageDist.elite).toBeGreaterThan(poorDist.elite);
    });
  });

  describe('getProspectTier', () => {
    it('should return valid tiers', () => {
      const validTiers = ['elite', 'starter', 'backup', 'fringe'];

      for (let i = 0; i < 100; i++) {
        const tier = getProspectTier(ClassStrength.AVERAGE);
        expect(validTiers).toContain(tier);
      }
    });

    it('should produce more elite prospects in historic classes', () => {
      const historicElites = countTier(ClassStrength.HISTORIC, 'elite', 500);
      const averageElites = countTier(ClassStrength.AVERAGE, 'elite', 500);
      const poorElites = countTier(ClassStrength.POOR, 'elite', 500);

      expect(historicElites).toBeGreaterThan(averageElites);
      expect(averageElites).toBeGreaterThan(poorElites);
    });
  });

  describe('applySkillModifier', () => {
    it('should increase values for strong classes', () => {
      const baseValue = 50;
      const historicCeiling = applySkillModifier(baseValue, ClassStrength.HISTORIC, true);

      expect(historicCeiling).toBeGreaterThan(baseValue);
    });

    it('should decrease values for weak classes', () => {
      const baseValue = 50;
      const poorCeiling = applySkillModifier(baseValue, ClassStrength.POOR, true);

      expect(poorCeiling).toBeLessThan(baseValue);
    });

    it('should keep values in valid range', () => {
      // Test edge cases
      expect(applySkillModifier(95, ClassStrength.HISTORIC, true)).toBeLessThanOrEqual(100);
      expect(applySkillModifier(5, ClassStrength.POOR, true)).toBeGreaterThanOrEqual(1);
    });
  });

  describe('generatePositionStrengthModifiers', () => {
    const positions = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S'];

    it('should select strong and weak positions', () => {
      const modifiers = generatePositionStrengthModifiers(positions);

      expect(modifiers.strongPositions.length).toBeGreaterThanOrEqual(2);
      expect(modifiers.strongPositions.length).toBeLessThanOrEqual(4);
      expect(modifiers.weakPositions.length).toBeGreaterThanOrEqual(2);
      expect(modifiers.weakPositions.length).toBeLessThanOrEqual(4);
    });

    it('should not have overlapping strong and weak positions', () => {
      for (let i = 0; i < 10; i++) {
        const modifiers = generatePositionStrengthModifiers(positions);
        const overlap = modifiers.strongPositions.filter((p) =>
          modifiers.weakPositions.includes(p)
        );

        expect(overlap.length).toBe(0);
      }
    });

    it('should have appropriate modifier values', () => {
      const modifiers = generatePositionStrengthModifiers(positions);

      expect(modifiers.strongModifier).toBeGreaterThan(1.0);
      expect(modifiers.weakModifier).toBeLessThan(1.0);
    });
  });

  describe('getPositionModifier', () => {
    it('should return correct modifiers', () => {
      const modifiers = {
        strongPositions: ['QB', 'WR'],
        weakPositions: ['OL', 'K'],
        strongModifier: 1.3,
        weakModifier: 0.7,
      };

      expect(getPositionModifier('QB', modifiers)).toBe(1.3);
      expect(getPositionModifier('WR', modifiers)).toBe(1.3);
      expect(getPositionModifier('OL', modifiers)).toBe(0.7);
      expect(getPositionModifier('RB', modifiers)).toBe(1.0);
    });
  });

  describe('createDraftClassMeta', () => {
    const positions = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S'];

    it('should create valid metadata', () => {
      const meta = createDraftClassMeta(2025, positions);

      expect(validateDraftClassMeta(meta)).toBe(true);
      expect(meta.year).toBe(2025);
    });

    it('should have consistent internal data', () => {
      const meta = createDraftClassMeta(2025, positions);

      expect(meta.modifiers).toEqual(CLASS_STRENGTH_MODIFIERS[meta.strength]);
      expect(meta.tierDistribution).toEqual(calculateTierDistribution(meta.strength));
    });
  });

  describe('createDraftClassMetaWithStrength', () => {
    const positions = ['QB', 'RB', 'WR'];

    it('should use specified strength', () => {
      const meta = createDraftClassMetaWithStrength(2025, positions, ClassStrength.HISTORIC);

      expect(meta.strength).toBe(ClassStrength.HISTORIC);
      expect(meta.modifiers).toEqual(CLASS_STRENGTH_MODIFIERS[ClassStrength.HISTORIC]);
    });
  });

  describe('validateDraftClassMeta', () => {
    const positions = ['QB', 'RB', 'WR'];

    it('should validate correct metadata', () => {
      const meta = createDraftClassMeta(2025, positions);
      expect(validateDraftClassMeta(meta)).toBe(true);
    });

    it('should reject invalid year', () => {
      const meta = createDraftClassMeta(2025, positions);
      const invalid = { ...meta, year: 1800 };

      expect(validateDraftClassMeta(invalid)).toBe(false);
    });

    it('should reject invalid tier distribution', () => {
      const meta = createDraftClassMeta(2025, positions);
      const invalid = {
        ...meta,
        tierDistribution: { elite: 0.5, starter: 0.5, backup: 0.5, fringe: 0.5 },
      };

      expect(validateDraftClassMeta(invalid)).toBe(false);
    });
  });

  describe('getExpectedEliteCount', () => {
    it('should calculate expected elite count', () => {
      const historicCount = getExpectedEliteCount(ClassStrength.HISTORIC, 300);
      const averageCount = getExpectedEliteCount(ClassStrength.AVERAGE, 300);

      expect(historicCount).toBeGreaterThan(averageCount);
      expect(historicCount).toBeGreaterThan(0);
      expect(averageCount).toBeGreaterThan(0);
    });
  });

  describe('getExpectedStarterCount', () => {
    it('should calculate expected starter count', () => {
      const historicCount = getExpectedStarterCount(ClassStrength.HISTORIC, 300);
      const averageCount = getExpectedStarterCount(ClassStrength.AVERAGE, 300);

      expect(historicCount).toBeGreaterThan(averageCount);
    });
  });

  describe('getClassQualityLabel', () => {
    it('should return readable labels', () => {
      expect(getClassQualityLabel(ClassStrength.HISTORIC)).toBe('Historic');
      expect(getClassQualityLabel(ClassStrength.STRONG)).toBe('Strong');
      expect(getClassQualityLabel(ClassStrength.AVERAGE)).toBe('Average');
      expect(getClassQualityLabel(ClassStrength.WEAK)).toBe('Weak');
      expect(getClassQualityLabel(ClassStrength.POOR)).toBe('Poor');
    });
  });
});

// Helper function to count tier occurrences
function countTier(strength: ClassStrength, tier: string, iterations: number): number {
  let count = 0;
  for (let i = 0; i < iterations; i++) {
    if (getProspectTier(strength) === tier) {
      count++;
    }
  }
  return count;
}

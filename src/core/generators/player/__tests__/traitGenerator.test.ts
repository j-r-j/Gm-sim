import { Position } from '../../../models/player/Position';
import {
  ALL_POSITIVE_TRAITS,
  ALL_NEGATIVE_TRAITS,
  HiddenTraits,
} from '../../../models/player/HiddenTraits';
import {
  generateHiddenTraits,
  getPositiveTraitCount,
  getNegativeTraitCount,
  TRAIT_PROBABILITIES,
  POSITION_TRAIT_MODIFIERS,
} from '../TraitGenerator';

describe('TraitGenerator', () => {
  describe('TRAIT_PROBABILITIES', () => {
    it('should have probabilities for all positive traits', () => {
      for (const trait of ALL_POSITIVE_TRAITS) {
        expect(TRAIT_PROBABILITIES.positive[trait]).toBeDefined();
        expect(TRAIT_PROBABILITIES.positive[trait]).toBeGreaterThan(0);
        expect(TRAIT_PROBABILITIES.positive[trait]).toBeLessThanOrEqual(1);
      }
    });

    it('should have probabilities for all negative traits', () => {
      for (const trait of ALL_NEGATIVE_TRAITS) {
        expect(TRAIT_PROBABILITIES.negative[trait]).toBeDefined();
        expect(TRAIT_PROBABILITIES.negative[trait]).toBeGreaterThan(0);
        expect(TRAIT_PROBABILITIES.negative[trait]).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('POSITION_TRAIT_MODIFIERS', () => {
    it('should have modifiers for all positions', () => {
      const positions = Object.values(Position);
      for (const position of positions) {
        expect(POSITION_TRAIT_MODIFIERS[position]).toBeDefined();
        expect(POSITION_TRAIT_MODIFIERS[position].positive).toBeDefined();
        expect(POSITION_TRAIT_MODIFIERS[position].negative).toBeDefined();
      }
    });
  });

  describe('generateHiddenTraits', () => {
    const allPositions = Object.values(Position);

    it('should generate valid hidden traits for all positions', () => {
      for (const position of allPositions) {
        for (let i = 0; i < 5; i++) {
          const traits = generateHiddenTraits(position);

          expect(Array.isArray(traits.positive)).toBe(true);
          expect(Array.isArray(traits.negative)).toBe(true);
          expect(Array.isArray(traits.revealedToUser)).toBe(true);
        }
      }
    });

    it('should generate 0-3 positive traits', () => {
      const positiveCounts: number[] = [];

      for (let i = 0; i < 200; i++) {
        const traits = generateHiddenTraits(Position.QB);
        positiveCounts.push(traits.positive.length);
      }

      expect(Math.max(...positiveCounts)).toBeLessThanOrEqual(3);
      expect(Math.min(...positiveCounts)).toBeGreaterThanOrEqual(0);

      // Should have some variety in counts
      const uniqueCounts = new Set(positiveCounts);
      expect(uniqueCounts.size).toBeGreaterThan(1);
    });

    it('should generate 0-2 negative traits', () => {
      const negativeCounts: number[] = [];

      for (let i = 0; i < 200; i++) {
        const traits = generateHiddenTraits(Position.WR);
        negativeCounts.push(traits.negative.length);
      }

      expect(Math.max(...negativeCounts)).toBeLessThanOrEqual(2);
      expect(Math.min(...negativeCounts)).toBeGreaterThanOrEqual(0);
    });

    it('should only include valid positive traits', () => {
      for (let i = 0; i < 100; i++) {
        const traits = generateHiddenTraits(Position.RB);
        for (const trait of traits.positive) {
          expect(ALL_POSITIVE_TRAITS).toContain(trait);
        }
      }
    });

    it('should only include valid negative traits', () => {
      for (let i = 0; i < 100; i++) {
        const traits = generateHiddenTraits(Position.CB);
        for (const trait of traits.negative) {
          expect(ALL_NEGATIVE_TRAITS).toContain(trait);
        }
      }
    });

    it('should not have duplicate traits', () => {
      for (let i = 0; i < 100; i++) {
        const traits = generateHiddenTraits(Position.TE);

        const uniquePositive = new Set(traits.positive);
        const uniqueNegative = new Set(traits.negative);

        expect(uniquePositive.size).toBe(traits.positive.length);
        expect(uniqueNegative.size).toBe(traits.negative.length);
      }
    });

    it('should always have empty revealedToUser array', () => {
      for (const position of allPositions) {
        for (let i = 0; i < 5; i++) {
          const traits = generateHiddenTraits(position);
          expect(traits.revealedToUser).toEqual([]);
        }
      }
    });

    it('should respect position modifiers', () => {
      // QBs should have more leaders
      let qbLeaders = 0;
      let rbLeaders = 0;

      for (let i = 0; i < 500; i++) {
        const qbTraits = generateHiddenTraits(Position.QB);
        const rbTraits = generateHiddenTraits(Position.RB);

        if (qbTraits.positive.includes('leader')) qbLeaders++;
        if (rbTraits.positive.includes('leader')) rbLeaders++;
      }

      // QB modifier is 2.0, RB has no modifier
      expect(qbLeaders).toBeGreaterThan(rbLeaders);
    });

    it('should respect position-specific trait tendencies', () => {
      // WRs should have more routeTechnician trait
      let wrRouteTechnicians = 0;
      let dtRouteTechnicians = 0;

      for (let i = 0; i < 500; i++) {
        const wrTraits = generateHiddenTraits(Position.WR);
        const dtTraits = generateHiddenTraits(Position.DT);

        if (wrTraits.positive.includes('routeTechnician')) wrRouteTechnicians++;
        if (dtTraits.positive.includes('routeTechnician')) dtRouteTechnicians++;
      }

      // WRs have 2.0 modifier for routeTechnician
      expect(wrRouteTechnicians).toBeGreaterThan(dtRouteTechnicians);
    });

    it('should apply correlation effects', () => {
      // Having clutch should increase coolUnderPressure probability
      // and decrease chokes probability
      // This is hard to test directly, but we can verify correlations exist

      let clutchAndCool = 0;
      let clutchAndChokes = 0;

      for (let i = 0; i < 1000; i++) {
        const traits = generateHiddenTraits(Position.QB);

        const hasClutch = traits.positive.includes('clutch');
        const hasCool = traits.positive.includes('coolUnderPressure');
        const hasChokes = traits.negative.includes('chokes');

        if (hasClutch && hasCool) clutchAndCool++;
        if (hasClutch && hasChokes) clutchAndChokes++;
      }

      // Clutch + coolUnderPressure should be more common than clutch + chokes
      // because of positive correlation between clutch and cool, negative with chokes
      expect(clutchAndCool).toBeGreaterThanOrEqual(clutchAndChokes);
    });
  });

  describe('getPositiveTraitCount', () => {
    it('should return correct count', () => {
      const traits: HiddenTraits = {
        positive: ['clutch', 'leader'],
        negative: ['lazy'],
        revealedToUser: [],
      };

      expect(getPositiveTraitCount(traits)).toBe(2);
    });
  });

  describe('getNegativeTraitCount', () => {
    it('should return correct count', () => {
      const traits: HiddenTraits = {
        positive: ['clutch'],
        negative: ['lazy', 'hotHead'],
        revealedToUser: [],
      };

      expect(getNegativeTraitCount(traits)).toBe(2);
    });
  });
});

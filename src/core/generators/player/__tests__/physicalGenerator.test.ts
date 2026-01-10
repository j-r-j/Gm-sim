import { Position } from '../../../models/player/Position';
import {
  validatePhysicalAttributes,
  PHYSICAL_ATTRIBUTE_RANGES,
} from '../../../models/player/PhysicalAttributes';
import { generatePhysicalAttributes, POSITION_PHYSICAL_PROFILES } from '../PhysicalGenerator';

describe('PhysicalGenerator', () => {
  describe('POSITION_PHYSICAL_PROFILES', () => {
    it('should have profiles for all positions', () => {
      const positions = Object.values(Position);
      for (const position of positions) {
        expect(POSITION_PHYSICAL_PROFILES[position]).toBeDefined();
      }
    });

    it('should have valid distribution parameters', () => {
      for (const profile of Object.values(POSITION_PHYSICAL_PROFILES)) {
        // Each attribute should have mean, stdDev, min, max
        for (const dist of Object.values(profile)) {
          expect(dist.mean).toBeGreaterThan(0);
          expect(dist.stdDev).toBeGreaterThan(0);
          expect(dist.min).toBeLessThanOrEqual(dist.mean);
          expect(dist.max).toBeGreaterThanOrEqual(dist.mean);
        }
      }
    });
  });

  describe('generatePhysicalAttributes', () => {
    const allPositions = Object.values(Position);

    it('should generate valid physical attributes for all positions', () => {
      for (const position of allPositions) {
        for (let i = 0; i < 5; i++) {
          const attrs = generatePhysicalAttributes(position);
          expect(validatePhysicalAttributes(attrs)).toBe(true);
        }
      }
    });

    it('should generate attributes within valid ranges', () => {
      for (const position of allPositions) {
        for (let i = 0; i < 5; i++) {
          const attrs = generatePhysicalAttributes(position);

          expect(attrs.height).toBeGreaterThanOrEqual(PHYSICAL_ATTRIBUTE_RANGES.height.min);
          expect(attrs.height).toBeLessThanOrEqual(PHYSICAL_ATTRIBUTE_RANGES.height.max);

          expect(attrs.weight).toBeGreaterThanOrEqual(PHYSICAL_ATTRIBUTE_RANGES.weight.min);
          expect(attrs.weight).toBeLessThanOrEqual(PHYSICAL_ATTRIBUTE_RANGES.weight.max);

          expect(attrs.armLength).toBeGreaterThanOrEqual(PHYSICAL_ATTRIBUTE_RANGES.armLength.min);
          expect(attrs.armLength).toBeLessThanOrEqual(PHYSICAL_ATTRIBUTE_RANGES.armLength.max);

          expect(attrs.handSize).toBeGreaterThanOrEqual(PHYSICAL_ATTRIBUTE_RANGES.handSize.min);
          expect(attrs.handSize).toBeLessThanOrEqual(PHYSICAL_ATTRIBUTE_RANGES.handSize.max);

          expect(attrs.wingspan).toBeGreaterThanOrEqual(PHYSICAL_ATTRIBUTE_RANGES.wingspan.min);
          expect(attrs.wingspan).toBeLessThanOrEqual(PHYSICAL_ATTRIBUTE_RANGES.wingspan.max);

          expect(attrs.speed).toBeGreaterThanOrEqual(PHYSICAL_ATTRIBUTE_RANGES.speed.min);
          expect(attrs.speed).toBeLessThanOrEqual(PHYSICAL_ATTRIBUTE_RANGES.speed.max);

          expect(attrs.acceleration).toBeGreaterThanOrEqual(
            PHYSICAL_ATTRIBUTE_RANGES.acceleration.min
          );
          expect(attrs.acceleration).toBeLessThanOrEqual(
            PHYSICAL_ATTRIBUTE_RANGES.acceleration.max
          );

          expect(attrs.agility).toBeGreaterThanOrEqual(PHYSICAL_ATTRIBUTE_RANGES.agility.min);
          expect(attrs.agility).toBeLessThanOrEqual(PHYSICAL_ATTRIBUTE_RANGES.agility.max);

          expect(attrs.strength).toBeGreaterThanOrEqual(PHYSICAL_ATTRIBUTE_RANGES.strength.min);
          expect(attrs.strength).toBeLessThanOrEqual(PHYSICAL_ATTRIBUTE_RANGES.strength.max);

          expect(attrs.verticalJump).toBeGreaterThanOrEqual(
            PHYSICAL_ATTRIBUTE_RANGES.verticalJump.min
          );
          expect(attrs.verticalJump).toBeLessThanOrEqual(
            PHYSICAL_ATTRIBUTE_RANGES.verticalJump.max
          );
        }
      }
    });

    it('should generate position-appropriate heights', () => {
      // Generate many samples to check distribution
      const qbHeights: number[] = [];
      const rbHeights: number[] = [];
      const olHeights: number[] = [];

      for (let i = 0; i < 100; i++) {
        qbHeights.push(generatePhysicalAttributes(Position.QB).height);
        rbHeights.push(generatePhysicalAttributes(Position.RB).height);
        olHeights.push(generatePhysicalAttributes(Position.LT).height);
      }

      const avgQB = qbHeights.reduce((a, b) => a + b, 0) / qbHeights.length;
      const avgRB = rbHeights.reduce((a, b) => a + b, 0) / rbHeights.length;
      const avgOL = olHeights.reduce((a, b) => a + b, 0) / olHeights.length;

      // OL should be tallest on average
      expect(avgOL).toBeGreaterThan(avgQB);
      // RBs should be shortest of these three
      expect(avgRB).toBeLessThan(avgQB);
    });

    it('should generate position-appropriate weights', () => {
      const rbWeights: number[] = [];
      const wrWeights: number[] = [];
      const dtWeights: number[] = [];

      for (let i = 0; i < 100; i++) {
        rbWeights.push(generatePhysicalAttributes(Position.RB).weight);
        wrWeights.push(generatePhysicalAttributes(Position.WR).weight);
        dtWeights.push(generatePhysicalAttributes(Position.DT).weight);
      }

      const avgRB = rbWeights.reduce((a, b) => a + b, 0) / rbWeights.length;
      const avgWR = wrWeights.reduce((a, b) => a + b, 0) / wrWeights.length;
      const avgDT = dtWeights.reduce((a, b) => a + b, 0) / dtWeights.length;

      // DT should be heaviest
      expect(avgDT).toBeGreaterThan(avgRB);
      expect(avgDT).toBeGreaterThan(avgWR);
    });

    it('should generate position-appropriate speed (40 time)', () => {
      const cbSpeeds: number[] = [];
      const olSpeeds: number[] = [];

      for (let i = 0; i < 100; i++) {
        cbSpeeds.push(generatePhysicalAttributes(Position.CB).speed);
        olSpeeds.push(generatePhysicalAttributes(Position.C).speed);
      }

      const avgCB = cbSpeeds.reduce((a, b) => a + b, 0) / cbSpeeds.length;
      const avgOL = olSpeeds.reduce((a, b) => a + b, 0) / olSpeeds.length;

      // CBs should be faster (lower 40 time) than OL
      expect(avgCB).toBeLessThan(avgOL);
    });

    describe('QB hand size', () => {
      it('should generate QB hand sizes in realistic range', () => {
        const handSizes: number[] = [];
        for (let i = 0; i < 100; i++) {
          handSizes.push(generatePhysicalAttributes(Position.QB).handSize);
        }

        const avg = handSizes.reduce((a, b) => a + b, 0) / handSizes.length;
        const min = Math.min(...handSizes);
        const max = Math.max(...handSizes);

        // QB hand size typically 9-10.5 inches
        expect(avg).toBeGreaterThan(9);
        expect(avg).toBeLessThan(10.5);
        expect(min).toBeGreaterThanOrEqual(8.5);
        expect(max).toBeLessThanOrEqual(10.5);
      });
    });

    it('should generate integer values for height, weight, and athletic ratings', () => {
      for (let i = 0; i < 20; i++) {
        const attrs = generatePhysicalAttributes(Position.QB);
        expect(Number.isInteger(attrs.height)).toBe(true);
        expect(Number.isInteger(attrs.weight)).toBe(true);
        expect(Number.isInteger(attrs.acceleration)).toBe(true);
        expect(Number.isInteger(attrs.agility)).toBe(true);
        expect(Number.isInteger(attrs.strength)).toBe(true);
        expect(Number.isInteger(attrs.verticalJump)).toBe(true);
      }
    });

    it('should generate properly formatted decimal values', () => {
      for (let i = 0; i < 20; i++) {
        const attrs = generatePhysicalAttributes(Position.WR);

        // Speed should have 2 decimal places
        const speedDecimals = (attrs.speed.toString().split('.')[1] || '').length;
        expect(speedDecimals).toBeLessThanOrEqual(2);

        // Arm length and hand size should have 1 decimal place
        const armDecimals = (attrs.armLength.toString().split('.')[1] || '').length;
        const handDecimals = (attrs.handSize.toString().split('.')[1] || '').length;
        expect(armDecimals).toBeLessThanOrEqual(1);
        expect(handDecimals).toBeLessThanOrEqual(1);
      }
    });
  });
});

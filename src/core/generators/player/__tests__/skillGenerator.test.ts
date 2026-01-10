import { Position } from '../../../models/player/Position';
import {
  validateSkillValue,
  SKILL_NAMES_BY_POSITION,
} from '../../../models/player/TechnicalSkills';
import {
  generateSkillValue,
  generateSkillsForPosition,
  calculateRangeWidth,
  createPerceivedRange,
  getAverageTrueSkillValue,
} from '../SkillGenerator';

describe('SkillGenerator', () => {
  describe('calculateRangeWidth', () => {
    it('should return 0 for 0 years until maturity', () => {
      expect(calculateRangeWidth(0)).toBe(0);
    });

    it('should return wider ranges for more years until maturity', () => {
      expect(calculateRangeWidth(1)).toBe(3);
      expect(calculateRangeWidth(2)).toBe(6);
      expect(calculateRangeWidth(3)).toBe(9);
      expect(calculateRangeWidth(4)).toBe(12);
      expect(calculateRangeWidth(5)).toBe(15);
    });

    it('should cap at 16', () => {
      expect(calculateRangeWidth(6)).toBe(16);
      expect(calculateRangeWidth(10)).toBe(16);
    });

    it('should handle negative years (already past maturity)', () => {
      expect(calculateRangeWidth(-1)).toBe(0);
    });
  });

  describe('createPerceivedRange', () => {
    it('should return true value when range width is 0', () => {
      const result = createPerceivedRange(75, 0);
      expect(result.perceivedMin).toBe(75);
      expect(result.perceivedMax).toBe(75);
    });

    it('should create a range containing the true value most of the time', () => {
      let containsTrue = 0;
      const trueValue = 60;

      for (let i = 0; i < 100; i++) {
        const { perceivedMin, perceivedMax } = createPerceivedRange(trueValue, 12);
        if (perceivedMin <= trueValue && trueValue <= perceivedMax) {
          containsTrue++;
        }
      }

      // Should contain true value most of the time (allow for scout error)
      expect(containsTrue).toBeGreaterThan(80);
    });

    it('should clamp values to 1-100 range', () => {
      // Test near lower bound
      for (let i = 0; i < 20; i++) {
        const { perceivedMin, perceivedMax } = createPerceivedRange(5, 16);
        expect(perceivedMin).toBeGreaterThanOrEqual(1);
        expect(perceivedMax).toBeLessThanOrEqual(100);
      }

      // Test near upper bound
      for (let i = 0; i < 20; i++) {
        const { perceivedMin, perceivedMax } = createPerceivedRange(95, 16);
        expect(perceivedMin).toBeGreaterThanOrEqual(1);
        expect(perceivedMax).toBeLessThanOrEqual(100);
      }
    });

    it('should ensure min <= max', () => {
      for (let i = 0; i < 50; i++) {
        const { perceivedMin, perceivedMax } = createPerceivedRange(50, 12);
        expect(perceivedMin).toBeLessThanOrEqual(perceivedMax);
      }
    });
  });

  describe('generateSkillValue', () => {
    const distribution = { mean: 55, stdDev: 15 };

    it('should generate valid skill values', () => {
      for (let i = 0; i < 50; i++) {
        const skill = generateSkillValue(distribution, 23, 27);
        expect(validateSkillValue(skill)).toBe(true);
      }
    });

    it('should have trueValue within 1-100', () => {
      for (let i = 0; i < 50; i++) {
        const skill = generateSkillValue(distribution, 23, 27);
        expect(skill.trueValue).toBeGreaterThanOrEqual(1);
        expect(skill.trueValue).toBeLessThanOrEqual(100);
      }
    });

    it('should have perceived range contain true value (usually)', () => {
      let containsTrue = 0;

      for (let i = 0; i < 100; i++) {
        const skill = generateSkillValue(distribution, 23, 27);
        if (skill.perceivedMin <= skill.trueValue && skill.trueValue <= skill.perceivedMax) {
          containsTrue++;
        }
      }

      expect(containsTrue).toBeGreaterThan(80);
    });

    it('should have narrower range for older players', () => {
      const youngRanges: number[] = [];
      const oldRanges: number[] = [];

      for (let i = 0; i < 50; i++) {
        const youngSkill = generateSkillValue(distribution, 22, 27);
        const oldSkill = generateSkillValue(distribution, 27, 27);

        youngRanges.push(youngSkill.perceivedMax - youngSkill.perceivedMin);
        oldRanges.push(oldSkill.perceivedMax - oldSkill.perceivedMin);
      }

      const avgYoung = youngRanges.reduce((a, b) => a + b, 0) / youngRanges.length;
      const avgOld = oldRanges.reduce((a, b) => a + b, 0) / oldRanges.length;

      // Older players should have narrower ranges
      expect(avgOld).toBeLessThan(avgYoung);
    });

    it('should set maturity age correctly', () => {
      const skill = generateSkillValue(distribution, 23, 28);
      expect(skill.maturityAge).toBe(28);
    });
  });

  describe('generateSkillsForPosition', () => {
    const allPositions = Object.values(Position);

    it('should generate skills for all positions', () => {
      for (const position of allPositions) {
        const skills = generateSkillsForPosition(position, 25);
        expect(Object.keys(skills).length).toBeGreaterThan(0);
      }
    });

    it('should generate all required skills for each position', () => {
      const positionGroups = {
        QB: [Position.QB],
        RB: [Position.RB],
        WR: [Position.WR],
        TE: [Position.TE],
        OL: [Position.LT, Position.LG, Position.C, Position.RG, Position.RT],
        DL: [Position.DE, Position.DT],
        LB: [Position.OLB, Position.ILB],
        DB: [Position.CB, Position.FS, Position.SS],
        K: [Position.K],
        P: [Position.P],
      };

      for (const [group, positions] of Object.entries(positionGroups)) {
        const requiredSkills =
          SKILL_NAMES_BY_POSITION[group as keyof typeof SKILL_NAMES_BY_POSITION];

        for (const position of positions) {
          const skills = generateSkillsForPosition(position, 25);

          for (const skillName of requiredSkills) {
            expect(skills[skillName]).toBeDefined();
            expect(validateSkillValue(skills[skillName])).toBe(true);
          }
        }
      }
    });

    it('should generate valid skill values for all skills', () => {
      for (const position of allPositions) {
        const skills = generateSkillsForPosition(position, 25);

        for (const skill of Object.values(skills)) {
          expect(skill.trueValue).toBeGreaterThanOrEqual(1);
          expect(skill.trueValue).toBeLessThanOrEqual(100);
          expect(skill.perceivedMin).toBeGreaterThanOrEqual(1);
          expect(skill.perceivedMax).toBeLessThanOrEqual(100);
          expect(skill.perceivedMin).toBeLessThanOrEqual(skill.perceivedMax);
        }
      }
    });

    it('should respect skill tier modifiers', () => {
      const eliteSkills: number[] = [];
      const fringeSkills: number[] = [];

      for (let i = 0; i < 30; i++) {
        const elite = generateSkillsForPosition(Position.QB, 25, 'elite');
        const fringe = generateSkillsForPosition(Position.QB, 25, 'fringe');

        eliteSkills.push(getAverageTrueSkillValue(elite));
        fringeSkills.push(getAverageTrueSkillValue(fringe));
      }

      const avgElite = eliteSkills.reduce((a, b) => a + b, 0) / eliteSkills.length;
      const avgFringe = fringeSkills.reduce((a, b) => a + b, 0) / fringeSkills.length;

      expect(avgElite).toBeGreaterThan(avgFringe);
      expect(avgElite - avgFringe).toBeGreaterThan(20);
    });
  });

  describe('getAverageTrueSkillValue', () => {
    it('should return the average of all true values', () => {
      const skills = {
        skill1: { trueValue: 60, perceivedMin: 55, perceivedMax: 65, maturityAge: 27 },
        skill2: { trueValue: 80, perceivedMin: 75, perceivedMax: 85, maturityAge: 27 },
        skill3: { trueValue: 40, perceivedMin: 35, perceivedMax: 45, maturityAge: 27 },
      };

      expect(getAverageTrueSkillValue(skills)).toBe(60);
    });

    it('should return 50 for empty skills', () => {
      expect(getAverageTrueSkillValue({})).toBe(50);
    });
  });

  describe('trueValue is not exposed', () => {
    it('should have trueValue as a property but not in a way that exposes it to UI', () => {
      const skills = generateSkillsForPosition(Position.QB, 23);

      // The skill object DOES contain trueValue (for engine use)
      for (const skill of Object.values(skills)) {
        expect(skill.trueValue).toBeDefined();
      }

      // But when serialized for UI (via view model), it should be stripped
      // This test just confirms the structure - actual UI exposure is tested in privacy tests
    });
  });
});

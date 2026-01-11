/**
 * Tests for Scheme Definitions
 */

import {
  OFFENSIVE_SCHEME_DEFINITIONS,
  DEFENSIVE_SCHEME_DEFINITIONS,
  WEST_COAST_OFFENSE,
  AIR_RAID_OFFENSE,
  SPREAD_OPTION_OFFENSE,
  POWER_RUN_OFFENSE,
  ZONE_RUN_OFFENSE,
  PLAY_ACTION_OFFENSE,
  FOUR_THREE_UNDER_DEFENSE,
  THREE_FOUR_DEFENSE,
  COVER_THREE_DEFENSE,
  COVER_TWO_DEFENSE,
  MAN_PRESS_DEFENSE,
  BLITZ_HEAVY_DEFENSE,
  getOffensiveSchemeDefinition,
  getDefensiveSchemeDefinition,
  isOffensiveScheme,
  isDefensiveScheme,
  getSchemeDisplayName,
  getSchemeDescription,
  getOffensiveSchemeCounters,
  getDefensiveSchemeCounters,
  getSchemeStrengths,
  getSchemeWeaknesses,
  validatePlayCallDistribution,
  validateDefensivePlayCallDistribution,
} from '../SchemeDefinitions';
import { ALL_OFFENSIVE_SCHEMES, ALL_DEFENSIVE_SCHEMES } from '../../models/player/SchemeFit';

describe('Scheme Definitions', () => {
  describe('Offensive Scheme Constants', () => {
    it('should define all 6 offensive schemes', () => {
      expect(Object.keys(OFFENSIVE_SCHEME_DEFINITIONS)).toHaveLength(6);
    });

    it('should have West Coast offense with correct properties', () => {
      expect(WEST_COAST_OFFENSE.id).toBe('westCoast');
      expect(WEST_COAST_OFFENSE.name).toBe('West Coast Offense');
      expect(WEST_COAST_OFFENSE.requirements.length).toBeGreaterThan(0);
      expect(WEST_COAST_OFFENSE.tendencies.runPercentage).toBeDefined();
    });

    it('should have Air Raid offense with correct properties', () => {
      expect(AIR_RAID_OFFENSE.id).toBe('airRaid');
      expect(AIR_RAID_OFFENSE.name).toBe('Air Raid Offense');
      expect(AIR_RAID_OFFENSE.tendencies.deepPassPercentage).toBeGreaterThan(
        WEST_COAST_OFFENSE.tendencies.deepPassPercentage
      );
    });

    it('should have Spread Option offense with correct properties', () => {
      expect(SPREAD_OPTION_OFFENSE.id).toBe('spreadOption');
      expect(SPREAD_OPTION_OFFENSE.requirements.some((r) => r.position === 'QB')).toBe(true);
    });

    it('should have Power Run offense with correct properties', () => {
      expect(POWER_RUN_OFFENSE.id).toBe('powerRun');
      expect(POWER_RUN_OFFENSE.tendencies.runPercentage).toBeGreaterThan(50);
    });

    it('should have Zone Run offense with correct properties', () => {
      expect(ZONE_RUN_OFFENSE.id).toBe('zoneRun');
      expect(ZONE_RUN_OFFENSE.tendencies.runPercentage).toBeGreaterThan(50);
    });

    it('should have Play Action offense with correct properties', () => {
      expect(PLAY_ACTION_OFFENSE.id).toBe('playAction');
      expect(PLAY_ACTION_OFFENSE.tendencies.playActionPercentage).toBeGreaterThan(40);
    });
  });

  describe('Defensive Scheme Constants', () => {
    it('should define all 6 defensive schemes', () => {
      expect(Object.keys(DEFENSIVE_SCHEME_DEFINITIONS)).toHaveLength(6);
    });

    it('should have 4-3 Under defense with correct properties', () => {
      expect(FOUR_THREE_UNDER_DEFENSE.id).toBe('fourThreeUnder');
      expect(FOUR_THREE_UNDER_DEFENSE.name).toBe('4-3 Under Defense');
    });

    it('should have 3-4 defense with correct properties', () => {
      expect(THREE_FOUR_DEFENSE.id).toBe('threeFour');
      expect(THREE_FOUR_DEFENSE.tendencies.blitzPercentage).toBeGreaterThan(
        FOUR_THREE_UNDER_DEFENSE.tendencies.blitzPercentage
      );
    });

    it('should have Cover 3 defense with correct properties', () => {
      expect(COVER_THREE_DEFENSE.id).toBe('coverThree');
      expect(COVER_THREE_DEFENSE.tendencies.singleHighPercentage).toBeGreaterThan(70);
    });

    it('should have Cover 2 defense with correct properties', () => {
      expect(COVER_TWO_DEFENSE.id).toBe('coverTwo');
      expect(COVER_TWO_DEFENSE.tendencies.twoDeepPercentage).toBeGreaterThan(70);
    });

    it('should have Man Press defense with correct properties', () => {
      expect(MAN_PRESS_DEFENSE.id).toBe('manPress');
      expect(MAN_PRESS_DEFENSE.tendencies.manPercentage).toBeGreaterThan(70);
    });

    it('should have Blitz Heavy defense with correct properties', () => {
      expect(BLITZ_HEAVY_DEFENSE.id).toBe('blitzHeavy');
      expect(BLITZ_HEAVY_DEFENSE.tendencies.blitzPercentage).toBeGreaterThan(40);
    });
  });

  describe('getOffensiveSchemeDefinition', () => {
    it('should return correct definition for each offensive scheme', () => {
      for (const scheme of ALL_OFFENSIVE_SCHEMES) {
        const definition = getOffensiveSchemeDefinition(scheme);
        expect(definition.id).toBe(scheme);
        expect(definition.name).toBeDefined();
        expect(definition.description).toBeDefined();
      }
    });
  });

  describe('getDefensiveSchemeDefinition', () => {
    it('should return correct definition for each defensive scheme', () => {
      for (const scheme of ALL_DEFENSIVE_SCHEMES) {
        const definition = getDefensiveSchemeDefinition(scheme);
        expect(definition.id).toBe(scheme);
        expect(definition.name).toBeDefined();
        expect(definition.description).toBeDefined();
      }
    });
  });

  describe('isOffensiveScheme', () => {
    it('should return true for offensive schemes', () => {
      expect(isOffensiveScheme('westCoast')).toBe(true);
      expect(isOffensiveScheme('airRaid')).toBe(true);
      expect(isOffensiveScheme('spreadOption')).toBe(true);
    });

    it('should return false for defensive schemes', () => {
      expect(isOffensiveScheme('fourThreeUnder')).toBe(false);
      expect(isOffensiveScheme('threeFour')).toBe(false);
    });
  });

  describe('isDefensiveScheme', () => {
    it('should return true for defensive schemes', () => {
      expect(isDefensiveScheme('fourThreeUnder')).toBe(true);
      expect(isDefensiveScheme('coverThree')).toBe(true);
      expect(isDefensiveScheme('blitzHeavy')).toBe(true);
    });

    it('should return false for offensive schemes', () => {
      expect(isDefensiveScheme('westCoast')).toBe(false);
      expect(isDefensiveScheme('powerRun')).toBe(false);
    });
  });

  describe('getSchemeDisplayName', () => {
    it('should return display name for offensive schemes', () => {
      expect(getSchemeDisplayName('westCoast')).toBe('West Coast Offense');
      expect(getSchemeDisplayName('airRaid')).toBe('Air Raid Offense');
    });

    it('should return display name for defensive schemes', () => {
      expect(getSchemeDisplayName('fourThreeUnder')).toBe('4-3 Under Defense');
      expect(getSchemeDisplayName('coverTwo')).toBe('Cover 2 Defense');
    });
  });

  describe('getSchemeDescription', () => {
    it('should return description for offensive schemes', () => {
      const description = getSchemeDescription('westCoast');
      expect(description).toContain('pass');
    });

    it('should return description for defensive schemes', () => {
      const description = getSchemeDescription('blitzHeavy');
      expect(description).toContain('blitz');
    });
  });

  describe('getOffensiveSchemeCounters', () => {
    it('should return defensive schemes that counter offensive scheme', () => {
      const counters = getOffensiveSchemeCounters('westCoast');
      expect(counters.length).toBeGreaterThan(0);
      expect(ALL_DEFENSIVE_SCHEMES).toEqual(expect.arrayContaining(counters));
    });
  });

  describe('getDefensiveSchemeCounters', () => {
    it('should return offensive schemes that counter defensive scheme', () => {
      const counters = getDefensiveSchemeCounters('coverThree');
      expect(counters.length).toBeGreaterThan(0);
      expect(ALL_OFFENSIVE_SCHEMES).toEqual(expect.arrayContaining(counters));
    });
  });

  describe('getSchemeStrengths', () => {
    it('should return strengths for offensive schemes', () => {
      const strengths = getSchemeStrengths('airRaid');
      expect(strengths.length).toBeGreaterThan(0);
    });

    it('should return strengths for defensive schemes', () => {
      const strengths = getSchemeStrengths('manPress');
      expect(strengths.length).toBeGreaterThan(0);
    });
  });

  describe('getSchemeWeaknesses', () => {
    it('should return weaknesses for offensive schemes', () => {
      const weaknesses = getSchemeWeaknesses('powerRun');
      expect(weaknesses.length).toBeGreaterThan(0);
    });

    it('should return weaknesses for defensive schemes', () => {
      const weaknesses = getSchemeWeaknesses('blitzHeavy');
      expect(weaknesses.length).toBeGreaterThan(0);
    });
  });

  describe('validatePlayCallDistribution', () => {
    it('should validate correct play call distribution', () => {
      const valid = {
        runPercentage: 40,
        shortPassPercentage: 30,
        mediumPassPercentage: 20,
        deepPassPercentage: 10,
        playActionPercentage: 25,
        screenPercentage: 10,
      };
      expect(validatePlayCallDistribution(valid)).toBe(true);
    });

    it('should reject distribution that does not sum to 100', () => {
      const invalid = {
        runPercentage: 50,
        shortPassPercentage: 30,
        mediumPassPercentage: 20,
        deepPassPercentage: 20, // Sum = 120
        playActionPercentage: 25,
        screenPercentage: 10,
      };
      expect(validatePlayCallDistribution(invalid)).toBe(false);
    });

    it('should reject negative percentages', () => {
      const invalid = {
        runPercentage: -10,
        shortPassPercentage: 50,
        mediumPassPercentage: 30,
        deepPassPercentage: 30,
        playActionPercentage: 25,
        screenPercentage: 10,
      };
      expect(validatePlayCallDistribution(invalid)).toBe(false);
    });
  });

  describe('validateDefensivePlayCallDistribution', () => {
    it('should validate correct defensive distribution', () => {
      const valid = {
        basePercentage: 55,
        blitzPercentage: 25,
        zonePercentage: 50,
        manPercentage: 50,
        pressPercentage: 30,
        twoDeepPercentage: 40,
        singleHighPercentage: 60,
      };
      expect(validateDefensivePlayCallDistribution(valid)).toBe(true);
    });

    it('should reject when zone + man does not equal 100', () => {
      const invalid = {
        basePercentage: 55,
        blitzPercentage: 25,
        zonePercentage: 60,
        manPercentage: 60, // Sum = 120
        pressPercentage: 30,
        twoDeepPercentage: 40,
        singleHighPercentage: 60,
      };
      expect(validateDefensivePlayCallDistribution(invalid)).toBe(false);
    });

    it('should reject when deep coverage does not equal 100', () => {
      const invalid = {
        basePercentage: 55,
        blitzPercentage: 25,
        zonePercentage: 50,
        manPercentage: 50,
        pressPercentage: 30,
        twoDeepPercentage: 30,
        singleHighPercentage: 30, // Sum = 60
      };
      expect(validateDefensivePlayCallDistribution(invalid)).toBe(false);
    });
  });

  describe('Scheme Requirements', () => {
    it('should have valid skill requirements for all schemes', () => {
      for (const scheme of ALL_OFFENSIVE_SCHEMES) {
        const definition = getOffensiveSchemeDefinition(scheme);
        for (const req of definition.requirements) {
          expect(req.position).toBeDefined();
          expect(req.skills.length).toBeGreaterThan(0);
          expect(req.weight).toBeGreaterThan(0);
          expect(req.weight).toBeLessThanOrEqual(1);

          for (const skill of req.skills) {
            expect(skill.skillName).toBeDefined();
            expect(['critical', 'important', 'beneficial']).toContain(skill.importance);
            expect(skill.minimumValue).toBeGreaterThanOrEqual(1);
            expect(skill.minimumValue).toBeLessThanOrEqual(100);
          }
        }
      }
    });

    it('should have valid skill requirements for all defensive schemes', () => {
      for (const scheme of ALL_DEFENSIVE_SCHEMES) {
        const definition = getDefensiveSchemeDefinition(scheme);
        for (const req of definition.requirements) {
          expect(req.position).toBeDefined();
          expect(req.skills.length).toBeGreaterThan(0);
          expect(req.weight).toBeGreaterThan(0);
          expect(req.weight).toBeLessThanOrEqual(1);
        }
      }
    });
  });
});

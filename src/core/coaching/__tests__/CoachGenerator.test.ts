/**
 * Tests for CoachGenerator
 */

import {
  generateCoachAttributes,
  generateCoachingTree,
  generateCoachPersonality,
  generateCoach,
  generateCoachingStaff,
  generateRandomReputationTier,
  getSchemeForRole,
} from '../CoachGenerator';
import { ReputationTier } from '../../models/staff/CoachAttributes';
import { ALL_TREE_NAMES } from '../../models/staff/CoachingTree';
import { ALL_PERSONALITY_TYPES } from '../../models/staff/CoachPersonality';
import { ALL_OFFENSIVE_SCHEMES, ALL_DEFENSIVE_SCHEMES } from '../../models/player/SchemeFit';

describe('CoachGenerator', () => {
  describe('generateRandomReputationTier', () => {
    it('should return a valid reputation tier', () => {
      const validTiers: ReputationTier[] = [
        'legendary',
        'elite',
        'established',
        'rising',
        'unknown',
      ];

      for (let i = 0; i < 100; i++) {
        const tier = generateRandomReputationTier();
        expect(validTiers).toContain(tier);
      }
    });
  });

  describe('generateCoachAttributes', () => {
    it('should generate attributes within valid ranges', () => {
      const tiers: ReputationTier[] = ['legendary', 'elite', 'established', 'rising', 'unknown'];

      for (const tier of tiers) {
        const attrs = generateCoachAttributes(tier);

        // All skill attributes should be 1-99
        expect(attrs.development).toBeGreaterThanOrEqual(1);
        expect(attrs.development).toBeLessThanOrEqual(99);
        expect(attrs.gameDayIQ).toBeGreaterThanOrEqual(1);
        expect(attrs.gameDayIQ).toBeLessThanOrEqual(99);
        expect(attrs.schemeTeaching).toBeGreaterThanOrEqual(1);
        expect(attrs.schemeTeaching).toBeLessThanOrEqual(99);
        expect(attrs.playerEvaluation).toBeGreaterThanOrEqual(1);
        expect(attrs.playerEvaluation).toBeLessThanOrEqual(99);
        expect(attrs.talentID).toBeGreaterThanOrEqual(1);
        expect(attrs.talentID).toBeLessThanOrEqual(99);
        expect(attrs.motivation).toBeGreaterThanOrEqual(1);
        expect(attrs.motivation).toBeLessThanOrEqual(99);
        expect(attrs.reputation).toBeGreaterThanOrEqual(1);
        expect(attrs.reputation).toBeLessThanOrEqual(99);

        // Experience should be positive
        expect(attrs.yearsExperience).toBeGreaterThan(0);

        // Age should be reasonable
        expect(attrs.age).toBeGreaterThanOrEqual(30);
        expect(attrs.age).toBeLessThanOrEqual(75);
      }
    });

    it('should generate higher attributes for elite tiers', () => {
      // Generate multiple samples to account for randomness
      const eliteAttrs = Array.from({ length: 20 }, () => generateCoachAttributes('elite'));
      const unknownAttrs = Array.from({ length: 20 }, () => generateCoachAttributes('unknown'));

      const avgElite = eliteAttrs.reduce((sum, a) => sum + a.development, 0) / eliteAttrs.length;
      const avgUnknown =
        unknownAttrs.reduce((sum, a) => sum + a.development, 0) / unknownAttrs.length;

      // Elite should be significantly higher on average
      expect(avgElite).toBeGreaterThan(avgUnknown);
    });

    it('should respect provided experience and age', () => {
      const attrs = generateCoachAttributes('established', 15, 50);
      expect(attrs.yearsExperience).toBe(15);
      expect(attrs.age).toBe(50);
    });
  });

  describe('generateCoachingTree', () => {
    it('should generate valid coaching trees', () => {
      for (let i = 0; i < 50; i++) {
        const tree = generateCoachingTree();

        expect(ALL_TREE_NAMES).toContain(tree.treeName);
        expect([1, 2, 3, 4]).toContain(tree.generation);
        expect(['conservative', 'balanced', 'aggressive']).toContain(tree.philosophy.riskTolerance);
        expect(tree.philosophy.offensiveTendency).toBeTruthy();
        expect(tree.philosophy.defensiveTendency).toBeTruthy();
      }
    });

    it('should respect specified tree name', () => {
      const tree = generateCoachingTree('belichick');
      expect(tree.treeName).toBe('belichick');
    });
  });

  describe('generateCoachPersonality', () => {
    it('should generate valid personalities', () => {
      for (let i = 0; i < 50; i++) {
        const personality = generateCoachPersonality();

        expect(ALL_PERSONALITY_TYPES).toContain(personality.primary);
        if (personality.secondary) {
          expect(ALL_PERSONALITY_TYPES).toContain(personality.secondary);
        }
        expect(personality.ego).toBeGreaterThanOrEqual(20);
        expect(personality.ego).toBeLessThanOrEqual(90);
        expect(personality.adaptability).toBeGreaterThanOrEqual(30);
        expect(personality.adaptability).toBeLessThanOrEqual(85);
      }
    });

    it('should respect specified primary personality', () => {
      const personality = generateCoachPersonality('aggressive');
      expect(personality.primary).toBe('aggressive');
    });
  });

  describe('getSchemeForRole', () => {
    it('should return offensive scheme for head coach', () => {
      for (let i = 0; i < 20; i++) {
        const scheme = getSchemeForRole('headCoach');
        expect(ALL_OFFENSIVE_SCHEMES).toContain(scheme);
      }
    });

    it('should return offensive scheme for offensive coordinator', () => {
      for (let i = 0; i < 20; i++) {
        const scheme = getSchemeForRole('offensiveCoordinator');
        expect(ALL_OFFENSIVE_SCHEMES).toContain(scheme);
      }
    });

    it('should return defensive scheme for defensive coordinator', () => {
      for (let i = 0; i < 20; i++) {
        const scheme = getSchemeForRole('defensiveCoordinator');
        expect(ALL_DEFENSIVE_SCHEMES).toContain(scheme);
      }
    });

    it('should respect specific scheme when provided', () => {
      const scheme = getSchemeForRole('headCoach', 'airRaid');
      expect(scheme).toBe('airRaid');
    });
  });

  describe('generateCoach', () => {
    it('should generate a complete coach with all required fields', () => {
      const coach = generateCoach('headCoach', 'team-buf', 2025);

      expect(coach.id).toBeTruthy();
      expect(coach.firstName).toBeTruthy();
      expect(coach.lastName).toBeTruthy();
      expect(coach.role).toBe('headCoach');
      expect(coach.teamId).toBe('team-buf');
      expect(coach.scheme).toBeTruthy();
      expect(coach.tree).toBeTruthy();
      expect(coach.personality).toBeTruthy();
      expect(coach.attributes).toBeTruthy();
      expect(coach.contract).toBeTruthy();
      expect(coach.isAvailable).toBe(false);
    });

    it('should set isAvailable to true when no team assigned', () => {
      const coach = generateCoach('headCoach', null, 2025);
      expect(coach.isAvailable).toBe(true);
      expect(coach.contract).toBeNull();
    });

    it('should generate varied attributes (not all 50)', () => {
      const coaches = Array.from({ length: 10 }, () =>
        generateCoach('headCoach', 'team-buf', 2025)
      );

      // Check that attributes are varied
      const developments = coaches.map((c) => c.attributes.development);
      const uniqueDevelopments = new Set(developments);

      // Should have multiple different values
      expect(uniqueDevelopments.size).toBeGreaterThan(1);

      // Should not all be 50
      const all50 = developments.every((d) => d === 50);
      expect(all50).toBe(false);
    });

    it('should assign valid schemes based on role', () => {
      const hc = generateCoach('headCoach', 'team-buf', 2025);
      const oc = generateCoach('offensiveCoordinator', 'team-buf', 2025);
      const dc = generateCoach('defensiveCoordinator', 'team-buf', 2025);

      expect(ALL_OFFENSIVE_SCHEMES).toContain(hc.scheme);
      expect(ALL_OFFENSIVE_SCHEMES).toContain(oc.scheme);
      expect(ALL_DEFENSIVE_SCHEMES).toContain(dc.scheme);
    });
  });

  describe('generateCoachingStaff', () => {
    it('should generate all three coaching positions', () => {
      const staff = generateCoachingStaff('team-buf', 2025);

      expect(staff.headCoach).toBeTruthy();
      expect(staff.offensiveCoordinator).toBeTruthy();
      expect(staff.defensiveCoordinator).toBeTruthy();

      expect(staff.headCoach.role).toBe('headCoach');
      expect(staff.offensiveCoordinator.role).toBe('offensiveCoordinator');
      expect(staff.defensiveCoordinator.role).toBe('defensiveCoordinator');

      // All should be assigned to the same team
      expect(staff.headCoach.teamId).toBe('team-buf');
      expect(staff.offensiveCoordinator.teamId).toBe('team-buf');
      expect(staff.defensiveCoordinator.teamId).toBe('team-buf');
    });

    it('should generate unique coaches', () => {
      const staff = generateCoachingStaff('team-buf', 2025);

      expect(staff.headCoach.id).not.toBe(staff.offensiveCoordinator.id);
      expect(staff.headCoach.id).not.toBe(staff.defensiveCoordinator.id);
      expect(staff.offensiveCoordinator.id).not.toBe(staff.defensiveCoordinator.id);
    });
  });
});

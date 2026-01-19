/**
 * Tests for CoachWriteupGenerator
 */

import {
  generateCoachWriteup,
  generateCoachSummary,
  generateCoachStrengths,
  generateCoachWeaknesses,
  getSchemeDisplayName,
  getTreeDisplayName,
  getPersonalityDisplayName,
  getReputationDisplayName,
} from '../CoachWriteupGenerator';
import { generateCoach } from '../CoachGenerator';
import { ALL_OFFENSIVE_SCHEMES, ALL_DEFENSIVE_SCHEMES } from '../../models/player/SchemeFit';
import { ALL_TREE_NAMES } from '../../models/staff/CoachingTree';
import { ALL_PERSONALITY_TYPES } from '../../models/staff/CoachPersonality';
import { ReputationTier } from '../../models/staff/CoachAttributes';

describe('CoachWriteupGenerator', () => {
  describe('generateCoachWriteup', () => {
    it('should generate non-empty writeup for any coach', () => {
      // Test with various coach configurations
      for (let i = 0; i < 20; i++) {
        const coach = generateCoach('headCoach', 'team-buf', 2025);
        const writeup = generateCoachWriteup(coach);

        expect(writeup).toBeTruthy();
        expect(writeup.length).toBeGreaterThan(50);
      }
    });

    it('should generate writeups for all roles', () => {
      const hc = generateCoach('headCoach', 'team-buf', 2025);
      const oc = generateCoach('offensiveCoordinator', 'team-buf', 2025);
      const dc = generateCoach('defensiveCoordinator', 'team-buf', 2025);

      expect(generateCoachWriteup(hc).length).toBeGreaterThan(50);
      expect(generateCoachWriteup(oc).length).toBeGreaterThan(50);
      expect(generateCoachWriteup(dc).length).toBeGreaterThan(50);
    });

    it('should include content related to coaching tree', () => {
      // Generate coaches with specific trees and check if tree-related content appears
      const coach = generateCoach('headCoach', 'team-buf', 2025, {
        treeName: 'belichick',
      });
      const writeup = generateCoachWriteup(coach);

      // Should mention Belichick-related concepts (all possible terms from TREE_NARRATIVES.belichick)
      const belichickTerms = [
        'belichick',
        'adaptable',
        'situational',
        'game-plan',
        'do your job',
        'outscheme',
        'meticulous',
        'preparation',
      ];
      const hasBelichickContent = belichickTerms.some((term) =>
        writeup.toLowerCase().includes(term.toLowerCase())
      );
      expect(hasBelichickContent).toBe(true);
    });
  });

  describe('generateCoachSummary', () => {
    it('should generate concise summary', () => {
      const coach = generateCoach('headCoach', 'team-buf', 2025);
      const summary = generateCoachSummary(coach);

      expect(summary).toBeTruthy();
      expect(summary.length).toBeGreaterThan(20);
      // Summary should be shorter than full writeup
      expect(summary.length).toBeLessThan(500);
    });
  });

  describe('generateCoachStrengths', () => {
    it('should return array of strengths', () => {
      const coach = generateCoach('headCoach', 'team-buf', 2025);
      const strengths = generateCoachStrengths(coach);

      expect(Array.isArray(strengths)).toBe(true);
      expect(strengths.length).toBeGreaterThanOrEqual(2);
      expect(strengths.length).toBeLessThanOrEqual(4);

      for (const strength of strengths) {
        expect(typeof strength).toBe('string');
        expect(strength.length).toBeGreaterThan(0);
      }
    });

    it('should include attribute-based strengths for high attribute coaches', () => {
      // Create a coach with high development attribute
      const coach = generateCoach('headCoach', 'team-buf', 2025, {
        reputationTier: 'legendary',
      });

      // Force high development
      coach.attributes.development = 85;

      const strengths = generateCoachStrengths(coach);
      expect(strengths).toContain('Player Development');
    });
  });

  describe('generateCoachWeaknesses', () => {
    it('should return array of weaknesses', () => {
      const coach = generateCoach('headCoach', 'team-buf', 2025);
      const weaknesses = generateCoachWeaknesses(coach);

      expect(Array.isArray(weaknesses)).toBe(true);
      expect(weaknesses.length).toBeGreaterThanOrEqual(1);
      expect(weaknesses.length).toBeLessThanOrEqual(3);

      for (const weakness of weaknesses) {
        expect(typeof weakness).toBe('string');
        expect(weakness.length).toBeGreaterThan(0);
      }
    });

    it('should include attribute-based weaknesses for low attribute coaches', () => {
      const coach = generateCoach('headCoach', 'team-buf', 2025, {
        reputationTier: 'unknown',
      });

      // Force low game day IQ
      coach.attributes.gameDayIQ = 35;

      const weaknesses = generateCoachWeaknesses(coach);
      expect(weaknesses).toContain('Clock Management');
    });
  });

  describe('getSchemeDisplayName', () => {
    it('should return display names for all offensive schemes', () => {
      for (const scheme of ALL_OFFENSIVE_SCHEMES) {
        const displayName = getSchemeDisplayName(scheme);
        expect(displayName).toBeTruthy();
        expect(displayName.length).toBeGreaterThan(0);
      }
    });

    it('should return display names for all defensive schemes', () => {
      for (const scheme of ALL_DEFENSIVE_SCHEMES) {
        const displayName = getSchemeDisplayName(scheme);
        expect(displayName).toBeTruthy();
        expect(displayName.length).toBeGreaterThan(0);
      }
    });

    it('should return "Multiple" for null scheme', () => {
      expect(getSchemeDisplayName(null)).toBe('Multiple');
    });

    it('should return correct mappings', () => {
      expect(getSchemeDisplayName('westCoast')).toBe('West Coast');
      expect(getSchemeDisplayName('airRaid')).toBe('Air Raid');
      expect(getSchemeDisplayName('fourThreeUnder')).toBe('4-3 Under');
      expect(getSchemeDisplayName('threeFour')).toBe('3-4');
    });
  });

  describe('getTreeDisplayName', () => {
    it('should return display names for all trees', () => {
      for (const tree of ALL_TREE_NAMES) {
        const displayName = getTreeDisplayName(tree);
        expect(displayName).toBeTruthy();
        expect(displayName.length).toBeGreaterThan(0);
        expect(displayName).toContain('Tree');
      }
    });

    it('should return correct mappings', () => {
      expect(getTreeDisplayName('belichick')).toBe('Bill Belichick Tree');
      expect(getTreeDisplayName('walsh')).toBe('Bill Walsh Tree');
      expect(getTreeDisplayName('reid')).toBe('Andy Reid Tree');
    });
  });

  describe('getPersonalityDisplayName', () => {
    it('should return display names for all personalities', () => {
      for (const personality of ALL_PERSONALITY_TYPES) {
        const displayName = getPersonalityDisplayName(personality);
        expect(displayName).toBeTruthy();
        expect(displayName.length).toBeGreaterThan(0);
      }
    });

    it('should return correct mappings', () => {
      expect(getPersonalityDisplayName('analytical')).toBe('Analytical');
      expect(getPersonalityDisplayName('playersCoach')).toBe("Players' Coach");
      expect(getPersonalityDisplayName('oldSchool')).toBe('Old School');
    });
  });

  describe('getReputationDisplayName', () => {
    it('should return display names for all tiers', () => {
      const tiers: ReputationTier[] = ['legendary', 'elite', 'established', 'rising', 'unknown'];

      for (const tier of tiers) {
        const displayName = getReputationDisplayName(tier);
        expect(displayName).toBeTruthy();
        expect(displayName.length).toBeGreaterThan(0);
      }
    });

    it('should return correct mappings', () => {
      expect(getReputationDisplayName('legendary')).toBe('Legendary');
      expect(getReputationDisplayName('elite')).toBe('Elite');
      expect(getReputationDisplayName('rising')).toBe('Rising Star');
    });
  });
});

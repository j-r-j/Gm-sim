/**
 * Tests for Personality Effects
 */

import {
  hasPersonalityConflict,
  hasPersonalitySynergy,
  getPersonalityCompatibility,
  calculatePersonalityInteraction,
  detectConflict,
  detectSynergy,
  calculateStaffChemistry,
  calculateStaffChemistryImpact,
  suggestCompatiblePersonalities,
  wouldCreateConflict,
  isValidPersonalityType,
  PersonalityType,
} from '../PersonalityEffects';
import { Coach, createDefaultCoach } from '../../models/staff/Coach';
import { createDefaultPersonality } from '../../models/staff/CoachPersonality';
import { createDefaultAttributes } from '../../models/staff/CoachAttributes';

// Helper to create a test coach with specific personality
function createTestCoach(
  id: string,
  personality: PersonalityType,
  secondary: PersonalityType | null = null,
  ego: number = 50,
  yearsExperience: number = 10
): Coach {
  const coach = createDefaultCoach(id, 'Test', `Coach${id}`, 'headCoach');
  coach.personality = {
    ...createDefaultPersonality(),
    primary: personality,
    secondary,
    ego,
    adaptability: 50,
  };
  coach.attributes = {
    ...createDefaultAttributes(),
    yearsExperience,
  };
  return coach;
}

describe('Personality Effects', () => {
  describe('hasPersonalityConflict', () => {
    it('should detect conflict between aggressive personalities', () => {
      expect(hasPersonalityConflict('aggressive', 'aggressive')).toBe(true);
    });

    it('should detect conflict between aggressive and conservative', () => {
      expect(hasPersonalityConflict('aggressive', 'conservative')).toBe(true);
      expect(hasPersonalityConflict('conservative', 'aggressive')).toBe(true);
    });

    it('should detect conflict between innovative and oldSchool', () => {
      expect(hasPersonalityConflict('innovative', 'oldSchool')).toBe(true);
      expect(hasPersonalityConflict('oldSchool', 'innovative')).toBe(true);
    });

    it('should not detect conflict for compatible personalities', () => {
      expect(hasPersonalityConflict('analytical', 'conservative')).toBe(false);
      expect(hasPersonalityConflict('playersCoach', 'playersCoach')).toBe(false);
    });
  });

  describe('hasPersonalitySynergy', () => {
    it('should detect synergy between analytical and conservative', () => {
      expect(hasPersonalitySynergy('analytical', 'conservative')).toBe(true);
    });

    it('should detect synergy between playersCoach personalities', () => {
      expect(hasPersonalitySynergy('playersCoach', 'playersCoach')).toBe(true);
    });

    it('should detect synergy between conservative and oldSchool', () => {
      expect(hasPersonalitySynergy('conservative', 'oldSchool')).toBe(true);
    });

    it('should not detect synergy for conflicting personalities', () => {
      expect(hasPersonalitySynergy('aggressive', 'conservative')).toBe(false);
    });
  });

  describe('getPersonalityCompatibility', () => {
    it('should return positive for compatible personalities', () => {
      expect(getPersonalityCompatibility('analytical', 'conservative')).toBeGreaterThan(0);
      expect(getPersonalityCompatibility('playersCoach', 'playersCoach')).toBeGreaterThan(0);
    });

    it('should return negative for conflicting personalities', () => {
      expect(getPersonalityCompatibility('aggressive', 'conservative')).toBeLessThan(0);
      expect(getPersonalityCompatibility('innovative', 'oldSchool')).toBeLessThan(0);
    });

    it('should return zero or near-zero for neutral personalities', () => {
      expect(getPersonalityCompatibility('analytical', 'oldSchool')).toBe(0);
    });
  });

  describe('calculatePersonalityInteraction', () => {
    it('should return synergy for compatible coaches', () => {
      const coach1 = createTestCoach('1', 'analytical');
      const coach2 = createTestCoach('2', 'conservative');

      const interaction = calculatePersonalityInteraction(coach1, coach2);

      expect(interaction.type).toBe('synergy');
      expect(interaction.strength).toBeGreaterThan(0);
    });

    it('should return conflict for incompatible coaches', () => {
      const coach1 = createTestCoach('1', 'aggressive');
      const coach2 = createTestCoach('2', 'conservative');

      const interaction = calculatePersonalityInteraction(coach1, coach2);

      expect(interaction.type).toBe('conflict');
      expect(interaction.strength).toBeGreaterThan(0);
    });

    it('should return neutral for neither synergy nor conflict', () => {
      const coach1 = createTestCoach('1', 'analytical');
      const coach2 = createTestCoach('2', 'oldSchool');

      const interaction = calculatePersonalityInteraction(coach1, coach2);

      expect(interaction.type).toBe('neutral');
    });

    it('should include description', () => {
      const coach1 = createTestCoach('1', 'playersCoach');
      const coach2 = createTestCoach('2', 'playersCoach');

      const interaction = calculatePersonalityInteraction(coach1, coach2);

      expect(interaction.description).toBeDefined();
      expect(interaction.description.length).toBeGreaterThan(0);
    });

    it('should consider secondary personalities', () => {
      const coach1 = createTestCoach('1', 'analytical', 'conservative');
      const coach2 = createTestCoach('2', 'conservative', 'analytical');

      const interaction = calculatePersonalityInteraction(coach1, coach2);

      // Should have stronger synergy due to matching secondaries
      expect(interaction.type).toBe('synergy');
    });
  });

  describe('detectConflict', () => {
    it('should detect conflict between incompatible coaches', () => {
      const coach1 = createTestCoach('1', 'aggressive');
      const coach2 = createTestCoach('2', 'conservative');

      const conflict = detectConflict(coach1, coach2);

      expect(conflict).not.toBeNull();
      expect(conflict?.conflictType).toBeDefined();
      expect(conflict?.severity).toBeDefined();
    });

    it('should return null for compatible coaches', () => {
      const coach1 = createTestCoach('1', 'analytical');
      const coach2 = createTestCoach('2', 'conservative');

      const conflict = detectConflict(coach1, coach2);

      expect(conflict).toBeNull();
    });

    it('should detect ego clash for high-ego coaches', () => {
      const coach1 = createTestCoach('1', 'aggressive', null, 90);
      const coach2 = createTestCoach('2', 'aggressive', null, 85);

      const conflict = detectConflict(coach1, coach2);

      expect(conflict?.conflictType).toBe('ego_clash');
    });

    it('should detect philosophy clash for innovative vs oldSchool', () => {
      const coach1 = createTestCoach('1', 'innovative');
      const coach2 = createTestCoach('2', 'oldSchool');

      const conflict = detectConflict(coach1, coach2);

      expect(conflict?.conflictType).toBe('philosophy_clash');
    });

    it('should include coach names in conflict', () => {
      const coach1 = createTestCoach('1', 'aggressive');
      const coach2 = createTestCoach('2', 'conservative');

      const conflict = detectConflict(coach1, coach2);

      expect(conflict?.coach1Name).toContain('Test');
      expect(conflict?.coach2Name).toContain('Test');
    });
  });

  describe('detectSynergy', () => {
    it('should detect synergy between compatible coaches', () => {
      const coach1 = createTestCoach('1', 'analytical');
      const coach2 = createTestCoach('2', 'conservative');

      const synergy = detectSynergy(coach1, coach2);

      expect(synergy).not.toBeNull();
      expect(synergy?.synergyType).toBeDefined();
      expect(synergy?.strength).toBeDefined();
    });

    it('should return null for incompatible coaches', () => {
      const coach1 = createTestCoach('1', 'aggressive');
      const coach2 = createTestCoach('2', 'conservative');

      const synergy = detectSynergy(coach1, coach2);

      expect(synergy).toBeNull();
    });

    it('should detect mentorship for large experience gap', () => {
      const coach1 = createTestCoach('1', 'playersCoach', null, 50, 25);
      const coach2 = createTestCoach('2', 'playersCoach', null, 50, 5);

      const synergy = detectSynergy(coach1, coach2);

      expect(synergy?.synergyType).toBe('mentorship');
    });

    it('should detect shared vision for same personality', () => {
      const coach1 = createTestCoach('1', 'conservative', null, 50, 10);
      const coach2 = createTestCoach('2', 'conservative', null, 50, 10);

      const synergy = detectSynergy(coach1, coach2);

      expect(synergy?.synergyType).toBe('shared_vision');
    });
  });

  describe('calculateStaffChemistry', () => {
    it('should return neutral for too few coaches', () => {
      const result = calculateStaffChemistry([]);

      expect(result.overallChemistry).toBe(0);
      expect(result.qualitativeDescription.level).toBe('average');
    });

    it('should calculate positive chemistry for compatible staff', () => {
      const coaches = [
        createTestCoach('1', 'analytical'),
        createTestCoach('2', 'conservative'),
        createTestCoach('3', 'playersCoach'),
      ];

      const result = calculateStaffChemistry(coaches);

      expect(result.overallChemistry).toBeGreaterThan(0);
      expect(result.synergies.length).toBeGreaterThan(0);
    });

    it('should calculate negative chemistry for conflicting staff', () => {
      const coaches = [
        createTestCoach('1', 'aggressive'),
        createTestCoach('2', 'conservative'),
        createTestCoach('3', 'oldSchool'),
      ];

      const result = calculateStaffChemistry(coaches);

      expect(result.conflicts.length).toBeGreaterThan(0);
    });

    it('should include all interactions', () => {
      const coaches = [
        createTestCoach('1', 'analytical'),
        createTestCoach('2', 'conservative'),
        createTestCoach('3', 'playersCoach'),
      ];

      const result = calculateStaffChemistry(coaches);

      // 3 coaches = 3 pairwise interactions
      expect(result.interactions.length).toBe(3);
    });

    it('should generate qualitative description', () => {
      const coaches = [createTestCoach('1', 'playersCoach'), createTestCoach('2', 'playersCoach')];

      const result = calculateStaffChemistry(coaches);

      expect(result.qualitativeDescription.level).toBeDefined();
      expect(result.qualitativeDescription.summary).toBeDefined();
      expect(Array.isArray(result.qualitativeDescription.strengths)).toBe(true);
      expect(Array.isArray(result.qualitativeDescription.concerns)).toBe(true);
    });

    it('should not expose raw chemistry numbers in description', () => {
      const coaches = [createTestCoach('1', 'analytical'), createTestCoach('2', 'conservative')];

      const result = calculateStaffChemistry(coaches);

      expect(result.qualitativeDescription.summary).not.toContain('-10');
      expect(result.qualitativeDescription.summary).not.toContain('+10');
    });
  });

  describe('calculateStaffChemistryImpact', () => {
    it('should return positive modifiers for good chemistry', () => {
      const coaches = [createTestCoach('1', 'playersCoach'), createTestCoach('2', 'playersCoach')];

      const chemistry = calculateStaffChemistry(coaches);
      const impact = calculateStaffChemistryImpact(chemistry);

      expect(impact.developmentModifier).toBeGreaterThanOrEqual(0);
      expect(impact.gameDayModifier).toBeGreaterThanOrEqual(0);
      expect(impact.moraleModifier).toBeGreaterThanOrEqual(0);
    });

    it('should return negative modifiers for bad chemistry', () => {
      const coaches = [
        createTestCoach('1', 'aggressive', null, 90),
        createTestCoach('2', 'aggressive', null, 90),
      ];

      const chemistry = calculateStaffChemistry(coaches);
      const impact = calculateStaffChemistryImpact(chemistry);

      expect(impact.developmentModifier).toBeLessThanOrEqual(0);
    });

    it('should have additional penalty for severe conflicts', () => {
      const coaches = [
        createTestCoach('1', 'aggressive', null, 95),
        createTestCoach('2', 'conservative'),
        createTestCoach('3', 'aggressive', null, 90),
      ];

      const chemistry = calculateStaffChemistry(coaches);
      const impact = calculateStaffChemistryImpact(chemistry);

      // Severe conflicts should amplify negative impact
      expect(impact.moraleModifier).toBeLessThan(0);
    });
  });

  describe('suggestCompatiblePersonalities', () => {
    it('should suggest analytical and playersCoach for empty staff', () => {
      const suggestions = suggestCompatiblePersonalities([]);

      expect(suggestions).toContain('analytical');
      expect(suggestions).toContain('playersCoach');
    });

    it('should suggest compatible personalities for existing staff', () => {
      const currentStaff = [createTestCoach('1', 'analytical')];

      const suggestions = suggestCompatiblePersonalities(currentStaff);

      expect(suggestions.length).toBeGreaterThan(0);
      // Should not suggest highly conflicting types
      suggestions.forEach((suggestion) => {
        expect(getPersonalityCompatibility('analytical', suggestion)).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return defaults if no good suggestions', () => {
      // Edge case with weird staff composition
      const currentStaff = [
        createTestCoach('1', 'aggressive'),
        createTestCoach('2', 'conservative'),
        createTestCoach('3', 'innovative'),
        createTestCoach('4', 'oldSchool'),
      ];

      const suggestions = suggestCompatiblePersonalities(currentStaff);

      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('wouldCreateConflict', () => {
    it('should detect potential conflicts', () => {
      const newCoach = createTestCoach('new', 'aggressive');
      const existingStaff = [createTestCoach('1', 'conservative')];

      const result = wouldCreateConflict(newCoach, existingStaff);

      expect(result.wouldConflict).toBe(true);
      expect(result.potentialConflicts.length).toBeGreaterThan(0);
    });

    it('should return no conflicts for compatible hire', () => {
      const newCoach = createTestCoach('new', 'analytical');
      const existingStaff = [createTestCoach('1', 'conservative')];

      const result = wouldCreateConflict(newCoach, existingStaff);

      expect(result.wouldConflict).toBe(false);
      expect(result.potentialConflicts.length).toBe(0);
    });

    it('should check against all existing staff', () => {
      const newCoach = createTestCoach('new', 'aggressive');
      const existingStaff = [
        createTestCoach('1', 'conservative'),
        createTestCoach('2', 'conservative'),
      ];

      const result = wouldCreateConflict(newCoach, existingStaff);

      expect(result.potentialConflicts.length).toBe(2);
    });
  });

  describe('isValidPersonalityType', () => {
    it('should return true for valid personality types', () => {
      expect(isValidPersonalityType('analytical')).toBe(true);
      expect(isValidPersonalityType('aggressive')).toBe(true);
      expect(isValidPersonalityType('conservative')).toBe(true);
      expect(isValidPersonalityType('innovative')).toBe(true);
      expect(isValidPersonalityType('oldSchool')).toBe(true);
      expect(isValidPersonalityType('playersCoach')).toBe(true);
    });

    it('should return false for invalid personality types', () => {
      expect(isValidPersonalityType('invalid')).toBe(false);
      expect(isValidPersonalityType('')).toBe(false);
      expect(isValidPersonalityType('ANALYTICAL')).toBe(false);
    });
  });
});

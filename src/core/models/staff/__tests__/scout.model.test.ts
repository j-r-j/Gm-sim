/**
 * Scout Model Tests
 * Tests for Scout entity validation, track record, and focus prospects
 */

import {
  createDefaultScout,
  validateScout,
  getScoutFullName,
  addFocusProspect,
  removeFocusProspect,
  createScoutContract,
  validateScoutContract,
  advanceScoutContractYear,
  MAX_FOCUS_PROSPECTS,
} from '../Scout';
import {
  validateScoutAttributes,
  createDefaultScoutAttributes,
  getPositionSpecialtyBonus,
  getRegionKnowledgeBonus,
  getProspectsPerWeek,
} from '../ScoutAttributes';
import {
  ScoutEvaluation,
  createEmptyTrackRecord,
  addEvaluation,
  calculateWasHit,
  calculateOverallHitRate,
  updateTrackRecord,
  MIN_EVALUATIONS_FOR_RELIABILITY,
  validateEvaluation,
} from '../ScoutTrackRecord';
import { Position } from '../../player/Position';

describe('Scout Entity', () => {
  describe('createDefaultScout', () => {
    it('should create a scout with all required fields', () => {
      const scout = createDefaultScout('scout-1', 'Mike', 'Davis', 'headScout');

      expect(scout.id).toBe('scout-1');
      expect(scout.firstName).toBe('Mike');
      expect(scout.lastName).toBe('Davis');
      expect(scout.role).toBe('headScout');
      expect(scout.teamId).toBeNull();
      expect(scout.region).toBeNull(); // National scouts don't have region
      expect(scout.attributes).toBeDefined();
      expect(scout.trackRecord).toBeDefined();
      expect(scout.contract).toBeNull();
      expect(scout.focusProspects).toEqual([]);
      expect(scout.autoScoutingActive).toBe(true);
      expect(scout.isAvailable).toBe(true);
      expect(scout.isRetired).toBe(false);
    });
  });

  describe('validateScout', () => {
    it('should validate a valid scout', () => {
      const scout = createDefaultScout('scout-1', 'Mike', 'Davis', 'headScout');
      expect(validateScout(scout)).toBe(true);
    });

    it('should reject scout without ID', () => {
      const scout = createDefaultScout('', 'Mike', 'Davis', 'headScout');
      expect(validateScout(scout)).toBe(false);
    });

    it('should reject scout without first name', () => {
      const scout = createDefaultScout('scout-1', '', 'Davis', 'headScout');
      expect(validateScout(scout)).toBe(false);
    });

    it('should reject scout with mismatched track record ID', () => {
      const scout = createDefaultScout('scout-1', 'Mike', 'Davis', 'headScout');
      scout.trackRecord.scoutId = 'different-id';
      expect(validateScout(scout)).toBe(false);
    });
  });

  describe('getScoutFullName', () => {
    it('should return full name', () => {
      const scout = createDefaultScout('scout-1', 'Mike', 'Davis', 'headScout');
      expect(getScoutFullName(scout)).toBe('Mike Davis');
    });
  });

  describe('Focus Prospects', () => {
    it('should add focus prospect successfully', () => {
      const scout = createDefaultScout('scout-1', 'Mike', 'Davis', 'headScout');
      const updated = addFocusProspect(scout, 'prospect-1');

      expect(updated).not.toBeNull();
      expect(updated!.focusProspects).toContain('prospect-1');
    });

    it('should not add duplicate focus prospect', () => {
      const scout = createDefaultScout('scout-1', 'Mike', 'Davis', 'headScout');
      scout.focusProspects = ['prospect-1'];
      const updated = addFocusProspect(scout, 'prospect-1');

      expect(updated!.focusProspects.length).toBe(1);
    });

    it('should limit focus prospects to MAX_FOCUS_PROSPECTS', () => {
      const scout = createDefaultScout('scout-1', 'Mike', 'Davis', 'headScout');
      scout.focusProspects = ['p1', 'p2', 'p3', 'p4', 'p5'];

      expect(scout.focusProspects.length).toBe(MAX_FOCUS_PROSPECTS);

      const updated = addFocusProspect(scout, 'p6');
      expect(updated).toBeNull();
    });

    it('should remove focus prospect', () => {
      const scout = createDefaultScout('scout-1', 'Mike', 'Davis', 'headScout');
      scout.focusProspects = ['prospect-1', 'prospect-2'];

      const updated = removeFocusProspect(scout, 'prospect-1');
      expect(updated.focusProspects).not.toContain('prospect-1');
      expect(updated.focusProspects).toContain('prospect-2');
    });
  });

  describe('Scout Contract', () => {
    it('should create a valid contract', () => {
      const contract = createScoutContract(500_000, 3);

      expect(contract.salary).toBe(500_000);
      expect(contract.yearsTotal).toBe(3);
      expect(contract.yearsRemaining).toBe(3);
    });

    it('should validate a valid contract', () => {
      const contract = createScoutContract(500_000, 3);
      expect(validateScoutContract(contract)).toBe(true);
    });

    it('should reject contract with negative salary', () => {
      const contract = createScoutContract(-100, 3);
      expect(validateScoutContract(contract)).toBe(false);
    });

    it('should reject contract over 5 years', () => {
      const contract = createScoutContract(500_000, 6);
      expect(validateScoutContract(contract)).toBe(false);
    });

    it('should advance contract year', () => {
      const contract = createScoutContract(500_000, 3);
      const advanced = advanceScoutContractYear(contract);

      expect(advanced).not.toBeNull();
      expect(advanced!.yearsRemaining).toBe(2);
    });

    it('should return null when contract expires', () => {
      const contract = createScoutContract(500_000, 1);
      const advanced = advanceScoutContractYear(contract);

      expect(advanced).toBeNull();
    });
  });
});

describe('Scout Attributes', () => {
  describe('validateScoutAttributes', () => {
    it('should validate valid attributes', () => {
      const attributes = createDefaultScoutAttributes();
      expect(validateScoutAttributes(attributes)).toBe(true);
    });

    it('should reject evaluation outside 1-100', () => {
      const attributes = createDefaultScoutAttributes();
      attributes.evaluation = 0;
      expect(validateScoutAttributes(attributes)).toBe(false);
    });

    it('should reject speed outside 1-100', () => {
      const attributes = createDefaultScoutAttributes();
      attributes.speed = 101;
      expect(validateScoutAttributes(attributes)).toBe(false);
    });

    it('should reject negative experience', () => {
      const attributes = createDefaultScoutAttributes();
      attributes.experience = -1;
      expect(validateScoutAttributes(attributes)).toBe(false);
    });

    it('should reject unreasonable age', () => {
      const attributes = createDefaultScoutAttributes();
      attributes.age = 21; // Too young
      expect(validateScoutAttributes(attributes)).toBe(false);
    });
  });

  describe('getPositionSpecialtyBonus', () => {
    it('should return bonus for matching position', () => {
      const attributes = createDefaultScoutAttributes();
      attributes.positionSpecialty = Position.QB;
      attributes.evaluation = 80;

      const bonus = getPositionSpecialtyBonus(attributes, Position.QB);
      expect(bonus).toBeGreaterThan(0);
    });

    it('should return 0 for non-matching position', () => {
      const attributes = createDefaultScoutAttributes();
      attributes.positionSpecialty = Position.QB;

      const bonus = getPositionSpecialtyBonus(attributes, Position.WR);
      expect(bonus).toBe(0);
    });
  });

  describe('getRegionKnowledgeBonus', () => {
    it('should return bonus for matching region', () => {
      const attributes = createDefaultScoutAttributes();
      attributes.regionKnowledge = 'southeast';
      attributes.experience = 10;

      const bonus = getRegionKnowledgeBonus(attributes, 'southeast');
      expect(bonus).toBeGreaterThan(0);
    });

    it('should return 0 for non-matching region', () => {
      const attributes = createDefaultScoutAttributes();
      attributes.regionKnowledge = 'southeast';

      const bonus = getRegionKnowledgeBonus(attributes, 'northeast');
      expect(bonus).toBe(0);
    });
  });

  describe('getProspectsPerWeek', () => {
    it('should return higher number for faster scouts', () => {
      const slowScout = createDefaultScoutAttributes();
      slowScout.speed = 20;

      const fastScout = createDefaultScoutAttributes();
      fastScout.speed = 80;

      expect(getProspectsPerWeek(fastScout)).toBeGreaterThan(getProspectsPerWeek(slowScout));
    });
  });
});

describe('Scout Track Record', () => {
  describe('createEmptyTrackRecord', () => {
    it('should create empty track record', () => {
      const record = createEmptyTrackRecord('scout-1');

      expect(record.scoutId).toBe('scout-1');
      expect(record.evaluations).toEqual([]);
      expect(record.overallHitRate).toBeNull();
      expect(record.positionAccuracy).toEqual({});
      expect(record.knownStrengths).toEqual([]);
      expect(record.knownWeaknesses).toEqual([]);
      expect(record.yearsOfData).toBe(0);
      expect(record.reliabilityRevealed).toBe(false);
    });
  });

  describe('calculateWasHit', () => {
    it('should return null if actual skill not revealed', () => {
      const evaluation: ScoutEvaluation = {
        prospectId: 'prospect-1',
        prospectName: 'John Doe',
        position: Position.QB,
        evaluationYear: 2024,
        projectedRound: 1,
        projectedSkillRange: { min: 75, max: 85 },
        actualDraftRound: 1,
        actualSkillRevealed: null,
        wasHit: null,
      };

      expect(calculateWasHit(evaluation)).toBeNull();
    });

    it('should return true if actual skill within projected range', () => {
      const evaluation: ScoutEvaluation = {
        prospectId: 'prospect-1',
        prospectName: 'John Doe',
        position: Position.QB,
        evaluationYear: 2024,
        projectedRound: 1,
        projectedSkillRange: { min: 75, max: 85 },
        actualDraftRound: 1,
        actualSkillRevealed: 80,
        wasHit: null,
      };

      expect(calculateWasHit(evaluation)).toBe(true);
    });

    it('should return true if actual skill within 10 points of range', () => {
      const evaluation: ScoutEvaluation = {
        prospectId: 'prospect-1',
        prospectName: 'John Doe',
        position: Position.QB,
        evaluationYear: 2024,
        projectedRound: 1,
        projectedSkillRange: { min: 75, max: 85 },
        actualDraftRound: 1,
        actualSkillRevealed: 70, // 5 points below min
        wasHit: null,
      };

      expect(calculateWasHit(evaluation)).toBe(true);
    });

    it('should return false if actual skill far outside range', () => {
      const evaluation: ScoutEvaluation = {
        prospectId: 'prospect-1',
        prospectName: 'John Doe',
        position: Position.QB,
        evaluationYear: 2024,
        projectedRound: 1,
        projectedSkillRange: { min: 75, max: 85 },
        actualDraftRound: 1,
        actualSkillRevealed: 55, // 20 points below min
        wasHit: null,
      };

      expect(calculateWasHit(evaluation)).toBe(false);
    });
  });

  describe('calculateOverallHitRate', () => {
    it('should return null with insufficient evaluations', () => {
      const evaluations: ScoutEvaluation[] = [
        {
          prospectId: 'p1',
          prospectName: 'Player 1',
          position: Position.QB,
          evaluationYear: 2024,
          projectedRound: 1,
          projectedSkillRange: { min: 75, max: 85 },
          actualDraftRound: 1,
          actualSkillRevealed: 80,
          wasHit: true,
        },
      ];

      expect(calculateOverallHitRate(evaluations)).toBeNull();
    });

    it('should calculate hit rate with sufficient evaluations', () => {
      const evaluations: ScoutEvaluation[] = [];

      // Create enough evaluations
      for (let i = 0; i < MIN_EVALUATIONS_FOR_RELIABILITY; i++) {
        evaluations.push({
          prospectId: `p${i}`,
          prospectName: `Player ${i}`,
          position: Position.QB,
          evaluationYear: 2024,
          projectedRound: 1,
          projectedSkillRange: { min: 75, max: 85 },
          actualDraftRound: 1,
          actualSkillRevealed: 80,
          wasHit: i < 15, // 15 hits out of 20
        });
      }

      const hitRate = calculateOverallHitRate(evaluations);
      expect(hitRate).toBe(0.75);
    });
  });

  describe('addEvaluation', () => {
    it('should add evaluation to track record', () => {
      const record = createEmptyTrackRecord('scout-1');
      const evaluation: ScoutEvaluation = {
        prospectId: 'prospect-1',
        prospectName: 'John Doe',
        position: Position.QB,
        evaluationYear: 2024,
        projectedRound: 1,
        projectedSkillRange: { min: 75, max: 85 },
        actualDraftRound: null,
        actualSkillRevealed: null,
        wasHit: null,
      };

      const updated = addEvaluation(record, evaluation);
      expect(updated.evaluations.length).toBe(1);
      expect(updated.evaluations[0]).toEqual(evaluation);
    });
  });

  describe('validateEvaluation', () => {
    it('should validate a valid evaluation', () => {
      const evaluation: ScoutEvaluation = {
        prospectId: 'prospect-1',
        prospectName: 'John Doe',
        position: Position.QB,
        evaluationYear: 2024,
        projectedRound: 2,
        projectedSkillRange: { min: 60, max: 75 },
        actualDraftRound: null,
        actualSkillRevealed: null,
        wasHit: null,
      };

      expect(validateEvaluation(evaluation)).toBe(true);
    });

    it('should reject invalid projected round', () => {
      const evaluation: ScoutEvaluation = {
        prospectId: 'prospect-1',
        prospectName: 'John Doe',
        position: Position.QB,
        evaluationYear: 2024,
        projectedRound: 8, // Invalid
        projectedSkillRange: { min: 60, max: 75 },
        actualDraftRound: null,
        actualSkillRevealed: null,
        wasHit: null,
      };

      expect(validateEvaluation(evaluation)).toBe(false);
    });

    it('should reject invalid skill range', () => {
      const evaluation: ScoutEvaluation = {
        prospectId: 'prospect-1',
        prospectName: 'John Doe',
        position: Position.QB,
        evaluationYear: 2024,
        projectedRound: 1,
        projectedSkillRange: { min: 80, max: 70 }, // Min > max
        actualDraftRound: null,
        actualSkillRevealed: null,
        wasHit: null,
      };

      expect(validateEvaluation(evaluation)).toBe(false);
    });
  });

  describe('updateTrackRecord', () => {
    it('should increment years of data when new year', () => {
      const record = createEmptyTrackRecord('scout-1');
      const updated = updateTrackRecord(record, true);

      expect(updated.yearsOfData).toBe(1);
    });

    it('should not increment years when same year', () => {
      const record = createEmptyTrackRecord('scout-1');
      record.yearsOfData = 3;
      const updated = updateTrackRecord(record, false);

      expect(updated.yearsOfData).toBe(3);
    });
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Scout ViewModel Tests
 * Tests that ScoutViewModel properly hides evaluation until reliability revealed
 */

import { Scout, createDefaultScout, createScoutViewModel, createScoutContract } from '../Scout';
import {
  ScoutEvaluation,
  MIN_EVALUATIONS_FOR_RELIABILITY,
  MIN_YEARS_FOR_TENDENCIES,
} from '../ScoutTrackRecord';
import { Position } from '../../player/Position';

describe('ScoutViewModel', () => {
  let testScout: Scout;

  beforeEach(() => {
    testScout = createDefaultScout('scout-1', 'John', 'Smith', 'headScout');
    testScout.contract = createScoutContract(600_000, 3);

    // Set up attributes
    testScout.attributes.evaluation = 75;
    testScout.attributes.speed = 65;
    testScout.attributes.experience = 8;
    testScout.attributes.age = 42;
    testScout.attributes.positionSpecialty = Position.WR;
    testScout.attributes.regionKnowledge = 'southeast';
  });

  describe('createScoutViewModel', () => {
    it('should include public information', () => {
      const viewModel = createScoutViewModel(testScout, true);

      expect(viewModel.id).toBe('scout-1');
      expect(viewModel.fullName).toBe('John Smith');
      expect(viewModel.role).toBe('headScout');
    });

    it('should include years of experience', () => {
      const viewModel = createScoutViewModel(testScout, true);

      expect(viewModel.yearsExperience).toBe(8);
    });

    it('should include age', () => {
      const viewModel = createScoutViewModel(testScout, true);

      expect(viewModel.age).toBe(42);
    });

    it('should include position specialty', () => {
      const viewModel = createScoutViewModel(testScout, true);

      expect(viewModel.positionSpecialty).toBe(Position.WR);
    });
  });

  describe('Evaluation hiding until reliability revealed', () => {
    it('should hide evaluation rating when reliability not revealed', () => {
      testScout.trackRecord.reliabilityRevealed = false;
      const viewModel = createScoutViewModel(testScout, true);

      expect(viewModel.evaluationRating).toBeNull();
    });

    it('should show evaluation rating when reliability revealed', () => {
      testScout.trackRecord.reliabilityRevealed = true;
      const viewModel = createScoutViewModel(testScout, true);

      expect(viewModel.evaluationRating).not.toBeNull();
      // Should be rounded to nearest 10
      expect(viewModel.evaluationRating).toBe(80); // 75 rounds to 80
    });

    it('should hide hit rate when reliability not revealed', () => {
      testScout.trackRecord.reliabilityRevealed = false;
      testScout.trackRecord.overallHitRate = 0.72;
      const viewModel = createScoutViewModel(testScout, true);

      expect(viewModel.hitRate).toBeNull();
    });

    it('should show hit rate when reliability revealed', () => {
      testScout.trackRecord.reliabilityRevealed = true;
      testScout.trackRecord.overallHitRate = 0.72;
      const viewModel = createScoutViewModel(testScout, true);

      expect(viewModel.hitRate).toBe(0.72);
    });

    it('should track reliabilityKnown status', () => {
      testScout.trackRecord.reliabilityRevealed = false;
      let viewModel = createScoutViewModel(testScout, true);
      expect(viewModel.reliabilityKnown).toBe(false);

      testScout.trackRecord.reliabilityRevealed = true;
      viewModel = createScoutViewModel(testScout, true);
      expect(viewModel.reliabilityKnown).toBe(true);
    });
  });

  describe('Strengths and weaknesses reveal over time', () => {
    it('should show empty strengths initially', () => {
      testScout.trackRecord.knownStrengths = [];
      const viewModel = createScoutViewModel(testScout, true);

      expect(viewModel.knownStrengths).toEqual([]);
    });

    it('should show strengths after they are revealed', () => {
      testScout.trackRecord.knownStrengths = ['Excellent at evaluating WRs'];
      const viewModel = createScoutViewModel(testScout, true);

      expect(viewModel.knownStrengths).toContain('Excellent at evaluating WRs');
    });

    it('should show empty weaknesses initially', () => {
      testScout.trackRecord.knownWeaknesses = [];
      const viewModel = createScoutViewModel(testScout, true);

      expect(viewModel.knownWeaknesses).toEqual([]);
    });

    it('should show weaknesses after they are revealed', () => {
      testScout.trackRecord.knownWeaknesses = ['Often misses on RBs'];
      const viewModel = createScoutViewModel(testScout, true);

      expect(viewModel.knownWeaknesses).toContain('Often misses on RBs');
    });
  });

  describe('Contract visibility', () => {
    it('should show contract details for own scouts', () => {
      const viewModel = createScoutViewModel(testScout, true);

      expect(viewModel.salary).toBe(600_000);
      expect(viewModel.yearsRemaining).toBe(3);
    });

    it('should hide contract details for other teams scouts', () => {
      const viewModel = createScoutViewModel(testScout, false);

      expect(viewModel.salary).toBeNull();
      expect(viewModel.yearsRemaining).toBeNull();
    });
  });

  describe('Hidden attributes', () => {
    it('should NOT expose raw evaluation attribute', () => {
      const viewModel = createScoutViewModel(testScout, true);

      // The raw 'evaluation' (1-100) should not be in viewModel
      expect('evaluation' in viewModel).toBe(false);
      expect((viewModel as any).evaluation).toBeUndefined();
    });

    it('should NOT expose speed attribute', () => {
      const viewModel = createScoutViewModel(testScout, true);

      expect('speed' in viewModel).toBe(false);
      expect((viewModel as any).speed).toBeUndefined();
    });

    it('should NOT expose full attributes object', () => {
      const viewModel = createScoutViewModel(testScout, true);

      expect('attributes' in viewModel).toBe(false);
      expect((viewModel as any).attributes).toBeUndefined();
    });

    it('should NOT expose track record internals', () => {
      const viewModel = createScoutViewModel(testScout, true);

      expect('trackRecord' in viewModel).toBe(false);
      expect((viewModel as any).trackRecord).toBeUndefined();
      expect('evaluations' in viewModel).toBe(false);
      expect((viewModel as any).evaluations).toBeUndefined();
    });

    it('should NOT expose position accuracy details', () => {
      const viewModel = createScoutViewModel(testScout, true);

      expect('positionAccuracy' in viewModel).toBe(false);
      expect((viewModel as any).positionAccuracy).toBeUndefined();
    });
  });

  describe('Region handling', () => {
    it('should include region for regional scouts', () => {
      const regionalScout = createDefaultScout('scout-2', 'Bob', 'Jones', 'offensiveScout');
      regionalScout.region = 'southeast';

      const viewModel = createScoutViewModel(regionalScout, true);

      expect(viewModel.region).toBe('southeast');
      expect(viewModel.regionDisplayName).toBe('Southeast');
    });

    it('should have null region for non-regional scouts', () => {
      const viewModel = createScoutViewModel(testScout, true);

      expect(viewModel.region).toBeNull();
      expect(viewModel.regionDisplayName).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle scout without contract', () => {
      testScout.contract = null;
      const viewModel = createScoutViewModel(testScout, true);

      expect(viewModel.salary).toBeNull();
      expect(viewModel.yearsRemaining).toBeNull();
    });

    it('should handle scout without position specialty', () => {
      testScout.attributes.positionSpecialty = null;
      const viewModel = createScoutViewModel(testScout, true);

      expect(viewModel.positionSpecialty).toBeNull();
    });

    it('should round evaluation to nearest 10 when revealed', () => {
      testScout.trackRecord.reliabilityRevealed = true;

      // Test various values
      testScout.attributes.evaluation = 73;
      let viewModel = createScoutViewModel(testScout, true);
      expect(viewModel.evaluationRating).toBe(70);

      testScout.attributes.evaluation = 77;
      viewModel = createScoutViewModel(testScout, true);
      expect(viewModel.evaluationRating).toBe(80);

      testScout.attributes.evaluation = 95;
      viewModel = createScoutViewModel(testScout, true);
      expect(viewModel.evaluationRating).toBe(100);
    });
  });

  describe('ViewModel completeness', () => {
    it('should have all expected public fields', () => {
      const viewModel = createScoutViewModel(testScout, true);

      const expectedFields = [
        'id',
        'fullName',
        'role',
        'region',
        'regionDisplayName',
        'yearsExperience',
        'age',
        'positionSpecialty',
        'evaluationRating',
        'hitRate',
        'knownStrengths',
        'knownWeaknesses',
        'reliabilityKnown',
        'salary',
        'yearsRemaining',
      ];

      for (const field of expectedFields) {
        expect(field in viewModel).toBe(true);
      }
    });

    it('should NOT have any hidden fields', () => {
      const viewModel = createScoutViewModel(testScout, true);

      const hiddenFields = [
        'evaluation', // Raw evaluation score
        'speed',
        'attributes',
        'trackRecord',
        'evaluations',
        'positionAccuracy',
        'regionKnowledge', // Internal bonus info
        'focusProspects', // Assignment data
        'autoScoutingActive',
      ];

      for (const field of hiddenFields) {
        expect(field in viewModel).toBe(false);
      }
    });
  });
});

describe('Scout reliability reveal mechanics', () => {
  it('should require minimum evaluations before revealing reliability', () => {
    expect(MIN_EVALUATIONS_FOR_RELIABILITY).toBe(20);
  });

  it('should require minimum years for tendencies', () => {
    expect(MIN_YEARS_FOR_TENDENCIES).toBe(5);
  });

  it('should build reliability over time', () => {
    const scout = createDefaultScout('scout-1', 'Test', 'Scout', 'headScout');

    // Initially unrevealed
    expect(scout.trackRecord.reliabilityRevealed).toBe(false);
    let viewModel = createScoutViewModel(scout, true);
    expect(viewModel.evaluationRating).toBeNull();

    // Add enough evaluations to reveal
    const evaluations: ScoutEvaluation[] = [];
    for (let i = 0; i < MIN_EVALUATIONS_FOR_RELIABILITY; i++) {
      evaluations.push({
        prospectId: `p${i}`,
        prospectName: `Player ${i}`,
        position: Position.QB,
        evaluationYear: 2024,
        projectedRound: 2,
        projectedSkillRange: { min: 60, max: 75 },
        actualDraftRound: 2,
        actualSkillRevealed: 68,
        wasHit: true,
      });
    }

    scout.trackRecord.evaluations = evaluations;
    scout.trackRecord.reliabilityRevealed = true;
    scout.trackRecord.overallHitRate = 0.8;

    viewModel = createScoutViewModel(scout, true);
    expect(viewModel.evaluationRating).not.toBeNull();
    expect(viewModel.hitRate).toBe(0.8);
  });
});

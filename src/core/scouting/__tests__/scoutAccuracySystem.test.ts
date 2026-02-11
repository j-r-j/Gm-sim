/**
 * Scout Accuracy System Tests
 */

import {
  createAccuracyRevelationState,
  recordScoutEvaluation,
  updateEvaluationsWithResults,
  advanceAccuracyYear,
  classifyEvaluation,
  getAccuracyBreakdown,
  getPositionAccuracy,
  hasStrengthAtPosition,
  hasWeaknessAtPosition,
  createScoutAccuracyViewModel,
  compareScoutAccuracy,
  getScoutsByAccuracy,
  getYearsUntilRevelation,
  hasPositionAccuracyData,
  getEvaluatedPositions,
  getScoutPositionTendencies,
  EvaluationResult,
} from '../ScoutAccuracySystem';
import { createDefaultScout, Scout } from '../../models/staff/Scout';
import {
  ScoutEvaluation,
  MIN_EVALUATIONS_FOR_RELIABILITY,
  MIN_YEARS_FOR_TENDENCIES,
} from '../../models/staff/ScoutTrackRecord';
import { Position } from '../../models/player/Position';

describe('ScoutAccuracySystem', () => {
  // Helper to create scout with track record
  function createScoutWithTrackRecord(evaluations: ScoutEvaluation[], yearsOfData: number): Scout {
    const scout = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
    const completedCount = evaluations.filter((e) => e.wasHit !== null).length;

    return {
      ...scout,
      trackRecord: {
        ...scout.trackRecord,
        evaluations,
        yearsOfData,
        reliabilityRevealed: completedCount >= MIN_EVALUATIONS_FOR_RELIABILITY,
        overallHitRate:
          completedCount >= MIN_EVALUATIONS_FOR_RELIABILITY
            ? evaluations.filter((e) => e.wasHit === true).length / completedCount
            : null,
      },
    };
  }

  // Helper to create evaluation
  function createEvaluation(
    prospectId: string,
    position: Position,
    projectedRange: { min: number; max: number },
    actual: number | null,
    wasHit: boolean | null
  ): ScoutEvaluation {
    return {
      prospectId,
      prospectName: `Player ${prospectId}`,
      position,
      evaluationYear: 2023,
      projectedRound: 2,
      projectedSkillRange: projectedRange,
      actualDraftRound: wasHit !== null ? 2 : null,
      actualSkillRevealed: actual,
      wasHit,
    };
  }

  describe('createAccuracyRevelationState', () => {
    it('should create state for new scout', () => {
      const scout = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');

      const state = createAccuracyRevelationState(scout);

      expect(state.scoutId).toBe('scout-1');
      expect(state.yearsOfData).toBe(0);
      expect(state.totalEvaluations).toBe(0);
      expect(state.completedEvaluations).toBe(0);
      expect(state.reliabilityRevealed).toBe(false);
      expect(state.tendenciesRevealed).toBe(false);
    });

    it('should reflect completed evaluations', () => {
      const evaluations = [
        createEvaluation('p1', Position.QB, { min: 70, max: 80 }, 75, true),
        createEvaluation('p2', Position.RB, { min: 60, max: 70 }, null, null),
      ];
      const scout = createScoutWithTrackRecord(evaluations, 2);

      const state = createAccuracyRevelationState(scout);

      expect(state.totalEvaluations).toBe(2);
      expect(state.completedEvaluations).toBe(1);
    });

    it('should reveal tendencies after 5 years', () => {
      const scout = createScoutWithTrackRecord([], MIN_YEARS_FOR_TENDENCIES);

      const state = createAccuracyRevelationState(scout);

      expect(state.tendenciesRevealed).toBe(true);
    });
  });

  describe('recordScoutEvaluation', () => {
    it('should add evaluation to scout track record', () => {
      const scout = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      const result: EvaluationResult = {
        playerId: 'player-1',
        playerName: 'Test Player',
        position: Position.QB,
        draftYear: 2023,
        projectedOverall: { min: 70, max: 80 },
        projectedRound: 2,
        actualOverall: null,
        actualRound: null,
      };

      const updatedScout = recordScoutEvaluation(scout, result);

      expect(updatedScout.trackRecord.evaluations).toHaveLength(1);
      expect(updatedScout.trackRecord.evaluations[0].prospectId).toBe('player-1');
      expect(updatedScout.trackRecord.evaluations[0].wasHit).toBeNull();
    });
  });

  describe('updateEvaluationsWithResults', () => {
    it('should update evaluation with actual results', () => {
      const evaluations = [createEvaluation('p1', Position.QB, { min: 70, max: 80 }, null, null)];
      const scout = createScoutWithTrackRecord(evaluations, 1);

      const updatedScout = updateEvaluationsWithResults(scout, 'p1', 2, 75);

      expect(updatedScout.trackRecord.evaluations[0].actualSkillRevealed).toBe(75);
      expect(updatedScout.trackRecord.evaluations[0].wasHit).toBe(true);
    });

    it('should calculate wasHit correctly for miss', () => {
      const evaluations = [createEvaluation('p1', Position.QB, { min: 70, max: 80 }, null, null)];
      const scout = createScoutWithTrackRecord(evaluations, 1);

      const updatedScout = updateEvaluationsWithResults(scout, 'p1', 2, 50); // 50 is outside 70-80

      expect(updatedScout.trackRecord.evaluations[0].wasHit).toBe(false);
    });

    it('should calculate wasHit correctly for near miss', () => {
      const evaluations = [createEvaluation('p1', Position.QB, { min: 70, max: 80 }, null, null)];
      const scout = createScoutWithTrackRecord(evaluations, 1);

      const updatedScout = updateEvaluationsWithResults(scout, 'p1', 2, 65); // 65 is within 10 of 70

      expect(updatedScout.trackRecord.evaluations[0].wasHit).toBe(true); // Near miss counts as hit
    });
  });

  describe('advanceAccuracyYear', () => {
    it('should increment years of data', () => {
      const scout = createScoutWithTrackRecord([], 2);

      const updatedScout = advanceAccuracyYear(scout);

      expect(updatedScout.trackRecord.yearsOfData).toBe(3);
    });
  });

  describe('classifyEvaluation', () => {
    it('should classify hit correctly', () => {
      const evaluation = createEvaluation('p1', Position.QB, { min: 70, max: 80 }, 75, true);

      expect(classifyEvaluation(evaluation)).toBe('hit');
    });

    it('should classify miss correctly', () => {
      const evaluation = createEvaluation('p1', Position.QB, { min: 70, max: 80 }, 40, false);

      expect(classifyEvaluation(evaluation)).toBe('miss');
    });

    it('should classify near miss correctly', () => {
      const evaluation: ScoutEvaluation = {
        prospectId: 'p1',
        prospectName: 'Player 1',
        position: Position.QB,
        evaluationYear: 2023,
        projectedRound: 2,
        projectedSkillRange: { min: 70, max: 80 },
        actualDraftRound: 2,
        actualSkillRevealed: 62, // Within 10 points of 70
        wasHit: true,
      };

      expect(classifyEvaluation(evaluation)).toBe('near_miss');
    });

    it('should classify pending correctly', () => {
      const evaluation = createEvaluation('p1', Position.QB, { min: 70, max: 80 }, null, null);

      expect(classifyEvaluation(evaluation)).toBe('pending');
    });
  });

  describe('getAccuracyBreakdown', () => {
    it('should count hits, misses, and pending', () => {
      const evaluations = [
        createEvaluation('p1', Position.QB, { min: 70, max: 80 }, 75, true),
        createEvaluation('p2', Position.RB, { min: 60, max: 70 }, 40, false),
        createEvaluation('p3', Position.WR, { min: 80, max: 90 }, null, null),
      ];
      const scout = createScoutWithTrackRecord(evaluations, 2);

      const breakdown = getAccuracyBreakdown(scout);

      expect(breakdown.totalEvaluations).toBe(3);
      expect(breakdown.hits).toBe(1);
      expect(breakdown.misses).toBe(1);
      expect(breakdown.pending).toBe(1);
    });

    it('should calculate hit rate', () => {
      const evaluations = [
        createEvaluation('p1', Position.QB, { min: 70, max: 80 }, 75, true),
        createEvaluation('p2', Position.RB, { min: 60, max: 70 }, 65, true),
        createEvaluation('p3', Position.WR, { min: 80, max: 90 }, 50, false),
      ];
      const scout = createScoutWithTrackRecord(evaluations, 2);

      const breakdown = getAccuracyBreakdown(scout);

      expect(breakdown.hitRate).toBeCloseTo(2 / 3);
    });

    it('should return null hit rate with no completed evaluations', () => {
      const scout = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');

      const breakdown = getAccuracyBreakdown(scout);

      expect(breakdown.hitRate).toBeNull();
    });
  });

  describe('getPositionAccuracy', () => {
    it('should calculate position-specific accuracy', () => {
      const evaluations = [
        createEvaluation('p1', Position.QB, { min: 70, max: 80 }, 75, true),
        createEvaluation('p2', Position.QB, { min: 70, max: 80 }, 72, true),
        createEvaluation('p3', Position.QB, { min: 70, max: 80 }, 40, false),
        createEvaluation('p4', Position.QB, { min: 70, max: 80 }, 78, true),
        createEvaluation('p5', Position.QB, { min: 70, max: 80 }, 76, true),
      ];
      const scout = createScoutWithTrackRecord(evaluations, 5);

      const accuracy = getPositionAccuracy(scout, Position.QB);

      expect(accuracy).toBe(4 / 5); // 4 hits out of 5
    });

    it('should return null with insufficient data', () => {
      const evaluations = [
        createEvaluation('p1', Position.QB, { min: 70, max: 80 }, 75, true),
        createEvaluation('p2', Position.QB, { min: 70, max: 80 }, 72, true),
      ];
      const scout = createScoutWithTrackRecord(evaluations, 2);

      const accuracy = getPositionAccuracy(scout, Position.QB);

      expect(accuracy).toBeNull(); // Less than 5 evaluations
    });
  });

  describe('hasStrengthAtPosition', () => {
    it('should return false before 5 years', () => {
      const evaluations = Array(10)
        .fill(null)
        .map((_, i) => createEvaluation(`p${i}`, Position.QB, { min: 70, max: 80 }, 75, true));
      const scout = createScoutWithTrackRecord(evaluations, 4); // Less than 5 years

      expect(hasStrengthAtPosition(scout, Position.QB)).toBe(false);
    });

    it('should return true for high accuracy position after 5 years', () => {
      const evaluations = Array(10)
        .fill(null)
        .map((_, i) => createEvaluation(`p${i}`, Position.QB, { min: 70, max: 80 }, 75, true));
      const scout = createScoutWithTrackRecord(evaluations, MIN_YEARS_FOR_TENDENCIES);

      expect(hasStrengthAtPosition(scout, Position.QB)).toBe(true);
    });

    it('should return false for low accuracy position', () => {
      const evaluations = Array(10)
        .fill(null)
        .map((_, i) =>
          createEvaluation(`p${i}`, Position.QB, { min: 70, max: 80 }, i < 3 ? 75 : 40, i < 3)
        );
      const scout = createScoutWithTrackRecord(evaluations, MIN_YEARS_FOR_TENDENCIES);

      expect(hasStrengthAtPosition(scout, Position.QB)).toBe(false); // 30% hit rate
    });
  });

  describe('hasWeaknessAtPosition', () => {
    it('should return true for very low accuracy position', () => {
      const evaluations = Array(10)
        .fill(null)
        .map((_, i) =>
          createEvaluation(`p${i}`, Position.RB, { min: 70, max: 80 }, i < 2 ? 75 : 40, i < 2)
        );
      const scout = createScoutWithTrackRecord(evaluations, MIN_YEARS_FOR_TENDENCIES);

      expect(hasWeaknessAtPosition(scout, Position.RB)).toBe(true); // 20% hit rate
    });
  });

  describe('createScoutAccuracyViewModel', () => {
    it('should show unknown for unrevealed reliability', () => {
      const scout = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');

      const viewModel = createScoutAccuracyViewModel(scout);

      expect(viewModel.overallAccuracy).toBeNull();
      expect(viewModel.hitRate).toBeNull();
      expect(viewModel.reliabilityKnown).toBe(false);
    });

    it('should show accurate info when reliability is revealed', () => {
      const evaluations = Array(25)
        .fill(null)
        .map((_, i) => createEvaluation(`p${i}`, Position.QB, { min: 70, max: 80 }, 75, true));
      const scout = createScoutWithTrackRecord(evaluations, 5);

      const viewModel = createScoutAccuracyViewModel(scout);

      expect(viewModel.overallAccuracy).toBe('Reliable');
      expect(viewModel.hitRate).toBe('100%');
      expect(viewModel.reliabilityKnown).toBe(true);
    });

    it('should show appropriate description for unrevealed scout', () => {
      const evaluations = [createEvaluation('p1', Position.QB, { min: 70, max: 80 }, 75, true)];
      const scout = createScoutWithTrackRecord(evaluations, 1);

      const viewModel = createScoutAccuracyViewModel(scout);

      expect(viewModel.description).toContain('Building track record');
    });
  });

  describe('compareScoutAccuracy', () => {
    it('should not compare unrevealed scouts', () => {
      const scout1 = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      const scout2 = createDefaultScout('scout-2', 'Jane', 'Doe', 'headScout');

      const result = compareScoutAccuracy(scout1, scout2);

      expect(result.better).toBeNull();
      expect(result.comparison).toContain('insufficient data');
    });

    it('should compare revealed scouts', () => {
      const evals1 = Array(25)
        .fill(null)
        .map((_, i) => createEvaluation(`p${i}`, Position.QB, { min: 70, max: 80 }, 75, true));
      const evals2 = Array(25)
        .fill(null)
        .map((_, i) =>
          createEvaluation(`p${i}`, Position.QB, { min: 70, max: 80 }, i < 10 ? 75 : 40, i < 10)
        );
      const scout1 = createScoutWithTrackRecord(evals1, 5);
      const scout2 = createScoutWithTrackRecord(evals2, 5);

      const result = compareScoutAccuracy(scout1, scout2);

      expect(result.better).toBe(scout1); // 100% vs 40%
    });

    it('should report similar scouts as even', () => {
      const evals1 = Array(25)
        .fill(null)
        .map((_, i) =>
          createEvaluation(`p${i}`, Position.QB, { min: 70, max: 80 }, i < 18 ? 75 : 40, i < 18)
        );
      const evals2 = Array(25)
        .fill(null)
        .map((_, i) =>
          createEvaluation(`p${i}`, Position.QB, { min: 70, max: 80 }, i < 17 ? 75 : 40, i < 17)
        );
      const scout1 = createScoutWithTrackRecord(evals1, 5);
      const scout2 = createScoutWithTrackRecord(evals2, 5);

      const result = compareScoutAccuracy(scout1, scout2);

      expect(result.better).toBeNull();
      expect(result.comparison).toContain('similar track records');
    });
  });

  describe('getScoutsByAccuracy', () => {
    it('should separate revealed and unrevealed scouts', () => {
      const revealedEvals = Array(25)
        .fill(null)
        .map((_, i) => createEvaluation(`p${i}`, Position.QB, { min: 70, max: 80 }, 75, true));
      const revealed = createScoutWithTrackRecord(revealedEvals, 5);
      const unrevealed = createDefaultScout('scout-2', 'Jane', 'Doe', 'headScout');

      const result = getScoutsByAccuracy([revealed, unrevealed]);

      expect(result.revealed).toHaveLength(1);
      expect(result.unrevealed).toHaveLength(1);
    });

    it('should sort revealed by hit rate descending', () => {
      const highEvals = Array(25)
        .fill(null)
        .map((_, i) => createEvaluation(`p${i}`, Position.QB, { min: 70, max: 80 }, 75, true));
      const lowEvals = Array(25)
        .fill(null)
        .map((_, i) =>
          createEvaluation(`p${i}`, Position.QB, { min: 70, max: 80 }, i < 10 ? 75 : 40, i < 10)
        );
      const highScout = { ...createScoutWithTrackRecord(highEvals, 5), id: 'high' };
      const lowScout = { ...createScoutWithTrackRecord(lowEvals, 5), id: 'low' };

      const result = getScoutsByAccuracy([lowScout, highScout]);

      expect(result.revealed[0].id).toBe('high');
      expect(result.revealed[1].id).toBe('low');
    });
  });

  describe('getYearsUntilRevelation', () => {
    it('should return 0 for revealed scout', () => {
      const evals = Array(25)
        .fill(null)
        .map((_, i) => createEvaluation(`p${i}`, Position.QB, { min: 70, max: 80 }, 75, true));
      const scout = createScoutWithTrackRecord(evals, 5);

      expect(getYearsUntilRevelation(scout)).toBe(0);
    });

    it('should estimate years for unrevealed scout', () => {
      const scout = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');

      const years = getYearsUntilRevelation(scout);

      expect(years).toBeGreaterThan(0);
      expect(years).toBeLessThanOrEqual(
        Math.ceil(MIN_EVALUATIONS_FOR_RELIABILITY / 5) // Assuming ~5 evals per year minimum
      );
    });
  });

  describe('hasPositionAccuracyData', () => {
    it('should return true with 5+ evaluations', () => {
      const evaluations = Array(6)
        .fill(null)
        .map((_, i) => createEvaluation(`p${i}`, Position.QB, { min: 70, max: 80 }, 75, true));
      const scout = createScoutWithTrackRecord(evaluations, 3);

      expect(hasPositionAccuracyData(scout, Position.QB)).toBe(true);
    });

    it('should return false with fewer than 5 evaluations', () => {
      const evaluations = Array(3)
        .fill(null)
        .map((_, i) => createEvaluation(`p${i}`, Position.QB, { min: 70, max: 80 }, 75, true));
      const scout = createScoutWithTrackRecord(evaluations, 2);

      expect(hasPositionAccuracyData(scout, Position.QB)).toBe(false);
    });
  });

  describe('getEvaluatedPositions', () => {
    it('should return all positions evaluated', () => {
      const evaluations = [
        createEvaluation('p1', Position.QB, { min: 70, max: 80 }, 75, true),
        createEvaluation('p2', Position.RB, { min: 60, max: 70 }, 65, true),
        createEvaluation('p3', Position.QB, { min: 70, max: 80 }, 72, true),
        createEvaluation('p4', Position.WR, { min: 80, max: 90 }, 85, true),
      ];
      const scout = createScoutWithTrackRecord(evaluations, 3);

      const positions = getEvaluatedPositions(scout);

      expect(positions).toContain(Position.QB);
      expect(positions).toContain(Position.RB);
      expect(positions).toContain(Position.WR);
      expect(positions).toHaveLength(3);
    });
  });

  describe('getScoutPositionTendencies', () => {
    it('should return empty arrays before 5 years', () => {
      const evaluations = Array(10)
        .fill(null)
        .map((_, i) => createEvaluation(`p${i}`, Position.QB, { min: 70, max: 80 }, 75, true));
      const scout = createScoutWithTrackRecord(evaluations, 4);

      const tendencies = getScoutPositionTendencies(scout);

      expect(tendencies.bestPositions).toHaveLength(0);
      expect(tendencies.worstPositions).toHaveLength(0);
    });

    it('should identify best and worst positions after 5 years', () => {
      const qbEvals = Array(10)
        .fill(null)
        .map((_, i) => createEvaluation(`qb${i}`, Position.QB, { min: 70, max: 80 }, 75, true));
      const rbEvals = Array(10)
        .fill(null)
        .map((_, i) =>
          createEvaluation(`rb${i}`, Position.RB, { min: 70, max: 80 }, i < 2 ? 75 : 40, i < 2)
        );
      const scout = createScoutWithTrackRecord([...qbEvals, ...rbEvals], MIN_YEARS_FOR_TENDENCIES);

      const tendencies = getScoutPositionTendencies(scout);

      expect(tendencies.bestPositions).toContain(Position.QB);
      expect(tendencies.worstPositions).toContain(Position.RB);
    });
  });
});
